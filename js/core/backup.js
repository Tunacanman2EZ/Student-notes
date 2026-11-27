// Notes Vault: LOGIC LAYER, backup reminders
// Your notes live in ONE browser. If its data is cleared or the computer dies, they're gone.
// A backup file is the safety net, so the app keeps track of two dates:
//   lastBackupOn: when you last clicked "Download backup"
//   changedOn:    when anything last changed (notes, classes, profile, checkmarks)
// and decides how loudly to remind you.

const BACKUP_STALE_DAYS = 7;   // changes older than this without a backup → the big reminder

function daysBetween(a, b) {
  return Math.floor((new Date(b) - new Date(a)) / 86400000);
}

// level:
//   "none"    no notes yet, nothing to back up
//   "never"   you have notes but never made a backup            → big reminder
//   "stale"   changes since your last backup, and it's 7+ days old → big reminder
//   "changed" changes since your last backup, but it's recent      → small dot on the Backup button
//   "ok"      your last backup has everything
// snoozeUntil: "Remind me tomorrow" hides the big reminder until then (the dot still shows).
function backupStatus({ lastBackupOn = null, changedOn = null, noteCount = 0, now = new Date().toISOString(), snoozeUntil = null }) {
  if (!noteCount) return { level: "none", days: 0, banner: false };
  if (!lastBackupOn) return { level: "never", days: 0, banner: !(snoozeUntil && snoozeUntil > now) };
  const days = daysBetween(lastBackupOn, now);
  if (!changedOn || changedOn <= lastBackupOn) return { level: "ok", days, banner: false };
  const level = days >= BACKUP_STALE_DAYS ? "stale" : "changed";
  return { level, days, banner: level === "stale" && !(snoozeUntil && snoozeUntil > now) };
}

// The words on screen, in plain language.
function backupMessage(status) {
  switch (status.level) {
    case "never": return "You haven't made a backup yet. Your notes only live in this browser; if its data is cleared, they're gone.";
    case "stale": return `Your last backup was ${status.days} days ago, and your notes have changed since then.`;
    case "changed": return `You've made changes since your last backup (${status.days === 0 ? "today" : status.days === 1 ? "yesterday" : status.days + " days ago"}).`;
    case "ok": return `Your last backup has everything (${status.days === 0 ? "made today" : status.days === 1 ? "made yesterday" : "made " + status.days + " days ago"}).`;
    default: return "";
  }
}

if (typeof module !== "undefined") module.exports = { BACKUP_STALE_DAYS, backupStatus, backupMessage };
