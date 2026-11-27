# Notes Vault step 2B: storage checks in a real browser. Needs Python + Playwright:
#   pip install playwright  then  playwright install chromium
#   python tests/browser_storage_test.py
from playwright.sync_api import sync_playwright
import json, glob, tempfile
import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / 'index.html').as_uri()
ALL = [n for f in sorted(glob.glob(str(ROOT / 'examples' / '*.json'))) for n in json.load(open(f))['notes']]
IDB_COUNT = """() => new Promise(r => { const q = indexedDB.open('notesVault'); q.onsuccess = () => {
  const g = q.result.transaction('data').objectStore('data').get('notes'); g.onsuccess = () => { r(g.result ? g.result.length : -1); q.result.close(); }; }; })"""
WIPE_IDB = "() => new Promise(r => { const q = indexedDB.deleteDatabase('notesVault'); q.onsuccess = q.onerror = q.onblocked = () => r(true); })"
results = []
def ok(name, cond, detail=""):
    results.append((name, bool(cond))); print(("PASS " if cond else "FAIL ") + name + (f"  ({detail})" if detail else ""))
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(); pg = ctx.new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    # A. You already have notes in the OLD storage (like right now). Open the new app.
    pg.goto(URL); pg.wait_for_timeout(300)
    pg.goto('about:blank'); pg.goto(URL); pg.evaluate(WIPE_IDB)
    pg.evaluate("d => localStorage.setItem('notesVault.notes', JSON.stringify(d))", ALL)
    pg.goto('about:blank'); pg.goto(URL); pg.wait_for_timeout(800)
    ok("A1 all notes moved over and shown", pg.inner_text('#count') == str(len(ALL)), pg.inner_text('#count'))
    ok("A2 the database holds them", pg.evaluate(IDB_COUNT) == len(ALL))
    ok("A3 old copy left untouched", len(json.loads(pg.evaluate("localStorage.getItem('notesVault.notes')"))) == len(ALL))
    info = pg.text_content('#storage-info'); ok("A4 screen says where notes are", "IndexedDB" in info and f"{len(ALL)} notes were moved" in info, info)
    # B. Reload: comes from the database now; the move doesn't run twice.
    pg.evaluate("localStorage.setItem('notesVault.notes', '[]')")
    pg.reload(); pg.wait_for_timeout(600)
    ok("B1 reload still shows every note", pg.inner_text('#count') == str(len(ALL)))
    pg.evaluate("d => localStorage.setItem('notesVault.notes', JSON.stringify(d))", ALL)   # put the safety copy back
    # C. More than localStorage can hold: about 12 MB of notes.
    filler = "practice text " * 300   # about 4 KB per note, so the total is far past localStorage's ~5 MB
    big = [dict(n, id=f"big{k}-{n['id']}", className=n['className'] + f" (copy {k})", text=n['text'] + filler) for k in range(300) for n in ALL]
    open(str(pathlib.Path(tempfile.gettempdir()) / 'nv-big.json'), 'w').write(json.dumps({"app": "notes-vault", "version": 1, "notes": big}))
    size = len(json.dumps(ALL + big)) / 1e6
    old_way = pg.evaluate("""d => { try { localStorage.setItem('nvTest', JSON.stringify(d)); localStorage.removeItem('nvTest'); return 'saved'; }
                               catch (e) { return e.name; } }""", ALL + big)
    ok("C1 the OLD storage can't hold this much", old_way != 'saved', f"{size:.1f} MB → {old_way}")
    pg.set_input_files('#import-file', str(pathlib.Path(tempfile.gettempdir()) / 'nv-big.json')); pg.wait_for_timeout(1500)
    ok("C2 the new storage loads it", pg.text_content('#backup-message').startswith(f"Loaded: {len(big)} new"), pg.text_content('#backup-message'))
    pg.reload(); pg.wait_for_timeout(1500)
    ok("C3 still there after reload", pg.inner_text('#count') == str(len(ALL) + len(big)), pg.inner_text('#count'))
    # D. Paste, save, delete, reload.
    pg.click('[data-panel=add-panel]')
    pg.fill('#note-text', "Lesson 1: Storage test\nhello\n"); pg.fill('#note-class', 'ZZ Test'); pg.click('#check-btn'); pg.click('#save-all-btn'); pg.wait_for_timeout(800)
    pg.reload(); pg.wait_for_timeout(1500)
    ok("D1 a pasted note survives reload", "Storage test" in pg.inner_text('#note-list'))
    pg.on('dialog', lambda d: d.accept())
    card = pg.locator('.note', has_text="Storage test").first
    card.locator('.note-head').click()
    card.locator('button', has_text="Delete").click(); pg.wait_for_timeout(800)
    pg.reload(); pg.wait_for_timeout(1500)
    ok("D2 a deleted note stays deleted", "Storage test" not in pg.inner_text('#note-list'))
    ok("D3 no page errors", not errs, errs)
    ctx.close()
    # E. A browser with no IndexedDB: falls back to the old storage and still works.
    ctx = b.new_context(); ctx.add_init_script("delete window.indexedDB")
    pg = ctx.new_page(); errs2 = []; pg.on('pageerror', lambda e: errs2.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(300)
    pg.set_input_files('#import-file', str(ROOT / 'examples' / 'demo101-building-web-apis.json')); pg.wait_for_timeout(500)
    pg.reload(); pg.wait_for_timeout(500)
    ok("E1 fallback keeps notes", pg.inner_text('#count') == "8", pg.inner_text('#count'))
    ok("E2 fallback says so on screen", "localStorage" in pg.text_content('#storage-info'), pg.text_content('#storage-info'))
    ok("E3 no page errors", not errs2, errs2)
    b.close()
print(f"\n{sum(r for _, r in results)} of {len(results)} passed")
