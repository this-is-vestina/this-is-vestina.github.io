"""Create the browser scene package without the wallpaper's soundtrack.

Usage: python scripts/build-hero-scene.py [--source wallpaper/scene.pkg]

The source PKGV0024 archive remains local; only the generated, audio-free
scene package should be put in static/ for Hugo to publish.
"""

import argparse
import hashlib
import json
import struct
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "wallpaper" / "scene.pkg"
OUTPUT = ROOT / "static" / "wallpaper" / "scene.pkg"
MAGIC = b"PKGV0024"
AUDIO_SUFFIXES = {".aac", ".flac", ".m4a", ".mp3", ".ogg", ".wav", ".wma"}


def read_package(data):
    if len(data) < 16 or data[:4] != struct.pack("<I", len(MAGIC)) or data[4:12] != MAGIC:
        raise ValueError("Expected a PKGV0024 scene package")

    count = struct.unpack_from("<I", data, 12)[0]
    if not 1 <= count <= 10000:
        raise ValueError("Invalid package entry count")

    entries = []
    names = set()
    pos = 16
    for _ in range(count):
        if pos + 4 > len(data):
            raise ValueError("Truncated package table")
        name_size = struct.unpack_from("<I", data, pos)[0]
        pos += 4
        if not 1 <= name_size <= 4096 or pos + name_size + 8 > len(data):
            raise ValueError("Invalid package entry name")
        name = data[pos : pos + name_size].decode("utf-8")
        pos += name_size
        offset, size = struct.unpack_from("<II", data, pos)
        pos += 8
        if name.startswith("/") or "\\" in name or any(p in ("", ".", "..") for p in name.split("/")):
            raise ValueError(f"Unsafe package entry: {name}")
        if name.casefold() in names:
            raise ValueError(f"Duplicate package entry: {name}")
        names.add(name.casefold())
        entries.append((name, offset, size))

    end = 0
    for name, offset, size in sorted(entries, key=lambda entry: entry[1]):
        if offset != end or size == 0:
            raise ValueError(f"Non-contiguous package entry: {name}")
        end += size
    if pos + end != len(data):
        raise ValueError("Trailing or truncated package data")

    return [(name, data[pos + offset : pos + offset + size]) for name, offset, size in entries]


def is_audio(name):
    return Path(name).suffix.lower() in AUDIO_SUFFIXES or name.lower().startswith("sounds/")


def strip_audio(entries):
    if not entries or entries[0][0] != "scene.json":
        raise ValueError("scene.json must be the first package entry")
    scene = json.loads(entries[0][1])
    objects = scene["objects"]
    sounds = [obj for obj in objects if "sound" in obj]
    audio_entries = [(name, data) for name, data in entries if is_audio(name)]
    if len(sounds) != 1 or sounds[0].get("id") != 374 or len(audio_entries) != 2:
        raise ValueError("Unexpected audio layout; inspect source before publishing")
    if {name for name, _ in audio_entries} != set(sounds[0]["sound"]):
        raise ValueError("Audio entries do not match the scene's sound object")

    scene["objects"] = [obj for obj in objects if "sound" not in obj]
    scene_bytes = (json.dumps(scene, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
    if b".mp3" in scene_bytes or b"sounds/" in scene_bytes or any("sound" in obj for obj in scene["objects"]):
        raise ValueError("Scene still refers to soundtrack files")

    stripped = [("scene.json", scene_bytes)] + [
        (name, data) for name, data in entries[1:] if not is_audio(name)
    ]
    if any(is_audio(name) for name, _ in stripped):
        raise ValueError("Audio remains in the package table")
    return stripped, audio_entries


def write_package(entries):
    table = bytearray(struct.pack("<I", len(MAGIC)) + MAGIC + struct.pack("<I", len(entries)))
    payload = bytearray()
    for name, data in entries:
        encoded_name = name.encode("utf-8")
        table += struct.pack("<I", len(encoded_name)) + encoded_name
        table += struct.pack("<II", len(payload), len(data))
        payload += data
    return bytes(table + payload)


def build(source):
    original = read_package(source)
    stripped, audio = strip_audio(original)
    packed = write_package(stripped)
    rebuilt = read_package(packed)
    if rebuilt != stripped or len(rebuilt) != len(original) - len(audio):
        raise ValueError("Rebuilt package failed round-trip verification")
    source_assets = dict(original)
    for name, data in rebuilt[1:]:
        if hashlib.sha256(data).digest() != hashlib.sha256(source_assets[name]).digest():
            raise ValueError(f"Visual asset changed unexpectedly: {name}")
    source_visual = {name for name, _ in original if name != "scene.json" and not is_audio(name)}
    if {name for name, _ in rebuilt[1:]} != source_visual:
        raise ValueError("Unexpected visual resource set")
    for name, data in audio:
        if name.encode("utf-8") in packed or data in packed:
            raise ValueError(f"Soundtrack bytes remain in output: {name}")
    if b".mp3" in packed or b"sounds/" in packed:
        raise ValueError("Soundtrack paths remain in output")
    return packed, len(original), len(audio)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=SOURCE)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    result, source_count, audio_count = build(args.source.read_bytes())
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temp = args.output.with_suffix(args.output.suffix + ".tmp")
    temp.write_bytes(result)
    temp.replace(args.output)
    print(f"Wrote {args.output}: {len(result)} bytes, {source_count - audio_count} entries")
    print(f"SHA-256: {hashlib.sha256(result).hexdigest()}")


if __name__ == "__main__":
    main()
