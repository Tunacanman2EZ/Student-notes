// Notes Vault: DATA LAYER
// This is the ONLY file that reads or saves your data. Every other file asks this one.
//
// What's saved (each is one record in the browser's database, IndexedDB):
//   notes:   every note
//   classes: one record per class (id, code, name, older names, program, color)   (data version 2)
//   profile: your display name and program                                         (data version 2)
//   progress: which lessons you've marked reviewed, { noteId: "2026-11-26" }. Kept apart from the
//            notes on purpose: sharing notes later can never carry your personal progress.
//   info:    facts about the data: its version, and when each move happened
//   backup:  when you last downloaded a backup, and how many notes it held   (for backup reminders)
//   changed: when anything last changed (written automatically with every save)
//   classmates: share files you loaded to compare with. Kept apart from your notes, never mixed in,
//            and left out of your backups (they're other people's notes).
//
// Saving is one "transaction": everything in a save is written, or nothing is.
// A failed save can never leave half your notes behind.
//
// Data versions, and the moves between them (each runs once, and is checked before it's trusted):
//   0 → 1  notes move from localStorage into IndexedDB (the old copy is left untouched)
//   1 → 2  every class gets its own record, and every note gets a classId. Your words never change.
// "info" only gets the new version number AFTER the move is checked. A move that breaks halfway
// is never trusted, and simply runs again next time.
//
// If a browser has no IndexedDB, everything is kept in localStorage instead, like before.
// Loading and saving take a moment, so they return a Promise; callers "await" them.

const STORAGE_KEY = "notesVault.notes";   // the old localStorage spot (and the fallback)
const LS_CLASSES = "notesVault.classes", LS_PROFILE = "notesVault.profile", LS_PROGRESS = "notesVault.progress";
const DB_NAME = "notesVault";
const DB_VERSION = 1;                     // the database's own layout (one table), not the note format
const STORE = "data";
const DATA_VERSION = 2;                   // the note format this app writes

const Store = { kind: "unknown", movedFromLocalStorage: 0, movedToV2: 0, warning: "",
                lastBackupOn: null, changedOn: null };   // the two dates for backup reminders   // shown on screen

function newProfile() {
  const id = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID()
    : "u-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  return { id, displayName: "", program: "" };   // id is random: your name is NOT your id
}

// ---------- localStorage (the old way, and the fallback) ----------
function lsGet(key, empty) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : empty; }
  catch (err) { console.error("Could not load", key, err); return empty; }
}
function lsSet(parts) {
  try {
    // notes → "notesVault.notes", classes → "notesVault.classes", and so on
    for (const [key, value] of Object.entries(parts)) localStorage.setItem(`notesVault.${key}`, JSON.stringify(value));
    return true;
  } catch (err) { console.error("Could not save:", err); return false; }
}
function loadFromLocalStorage() { return lsGet(STORAGE_KEY, []); }

// ---------- IndexedDB helpers: turn its "requests" into Promises ----------
function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);   // first run: make the table
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function dbGet(db, key) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
// Writes several records in ONE transaction: all of them are saved, or none are.
function dbPutAll(db, records) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    for (const [key, value] of Object.entries(records)) tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("save cancelled"));
  });
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
let db = null;

// The 1 → 2 check: same number of notes, same order, and every note's words exactly the same.
function v2Checks(oldNotes, notes, classes) {
  return notes.length === oldNotes.length &&
    notes.every((n, i) => n.text === oldNotes[i].text && n.id === oldNotes[i].id && n.classId) &&
    notes.every(n => classes.some(c => c.id === n.classId));
}

// ---------- what the rest of the app uses ----------
async function loadData() {
  try {
    if (typeof indexedDB === "undefined") throw new Error("no IndexedDB in this browser");
    db = await openDb();
    let notes = await dbGet(db, "notes");
    let info = await dbGet(db, "info");

    // Move 0 → 1: notes come over from localStorage.
    if (!notes || !info) {
      const old = loadFromLocalStorage();
      await dbPutAll(db, { notes: old });
      const copy = await dbGet(db, "notes");
      if (!same(copy, old)) throw new Error("copy check failed");
      info = { dataVersion: 1, movedFromLocalStorage: old.length, movedOn: new Date().toISOString() };
      await dbPutAll(db, { info });
      notes = copy;
    }
    Store.movedFromLocalStorage = info.movedFromLocalStorage || 0;

    // Move 1 → 2: classes get their own records.
    let classes = await dbGet(db, "classes");
    let profile = await dbGet(db, "profile");
    if ((info.dataVersion || 1) < 2) {
      profile = profile || newProfile();
      const moved = migrateToV2(notes, profile.program);
      try {
        if (!v2Checks(notes, moved.notes, moved.classes)) throw new Error("version 2 check failed");
        await dbPutAll(db, { notes: moved.notes, classes: moved.classes, profile });
        const back = await dbGet(db, "notes");
        if (!same(back, moved.notes)) throw new Error("version 2 copy check failed");
        info = { ...info, dataVersion: 2, movedToV2: moved.notes.length, movedToV2On: new Date().toISOString() };
        await dbPutAll(db, { info });   // only now is the move trusted
        Store.movedToV2 = moved.notes.length;
      } catch (err) {
        // The database still works, so keep using it (it's newer than the old localStorage copy).
        // The move isn't marked done, so it runs again next time. Your words are the same either way.
        console.error("Class move will retry next time:", err);
        Store.warning = "Your classes couldn't be set up this time. Nothing was lost; the app will try again next time.";
      }
      notes = moved.notes; classes = moved.classes;
    }
    Store.kind = "IndexedDB";
    const progress = (await dbGet(db, "progress")) || {};
    const backup = (await dbGet(db, "backup")) || null;
    const changed = (await dbGet(db, "changed")) || null;
    Store.lastBackupOn = backup && backup.on; Store.changedOn = changed && changed.on;
    const classmates = (await dbGet(db, "classmates")) || [];
    return { notes, classes: classes || [], profile: profile || newProfile(), progress, backup, changed, classmates };
  } catch (err) {
    // Anything goes wrong: keep using localStorage. Nothing is lost.
    console.error("Using localStorage instead of IndexedDB:", err);
    db = null;
    Store.kind = "localStorage";
    let notes = loadFromLocalStorage();
    let classes = lsGet(LS_CLASSES, null);
    const profile = lsGet(LS_PROFILE, null) || newProfile();
    if (!classes || notes.some(n => !n.classId)) {
      const moved = migrateToV2(notes, profile.program);
      if (v2Checks(notes, moved.notes, moved.classes)) { notes = moved.notes; classes = moved.classes; }
      else classes = classes || [];
    }
    const backup = lsGet("notesVault.backup", null), changed = lsGet("notesVault.changed", null);
    Store.lastBackupOn = backup && backup.on; Store.changedOn = changed && changed.on;
    return { notes, classes, profile, progress: lsGet(LS_PROGRESS, {}), backup, changed, classmates: lsGet("notesVault.classmates", []) };
  }
}

// Save any of { notes, classes, profile, progress } together, in one all-or-nothing write.
// Saving your data also records WHEN it changed (for backup reminders), in the same write.
async function saveData(parts) {
  if (["notes", "classes", "profile", "progress"].some(k => k in parts)) {
    parts = { ...parts, changed: { on: new Date().toISOString() } };
  }
  let ok;
  if (!db) ok = lsSet(parts);
  else {
    try { ok = await dbPutAll(db, parts); }
    catch (err) { console.error("Could not save:", err); ok = false; }
  }
  if (ok && parts.changed) Store.changedOn = parts.changed.on;
  return ok;
}

// "Download backup" was clicked: remember when, and how many notes it held.
async function recordBackup(noteCount) {
  const backup = { on: new Date().toISOString(), notes: noteCount };
  const ok = await saveData({ backup });
  if (ok) Store.lastBackupOn = backup.on;
  return ok;
}

// Ask the browser to keep this data even when the disk gets full (it may say no; that's fine).
async function askToKeepData() {
  try { return navigator.storage && navigator.storage.persist ? await navigator.storage.persist() : false; }
  catch { return false; }
}

// How much space the notes use, in MB, for the line under "Backup".
function notesSizeMB(list) {
  return (new Blob([JSON.stringify(list)]).size / 1e6).toFixed(1);
}

// ---------- small screen settings (which class you had picked) ----------
// These are tiny and not your notes, so localStorage is fine for them.
const PREFS_KEY = "notesVault.prefs";
function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch { return {}; }
}
function savePrefs(changes) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify({ ...loadPrefs(), ...changes })); } catch { /* not important */ }
}
