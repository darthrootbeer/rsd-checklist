# RSD Black Friday 2026 · My List

A phone-first wish list and in-store checklist for the **RSD Black Friday 2026** releases (Friday, November 27, 2026). Unofficial and fan-made.

**Live:** https://darthrootbeer.github.io/rsd-checklist/

## How it works

1. **All records** — browse all 188 releases. Search by artist, title or label. Filter by release type, format and genre. Sort A–Z, rarest first, or by label.
2. Tap **+** to put a record on your list. Tap the row for cover art, the official description, tracklist and links to Spotify, Apple Music, YouTube, Discogs and Bandcamp.
3. **My list** — your store-day checklist. Tap **★** for must-haves (they float to the top). Tap the box when a record is in your hands. A progress bar tracks how many you've found.

Every tap saves to the phone right away (browser `localStorage`). Nothing is sent anywhere.

- **Add to Home Screen** (Share → Add to Home Screen on iPhone). It then opens like an app, works offline in the store, and Safari won't clear your list.
- **Menu → Send my list to another device** makes a link that carries your whole list, stars and checkmarks. Open it on any other phone or computer to load it. It doubles as a backup.

## Files

| File | What it is |
|---|---|
| `index.html` | Page layout and all styling |
| `app.js` | Everything the page does |
| `sw.js` | Offline support. Caches the app, plus cover art for records on your list |
| `data/releases.json` | The 188 releases, built from the official sources |
| `data/source/` | Saved official sources: the RSD website listing and the printable PDF |
| `scripts/build.py` | Rebuilds `data/releases.json` from `data/source/` |

## Rebuilding for the next RSD

1. Open `https://recordstoreday.com/SpecialReleases` in a real browser (the site blocks plain downloads). Switch the page size to 200, then save every `.product-layout` card's artist, title, details, image and More Info HTML to `data/source/<event>-site-scrape.json`. See the git history for the exact extraction snippet.
2. Download the printable PDF and run `pdftotext -layout` on it. The PDF has more specific formats (`7" Single`, `Zoetrope LP`) than the website.
3. Tag genres into `data/source/genres.json` (id → one genre).
4. Run `python3 scripts/build.py`. Update `event`, `name` and `date` in the script. The storage key comes from `event`, so a new event starts with a fresh list.
5. Bump the cache names in `sw.js` so phones pick up the new data.

Replaces the older April 2026 app at [darthrootbeer/rsd2026](https://github.com/darthrootbeer/rsd2026).

Data © Record Store Day. Cover art is loaded from the RSD image server.
