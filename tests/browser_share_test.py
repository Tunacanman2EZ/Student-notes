# Notes Vault steps 2I + 2M: the Share panel, the lock button, and lesson chats never shared, in a real browser.
#   python tests/browser_share_test.py      (needs Python + Playwright)
from playwright.sync_api import sync_playwright
import glob, json, pathlib, tempfile, subprocess
ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / 'index.html').as_uri()
FILES = sorted(glob.glob(str(ROOT / 'examples' / '*.json')))
results = []
def ok(name, cond, detail=""):
    results.append(bool(cond)); print(("PASS " if cond else "FAIL ") + name + (f"  ({detail})" if detail else ""))
def settle(pg, ms=400): pg.wait_for_timeout(ms)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_context(accept_downloads=True, viewport={"width": 1366, "height": 1000}).new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); settle(pg)
    for f in FILES: pg.set_input_files('#import-file', f); pg.wait_for_timeout(200)
    pg.reload(); settle(pg, 800)
    ok("five equal panel buttons", pg.locator(".panel-tab").count() == 5)
    pg.click('[data-panel=share-panel]'); settle(pg)
    ok("no display name yet: asks for one", "Set a display name first" in pg.inner_text('#share-who'))
    ok("…and the download button waits", pg.locator('#share-download').is_disabled())
    pg.click('[data-panel=classes-panel]'); pg.fill('#profile-name', 'Alex'); pg.click('#profile-save'); settle(pg)
    pg.click('[data-panel=share-panel]'); settle(pg)
    ok("shared as your display name", 'Shared as "Alex"' in pg.inner_text('#share-who'))
    rows = pg.locator('.share-row')
    ok("DEMO101 lessons are listed", rows.count() == 8, rows.count())
    blocked = pg.locator('.share-row.blocked')
    ok("both reviews are greyed out, with the reason", blocked.count() == 2 and all("never shared" in t for t in blocked.all_inner_texts()))
    ok("reviews can't be ticked", all(pg.locator('.share-row.blocked input').nth(i).is_disabled() for i in range(2)))
    ok("summary counts it", pg.inner_text('#share-summary').startswith("6 lessons will be shared"), pg.inner_text('#share-summary'))
    # lock a lesson from its card
    pg.click('[data-panel=share-panel]')   # close the panel
    card = pg.locator('.note', has_text='Owner checks').first
    card.locator('.note-head').click(); card.locator('button.lock').click(); settle(pg)
    ok("lock button turns on", card.locator('button.lock').inner_text().startswith("Private"))
    ok("card says private", "private" in card.locator('.note-meta').inner_text())
    pg.reload(); settle(pg, 800)
    pg.click('[data-panel=share-panel]'); settle(pg)
    ok("a locked note is greyed out on Share (and stays locked after reload)",
       "You locked this note" in pg.locator('.share-row', has_text='Owner checks').inner_text())
    ok("summary now says 5", pg.inner_text('#share-summary').startswith("5 lessons"), pg.inner_text('#share-summary'))
    pg.locator('.share-row', has_text='Hashing passwords').locator('input').uncheck(); settle(pg, 150)
    ok("unticking updates the summary", pg.inner_text('#share-summary').startswith("4 lessons"))
    with pg.expect_download() as d: pg.click('#share-download')
    path = pathlib.Path(tempfile.gettempdir()) / d.value.suggested_filename; d.value.save_as(path)
    f = json.load(open(path))
    topics = [l['topic'] for l in f['lessons']]
    ok("file name is the safe kind", d.value.suggested_filename.startswith("alex-") and d.value.suggested_filename.endswith(".json"), d.value.suggested_filename)
    ok("the file has exactly the ticked, allowed lessons", topics == ["Week 1 · Lesson 1", "Week 1 · Lesson 2", "Week 1 · Lesson 3", "Week 2 · Lesson 2"], topics)
    ok("no review, final or locked note in the file", not any("Review" in t for t in topics) and "Owner checks" not in json.dumps(f))
    ok("only display name + random id", set(f['contributor']) == {"id", "displayName"} and f['contributor']['displayName'] == "Alex")
    ok("originals stay home by default", all(l['original'] == "" for l in f['lessons']))
    ok("steps 2 and 3 light up", 'highlight' in pg.get_attribute('#share-steps', 'class'))
    ok("upload link points at the library", pg.get_attribute('#share-upload', 'href').endswith("/student-notes/upload/main/contributions"))
    tool = ROOT / 'tools' / 'check-contributions.js'
    r = subprocess.run(["node", str(tool), str(path)], capture_output=True, text=True)
    ok("GitHub's check passes the downloaded file", r.returncode == 0, r.stdout.strip().splitlines()[-1])
    ok("no page errors", not errs, errs)
    # ---- 2M: a lesson chat is greyed out, and can't be ticked ----
    chat = {"app": "notes-vault", "version": 1, "notes": [{"id": "demo-w1-l1-chat", "className": "DEMO101: Building Web APIs",
            "topic": "Week 1 · Lesson 1", "title": "What an API is: lesson chat", "order": 101.5, "date": "2026-01-05",
            "dateEnd": "2026-01-12", "link": "", "text": "Tutor: welcome!\nYOU: what's an API?", "refined": "", "addedOn": "2026-01-06"}]}
    cf = pathlib.Path(tempfile.gettempdir()) / 'nv-chat.json'; json.dump(chat, open(cf, "w"))
    pg.click('[data-panel=share-panel]'); settle(pg)          # close
    pg.set_input_files('#import-file', str(cf)); settle(pg, 500)
    pg.click('[data-panel=share-panel]'); settle(pg)          # open again
    row = pg.locator('.share-row', has_text='lesson chat')
    ok("2M: the lesson chat is greyed out with the reason", row.count() == 1 and "blocked" in row.get_attribute('class')
       and "Lesson chats are never shared" in row.inner_text(), row.inner_text() if row.count() else "no row")
    ok("2M: …and can't be ticked", row.locator('input').is_disabled() and not row.locator('input').is_checked())
    ok("2M: the summary names lesson chats", "lesson chats" in pg.inner_text('#share-summary'), pg.inner_text('#share-summary'))
    ok("no page errors (after 2M)", not errs, errs)
    pg.screenshot(path=str(pathlib.Path(tempfile.gettempdir()) / 'nv-share.png'))
    b.close()
print(f"\n{sum(results)} of {len(results)} passed")
