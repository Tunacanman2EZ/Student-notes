# Notes Vault: profile & classes (data version 2), in a real browser.
#   python tests/browser_classes_test.py      (needs Python + Playwright)
from playwright.sync_api import sync_playwright
import glob, json, pathlib, tempfile
ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / 'index.html').as_uri()
FILES = sorted(glob.glob(str(ROOT / 'examples' / '*.json')))
ALL = [n for f in FILES for n in json.load(open(f))['notes']]
DEMO = str(ROOT / 'examples' / 'demo101-building-web-apis.json')
GET = """k => new Promise(r => { const q = indexedDB.open('notesVault'); q.onsuccess = () => {
  const g = q.result.transaction('data').objectStore('data').get(k); g.onsuccess = () => { r(g.result); q.result.close(); }; }; })"""
results = []
def ok(name, cond, detail=""):
    results.append(bool(cond)); print(("PASS " if cond else "FAIL ") + name + (f"  ({detail})" if detail else ""))
def settle(pg, ms=500): pg.wait_for_timeout(ms)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(accept_downloads=True, viewport={"width": 1100, "height": 900}); pg = ctx.new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    # Make the browser look like yours after step 2B: notes in the database, data version 1, no classes.
    pg.goto(URL); settle(pg)
    pg.evaluate("""d => new Promise(r => { const q = indexedDB.open('notesVault'); q.onsuccess = () => {
      const tx = q.result.transaction('data', 'readwrite'); const s = tx.objectStore('data');
      s.put(d, 'notes'); s.put({ dataVersion: 1, movedFromLocalStorage: d.length }, 'info'); s.delete('classes'); s.delete('profile');
      tx.oncomplete = () => { q.result.close(); r(1); }; }; })""", ALL)
    pg.reload(); settle(pg, 1200)
    info = pg.evaluate(GET, 'info'); classes = pg.evaluate(GET, 'classes'); notes = pg.evaluate(GET, 'notes')
    ok("move to v2 is marked done", info.get('dataVersion') == 2 and info.get('movedToV2') == len(ALL), info)
    ok("one record per class", len(classes) == len({n['className'] for n in ALL}), len(classes))
    ok("every note points at a class", all(n.get('classId') for n in notes))
    ok("every word is the same", [n['text'] for n in notes] == [n['text'] for n in ALL])
    ok("all notes still shown", pg.locator('.note').count() == len(ALL))
    ok("panel lists the classes", pg.locator('.class-row').count() == len(classes))
    # profile
    pg.click('[data-panel=classes-panel]')
    pg.fill('#profile-name', 'Alex'); pg.fill('#profile-program', 'AAS in AI Software Engineering'); pg.click('#profile-save'); settle(pg)
    pg.reload(); settle(pg, 900)
    prof = pg.evaluate(GET, 'profile')
    ok("profile saved", prof['displayName'] == 'Alex' and prof['program'] == 'AAS in AI Software Engineering')
    ok("profile id is random, not your name", prof['id'] and 'alex' not in prof['id'].lower(), prof['id'])
    # rename a class
    pg.click('[data-panel=classes-panel]')
    row = [i for i, v in enumerate(pg.locator('.class-name').evaluate_all("els => els.map(e => e.value)")) if v.startswith('DEMO101')][0]
    name = pg.locator('.class-name').nth(row)
    name.fill('DEMO101: Web APIs, Real Name'); name.press('Enter'); settle(pg, 700)
    ok("rename message", "8 notes followed" in pg.text_content('#profile-message'), pg.text_content('#profile-message'))
    ok("dropdown shows the new name", any(o.startswith('DEMO101: Web APIs, Real Name') for o in pg.locator('#class-filter option').all_inner_texts()))
    ok("old name is gone from the list", not any(o.startswith('DEMO101: Building') for o in pg.locator('#class-filter option').all_inner_texts()))
    pg.set_input_files('#import-file', DEMO); settle(pg, 700)
    ok("THE OLD PROBLEM: old class file after a rename adds nothing", pg.text_content('#backup-message').startswith("Loaded: 0 new"), pg.text_content('#backup-message'))
    ok("still the same number of notes", pg.locator('.note').count() == len(ALL))
    pg.reload(); settle(pg, 900)
    ok("the new name survives a reload", any(o.startswith('DEMO101: Web APIs, Real Name') for o in pg.locator('#class-filter option').all_inner_texts()))
    # color
    pg.click('[data-panel=classes-panel]')
    pg.locator('.class-row input[type=color]').first.evaluate("(e) => { e.value = '#ff0000'; e.dispatchEvent(new Event('change')); }"); settle(pg)
    pg.reload(); settle(pg, 900)
    ok("class color saved", any(c['color'] == '#ff0000' for c in pg.evaluate(GET, 'classes')))
    ok("cards show their class color", pg.locator('.note').first.evaluate("e => getComputedStyle(e).getPropertyValue('--class-color')").strip() != "")
    # status: pick "current" for a class still in progress
    pg.click('[data-panel=classes-panel]')
    r106 = [i for i, v in enumerate(pg.locator('.class-name').evaluate_all("els => els.map(e => e.value)")) if v.startswith('Study')][0]
    pg.locator('.class-row').nth(r106).locator('select').select_option('current'); settle(pg)
    pg.reload(); settle(pg, 900)
    ok("picked status is saved", any(c['name'] == 'Study Skills' and c.get('status') == 'current' for c in pg.evaluate(GET, 'classes')))
    # paste a new class
    pg.click('[data-panel=add-panel]')
    pg.fill('#note-text', "Lesson 1: Hello\nhi\nLesson 2: Bye\nbye\n"); pg.fill('#note-class', 'ZZ200: Test Class')
    pg.click('#check-btn'); pg.click('#save-all-btn'); settle(pg, 700)
    ok("pasting a new class makes its record", any(c['name'] == 'ZZ200: Test Class' and c['code'] == 'ZZ200' for c in pg.evaluate(GET, 'classes')))
    # backup round trip into a brand-new browser
    pg.click('[data-panel=backup-panel]')
    with pg.expect_download() as d: pg.click('#export-btn')
    path = pathlib.Path(tempfile.gettempdir()) / 'nv-backup-v2.json'; d.value.save_as(path)
    bk = json.load(open(path))
    ok("backup holds classes and profile", bk['version'] == 2 and len(bk['classes']) == len(classes) + 1 and bk['profile']['displayName'] == 'Alex')
    ok("no page errors", not errs, errs)
    ctx2 = b.new_context(); pg2 = ctx2.new_page(); pg2.goto(URL); settle(pg2)
    pg2.set_input_files('#import-file', str(path)); settle(pg2, 1200)
    c2 = pg2.evaluate(GET, 'classes')
    ok("backup restores renamed classes with their old names", any(c['name'].startswith('DEMO101: Web APIs, Real Name') and 'DEMO101: Building Web APIs' in c['aliases'] for c in c2))
    pg2.set_input_files('#import-file', DEMO); settle(pg2, 700)
    ok("…so the old class file still adds nothing there too", pg2.text_content('#backup-message').startswith("Loaded: 0 new"), pg2.text_content('#backup-message'))
    if not pg.locator('#classes-panel').is_visible(): pg.click('[data-panel=classes-panel]')
    pg.locator('#classes-panel').scroll_into_view_if_needed(); pg.screenshot(path=str(pathlib.Path(tempfile.gettempdir()) / 'nv-classes.png'))
    b.close()
print(f"\n{sum(results)} of {len(results)} passed")
