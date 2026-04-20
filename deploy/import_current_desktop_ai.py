from __future__ import annotations

import argparse
import hashlib
import mimetypes
import os
import posixpath
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

from qcloud_cos import CosConfig, CosS3Client

from deploy_shared import add_target_args, create_ssh_client, resolve_target, upload_file


DESKTOP_APPS_DIR = Path(r"C:\Users\p\Desktop\ai应用")
DESKTOP_COVERS_DIR = Path(r"C:\Users\p\Desktop\ai封面")

DEFAULT_BUCKET = "mathflow-1317654855"
DEFAULT_REGION = "ap-guangzhou"
DEFAULT_PUBLIC_BASE_URL = "https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com"


@dataclass(frozen=True)
class ResourceSpec:
    source_name: str
    title: str
    slug: str
    category: str
    grade: str
    description: str
    route_path: str
    cover_name: str | None = None


RESOURCE_SPECS: list[ResourceSpec] = [
    ResourceSpec("AI应用图形的运动：平移与旋转.html", "平移与旋转工坊", "translation-rotation-workshop", "图形与几何", "三年级", "用拖拽和动画理解图形的平移与旋转。", "/pyxz", "translation-rotation-lab.png"),
    ResourceSpec("AI应用｜扇形统计图.html", "扇形统计图实验室", "pie-chart-lab", "统计与概率", "六年级", "在生活情境中动态构建扇形统计图。", "/sxt", "pie-chart-lab.png"),
    ResourceSpec("AI应用｜百分数浓度调节.html", "魔法药水浓度模拟器", "potion-percentages", "数与代数", "六年级", "通过浓度变化理解百分数和配比。", "/nd", None),
    ResourceSpec("AI应用｜长方体切割最大正方体.html", "长方体切割最大正方体", "cuboid-max-cube", "图形与几何", "五年级", "探索长方体切割与最大正方体之间的关系。", "/cftg", None),
    ResourceSpec("三国华容道.html", "三国华容道", "huarongdao-three-kingdoms", "互动游戏", "通用", "经典华容道益智闯关游戏。", "/hrd", "huarongdao-three-kingdoms.png"),
    ResourceSpec("三视图教学.html", "三视图教学", "three-view-builder", "图形与几何", "六年级", "通过积木搭建立体图形并观察三视图。", "/sst", "three-view-builder.png"),
    ResourceSpec("位置探索.html", "位置探索", "position-explorer", "图形与几何", "四年级", "在坐标网格中完成位置定位与数对练习。", "/wz", "position-explorer.png"),
    ResourceSpec("倒数的认识.html", "倒数的认识", "reciprocal-discovery", "数与代数", "六年级", "通过乘积关系理解倒数。", "/ds", "reciprocal-discovery.png"),
    ResourceSpec("几何画板.html", "几何画板", "geocanvas-pro", "图形与几何", "通用", "自由绘制与探索几何关系。", "/jh", None),
    ResourceSpec("利率.html", "利率", "interest-calculator", "数与代数", "六年级", "通过理财情境理解利率与利息计算。", "/ll", "interest-calculator.png"),
    ResourceSpec("十进制的世界.html", "十进制的世界", "decimal-world", "数与代数", "三年级", "用位值模型理解个十百千。", "/sjs", "decimal-world.png"),
    ResourceSpec("吃豆人角度规.html", "吃豆人角度规", "pacman-angle-lab", "互动游戏", "四年级", "通过吃豆人动画认识角度。", "/jdg", "pacman-angle-lab.png"),
    ResourceSpec("喝果汁问题.html", "喝果汁问题", "juice-mixing-problem", "数与代数", "六年级", "在加水和配比变化中理解量与比例关系。", "/lab/hgzwt", None),
    ResourceSpec("噩梦人机：五子棋.html", "欢乐五子棋", "gomoku-fun", "互动游戏", "通用", "适合课堂放松和策略训练的五子棋。", "/wzq", "gomoku-fun.png"),
    ResourceSpec("噩梦人机：黑白棋.html", "黑白棋大师", "othello-ai", "互动游戏", "通用", "支持人机对战的黑白棋互动游戏。", "/hbq", "othello-ai.png"),
    ResourceSpec("圆柱展开教学.html", "圆柱展开教学", "cylinder-net-explorer", "图形与几何", "六年级", "比较不同切开方式形成的圆柱展开图。", "/yzzk", "cylinder-net-explorer.png"),
    ResourceSpec("圆柱的体积.html", "圆柱体积推导", "cylinder-volume", "图形与几何", "六年级", "借助转化思想推导圆柱体积公式。", "/yztj", "cylinder-volume.png"),
    ResourceSpec("圆柱表面积推导.html", "圆柱表面积推导", "cylinder-surface-area", "图形与几何", "六年级", "通过展开和拼接理解圆柱表面积。", "/yzbm", "cylinder-surface-area.png"),
    ResourceSpec("圆的周长推导.html", "圆的周长推导", "circle-circumference-derivation", "图形与几何", "六年级", "用滚动和展开理解圆周长。", "/yzc", None),
    ResourceSpec("平行四边形第四个点在哪.html", "平行四边形第四个点在哪", "parallelogram-fourth-point", "图形与几何", "五年级", "在动态拖拽中理解平行四边形的性质。", "/lab/pxsbxdsgdzn", None),
    ResourceSpec("打折的奥秘.html", "打折的奥秘", "discount-mystery", "数与代数", "六年级", "围绕折扣和现价的互动课件。", "/dz", "discount-traps.png"),
    ResourceSpec("探索负数的世界.html", "探索负数的世界", "negative-world", "数与代数", "六年级", "在多维场景中认识负数与数轴变化。", "/qzfs", "negative-world.png"),
    ResourceSpec("旋转体可视化.html", "旋转体可视化", "solid-of-revolution", "图形与几何", "六年级", "观察平面图形旋转生成立体图形的过程。", "/xzt", None),
    ResourceSpec("智慧树.HTML", "智慧树", "wisdom-tree", "综合实践", "通用", "适合课堂激励与班级互动的智慧树。", "/lab/zhihuishu", "classroom-wisdom-tree.png"),
    ResourceSpec("比例的意义.html", "比例的意义", "proportion-meaning", "数与代数", "六年级", "通过互动实验理解比例的意义。", "/lab/bldyy", "proportion-interactive-lab.png"),
    ResourceSpec("比的意义.html", "比的意义", "ratio-meaning", "数与代数", "六年级", "通过配比实验理解比的意义。", "/bd", "ratio-meaning.png"),
    ResourceSpec("班级树4.0版本(2).html", "班级树4.0", "classroom-tree-4", "综合实践", "通用", "面向班级积分与成长激励的互动页面。", "/lab/bjss40", "classroom-wisdom-tree.png"),
    ResourceSpec("百分数折扣成数.html", "百分数折扣成数", "discount-rate-lab", "数与代数", "六年级", "把百分数、折扣和成数放到统一情境中理解。", "/zk", None),
    ResourceSpec("百分数的意义.html", "百分数的意义", "percentage-meaning", "数与代数", "六年级", "用百格图和生活模型理解百分数。", "/bfs", "percentage-meaning.png"),
    ResourceSpec("表面涂色的正方体.html", "表面涂色的正方体", "painted-cube", "图形与几何", "五年级", "观察涂色正方体中顶点、棱和面的规律。", "/bmts", "painted-cube.png"),
    ResourceSpec("趣味数独.html", "趣味数独", "sudoku-fun", "互动游戏", "通用", "数字逻辑与推理训练互动游戏。", "/sd", "sudoku-fun.png"),
    ResourceSpec("鸡兔同笼.html", "鸡兔同笼", "chicken-rabbit-cage", "数与代数", "五年级", "通过列表和假设法理解鸡兔同笼问题。", "/lab/jttl", None),
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Upload desktop AI apps and covers to COS and PostgreSQL.")
    add_target_args(parser)
    parser.add_argument("--secret-id", default=os.getenv("TENCENT_SECRET_ID", ""))
    parser.add_argument("--secret-key", default=os.getenv("TENCENT_SECRET_KEY", ""))
    parser.add_argument("--bucket", default=os.getenv("TENCENT_COS_BUCKET", DEFAULT_BUCKET))
    parser.add_argument("--region", default=os.getenv("TENCENT_COS_REGION", DEFAULT_REGION))
    parser.add_argument("--public-base-url", default=os.getenv("TENCENT_COS_PUBLIC_BASE_URL", DEFAULT_PUBLIC_BASE_URL))
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def create_cos_client(args: argparse.Namespace) -> CosS3Client:
    if not args.secret_id or not args.secret_key:
        raise SystemExit("Missing COS credentials.")
    config = CosConfig(Region=args.region, SecretId=args.secret_id, SecretKey=args.secret_key)
    return CosS3Client(config)


def find_browser() -> Path:
    candidates = [
        Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
        Path(r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"),
        Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise SystemExit("No supported browser found for screenshots.")


def screenshot_cover(browser: Path, html_path: Path, output_path: Path) -> None:
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


def slug_hash(value: str) -> str:
    return hashlib.md5(value.encode("utf-8")).hexdigest()[:8]


def choose_cover_name(spec: ResourceSpec) -> str:
    if spec.cover_name:
      return spec.cover_name
    return f"{spec.slug}.png"


def ensure_cover(browser: Path, spec: ResourceSpec) -> Path:
    cover_name = choose_cover_name(spec)
    cover_path = DESKTOP_COVERS_DIR / cover_name
    if cover_path.exists():
        return cover_path

    html_path = DESKTOP_APPS_DIR / spec.source_name
    screenshot_cover(browser, html_path, cover_path)
    return cover_path


def upload_cos_file(client: CosS3Client, bucket: str, local_path: Path, key: str) -> str:
    content_type = mimetypes.guess_type(local_path.name)[0] or "application/octet-stream"
    with local_path.open("rb") as file_obj:
        client.put_object(Bucket=bucket, Body=file_obj, Key=key, ContentType=content_type)
    return key


def sql_quote(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def build_sql(rows: list[tuple[ResourceSpec, str, str]]) -> str:
    statements: list[str] = []
    for spec, file_url, image_url in rows:
        statements.append(
            f"DELETE FROM resources WHERE route_path = {sql_quote(spec.route_path)} OR title = {sql_quote(spec.title)};"
        )
        statements.append(
            "INSERT INTO resources (title, category, grade, image_url, description, file_path, route_path, resource_type)\n"
            f"VALUES ({sql_quote(spec.title)}, {sql_quote(spec.category)}, {sql_quote(spec.grade)}, {sql_quote(image_url)}, "
            f"{sql_quote(spec.description)}, {sql_quote(file_url)}, {sql_quote(spec.route_path)}, 'html');"
        )
    return "\n".join(statements) + "\n"


def execute_sql(args: argparse.Namespace, sql: str) -> None:
    target = resolve_target(args)
    local_tmp = Path(tempfile.gettempdir()) / "import_current_desktop_ai.sql"
    remote_tmp = f"{target.remote_repo_root}/tmp/import_current_desktop_ai.sql"
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
    browser = find_browser()

    rows: list[tuple[ResourceSpec, Path, Path]] = []
    for spec in RESOURCE_SPECS:
        html_path = DESKTOP_APPS_DIR / spec.source_name
        if not html_path.exists():
            raise FileNotFoundError(f"Missing HTML: {html_path}")
        if html_path.stat().st_size == 0:
            print(f"Skip empty HTML: {html_path.name}")
            continue
        cover_path = ensure_cover(browser, spec)
        rows.append((spec, html_path, cover_path))

    if args.dry_run:
        for spec, html_path, cover_path in rows:
            print(f"{spec.title} -> {html_path.name} | {cover_path.name} | {spec.route_path}")
        return

    cos = create_cos_client(args)
    public_base = args.public_base_url.rstrip("/")

    uploaded_rows: list[tuple[ResourceSpec, str, str]] = []
    for spec, html_path, cover_path in rows:
        html_key = f"collections/ai-apps/{spec.slug}.html"
        cover_key = f"collections/covers/{choose_cover_name(spec)}"
        upload_cos_file(cos, args.bucket, html_path, html_key)
        upload_cos_file(cos, args.bucket, cover_path, cover_key)
        uploaded_rows.append((spec, f"{public_base}/{html_key}", f"{public_base}/{cover_key}"))

    sql = build_sql(uploaded_rows)
    execute_sql(args, sql)
    print(f"Uploaded {len(uploaded_rows)} resources.")


if __name__ == "__main__":
    main()
