# Step 2G: Backup reminders (and restore)

## Why
Your notes live in ONE browser. If its data is cleared, or the computer dies, they're gone,
along with your classes and checkmarks. A backup file is the safety net, but only if you actually make one.
So the app now keeps track and reminds you.

## What you see
- **A banner at the top** (amber) when it really matters:
  - you have notes but have **never** made a backup, or
  - your notes **changed** since your last backup, and that backup is **7 or more days** old.

  It has two buttons: **Download backup now** and **Remind me tomorrow**.
- **A small amber dot** on the Backup button whenever something changed since your last backup.
- **In the Backup panel:** a line like "Your last backup has everything (made today)", plus how to restore.
- **The backup file name** says the date and how many notes it holds: `notes-vault-backup-2026-11-26-563-notes.json`.

## How it decides (js/core/backup.js, tested)
The app keeps two dates:
- **lastBackupOn**: when you last clicked Download backup
- **changedOn**: when anything last changed (notes, classes, profile, checkmarks). This is written
  automatically, in the same all-or-nothing save as the change itself, so it can't get out of step.

| Situation | Reminder |
|---|---|
| no notes yet | nothing |
| notes, never backed up | banner + dot |
| backup has everything (even if it's old) | nothing |
| changed since the backup, backup under 7 days old | dot only |
| changed since the backup, backup 7+ days old | banner + dot |

"Remind me tomorrow" hides the banner for 24 hours. The dot still shows.

## Backups now hold everything
Notes, classes (colors, real names, older names), profile, **and your checkmarks**.

**To restore** (new computer, cleared browser): open the app, click **Load a file**, pick your backup.
Your notes, classes and checkmarks come back. If both the app and the file have a checkmark for the same lesson,
yours stays. Checkmarks are only added for notes that are really there.

## Tests
- `node tests/run.js`: **144 checks** (8 new for reminders).
- `python tests/browser_backup_test.py`: **17 checks**:
  - no reminder with no notes
  - banner + dot when you've never backed up
  - backing up clears both, and the file name is right
  - a checkmark brings the dot but not the banner
  - a 7+ day old backup brings the banner back
  - Remind me tomorrow survives a reload
  - restoring into a brand-new browser brings back all 563 notes, all classes and the checkmark

Two bugs the tests caught, both fixed:
- The banner showed even when it was supposed to be hidden: my `display: flex` style overrode "hidden".
- My first restore test proved nothing: the backup was made before any lesson was ticked, so there were no
  checkmarks to restore. It now ticks a lesson, backs up, restores, and checks the checkmark is there.

All the other browser suites still pass: storage 14, search 23, classes 22, week 21, final prep 18.
