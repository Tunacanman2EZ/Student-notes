# Step 1b: Whole-class paste, Refined tab, Watch button, Backup

## What it does
- Paste a whole class at once. The app splits it into one note per lesson.
- Each note can have a **Refined** version beside your **Original**. The original never changes.
- A red **▶ Watch** button opens the lesson's video.
- **Download backup** saves every note to a file. **Load a file** brings notes in.

## The pieces, in plain words
1. **splitClass**: reads your paste line by line. Every line that starts with `Lesson 5:` or `Final:` starts a new note. Everything until the next one belongs to that note.
   - Bullets like `* Final thoughts` do NOT start a new note. Only lines that start with the word.
2. **Safety check**: after splitting, the app glues the pieces back together and checks they equal your paste, letter for letter. If not, it saves nothing. That's how we prove nothing was taken away.
3. **Preview**: you see the list of notes before anything saves. Save all, or Cancel.
4. **findDates**: now also understands ranges like `10/27 - 11/03` and dates without a year.
   - No year? It uses this year, unless that date would be in the future. Then it uses last year.
5. **findLink**: grabs the first web link in each note for the Watch button.
6. **Refined / Original tabs**: two views of one note. Refined shows first if it exists.
7. **Load a file MERGES**: it never deletes. If the same lesson with the same original text is already here, it just adds the refined version. Loading the same file twice does nothing new.

## Facebook junk removal
**removeFacebookJunk**: Facebook adds "See less" or "… See more" to the end of copied posts. That's Facebook's button text, not my words, so the app removes it, but ONLY from the very end of a paste. A sentence like "I can see less now" in the middle stays.

## A note now looks like this
| field | what it is |
|---|---|
| text | your words, untouched |
| refined | cleaned-up version (optional) |
| className | e.g. Motivation Psychology |
| topic | e.g. Lesson 3 |
| title | e.g. SMART Goals |
| order | lesson number (Final = 1000, so it sorts last) |
| date / dateEnd | class dates |
| link | video link |

## Refined rules (how Claude refines a class)
- Keep every point. Nothing dropped.
- Fix broken numbering, tidy formatting.
- Add "IN PLAIN WORDS" at the top, plus examples and memory tricks where helpful.
- Add who made each theory, and which lesson connects to which.

## The refined class files
- `classes/motivation-psychology.json`: Lessons 1–13 + Final, with answers
- `classes/cognitive-biases.json`: Lessons 1–10 + Final, with answers

## How I'd explain it back
"I paste a whole class. The app cuts it at every 'Lesson' line, checks the pieces add back up to my exact paste, and shows me a preview. Refined notes sit beside my originals in a second tab, so nothing I wrote is ever lost."
