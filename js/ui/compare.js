// Notes Vault: SCREEN LAYER, the Compare page
// One of your classes next to the shared library: every lesson, yours and classmates',
// lessons you're missing, and for any lesson your notes side by side with a classmate's,
// with "What's new to you" (lines in theirs that aren't in yours).
//
// Where classmates' notes come from:
//   1. the library on the app's website (library/index.json, built from contributions/)
//   2. share files a classmate sent you, loaded here (kept apart from your notes, never mixed in)

const LibraryCache = { index: undefined, classes: {} };   // undefined = not tried yet, null = not available

async function loadLibraryIndex() {
  if (LibraryCache.index !== undefined) return LibraryCache.index;
  try {
    const res = await fetch("library/index.json", { cache: "no-cache" });
    // On the website but no library built yet (nobody has shared): an empty library, not "no website"
    LibraryCache.index = res.ok ? await res.json() : { classes: [] };
  } catch { LibraryCache.index = null; }   // opened from a file on your computer: no website library
  return LibraryCache.index;
}

async function loadLibraryClass(entry) {
  if (!entry) return null;
  if (LibraryCache.classes[entry.key] !== undefined) return LibraryCache.classes[entry.key];
  try {
    const res = await fetch(entry.file, { cache: "no-cache" });
    LibraryCache.classes[entry.key] = res.ok ? await res.json() : null;
  } catch { LibraryCache.classes[entry.key] = null; }
  return LibraryCache.classes[entry.key];
}

function openCompare(classId) {
  View.compare = { classId, open: null };
  View.week = null;
  View.query = ""; $("search").value = "";
  if (window.matchMedia("(max-width: 900px)").matches) $("sidebar").classList.add("collapsed");
  App.render();
  window.scrollTo({ top: 0 });
}

function setUpCompare() {
  $("compare-file").addEventListener("change", async e => {
    let added = 0;
    const problems = [];
    for (const f of e.target.files) {
      try {
        const file = JSON.parse(await f.text());
        const bad = validateContribution(file);   // the same safety check as the library
        if (bad.length) { problems.push(`${f.name}: ${bad[0]}`); continue; }
        // the same classmate + class again → replace (newest wins), never pile up
        App.classmates = App.classmates.filter(c => !(c.contributor.id === file.contributor.id && libraryClassKey(c.class) === libraryClassKey(file.class)));
        App.classmates.push(file);
        added++;
      } catch { problems.push(`${f.name}: not a share file`); }
    }
    e.target.value = "";
    if (added && !(await saveData({ classmates: App.classmates }))) problems.push("could not save");
    // kept on View, so the message survives the redraw that shows the new notes
    if (View.compare) View.compare.message = {
      text: [added ? `Loaded ${added} share file${added === 1 ? "" : "s"}.` : "", ...problems].filter(Boolean).join("  "),
      kind: problems.length ? "bad" : "ok" };
    App.render();
  });
}

async function renderCompare() {
  const page = $("compare-view");
  const { classId } = View.compare;
  const cls = App.classes.find(c => c.id === classId);
  if (!cls) { View.compare = null; App.render(); return; }
  page.style.setProperty("--class-color", cls.color);

  // Find this course in the website library and in loaded files
  const index = await loadLibraryIndex();
  const entry = index && index.classes.find(c => sameCourse(cls, c));
  const online = await loadLibraryClass(entry);
  const local = buildLibrary(App.classmates.map((file, i) => ({ name: `loaded-${i}`, file }))).classes;
  const localCls = Object.values(local).find(c => sameCourse(cls, c));
  const lib = combineLibraryClasses(online, localCls);
  if (!View.compare || View.compare.classId !== classId) return;   // you moved on while it loaded

  const myId = App.profile && App.profile.id;
  const rows = compareRows(App.notes, cls, lib, myId);
  const youShared = rows.some(r => r.youShared);
  const missing = missingLessons(rows);
  const people = new Map();
  for (const r of rows) for (const v of r.versions) people.set(v.contributor.id, v.contributor.displayName);

  page.innerHTML = "";
  // ---- header ----
  const head = document.createElement("div");
  head.className = "week-head";
  const title = document.createElement("h2");
  title.textContent = "Compare with classmates";
  const sub = document.createElement("div");
  sub.className = "muted";
  const sources = [];
  if (index === null) sources.push("the shared library is available when you open the app from its website");
  else if (!entry) sources.push("nobody has shared this class to the library yet");
  else {
    // Count classmates only. Your own share isn't a classmate.
    const others = entry.contributors - (youShared ? 1 : 0);
    sources.push(`library: ${others} classmate${others === 1 ? "" : "s"} shared this class` + (youShared ? " (plus your own share)" : ""));
  }
  if (localCls) sources.push(`${App.classmates.filter(f => sameCourse(cls, f.class)).length} share file(s) loaded here`);
  sub.textContent = `${cls.name}  ·  ${sources.join("  ·  ")}`;

  const buttons = document.createElement("div");
  buttons.className = "week-buttons";
  const back = document.createElement("button");
  back.className = "ghost small";
  back.textContent = "← All notes";
  back.addEventListener("click", () => { View.compare = null; App.render(); });
  const load = document.createElement("label");
  load.className = "file-btn small-file";
  load.textContent = "Load a classmate's share file";
  load.htmlFor = "compare-file";   // the file picker itself lives outside this page, so redraws never remove it
  buttons.append(back, load);
  if (localCls) {
    const clear = document.createElement("button");
    clear.className = "ghost small";
    clear.textContent = "Remove loaded files for this class";
    clear.addEventListener("click", async () => {
      App.classmates = App.classmates.filter(f => !sameCourse(cls, f.class));
      await saveData({ classmates: App.classmates });
      App.render();
    });
    buttons.append(clear);
  }
  const msg = document.createElement("p");
  msg.id = "compare-message";
  if (View.compare.message) showMessage(msg, View.compare.message.text, View.compare.message.kind);
  head.append(title, sub, buttons, msg);
  page.append(head);

  if (!people.size) {
    const none = document.createElement("p");
    none.className = "muted";
    none.textContent = (youShared ? "Only your own share is here so far. " : "") +
      "No classmates' notes for this class yet. When someone shares it to the library (or sends you their share file), their lessons show up here.";
    page.append(none);
    return;
  }

  // ---- what classmates have that you don't ----
  if (missing.length) {
    const box = document.createElement("div");
    box.className = "missing-box";
    box.textContent = `Classmates have ${missing.length} lesson${missing.length === 1 ? "" : "s"} you don't: ` +
      missing.map(r => lessonLabel(r.item, r.title)).join(", ");
    page.append(box);
  }

  // ---- every lesson ----
  let group = null;
  for (const r of rows) {
    if (r.group !== group) {
      group = r.group;
      const h = document.createElement("h3");
      h.className = "group-week";
      h.textContent = group;
      page.append(h);
    }
    page.append(compareRow(r));
  }
}

function compareRow(r) {
  const box = document.createElement("div");
  box.className = "lesson compare-row" + (r.mine ? "" : " not-mine");
  const head = document.createElement("button");
  head.className = "compare-head";
  const name = document.createElement("span");
  name.className = "lesson-title";
  name.textContent = lessonLabel(r.item, r.title);
  const mineTag = document.createElement("span");
  mineTag.className = "tag " + (r.mine ? "done" : "warn");
  mineTag.textContent = r.mine ? "You have it" : "You're missing this";
  const theirs = document.createElement("span");
  theirs.className = "muted";
  theirs.textContent = r.versions.length ? `${r.versions.length} classmate${r.versions.length === 1 ? "" : "s"}` : "no classmates yet";
  head.append(name, mineTag);
  if (r.youShared) {
    const shared = document.createElement("span");
    shared.className = "tag shared";
    shared.textContent = "You shared this";
    head.append(shared);
  }
  head.append(theirs);
  box.append(head);

  const isOpen = View.compare.open === r.topic;
  if (r.versions.length) head.addEventListener("click", () => { View.compare.open = isOpen ? null : r.topic; App.render(); });
  else head.disabled = true;
  if (!isOpen || !r.versions.length) return box;

  // ---- side by side: yours | theirs ----
  const pick = View.compare.pick && r.versions.find(v => v.contributor.id === View.compare.pick) || r.versions[0];
  const grid = document.createElement("div");
  grid.className = "compare-grid";

  const left = document.createElement("div");
  left.className = "compare-col";
  const lh = document.createElement("div");
  lh.className = "compare-col-head";
  lh.textContent = "Your notes";
  left.append(lh);
  const lb = document.createElement("div");
  lb.className = "note-text refined";
  if (r.mine) lb.append(withCodeBoxes(r.mine.refined || r.mine.text));
  else lb.textContent = "You don't have this lesson. Their version is on the right.";
  left.append(lb);

  const right = document.createElement("div");
  right.className = "compare-col";
  const rh = document.createElement("div");
  rh.className = "compare-col-head";
  const sel = document.createElement("select");
  sel.setAttribute("aria-label", "Pick a classmate");
  for (const v of r.versions) {
    const o = document.createElement("option");
    o.value = v.contributor.id;
    o.textContent = `${v.contributor.displayName}  ·  shared ${String(v.sharedOn).slice(0, 10)}`;
    sel.append(o);
  }
  sel.value = pick.contributor.id;
  sel.addEventListener("change", () => { View.compare.pick = sel.value; App.render(); });
  rh.append(sel);
  right.append(rh);

  const tabs = document.createElement("div");
  tabs.className = "compare-tabs";
  const mode = View.compare.mode || "new";
  for (const [key, label] of [["new", "What's new to you"], ["full", "Their full version"]]) {
    const t = document.createElement("button");
    t.className = "tab" + (mode === key ? " active" : "");
    t.textContent = label;
    t.addEventListener("click", () => { View.compare.mode = key; App.render(); });
    tabs.append(t);
  }
  right.append(tabs);

  const body = document.createElement("div");
  body.className = "note-text refined";
  if (mode === "full" || !r.mine) body.append(withCodeBoxes(pick.refined || pick.original));
  else {
    const fresh = whatsNew(myTextFor(r), pick.refined || pick.original);   // checks your lesson notes AND your lesson chat
    if (!fresh.length) body.textContent = "Nothing new: everything in their version is already in your notes.";
    else {
      const ul = document.createElement("ul");
      ul.className = "new-lines";
      for (const line of fresh) { const li = document.createElement("li"); li.textContent = line; ul.append(li); }
      body.append(ul);
    }
  }
  right.append(body);
  grid.append(left, right);
  box.append(grid);
  return box;
}
