from __future__ import annotations

import argparse
import mimetypes
import os
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from qcloud_cos import CosConfig, CosS3Client

from deploy_shared import add_target_args, create_ssh_client, resolve_target, upload_file


DESKTOP_COVER_DIR = Path(r"C:\Users\p\Desktop\ai封面")
OLD_APPS_DIR = Path(r"C:\Users\p\Desktop\ai应用")
NEW_APPS_DIR = Path(r"C:\Users\p\Desktop\11111\ai应用")


COVER_RENAMES = {
    "6dba01ae05892606174d20b5194e2416.png": "sudoku-fun.png",
    "f1197433-0559-40e5-bc1b-d2742686a2cf.png": "huarongdao-three-kingdoms.png",
    "25a52d68-1c2f-41da-8a96-7487d0ec877e.png": "three-view-builder.png",
    "cc7957441d33ef3d1f638703a3a5e9c2.png": "decimal-world.png",
    "090eec51f54c071c46f7589c9a094043.png": "negative-world.png",
    "0632b87a5c60c6e669b2ec4779551949.png": "position-explorer.png",
    "50f05560d570ab9906f58834634fe513.png": "percentage-meaning.png",
    "3d4e6a339860d7726aa49f518f50997b.png": "discount-traps.png",
    "eb04d09d2b63071d273d4b4fc24f88c9.png": "ratio-meaning.png",
    "38a9ff72-3ccd-466c-9150-1b4e4614911d.png": "painted-cube.png",
    "6f124304ea57041d1271ff93e581480f.png": "pacman-angle-lab.png",
    "ccddd6b4-4f74-4107-b74b-25d7acdc0491.png": "reciprocal-discovery.png",
    "66a34ba33ccf10b4cfb49fa0ea8c95c6.png": "othello-ai.png",
    "7cf675a8ed03565a63d48fb0c3762fcf.png": "gomoku-fun.png",
    "194856a4-977e-43e4-87ef-0e9dbef53283.png": "interest-calculator.png",
    "faa3c3f201ce6be2bf02386b518d40a1.png": "interest-courseware.png",
    "c78f63e1af235d5d6a557e89a164b5fd.png": "cylinder-surface-area.png",
    "c5f4c687-1348-4062-a016-b499d9f8d03c.png": "cylinder-volume.png",
    "d56fca41-ed1a-4683-b18c-5bceebee1632.png": "cylinder-net-explorer.png",
    "b56e89a9-870a-439d-85a4-514b8b25bb41.png": "pie-chart-lab.png",
    "9f0f94f9-7e28-4a27-8653-83802e5aa642.png": "circle-area-derivation.png",
}


@dataclass(frozen=True)
class ResourceJob:
    title: str
    html_path: Path | None
    slug: str
    route_path: str
    category: str
    grade: str
    description: str
    cover_filename: str
    upload_html: bool = True
    update_existing_only: bool = False
    optional_cover: bool = False


NEW_RESOURCE_JOBS = [
    ResourceJob(
        title="为什么车轮是圆的",
        html_path=NEW_APPS_DIR / "为什么车轮是圆的.html",
        slug="why-wheels-are-round",
        route_path="/wheel",
        category="图形与几何",
        grade="通用",
        description="通过重心轨迹与滚动模拟，理解车轮为什么做成圆形更平稳。",
        cover_filename="why-wheels-are-round.png",
    ),
    ResourceJob(
        title="乘法消消乐",
        html_path=NEW_APPS_DIR / "乘法消消乐.html",
        slug="multiplication-match",
        route_path="/mulfun",
        category="数与代数",
        grade="三年级",
        description="把乘法练习做成闯关消消乐，适合课堂热身和口算训练。",
        cover_filename="multiplication-match.png",
    ),
    ResourceJob(
        title="全能数学消消乐",
        html_path=NEW_APPS_DIR / "全能数学消消乐.html",
        slug="all-in-one-math-match",
        route_path="/mathfun",
        category="综合实践",
        grade="通用",
        description="融合多类基础数学题型的互动消消乐，适合课堂巩固与练习。",
        cover_filename="all-in-one-math-match.png",
    ),
    ResourceJob(
        title="比例交互实验室",
        html_path=NEW_APPS_DIR / "六年级数学-比例交互教学合集.html",
        slug="proportion-interactive-lab",
        route_path="/ratio",
        category="数与代数",
        grade="六年级",
        description="围绕比例的意义与应用设计的交互合集，适合单元导入与梳理。",
        cover_filename="proportion-interactive-lab.png",
    ),
    ResourceJob(
        title="分数乘法可视化",
        html_path=NEW_APPS_DIR / "分数乘法可视化.html",
        slug="fraction-multiplication-visualizer",
        route_path="/fracmul",
        category="数与代数",
        grade="五年级",
        description="用几何面积模型直观展示分数乘法，帮助学生理解算理。",
        cover_filename="fraction-multiplication-visualizer.png",
    ),
    ResourceJob(
        title="反比例实验室（面积模型）",
        html_path=NEW_APPS_DIR / "反比例交互实验室-面积模型.html",
        slug="inverse-proportion-area-lab",
        route_path="/invarea",
        category="数与代数",
        grade="六年级",
        description="通过恒定面积模型观察两个量此消彼长，理解反比例关系。",
        cover_filename="inverse-proportion-area-lab.png",
    ),
    ResourceJob(
        title="圆锥的认识",
        html_path=NEW_APPS_DIR / "圆锥的认识.html",
        slug="cone-discovery",
        route_path="/cone",
        category="图形与几何",
        grade="六年级",
        description="围绕圆锥结构、展开与特征设计的互动教学页面。",
        cover_filename="cone-discovery.png",
    ),
    ResourceJob(
        title="平行四边形面积推导",
        html_path=NEW_APPS_DIR / "平行四边形面积推导演示器.html",
        slug="parallelogram-area-derivation",
        route_path="/pgarea",
        category="图形与几何",
        grade="五年级",
        description="通过剪拼与转化演示平行四边形面积公式的推导过程。",
        cover_filename="parallelogram-area-derivation.png",
    ),
    ResourceJob(
        title="找零钱大作战（低年级）",
        html_path=NEW_APPS_DIR / "找零钱大作战（低年级）.html",
        slug="change-maker-junior",
        route_path="/change1",
        category="综合实践",
        grade="一二年级",
        description="用买卖找零情境练习人民币计算，适合低年级课堂互动。",
        cover_filename="change-maker-junior.png",
    ),
    ResourceJob(
        title="找零钱大作战（高年级版）",
        html_path=NEW_APPS_DIR / "找零钱大作战（高年级版）.html",
        slug="change-maker-senior",
        route_path="/change2",
        category="综合实践",
        grade="五六年级",
        description="升级版找零闯关，适合高年级综合运算与情境应用训练。",
        cover_filename="change-maker-senior.png",
    ),
    ResourceJob(
        title="正比例实验室（注水画图）",
        html_path=NEW_APPS_DIR / "注水与画图实验室-正比例探究.html",
        slug="direct-proportion-water-lab",
        route_path="/water",
        category="数与代数",
        grade="六年级",
        description="把注水过程和图像变化放在同一界面，帮助学生理解正比例。",
        cover_filename="direct-proportion-water-lab.png",
    ),
    ResourceJob(
        title="反比例实验室（齿轮）",
        html_path=NEW_APPS_DIR / "齿轮实验室-反比例.html",
        slug="inverse-proportion-gear-lab",
        route_path="/gear",
        category="数与代数",
        grade="六年级",
        description="通过齿轮联动演示反比例现象，适合概念建立与对比观察。",
        cover_filename="inverse-proportion-gear-lab.png",
    ),
    ResourceJob(
        title="班级智慧树",
        html_path=NEW_APPS_DIR / "智慧树.HTML",
        slug="classroom-wisdom-tree",
        route_path="/tree",
        category="综合实践",
        grade="通用",
        description="面向课堂管理的互动智慧树，可用于安静守护与班级激励。",
        cover_filename="classroom-wisdom-tree.png",
    ),
]


EXISTING_COVER_UPDATES = [
    ResourceJob(
        title="SVG 扇形统计图",
        html_path=NEW_APPS_DIR / "SVG 扇形统计图教学程序.html",
        slug="svg-pie-chart-teaching",
        route_path="/svg",
        category="统计与概率",
        grade="六年级",
        description="",
        cover_filename="svg-pie-chart-teaching.png",
        upload_html=False,
        update_existing_only=True,
    ),
    ResourceJob(
        title="全栈负数教学",
        html_path=NEW_APPS_DIR / "全栈负数教学SPA整合.HTML",
        slug="negative-numbers-lab",
        route_path="/qzfs",
        category="数与代数",
        grade="六年级",
        description="",
        cover_filename="negative-numbers-lab.png",
        upload_html=False,
        update_existing_only=True,
    ),
    ResourceJob(
        title="奇异博士",
        html_path=NEW_APPS_DIR / "奇异博士.html",
        slug="doctor-strange-math",
        route_path="/qybs",
        category="图形与几何",
        grade="通用",
        description="",
        cover_filename="doctor-strange-math.png",
        upload_html=False,
        update_existing_only=True,
        optional_cover=True,
    ),
    ResourceJob(
        title="圆的面积推导",
        html_path=None,
        slug="circle-area-derivation",
        route_path="/ymj",
        category="图形与几何",
        grade="六年级",
        description="",
        cover_filename="circle-area-derivation.png",
        upload_html=False,
        update_existing_only=True,
    ),
]


def find_browser() -> Path:
    candidates = [
        Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
        Path(r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"),
        Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise SystemExit("No supported browser found for headless screenshots.")


def rename_known_covers() -> None:
    for old_name, new_name in COVER_RENAMES.items():
        src = DESKTOP_COVER_DIR / old_name
        dst = DESKTOP_COVER_DIR / new_name
        if not src.exists():
            continue
        if dst.exists():
            continue
        src.rename(dst)


def screenshot_html(browser: Path, html_path: Path, output_path: Path) -> None:
    if not html_path.exists():
        raise FileNotFoundError(f"Missing HTML source: {html_path}")
    if html_path.stat().st_size == 0:
        raise RuntimeError(f"HTML file is empty: {html_path}")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    command = [
        str(browser),
        "--headless",
        "--disable-gpu",
        "--hide-scrollbars",
        "--window-size=1365,768",
        "--virtual-time-budget=5000",
        f"--screenshot={output_path}",
        html_path.resolve().as_uri(),
    ]
    subprocess.run(command, check=True, timeout=90)


def ensure_covers(browser: Path, jobs: Iterable[ResourceJob]) -> None:
    for job in jobs:
        cover_path = DESKTOP_COVER_DIR / job.cover_filename
        if cover_path.exists():
            continue
        if not job.html_path:
            raise FileNotFoundError(f"Missing cover source for {job.title}: {cover_path}")
        try:
            screenshot_html(browser, job.html_path, cover_path)
        except Exception:
            if job.optional_cover:
                continue
            raise


def add_cos_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--secret-id", default=os.getenv("TENCENT_COS_SECRET_ID"))
    parser.add_argument("--secret-key", default=os.getenv("TENCENT_COS_SECRET_KEY"))
    parser.add_argument("--bucket", default=os.getenv("TENCENT_COS_BUCKET", "mathflow-1317654855"))
    parser.add_argument("--region", default=os.getenv("TENCENT_COS_REGION", "ap-guangzhou"))
    parser.add_argument(
        "--public-base-url",
        default=os.getenv(
            "TENCENT_COS_PUBLIC_BASE_URL",
            "https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com",
        ),
    )


def create_cos_client(args: argparse.Namespace) -> CosS3Client:
    if not args.secret_id or not args.secret_key:
        raise SystemExit("Missing COS credentials. Pass --secret-id/--secret-key or set env vars.")
    config = CosConfig(Region=args.region, SecretId=args.secret_id, SecretKey=args.secret_key)
    return CosS3Client(config)


def upload_cos_file(client: CosS3Client, bucket: str, local_path: Path, key: str) -> str:
    content_type = mimetypes.guess_type(local_path.name)[0] or "application/octet-stream"
    with local_path.open("rb") as file_obj:
        client.put_object(
            Bucket=bucket,
            Body=file_obj,
            Key=key,
            ContentType=content_type,
        )
    return key


def sql_text(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def build_sql(
    new_jobs: list[tuple[ResourceJob, str, str]],
    cover_updates: list[tuple[ResourceJob, str]],
) -> str:
    statements: list[str] = []
    for job, file_url, image_url in new_jobs:
        statements.append(
            f"DELETE FROM resources WHERE title = {sql_text(job.title)} OR route_path = {sql_text(job.route_path)};"
        )
        statements.append(
            "INSERT INTO resources "
            "(title, category, grade, image_url, description, file_path, route_path, resource_type) VALUES "
            f"({sql_text(job.title)}, {sql_text(job.category)}, {sql_text(job.grade)}, "
            f"{sql_text(image_url)}, {sql_text(job.description)}, {sql_text(file_url)}, "
            f"{sql_text(job.route_path)}, 'html');"
        )
    for job, image_url in cover_updates:
        statements.append(
            f"UPDATE resources SET image_url = {sql_text(image_url)} "
            f"WHERE route_path = {sql_text(job.route_path)} OR title = {sql_text(job.title)};"
        )
    return "\n".join(statements) + "\n"


def execute_sql(target_args: argparse.Namespace, sql: str) -> None:
    target = resolve_target(target_args)
    remote_tmp = f"{target.remote_repo_root}/tmp/import_desktop_ai_batch.sql"
    local_tmp = Path("C:/Users/p/Desktop/shuzhiliu/tmp_import_desktop_ai_batch.sql")
    local_tmp.write_text(sql, encoding="utf-8")
    client = create_ssh_client(target)
    try:
        with client.open_sftp() as sftp:
            upload_file(sftp, local_tmp, remote_tmp)
        command = (
            f"cat {remote_tmp} | docker exec -i {target.postgres_container} "
            "psql -U mathflow -d mathflow"
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


def main() -> None:
    parser = argparse.ArgumentParser(description="Import desktop HTML resources and covers.")
    add_target_args(parser)
    add_cos_args(parser)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    rename_known_covers()
    browser = find_browser()
    ensure_covers(browser, NEW_RESOURCE_JOBS)
    ensure_covers(browser, [job for job in EXISTING_COVER_UPDATES if job.html_path is not None])

    if args.dry_run:
        for job in NEW_RESOURCE_JOBS:
            print(f"NEW  {job.title} -> collections/ai-apps/{job.slug}.html | collections/covers/{job.cover_filename}")
        for job in EXISTING_COVER_UPDATES:
            print(f"COVER {job.title} -> collections/covers/{job.cover_filename}")
        return

    cos = create_cos_client(args)
    public_base = args.public_base_url.rstrip("/")

    new_sql_jobs: list[tuple[ResourceJob, str, str]] = []
    for job in NEW_RESOURCE_JOBS:
        if not job.html_path:
            continue
        cover_path = DESKTOP_COVER_DIR / job.cover_filename
        html_key = f"collections/ai-apps/{job.slug}.html"
        cover_key = f"collections/covers/{job.cover_filename}"
        upload_cos_file(cos, args.bucket, job.html_path, html_key)
        upload_cos_file(cos, args.bucket, cover_path, cover_key)
        new_sql_jobs.append((job, f"{public_base}/{html_key}", f"{public_base}/{cover_key}"))

    existing_cover_sql_jobs: list[tuple[ResourceJob, str]] = []
    for job in EXISTING_COVER_UPDATES:
        cover_path = DESKTOP_COVER_DIR / job.cover_filename
        if not cover_path.exists():
            continue
        cover_key = f"collections/covers/{job.cover_filename}"
        upload_cos_file(cos, args.bucket, cover_path, cover_key)
        existing_cover_sql_jobs.append((job, f"{public_base}/{cover_key}"))

    sql = build_sql(new_sql_jobs, existing_cover_sql_jobs)
    execute_sql(args, sql)
    print(f"Imported {len(new_sql_jobs)} new resources and updated {len(existing_cover_sql_jobs)} existing covers.")


if __name__ == "__main__":
    main()
