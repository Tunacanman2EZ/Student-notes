// Notes Vault: SCREEN LAYER, the saved-notes list
// Each note is a dropdown card: click its title to open or close it.
// Closed, it shows the date, class › topic and title (plus, while searching, a highlighted snippet).
// Open, it shows the link button (Open lesson / Watch / Open link), the Refined / Original tabs, the note itself and Delete.
// The inside of a card is only built the first time you open it, so even thousands of notes stay fast.

const MAX_AUTO_OPEN = 3;   // searching finds 3 or fewer notes? open them right away

function noteCard(note, { terms = [], snippet = "", where = null, open = false } = {}) {
  const box = document.createElement("div");
  box.className = "note";
  box.dataset.id = note.id;
  box.style.setProperty("--class-color", classColor(note));   // the colored stripe on the left

  // ---- the part you click ----
  const head = document.createElement("button");
  head.className = "note-head";
  head.setAttribute("aria-expanded", "false");

  const arrow = document.createElement("span");
  arrow.className = "arrow";
  arrow.textContent = "▸";

  const left = document.createElement("div");
  left.className = "note-head-text";
  const meta = document.createElement("div");
  meta.className = "note-meta";
  const when = note.dateEnd ? `${note.date} → ${note.dateEnd}` : note.date;
  const metaText = () => `${when}  ·  ${note.className}  ›  ${note.topic}${note.private ? "  ·  private" : ""}`;
  meta.textContent = metaText();
  left.append(meta);
  const t = document.createElement("div");
  t.className = "note-title";
  t.textContent = note.title || note.topic;
  left.append(t);
  if (snippet) {
    const s = document.createElement("div");
    s.className = "snippet";
    s.textContent = snippet;
    left.append(s);
  }
  head.append(arrow, left);
  box.append(head);
  highlightTerms(left, terms);

  // ---- the inside, built on first open ----
  let inside = null;
  function build() {
    inside = document.createElement("div");
    inside.className = "note-inside";

    const actions = document.createElement("div");
    actions.className = "note-actions";
    const body = document.createElement("div");
    body.className = "note-text";

    if (note.link && /^https?:\/\//.test(note.link)) {
      const label = linkLabel(note.link);   // "Open lesson", "▶ Watch" or "Open link"
      const watch = document.createElement("a");
      watch.className = "watch is-" + label.kind;   // is-lesson / is-video / is-link
      watch.href = note.link;
      watch.target = "_blank";
      watch.rel = "noopener";
      watch.textContent = label.text;
      actions.append(watch);
    }

    function show(which) {
      const refined = which === "refined";
      body.innerHTML = "";
      if (refined) body.append(withCodeBoxes(note.refined));
      else body.textContent = note.text;   // original: shown exactly as pasted
      body.classList.toggle("refined", refined);
      for (const b of actions.querySelectorAll(".tab")) b.classList.toggle("active", b.dataset.which === which);
      highlightTerms(body, terms);
    }

    if (note.refined) {
      for (const [which, label] of [["refined", "Refined"], ["original", "Original"]]) {
        const tab = document.createElement("button");
        tab.className = "tab";
        tab.dataset.which = which;
        tab.textContent = label;
        tab.addEventListener("click", () => show(which));
        actions.append(tab);
      }
    }

    // Lock: a private note is never shared, whatever you tick on the Share panel
    const lock = document.createElement("button");
    lock.className = "small ghost lock";
    const showLock = () => { lock.textContent = note.private ? "Private (locked)" : "Lock (keep private)"; lock.classList.toggle("on", !!note.private); };
    showLock();
    lock.addEventListener("click", async () => {
      note.private = !note.private;
      if (!(await saveData({ notes: App.notes }))) { note.private = !note.private; alert("Could not save. Nothing changed."); }
      showLock();
      meta.textContent = metaText();
      if (!$("share-panel").hidden) renderSharePanel();
    });
    actions.append(lock);

    const del = document.createElement("button");
    del.className = "small delete";
    del.textContent = "Delete";
    del.addEventListener("click", () => deleteNote(note.id));
    actions.append(del);

    inside.append(actions, body);
    box.append(inside);
    // Searching found the words only in your original? Open that tab first.
    show(note.refined && where !== "original" ? "refined" : "original");
  }

  function setOpen(yes) {
    if (yes && !inside) build();
    if (inside) inside.hidden = !yes;
    box.classList.toggle("open", yes);
    arrow.textContent = yes ? "▾" : "▸";
    head.setAttribute("aria-expanded", String(yes));
  }
  head.addEventListener("click", () => setOpen(!box.classList.contains("open")));
  box.setOpen = setOpen;   // so "Open all" / "Close all" can reach it
  if (open) setOpen(true);
  return box;
}

// ---- the toolbar: search box + class dropdown ----
// What the screen is showing: a search, a class, or one week's Week page.
const View = { query: "", className: "", week: null, compare: null, openClasses: new Set() };

function setUpToolbar() {
  const search = $("search"), pick = $("class-filter");
  View.className = loadPrefs().className || "";

  let timer = null;
  search.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {   // wait until you pause typing
      View.query = search.value;
      if (View.query.trim()) { View.week = null; View.compare = null; }   // searching leaves the Week / Compare page
      App.render();
    }, 120);
  });
  search.addEventListener("keydown", e => {
    if (e.key === "Escape") { search.value = ""; View.query = ""; App.render(); }
  });
  pick.addEventListener("change", () => {
    View.className = pick.value;
    View.week = null;
    View.compare = null;
    savePrefs({ className: View.className });
    App.render();
  });
  // Press "/" anywhere (when you're not typing in a box) to jump to the search box.
  document.addEventListener("keydown", e => {
    if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
      e.preventDefault();
      search.focus();
    }
  });
  $("open-all").addEventListener("click", () => { for (const c of $("note-list").children) c.setOpen && c.setOpen(true); });
  $("close-all").addEventListener("click", () => { for (const c of $("note-list").children) c.setOpen && c.setOpen(false); });
}

// Class dropdown: "All classes", then every class, newest first, with how many notes it has.
function fillClassDropdown() {
  const pick = $("class-filter");
  const newest = {}, howMany = {};
  for (const n of App.notes) {
    howMany[n.className] = (howMany[n.className] || 0) + 1;
    if (!newest[n.className] || n.date > newest[n.className]) newest[n.className] = n.date;
  }
  const classes = Object.keys(howMany).sort((a, b) => newest[b].localeCompare(newest[a]) || a.localeCompare(b));
  if (View.className && !howMany[View.className]) View.className = "";   // that class is gone
  pick.innerHTML = "";
  const all = document.createElement("option");
  all.value = "";
  all.textContent = `All classes (${App.notes.length})`;
  pick.append(all);
  for (const c of classes) {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = `${c} (${howMany[c]})`;
    pick.append(opt);
  }
  pick.value = View.className;
}

// Draw everything: sidebar, then either the Week page or the notes list.
function renderAll() {
  renderSidebar();
  const inWeek = !!View.week, inCompare = !!View.compare;
  $("week-view").hidden = !inWeek;
  $("compare-view").hidden = !inCompare;
  $("notes-card").hidden = inWeek || inCompare;
  if (inWeek) renderWeek();
  if (inCompare) renderCompare();
  renderList(inWeek || inCompare);
}

function renderList(skipList = false) {
  const list = $("note-list");
  list.innerHTML = "";
  $("count").textContent = App.notes.length;
  fillClassDropdown();
  if (skipList) {   // on the Week page: just keep the toolbar and panels up to date
    $("result-count").textContent = "";
    renderClassesPanel();
    if ($("storage-info")) showStorageInfo();
    showBackupReminder();
    return;
  }

  const terms = parseQuery(View.query);
  let results = searchNotes(App.notes, View.query, View.className);
  if (!terms.length) {   // no search: the usual order (newest class first, then lesson order)
    const order = new Map(sortNotes(App.notes).map((n, i) => [n, i]));
    results.sort((a, b) => order.get(a.note) - order.get(b.note));
  }

  const open = terms.length > 0 && results.length <= MAX_AUTO_OPEN;
  for (const r of results) list.append(noteCard(r.note, { terms, snippet: r.snippet, where: r.where, open }));

  const total = View.className ? App.notes.filter(n => n.className === View.className).length : App.notes.length;
  $("result-count").textContent = terms.length ? `${results.length} of ${total} notes` : `${total} notes`;
  const empty = $("empty-message");
  empty.hidden = results.length > 0;
  empty.textContent = !App.notes.length ? "No notes yet. Open \"Add notes\" above to paste your first class."
    : `No notes match "${View.query.trim()}"${View.className ? " in this class" : ""}.`;

  // Class suggestions in the paste box, from classes you've already used
  const classList = $("class-list");
  classList.innerHTML = "";
  for (const c of [...new Set(App.notes.map(n => n.className))].sort()) {
    const opt = document.createElement("option");
    opt.value = c;
    classList.append(opt);
  }
  if ($("storage-info")) showStorageInfo();
  renderClassesPanel();
  showBackupReminder();
  if (!$("share-panel").hidden) renderSharePanel();
}

async function deleteNote(id) {
  if (!confirm("Delete this note? This can't be undone.")) return;
  const kept = App.notes.filter(n => n.id !== id);
  const progress = { ...App.progress };
  delete progress[id];   // its checkmark goes too
  if (!(await saveData({ notes: kept, progress }))) { alert("Could not delete: saving failed. The note is still here."); return; }
  App.notes = kept;
  App.progress = progress;
  App.render();
}
