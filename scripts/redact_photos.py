#!/usr/bin/env python3
"""Apply the reviewed photo redactions without changing the rest of each image.

Install Pillow, then run: python3 scripts/redact_photos.py
The manifest records input/output hashes so repeating the command is safe.
"""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageStat, JpegImagePlugin

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "data/photo-redactions.json"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def redact(image, boxes):
    result = image.copy()
    draw = ImageDraw.Draw(result)
    for region in boxes:
        box = region["box"]
        # A solid colour cannot retain readable text, unlike a light blur.
        colour = tuple(ImageStat.Stat(image.crop(box)).median)
        draw.rectangle((box[0], box[1], box[2] - 1, box[3] - 1), fill=colour)
    return result


def main():
    manifest = json.loads(MANIFEST.read_text())
    ready = []
    skipped = 0
    # Check every input before writing any photos.
    for entry in manifest["photos"]:
        path = (ROOT / entry["path"]).resolve()
        if not path.is_relative_to(ROOT / "img"):
            raise ValueError("Photo must be inside img: " + entry["path"])
        current = digest(path)
        if entry.get("outputSha256") == current:
            skipped += 1
            continue
        if current != entry["inputSha256"]:
            raise ValueError("Photo changed; review its masks again: " + entry["path"])
        with Image.open(path) as image:
            if list(image.size) != entry["size"]:
                raise ValueError("Incorrect photo dimensions: " + entry["path"])
            for region in entry["regions"]:
                x0, y0, x1, y1 = region["box"]
                if not (0 <= x0 < x1 <= image.width and 0 <= y0 < y1 <= image.height):
                    raise ValueError("Mask outside photo: " + entry["path"])
        ready.append((entry, path))
    changed = 0
    for entry, path in ready:
        if entry["regions"]:
            with Image.open(path) as original:
                image = redact(original.convert("RGB"), entry["regions"])
                if path.suffix.lower() == ".png":
                    image.save(path, format="PNG", optimize=True)
                else:
                    image.save(path, format="JPEG", qtables=original.quantization,
                               subsampling=JpegImagePlugin.get_sampling(original), optimize=True)
            changed += 1
        entry["outputSha256"] = digest(path)
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(f"Redacted {changed} photos; {skipped} already processed; {len(ready)-changed} had no visible marks.")


if __name__ == "__main__":
    main()
