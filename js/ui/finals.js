// Notes Vault: SCREEN LAYER, the Final prep page
// One course, all its weeks, in three equal tabs:
//   Summaries:   every lesson's short summary, week by week (ticks show what you've reviewed)
//   Study lines: every "Cheat sheet", "For finals", "Key exam…", "Exam line" block from your notes
//   Corrections: every place the course notes were wrong or incomplete, so you don't study the wrong answer
// "Print" prints all three. The gathering is done by core/finals.js.

const FINAL_TABS = [["summaries", "Summaries"], ["study", "Study lines"], ["fixes", "Corrections"]];

function openFinals(classId) {
  View.finals = classId;
  View.week = null;
  View.compare = null;
  View.finalsTab = View.finalsTab || "summaries";
  View.query = ""; $("search").value = "";
  if (window.matchMedia("(max-width: 900px)").matches) $("sidebar").classList.add("collapsed");
  App.render();
  window.scrollTo({ top: 0 });
}

function renderFinals() {
  const page = $("final-view");
  page.innerHTML = "";
  const prep = buildFinalPrep(App.notes, App.classes, View.finals);
  if (!prep) { View.finals = null; App.render(); return; }
  page.style.setProperty("--class-color", prep.cls.color);

  // ---- header ----
  const head = document.createElement("div");
  head.className = "week-head";
  const title = document.createElement("h2");
  title.textContent = "Final prep";
  const weeks = prep.weeks;
  const sub = document.createElement("div");
  sub.className = "muted";
  const span = weeks.length === 1 ? "" : `${weeks.length} ${/^unit/i.test(weeks[0].name) ? "units" : "weeks"} (${weeks[0].name} to ${weeks[weeks.length - 1].name})  ·  `;
  sub.textContent = `${prep.cls.name}  ·  ${span}${weeks[0].start} → ${weeks[weeks.length - 1].end}`;
  const buttons = document.createElement("div");
  buttons.className = "week-buttons";
  const back = document.createElement("button");
  back.className = "ghost small";
  back.textContent = "← All notes";
  back.addEventListener("click", () => { View.finals = null; App.render(); });
  const print = document.createElement("button");
  print.className = "ghost small";
  print.textContent = "Print";
  print.title = "Prints all three tabs";
  print.addEventListener("click", () => window.print());
  buttons.append(back, print);
  head.append(title, sub, buttons);
  page.append(head);

  // ---- three equal tabs ----
  const counts = { summaries: prep.counts.lessons, study: prep.counts.study, fixes: prep.counts.fixes };
  const tabs = document.createElement("div");
  tabs.className = "final-tabs";
  tabs.setAttribute("role", "tablist");
  for (const [key, label] of FINAL_TABS) {
    const t = document.createElement("button");
    t.className = "panel-tab" + (View.finalsTab === key ? " active" : "");
    t.setAttribute("role", "tab");
    t.setAttribute("aria-selected", String(View.finalsTab === key));
    t.dataset.tab = key;
    t.textContent = `${label} (${counts[key]})`;
    t.addEventListener("click", () => { View.finalsTab = key; App.render(); });
    tabs.append(t);
  }
  page.append(tabs);

  // ---- the three sections (only the chosen one shows; Print shows all) ----
  for (const [key, label] of FINAL_TABS) {
    const section = document.createElement("div");
    section.className = "final-section" + (View.finalsTab === key ? " shown" : "");
    section.dataset.tab = key;
    const printTitle = document.createElement("h3");
    printTitle.className = "print-only";
    printTitle.textContent = label;
    section.append(printTitle);

    let any = false;
    for (const week of weeks) {
      const lessons = week.lessons.filter(l => key === "summaries" || (key === "study" ? l.study.length : l.fixes.length));
      if (!lessons.length) continue;
      any = true;
      const wh = document.createElement("h3");
      wh.className = "final-week";
      wh.textContent = week.name === "Lessons" ? prep.cls.name : `${week.name}  ·  ${week.start} → ${week.end}`;
      section.append(wh);
      for (const l of lessons) section.append(finalLesson(l, key));
    }
    if (!any) {
      const none = document.createElement("p");
      none.className = "muted";
      none.textContent = key === "study"
        ? "No lines in this class are marked for exams (like \"Cheat sheet\" or \"For finals\"). Use the Summaries tab."
        : "No corrections in this class.";
      section.append(none);
    }
    page.append(section);
  }
}

// One lesson on the Final prep page
function finalLesson(l, key) {
  const box = document.createElement("div");
  box.className = "lesson" + (App.progress[l.note.id] ? " reviewed" : "");
  const top = document.createElement("div");
  top.className = "lesson-top";
  const name = document.createElement("div");
  name.className = "lesson-title";
  name.textContent = lessonLabel(l.item, l.note.title);
  top.append(name);
  if (App.progress[l.note.id]) {
    const done = document.createElement("span");
    done.className = "tag done";
    done.textContent = "Reviewed";
    top.append(done);
  }
  if (isGradedReview(l.note)) {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = "Review";
    top.append(tag);
  }
  box.append(top);

  const blocks = key === "summaries" ? [l.summary] : key === "study" ? l.study : l.fixes;
  for (const b of blocks) {
    const div = document.createElement("div");
    div.className = key === "summaries" ? "lesson-summary" : "lesson-summary final-block" + (key === "fixes" ? " fix" : "");
    div.append(key === "summaries" ? document.createTextNode(b) : withCodeBoxes(b));
    box.append(div);
  }

  const more = document.createElement("button");
  more.className = "ghost small no-print";
  more.textContent = "Open full note";
  let full = null;
  more.addEventListener("click", () => {
    const show = !full || full.hidden;
    if (show && !full) { full = noteCard(l.note, { open: true }); box.append(full); }
    if (full) full.hidden = !show;
    more.textContent = show ? "Close full note" : "Open full note";
  });
  box.append(more);
  return box;
}
