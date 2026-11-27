# Step 1c: Code boxes, plus smarter splitting

## What's new
- **Code boxes**: in Refined notes, code shows in a dark box with a typewriter font and a **Copy** button.
- **More headings**: `Review:`, `Quiz:` and `Exam:` start a new note, just like `Final:`.
- **Same lesson twice**: if a paste has two `Lesson 5:` lines, the second becomes **Lesson 5 (2)** and sorts right after Lesson 5.
- **Date on its own line**: a short line above Lesson 1 (like `11/24 - 12/01`) joins Lesson 1 instead of becoming its own note.

## The pieces, in plain words
1. **Code fences**: in refined notes, code is wrapped in three backticks:
   ```
   ```python
   stack.append("A")
   ```
   ```
   The app finds those fences and turns what's inside into a code box. Everything outside stays normal text.
2. **withCodeBoxes**: walks through the refined text, makes plain text for the normal parts and a code box for each fenced part.
3. **codeBox**: builds one box: a top bar with the language name and Copy button, then the code.
   - `white-space: pre` in style.css keeps every space and indent exactly. That matters in Python, where indents are part of the code.
4. **copyText**: copies the code to your clipboard. If the browser blocks the normal way, it uses an older backup way. The button says "Copied!" for 1.5 seconds.
5. **Originals don't get code boxes**: your original stays plain text exactly as pasted. Only the refined version gets boxes.

## How every code example was checked
All 68 Python examples in the Data Structures notes were actually run in Python. All 68 ran without errors, and the results written in the comments were checked against what Python really gave.

## How I'd explain it back
"In refined notes, code sits between triple backticks. The app spots those and draws a code box with a Copy button. My original stays plain, exactly how I pasted it."
