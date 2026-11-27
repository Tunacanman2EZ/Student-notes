// Notes Vault: LOGIC LAYER, the shared library
// Turns the share files in contributions/ into one tidy library:
//   class → lesson → versions (one per classmate)
// The same lesson from five classmates is ONE lesson with five versions, not five copies.
// If one classmate shares the same lesson again, their newest version replaces the old one.
// Files that fail the safety check (core/share.js) are left out.

// A class's key in the library: its code ("demo101"), or its name made safe ("study-skills").
function libraryClassKey(cls) {
  const base = (cls.code || cls.name || "class").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return base.slice(0, 50) || "class";
}

function buildLibrary(contributions) {
  const classes = {};   // key → { key, code, name, lessons: { topic → lesson } }
  const skipped = [];
  for (const c of contributions) {
    const problems = validateContribution(c.file);
    if (problems.length) { skipped.push({ name: c.name, problems }); continue; }
    const f = c.file;
    const key = libraryClassKey(f.class);
    const cls = classes[key] || (classes[key] = { key, code: f.class.code || "", name: f.class.name, lessons: {} });
    for (const l of f.lessons) {
      const lesson = cls.lessons[l.topic] || (cls.lessons[l.topic] = {
        topic: l.topic, group: l.group, item: l.item, title: l.title, order: l.order,
        date: l.date || "", dateEnd: l.dateEnd || null, versions: [] });
      if (!lesson.title && l.title) lesson.title = l.title;
      const version = {
        contributor: f.contributor, program: f.program || "", sharedOn: f.createdOn,
        title: l.title, refined: l.refined, original: l.original || "",
      };
      const same = lesson.versions.findIndex(v => v.contributor.id === f.contributor.id);
      if (same === -1) lesson.versions.push(version);
      else if (version.sharedOn >= lesson.versions[same].sharedOn) lesson.versions[same] = version;   // newest wins
    }
  }
  // Tidy order: lessons by course order; versions by name, so the list never jumps around
  const out = {};
  for (const [key, cls] of Object.entries(classes)) {
    const lessons = Object.values(cls.lessons).sort((a, b) => (a.order || 0) - (b.order || 0));
    for (const l of lessons) l.versions.sort((a, b) => a.contributor.displayName.localeCompare(b.contributor.displayName));
    out[key] = { key, code: cls.code, name: cls.name, lessons };
  }
  const index = Object.values(out).map(c => ({
    key: c.key, code: c.code, name: c.name, lessons: c.lessons.length,
    contributors: new Set(c.lessons.flatMap(l => l.versions.map(v => v.contributor.id))).size,
    file: `library/${c.key}.json`,
  })).sort((a, b) => a.name.localeCompare(b.name));
  return { index: { app: "notes-vault", kind: "library", builtOn: new Date().toISOString(), classes: index }, classes: out, skipped };
}

// Put two library versions of the same class together (the website's library + files you loaded):
// lessons are matched by topic, versions by classmate, and the newest version of each classmate wins.
function combineLibraryClasses(...list) {
  const parts = list.filter(Boolean);
  if (!parts.length) return null;
  const lessons = new Map();
  for (const c of parts) for (const l of c.lessons) {
    const into = lessons.get(l.topic) || { ...l, versions: [] };
    if (!into.title && l.title) into.title = l.title;
    for (const v of l.versions) {
      const i = into.versions.findIndex(x => x.contributor.id === v.contributor.id);
      if (i === -1) into.versions.push(v);
      else if (v.sharedOn >= into.versions[i].sharedOn) into.versions[i] = v;
    }
    lessons.set(l.topic, into);
  }
  const all = [...lessons.values()].sort((a, b) => (a.order || 0) - (b.order || 0));
  for (const l of all) l.versions.sort((a, b) => a.contributor.displayName.localeCompare(b.contributor.displayName));
  return { key: parts[0].key, code: parts[0].code, name: parts[0].name, lessons: all };
}

if (typeof validateContribution === "undefined" && typeof require !== "undefined") {
  var { validateContribution } = require("./share.js");
}

// The newest version of a lesson (when several classmates shared it).
function newestVersion(lesson) {
  return lesson.versions.reduce((a, b) => ((b.sharedOn || "") > (a.sharedOn || "") ? b : a));
}

// "Add to my notes": turn a library class into notes for your own app.
// One note per lesson, from the newest version. Each note remembers who shared it (fromLibrary),
// so the Share page never shares someone else's notes as yours.
// The id is fixed per class + lesson, so adding the same class again updates instead of copying.
function libraryClassToNotes(libClass, now = new Date().toISOString()) {
  const slug = s => (s || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return libClass.lessons.filter(l => l.versions.length).map(l => {
    const v = newestVersion(l);
    return {
      id: `lib-${libClass.key}-${slug(l.topic)}`,
      className: libClass.name, topic: l.topic, title: v.title || l.title || "", order: l.order || 0,
      date: l.date || "", dateEnd: l.dateEnd || null,
      text: v.original || v.refined, refined: v.refined, addedOn: now,
      fromLibrary: { id: v.contributor.id, displayName: v.contributor.displayName, sharedOn: v.sharedOn || "" },
    };
  });
}

// If you already have the class, only add what you're missing: lessons you have no notes for,
// plus updates to library notes you added before. Your own notes are never doubled up.
// myClassNotes: your notes for this class.
function libraryNotesToAdd(libNotes, myClassNotes) {
  const ownTopics = new Set(myClassNotes.filter(n => !n.fromLibrary).map(n => n.topic));
  return libNotes.filter(n => !ownTopics.has(n.topic));
}

if (typeof module !== "undefined") module.exports = { libraryClassKey, buildLibrary, combineLibraryClasses, newestVersion, libraryClassToNotes, libraryNotesToAdd };
