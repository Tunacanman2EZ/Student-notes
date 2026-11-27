# Notes Vault steps 2J + 2K: Compare, in a real browser.
#   python tests/browser_compare_test.py      (needs Python + Playwright)
# Part A runs the app as a website (like GitHub Pages) with a library built from two made-up classmates.
# Part B opens the app from a file (no website) and loads a classmate's share file by hand.
# Part C (2K): your own share isn't a classmate, and a lesson chat doesn't take over the lesson's row.
from playwright.sync_api import sync_playwright
import glob, json, pathlib, shutil, subprocess, sys, tempfile, time, socket
ROOT = pathlib.Path(__file__).resolve().parent.parent
FILES = sorted(glob.glob(str(ROOT / 'examples' / '*.json')))
results = []
def ok(name, cond, detail=""):
    results.append(bool(cond)); print(("PASS " if cond else "FAIL ") + name + (f"  ({detail})" if detail else ""))
def settle(pg, ms=500): pg.wait_for_timeout(ms)

def classmate(name, pid, lessons_from, extra, new_lessons=()):
    demo = json.load(open(ROOT / 'examples' / 'demo101-building-web-apis.json'))['notes']
    lessons = []
    for n in demo:
        if n['topic'] not in lessons_from: continue
        g, i = n['topic'].split(' · ')
        lessons.append({"group": g, "item": i, "title": n['title'], "topic": n['topic'], "order": n['order'], "date": n['date'],
                        "dateEnd": n['dateEnd'], "refined": n['refined'] + extra.get(n['topic'], ""), "original": ""})
    lessons += list(new_lessons)
    return {"app": "notes-vault", "kind": "contribution", "version": 1, "createdOn": "2026-01-20T00:00:00Z",
            "contributor": {"id": pid, "displayName": name}, "program": "",
            "class": {"code": "DEMO101", "name": "DEMO101: Building Web APIs"}, "lessons": lessons}

sam = classmate("Sam", "id-sam", ["Week 1 · Lesson 1", "Week 1 · Lesson 2"],
                {"Week 1 · Lesson 1": "\nI used my game backend instead of the recipe API.\nTip from Sam: draw the request flow on paper first."})
jo = classmate("Jo", "id-jo", ["Week 1 · Lesson 1"], {"Week 1 · Lesson 1": "\nJo's path: a music playlist API."},
               [{"group": "Week 2", "item": "Lesson 4", "title": "Rate limits", "topic": "Week 2 · Lesson 4", "order": 204,
                 "date": "2026-01-12", "dateEnd": "2026-01-19", "refined": "IN PLAIN WORDS\nToo many requests from one client get 429.", "original": ""}])

# ---- build a website like GitHub Pages does: the app + a library made from Sam's and Jo's shares ----
site = pathlib.Path(tempfile.mkdtemp())
for f in ["index.html", "style.css"]: shutil.copy(ROOT / f, site / f)
for d in ["js", "examples", "tools"]: shutil.copytree(ROOT / d, site / d)
(site / "contributions").mkdir()
json.dump(sam, open(site / "contributions" / "sam-id-sam-demo101-2026-01-20.json", "w"))
json.dump(jo, open(site / "contributions" / "jo-id-jo-demo101-2026-01-20.json", "w"))
subprocess.run(["node", str(site / "tools" / "build-library.js"), str(site)], check=True, capture_output=True)
s = socket.socket(); s.bind(("127.0.0.1", 0)); port = s.getsockname()[1]; s.close()
server = subprocess.Popen([sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1"], cwd=site,
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_context(viewport={"width": 1366, "height": 1000}).new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(f"http://127.0.0.1:{port}/index.html"); settle(pg)
        for f in FILES: pg.set_input_files('#import-file', f); pg.wait_for_timeout(200)
        pg.reload(); settle(pg, 800)
        demo = pg.locator('.side-class', has_text='DEMO101'); demo.locator('summary').click()
        ok("every class has a Compare link", pg.locator('.side-compare').count() == pg.locator('.side-class').count())
        demo.locator('.side-compare').click(); settle(pg, 900)
        head = pg.inner_text('#compare-view .week-head')
        ok("A: the website library is found: 2 classmates", "library: 2 classmates shared this class" in head, head.splitlines()[1])
        ok("A: a lesson you're missing is flagged at the top", "Lesson 4: Rate limits" in pg.inner_text('.missing-box'))
        ok("A: …and in the list", pg.locator('.compare-row.not-mine', has_text='Rate limits').count() == 1)
        ok("A: lessons with classmates' versions say how many", "2 classmates" in pg.locator('.compare-row', has_text='What an API is').inner_text())
        pg.locator('.compare-row', has_text='What an API is').locator('.compare-head').click(); settle(pg, 600)
        grid = pg.locator('.compare-grid')
        ok("A: side by side: yours | theirs", grid.count() == 1 and "Your notes" in grid.inner_text())
        ok("A: classmates in the dropdown, by name", pg.locator('.compare-grid select option').all_inner_texts()[0].startswith("Jo"))
        ok("A: What's new to you shows only Jo's new line", pg.locator('.new-lines li').all_inner_texts() == ["Jo's path: a music playlist API."],
           pg.locator('.new-lines li').all_inner_texts())
        pg.locator('.compare-grid select').select_option('id-sam'); settle(pg, 600)
        ok("A: switch to Sam: his 2 new lines", pg.locator('.new-lines li').all_inner_texts() == [
            "I used my game backend instead of the recipe API.", "Tip from Sam: draw the request flow on paper first."])
        pg.click('.compare-tabs .tab:has-text("Their full version")'); settle(pg, 400)
        ok("A: Their full version shows all of it", "An API is a menu" in pg.locator('.compare-col').nth(1).inner_text())
        pg.locator('.compare-row', has_text='Rate limits').locator('.compare-head').click(); settle(pg, 600)
        ok("A: a missing lesson: you see theirs in full", "429" in pg.locator('.compare-col').nth(1).inner_text()
           and "You don't have this lesson" in pg.locator('.compare-col').nth(0).inner_text())
        ok("A: your own notes were not changed", pg.locator('.side-class', has_text='DEMO101').locator('.side-count').first.inner_text().endswith("/8"))
        ok("A: no page errors", not errs, errs)
        # ---- Part B: opened from a file, no website library ----
        pg2 = b.new_context(viewport={"width": 1366, "height": 1000}).new_page()
        errs2 = []; pg2.on('pageerror', lambda e: errs2.append(str(e)))
        pg2.goto((ROOT / 'index.html').as_uri()); settle(pg2)
        for f in FILES: pg2.set_input_files('#import-file', f); pg2.wait_for_timeout(200)
        pg2.reload(); settle(pg2, 800)
        d2 = pg2.locator('.side-class', has_text='DEMO101'); d2.locator('summary').click(); d2.locator('.side-compare').click(); settle(pg2, 800)
        ok("B: from a file, it says the library needs the website", "available when you open the app from its website" in pg2.inner_text('#compare-view'))
        ok("B: …and that there's nothing to compare yet", "No classmates' notes for this class yet" in pg2.inner_text('#compare-view'))
        tmp = pathlib.Path(tempfile.mkdtemp())
        json.dump(sam, open(tmp / "sam.json", "w"))
        bad = dict(sam, lessons=[dict(sam['lessons'][0], topic="Final", title="Final")]); json.dump(bad, open(tmp / "bad.json", "w"))
        pg2.set_input_files('#compare-file', [str(tmp / "sam.json"), str(tmp / "bad.json")]); settle(pg2, 900)
        ok("B: loading Sam's file works; a file with a final is refused", "share file(s) loaded here" in pg2.inner_text('#compare-view .week-head')
           and "bad.json" in pg2.inner_text('#compare-message'), pg2.inner_text('#compare-message'))
        ok("B: Sam's lessons show up", "1 classmate" in pg2.locator('.compare-row', has_text='What an API is').inner_text())
        pg2.reload(); settle(pg2, 800)
        d2 = pg2.locator('.side-class', has_text='DEMO101'); d2.locator('summary').click(); d2.locator('.side-compare').click(); settle(pg2, 800)
        ok("B: loaded files are remembered after a reload", "1 classmate" in pg2.locator('.compare-row', has_text='What an API is').inner_text())
        ok("B: loaded files never mix into your notes", pg2.locator('#count').inner_text() == "11")
        pg2.click('button:has-text("Remove loaded files")'); settle(pg2, 800)
        ok("B: Remove loaded files clears them", "No classmates' notes" in pg2.inner_text('#compare-view'))
        ok("B: no page errors", not errs2, errs2)
        # ---- Part C (2K): you + a lesson chat ----
        my_id = pg2.evaluate("App.profile.id")
        me = dict(classmate("Me", my_id, ["Week 1 · Lesson 1"], {}), createdOn="2026-01-21T00:00:00Z")
        json.dump(me, open(tmp / "me.json", "w"))
        chat = {"app": "notes-vault", "version": 1, "notes": [{"id": "demo-w1-l1-chat", "className": "DEMO101: Building Web APIs",
                "topic": "Week 1 · Lesson 1", "title": "What an API is: lesson chat", "order": 101.5, "date": "2026-01-05",
                "dateEnd": "2026-01-12", "link": "", "text": "YOU: is a game backend an API too?\nI used my game backend instead of the recipe API.",
                "refined": "", "addedOn": "2026-01-06"}]}
        json.dump(chat, open(tmp / "chat.json", "w"))
        pg2.set_input_files('#import-file', str(tmp / "chat.json")); settle(pg2, 600)
        d2 = pg2.locator('.side-class', has_text='DEMO101'); 
        if not d2.locator('.side-compare').is_visible(): d2.locator('summary').click()
        d2.locator('.side-compare').click(); settle(pg2, 800)
        pg2.set_input_files('#compare-file', [str(tmp / "me.json")]); settle(pg2, 900)
        view = pg2.inner_text('#compare-view')
        ok("C: only your own share loaded: no classmates, but it says yours is there", "No classmates' notes" in view and "Only your own share is here so far" in view, view[:300])
        pg2.set_input_files('#compare-file', [str(tmp / "sam.json")]); settle(pg2, 900)
        head2 = pg2.inner_text('#compare-view .week-head')
        row = pg2.locator('.compare-row').first
        ok("C: the lesson row keeps the lesson's title, not the chat's", row.locator('.lesson-title').inner_text() == "Lesson 1: What an API is", row.locator('.lesson-title').inner_text())
        ok("C: still one row for Lesson 1", pg2.locator('.compare-row', has_text='What an API is').count() == 1)
        ok("C: you're not counted as a classmate: Sam is the 1", "1 classmate" in row.inner_text() and "2 classmates" not in row.inner_text(), row.inner_text())
        ok("C: the row says you shared it", row.locator('.tag.shared').inner_text() == "You shared this")
        ok("C: a lesson you didn't share has no 'You shared this'", pg2.locator('.compare-row', has_text='Routes and status codes').locator('.tag.shared').count() == 0)
        row.locator('.compare-head').click(); settle(pg2, 600)
        names = pg2.locator('.compare-grid select option').all_inner_texts()
        ok("C: your name isn't in the classmate picker", len(names) == 1 and names[0].startswith("Sam"), names)
        ok("C: left column is your lesson notes, not the chat", "YOU:" not in pg2.locator('.compare-col').nth(0).inner_text())
        fresh = pg2.locator('.new-lines li').all_inner_texts()
        ok("C: What's new skips a line that's already in your chat", fresh == ["Tip from Sam: draw the request flow on paper first."], fresh)
        pg2.screenshot(path=str(pathlib.Path(tempfile.gettempdir()) / 'nv-compare-2k.png'))
        ok("C: no page errors", not errs2, errs2)
        pg.screenshot(path=str(pathlib.Path(tempfile.gettempdir()) / 'nv-compare.png'))
        b.close()
finally:
    server.terminate()
print(f"\n{sum(results)} of {len(results)} passed")
