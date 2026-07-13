#!/usr/bin/env python3
"""Create short-lived COS URLs without exposing the server's storage credentials."""

from __future__ import annotations

import datetime
import hashlib
import hmac
import sys
import urllib.parse
from pathlib import Path


def load_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.removeprefix("export ").split("=", 1)
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        values[key.strip()] = value
    return values


def sign(key: bytes, message: str) -> bytes:
    return hmac.new(key, message.encode("utf-8"), hashlib.sha256).digest()


def presign(method: str, host: str, region: str, object_key: str, access_key: str, secret_key: str) -> str:
    now = datetime.datetime.now(datetime.timezone.utc)
    timestamp = now.strftime("%Y%m%dT%H%M%SZ")
    date = now.strftime("%Y%m%d")
    scope = f"{date}/{region}/s3/aws4_request"
    canonical_uri = urllib.parse.quote(f"/{object_key.lstrip('/')}", safe="/-_.~")
    query = {
        "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
        "X-Amz-Credential": f"{access_key}/{scope}",
        "X-Amz-Date": timestamp,
        "X-Amz-Expires": "3600",
        "X-Amz-SignedHeaders": "host",
    }
    canonical_query = urllib.parse.urlencode(sorted(query.items()), quote_via=urllib.parse.quote)
    canonical_request = "\n".join(
        [method, canonical_uri, canonical_query, f"host:{host}\n", "host", "UNSIGNED-PAYLOAD"]
    )
    string_to_sign = "\n".join(
        [
            "AWS4-HMAC-SHA256",
            timestamp,
            scope,
            hashlib.sha256(canonical_request.encode("utf-8")).hexdigest(),
        ]
    )
    date_key = sign(("AWS4" + secret_key).encode("utf-8"), date)
    region_key = sign(date_key, region)
    service_key = sign(region_key, "s3")
    signing_key = sign(service_key, "aws4_request")
    signature = hmac.new(signing_key, string_to_sign.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"https://{host}{canonical_uri}?{canonical_query}&X-Amz-Signature={signature}"


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Usage: presign_cos_transfer.py ENV_FILE OBJECT_KEY")

    values = load_env(Path(sys.argv[1]))
    required = ["S3_BUCKET", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"]
    missing = [name for name in required if not values.get(name)]
    if missing:
        raise SystemExit(f"Missing COS settings: {', '.join(missing)}")

    bucket = values["S3_BUCKET"]
    region = values["S3_REGION"]
    host = f"{bucket}.cos.{region}.myqcloud.com"
    args = (host, region, sys.argv[2], values["S3_ACCESS_KEY_ID"], values["S3_SECRET_ACCESS_KEY"])
    for method in ("PUT", "GET", "DELETE"):
        print(f"{method}_URL={presign(method, *args)}")


if __name__ == "__main__":
    main()
