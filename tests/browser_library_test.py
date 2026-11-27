# Notes Vault: the Library panel, in a real browser.
# Needs the app served over http with a built library (fetch doesn't work from file://), so this test
# builds one from the example course into a temp folder and serves it.
import json, os, shutil, subprocess, sys, tempfile, threading, http.server, functools
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
results = []
def ok(name, cond, extra=""):
    results.append(cond); print(("PASS " if cond else "FAIL ") + name + (f"  ({extra})" if extra else ""))

site = tempfile.mkdtemp()
for item in ["index.html", "style.css", "js", "tools", "examples"]:
    src = os.path.join(ROOT, item)
    (shutil.copytree if os.path.isdir(src) else shutil.copy)(src, os.path.join(site, item))
os.makedirs(os.path.join(site, "contributions"))
# one share file made by the app's own code, from the example course
share = subprocess.run(["node", "-e", """
for (const f of ["classes.js","study.js","share.js"]) Object.assign(global, require(process.argv[1] + "/js/core/" + f));
const raw = require(process.argv[1] + "/examples/demo101-building-web-apis.json");
const { notes, classes } = migrateToV2(raw.notes || raw);
const { file } = buildContribution({ notes, cls: classes[0], profile: { id: "id-sam-000", displayName: "Sam" }, pickedIds: notes.map(n => n.id), now: "2026-01-08T00:00:00Z" });
process.stdout.write(JSON.stringify(file));
""", ROOT], capture_output=True, text=True, check=True).stdout
open(os.path.join(site, "contributions", "sam.json"), "w").write(share)
subprocess.run(["node", os.path.join(site, "tools", "build-library.js"), site], check=True, capture_output=True)
lessons = len(json.loads(share)["lessons"])

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
handler = functools.partial(Quiet, directory=site)
server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{server.server_port}/index.html"

with sync_playwright() as p:
    pg = p.chromium.launch().new_page(); errors = []
    pg.on("pageerror", lambda e: errors.append(str(e))); pg.on("dialog", lambda d: d.accept())
    pg.goto(url); pg.wait_for_timeout(1200)
    ok("new user: the Library starts open", pg.locator("#library-panel").is_visible())
    ok("the shared class is listed", pg.locator(".library-class").count() == 1)
    row = pg.locator(".library-class").first
    ok("lesson count shown", f"{lessons} lessons" in row.inner_text(), row.inner_text())
    row.get_by_role("button", name="Read").click(); pg.wait_for_timeout(500)
    ok("Read lists every lesson", row.locator(".library-lesson").count() == lessons)
    row.locator(".library-lesson summary").first.click(); pg.wait_for_timeout(200)
    ok("a lesson shows who shared it", "Shared by Sam" in row.inner_text())
    row.get_by_role("button", name="Add to my notes").click(); pg.wait_for_timeout(1000)
    ok("Add to my notes adds every lesson", pg.inner_text("#count") == str(lessons), pg.inner_text("#count"))
    row = pg.locator(".library-class").first
    ok("then Compare is offered", row.get_by_role("button", name="⇄ Compare").count() == 1)
    row.get_by_role("button", name="Add lessons I'm missing").click(); pg.wait_for_timeout(800)
    ok("adding again never makes copies", pg.inner_text("#count") == str(lessons))
    pg.click("[data-panel=classes-panel]"); pg.fill("#profile-name", "Alex"); pg.click("#profile-save"); pg.wait_for_timeout(300)
    pg.click("[data-panel=share-panel]"); pg.wait_for_timeout(500)
    ok("library notes can't be shared again as yours", "only share your own notes" in pg.inner_text("#share-panel"))
    pg.reload(); pg.wait_for_timeout(1000)
    ok("notes are kept after a reload", pg.inner_text("#count") == str(lessons))
    ok("no page errors", not errors, "; ".join(errors))

server.shutdown(); shutil.rmtree(site)
print(f"{sum(results)} of {len(results)} passed")
sys.exit(0 if all(results) else 1)
