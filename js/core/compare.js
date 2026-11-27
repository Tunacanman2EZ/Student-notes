// Notes Vault: LOGIC LAYER, comparing your notes with classmates'
// For one of your classes, finds the same class in the library (by code, name or older name),
// lines up every lesson (yours and theirs), and for any lesson shows what's in a classmate's
// version that isn't in yours ("What's new to you").

// Is this library class the same course as one of yours?
function sameCourse(cls, libClass) {
  if (cls.code && libClass.code && cls.code.toLowerCase() === libClass.code.toLowerCase()) return true;
  const names = [cls.name, ...(cls.aliases || [])].map(n => n.toLowerCase());
  return names.includes((libClass.name || "").toLowerCase());
}

// Every lesson of the course, yours and the library's, in course order:
//   { topic, group, item, title, mine: note|null, myExtras: [notes], versions: [...], youShared }
// One lesson can hold several of your notes (the lesson notes plus a lesson chat). The MAIN one
// (lowest order, so the lesson itself, not the chat at x.5) gives the title and the left column;
// the others are kept in myExtras, and "What's new" checks against all of them.
// myId: your profile id. Your own shared copy isn't a classmate, so it's left out of versions
// and noted as youShared instead.
function compareRows(myNotes, cls, libClass, myId) {
  const rows = new Map();
  const mine = myNotes.filter(x => x.classId === cls.id).sort((a, b) => (a.order || 0) - (b.order || 0));
  for (const n of mine) {
    const row = rows.get(n.topic);
    if (row) { row.myExtras.push(n); continue; }
    const { group, item } = splitTopic(n.topic);
    rows.set(n.topic, { topic: n.topic, group, item, title: n.title, order: n.order || 0, mine: n, myExtras: [], versions: [], youShared: false });
  }
  for (const l of (libClass && libClass.lessons) || []) {
    const row = rows.get(l.topic) || { topic: l.topic, group: l.group, item: l.item, title: l.title, order: l.order || 0, mine: null, myExtras: [], versions: [], youShared: false };
    if (!row.title && l.title) row.title = l.title;
    row.versions = l.versions.filter(v => !myId || v.contributor.id !== myId);
    row.youShared = l.versions.length > row.versions.length;
    rows.set(l.topic, row);
  }
  return [...rows.values()].sort((a, b) => a.order - b.order || a.topic.localeCompare(b.topic, undefined, { numeric: true }));
}

// Everything you have for one lesson, as one text (for "What's new to you").
function myTextFor(row) {
  return [row.mine, ...(row.myExtras || [])].filter(Boolean).map(n => n.refined || n.text || "").join("\n");
}

// Lessons a classmate shared that you don't have at all (the missing-lessons map).
function missingLessons(rows) {
  return rows.filter(r => !r.mine && r.versions.length);
}

// "What's new to you": lines in their version that aren't anywhere in yours.
// Compares loosely (capital letters, spaces and punctuation don't matter) and skips tiny lines,
// section labels and code-box marks, so you only see real new content.
function normLine(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function whatsNew(myText, theirText, max = 60) {
  const mine = new Set((myText || "").split("\n").map(normLine).filter(Boolean));
  const mineAll = normLine(myText || "");
  const out = [];
  for (const line of (theirText || "").split("\n")) {
    const t = line.trim();
    if (t.length < 12 || t.startsWith("```") || /^IN PLAIN WORDS$|^—+ YOUR NOTES/.test(t)) continue;
    const n = normLine(t);
    if (!n || mine.has(n) || mineAll.includes(n)) continue;
    out.push(t);
    if (out.length >= max) { out.push("…  (see their full version)"); break; }
  }
  return out;
}

if (typeof splitTopic === "undefined" && typeof require !== "undefined") {
  var { splitTopic } = require("./study.js");
}

if (typeof module !== "undefined") module.exports = { sameCourse, compareRows, myTextFor, missingLessons, whatsNew };
