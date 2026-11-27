# Notes Vault

A free study app for students: keep your end-of-lesson notes, find anything fast, and study week by week.
Your notes stay in your own browser.
Built by Tunacan.

**Your notes stay on your computer.** Nothing is uploaded unless you choose to share. The app runs in your
browser, and your notes are saved in your browser's own database.

## Use it
Open the app's page (or download this repo and double-click `index.html`), then:
1. **Library**: start with notes other students shared. Read any lesson, or click **Add to my notes**
   to copy a whole class into your app. (If you already have the class, only the lessons you're missing come in.)
2. **＋ Add notes**: paste a whole class. It's split into one note per lesson automatically.
   Or use **Backup → Load a file** to load a notes file.
   Want to try it first? Load the files in `examples/`, a small made-up course.
3. **Search** at the top (press **/**), or pick a class from the dropdown.
4. **Study a week:** in the sidebar, open a class and click a week. Each lesson shows its short summary,
   and you tick it off when you've studied it.
5. **Open a lesson:** a note with a link shows a button. **Open lesson** goes to the lesson on your school's site,
   **▶ Watch** opens a video, and **Open link** opens anything else.
6. **Back up** whenever the amber dot shows. Your notes only live in your browser.
7. **Share** notes with other students: open **Share**, pick a class, tick lessons, download the share file,
   and upload it to [`contributions/`](contributions/) (GitHub makes a pull request for you).
8. **Compare** with classmates: open a class and click **⇄ Compare**. See lessons classmates have that you don't,
   and any lesson side by side with a classmate's version, with **What's new to you** (only the lines you don't have).
   It uses the shared library on the website, or a share file a classmate sends you.

## Your notes, your rules
- Your original words are never changed. Cleaned-up ("refined") versions sit beside them.
- **Never shared:** pasted lessons (a lesson belongs to your school), reviews, finals, quizzes, exams,
  and notes you lock. Share only your end-of-lesson notes and notes you wrote yourself.
- Emails and phone numbers are replaced with [hidden] before anything is shared.
- Notes you add from the Library keep the name of who shared them, and are never shared again as yours.
- Your profile has a random id. Your real name and email are never needed.

## How it's built
Plain HTML, CSS and JavaScript, with no server and no installs, in 3 layers:
- `js/data/`: the only place notes are saved (IndexedDB, with checked data migrations)
- `js/core/`: logic with no screen code (splitting, dates, search, classes, study mode, backups, sharing rules)
- `js/ui/`: the screen
- `tools/check-contributions.js` + `.github/workflows/check-contributions.yml`: the safety check on every shared file
- `tools/build-library.js` + `.github/workflows/pages.yml`: publishes the app and builds the library (class → lesson → versions)

`dev-notes/` explains every step in plain words.

## Tests
- `node tests/run.js`: the logic checks
- `python tests/browser_*_test.py`: real-browser checks (needs `pip install playwright` and `playwright install chromium`)

The tests use the made-up course in `examples/`.
