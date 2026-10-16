"""Generate faithful PWA icons from the exact official transparent PNG."""

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/assets/brand/marca-mg-oficial-transparente.png"
DEST = ROOT / "public/assets/pwa"
DEST.mkdir(parents=True, exist_ok=True)

logo = Image.open(SOURCE).convert("RGBA")
bounds = logo.getbbox()
if not bounds:
    raise ValueError("A logo oficial está vazia")
logo = logo.crop(bounds)

for size, filename, width_ratio in [
    (192, "icon-192.png", 0.91),
    (512, "icon-512.png", 0.91),
    (180, "apple-touch-icon.png", 0.91),
    (512, "icon-maskable-512.png", 0.76),
]:
    canvas = Image.new("RGBA", (size, size), (8, 10, 13, 255))
    target_width = round(size * width_ratio)
    target_height = round(logo.height * target_width / logo.width)
    resized = logo.resize((target_width, target_height), Image.Resampling.LANCZOS)
    canvas.alpha_composite(resized, ((size - target_width) // 2, (size - target_height) // 2))
    canvas.convert("RGB").save(DEST / filename, "PNG", optimize=True)

print(f"Ícones PWA gerados a partir de {SOURCE.name}")
