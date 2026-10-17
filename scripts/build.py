#!/usr/bin/env python3
"""Build data/releases.json from the saved official RSD sources.

Inputs (all in data/source/):
  bf2026-site-scrape.json  - every release card from recordstoreday.com/SpecialReleases
  bf2026-official-list.txt - `pdftotext -layout` of the official printable PDF
  genres.json              - id -> one primary genre (hand/AI tagged, optional)

Run: python3 scripts/build.py
"""
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "source"

CATEGORY = {"RSD Exclusive": "E", "'RSD First'": "F", "RSD First": "F",
            "RSD Limited Run / Regional Focus": "L"}


def fix_text(s):
    """Undo the site's double-encoded cp1252 text (AlbumÂ’s -> Album’s)."""
    if not s:
        return ""
    s = s.replace("Â&nbsp;", " ").replace(" ", " ")

    def redecode(m):
        chunk = m.group(0)
        try:
            out = chunk.encode("cp1252").decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            return chunk
        # C1 control chars were originally cp1252 punctuation
        return "".join(bytes([ord(c)]).decode("cp1252", "ignore") if 0x80 <= ord(c) <= 0x9F else c
                       for c in out)

    s = re.sub(r"[Â-ô][\u0080-¿Œ-™]{1,3}", redecode, s)
    return s.replace("Â", "")


def html_to_lines(fragment):
    s = re.sub(r"(?i)<br\s*/?>", "\n", fragment)
    s = re.sub(r"(?i)</p>", "\n\n", s)
    s = re.sub(r"<[^>]+>", "", s)
    s = fix_text(html.unescape(s))
    return [re.sub(r"[ \t]+", " ", ln).strip() for ln in s.split("\n")]


def split_info(desc_html):
    """Return (paragraphs, tracklist lines) from the MORE INFO block."""
    lines = html_to_lines(desc_html or "")
    text = "\n".join(lines).replace("MORE INFO", "", 1).strip()
    m = re.search(r"(?im)^\s*track\s*list(ing)?\b\s*:?", text)
    info, tracks = (text[:m.start()], text[m.end():]) if m else (text, "")
    paras = [re.sub(r"\s*\n\s*", " ", p).strip() for p in re.split(r"\n\s*\n", info)]
    paras = [p for p in paras if p]
    tracks = [t.strip() for t in tracks.split("\n") if t.strip()]
    return paras, tracks


def pdf_formats():
    """Map normalized 'artist|title' prefix -> format string from the printable list."""
    out = {}
    txt = (SRC / "bf2026-official-list.txt").read_text()
    for line in txt.splitlines():
        parts = re.split(r"\s{2,}", line.strip())
        if len(parts) < 5 or parts[0] not in ("E", "L", "F"):
            continue
        artist, title, fmt = parts[1], parts[2], parts[-1]
        if artist and title and fmt:
            out[norm(artist) + "|" + norm(title)[:20]] = fmt
    return out


def norm(s):
    return re.sub(r"[^a-z0-9]", "", fix_text(s).lower())


def tidy_format(f):
    f = re.sub(r"(\d+)\s*x\s*(?=\d*\s*[A-Z\d])", r"\1×", f.strip())
    return f.replace("12\" Vinyl EP", "12\" EP")


def format_group(f):
    fl = f.lower()
    if "cd" in fl:
        return "CD"
    if '7"' in fl:
        return '7"'
    if re.search(r"(10|12)\"", fl):
        return '10" & 12"'
    m = re.match(r"(\d+)×", f)
    if m and int(m.group(1)) > 1:
        return "2LP+"
    if "lp" in fl:
        return "LP"
    return "Other"


def main():
    raw = json.loads((SRC / "bf2026-site-scrape.json").read_text())
    genres_path = SRC / "genres.json"
    genres = json.loads(genres_path.read_text()) if genres_path.exists() else {}
    pdf = pdf_formats()

    releases = []
    for r in raw:
        det = r["det"]
        artist, title = fix_text(r["artist"]).strip(), fix_text(r["title"]).strip()
        fmt = (det.get("Format") or "").strip()
        fmt = pdf.get(norm(artist) + "|" + norm(title)[:20], fmt or "Vinyl")
        fmt = tidy_format(fmt)
        photo = re.search(r"/Photo/(\d+)", r["img"] or "")
        paras, tracks = split_info(r["descHtml"])
        qty = re.sub(r"\D", "", det.get("Quantity") or "")
        releases.append({
            "id": int(r["id"]),
            "a": artist,
            "t": title,
            "l": fix_text(det.get("Label", "")).strip(),
            "f": fmt,
            "fg": format_group(fmt),
            "q": int(qty) if qty else None,
            "k": CATEGORY.get(det.get("Release type", "").strip(), "E"),
            "g": genres.get(r["id"], "Other"),
            "img": photo.group(1) if photo else None,
            "info": paras,
            "tracks": tracks,
        })

    releases.sort(key=lambda x: re.sub(r"^(the|a)\s+", "", x["a"].lower()))
    out = {
        "event": "bf2026",
        "name": "RSD Black Friday 2026",
        "date": "2026-11-27T08:00:00",
        "source": "https://recordstoreday.com/SpecialReleases",
        "releases": releases,
    }
    path = ROOT / "data" / "releases.json"
    path.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
    left = sum(1 for x in releases if re.search(r"[ÂÃ]", " ".join([x["a"], x["t"], *x["info"]])))
    print(f"{len(releases)} releases -> {path} ({path.stat().st_size // 1024} KB); "
          f"mojibake left in {left}; untagged genre {sum(x['g'] == 'Other' for x in releases)}")


if __name__ == "__main__":
    main()
