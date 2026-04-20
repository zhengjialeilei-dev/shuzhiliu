from __future__ import annotations

import argparse
import mimetypes
import re
import tempfile
from dataclasses import dataclass
from pathlib import Path

from qcloud_cos import CosConfig, CosS3Client

from deploy_shared import add_target_args, create_ssh_client, resolve_target, upload_file


MANIFEST_PATH = Path(r"C:\Users\p\Desktop\ai应用\edui123重构资源\manifest.json")
DEFAULT_BUCKET = "mathflow-1317654855"
DEFAULT_REGION = "ap-guangzhou"
DEFAULT_PUBLIC_BASE_URL = "https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com"


@dataclass(frozen=True)
class ManifestRow:
    code: str
    desktop_html: Path
    cover_path: Path
    route_path: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import edui123 manifest resources to COS and PostgreSQL.")
    add_target_args(parser)
    parser.add_argument("--secret-id", required=True)
    parser.add_argument("--secret-key", required=True)
    parser.add_argument("--bucket", default=DEFAULT_BUCKET)
    parser.add_argument("--region", default=DEFAULT_REGION)
    parser.add_argument("--public-base-url", default=DEFAULT_PUBLIC_BASE_URL)
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def parse_manifest_rows(manifest_path: Path) -> list[ManifestRow]:
    text = manifest_path.read_text(encoding="utf-8", errors="replace")
    pattern = re.compile(
        r'"code":\s*"([^"]+)".*?"desktop_html":\s*"([^"]+)".*?"cover_path":\s*"([^"]+)".*?"route_path":\s*"([^"]+)"',
        re.S,
    )
    rows: list[ManifestRow] = []
    for code, desktop_html, cover_path, route_path in pattern.findall(text):
        rows.append(
            ManifestRow(
                code=code,
                desktop_html=Path(desktop_html.replace("\\\\", "\\")),
                cover_path=Path(cover_path.replace("\\\\", "\\")),
                route_path=route_path,
            )
        )
    return rows


def upload_cos_file(client: CosS3Client, bucket: str, local_path: Path, key: str) -> str:
    content_type = mimetypes.guess_type(local_path.name)[0] or "application/octet-stream"
    with local_path.open("rb") as file_obj:
        client.put_object(Bucket=bucket, Body=file_obj, Key=key, ContentType=content_type)
    return key


def sql_quote(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def build_sql(rows: list[tuple[ManifestRow, str, str]]) -> str:
    statements: list[str] = []
    for row, file_url, image_url in rows:
        title = row.desktop_html.stem
        category = row.desktop_html.parent.name
        description = f"{title}，适合{category}主题下的课堂互动演示。"
        statements.append(
            f"DELETE FROM resources WHERE route_path = {sql_quote(row.route_path)} OR title = {sql_quote(title)};"
        )
        statements.append(
            "INSERT INTO resources (title, category, grade, image_url, description, file_path, route_path, resource_type)\n"
            f"VALUES ({sql_quote(title)}, {sql_quote(category)}, '通用', {sql_quote(image_url)}, "
            f"{sql_quote(description)}, {sql_quote(file_url)}, {sql_quote(row.route_path)}, 'html');"
        )
    return "\n".join(statements) + "\n"


def execute_sql(args: argparse.Namespace, sql: str) -> None:
    target = resolve_target(args)
    local_tmp = Path(tempfile.gettempdir()) / "import_edui123_manifest.sql"
    remote_tmp = f"{target.remote_repo_root}/tmp/import_edui123_manifest.sql"
    local_tmp.write_text(sql, encoding="utf-8")

    client = create_ssh_client(target)
    try:
        with client.open_sftp() as sftp:
            upload_file(sftp, local_tmp, remote_tmp)
        command = (
            f"cat {remote_tmp} | docker exec -i {target.postgres_container} "
            "psql -v ON_ERROR_STOP=1 -U mathflow -d mathflow"
        )
        stdin, stdout, stderr = client.exec_command(command, timeout=300)
        exit_code = stdout.channel.recv_exit_status()
        out = stdout.read().decode("utf-8", errors="replace")
        err = stderr.read().decode("utf-8", errors="replace")
        if exit_code != 0:
            raise RuntimeError(f"SQL execution failed:\nSTDOUT:\n{out}\nSTDERR:\n{err}")
    finally:
        client.close()
        if local_tmp.exists():
            local_tmp.unlink()


def main() -> None:
    args = parse_args()
    rows = parse_manifest_rows(MANIFEST_PATH)
    if len(rows) != 43:
        raise SystemExit(f"Unexpected manifest row count: {len(rows)}")

    for row in rows:
        if not row.desktop_html.exists():
            raise FileNotFoundError(f"Missing HTML: {row.desktop_html}")
        if not row.cover_path.exists():
            raise FileNotFoundError(f"Missing cover: {row.cover_path}")

    if args.dry_run:
        for row in rows:
            print(f"{row.code} -> {row.desktop_html.name} | {row.cover_path.name} | {row.route_path}")
        return

    cos = CosS3Client(CosConfig(Region=args.region, SecretId=args.secret_id, SecretKey=args.secret_key))
    public_base = args.public_base_url.rstrip("/")

    uploaded_rows: list[tuple[ManifestRow, str, str]] = []
    for row in rows:
        html_key = f"collections/edu-ai-apps/{row.code}.html"
        cover_key = f"collections/edu-covers/{row.code}.png"
        upload_cos_file(cos, args.bucket, row.desktop_html, html_key)
        upload_cos_file(cos, args.bucket, row.cover_path, cover_key)
        uploaded_rows.append((row, f"{public_base}/{html_key}", f"{public_base}/{cover_key}"))

    sql = build_sql(uploaded_rows)
    execute_sql(args, sql)
    print(f"Imported {len(uploaded_rows)} edui123 resources.")


if __name__ == "__main__":
    main()
