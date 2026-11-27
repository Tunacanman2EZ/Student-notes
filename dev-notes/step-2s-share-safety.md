# Step 2S: pasted lessons can't be shared, and the README is up to date

**Why:** Many notes keep the whole pasted lesson as their original. Those lessons belong to the school.
The share check only spotted lessons with "YOU:" lines, so these would have slipped through.

## What changed
- `js/core/share.js`: a note is a lesson chat if its title says "lesson chat", it has "YOU:" lines,
  **or** any part of it starts the way the tutor starts a lesson ("Welcome to your next lesson…",
  "…preparing your personalized lesson…", "…getting your lesson ready…").
  A lesson chat is never shared, not even its cleaned-up version, because that was made from the lesson.
- The same rule runs on GitHub (`tools/check-contributions.js` uses the same file), so a hand-edited
  share file with a pasted lesson in it is refused there too.
- Share page and `contributions/README.md` now say: pasted lessons are never shared; share only
  end-of-lesson notes and notes you wrote yourself.
- `README.md` rewritten to match the app now: no finals, link buttons explained, steps in order.
- Personal details taken out of two dev notes; an old "Final prep" line taken out of the example course.

## Checked
- `node tests/run.js` 154 passed (4 new share tests); library and share tests pass.
- All 7 browser tests pass.
- On the real 556-note backup: 61 notes are blocked as lesson chats, 6 as reviews, 489 can be shared,
  and none of the shareable notes has a tutor opening in it.
