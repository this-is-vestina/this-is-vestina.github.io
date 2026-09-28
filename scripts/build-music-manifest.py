"""Generate the music manifest from files in static/music/.

Usage: python scripts/build-music-manifest.py

The manifest is a JSON document listing every .mp3 in static/music/ together
with its file size and SHA-256. The Hugo site reads this manifest at build
time to know which audio tracks to ship. The audio files themselves stay
under static/music/ as regular static assets.
"""

import hashlib
import json
import pathlib
import re
import sys


ROOT = pathlib.Path(__file__).resolve().parents[1]
MUSIC = ROOT / "static" / "music"
MANIFEST = MUSIC / "manifest.json"


def scan() -> list[dict[str, str | int]]:
    if not MUSIC.exists():
        return []

    entries: list[dict[str, str | int]] = []
    seen: set[str] = set()
    for path in sorted(MUSIC.iterdir()):
        if path == MANIFEST or path.suffix.lower() != ".mp3":
            continue
        name = path.name
        if name in seen:
            raise ValueError(f"Duplicate track filename: {name}")
        if not re.fullmatch(r"[A-Za-z0-9._\- ]+\.mp3", name):
            raise ValueError(f"Unsafe track filename: {name}")
        seen.add(name)
        entries.append({
            "name": name,
            "title": name[:-len(".mp3")],
            "size": path.stat().st_size,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        })
    return entries


def main() -> int:
    entries = scan()
    payload = {"version": 1, "count": len(entries), "tracks": entries}
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    temp = MANIFEST.with_suffix(MANIFEST.suffix + ".tmp")
    temp.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    temp.replace(MANIFEST)
    print(f"Wrote {MANIFEST.relative_to(ROOT)}: {len(entries)} tracks")
    return 0


if __name__ == "__main__":
    sys.exit(main())