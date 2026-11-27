// Notes Vault: LOGIC LAYER, classes and the move to data version 2
// Each class now has its own record:
//   { id, code, name, aliases, program, color }
//   id:      never changes ("be104"). Notes point to it with note.classId.
//   code:    the short course code ("BE104"), or "" if the name has none
//   name:    the name shown everywhere. You can rename it any time.
//   aliases: every older name, so loading an old class file still finds the right class
//   program: e.g. "AAS in AI Software Engineering"
//   color:   the class color in the app
// Each note keeps className too, always equal to its class's current name, so search and
// sorting work exactly as before.

const CLASS_COLORS = ["#4f7cff", "#7fd1a0", "#ffb454", "#e57bd6", "#5cc8e0", "#ff8a80",
                      "#b39ddb", "#c5e15c", "#f48fb1", "#80cbc4", "#ffd54a", "#a1887f"];

// "BE104: Securing Your API" → "BE104".  "Motivation Psychology" → ""
function codeFromName(name) {
  const m = (name || "").match(/^\s*([A-Z]{2,5}\s?\d{2,4})\b/);
  return m ? m[1].replace(/\s/, "") : "";
}

// A short id made from the code or the name: "be104", "motivation-psychology".
// "taken" is the set of ids already used, so two classes never share one.
function makeClassId(name, taken) {
  const code = codeFromName(name);
  const base = (code || name || "class").toLowerCase().normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "class";
  let id = base, n = 2;
  while (taken.has(id)) id = `${base}-${n++}`;
  return id;
}

// Find a class by its current name or any older name.
function findClass(classes, name) {
  const key = (name || "").trim().toLowerCase();
  return classes.find(c => c.name.toLowerCase() === key || (c.aliases || []).some(a => a.toLowerCase() === key));
}

// Find the class, or make a new one. Changes "classes" in place when it makes one.
function findOrMakeClass(classes, name, program = "") {
  const clean = (name || "").trim() || "Unsorted";
  const found = findClass(classes, clean);
  if (found) return found;
  const cls = {
    id: makeClassId(clean, new Set(classes.map(c => c.id))),
    code: codeFromName(clean),
    name: clean,
    aliases: [],
    program,
    color: CLASS_COLORS[classes.length % CLASS_COLORS.length],
  };
  classes.push(cls);
  return cls;
}

// Point every note at its class (by id), making classes as needed.
// Used by the move to version 2, and by Load a file / Save all for new notes.
function attachClasses(notes, classes, program = "") {
  for (const n of notes) {
    const cls = findOrMakeClass(classes, n.className, program);
    n.classId = cls.id;
    n.className = cls.name;
  }
}

// The move from data version 1 (notes only) to version 2 (notes + classes).
// Never changes a note's words: it only adds classId. Returns new copies, leaves the input alone.
function migrateToV2(oldNotes, program = "") {
  const notes = oldNotes.map(n => ({ ...n }));
  const classes = [];
  // Oldest class first, so colors and ids come out in the order you took the classes
  const first = {};
  for (const n of notes) if (!first[n.className] || n.date < first[n.className]) first[n.className] = n.date || "";
  const names = Object.keys(first).sort((a, b) => first[a].localeCompare(first[b]) || a.localeCompare(b));
  for (const name of names) findOrMakeClass(classes, name, program);
  attachClasses(notes, classes, program);
  return { notes, classes };
}

// Rename a class: one record changes, its notes follow, and the old name is kept as an alias.
function renameClass(classes, notes, id, newName) {
  const cls = classes.find(c => c.id === id);
  const clean = (newName || "").trim();
  if (!cls || !clean) return false;
  const other = findClass(classes, clean);
  if (other && other.id !== id) return false;   // another class already uses that name
  if (clean !== cls.name) {
    cls.aliases = [...new Set([...(cls.aliases || []), cls.name])].filter(a => a.toLowerCase() !== clean.toLowerCase());
    cls.name = clean;
    cls.code = codeFromName(clean) || cls.code;
  }
  for (const n of notes) if (n.classId === id) n.className = clean;
  return true;
}

// Loading a backup that has class records: keep your classes, add any new ones (with their
// colors and older names), and learn older names for classes you already have.
function mergeClasses(classes, incoming) {
  for (const inc of incoming || []) {
    if (!inc || !inc.name) continue;
    const names = [inc.name, ...(inc.aliases || [])];
    const mine = names.map(nm => findClass(classes, nm)).find(Boolean);
    if (mine) {
      mine.aliases = [...new Set([...(mine.aliases || []), ...names])].filter(a => a.toLowerCase() !== mine.name.toLowerCase());
    } else {
      const taken = new Set(classes.map(c => c.id));
      classes.push({ ...inc, id: taken.has(inc.id) || !inc.id ? makeClassId(inc.name, taken) : inc.id, aliases: inc.aliases || [] });
    }
  }
}

// done / current / upcoming. If you picked one (cls.status), that wins.
// Otherwise it's a guess from the class's note dates and today's date ("YYYY-MM-DD"),
// which can be wrong: a class you're still taking looks "done" if your newest notes are old.
function classStatus(notes, id, todayStr, picked = "") {
  if (picked) return picked;
  const mine = notes.filter(n => n.classId === id);
  if (!mine.length) return "upcoming";
  const start = mine.map(n => n.date).sort()[0];
  const end = mine.map(n => n.dateEnd || n.date).sort().pop();
  return end < todayStr ? "done" : start > todayStr ? "upcoming" : "current";
}

if (typeof module !== "undefined") module.exports = {
  CLASS_COLORS, codeFromName, makeClassId, findClass, findOrMakeClass, attachClasses, migrateToV2, mergeClasses, renameClass, classStatus };
