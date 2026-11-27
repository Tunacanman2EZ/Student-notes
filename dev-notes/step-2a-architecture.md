# Step 2A: Splitting the app into layers

## What changed
Nothing on screen. The one big `app.js` (520 lines) is now 10 small files in 3 layers.
Proof: I loaded all 25 class files and a test paste into the old app and the new one,
and saved what the page showed each time. Both matched exactly: 565 notes, 1,793 code boxes,
the same preview and messages, and no errors.

## Why
- **Easier to find things.** Each file has one job, so a bug in the dates is in `dates.js`.
- **Safer changes.** Next step (2B) moves notes to a bigger storage. Only `store.js` knows
  where notes live, so only that file changes.
- **Tests.** The logic files never touch the page, so they can be tested on their own.
- **Other students.** A clean structure is easier for someone else to read and add to.

## The 3 layers (same idea as routes → services → data in BE105)

| Layer | Folder | Job | Files |
|---|---|---|---|
| Data | `js/data/` | The ONLY place notes are read or saved | `store.js` |
| Logic | `js/core/` | Works on text and data. No screen code | `dates.js`, `split.js`, `merge.js` |
| Screen | `js/ui/` | Draws the page and handles buttons | `list.js`, `add.js`, `backup.js`, `codebox.js` |
| Glue | `js/` | Shared state, and the start | `state.js`, `main.js` |

### Each file in one line
- `core/dates.js`: finds dates in a paste ("Nov 24 - Dec 01", "10/27", "2025-11-03").
- `core/split.js`: cuts a whole-class paste into lessons, and checks nothing was lost.
- `core/merge.js`: loads a notes file into your notes (never deletes, never changes your words), makes backups, sorts.
- `data/store.js`: loads and saves notes (still localStorage for now).
- `state.js`: `App`, the one shared object holding the notes and the redraw function.
- `ui/codebox.js`: turns ``` fences into dark code boxes with a Copy button.
- `ui/list.js`: draws the note cards (date, class, title, tabs, Delete).
- `ui/add.js`: the paste box, the preview and Save all.
- `ui/backup.js`: the Download backup and Load a file buttons.
- `main.js`: starts the app and connects the layers.

### Why the load order in index.html matters
The browser reads the files top to bottom. Logic and data come first, then the screen files
that use them, and `main.js` last, because it calls everything else.

### How one file can work in the browser AND in tests
The last line of each logic file is:
```js
if (typeof module !== "undefined") module.exports = { findDates, ... };
```
In the browser, `module` doesn't exist, so the line does nothing and the functions are just available.
In Node (the tests), `module` exists, so the line hands the functions to the test file.

### Why "now" is passed into the date functions
"Dec 15" with no year means last year if Dec 15 hasn't happened yet. That depends on today's date.
Tests pass in a fixed date (Nov 26, 2026), so they give the same answer every day.

## Tests
Run from the project folder:
```
node tests/run.js
```
79 checks pass, including:
- **Dates:** 8 kinds of dates and ranges, including ranges across New Year.
- **Splitting:** 11 checks. Pieces rebuild the paste exactly, titles, duplicate lessons, "Review" headings.
- **Real data:** each of your 25 class files is glued back into one paste, split again, and checked that nothing was lost.
- **Loading files:** never deletes, never changes your original words, adds refined versions and new dates.

I broke the code on purpose twice to make sure the tests notice:
- Loading files matched notes without comparing their words, so it could overwrite your text. The tests caught it.
- The splitter dropped the text before Lesson 1. 20 checks failed.

## Still the same
- Double-click `index.html` to open it. No server, no installs.
- Your notes stay in your browser. Nothing is sent anywhere.
