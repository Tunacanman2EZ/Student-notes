# Step 2R: the link button says what it opens

**Why:** Every note link showed "▶ Watch", but most links are now Maestro lesson pages, not videos.

## What changed
- `linkLabel(url)` in `js/core/split.js` picks the button text from the link's site:
  - app.maestro.org → **Open lesson** (green)
  - youtube.com, youtu.be, vimeo.com → **▶ Watch** (red, as before)
  - anything else → **Open link** (green)
- It reads the real host name, so a look-alike such as `notmaestro.org.evil.com` is not treated as Maestro.
- `js/ui/list.js` uses it. The button's class is `watch is-lesson` / `is-video` / `is-link`.
  (The plain name `lesson` was already used by the Week page and made the button too tall.)
- `style.css`: the label stays on one line.
- Nothing in saved notes changes, so no reload is needed.

## Checked
- `node tests/run.js` 150 passed (6 new link tests); library and share tests pass.
- All 7 browser tests pass.
- Loaded the 556-note backup: 170 "Open lesson" and 19 "▶ Watch" buttons, all 32px tall, at desktop
  and phone width. No page errors.
