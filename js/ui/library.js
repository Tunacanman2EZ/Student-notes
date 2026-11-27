// Notes Vault: SCREEN LAYER, the Library panel
// Every class classmates have shared, straight from the website. Read any lesson, or click
// "Add to my notes" to copy a class into your own app (then Compare works right away).
// The library itself is built from contributions/ (core/library.js); this file only shows it.

async function renderLibraryPanel() {
  const list = $("library-list");
  const msg = $("library-message");
  list.textContent = "Loading the library…";
  const index = await loadLibraryIndex();   // shared with the Compare page (ui/compare.js)
  list.innerHTML = "";

  if (index === null) {
    list.textContent = "The library is on the app's website. Open the app from its website to see it.";
    return;
  }
  if (!index.classes.length) {
    list.textContent = "Nobody has shared a class yet. Be the first: open Share.";
    return;
  }

  for (const entry of index.classes) {
    const mine = App.classes.find(c => sameCourse(c, entry));
    const row = document.createElement("div");
    row.className = "library-class";

    const head = document.createElement("div");
    head.className = "library-head";
    const name = document.createElement("strong");
    name.textContent = entry.name;
    const info = document.createElement("span");
    info.className = "muted";
    info.textContent = `${entry.lessons} lesson${entry.lessons === 1 ? "" : "s"} · shared by ${entry.contributors} student${entry.contributors === 1 ? "" : "s"}`;
    head.append(name, info);

    const buttons = document.createElement("div");
    buttons.className = "library-buttons";
    const read = document.createElement("button");
    read.className = "ghost small";
    read.textContent = "Read";
    const add = document.createElement("button");
    add.className = "small";
    add.textContent = mine ? "Add lessons I'm missing" : "Add to my notes";
    buttons.append(read, add);
    if (mine) {
      const compare = document.createElement("button");
      compare.className = "ghost small";
      compare.textContent = "⇄ Compare";
      compare.addEventListener("click", () => { openPanel(null); openCompare(mine.id); });
      buttons.append(compare);
    }

    const lessons = document.createElement("div");
    lessons.className = "library-lessons";
    lessons.hidden = true;

    read.addEventListener("click", async () => {
      if (!lessons.hidden) { lessons.hidden = true; read.textContent = "Read"; return; }
      lessons.hidden = false; read.textContent = "Hide";
      if (lessons.childElementCount) return;   // already drawn
      lessons.textContent = "Loading…";
      const cls = await loadLibraryClass(entry);
      lessons.innerHTML = "";
      if (!cls) { lessons.textContent = "This class couldn't be loaded. Try again later."; return; }
      for (const l of cls.lessons) lessons.append(libraryLesson(l));
    });

    add.addEventListener("click", async () => {
      add.disabled = true;
      const cls = await loadLibraryClass(entry);
      if (!cls) { showMessage(msg, "This class couldn't be loaded. Try again later.", "bad"); add.disabled = false; return; }
      const before = structuredClone({ notes: App.notes, classes: App.classes });
      // Already have this class? Only the lessons you're missing (your own notes are never doubled up).
      const mineNow = App.classes.find(c => sameCourse(c, entry));
      const incoming = mineNow ? libraryNotesToAdd(libraryClassToNotes(cls), App.notes.filter(n => n.classId === mineNow.id))
                               : libraryClassToNotes(cls);
      if (!incoming.length) { showMessage(msg, `${entry.name}: you already have every lesson.`, "ok"); add.disabled = false; return; }
      const { added, updated, same } = mergeNotes(App.notes, incoming, undefined, App.classes, App.profile.program);
      if (!(await saveData({ notes: App.notes, classes: App.classes }))) {
        App.notes = before.notes; App.classes = before.classes;
        showMessage(msg, "Could not save. Nothing changed.", "bad");
        add.disabled = false;
        return;
      }
      App.render();
      renderLibraryPanel();
      showMessage(msg, `${entry.name}: ${added} added, ${updated} updated, ${same} already here. Open it in the sidebar, or click ⇄ Compare.`, "ok");
    });

    row.append(head, buttons, lessons);
    list.append(row);
  }
}

// One lesson in "Read": its title, then each student's version.
function libraryLesson(l) {
  const box = document.createElement("details");
  box.className = "library-lesson";
  const sum = document.createElement("summary");
  sum.textContent = `${l.topic}${l.title ? " · " + l.title : ""}`;
  box.append(sum);
  box.addEventListener("toggle", () => {
    if (!box.open || box.childElementCount > 1) return;   // drawn on first open
    for (const v of l.versions) {
      const by = document.createElement("p");
      by.className = "muted library-by";
      by.textContent = `Shared by ${v.contributor.displayName}`;
      const body = document.createElement("div");
      body.className = "note-text refined";
      body.append(withCodeBoxes(v.refined));
      box.append(by, body);
    }
  }, { once: false });
  return box;
}
