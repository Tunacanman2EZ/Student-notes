# Step 2M: Lesson chats are never shared

## The school rule, in plain words
- **You CAN share:** your end-of-lesson notes (the wrap-up at the end of each lesson) and notes you wrote yourself.
- **You can NOT share:** the lesson itself (lesson chats), reviews or finals.

Before this step, a lesson chat only started **unticked**, so you could still tick it.
Now it's **greyed out** like a review, with the reason "Lesson chats are never shared". No setting turns this off.

## How the app spots a lesson chat
`isLessonChat(note)` in `js/core/share.js` returns true if either:
- the title says **"lesson chat"** ("Welcome to BE104! (full lesson chat)", "...: lesson chat and finals review"), or
- the note has **"YOU:" lines** (your side of the chat), in the refined notes, the original or the original sent with a share.

Checked against all 563 of your notes: exactly **6** are lesson chats (all in BE104), and each one matches **both** ways.
Nothing else matches. A note like "My notes on building a chat server" is still allowed, because "chat" alone isn't enough.

## Both places enforce it
- **In the app (Share panel):** lesson chats are greyed out and can't be ticked. The summary says
  "never shared (reviews, finals, lesson chats or locked)".
- **On GitHub (the "check"):** `validateContribution` refuses a share file with a lesson chat in it, even if
  someone edits the file by hand (adds a "YOU:" line, renames a title, or hides it in the originals).

## Tests
- `node tests/run.js`: **154 checks** (new or changed):
  - a note with YOU: lines is never allowed
  - a note titled "lesson chat" is never allowed, even without YOU: lines
  - end-of-lesson notes and your own notes (even one about "a chat server") are allowed
  - ticking everything still leaves lesson chats out
  - the GitHub check catches a chat slipped in three ways: a YOU: line, a title, or hidden in the originals
- **Break on purpose:** I turned off the app's rule, and 6 tests failed. I turned off the GitHub check's rule, and 3 failed.
  With both rules back, everything passes again.
- `python tests/browser_share_test.py`: **26 checks** (4 new). A lesson chat is imported, shows up greyed out with the
  reason, can't be ticked, and the summary names lesson chats. The compare, week and final prep suites still pass.
