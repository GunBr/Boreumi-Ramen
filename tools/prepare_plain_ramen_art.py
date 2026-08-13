from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets" / "art-v0261"
OUTPUT.mkdir(parents=True, exist_ok=True)

JOBS = (
    (
        Path(r"C:\Users\user\.codex\generated_images\019fca74-ceca-7d40-b129-6909d9d48529\exec-e59caa9b-7d38-490b-92c3-48527af07d39.png"),
        ROOT / "assets" / "art-v012" / "food-ramen-no-egg-v3.webp",
        OUTPUT / "food-ramen-plain-no-scallion-v1.webp",
    ),
    (
        Path(r"C:\Users\user\.codex\generated_images\019fca74-ceca-7d40-b129-6909d9d48529\exec-eeb3114b-045b-468b-b9b1-d725e5ae28d4.png"),
        ROOT / "assets" / "art-v012" / "cooking-ramen.webp",
        OUTPUT / "cooking-ramen-plain-no-scallion-v1.webp",
    ),
)

for generated_path, mask_path, output_path in JOBS:
    generated = Image.open(generated_path).convert("RGB")
    mask_source = Image.open(mask_path).convert("RGBA")
    generated = generated.resize(mask_source.size, Image.Resampling.LANCZOS)
    generated.putalpha(mask_source.getchannel("A"))
    generated.save(output_path, "WEBP", lossless=True, method=6)
    print(f"{output_path.name}: {generated.size}, alpha={generated.getchannel('A').getextrema()}")
