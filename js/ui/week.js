// Notes Vault: SCREEN LAYER, the Week page (for weekly reviews)
// One week (or unit) of one class: every lesson in order, its short summary first,
// a "Reviewed" checkbox, and "Open full note" for the whole thing.
// Your checkmarks are saved in their own record (progress), never inside the notes.

function renderWeek() {
  const page = $("week-view");
  page.innerHTML = "";
  const { classId, group } = View.week;
  const branch = buildTree(App.notes, App.classes).find(t => t.cls.id === classId);
  const g = branch && branch.groups.find(x => x.name === group);
  if (!g) { View.week = null; App.render(); return; }   // that week is gone (notes deleted)
  const cls = branch.cls;
  page.style.setProperty("--class-color", cls.color);

  // ---- header ----
  const head = document.createElement("div");
  head.className = "week-head";
  const title = document.createElement("h2");
  title.textContent = `${group}`;
  const sub = document.createElement("div");
  sub.className = "muted";
  sub.textContent = `${cls.name}  ·  ${g.start}${g.end && g.end !== g.start ? " → " + g.end : ""}`;

  const p = progressOf(g.notes, App.progress);
  const bar = document.createElement("div");
  bar.className = "progress";
  bar.setAttribute("role", "progressbar");
  bar.setAttribute("aria-valuemin", "0");
  bar.setAttribute("aria-valuemax", String(p.total));
  bar.setAttribute("aria-valuenow", String(p.done));
  const fill = document.createElement("div");
  fill.style.width = `${p.total ? (100 * p.done / p.total) : 0}%`;
  bar.append(fill);
  const pText = document.createElement("div");
  pText.className = "muted";
  pText.textContent = `${p.done} of ${p.total} reviewed`;

  const buttons = document.createElement("div");
  buttons.className = "week-buttons";
  const back = document.createElement("button");
  back.className = "ghost small";
  back.textContent = "← All notes";
  back.addEventListener("click", () => { View.week = null; App.render(); });
  const markAll = document.createElement("button");
  markAll.className = "small";
  const allDone = p.done === p.total;
  markAll.textContent = allDone ? "Unmark all" : "Mark all reviewed";
  markAll.addEventListener("click", () => setReviewed(g.notes.map(n => n.id), !allDone));
  const openAll = document.createElement("button");
  openAll.className = "ghost small";
  openAll.textContent = "Open all lessons";
  openAll.addEventListener("click", () => { for (const f of page.querySelectorAll(".lesson")) f.openFull(true); });
  buttons.append(back, markAll, openAll);

  head.append(title, sub, bar, pText, buttons);
  page.append(head);

  // ---- lessons ----
  for (const note of g.notes) {
    const item = splitTopic(note.topic).item;
    const box = document.createElement("div");
    box.className = "lesson" + (App.progress[note.id] ? " reviewed" : "");

    const top = document.createElement("div");
    top.className = "lesson-top";
    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = !!App.progress[note.id];
    check.id = `rev-${note.id}`;
    const label = document.createElement("label");
    label.htmlFor = check.id;
    label.className = "lesson-title";
    label.textContent = lessonLabel(item, note.title);
    check.addEventListener("change", () => setReviewed([note.id], check.checked));
    top.append(check, label);
    if (isGradedReview(note)) {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = "Review";
      tag.title = "Graded reviews are for you only. They will never be shared.";
      top.append(tag);
    }
    box.append(top);

    const summary = document.createElement("div");
    summary.className = "lesson-summary";
    summary.textContent = studySummary(note);
    box.append(summary);

    const more = document.createElement("button");
    more.className = "ghost small";
    more.textContent = "Open full note";
    let full = null;
    box.openFull = (yes) => {
      if (yes && !full) { full = noteCard(note, { open: true }); box.append(full); }
      if (full) full.hidden = !yes;
      more.textContent = yes ? "Close full note" : "Open full note";
    };
    more.addEventListener("click", () => box.openFull(!full || full.hidden));
    box.append(more);
    page.append(box);
  }
}

// Mark lessons reviewed (or not). Saves only the progress record; your notes aren't touched.
async function setReviewed(ids, yes) {
  const before = { ...App.progress };
  for (const id of ids) {
    if (yes) App.progress[id] = today();
    else delete App.progress[id];
  }
  if (!(await saveData({ progress: App.progress }))) {
    App.progress = before;
    alert("Could not save your checkmark. Nothing changed.");
  }
  App.render();
}
