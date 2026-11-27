# Step 2F: Final prep

## For finals
Finals mix all 3–4 weeks of a course. Every class in the sidebar now starts with **★ Final prep**.
It opens one page for the whole course, with three equal tabs:

| Tab | What's in it |
|---|---|
| **Summaries** | Every lesson's short summary, week by week. Lessons you ticked on the Week page say "Reviewed". |
| **Study lines** | Every block your notes already mark for exams: "Cheat sheet", "For finals", "Key exam…", "Exam line", "Memorize", "Cram sheet", "Decision rule"… |
| **Corrections** | Every place the course notes were wrong or incomplete (CORRECTION, BUG, MORE EXACT, CHECK YOUR NUMBERS…), so you don't study the wrong answer. Game-fact fixes are left out (not exam material). |

- **Print** prints all three tabs, black on white, each tab starting on a new page, without the sidebar or buttons.
  BE104 prints as 26 pages.
- **Open full note** works on every lesson.
- The tab you were on is remembered while you move around.
- A class with no exam markers (older classes) says so and points you to Summaries, instead of showing an empty page.

Across your 25 classes it found **147 study blocks** and **29 corrections**. BE104: 45 lessons, 33 study blocks, 5 corrections.

## How a study block is found (js/core/finals.js)
1. It reads the refined version of the note (tidier, code already in boxes), or your original if there's no refined one.
2. A block **starts** at a line like "Cheat sheet…", "For finals…", "Key exam…" (the list is `STUDY_MARK`).
3. A block **ends** at the first of these:
   - two blank lines in a row
   - the next marker or a new lesson
   - an ALL-CAPS heading (like CORRECTION)
   - a numbered section title (like "3. Target package layout")
   - the reward part ("Game dev fact", "Godot project idea", "you earned it")
4. Very long blocks are cut at 18 lines (code boxes can run a bit longer) and end with "…(open the note for the rest)".
5. Blank lines **inside a code box** never end a block, and a block never leaves a code box half open.

Bugs the tests caught while building, all fixed:
- A correction ran on into the next heading ("CORRECTION (game fact)").
- A "Cheat sheet" line **inside** a code box started a block in the middle of the code.
- When a code box ended exactly at the 18-line limit, the cut happened before its closing line, which left the box open.
  The line that closes a code box now always stays with it.
- On paper, the first page was empty except for the title (each tab started a new page, even the first one).

## Tests
- `node tests/run.js`: **136 checks** (10 new), including on all your real notes: BE104 has its 4 weeks and 45 lessons,
  **every code box in every study block is closed**, and no block is empty or huge.
- `python tests/browser_finals_test.py`: **18 checks**: a link for every class, BE104's header, the three tabs with counts,
  every lesson listed, the study blocks, the corrections without game facts, the Reviewed tags, a remembered tab,
  the empty-class message, the print layout (all three tabs, no sidebar), and searching leaves the page.
- All the other browser suites still pass: storage 14, search 23, classes 22, week 21.
