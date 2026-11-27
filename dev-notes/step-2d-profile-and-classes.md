# Step 2D: Profile and classes (data version 2)

## Why
Before this, a note only knew its class by **name** ("BE104: Securing Your API").
Rename a class (say, to its real course name) and the app saw a brand-new class,
and loading the class file again would double every note.
Now every class has its own **record** with an **id that never changes**, and notes point to the id.
It's the same idea as `owner_id` pointing at a user's id in your recipe API, instead of storing the username.

## What you see
A new panel, **Profile & classes**:
- **Display name:** a nickname you choose. It will label anything you share later (Share & Compare).
- **Program:** for example, "AAS in AI Software Engineering". Classes get it too.
- **Your classes**, newest first. Each one shows:
  - a **color square**: click it to change the class color. Every note card gets a stripe in that color.
  - the **name**: click to rename, Enter to save, Escape to cancel. Its notes follow.
  - the code, note count and dates
  - a **status**: "auto" guesses from the dates, or pick current / done / upcoming yourself.
    (The guess can be wrong: BE106 looks "done" because your newest notes end Nov 16, but you're still taking it.)

## The class record (js/core/classes.js)
```js
{ id: "be104", code: "BE104", name: "BE104: Securing Your API",
  aliases: [], program: "AAS in AI Software Engineering", color: "#ffd54a", status: "" }
```
- **id** is made from the course code ("be104"), or from the name if there's no code ("motivation-psychology").
  If two classes would get the same id, the second gets "-2". It never changes after that.
- **aliases** are older names. Renaming adds the old name here, so loading an old class file still finds the
  class. That's why renaming can't make doubles anymore.
- Each note keeps `className` too, always equal to its class's current name, so search and sorting work as before.

## Your profile, and why your name isn't your id
```js
{ id: "947850b6-…", displayName: "Tunacan", program: "AAS in AI Software Engineering" }
```
The id is random. Names aren't unique (two students can both be "Alex"), and names can change.
It's the same reason your Elusion users have a number id and a username that isn't the key.
Your real name and email never go anywhere unless you type them in yourself.

## The move to version 2 (a migration, like your E-21 fix)
The first time the new app opens:
1. It makes a class record for every class name in your notes (oldest class first, so colors follow your school order).
2. It gives every note a `classId`.
3. It **checks**: same number of notes, same order, same ids, every note's words exactly the same, and every note's class exists.
4. It saves notes + classes + profile in **one** all-or-nothing write, then reads the notes back and compares.
5. Only then does `info` say `dataVersion: 2`. A move that breaks halfway is never trusted; it runs again next time.

If the move fails, the app keeps using your database (it's newer than the old localStorage copy),
shows a short warning under Backup, and tries again next start. Nothing is lost.

## Backups now carry classes
"Download backup" saves `version: 2` with your notes, classes (colors, real names, older names) and profile.
Loading it in another browser brings the classes back, older names included.
Class files and old backups (version 1, notes only) still load fine.

## Tests
- `node tests/run.js`: **111 checks** (17 new for classes), including:
  - "THE OLD PROBLEM": rename a class, load the old class file again → 0 new notes, 3 updated
  - moving all 25 of your real classes to version 2 keeps every word
  - I broke it on purpose (the app forgot older names), and 3 checks failed, including THE OLD PROBLEM
- `python tests/browser_classes_test.py`: **22 checks** in a real browser, starting the way your browser is
  after step 2B (notes in the database, no class records yet):
  - the move: version 2 marked done, 25 class records, every note linked, every word the same
  - profile saved; its id is random, not your name
  - rename BE104 → "45 notes followed", the dropdown shows the new name, the old class file adds 0 notes, and it survives a reload
  - color and status saved, a pasted new class gets a record, a backup round trip into a fresh browser
  - no page errors
- `browser_storage_test.py` (14) and `browser_ui_test.py` (23) still pass.
