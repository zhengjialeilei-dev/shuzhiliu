from __future__ import annotations

import argparse
import json
import tempfile
from pathlib import Path

from qcloud_cos import CosConfig, CosS3Client
from deploy_shared import add_target_args, create_ssh_client, resolve_target


RESOURCE_ACTIONS = [
    {
        "title": "SVG 扇形统计图",
        "category": "统计与概率",
        "grade": "六年级",
        "description": "交互式扇形统计图教学资源",
        "image_url": "https://api.dicebear.com/7.x/shapes/svg?seed=PieChart",
        "filename": "SVG 扇形统计图教学程序.html",
        "cos_key": "legacy/ai-apps/svg-pie-chart-teaching.html",
    },
    {
        "title": "圆的面积推导",
        "category": "图形与几何",
        "grade": "六年级",
        "description": "圆的面积公式推导演示",
        "image_url": "https://api.dicebear.com/7.x/shapes/svg?seed=CircleArea",
        "filename": "ci.HTML",
        "cos_key": "legacy/ai-apps/circle-area-derivation.html",
    },
    {
        "title": "奇异博士",
        "category": "综合实践",
        "grade": "拓展",
        "description": "趣味数学互动",
        "image_url": "https://api.dicebear.com/7.x/shapes/svg?seed=DoctorStrangeMath",
        "filename": "奇异博士.html",
        "cos_key": "legacy/ai-apps/doctor-strange-math.html",
    },
    {
        "title": "全栈负数教学",
        "category": "数与代数",
        "grade": "六年级",
        "description": "负数概念综合教学",
        "image_url": "https://api.dicebear.com/7.x/shapes/svg?seed=NegativeNumbersLab",
        "filename": "全栈负数教学SPA整合.HTML",
        "cos_key": "legacy/ai-apps/negative-numbers-lab.html",
    },
    {
        "title": "扇形统计图实验室",
        "category": "统计与概率",
        "grade": "六年级",
        "description": "跨学科数学：扇形统计图实验室",
        "image_url": "https://api.dicebear.com/7.x/shapes/svg?seed=PieChartLab",
        "filename": "AI应用｜扇形统计图.html",
        "cos_key": "legacy/ai-apps/pie-chart-lab.html",
    },
    {
        "title": "魔法药水浓度模拟器",
        "category": "数与代数",
        "grade": "六年级",
        "description": "魔法药水浓度模拟器 - 百分数的认识",
        "image_url": "https://api.dicebear.com/7.x/shapes/svg?seed=PotionPercentages",
        "filename": "AI应用｜百分数浓度调节.html",
        "cos_key": "legacy/ai-apps/potion-percentages.html",
    },
    {
        "title": "长方体切割最大正方体",
        "category": "图形与几何",
        "grade": "五年级",
        "description": "长方体切割最大正方体演示",
        "image_url": "https://api.dicebear.com/7.x/shapes/svg?seed=CuboidMaxCube",
        "filename": "AI应用｜长方体切割最大正方体.html",
        "cos_key": "legacy/ai-apps/cuboid-max-cube.html",
    },
]

TEACHING_ACTIONS = [
    {
        "title": "数学课程标准",
        "description": "课程标准文档（由旧项目导入）",
        "zone": "standard",
        "file_type": "pdf",
        "filename": "数学课标.pdf",
        "cos_key": "legacy/files/math-standard.pdf",
    },
    {
        "title": "课程实施方案",
        "description": "课程实施方案文档（由旧项目导入）",
        "zone": "standard",
        "file_type": "pdf",
        "filename": "课标方案.pdf",
        "cos_key": "legacy/files/curriculum-implementation-plan.pdf",
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


def build_sql(resources: list[dict], teaching_resources: list[dict]) -> str:
    statements: list[str] = []

    for item in resources:
        statements.append(
            f"""
UPDATE resources
SET category = {sql_quote(item['category'])},
    grade = {sql_quote(item['grade'])},
    image_url = {sql_quote(item['image_url'])},
    description = {sql_quote(item['description'])},
    file_path = {sql_quote(item['file_url'])},
    route_path = NULL,
    resource_type = 'html'
WHERE title = {sql_quote(item['title'])};

INSERT INTO resources (title, category, grade, image_url, description, file_path, route_path, resource_type)
SELECT {sql_quote(item['title'])}, {sql_quote(item['category'])}, {sql_quote(item['grade'])}, {sql_quote(item['image_url'])}, {sql_quote(item['description'])}, {sql_quote(item['file_url'])}, NULL, 'html'
WHERE NOT EXISTS (SELECT 1 FROM resources WHERE title = {sql_quote(item['title'])});
""".strip()
        )

    for item in teaching_resources:
        statements.append(
            f"""
UPDATE teaching_resources
SET description = {sql_quote(item['description'])},
    zone = {sql_quote(item['zone'])},
    file_url = {sql_quote(item['file_url'])},
    file_type = {sql_quote(item['file_type'])}
WHERE title = {sql_quote(item['title'])};

INSERT INTO teaching_resources (title, description, zone, file_url, file_type)
SELECT {sql_quote(item['title'])}, {sql_quote(item['description'])}, {sql_quote(item['zone'])}, {sql_quote(item['file_url'])}, {sql_quote(item['file_type'])}
WHERE NOT EXISTS (SELECT 1 FROM teaching_resources WHERE title = {sql_quote(item['title'])});
""".strip()
        )

    statements.append(
        "SELECT title, category, grade, file_path FROM resources WHERE title IN "
        "('SVG 扇形统计图','圆的面积推导','奇异博士','全栈负数教学','扇形统计图实验室','魔法药水浓度模拟器','长方体切割最大正方体') "
        "ORDER BY title;"
    )
    statements.append(
        "SELECT title, zone, file_url FROM teaching_resources WHERE title IN ('数学课程标准','课程实施方案') ORDER BY title;"
    )

    return "\n\n".join(statements) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--legacy-root", required=True)
    parser.add_argument("--cos-secret-id", required=True)
    parser.add_argument("--cos-secret-key", required=True)
    parser.add_argument("--bucket", required=True)
    parser.add_argument("--region", default="ap-guangzhou")
    parser.add_argument("--db-user", default="mathflow")
    parser.add_argument("--db-name", default="mathflow")
    add_target_args(parser)
    args = parser.parse_args()
    target = resolve_target(args)

    legacy_root = Path(args.legacy_root)
    ai_lookup = {file.name: file for file in (legacy_root / "ai-apps").iterdir() if file.is_file()}
    teaching_lookup = {file.name: file for file in (legacy_root / "files").iterdir() if file.is_file()}

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
    teaching_resources = [dict(item) for item in TEACHING_ACTIONS]

    for item in resources:
        item["local_path"] = ai_lookup[item["filename"]]
        item["file_url"] = upload_file(
            cos_client,
            args.bucket,
            public_base,
            item["local_path"],
            item["cos_key"],
            "text/html; charset=utf-8",
        )

    for item in teaching_resources:
        item["local_path"] = teaching_lookup[item["filename"]]
        item["file_url"] = upload_file(
            cos_client,
            args.bucket,
            public_base,
            item["local_path"],
            item["cos_key"],
            "application/pdf",
        )

    sql_file = Path(tempfile.gettempdir()) / "mathflow-legacy-import.sql"
    manifest_file = Path(tempfile.gettempdir()) / "mathflow-legacy-import-manifest.json"
    sql_file.write_text(build_sql(resources, teaching_resources), encoding="utf-8")
    manifest_file.write_text(
        json.dumps(
            {
                "resources": [
                    {
                        "title": item["title"],
                        "filename": item["filename"],
                        "file_url": item["file_url"],
                        "cos_key": item["cos_key"],
                    }
                    for item in resources
                ],
                "teaching_resources": [
                    {
                        "title": item["title"],
                        "filename": item["filename"],
                        "file_url": item["file_url"],
                        "cos_key": item["cos_key"],
                    }
                    for item in teaching_resources
                ],
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    remote_sql = "/root/mathflow-legacy-import.sql"
    remote_manifest = "/root/mathflow-legacy-import-manifest.json"
    ssh = create_ssh_client(target)
    try:
        sftp = ssh.open_sftp()
        sftp.put(str(sql_file), remote_sql)
        sftp.put(str(manifest_file), remote_manifest)
        sftp.close()

        commands = [
            # Feed the host-side SQL file into psql running inside the container.
            f"bash -lc 'docker exec -i {target.postgres_container} psql -U {args.db_user} -d {args.db_name} < {remote_sql}'",
            f"docker exec {target.postgres_container} psql -U {args.db_user} -d {args.db_name} -c \"select count(*) from resources;\" -c \"select count(*) from teaching_resources;\"",
        ]
        for command in commands:
            print(f"===== CMD: {command} =====")
            stdin, stdout, stderr = ssh.exec_command(command, timeout=600)
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
