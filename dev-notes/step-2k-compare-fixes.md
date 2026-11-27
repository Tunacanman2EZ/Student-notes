# Step 2K: Compare fixes after the first real share

The first real share went through the whole loop:
Share panel → download → pull request → the "check" passed → merge → the site rebuilt → BE104 showed up in ⇄ Compare.
Seeing it live showed three bugs. (That share was later removed: course material belongs to Maestro.) This step fixes them.

## What was wrong, in plain words
1. **A lesson chat took over its lesson.** Week 7 Lesson 1 has two of your notes: the lesson notes and the full lesson chat.
   Compare keeps one row per lesson, and the *last* note it saw won, which was the chat. So the row showed the chat's title,
   and "What's new to you" compared a classmate's notes against your chat instead of your lesson notes.
2. **You were counted as your own classmate.** After you shared BE104, Compare said "1 classmate", and that classmate was you.
3. **"Security review" counted as a review.** The safety rule blocked any note with the word "review" in its title,
   so "Lesson 4: Challenge: end-to-end security review of your API" (a normal lesson) couldn't be shared.

## The fixes
- **Main note per lesson** (`compareRows` in `js/core/compare.js`): your notes are sorted by order first, so the lesson
  (order 701) comes before its chat (701.5). The first one is the main note: it gives the row its title and fills
  "Your notes". The others go in `myExtras`.
- **"What's new" checks all of them** (`myTextFor`): a classmate's line that's already in your chat doesn't show as new.
- **Your own share** (`compareRows(..., myId)`): versions with your profile id are taken out of the classmates list.
  The row gets a blue **"You shared this"** tag instead, and the header says "plus your own share".
  If your share is the only one, it says "Only your own share is here so far."
- **The review rule** (`isGradedReview` in `js/core/study.js`): the topic stays strict ("Week 9 · Review", "Final").
  The title only counts as a review when it:
  - starts with "Review", or
  - says weekly / unit / course / final(s) review, or
  - names a final, quiz, exam or midterm.

  The GitHub check uses this same function, so the app and the check still agree.

## Checked against your real notes
I ran the old and new rule over all 563 of your notes (in your private repo). **49 are still blocked.**
4 are now allowed, and all 4 are normal lessons: challenges or a repeat of an earlier lesson whose titles happen to contain "review".

## Tests
- `node tests/run.js`: **145 checks** (8 new):
  - lessons *about* reviewing are allowed
  - real reviews, finals review chats, unit reviews, quizzes, midterms and finals are still blocked
  - "Finalizing the schema" is not a final
  - your own share isn't a classmate, and it's marked "you shared"
  - the lesson beats its chat even when the chat is listed first
  - one row per lesson
  - "What's new" checks your chat too
- **Break on purpose:** I undid each fix one at a time. Each time, the tests failed (2, 1 and 1 failures), then passed again once the fix was back.
- `python tests/browser_compare_test.py`: **31 checks**. The new Part C:
  - imports a lesson chat
  - loads *your own* share file ("Only your own share is here so far")
  - loads Sam's, then checks the row keeps "What an API is", has one row, shows 1 classmate plus "You shared this", leaves you out of the picker, puts no "YOU:" line in the left column, and lists only Sam's tip as new
- Every other browser suite still passes: storage 14, search 23, classes 22, week 21, final prep 18, backup 17, share 22.

## For you
To share BE104 W10 L4 now, open Share again with BE104 picked and tick it. Your new share file replaces your old one
in the library (newest version wins), so nothing gets duplicated.
