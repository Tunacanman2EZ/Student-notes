// Notes Vault: SCREEN LAYER, the sidebar (Browse by class and week)
// Every class is a dropdown: click it to see its weeks (or units). Click a week to open the Week page.
// Each class and week shows how many lessons you've marked reviewed, like "6/10".
// On a phone-sized screen the sidebar folds up under a "Browse" button.

function setUpSidebar() {
  $("browse-toggle").addEventListener("click", () => {
    const box = $("sidebar");
    box.classList.toggle("collapsed");
    $("browse-toggle").setAttribute("aria-expanded", String(!box.classList.contains("collapsed")));
  });
  if (window.matchMedia("(max-width: 900px)").matches) $("sidebar").classList.add("collapsed");
}

function renderSidebar() {
  const nav = $("sidebar-tree");
  nav.innerHTML = "";
  const tree = buildTree(App.notes, App.classes);
  if (!tree.length) {
    nav.innerHTML = '<p class="muted">Your classes will show up here.</p>';
    return;
  }
  for (const { cls, groups } of tree) {
    const all = groups.flatMap(g => g.notes);
    const p = progressOf(all, App.progress);

    const box = document.createElement("details");
    box.className = "side-class";
    box.style.setProperty("--class-color", cls.color);
    box.open = View.openClasses.has(cls.id) || (View.week && View.week.classId === cls.id) || View.finals === cls.id || (View.compare && View.compare.classId === cls.id);
    box.addEventListener("toggle", () => { box.open ? View.openClasses.add(cls.id) : View.openClasses.delete(cls.id); });

    const sum = document.createElement("summary");
    const name = document.createElement("span");
    name.className = "side-name";
    name.textContent = cls.name;
    name.title = cls.name;
    const count = document.createElement("span");
    count.className = "side-count" + (p.done === p.total && p.total ? " all-done" : "");
    count.textContent = `${p.done}/${p.total}`;
    count.title = `${p.done} of ${p.total} lessons reviewed`;
    sum.append(name, count);
    box.append(sum);

    // Final prep: the whole course at once (first in the list)
    const prepBtn = document.createElement("button");
    prepBtn.className = "side-week side-final";
    if (View.finals === cls.id) prepBtn.classList.add("current");
    const pl = document.createElement("span");
    pl.textContent = "★ Final prep";
    prepBtn.append(pl);
    prepBtn.addEventListener("click", () => openFinals(cls.id));
    // Compare: your notes next to classmates' (second in the list)
    const cmpBtn = document.createElement("button");
    cmpBtn.className = "side-week side-compare";
    if (View.compare && View.compare.classId === cls.id) cmpBtn.classList.add("current");
    const cl = document.createElement("span");
    cl.textContent = "⇄ Compare";
    cmpBtn.append(cl);
    cmpBtn.addEventListener("click", () => openCompare(cls.id));
    box.append(prepBtn, cmpBtn);

    for (const g of groups) {
      const gp = progressOf(g.notes, App.progress);
      const btn = document.createElement("button");
      btn.className = "side-week";
      if (View.week && View.week.classId === cls.id && View.week.group === g.name) btn.classList.add("current");
      const label = document.createElement("span");
      label.textContent = g.name;
      const c = document.createElement("span");
      c.className = "side-count" + (gp.done === gp.total ? " all-done" : "");
      c.textContent = `${gp.done}/${gp.total}`;
      btn.append(label, c);
      btn.addEventListener("click", () => openWeek(cls.id, g.name));
      box.append(btn);
    }
    nav.append(box);
  }
}

function openWeek(classId, group) {
  View.week = { classId, group };
  View.finals = null;
  View.compare = null;
  View.query = ""; $("search").value = "";
  if (window.matchMedia("(max-width: 900px)").matches) $("sidebar").classList.add("collapsed");
  App.render();
  window.scrollTo({ top: 0 });
}
