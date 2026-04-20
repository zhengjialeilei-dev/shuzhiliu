from __future__ import annotations

import argparse
import json
import mimetypes
import tempfile
from dataclasses import dataclass
from pathlib import Path

from qcloud_cos import CosConfig, CosS3Client

from deploy_shared import add_target_args, create_ssh_client, resolve_target, upload_file


MANIFEST_PATH = Path(r"C:\Users\p\Desktop\shuzhiliu\_imports\edu123_manifest.json")
SITE_SOURCE_ROOT = Path(r"C:\Users\p\Desktop\edui123.com")
DEFAULT_BUCKET = "mathflow-1317654855"
DEFAULT_REGION = "ap-guangzhou"
DEFAULT_PUBLIC_BASE_URL = "https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com"


@dataclass(frozen=True)
class SiteRow:
    code: str
    title: str
    category: str
    grade: str
    description: str
    route_path: str
    html_path: Path
    cover_path: Path


def canonical_route_path(code: str) -> str:
    return f"/{code}"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Re-import 43 edui123 resources from C:\\Users\\p\\Desktop\\edui123.com into COS and PostgreSQL."
    )
    add_target_args(parser)
    parser.add_argument("--secret-id", required=True)
    parser.add_argument("--secret-key", required=True)
    parser.add_argument("--bucket", default=DEFAULT_BUCKET)
    parser.add_argument("--region", default=DEFAULT_REGION)
    parser.add_argument("--public-base-url", default=DEFAULT_PUBLIC_BASE_URL)
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def load_rows() -> list[SiteRow]:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    rows: list[SiteRow] = []

    for item in manifest:
        code = item["code"]
        rows.append(
            SiteRow(
                code=code,
                title=item["title"],
                category=item["category"],
                grade=item.get("grade") or "通用",
                description=item["description"],
                route_path=canonical_route_path(code),
                html_path=SITE_SOURCE_ROOT / code / "index.html",
                cover_path=Path(item["cover_path"]),
            )
        )

    return rows


def upload_cos_file(client: CosS3Client, bucket: str, local_path: Path, key: str) -> None:
    content_type = mimetypes.guess_type(local_path.name)[0] or "application/octet-stream"
    with local_path.open("rb") as file_obj:
        client.put_object(Bucket=bucket, Body=file_obj, Key=key, ContentType=content_type)


def sql_quote(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def build_sql(rows: list[SiteRow], public_base_url: str) -> str:
    statements: list[str] = []

    route_paths = ", ".join(sql_quote(row.route_path) for row in rows)
    legacy_lab_paths = ", ".join(sql_quote(f"/lab/{row.code}") for row in rows)
    statements.append(
        f"DELETE FROM resources WHERE route_path IN ({route_paths}) OR route_path IN ({legacy_lab_paths});"
    )

    for row in rows:
        file_url = f"{public_base_url}/collections/edu-ai-apps/{row.code}.html"
        image_url = f"{public_base_url}/collections/edu-covers/{row.code}.png"
        statements.append(
            "INSERT INTO resources (title, category, grade, image_url, description, file_path, route_path, resource_type)\n"
            f"VALUES ({sql_quote(row.title)}, {sql_quote(row.category)}, {sql_quote(row.grade)}, "
            f"{sql_quote(image_url)}, {sql_quote(row.description)}, {sql_quote(file_url)}, "
            f"{sql_quote(row.route_path)}, 'html');"
        )

    return "\n".join(statements) + "\n"


def execute_sql(args: argparse.Namespace, sql: str) -> None:
    target = resolve_target(args)
    local_tmp = Path(tempfile.gettempdir()) / "reimport_edui123_site_source.sql"
    remote_tmp = f"{target.remote_repo_root}/tmp/reimport_edui123_site_source.sql"
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
    rows = load_rows()
    if len(rows) != 43:
        raise SystemExit(f"Unexpected row count: {len(rows)}")

    for row in rows:
        if not row.html_path.exists():
            raise FileNotFoundError(f"Missing source HTML: {row.html_path}")
        if not row.cover_path.exists():
            raise FileNotFoundError(f"Missing cover image: {row.cover_path}")

    public_base = args.public_base_url.rstrip("/")

    if args.dry_run:
        for row in rows:
            print(f"{row.code}: {row.html_path} -> {row.route_path}")
        return

    cos = CosS3Client(CosConfig(Region=args.region, SecretId=args.secret_id, SecretKey=args.secret_key))
    for row in rows:
        upload_cos_file(cos, args.bucket, row.html_path, f"collections/edu-ai-apps/{row.code}.html")
        upload_cos_file(cos, args.bucket, row.cover_path, f"collections/edu-covers/{row.code}.png")

    execute_sql(args, build_sql(rows, public_base))
    print(f"Re-imported {len(rows)} edui123 resources from site source.")


if __name__ == "__main__":
    main()
