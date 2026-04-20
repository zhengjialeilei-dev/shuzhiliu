from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(r"C:\Users\p\Desktop\shuzhiliu\deploy")
SOURCE_DIR = Path(r"C:\Users\p\Desktop\ai封面\edui123封面")
OUTPUT_DIR = ROOT / "edui123-title-covers"
RESOURCE_LIST = ROOT / "edui123_resources_snapshot.json"
REFINE_LIST = ROOT / "edui123_title_refine.json"

FONT_REGULAR = Path(r"C:\Windows\Fonts\msyh.ttc")
FONT_BOLD = Path(r"C:\Windows\Fonts\msyhbd.ttc")


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def rounded_box(draw: ImageDraw.ImageDraw, xy, radius, fill):
    draw.rounded_rectangle(xy, radius=radius, fill=fill)


def fit_font(text: str, font_path: Path, max_width: int, start_size: int, min_size: int):
    size = start_size
    while size >= min_size:
        font = ImageFont.truetype(str(font_path), size=size)
        width = font.getbbox(text)[2]
        if width <= max_width:
            return font
        size -= 2
    return ImageFont.truetype(str(font_path), size=min_size)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    resources = load_json(RESOURCE_LIST)
    refine_map = {item["route_path"]: item["title"] for item in load_json(REFINE_LIST)}

    for item in resources:
        route_path = item["route_path"]
        title = refine_map.get(route_path, item["title"])
        category = item["category"]
        image_url = item["image_url"]
        filename = Path(image_url).name
        source = SOURCE_DIR / filename
        if not source.exists():
            continue

        image = Image.open(source).convert("RGBA")
        width, height = image.size
        overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        card_x = int(width * 0.03)
        card_y = int(height * 0.03)
        card_w = int(width * 0.44)
        card_h = int(height * 0.20)

        rounded_box(draw, (card_x, card_y, card_x + card_w, card_y + card_h), 28, (255, 255, 255, 228))
        rounded_box(draw, (card_x + 18, card_y + 18, card_x + 148, card_y + 54), 18, (216, 245, 235, 245))

        badge_font = fit_font(category, FONT_BOLD, 110, 18, 14)
        title_font = fit_font(title, FONT_BOLD, card_w - 36, 34, 22)
        sub_font = fit_font("SPARKAI EDU", FONT_REGULAR, 180, 15, 12)

        draw.text((card_x + 32, card_y + 24), category, font=badge_font, fill=(40, 128, 96, 255))
        draw.text((card_x + 28, card_y + 72), title, font=title_font, fill=(27, 45, 78, 255))
        draw.text((card_x + 30, card_y + card_h - 34), "SPARKAI EDU", font=sub_font, fill=(114, 132, 158, 255))

        merged = Image.alpha_composite(image, overlay).convert("RGB")
        merged.save(OUTPUT_DIR / filename, quality=95)


if __name__ == "__main__":
    main()
