"""Validate and render FloraScape plant sprites (no dependencies beyond the stdlib).

Usage:
  python3 scripts/sprites/render.py check <id> [<id> ...]   # validate + write $TMPDIR/sprite-<id>.png preview
  python3 scripts/sprites/render.py sheets                   # write public/sprites/sheets/<id>.png for every plant
"""
import json
import os
import struct
import sys
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SPRITES = os.path.join(ROOT, "public", "sprites")
PALETTE = json.load(open(os.path.join(SPRITES, "palette.json")))
WIDTH = PALETTE["frame"]["width"]
HEIGHT = PALETTE["frame"]["height"]
FRAMES = PALETTE["frames"]
COLORS = {key: tuple(int(value[i : i + 2], 16) for i in (1, 3, 5)) for key, value in PALETTE["colors"].items()}


def load(plant_id):
    with open(os.path.join(SPRITES, "plants", f"{plant_id}.json")) as handle:
        return json.load(handle)


def validate(sprite):
    errors = []
    for name in FRAMES:
        rows = sprite.get("frames", {}).get(name)
        if not isinstance(rows, list) or len(rows) != HEIGHT:
            errors.append(f"{name}: needs {HEIGHT} rows, has {len(rows) if isinstance(rows, list) else 'none'}")
            continue
        for index, row in enumerate(rows):
            if len(row) != WIDTH:
                errors.append(f"{name} row {index}: needs {WIDTH} chars, has {len(row)}")
            bad = {char for char in row if char != "." and char not in COLORS}
            if bad:
                errors.append(f"{name} row {index}: unknown palette chars {sorted(bad)}")
        if rows[-3:] != PALETTE["soilRows"]:
            errors.append(f"{name}: last 3 rows must be the shared soilRows exactly")
    return errors


def png(pixels, width, height):
    """pixels: list of rows of (r, g, b, a)."""
    raw = b"".join(b"\x00" + b"".join(struct.pack("BBBB", *pixel) for pixel in row) for row in pixels)

    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)

    header = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")


def frame_pixels(rows, scale, background=None):
    out = []
    for row in rows:
        line = []
        for char in row:
            color = COLORS.get(char)
            pixel = (*color, 255) if color else (background if background else (0, 0, 0, 0))
            line.extend([pixel] * scale)
        out.extend([line] * scale)
    return out


def sheet(sprite, scale, background=None, gap=0):
    """All frames left to right."""
    frames = [frame_pixels(sprite["frames"][name], scale, background) for name in FRAMES]
    gap_pixel = background if background else (0, 0, 0, 0)
    rows = []
    for y in range(HEIGHT * scale):
        line = []
        for index, frame in enumerate(frames):
            if index:
                line.extend([gap_pixel] * gap)
            line.extend(frame[y])
        rows.append(line)
    width = len(rows[0])
    return png(rows, width, HEIGHT * scale)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    if sys.argv[1] == "check":
        status = 0
        for plant_id in sys.argv[2:]:
            sprite = load(plant_id)
            errors = validate(sprite)
            if errors:
                status = 1
                print(f"{plant_id}: {len(errors)} problem(s)")
                for error in errors[:20]:
                    print("  -", error)
                continue
            out = os.path.join(os.environ.get("TMPDIR", "/tmp"), f"sprite-{plant_id}.png")
            with open(out, "wb") as handle:
                handle.write(sheet(sprite, 12, background=(236, 228, 200, 255), gap=12))
            print(f"{plant_id}: ok -> {out}")
        return status
    if sys.argv[1] == "sheets":
        os.makedirs(os.path.join(SPRITES, "sheets"), exist_ok=True)
        ids = sorted(name[:-5] for name in os.listdir(os.path.join(SPRITES, "plants")) if name.endswith(".json"))
        manifest = []
        for plant_id in ids:
            sprite = load(plant_id)
            errors = validate(sprite)
            if errors:
                print(f"{plant_id}: skipped, {errors[0]}")
                continue
            with open(os.path.join(SPRITES, "sheets", f"{plant_id}.png"), "wb") as handle:
                handle.write(sheet(sprite, 1))
            manifest.append({"id": plant_id, "name": sprite.get("name", plant_id), "sheet": f"/sprites/sheets/{plant_id}.png"})
        with open(os.path.join(SPRITES, "sheets", "manifest.json"), "w") as handle:
            json.dump({"frameWidth": WIDTH, "frameHeight": HEIGHT, "frames": FRAMES, "plants": manifest}, handle, indent=2)
            handle.write("\n")
        print(f"wrote {len(manifest)} sheets")
        return 0
    print(__doc__)
    return 1


if __name__ == "__main__":
    sys.exit(main())
