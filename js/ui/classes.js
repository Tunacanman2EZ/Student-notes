// Notes Vault: SCREEN LAYER, the "Profile & classes" panel
// Profile: your display name (a nickname that labels anything you share later) and your program.
// Classes: every class with its color, code, name (click to rename), dates, note count and status.
// Renaming changes ONE class record; its notes follow, and the old name is remembered,
// so loading an old class file later still finds the right class (no doubles).

function setUpClassesPanel() {
  const nameBox = $("profile-name"), programBox = $("profile-program");
  nameBox.value = App.profile.displayName || "";
  programBox.value = App.profile.program || "";

  $("profile-save").addEventListener("click", async () => {
    const before = structuredClone({ profile: App.profile, classes: App.classes });
    App.profile.displayName = nameBox.value.trim().slice(0, 40);
    App.profile.program = programBox.value.trim().slice(0, 80);
    // Classes without a program get yours
    for (const c of App.classes) if (!c.program) c.program = App.profile.program;
    if (await saveData({ profile: App.profile, classes: App.classes })) {
      showMessage($("profile-message"), "Saved.", "ok");
      App.render();
    } else {
      App.profile = before.profile; App.classes = before.classes;
      showMessage($("profile-message"), "Could not save. Nothing changed.", "bad");
    }
  });
}

function renderClassesPanel() {
  const table = $("class-table");
  table.innerHTML = "";
  const counts = {};
  for (const n of App.notes) counts[n.classId] = (counts[n.classId] || 0) + 1;
  const now = today();
  const range = id => {
    const mine = App.notes.filter(n => n.classId === id);
    if (!mine.length) return "";
    return `${mine.map(n => n.date).sort()[0]} → ${mine.map(n => n.dateEnd || n.date).sort().pop()}`;
  };
  // Newest class first, like the notes list
  const order = [...App.classes].sort((a, b) => range(b.id).localeCompare(range(a.id)));

  for (const cls of order) {
    const row = document.createElement("div");
    row.className = "class-row";

    const color = document.createElement("input");
    color.type = "color";
    color.value = cls.color;
    color.title = "Class color";
    color.addEventListener("change", async () => {
      const old = cls.color;
      cls.color = color.value;
      if (await saveData({ classes: App.classes })) App.render();
      else { cls.color = old; color.value = old; }
    });

    const name = document.createElement("input");
    name.className = "class-name";
    name.value = cls.name;
    name.title = "Click to rename. Press Enter to save.";
    name.setAttribute("aria-label", `Name of ${cls.name}`);
    const rename = async () => {
      const newName = name.value.trim();
      if (!newName || newName === cls.name) { name.value = cls.name; return; }
      const before = structuredClone({ notes: App.notes, classes: App.classes });
      if (!renameClass(App.classes, App.notes, cls.id, newName)) {
        name.value = cls.name;
        showMessage($("profile-message"), `"${newName}" is already another class's name.`, "bad");
        return;
      }
      if (await saveData({ notes: App.notes, classes: App.classes })) {
        showMessage($("profile-message"), `Renamed. Its ${counts[cls.id] || 0} notes followed.`, "ok");
        App.render();
      } else {
        App.notes = before.notes; App.classes = before.classes;
        showMessage($("profile-message"), "Could not save the new name. Nothing changed.", "bad");
        App.render();
      }
    };
    name.addEventListener("keydown", e => { if (e.key === "Enter") name.blur(); if (e.key === "Escape") { name.value = cls.name; name.blur(); } });
    name.addEventListener("blur", rename);

    const info = document.createElement("div");
    info.className = "class-info muted";
    info.textContent = [cls.code, `${counts[cls.id] || 0} notes`, range(cls.id)].filter(Boolean).join("  ·  ");
    if (cls.aliases && cls.aliases.length) info.title = "Also known as: " + cls.aliases.join(", ");

    // Status: pick one, or leave it on "auto" (a guess from the dates)
    const status = document.createElement("select");
    status.className = "class-status";
    status.setAttribute("aria-label", `Status of ${cls.name}`);
    const guess = classStatus(App.notes, cls.id, now);
    for (const [value, label] of [["", `auto: ${guess}`], ["current", "current"], ["done", "done"], ["upcoming", "upcoming"]]) {
      const o = document.createElement("option");
      o.value = value; o.textContent = label;
      status.append(o);
    }
    status.value = cls.status || "";
    status.addEventListener("change", async () => {
      const old = cls.status || "";
      cls.status = status.value;
      if (!(await saveData({ classes: App.classes }))) { cls.status = old; status.value = old; }
    });

    const left = document.createElement("div");
    left.className = "class-text";
    left.append(name, info);
    row.append(color, left, status);
    table.append(row);
  }
  $("class-total").textContent = App.classes.length;
}

// The color of a note's class (for the stripe on each card)
function classColor(note) {
  const cls = App.classes.find(c => c.id === note.classId);
  return cls ? cls.color : "#3a3f4b";
}
