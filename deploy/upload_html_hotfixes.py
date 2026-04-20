from __future__ import annotations

import argparse
from pathlib import Path

from qcloud_cos import CosConfig, CosS3Client


UPLOADS = [
    (Path(r"C:\Users\p\Desktop\ai应用\AI应用图形的运动：平移与旋转.html"), "collections/ai-apps/translation-rotation-lab.html"),
    (Path(r"C:\Users\p\Desktop\ai应用\圆柱表面积推导.html"), "collections/ai-apps/cylinder-surface-area.html"),
    (Path(r"C:\Users\p\Desktop\ai应用\圆的周长推导.html"), "collections/ai-apps/circle-circumference-derivation.html"),
    (Path(r"C:\Users\p\Desktop\ai应用\AI应用｜扇形统计图.html"), "collections/ai-apps/pie-chart-lab.html"),
    (Path(r"C:\Users\p\Desktop\ai应用\AI应用｜百分数浓度调节.html"), "collections/ai-apps/potion-percentages.html"),
    (Path(r"C:\Users\p\Desktop\11111\ai应用\奇异博士.html"), "legacy/ai-apps/doctor-strange-math.html"),
]


def main() -> None:
    parser = argparse.ArgumentParser(description="Upload patched HTML resources to Tencent COS.")
    parser.add_argument("--secret-id", required=True)
    parser.add_argument("--secret-key", required=True)
    parser.add_argument("--region", default="ap-guangzhou")
    parser.add_argument("--bucket", default="mathflow-1317654855")
    args = parser.parse_args()

    config = CosConfig(Region=args.region, SecretId=args.secret_id, SecretKey=args.secret_key)
    client = CosS3Client(config)

    for local_path, key in UPLOADS:
        if not local_path.exists():
            raise FileNotFoundError(f"Missing local file: {local_path}")
        with local_path.open("rb") as file_obj:
            client.put_object(
                Bucket=args.bucket,
                Body=file_obj,
                Key=key,
                ContentType="text/html; charset=utf-8",
            )
        print(f"uploaded\t{key}")


if __name__ == "__main__":
    main()
