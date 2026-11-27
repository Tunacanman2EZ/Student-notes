# Notes Vault

A free study app for students: keep your end-of-lesson notes, find anything fast, review week by week, and prep for finals. Your notes stay in your own browser.
Built by Tunacan.

**Your notes stay on your computer.** Nothing is uploaded anywhere. The app runs in your browser,
and your notes are saved in your browser's own database.

## Use it
Open the app's page (or download this repo and double-click `index.html`), then:
1. **＋ Add notes**: paste a whole class. It's split into one note per lesson automatically.
   Or use **Backup → Load a file** to load a notes file.
   Want to try it first? Load the files in `examples/`, a small made-up course.
2. **Search** at the top (press **/**), or pick a class from the dropdown.
3. **Study a week:** in the sidebar, open a class and click a week. Each lesson shows its short summary,
   and you tick it off when you've studied it.
4. **Back up** whenever the amber dot shows. Your notes only live in your browser.
5. **Share** lessons with other students: open **Share**, pick a class, tick lessons, download the share file,
   and upload it to [`contributions/`](contributions/) (GitHub makes a pull request for you).
   Reviews, finals, quizzes, exams and notes you lock are never shared. Emails and phone numbers are hidden.

## Your notes, your rules
- Your original words are never changed. Cleaned-up ("refined") versions sit beside them.
- Reviews and finals are marked, and they will never be shared (school rules).
- Your profile has a random id. Your real name and email are never needed.

## How it's built
Plain HTML, CSS and JavaScript, with no server and no installs, in 3 layers:
- `js/data/`: the only place notes are saved (IndexedDB, with checked data migrations)
- `js/core/`: logic with no screen code (splitting, dates, search, classes, study mode, final prep, backups, sharing rules)
- `tools/check-contributions.js` + `.github/workflows/check-contributions.yml`: the safety check on every shared file
- `tools/build-library.js` + `.github/workflows/pages.yml`: publishes the app and builds the library (class → lesson → versions)
- `js/ui/`: the screen

`dev-notes/` explains every step in plain words.

## Tests
- `node tests/run.js`: the logic checks
- `python tests/browser_*_test.py`: real-browser checks (needs `pip install playwright` and `playwright install chromium`)

The tests use the made-up course in `examples/`.

7. **Compare** with classmates: open a class, click **⇄ Compare**. See lessons classmates have that you don't, and any lesson
   side by side with a classmate's version, with **What's new to you** (only the lines you don't have).
   Uses the shared library on the website, or a share file a classmate sends you.
