# Step 2C: Search, class dropdown, and dropdown cards

## What you see now
- **A bar at the top that stays while you scroll**, with:
  - a **search box**: type, and only matching notes stay
  - a **class dropdown**: "All classes (563)", then each class with its note count, newest first
  - a **count**, like "15 of 563 notes"
  - **Open all / Close all** for the notes on screen
- **Every note is a dropdown card.** Click the title to open it. Click again to close it.
  While searching, each card shows a short **snippet** with your words **highlighted in yellow**.
- **Add notes** and **Backup** are panels that open and close. They start closed once you have notes,
  so your notes come first. A brand-new user (no notes yet) sees the paste box already open.

## How search works (js/core/search.js)
- Finds notes that contain **every** word you type, in any order. `jwt expired` = both words somewhere.
- **Quotes keep words together:** `"status code"` finds that exact phrase.
- **Capital letters don't matter**, and curly quotes match plain ones (`don't` finds `don’t`).
- Looks in: title, topic (`Week 9 · Lesson 2`), class name, refined notes, and your original.
- **Ranking:** a match in the title counts most (8), then the topic (4), the class name (2), and the text (1).
  The best matches come first. With no search, the usual order is used (newest class, then lesson order).
- **Opens the right tab:** if your words are only in your Original (not in the refined version),
  the card opens on the Original tab.
- 3 or fewer results? They open right away, so you see the answer without clicking.
- Search never changes a note. It only decides which notes to show.

## Shortcuts
- Press **/** anywhere to jump to the search box.
- Press **Escape** in the search box to clear it.
- The class you picked is **remembered** next time (saved as a tiny setting, not with your notes).

## Why it stays fast with lots of notes
- A card's inside (tabs, text, code boxes) is only built the **first time you open it**.
  563 closed cards are just titles, so drawing them is quick.
- Search waits until you pause typing (0.12 seconds) before searching, instead of searching on every key.

## Highlighting (js/ui/highlight.js)
After a note is drawn, it walks through the text and wraps each match in `<mark>` (the yellow highlight).
It only splits the text into pieces. The words themselves never change, and buttons are skipped,
so "Copy" never gets highlighted.

## New and changed files
- `js/core/search.js` (new): the search logic, no screen code, so it's tested
- `js/ui/highlight.js` (new): yellow highlights
- `js/ui/list.js`: dropdown cards, toolbar, class dropdown
- `js/data/store.js`: remembers your class choice (`loadPrefs` / `savePrefs`)
- `index.html`: the top bar, and the panels that open and close
- `style.css`: the top bar, cards, panels and highlights

## Tests
- `node tests/run.js`: **94 checks** (15 new for search, including searching all your real notes)
- `python tests/browser_ui_test.py`: **23 checks** in a real browser with all 25 classes loaded:
  search narrows the list, search + class together, highlights, Escape, "/", a remembered class,
  Original tab, Open/Close all, a "nothing found" message, and no page errors
- `python tests/browser_storage_test.py`: still **14 of 14**

Two bugs the tests caught while building, both fixed:
- Card titles are buttons, and the highlighter skipped all buttons, so titles never lit up. Now it only skips real buttons like Copy.
- My own test picked the wrong word: "douse" also appears in your chat notes' refined text, so the card correctly opened on Refined.
