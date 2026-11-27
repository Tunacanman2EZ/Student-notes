# Step 2T: the Library page

**Why:** A new visitor had no notes, so Compare had nothing to work with. The shared library already
existed on the website, but you could only see it from inside one of your own classes.

## What changed
- **Library** button (5th panel). It lists every class in the website library: name, lesson count,
  how many students shared it.
  - **Read**: every lesson, each with "Shared by …" and the refined notes.
  - **Add to my notes**: copies the class into your app, one note per lesson, from the newest version.
  - Already have the class? The button says **Add lessons I'm missing**, and only lessons you have no
    notes for come in. Your own notes are never doubled up.
  - **⇄ Compare** appears once you have the class.
- A brand-new visitor (no notes) starts with the Library open instead of the paste box.
- Logic in `js/core/library.js`: `libraryClassToNotes` (fixed ids per class + lesson, so adding again
  updates instead of copying) and `libraryNotesToAdd` (the "only what you're missing" rule).
  Library lessons now keep their dates.
- Notes added from the Library carry `fromLibrary: { id, displayName, sharedOn }`. The Share page
  never shares them again as yours (rule 7 in `js/core/share.js`).
- Screen code in `js/ui/library.js`; it reuses the Compare page's library loader.

## Checked
- `node tests/run.js` 163 passed (9 new library tests).
- New `tests/browser_library_test.py` (11 checks): it builds a library from the example course,
  serves it over http, then reads, adds, re-adds (no copies), compares, and checks Share blocks them.
- The other 7 browser tests pass (two updated: five panel buttons; a new user starts in the Library).
- With the real 17-class library: a fresh visitor adds BE104 (30 lessons) and compares; with all 556 of
  your own notes loaded, "Add lessons I'm missing" adds nothing to BE104. Desktop and phone width.
