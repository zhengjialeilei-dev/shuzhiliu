#!/usr/bin/env python3
"""Run a shell script on the production Lighthouse instance through Tencent TAT."""

from __future__ import annotations

import argparse
import base64
import datetime
import hashlib
import hmac
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path


SERVICE = "tat"
HOST = "tat.tencentcloudapi.com"
VERSION = "2020-10-28"
REGION = "ap-guangzhou"
INSTANCE_ID = "lhins-e1irqmx9"
TERMINAL_FAILURES = {
    "DELIVER_FAILED",
    "START_FAILED",
    "FAILED",
    "TIMEOUT",
    "TASK_TIMEOUT",
    "CANCELLED",
    "TERMINATED",
}
ACTIVE_INVOCATION_STATUSES = {
    "PENDING",
    "DELIVERING",
    "DELIVER_DELAYED",
    "RUNNING",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--command-file", required=True, type=Path)
    parser.add_argument("--name", required=True)
    parser.add_argument("--description", default="GitHub Actions deployment")
    parser.add_argument("--timeout", type=int, default=900)
    parser.add_argument("--cancel-stale-description-prefix")
    return parser.parse_args()


def sign(key: bytes, message: str) -> bytes:
    return hmac.new(key, message.encode("utf-8"), hashlib.sha256).digest()


def call_tat(action: str, body: dict, secret_id: str, secret_key: str) -> dict:
    payload = json.dumps(body, separators=(",", ":"))
    timestamp = int(time.time())
    date = datetime.datetime.fromtimestamp(timestamp, datetime.timezone.utc).strftime("%Y-%m-%d")
    canonical_headers = f"content-type:application/json; charset=utf-8\nhost:{HOST}\n"
    signed_headers = "content-type;host"
    canonical_request = "\n".join(
        [
            "POST",
            "/",
            "",
            canonical_headers,
            signed_headers,
            hashlib.sha256(payload.encode("utf-8")).hexdigest(),
        ]
    )
    credential_scope = f"{date}/{SERVICE}/tc3_request"
    string_to_sign = "\n".join(
        [
            "TC3-HMAC-SHA256",
            str(timestamp),
            credential_scope,
            hashlib.sha256(canonical_request.encode("utf-8")).hexdigest(),
        ]
    )
    secret_date = sign(("TC3" + secret_key).encode("utf-8"), date)
    secret_service = sign(secret_date, SERVICE)
    secret_signing = sign(secret_service, "tc3_request")
    signature = hmac.new(
        secret_signing, string_to_sign.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    authorization = (
        f"TC3-HMAC-SHA256 Credential={secret_id}/{credential_scope}, "
        f"SignedHeaders={signed_headers}, Signature={signature}"
    )
    request = urllib.request.Request(
        f"https://{HOST}",
        data=payload.encode("utf-8"),
        headers={
            "Authorization": authorization,
            "Content-Type": "application/json; charset=utf-8",
            "Host": HOST,
            "X-TC-Action": action,
            "X-TC-Timestamp": str(timestamp),
            "X-TC-Version": VERSION,
            "X-TC-Region": REGION,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            result = json.load(response)["Response"]
    except urllib.error.HTTPError as error:
        result = json.loads(error.read().decode("utf-8"))["Response"]

    if "Error" in result:
        details = result["Error"]
        raise SystemExit(f"Tencent TAT {action} failed: {details['Code']}: {details['Message']}")
    return result


def cancel_stale_invocations(
    description_prefix: str, secret_id: str, secret_key: str
) -> None:
    result = call_tat(
        "DescribeInvocations",
        {"Offset": 0, "Limit": 100},
        secret_id,
        secret_key,
    )
    for invocation in result.get("InvocationSet", []):
        description = invocation.get("Description", "")
        status = invocation.get("InvocationStatus", "")
        invocation_id = invocation.get("InvocationId")
        if (
            not invocation_id
            or not description.startswith(description_prefix)
            or status not in ACTIVE_INVOCATION_STATUSES
        ):
            continue

        call_tat(
            "CancelInvocation",
            {"InvocationId": invocation_id, "InstanceIds": [INSTANCE_ID]},
            secret_id,
            secret_key,
        )
        print(
            f"Cancelled stale Tencent TAT invocation: {invocation_id} ({status})",
            flush=True,
        )


def main() -> None:
    args = parse_args()
    secret_id = os.environ["Tencent_SecretId"]
    secret_key = os.environ["Tencent_SecretKey"]
    if args.cancel_stale_description_prefix:
        cancel_stale_invocations(
            args.cancel_stale_description_prefix,
            secret_id,
            secret_key,
        )
    command = args.command_file.read_bytes()
    result = call_tat(
        "RunCommand",
        {
            "CommandName": args.name,
            "SaveCommand": False,
            "Description": args.description,
            "Content": base64.b64encode(command).decode("ascii"),
            "CommandType": "SHELL",
            "WorkingDirectory": "/root",
            "Timeout": args.timeout,
            "InstanceIds": [INSTANCE_ID],
        },
        secret_id,
        secret_key,
    )
    invocation_id = result["InvocationId"]
    print(f"Tencent TAT invocation started: {invocation_id}", flush=True)

    deadline = time.monotonic() + args.timeout + 90
    while time.monotonic() < deadline:
        time.sleep(2)
        task_result = call_tat(
            "DescribeInvocationTasks",
            {
                "Offset": 0,
                "Limit": 10,
                "HideOutput": False,
                "Filters": [{"Name": "invocation-id", "Values": [invocation_id]}],
            },
            secret_id,
            secret_key,
        )
        tasks = task_result.get("InvocationTaskSet", [])
        if not tasks:
            continue

        task = tasks[0]
        status = task["TaskStatus"]
        if status == "SUCCESS":
            output = task.get("TaskResult", {}).get("Output", "")
            if output:
                print(base64.b64decode(output).decode("utf-8", "replace"))
            print("Tencent TAT command succeeded.")
            return
        if status in TERMINAL_FAILURES:
            output = task.get("TaskResult", {}).get("Output", "")
            if output:
                print(base64.b64decode(output).decode("utf-8", "replace"))
            raise SystemExit(f"Tencent TAT task failed: {task.get('ErrorInfo') or status}")

    raise SystemExit("Tencent TAT task did not finish before the deadline")


if __name__ == "__main__":
    main()
