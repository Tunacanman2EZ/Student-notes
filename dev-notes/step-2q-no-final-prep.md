# Step 2Q: no Final prep, no review rows

**Why:** Robert's notes no longer have reviews or finals, and he doesn't want the app built around them.

## What changed
- **Final prep page removed.** The ★ Final prep link, its page, its print layout, and the code behind it
  (`js/core/finals.js`, `js/ui/finals.js`, `tests/browser_finals_test.py`, its tests in `tests/run.js`).
- **"Review" tag removed** from the Week page.
- **"Reviewed" is now "Studied"** everywhere you see it (Week page, "Mark all studied", sidebar tooltips).
  The checkmarks and the 6/10 counts work exactly as before; saved checkmarks are kept.
- **Kept on purpose:** the share safety check (`isGradedReview`) still blocks any review, final, quiz
  or exam from ever being shared, in case one is pasted in later.
- The Compare page's week headings now use the class `group-week` (was `final-week`).

## Checked
- `node tests/run.js` 144 passed; library and share tests pass.
- All 7 browser tests pass (week, compare, share, backup, classes, storage, ui).
- Loaded the real 505-note backup: no Final prep links, no page errors, Week page shows "0 of 13 studied".
