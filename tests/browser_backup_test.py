# Notes Vault: backup reminders and restore, in a real browser.
#   python tests/browser_backup_test.py      (needs Python + Playwright)
from playwright.sync_api import sync_playwright
import glob, json, pathlib, tempfile
ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / 'index.html').as_uri()
FILES = sorted(glob.glob(str(ROOT / 'examples' / '*.json')))
ALL = [n for f in FILES for n in json.load(open(f))['notes']]
PUT = """([k, v]) => new Promise(r => { const q = indexedDB.open('notesVault'); q.onsuccess = () => {
  const tx = q.result.transaction('data', 'readwrite'); tx.objectStore('data').put(v, k); tx.oncomplete = () => { q.result.close(); r(1); }; }; })"""
results = []
def ok(name, cond, detail=""):
    results.append(bool(cond)); print(("PASS " if cond else "FAIL ") + name + (f"  ({detail})" if detail else ""))
def settle(pg, ms=450): pg.wait_for_timeout(ms)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(accept_downloads=True, viewport={"width": 1366, "height": 900}); pg = ctx.new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); settle(pg)
    ok("no notes yet: no reminder", not pg.locator('#backup-banner').is_visible() and not pg.locator('#backup-dot').is_visible())
    for f in FILES: pg.set_input_files('#import-file', f); pg.wait_for_timeout(200)
    pg.reload(); settle(pg, 900)
    ok("notes but never backed up: the banner shows", pg.locator('#backup-banner').is_visible() and "haven't made a backup" in pg.inner_text('#backup-banner'))
    ok("…and the dot on the Backup button", pg.locator('#backup-dot').is_visible())
    with pg.expect_download() as d: pg.click('#banner-backup')
    path = pathlib.Path(tempfile.gettempdir()) / 'nv-backup-test.json'; d.value.save_as(path); settle(pg)
    ok("file name says the date and how many notes", d.value.suggested_filename.endswith(f"-{len(ALL)}-notes.json"), d.value.suggested_filename)
    ok("after backing up: banner and dot are gone", not pg.locator('#backup-banner').is_visible() and not pg.locator('#backup-dot').is_visible())
    pg.click('[data-panel=backup-panel]')
    ok("Backup panel says it has everything", "has everything" in pg.inner_text('#backup-status'), pg.inner_text('#backup-status'))
    # tick a lesson: a change since the backup → just the dot
    demo = pg.locator('.side-class', has_text='DEMO101'); demo.locator('summary').click()
    demo.locator('.side-week', has_text='Week 1').click(); settle(pg)
    pg.locator('.lesson input[type=checkbox]').first.check(); settle(pg)
    ok("a change since the backup: the dot shows", pg.locator('#backup-dot').is_visible())
    ok("…but no banner (the backup is recent)", not pg.locator('#backup-banner').is_visible())
    # the backup becomes 10 days old
    pg.evaluate(PUT, ['backup', {"on": "2020-01-01T00:00:00.000Z", "notes": len(ALL)}]); pg.reload(); settle(pg, 900)
    ok("old backup + changes: the banner is back", pg.locator('#backup-banner').is_visible() and "days ago" in pg.inner_text('#backup-banner'), pg.inner_text('#backup-banner'))
    pg.click('#banner-later'); settle(pg)
    ok("Remind me tomorrow hides the banner", not pg.locator('#backup-banner').is_visible())
    pg.reload(); settle(pg, 900)
    ok("…and it stays hidden after a reload", not pg.locator('#backup-banner').is_visible())
    ok("…while the dot still shows", pg.locator('#backup-dot').is_visible())
    pg.click('[data-panel=backup-panel]') if not pg.locator('#backup-panel').is_visible() else None
    with pg.expect_download() as d2: pg.click('#export-btn')
    path = pathlib.Path(tempfile.gettempdir()) / 'nv-backup-test2.json'; d2.value.save_as(path); settle(pg)
    bk = json.load(open(path))
    ok("the backup holds notes, classes, profile and checkmarks", len(bk['notes']) == len(ALL) and bk['classes'] and 'profile' in bk and 'progress' in bk)
    ok("no page errors", not errs, errs)
    # restore into a brand-new browser
    ctx2 = b.new_context(); pg2 = ctx2.new_page(); pg2.goto(URL); settle(pg2)
    pg2.set_input_files('#import-file', str(path)); settle(pg2, 1500)
    ok("restore: every note is back", pg2.locator('.note').count() == len(ALL), pg2.locator('.note').count())
    ok("restore: every class is back", pg2.locator('.side-class').count() == len(bk['classes']))
    pg3_progress = pg2.evaluate("""() => new Promise(r => { const q = indexedDB.open('notesVault'); q.onsuccess = () => {
      const g = q.result.transaction('data').objectStore('data').get('progress'); g.onsuccess = () => r(g.result || {}); }; })""")
    ok("restore: checkmarks are back", len(bk['progress']) == 1 and pg3_progress == bk['progress'], f"{len(pg3_progress)} checkmark(s)")
    b.close()
print(f"\n{sum(results)} of {len(results)} passed")
