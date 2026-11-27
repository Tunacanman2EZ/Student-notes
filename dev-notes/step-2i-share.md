# Step 2I: Share to the library (a contribution, like a pull request)

## The idea
Sharing works like contributing to an open-source project:
1. In the app, **Share** → pick a class → tick lessons → **Download share file**.
2. Upload the file to the library on GitHub (**Add file → Upload files** in `contributions/`).
   GitHub turns that into a **pull request** for you.
3. A **safety check** runs automatically on the pull request.
4. The library owner **reviews and merges** it. Then it's part of the library.

## The rules (js/core/share.js)
The SAME code runs twice: in the app before the file is made, and again on GitHub when the pull request arrives.
So even a share file someone edits by hand can't sneak anything in.

1. **Reviews, finals, quizzes and exams are never shared** (school rules). They're greyed out on the Share panel,
   dropped from the file even if somehow ticked, and rejected by the GitHub check. No setting turns this off.
2. **Locked notes are never shared.** Every note now has a **Lock (keep private)** button. A locked note says
   "private" on its card and is greyed out on the Share panel.
3. **Emails and phone numbers become [hidden].** Addresses made for examples (`player1@example.com`, `.test`)
   stay, because they can't belong to a real person. Tested on all 563 of your real notes: it caught your real email
   in 2 places (a `git config` line, a chat header) and hid 4 throwaway example addresses.
4. **Only your display name and random id** go with a share. No real name, no email.
   You must set a display name before you can share.
5. **Refined notes are shared; originals only if you tick the box.**
6. **Notes with your own chat lines ("YOU: …") start unticked**, with an amber warning, so you choose on purpose.

## The share file
```json
{ "app": "notes-vault", "kind": "contribution", "version": 1, "createdOn": "…",
  "contributor": { "id": "random…", "displayName": "Alex" },
  "program": "…", "class": { "code": "DEMO101", "name": "DEMO101: Building Web APIs" },
  "lessons": [ { "group": "Week 1", "item": "Lesson 2", "title": "…", "topic": "Week 1 · Lesson 2",
                 "order": 102, "date": "…", "refined": "…", "original": "" } ] }
```
The file name is made safe by the app: `alex-a8d7d3-demo101-2026-11-27.json`
(display name, a piece of the random id, the class, the date).

## The GitHub check
- `tools/check-contributions.js` runs the same `validateContribution` the app uses. It also checks that
  file names only use a–z, 0–9 and -, and that each file is under 2 MB.
- `.github/workflows/check-contributions.yml` runs it on every pull request that touches `contributions/`, and
  **fails if a pull request changes anything outside `contributions/`**. A share can't sneak in code changes.
- A red ✗ on the pull request means it can't be merged until it's fixed.

## Tests
- `node tests/run.js`: **121 checks**. 22 are in `tests/share.test.js`, including:
  - even if EVERY lesson is ticked, reviews, finals and locked notes stay out
  - no email or phone number is left in the file
  - the app's own file passes GitHub's check
  - 5 hand-edited "sneaky" files are each caught: a review added back, a final added back, an email put back,
    an email as the display name, the same lesson twice
  - the command GitHub runs passes a good file and fails a bad one
- I broke the rule on purpose twice. Without the check on GitHub's side, 3 tests failed;
  without the check in the app, 6 failed.
- `python tests/browser_share_test.py`: **22 checks** in a real browser: no display name means no sharing,
  reviews are greyed out with the reason, locking a note greys it out (even after a reload), the summary counts,
  the downloaded file holds exactly the ticked and allowed lessons, and GitHub's check passes it.

## Next: 2J, Compare
The library folder gets organized by class → week → lesson, and the app reads it:
pick a lesson and a classmate who shared it, and see "What I missed" and "Other paths".
