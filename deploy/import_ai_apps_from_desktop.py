from __future__ import annotations

import argparse
import hashlib
import mimetypes
import os
import posixpath
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from qcloud_cos import CosConfig, CosS3Client

from deploy_shared import add_target_args, create_ssh_client, resolve_target, upload_file


DESKTOP_APPS_DIR = Path(r"C:\Users\p\Desktop\ai应用")
DESKTOP_COVERS_DIR = Path(r"C:\Users\p\Desktop\ai封面")

DEFAULT_BUCKET = "mathflow-1317654855"
DEFAULT_REGION = "ap-guangzhou"
DEFAULT_PUBLIC_BASE_URL = "https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com"


TITLE_ALIASES: dict[str, str] = {
    "喝果汁问题": "喝果汁（加水）问题",
    "鸡兔同笼": "鸡兔同笼问题",
    "平行四边形第四个点在哪": "平行四边形第四个点",
    "百分数浓度调节": "魔法药水浓度模拟器",
    "平移与旋转": "平移与旋转工坊",
    "扇形统计图": "扇形统计图实验室",
}


# Best-effort mapping: if a cover filename contains one of these keywords, we pick it.
COVER_KEYWORDS: list[tuple[str, str]] = [
    ("趣味数独", "sudoku-fun.png"),
    ("三国华容道", "huarongdao-three-kingdoms.png"),
    ("欢乐五子棋", "gomoku-fun.png"),
    ("黑白棋", "othello-ai.png"),
    ("吃豆人角度规", "pacman-angle-lab.png"),
    ("倒数的认识", "reciprocal-discovery.png"),
    ("打折的奥秘", "discount-traps.png"),
    ("比的意义", "ratio-meaning.png"),
    ("比例的意义", "ratio-meaning.png"),
    ("百分数的意义", "percentage-meaning.png"),
    ("扇形统计图", "pie-chart-lab.png"),
    ("利率课件", "interest-courseware.png"),
    ("利率", "interest-calculator.png"),
    ("十进制的世界", "decimal-world.png"),
    ("探索负数的世界", "negative-world.png"),
    ("位置探索", "position-explorer.png"),
    ("三视图教学", "three-view-builder.png"),
    ("圆的面积推导", "circle-area-derivation.png"),
    ("圆的周长推导", "circle-circumference-derivation.png"),
    ("圆柱表面积推导", "cylinder-surface-area.png"),
    ("圆柱的体积", "cylinder-volume.png"),
    ("圆柱展开教学", "cylinder-net-explorer.png"),
    ("表面涂色的正方体", "painted-cube.png"),
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import desktop HTML apps + covers into COS and PostgreSQL.")
    add_target_args(parser)
    parser.add_argument("--secret-id", default=os.getenv("TENCENT_SECRET_ID"))
    parser.add_argument("--secret-key", default=os.getenv("TENCENT_SECRET_KEY"))
    parser.add_argument("--bucket", default=os.getenv("TENCENT_COS_BUCKET", DEFAULT_BUCKET))
    parser.add_argument("--region", default=os.getenv("TENCENT_COS_REGION", DEFAULT_REGION))
    parser.add_argument("--public-base-url", default=os.getenv("TENCENT_COS_PUBLIC_BASE_URL", DEFAULT_PUBLIC_BASE_URL))
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def create_cos_client(args: argparse.Namespace) -> CosS3Client:
    if not args.secret_id or not args.secret_key:
        raise SystemExit("Missing COS credentials. Pass --secret-id/--secret-key or set env vars.")
    config = CosConfig(Region=args.region, SecretId=args.secret_id, SecretKey=args.secret_key)
    return CosS3Client(config)


def sql_text(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def safe_stem(path: Path) -> str:
    stem = path.stem.strip()
    stem = stem.replace("｜", "|")
    stem = re.sub(r"\s+", " ", stem)
    return stem


def normalize_title(stem: str) -> str:
    # Remove common prefixes, keep the core title
    title = stem
    title = title.replace("AI应用|", "AI应用｜").replace("AI应用|", "AI应用｜")
    title = title.replace("AI应用｜", "").replace("AI应用图形的运动：", "")
    title = title.replace("AI应用", "")
    title = title.strip(" -_：:|｜")
    return TITLE_ALIASES.get(title, title)


def resolve_db_title(candidate: str, existing: dict[str, "ExistingRow"]) -> str:
    if candidate in existing:
        return candidate
    # Prefer exact alias target
    alias = TITLE_ALIASES.get(candidate)
    if alias and alias in existing:
        return alias
    # Substring match: pick the shortest existing title that contains candidate
    matches = [t for t in existing.keys() if candidate and candidate in t]
    if matches:
        matches.sort(key=len)
        return matches[0]
    return candidate


def choose_cover_for_title(title: str) -> Path | None:
    # 1) exact match by filename stem
    candidates = list(DESKTOP_COVERS_DIR.glob("*.png"))
    for candidate in candidates:
        if candidate.stem == title:
            return candidate
    # 2) keyword mapping
    for keyword, filename in COVER_KEYWORDS:
        if keyword in title:
            path = DESKTOP_COVERS_DIR / filename
            if path.exists():
                return path
    # 3) fallback: try contains
    for candidate in candidates:
        if title and title in candidate.stem:
            return candidate
    return None


def find_browser() -> str | None:
    # Prefer Chrome/Edge
    candidates = [
        os.path.join(os.environ.get("PROGRAMFILES", ""), "Google", "Chrome", "Application", "chrome.exe"),
        os.path.join(os.environ.get("PROGRAMFILES(X86)", ""), "Google", "Chrome", "Application", "chrome.exe"),
        os.path.join(os.environ.get("PROGRAMFILES", ""), "Microsoft", "Edge", "Application", "msedge.exe"),
        os.path.join(os.environ.get("PROGRAMFILES(X86)", ""), "Microsoft", "Edge", "Application", "msedge.exe"),
    ]
    for candidate in candidates:
        if candidate and Path(candidate).exists():
            return candidate
    return None


def slug_from_title(title: str, *, min_len: int = 4) -> str:
    digest = hashlib.md5(title.encode("utf-8")).hexdigest()
    slug = digest[:min_len]
    return slug


def screenshot_cover(browser: str, html_path: Path, out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    url = html_path.resolve().as_uri()
    subprocess.run(
        [
            browser,
            "--headless=new",
            "--disable-gpu",
            "--no-sandbox",
            "--hide-scrollbars",
            "--window-size=1200,800",
            f"--screenshot={str(out_path)}",
            url,
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def upload_cos_file(client: CosS3Client, bucket: str, local_path: Path, key: str) -> str:
    content_type = mimetypes.guess_type(local_path.name)[0] or "application/octet-stream"
    with local_path.open("rb") as file_obj:
        client.put_object(Bucket=bucket, Body=file_obj, Key=key, ContentType=content_type)
    return key


@dataclass(frozen=True)
class ExistingRow:
    title: str
    category: str
    grade: str
    route_path: str | None
    description: str


def fetch_existing_rows(host: str, user: str, password: str, postgres_container: str) -> dict[str, ExistingRow]:
    # Export as TSV for reliable parsing (no locale-dependent tables)
    sql = (
        "COPY (SELECT title, category, grade, COALESCE(route_path,''), COALESCE(description,'') "
        "FROM resources) TO STDOUT WITH (FORMAT csv, DELIMITER E'\\t', QUOTE E'\\b');"
    )
    command = f"docker exec {postgres_container} psql -U mathflow -d mathflow -c \"{sql}\""
    import paramiko

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, username=user, password=password, timeout=30)
    try:
        stdin, stdout, stderr = client.exec_command(command, timeout=120)
        out = stdout.read().decode("utf-8", errors="replace")
        _ = stderr.read().decode("utf-8", errors="replace")
    finally:
        client.close()

    rows: dict[str, ExistingRow] = {}
    for line in out.splitlines():
        parts = line.split("\t")
        if len(parts) < 5:
            continue
        title, category, grade, route_path, description = parts[0], parts[1], parts[2], parts[3], parts[4]
        rows[title] = ExistingRow(
            title=title,
            category=category,
            grade=grade,
            route_path=route_path or None,
            description=description,
        )
    return rows


def execute_sql(target_args: argparse.Namespace, sql: str) -> None:
    target = resolve_target(target_args)
    remote_tmp = f"{target.remote_repo_root}/tmp/import_ai_apps_from_desktop.sql"
    local_tmp = Path("C:/Users/p/Desktop/shuzhiliu/tmp_import_ai_apps_from_desktop.sql")
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
            raise RuntimeError(f"SQL execution failed: {out}\n{err}")
    finally:
        client.close()
        if local_tmp.exists():
            local_tmp.unlink()


def build_upsert_sql(
    items: Iterable[tuple[str, str, str, str, str, str]],
) -> str:
    statements: list[str] = []
    # We avoid ON CONFLICT(title) because title is not guaranteed to be unique.
    # Instead, delete by route_path or title, then insert.
    for title, category, grade, description, file_url, image_url, route_path in items:
        statements.append(
            f"DELETE FROM resources WHERE route_path = {sql_text(route_path)} OR title = {sql_text(title)};"
        )
        statements.append(
            "INSERT INTO resources (title, category, grade, image_url, description, file_path, route_path, resource_type)\n"
            f"VALUES ({sql_text(title)}, {sql_text(category)}, {sql_text(grade)}, {sql_text(image_url)}, "
            f"{sql_text(description)}, {sql_text(file_url)}, {sql_text(route_path)}, 'html');"
        )
    return "\n".join(statements) + "\n"


def main() -> None:
    args = parse_args()
    target = resolve_target(args)

    html_files = sorted([p for p in DESKTOP_APPS_DIR.glob("*.htm*") if p.is_file()])
    # skip empty files
    html_files = [p for p in html_files if p.stat().st_size > 0]

    existing = fetch_existing_rows(target.host, target.ssh_user, target.ssh_password, target.postgres_container)

    browser = find_browser()

    jobs: list[tuple[str, Path, Path, str]] = []
    for html_path in html_files:
        stem = safe_stem(html_path)
        title = normalize_title(stem)
        cover = choose_cover_for_title(title)
        if not cover:
            # generate one
            if not browser:
                raise SystemExit(f"Missing cover for {title} and no browser found to screenshot.")
            cover_name = f"{slug_from_title(title, min_len=8)}.png"
            cover = DESKTOP_COVERS_DIR / cover_name
            screenshot_cover(browser, html_path, cover)
        jobs.append((title, html_path, cover, stem))

    if args.dry_run:
        for title, html_path, cover, _stem in jobs:
            print(f"{title} -> {html_path.name} | {cover.name}")
        return

    cos = create_cos_client(args)
    public_base = args.public_base_url.rstrip("/")

    upserts: list[tuple[str, str, str, str, str, str, str]] = []
    for title, html_path, cover_path, _stem in jobs:
        resolved_title = resolve_db_title(title, existing)
        row = existing.get(resolved_title)
        category = row.category if row else "综合实践"
        grade = row.grade if row else "通用"
        description = row.description if row and row.description else title
        route_path = row.route_path if row and row.route_path else f"/lab/{slug_from_title(title)}"

        slug = route_path.strip("/").replace("/", "-")
        html_key = f"collections/ai-apps/{slug}.html"
        cover_key = f"collections/covers/{slug}.png"

        upload_cos_file(cos, args.bucket, html_path, html_key)
        upload_cos_file(cos, args.bucket, cover_path, cover_key)

        file_url = f"{public_base}/{html_key}"
        image_url = f"{public_base}/{cover_key}"
        upserts.append((resolved_title, category, grade, description, file_url, image_url, route_path))

    sql = build_upsert_sql(upserts)
    execute_sql(args, sql)
    print(f"Imported/updated {len(upserts)} resources.")


if __name__ == "__main__":
    main()
