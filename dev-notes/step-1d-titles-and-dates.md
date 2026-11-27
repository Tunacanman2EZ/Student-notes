# Step 1d: Titles from headings, better dates

## What's new
- **Titles from headings**: "Lesson 1: Welcome to CS102" → the topic is "Lesson 1" and the title is "Welcome to CS102". Stray symbols at the end, like `\` or `�`, are cleaned off the title.
- **Lines above Lesson 1**: up to 3 short lines (like the class name and dates) join Lesson 1 instead of becoming their own note.
- **Month-name date ranges**: "Nov 24 - Dec 01" is understood, just like "11/24 - 12/01".

## The pieces, in plain words
1. **HEADING** now has a third part, `(.*)`, meaning "everything after the colon". That's the title.
2. **cleanTitle** trims junk off the start and end of a title.
3. **findDates** has a new pattern for "Month Day - Month Day". If the second month is earlier than the first (like Dec → Jan), it adds a year.

## Tables in refined notes
Tables go inside a ```text box. In a box every letter is the same width, so the columns line up. In normal text they don't.

## Things I noticed in the CS102 notes
- Lesson 10's notes are an exact copy of Lesson 9. The refined version keeps them and adds the real Lesson 10 material from the short notes.
- The Review only says "unable to share details as rules have been updated". The refined version points to the full quiz in the short notes.

## How I'd explain it back
"If a lesson heading has words after the colon, the app uses them as the title. Short lines above Lesson 1 get tucked into Lesson 1. Tables sit in fixed-width boxes so they line up."

## Update (1e): bare headings
Some classes write headings like this:
```
Lesson 1
Welcome to algorithms
```
No colon, and the title on the next line. Now:
- A heading line that is ONLY "Lesson 1" (or "Week #3 Review") starts a new note.
- The next non-empty line becomes the title (if it's short).
- Headings WITH a colon but nothing after it ("Lesson 2:") don't steal the next line. That line is usually a video link.
- Links and dates are never used as titles.

## Classes with no "Lesson" headings (HIST200)
HIST200's notes have no "Lesson 1:" lines. Each topic just starts with its title, like "Vietnam and public opinion".
The app can't tell a topic title from a normal line, so pasting it into the app would make one giant note.
Claude split it by topic instead, and checked that the pieces add back up to the original letter for letter.
Possible future feature: a "mark topic start" button in the preview.

## Update (1f): even more heading styles
The HEADING pattern now also understands:
- Markdown headings: `## Lesson 1 — Recap: printing` and `# 📝 Lesson 13: Functions II`
- Double lessons: `Lesson 18 & 19` (the label keeps both numbers)
- Projects: `Project: Café Receipt` (sorted after the lessons, before reviews)
- No colon: `Lesson 4 Variables:` (title = "Variables"). Only "Lesson <number>" may skip the colon. "Review the code…" is a sentence, not a heading.
- An empty heading followed right away by another one (`Review` then `Review: thinking in objects`): the second line becomes the title instead of a new note.
- Titles stop at Facebook's broken character (�), and a colon at the end is trimmed off.

All 10 earlier pastes were re-tested after this change. Every one still splits the same way and adds back up to the original letter for letter.
