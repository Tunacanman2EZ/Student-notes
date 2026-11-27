# Step 1: Paste box and saving

## What it does
You paste a note, pick a class and topic, and click Save. The note shows up in the list, and it's still there after you close the browser.

## The three files
- **index.html** = the skeleton. The boxes, buttons and headings.
- **style.css** = the paint. Dark background, colors, rounded corners.
- **app.js** = the brain. Everything that *happens* when you click or paste.

## The pieces in app.js, in plain words
1. **loadNotes / saveNotes**: the browser has a small storage space called *localStorage*. We keep all notes there as one long piece of text (JSON). Load = read it out, Save = write it back.
2. **findDate**: when you paste, it looks for a date in the text, like "November 3, 2025", "Nov 3" or "11/3/25". If it finds one, it fills in the Date box for you. You can always change it.
3. **A note is a small record** with: id, text, className, topic, date, addedOn.
   - `text` is your words, **never changed**.
4. **Save button**: builds the record, adds it to the list, saves, and clears the box. Class stays filled so you can paste several notes for one class fast.
5. **Delete**: asks "are you sure?" first.
6. **render**: draws the list on screen, newest date first.

## Safety detail
Pasted text is shown with `textContent`, not `innerHTML`. That means if a note contains code like `<b>`, it shows as text instead of changing the page.

## Known limits (fixed in later steps)
- "Nov 3" with no year assumes *this* year. Check the date on old notes.
- Notes live in this one browser on this one computer. Step 5 adds backup.
- Clearing your browser data would erase them. Don't do that until backup exists.

## How I'd explain it back
"The page has a paste box. When I paste, the app looks for a date. When I hit Save, it wraps my note in a label (class, topic, date) and stores it in the browser. My words stay exactly how I wrote them."
