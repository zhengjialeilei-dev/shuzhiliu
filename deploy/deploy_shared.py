from __future__ import annotations

import argparse
import os
import posixpath
import subprocess
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Sequence

import paramiko


DEFAULT_REMOTE_REPO_ROOT = "/opt/1panel/apps/mathflow-sparkaiedu/shuzhiliu"
DEFAULT_REMOTE_SITE_ROOT = "/opt/1panel/www/sites/sparkaiedu.com/index"
DEFAULT_OPENRESTY_CONTAINER = "1Panel-openresty-z1xG"
DEFAULT_POSTGRES_CONTAINER = "mathflow-postgres"
DEFAULT_SITE_URL = "https://sparkaiedu.com"


@dataclass(frozen=True)
class DeploymentTarget:
    host: str
    ssh_user: str
    ssh_password: str
    remote_repo_root: str
    remote_site_root: str
    openresty_container: str
    postgres_container: str
    site_url: str


def add_target_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--host", default=os.getenv("MATHFLOW_DEPLOY_HOST"))
    parser.add_argument("--ssh-user", default=os.getenv("MATHFLOW_DEPLOY_USER", "root"))
    parser.add_argument("--ssh-password", default=os.getenv("MATHFLOW_DEPLOY_PASSWORD"))
    parser.add_argument(
        "--remote-repo-root",
        default=os.getenv("MATHFLOW_REMOTE_REPO_ROOT", DEFAULT_REMOTE_REPO_ROOT),
    )
    parser.add_argument(
        "--remote-site-root",
        default=os.getenv("MATHFLOW_REMOTE_SITE_ROOT", DEFAULT_REMOTE_SITE_ROOT),
    )
    parser.add_argument(
        "--openresty-container",
        default=os.getenv("MATHFLOW_OPENRESTY_CONTAINER", DEFAULT_OPENRESTY_CONTAINER),
    )
    parser.add_argument(
        "--postgres-container",
        default=os.getenv("MATHFLOW_POSTGRES_CONTAINER", DEFAULT_POSTGRES_CONTAINER),
    )
    parser.add_argument("--site-url", default=os.getenv("MATHFLOW_SITE_URL", DEFAULT_SITE_URL))


def resolve_target(args: argparse.Namespace) -> DeploymentTarget:
    if not args.host:
        raise SystemExit("Missing deploy host. Pass --host or set MATHFLOW_DEPLOY_HOST.")
    if not args.ssh_password:
        raise SystemExit("Missing SSH password. Pass --ssh-password or set MATHFLOW_DEPLOY_PASSWORD.")

    return DeploymentTarget(
        host=args.host,
        ssh_user=args.ssh_user,
        ssh_password=args.ssh_password,
        remote_repo_root=args.remote_repo_root,
        remote_site_root=args.remote_site_root,
        openresty_container=args.openresty_container,
        postgres_container=args.postgres_container,
        site_url=args.site_url.rstrip("/"),
    )


def create_ssh_client(target: DeploymentTarget) -> paramiko.SSHClient:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        target.host,
        username=target.ssh_user,
        password=target.ssh_password,
        timeout=20,
    )
    return client


def run_local_command(command: Sequence[str], cwd: Path) -> None:
    resolved = list(command)
    executable = shutil.which(resolved[0])
    if executable:
        resolved[0] = executable
    elif os.name == "nt":
        cmd_executable = shutil.which(f"{resolved[0]}.cmd")
        if cmd_executable:
            resolved[0] = cmd_executable

    subprocess.run(resolved, cwd=cwd, check=True)


def run_remote_command(
    client: paramiko.SSHClient,
    command: str,
    *,
    timeout: int = 300,
    check: bool = True,
) -> str:
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    if check and exit_code != 0:
        raise RuntimeError(f"Remote command failed ({exit_code}): {command}\nSTDOUT:\n{out}\nSTDERR:\n{err}")
    return out if out else err


def ensure_remote_dir(sftp: paramiko.SFTPClient, remote_path: str) -> None:
    parts = remote_path.strip("/").split("/") if remote_path.strip("/") else []
    current = ""
    for part in parts:
        current = f"{current}/{part}" if current else f"/{part}"
        try:
            sftp.stat(current)
        except FileNotFoundError:
            sftp.mkdir(current)


def upload_file(sftp: paramiko.SFTPClient, local_path: Path, remote_path: str) -> None:
    ensure_remote_dir(sftp, posixpath.dirname(remote_path))
    sftp.put(str(local_path), remote_path)


def upload_directory(
    sftp: paramiko.SFTPClient,
    local_dir: Path,
    remote_dir: str,
    *,
    skip_names: Iterable[str] | None = None,
) -> None:
    skip = set(skip_names or [])
    ensure_remote_dir(sftp, remote_dir)

    for item in local_dir.iterdir():
        if item.name in skip:
            continue

        remote_path = posixpath.join(remote_dir, item.name)
        if item.is_dir():
            upload_directory(sftp, item, remote_path, skip_names=skip)
        else:
            sftp.put(str(item), remote_path)
