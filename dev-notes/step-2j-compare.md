# Step 2J: Compare with classmates (and the library that builds itself)

## What you see
Every class in the sidebar now has **⇄ Compare** (under ★ Final prep). It opens one page for that class:
- **At the top:** how many classmates shared it, and a box listing **lessons classmates have that you don't**.
- **Every lesson**, week by week: "You have it" or "You're missing this", and how many classmates shared it.
- **Click a lesson** to see your notes and a classmate's **side by side**:
  - pick a classmate from the dropdown
  - **What's new to you**: only the lines in their version that aren't anywhere in yours. Capital letters,
    spaces and punctuation don't count as different, and tiny lines and labels are skipped.
    This is where their "other paths" show up, like "I used my game backend instead of the recipe API".
  - **Their full version**: all of it
  - a lesson you're missing shows their full version right away

## Where classmates' notes come from
1. **The library on the app's website.** Built from `contributions/` every time the site is published.
2. **Share files a classmate sends you.** Use "Load a classmate's share file" on the Compare page. These are:
   - checked with the same safety rules as the library (a file with a review or final is refused)
   - kept **apart from your notes**, never mixed in, and left out of your backups (they're other people's notes)
   - remembered after a reload, and removed with one click ("Remove loaded files for this class")
   - from the same classmate and class again: the new file replaces the old one (no pile-up)

Opened from a file on your computer, there's no website, so the page says the library needs the website.
Loaded share files still work.

## The library builds itself (no clutter)
- `js/core/library.js`, `buildLibrary`: share files → **class → lesson → versions**.
  The same lesson from five classmates is ONE lesson with five versions.
  A classmate sharing the same lesson again: their **newest** version replaces the old one.
  Files that fail the safety check are left out (and listed with the reason).
- `tools/build-library.js` writes `library/index.json` (every class: lessons, how many classmates) and one
  `library/<class>.json` per class.
- `.github/workflows/pages.yml` publishes the site on every change to `main`: it runs the logic tests, copies the app,
  builds the library, and deploys. The generated library is **never committed**, so the repo stays clean.
- The class in the library is matched to yours by its **code** (DEMO101), its name, or one of its older names.

## Tests
- `node tests/run.js`: **137 checks**. 16 are in `tests/library.test.js`: one lesson with 2 versions, newest wins,
  a bad file is left out, matching by code or older name, missing lessons, "What's new" shows only new lines,
  and the website library combines with loaded files.
- `python tests/browser_compare_test.py`: **21 checks**, with two made-up classmates (Sam and Jo):
  - **A, as a real website** (like GitHub Pages, with a library built from their shares): 2 classmates found,
    Jo's extra lesson flagged as missing, side by side, Jo's 1 new line, Sam's 2 new lines, the full version,
    your notes unchanged
  - **B, opened from a file**: says the library needs the website, loads Sam's file and refuses one with a final,
    remembers it after a reload, never mixes it into your notes, Remove works
- Every other browser suite still passes: storage 14, search 23, classes 22, week 21, final prep 18, backup 17, share 22.

Bugs caught while building, all fixed:
- The file picker lived inside the page, which is cleared on every redraw, so it would have vanished.
- The "loaded / refused" message vanished on the redraw right after loading. It's now kept until the next load.
- Rows were pushed right and spilled past the card edge, because a Week page style leaked in.
- The Week test counted the new "⇄ Compare" link as a week (a test mistake).

## One GitHub setting
**Settings → Pages → Source: GitHub Actions.** The library is built when the site is published,
so Pages has to publish through the workflow, not straight from the branch.
