// Notes Vault: LOGIC LAYER, loading a notes file into the notes you already have
// Loading a file MERGES it in. It never deletes anything.
// - Same class + topic + same original text already here? Just add the refined version, title and dates.
// - Anything else is added as a new note.
// Your original words are never changed: "text" is only ever copied in, never edited.

// A notes file is either a list of notes, or { app, version, notes: [...] }.
function readNotesFile(fileText) {
  const parsed = JSON.parse(fileText);
  const incoming = Array.isArray(parsed) ? parsed : parsed.notes;
  if (!Array.isArray(incoming)) throw new Error("No notes in this file");
  return incoming;
}

// Changes "existing" in place and reports what happened.
// makeId is passed in so tests can give fixed ids.
// classes (optional): the class records. When given, each incoming note is matched to its class
// by name OR an older name, so a renamed class never gets its notes twice.
function mergeNotes(existing, incoming, makeId = i => `${Date.now()}-${i}`, classes = null, program = "") {
  let added = 0, updated = 0, same = 0;
  for (const raw of incoming) {
    if (typeof raw.text !== "string") continue;
    let n = raw;
    if (classes) {
      const cls = findOrMakeClass(classes, raw.className, program);
      n = { ...raw, classId: cls.id, className: cls.name };
    }
    const match = existing.find(x => (classes ? x.classId === n.classId : x.className === n.className) && x.topic === n.topic && x.text === n.text);
    if (match) {
      let changed = false;
      if (n.refined && n.refined !== match.refined) { match.refined = n.refined; changed = true; }
      if (n.title && n.title !== match.title) { match.title = n.title; changed = true; }
      // corrected dates in the file win (only the date labels change, never your words)
      if (n.date && n.date !== match.date) { match.date = n.date; changed = true; }
      if (n.dateEnd !== undefined && n.dateEnd !== match.dateEnd) { match.dateEnd = n.dateEnd; changed = true; }
      changed ? updated++ : same++;
    } else {
      existing.push({ ...n, id: n.id || makeId(added) });
      added++;
    }
  }
  return { added, updated, same };
}

// The backup file you download: every note, your classes and profile, plus a label saying what made it.
// version 2 = has classes. Older apps and class files (version 1) still load fine.
function makeBackup(notes, classes = [], profile = null, progress = null) {
  return JSON.stringify({ app: "notes-vault", version: 2, savedOn: new Date().toISOString(), profile, classes, progress, notes }, null, 2);
}

// A backup made by this app also carries your checkmarks.
function readBackupProgress(fileText) {
  try { const p = JSON.parse(fileText); return p && p.progress && typeof p.progress === "object" ? p.progress : {}; } catch { return {}; }
}

// A backup made by this app also carries class records (colors, real names, older names).
function readBackupClasses(fileText) {
  try { const p = JSON.parse(fileText); return Array.isArray(p.classes) ? p.classes : []; } catch { return []; }
}

// Newest class first, then lessons in order (1, 2, 3... Final).
function sortNotes(notes) {
  return [...notes].sort((a, b) =>
    b.date.localeCompare(a.date) ||
    a.className.localeCompare(b.className) ||
    (a.order || 0) - (b.order || 0));
}

// In Node (tests), merge.js needs the class helpers too. In the browser they're already loaded.
if (typeof findOrMakeClass === "undefined" && typeof require !== "undefined") {
  var { findOrMakeClass } = require("./classes.js");
}

if (typeof module !== "undefined") module.exports = { readNotesFile, mergeNotes, makeBackup, readBackupClasses, readBackupProgress, sortNotes };
