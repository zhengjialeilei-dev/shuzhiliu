from __future__ import annotations

import argparse
import json
import tempfile
from pathlib import Path

from qcloud_cos import CosConfig, CosS3Client
from deploy_shared import add_target_args, create_ssh_client, resolve_target


SHORT_ROUTE_ALIASES = {
    "sudoku-fun": "/sd",
    "huarongdao-three-kingdoms": "/hrd",
    "three-view-builder": "/sst",
    "decimal-world": "/sjs",
    "negative-world": "/fs",
    "position-explorer": "/wz",
    "solid-of-revolution": "/xzt",
    "circle-circumference-derivation": "/yzc",
    "cylinder-surface-area": "/yzbm",
    "cylinder-volume": "/yztj",
    "cylinder-net-explorer": "/yzzk",
    "potion-percentages": "/nd",
    "pie-chart-lab": "/sxt",
    "cuboid-max-cube": "/cftg",
    "translation-rotation-lab": "/pyxz",
    "percentage-meaning": "/bfs",
    "discount-traps": "/zk",
    "ratio-meaning": "/bd",
    "painted-cube": "/bmts",
    "pacman-angle-lab": "/jdg",
    "discount-mystery": "/dz",
    "reciprocal-discovery": "/ds",
    "othello-ai": "/hbq",
    "gomoku-fun": "/wzq",
    "geocanvas-pro": "/jh",
    "interest-calculator": "/ll",
    "interest-courseware": "/llkj",
}


RESOURCE_ACTIONS = [
    {
        "title": "趣味数独",
        "match_titles": ["趣味数独", "🧩 趣味数独"],
        "category": "综合实践",
        "grade": "通用",
        "description": "数字逻辑与推理训练互动游戏。",
        "html_file": "趣味数独.html",
        "slug": "sudoku-fun",
        "cover_source": "provided",
        "cover_file": "6dba01ae05892606174d20b5194e2416.png",
    },
    {
        "title": "三国华容道",
        "match_titles": ["三国华容道", "华容道 - 经典版"],
        "category": "综合实践",
        "grade": "通用",
        "description": "经典华容道益智闯关互动游戏。",
        "html_file": "三国华容道.html",
        "slug": "huarongdao-three-kingdoms",
        "cover_source": "provided",
        "cover_file": "f1197433-0559-40e5-bc1b-d2742686a2cf.png",
    },
    {
        "title": "三视图教学",
        "match_titles": ["三视图教学", "趣味方块搭建 - 三视图教学"],
        "category": "图形与几何",
        "grade": "六年级",
        "description": "通过方块搭建理解三视图与空间想象。",
        "html_file": "三视图教学.html",
        "slug": "three-view-builder",
        "cover_source": "provided",
        "cover_file": "25a52d68-1c2f-41da-8a96-7487d0ec877e.png",
    },
    {
        "title": "十进制的世界",
        "match_titles": ["十进制的世界", "3D 位值演示 (个-十-百-千)"],
        "category": "数与代数",
        "grade": "三年级",
        "description": "用三维积木理解个、十、百、千的位值关系。",
        "html_file": "十进制的世界.html",
        "slug": "decimal-world",
        "cover_source": "provided",
        "cover_file": "cc7957441d33ef3d1f638703a3a5e9c2.png",
    },
    {
        "title": "探索负数的世界",
        "match_titles": ["探索负数的世界", "负数的认识：多维世界"],
        "category": "数与代数",
        "grade": "六年级",
        "description": "在多维场景中认识负数与数轴变化。",
        "html_file": "探索负数的世界.html",
        "slug": "negative-world",
        "cover_source": "provided",
        "cover_file": "090eec51f54c071c46f7589c9a094043.png",
    },
    {
        "title": "位置探索",
        "match_titles": ["位置探索", "位置：数对探索之旅"],
        "category": "图形与几何",
        "grade": "四年级",
        "description": "用数对和坐标网格完成位置定位探索。",
        "html_file": "位置探索.html",
        "slug": "position-explorer",
        "cover_source": "provided",
        "cover_file": "0632b87a5c60c6e669b2ec4779551949.png",
    },
    {
        "title": "旋转体可视化",
        "match_titles": ["旋转体可视化", "旋转体生成可视化工具"],
        "category": "图形与几何",
        "grade": "六年级",
        "description": "观察平面图形旋转生成立体图形的过程。",
        "html_file": "旋转体可视化.html",
        "slug": "solid-of-revolution",
        "cover_source": "generated",
        "cover_file": "solid-of-revolution.png",
    },
    {
        "title": "圆的周长推导",
        "match_titles": ["圆的周长推导", "圆的周长 - 教学演示"],
        "category": "图形与几何",
        "grade": "六年级",
        "description": "通过滚动与展开理解圆周长公式。",
        "html_file": "圆的周长推导.html",
        "slug": "circle-circumference-derivation",
        "cover_source": "generated",
        "cover_file": "circle-circumference-derivation.png",
    },
    {
        "title": "圆柱表面积推导",
        "match_titles": ["圆柱表面积推导", "快乐几何工坊 - 教学逻辑终极版"],
        "category": "图形与几何",
        "grade": "六年级",
        "description": "借助展开与割补理解圆柱表面积。",
        "html_file": "圆柱表面积推导.html",
        "slug": "cylinder-surface-area",
        "cover_source": "provided",
        "cover_file": "c78f63e1af235d5d6a557e89a164b5fd.png",
    },
    {
        "title": "圆柱体积推导",
        "match_titles": ["圆柱体积推导", "圆柱体积推导可视化 - 修复版"],
        "category": "图形与几何",
        "grade": "六年级",
        "description": "用割补思想推导圆柱体积公式。",
        "html_file": "圆柱的体积.html",
        "slug": "cylinder-volume",
        "cover_source": "provided",
        "cover_file": "c5f4c687-1348-4062-a016-b499d9f8d03c.png",
    },
    {
        "title": "圆柱展开教学",
        "match_titles": ["圆柱展开教学", "同一个圆柱的展开图"],
        "category": "图形与几何",
        "grade": "六年级",
        "description": "比较不同剪开方式形成的圆柱展开图。",
        "html_file": "圆柱展开教学.html",
        "slug": "cylinder-net-explorer",
        "cover_source": "provided",
        "cover_file": "d56fca41-ed1a-4683-b18c-5bceebee1632.png",
    },
    {
        "title": "魔法药水浓度模拟器",
        "match_titles": ["魔法药水浓度模拟器", "魔法药水浓度模拟器 - 百分数的认识"],
        "category": "数与代数",
        "grade": "六年级",
        "description": "通过液体浓度变化理解百分数意义。",
        "html_file": "AI应用｜百分数浓度调节.html",
        "slug": "potion-percentages",
        "cover_source": "generated",
        "cover_file": "potion-percentages.png",
    },
    {
        "title": "扇形统计图实验室",
        "match_titles": ["扇形统计图实验室", "跨学科数学：扇形统计图实验室"],
        "category": "统计与概率",
        "grade": "六年级",
        "description": "在生活情境中动态构建扇形统计图。",
        "html_file": "AI应用｜扇形统计图.html",
        "slug": "pie-chart-lab",
        "cover_source": "provided",
        "cover_file": "b56e89a9-870a-439d-85a4-514b8b25bb41.png",
    },
    {
        "title": "长方体切割最大正方体",
        "match_titles": ["长方体切割最大正方体", "长方体切割最大正方体演示"],
        "category": "图形与几何",
        "grade": "五年级",
        "description": "探索长方体切割与最大正方体的关系。",
        "html_file": "AI应用｜长方体切割最大正方体.html",
        "slug": "cuboid-max-cube",
        "cover_source": "generated",
        "cover_file": "cuboid-max-cube.png",
    },
    {
        "title": "平移与旋转工坊",
        "match_titles": ["平移与旋转工坊", "糖果色几何工坊：平移与旋转"],
        "category": "图形与几何",
        "grade": "三年级",
        "description": "在几何工坊中理解图形的平移与旋转。",
        "html_file": "AI应用图形的运动：平移与旋转.html",
        "slug": "translation-rotation-lab",
        "cover_source": "generated",
        "cover_file": "translation-rotation-lab.png",
    },
    {
        "title": "百分数的意义",
        "match_titles": ["百分数的意义", "百分数探索实验室 - 布局修复版"],
        "category": "数与代数",
        "grade": "六年级",
        "description": "用百格图和生活模型理解百分数。",
        "html_file": "百分数的意义.html",
        "slug": "percentage-meaning",
        "cover_source": "provided",
        "cover_file": "50f05560d570ab9906f58834634fe513.png",
    },
    {
        "title": "百分数折扣成数",
        "match_titles": ["百分数折扣成数", "百分数(二)：多重折扣与陷阱演示"],
        "category": "数与代数",
        "grade": "六年级",
        "description": "通过收银台模拟理解折扣、成数与税费。",
        "html_file": "百分数折扣成数.html",
        "slug": "discount-traps",
        "cover_source": "provided",
        "cover_file": "3d4e6a339860d7726aa49f518f50997b.png",
    },
    {
        "title": "比的意义",
        "match_titles": ["比的意义", "数学实验室：比的意义与基本性质 (Layout Fixed)"],
        "category": "数与代数",
        "grade": "六年级",
        "description": "通过配比实验理解比的意义与基本性质。",
        "html_file": "比的意义.html",
        "slug": "ratio-meaning",
        "cover_source": "provided",
        "cover_file": "eb04d09d2b63071d273d4b4fc24f88c9.png",
    },
    {
        "title": "表面涂色的正方体",
        "match_titles": ["表面涂色的正方体", "探索图形 - 表面涂色的正方体"],
        "category": "图形与几何",
        "grade": "五年级",
        "description": "观察涂色正方体的点、棱、面规律。",
        "html_file": "表面涂色的正方体.html",
        "slug": "painted-cube",
        "cover_source": "provided",
        "cover_file": "38a9ff72-3ccd-466c-9150-1b4e4614911d.png",
    },
    {
        "title": "吃豆人角度规",
        "match_titles": ["吃豆人角度规", "魔法吃豆人角度乐园 v2.0"],
        "category": "图形与几何",
        "grade": "四年级",
        "description": "用吃豆人动画认识锐角、直角和钝角。",
        "html_file": "吃豆人角度规.html",
        "slug": "pacman-angle-lab",
        "cover_source": "provided",
        "cover_file": "6f124304ea57041d1271ff93e581480f.png",
    },
    {
        "title": "打折的奥秘",
        "match_titles": ["打折的奥秘", "打折的奥秘 - 全屏互动课件"],
        "category": "数与代数",
        "grade": "六年级",
        "description": "围绕折扣概念的课堂互动课件。",
        "html_file": "打折的奥秘.html",
        "slug": "discount-mystery",
        "cover_source": "generated",
        "cover_file": "discount-mystery.png",
    },
    {
        "title": "倒数的认识",
        "match_titles": ["倒数的认识", "六年级数学：倒数的认识"],
        "category": "数与代数",
        "grade": "六年级",
        "description": "通过乘积为 1 的关系理解倒数。",
        "html_file": "倒数的认识.html",
        "slug": "reciprocal-discovery",
        "cover_source": "provided",
        "cover_file": "ccddd6b4-4f74-4107-b74b-25d7acdc0491.png",
    },
    {
        "title": "黑白棋大师",
        "match_titles": ["黑白棋大师", "黑白棋大师 - AI对战版"],
        "category": "综合实践",
        "grade": "通用",
        "description": "支持人机对战的黑白棋互动游戏。",
        "html_file": "噩梦人机：黑白棋.html",
        "slug": "othello-ai",
        "cover_source": "provided",
        "cover_file": "66a34ba33ccf10b4cfb49fa0ea8c95c6.png",
    },
    {
        "title": "欢乐五子棋",
        "match_titles": ["欢乐五子棋", "欢乐五子棋 - 小学生版"],
        "category": "综合实践",
        "grade": "通用",
        "description": "适合课堂休息或逻辑训练的五子棋。",
        "html_file": "噩梦人机：五子棋.html",
        "slug": "gomoku-fun",
        "cover_source": "provided",
        "cover_file": "7cf675a8ed03565a63d48fb0c3762fcf.png",
    },
    {
        "title": "几何画板",
        "match_titles": ["几何画板", "GeoCanvas Pro"],
        "category": "图形与几何",
        "grade": "通用",
        "description": "自由绘制与探索几何图形关系。",
        "html_file": "几何画板.html",
        "slug": "geocanvas-pro",
        "cover_source": "generated",
        "cover_file": "geocanvas-pro.png",
    },
    {
        "title": "利率",
        "match_titles": ["利率", "六年级数学：小小理财家（利率模拟器）"],
        "category": "数与代数",
        "grade": "六年级",
        "description": "通过理财场景理解利率与利息计算。",
        "html_file": "利率.html",
        "slug": "interest-calculator",
        "cover_source": "provided",
        "cover_file": "194856a4-977e-43e4-87ef-0e9dbef53283.png",
    },
    {
        "title": "利率课件",
        "match_titles": ["利率课件", "第4课时：利率 (互动教学版)"],
        "category": "数与代数",
        "grade": "六年级",
        "description": "利率概念与计算的互动课件。",
        "html_file": "利率课件.html",
        "slug": "interest-courseware",
        "cover_source": "provided",
        "cover_file": "faa3c3f201ce6be2bf02386b518d40a1.png",
    },
]


def sql_quote(value: str | None) -> str:
    if value is None:
        return "NULL"
    return "'" + value.replace("'", "''") + "'"


def upload_file(client: CosS3Client, bucket: str, public_base: str, local_path: Path, cos_key: str, content_type: str) -> str:
    with local_path.open("rb") as handle:
        client.put_object(
            Bucket=bucket,
            Key=cos_key,
            Body=handle,
            ACL="public-read",
            ContentType=content_type,
        )
    return f"{public_base.rstrip('/')}/{cos_key}"


def build_in_clause(values: list[str]) -> str:
    return ", ".join(sql_quote(value) for value in values)


def build_sql(resources: list[dict]) -> str:
    statements: list[str] = []

    for item in resources:
        title_candidates = item["match_titles"] if item["match_titles"] else [item["title"]]
        title_set_sql = build_in_clause(title_candidates)

        statements.append(
            f"""
WITH target AS (
  SELECT id
  FROM resources
  WHERE title IN ({title_set_sql})
  ORDER BY created_at DESC
  LIMIT 1
)
UPDATE resources
SET title = {sql_quote(item['title'])},
    category = {sql_quote(item['category'])},
    grade = {sql_quote(item['grade'])},
    image_url = {sql_quote(item['image_url'])},
    description = {sql_quote(item['description'])},
    file_path = {sql_quote(item['file_url'])},
    route_path = {sql_quote(item.get('route_path'))},
    resource_type = 'html'
WHERE id IN (SELECT id FROM target);

INSERT INTO resources (title, category, grade, image_url, description, file_path, route_path, resource_type)
SELECT {sql_quote(item['title'])},
       {sql_quote(item['category'])},
       {sql_quote(item['grade'])},
       {sql_quote(item['image_url'])},
       {sql_quote(item['description'])},
       {sql_quote(item['file_url'])},
       {sql_quote(item.get('route_path'))},
       'html'
WHERE NOT EXISTS (
  SELECT 1 FROM resources WHERE title IN ({title_set_sql})
);
""".strip()
        )

    statements.append(
        "SELECT title, category, grade, file_path FROM resources WHERE title IN ("
        + build_in_clause([item["title"] for item in resources])
        + ") ORDER BY title;"
    )

    return "\n\n".join(statements) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apps-dir", required=True)
    parser.add_argument("--covers-dir", required=True)
    parser.add_argument("--generated-covers-dir", required=True)
    parser.add_argument("--cos-secret-id", required=True)
    parser.add_argument("--cos-secret-key", required=True)
    parser.add_argument("--bucket", required=True)
    parser.add_argument("--region", default="ap-guangzhou")
    parser.add_argument("--db-user", default="mathflow")
    parser.add_argument("--db-name", default="mathflow")
    add_target_args(parser)
    args = parser.parse_args()
    target = resolve_target(args)

    apps_dir = Path(args.apps_dir)
    covers_dir = Path(args.covers_dir)
    generated_covers_dir = Path(args.generated_covers_dir)

    cos_client = CosS3Client(
        CosConfig(
            Region=args.region,
            SecretId=args.cos_secret_id,
            SecretKey=args.cos_secret_key,
            Scheme="https",
        )
    )
    public_base = f"https://{args.bucket}.cos.{args.region}.myqcloud.com"

    resources = [dict(item) for item in RESOURCE_ACTIONS]

    for item in resources:
        html_path = apps_dir / item["html_file"]
        cover_dir = covers_dir if item["cover_source"] == "provided" else generated_covers_dir
        cover_path = cover_dir / item["cover_file"]

        if not html_path.exists():
            raise FileNotFoundError(f"Missing html file: {html_path}")
        if not cover_path.exists():
            raise FileNotFoundError(f"Missing cover file: {cover_path}")

        item["html_local_path"] = html_path
        item["cover_local_path"] = cover_path
        item["file_url"] = upload_file(
            cos_client,
            args.bucket,
            public_base,
            html_path,
            f"collections/ai-apps/{item['slug']}.html",
            "text/html; charset=utf-8",
        )
        item["image_url"] = upload_file(
            cos_client,
            args.bucket,
            public_base,
            cover_path,
            f"collections/covers/{item['slug']}.png",
            "image/png",
        )
        item["route_path"] = SHORT_ROUTE_ALIASES.get(item["slug"])

    sql_file = Path(tempfile.gettempdir()) / "mathflow-ai-apps-import.sql"
    manifest_file = Path(tempfile.gettempdir()) / "mathflow-ai-apps-import-manifest.json"
    sql_file.write_text(build_sql(resources), encoding="utf-8")
    manifest_file.write_text(
        json.dumps(
            {
                "resources": [
                    {
                        "title": item["title"],
                        "html_file": item["html_file"],
                        "cover_file": item["cover_file"],
                        "cover_source": item["cover_source"],
                        "file_url": item["file_url"],
                        "image_url": item["image_url"],
                    }
                    for item in resources
                ]
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    remote_sql = "/root/mathflow-ai-apps-import.sql"
    remote_manifest = "/root/mathflow-ai-apps-import-manifest.json"
    ssh = create_ssh_client(target)
    try:
        sftp = ssh.open_sftp()
        sftp.put(str(sql_file), remote_sql)
        sftp.put(str(manifest_file), remote_manifest)
        sftp.close()

        commands = [
            f"bash -lc 'docker exec -i {target.postgres_container} psql -U {args.db_user} -d {args.db_name} < {remote_sql}'",
            f"docker exec {target.postgres_container} psql -U {args.db_user} -d {args.db_name} -c \"select count(*) from resources;\"",
        ]
        for command in commands:
            print(f"===== CMD: {command} =====")
            stdin, stdout, stderr = ssh.exec_command(command, timeout=1200)
            output = stdout.read().decode("utf-8", errors="replace")
            error = stderr.read().decode("utf-8", errors="replace")
            if output:
                print(output)
            if error:
                print("--- STDERR ---")
                print(error)
    finally:
        ssh.close()

    print(manifest_file.read_text(encoding="utf-8"))


if __name__ == "__main__":
    main()
