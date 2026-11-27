# Notes Vault step 2E: sidebar (classes → weeks) and the Week page, in a real browser.
#   python tests/browser_week_test.py      (needs Python + Playwright)
from playwright.sync_api import sync_playwright
import glob, json, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / 'index.html').as_uri()
FILES = sorted(glob.glob(str(ROOT / 'examples' / '*.json')))
ALL = [n for f in FILES for n in json.load(open(f))['notes']]
GET = """k => new Promise(r => { const q = indexedDB.open('notesVault'); q.onsuccess = () => {
  const g = q.result.transaction('data').objectStore('data').get(k); g.onsuccess = () => { r(g.result); q.result.close(); }; }; })"""
results = []
def ok(name, cond, detail=""):
    results.append(bool(cond)); print(("PASS " if cond else "FAIL ") + name + (f"  ({detail})" if detail else ""))
def settle(pg, ms=450): pg.wait_for_timeout(ms)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={"width": 1366, "height": 900}); pg = ctx.new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); settle(pg)
    for f in FILES: pg.set_input_files('#import-file', f); pg.wait_for_timeout(200)
    pg.reload(); settle(pg, 900)
    ok("sidebar lists every class", pg.locator('.side-class').count() == len({n['className'] for n in ALL}))
    ok("newest class first", pg.locator('.side-name').first.inner_text().startswith('DEMO101'))
    demo = pg.locator('.side-class', has_text='DEMO101')
    demo.locator('summary').click()
    weeks = demo.locator('.side-week:not(.side-compare)').all_inner_texts()
    ok("DEMO101 opens to its 2 weeks, in order", [w.split('\n')[0] for w in weeks] == ['Week 1', 'Week 2'], weeks)
    demo.locator('.side-week', has_text='Week 2').click(); settle(pg)
    ok("Week page opens", pg.locator('#week-view').is_visible() and not pg.locator('#notes-card').is_visible())
    w9 = [n for n in ALL if n['className'].startswith('DEMO101') and n['topic'].startswith('Week 2 ')]
    ok("it shows every Week 2 lesson", pg.locator('.lesson').count() == len(w9), pg.locator('.lesson').count())
    ok("lessons in order", pg.locator('.lesson-title').first.inner_text().startswith('Lesson 1'))
    ok("each lesson shows a short summary", all(t.strip() for t in pg.locator('.lesson-summary').all_inner_texts()))
    ok("no Review tag anymore", pg.locator('.lesson .tag', has_text='Review').count() == 0)
    pg.locator('.lesson input[type=checkbox]').nth(0).check(); settle(pg)
    pg.locator('.lesson input[type=checkbox]').nth(1).check(); settle(pg)
    ok("checkmarks update the count", "2 of" in pg.inner_text('#week-view'))
    ok("…and the sidebar", demo.locator('.side-week.current .side-count').inner_text().startswith('2/'))
    pg.locator('.lesson button', has_text='Open full note').first.click(); settle(pg, 250)
    ok("Open full note shows the whole note", pg.locator('.lesson .note.open .note-text').first.is_visible())
    pg.reload(); settle(pg, 900)
    prog = pg.evaluate(GET, 'progress')
    ok("checkmarks are saved", len(prog) == 2)
    notes = pg.evaluate(GET, 'notes')
    keys = {k for n in notes for k in n}
    ok("checkmarks are NOT inside your notes", keys <= {'id', 'className', 'classId', 'topic', 'title', 'order', 'date', 'dateEnd', 'link', 'text', 'refined', 'addedOn'}, keys)
    pg.locator('.side-class', has_text='DEMO101').locator('summary').click()
    pg.locator('.side-class', has_text='DEMO101').locator('.side-week', has_text='Week 2').click(); settle(pg)
    pg.click('button:has-text("Mark all studied")'); settle(pg)
    ok("Mark all studied", pg.locator('.lesson input[type=checkbox]:checked').count() == len(w9))
    pg.click('button:has-text("Unmark all")'); settle(pg)
    ok("Unmark all", pg.locator('.lesson input[type=checkbox]:checked').count() == 0)
    pg.fill('#search', 'scrypt'); settle(pg)
    ok("typing a search leaves the Week page", pg.locator('#notes-card').is_visible() and not pg.locator('#week-view').is_visible())
    pg.fill('#search', ''); pg.press('#search', 'Escape'); settle(pg)
    pg.locator('.side-class', has_text='DEMO101').locator('.side-week', has_text='Week 1').click(); settle(pg)
    pg.click('button:has-text("All notes")'); settle(pg)
    ok("← All notes goes back", pg.locator('#notes-card').is_visible())
    pg.locator('.side-class', has_text='Study Skills').locator('summary').click()
    mot = pg.locator('.side-class', has_text='Study Skills').locator('.side-week:not(.side-compare)')
    ok("a class without weeks gets one 'Lessons' group", mot.count() == 1 and mot.first.inner_text().startswith('Lessons'), mot.all_inner_texts())
    ok("no page errors", not errs, errs)
    # phone size: sidebar folds under a button
    ph = b.new_context(viewport={"width": 390, "height": 844}).new_page(); ph.goto(URL); settle(ph, 900)
    ok("phone: sidebar starts folded", not ph.locator('#sidebar-tree').is_visible() and ph.locator('#browse-toggle').is_visible())
    ph.click('#browse-toggle'); ok("phone: Browse opens it", ph.locator('#sidebar-tree').is_visible())
    b.close()
print(f"\n{sum(results)} of {len(results)} passed")
