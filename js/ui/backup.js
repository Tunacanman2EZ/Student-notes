// Notes Vault: SCREEN LAYER, the Backup box
// "Download backup" saves every note to a file. "Load a file" merges a notes file in
// (a backup, or a class Claude refined). The merging rules live in core/merge.js.

function setUpBackup() {
  const msg = $("backup-message");
  showStorageInfo();

  $("export-btn").addEventListener("click", downloadBackup);
  $("banner-backup").addEventListener("click", downloadBackup);
  $("banner-later").addEventListener("click", () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    savePrefs({ backupSnoozeUntil: tomorrow });
    showBackupReminder();
  });

  $("import-file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const fileText = await file.text();
      const incoming = readNotesFile(fileText);
      const before = structuredClone({ notes: App.notes, classes: App.classes, progress: App.progress });   // a copy, in case saving fails
      mergeClasses(App.classes, readBackupClasses(fileText));   // a backup brings its class colors and older names
      const { added, updated, same } = mergeNotes(App.notes, incoming, undefined, App.classes, App.profile.program);
      // ...and its checkmarks (yours win if both have one); only for notes that are really here
      const ids = new Set(App.notes.map(n => n.id));
      for (const [id, on] of Object.entries(readBackupProgress(fileText))) if (ids.has(id) && !App.progress[id]) App.progress[id] = on;
      if (!(await saveData({ notes: App.notes, classes: App.classes, progress: App.progress }))) {
        App.notes = before.notes; App.classes = before.classes; App.progress = before.progress;   // put things back, so the screen matches what's really saved
        showMessage(msg, "Could not save the loaded notes. Nothing changed.", "bad");
        e.target.value = "";
        return;
      }
      App.render();
      showMessage(msg, `Loaded: ${added} new, ${updated} updated, ${same} already here.`, "ok");
    } catch (err) {
      console.error(err);
      showMessage(msg, "That file couldn't be read as a notes file.", "bad");
    }
    e.target.value = "";
  });
}

// The small line under the Backup buttons: where your notes are kept and how much space they use.
function showStorageInfo() {
  const where = Store.kind === "IndexedDB" ? "this browser's database (IndexedDB)" : "this browser's small storage (localStorage)";
  const moved = Store.movedFromLocalStorage ? ` ${Store.movedFromLocalStorage} notes were moved over from the old storage.` : "";
  $("storage-info").textContent = `Your notes are kept in ${where}, ${notesSizeMB(App.notes)} MB.${moved} ${Store.warning}`.trim();
}

// Download every note, class, profile and checkmark to one file, and remember that you did.
async function downloadBackup() {
  const blob = new Blob([makeBackup(App.notes, App.classes, App.profile, App.progress)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `notes-vault-backup-${today()}-${App.notes.length}-notes.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  await recordBackup(App.notes.length);
  showMessage($("backup-message"), `Downloaded ${App.notes.length} notes. Keep the file somewhere safe, like a USB stick or cloud drive.`, "ok");
  showBackupReminder();
}

// The reminder: a banner at the top when it really matters, a small dot on the Backup button otherwise.
function showBackupReminder() {
  const status = backupStatus({
    lastBackupOn: Store.lastBackupOn, changedOn: Store.changedOn, noteCount: App.notes.length,
    now: new Date().toISOString(), snoozeUntil: loadPrefs().backupSnoozeUntil || null,
  });
  $("backup-banner").hidden = !status.banner;
  $("banner-text").textContent = backupMessage(status);
  $("backup-dot").hidden = !["never", "stale", "changed"].includes(status.level);
  $("backup-status").textContent = backupMessage(status);
  $("backup-status").className = status.level === "ok" ? "ok" : "muted";
}
