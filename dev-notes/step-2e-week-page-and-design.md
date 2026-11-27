# Step 2E: Study a week (sidebar + Week page) and the design pass

## For weekly reviews
- **Sidebar** on the left: every class (newest first, with its color), each one a dropdown.
  Open a class to see its weeks or units, in course order. A class without weeks gets one group, "Lessons".
  Every class and week shows how many lessons you've reviewed, like **2/11**. It turns green when they're all done.
- **Click a week to open the Week page:**
  - the week's name, class and dates, and a progress bar ("2 of 11 reviewed")
  - every lesson in order, each with its **short summary** first:
    the "IN PLAIN WORDS" part, or the "GOAL:" line in older classes, or else the first paragraph
  - a **Reviewed** checkbox on each lesson, and **Mark all reviewed / Unmark all**
  - **Open full note** shows the whole note (tabs, code boxes and all) right there
  - reviews are tagged **Review**, with a reminder that they are never shared
  - **← All notes** goes back. Typing a search also goes back to the list.

## Your checkmarks are kept apart from your notes
They're saved in their own record, `progress`, like `{ "be104-week-9-lesson-1": "2026-11-26" }`.
Your notes never change when you tick a box. That matters for sharing later:
sharing notes can never carry your personal progress. (Deleting a note removes its checkmark too.)

## New logic (js/core/study.js, tested)
- `splitTopic("Week 9 · Lesson 2")` → week "Week 9", lesson "Lesson 2"
- `buildTree(notes, classes)` → classes → weeks → lessons, in order (it uses the lesson order numbers)
- `studySummary(note)` → the short text for the Week page, cut at about 400 characters on a whole word
- `isGradedReview(note)` → spots reviews, finals, quizzes and exams (used later to block them from sharing)
- `progressOf(notes, progress)` → "2 of 11"

## The design pass (symmetry)
- **One set of design values** at the top of `style.css`: colors, spacing (one 16px step), corner sizes,
  and ONE height for every input, dropdown and normal button (44px). Every part of the page uses them,
  so everything lines up and matches. Change one value there and the whole app follows.
- **Two even columns, top to bottom:** the top bar's left side (the app name) is exactly as wide as the sidebar,
  and the search box + class dropdown sit exactly above the notes. Same gap everywhere.
- **Three equal buttons** (Add notes, Backup, Profile & classes) in one row. Each opens its panel below, and
  only one panel is open at a time, so the page stays tidy.
- **Note cards** line up on the left, with the class color as a stripe, and the counts and buttons sit
  on the right of the "Saved notes" heading.
- **On a phone:** one column, the sidebar folds under a "Browse classes & weeks" button, the top bar
  stops sticking (so it doesn't cover your notes), and buttons never break into two lines.

Bugs I fixed by looking at screenshots:
- Card titles were centered (they're buttons and inherited the centering).
- "Profile & classes ( 25 )" had extra spaces.
- On a phone, "Open all" wrapped onto two lines, and then note titles ran off the screen.

## Tests
- `node tests/run.js`: **126 checks** (15 new for study mode), including: every BE104 week found in order,
  every one of your 563 notes lands in exactly one week, and every note has something to show on the Week page.
- `python tests/browser_week_test.py`: **21 checks**: sidebar order, BE104's 4 weeks, the Week page shows all 11
  Week 9 lessons with summaries, checkmarks update the count and the sidebar, they survive a reload, they're NOT
  inside your notes, Mark all / Unmark all, search leaves the Week page, a class without weeks, and the phone layout.
- The other browser suites still pass: storage 14, search 23, classes 22.
