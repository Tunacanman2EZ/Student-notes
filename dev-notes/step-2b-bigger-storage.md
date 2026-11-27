# Step 2B: Bigger storage (IndexedDB)

## The problem
Notes were saved in **localStorage**, a small storage space the browser keeps for each page.
It holds about **5 MB**. Your 25 classes already used **3.4 MB**, so a few more classes and saving would
start failing. I tested it: about 14 MB of notes gives the error **QuotaExceededError** ("storage full").

## The fix
Notes now live in **IndexedDB**, a real database built into every modern browser. It holds hundreds of MB.
It still lives in YOUR browser only. Nothing is sent anywhere, and you still double-click `index.html` to open it.

Only one file changed how saving works: `js/data/store.js`. That's the payoff from Step 2A,
where we made it the only file that touches storage.

## How it works, in plain words
- **One record.** All your notes are saved together as one record called `notes`.
  That way, if two notes ever had the same id (say, from another student's file), one can never overwrite the other.
- **All or nothing.** Every save is one *transaction*: it either fully works or fully doesn't.
  A failed save can never leave you with half your notes. The old notes stay until the new ones are safely written.
- **Promises and await.** A database takes a moment to answer, so `loadNotes()` and `saveNotes()` give back a
  *Promise*, a "this will finish soon" ticket. The code uses `await` to wait for it before moving on.
  That's why the app now starts with `start()` in `main.js`: it waits for your notes before drawing the page.
- **If saving fails, the screen tells the truth.** When a save fails, Loading a file, Save all and Delete
  put things back the way they were, so the screen never shows notes that aren't really saved.
- **Keep my data.** The app asks the browser to keep this data even when the disk gets full.
  The browser may say no, and that's fine.

## Moving your notes over (a migration, like your E-21 fix)
The first time the new app opens:
1. It copies every note from localStorage into the database.
2. It reads the copy back and checks it matches exactly.
3. Only then does it write `info`, a record saying the move finished (with the date and the number of notes).

Next time, it only trusts the database if `info` is there. So a move that broke halfway is never trusted,
and it simply runs again. The old localStorage copy is **left untouched** as a safety net.

If a browser has no IndexedDB at all, the app quietly keeps using localStorage, exactly like before.

The line under the Backup buttons says where your notes are and how big they are, for example:
"Your notes are kept in this browser's database (IndexedDB), 3.4 MB. 563 notes were moved over from the old storage."

## Tests
- `node tests/run.js`: the 79 logic checks from 2A, still passing.
- `python tests/browser_storage_test.py`: 14 checks in a real browser (needs Python + Playwright):
  - A. Notes in the old storage move over, all of them, and the old copy is untouched.
  - B. After a reload they come from the database, and the move doesn't run twice.
  - C. 14 MB of notes: the old storage fails (QuotaExceededError), and the new one saves it and keeps it after a reload.
  - D. Paste → save → reload keeps the note, and delete → reload keeps it deleted.
  - E. A browser with no IndexedDB falls back to the old storage and still works.

I also broke the move on purpose (the copy check always failed). All 563 notes stayed safe in the old storage,
and after fixing it, the next start moved them over properly.

Your 25 classes loaded with the new storage show exactly the same page as before (565 notes, 1,793 code boxes).
