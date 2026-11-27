// Notes Vault: SCREEN LAYER, the paste box ("Add notes")
// Paste → "Check it" shows a preview of how it splits → "Save all".
// The splitting itself is done by core/split.js; this file only handles the buttons.

function setUpAddBox() {
  const textBox = $("note-text"), classBox = $("note-class"), topicBox = $("note-topic");
  const dateBox = $("note-date"), dateHint = $("date-hint"), message = $("message");
  const preview = $("preview"), previewTitle = $("preview-title"), previewList = $("preview-list");

  dateBox.value = today();
  let dateRangeEnd = null;   // end of a range like 10/27 - 11/03
  let pending = [];          // notes waiting in the preview

  // As you paste, look for a date in the text and fill in the date box
  textBox.addEventListener("input", () => {
    const found = findDates(textBox.value);
    if (found) {
      dateBox.value = found.start;
      dateRangeEnd = found.end;
      dateHint.textContent = found.end ? `Found date range, ends ${found.end}` : "Date found in your note";
    } else {
      dateRangeEnd = null;
      dateHint.textContent = "";
    }
  });

  // "Check it": build the notes and show the preview (nothing is saved yet)
  $("check-btn").addEventListener("click", () => {
    const text = removeFacebookJunk(textBox.value);
    if (!text.trim()) { showMessage(message, "Paste something first.", "bad"); return; }

    const className = classBox.value.trim() || "Unsorted";
    const date = dateBox.value || today();
    const pieces = splitClass(text);
    const isClass = pieces.length > 1 || (pieces[0] && pieces[0].label !== "Intro");

    pending = (isClass ? pieces : [{ label: topicBox.value.trim() || "General", order: 0, text }])
      .map((p, i) => ({
        id: `${Date.now()}-${i}`,
        className,
        topic: p.label,
        title: p.title || "",
        order: p.order,
        date,
        dateEnd: dateRangeEnd,
        link: findLink(p.text),
        text: p.text,          // your words, untouched
        refined: "",
        addedOn: new Date().toISOString()
      }));

    // Safety check: the pieces must add back up to exactly what you pasted
    if (isClass && !piecesMatch(text, pieces)) {
      showMessage(message, "Something went wrong splitting this. Nothing was saved.", "bad");
      return;
    }

    previewTitle.textContent = isClass
      ? `Found ${pending.length} notes in "${className}"`
      : `1 note in "${className}"`;
    previewList.innerHTML = "";
    for (const n of pending) {
      const li = document.createElement("li");
      const firstLine = n.text.split("\n").map(s => s.trim()).find(s => s && !s.match(HEADING) && !s.startsWith("http")) || "";
      li.innerHTML = `<strong></strong> ${n.link ? "▶ video" : ""}<div class="first-line"></div>`;
      li.querySelector("strong").textContent = n.title ? `${n.topic} · ${n.title}` : n.topic;
      li.querySelector(".first-line").textContent = firstLine.slice(0, 90);
      previewList.append(li);
    }
    $("save-all-btn").textContent = `Save all ${pending.length}`;
    preview.hidden = false;
    showMessage(message, "Check the list, then save.", "ok");
  });

  $("cancel-btn").addEventListener("click", () => {
    pending = [];
    preview.hidden = true;
    showMessage(message, "Nothing saved.", "");
  });

  $("save-all-btn").addEventListener("click", async () => {
    const before = App.notes.length;
    const classesBefore = structuredClone(App.classes);
    attachClasses(pending, App.classes, App.profile.program);   // point the new notes at their class (making it if new)
    App.notes.push(...pending);
    if (await saveData({ notes: App.notes, classes: App.classes })) {
      showMessage(message, `Saved ${pending.length} note${pending.length === 1 ? "" : "s"}!`, "ok");
      textBox.value = ""; topicBox.value = ""; dateHint.textContent = "";
      dateBox.value = today(); dateRangeEnd = null;
      pending = []; preview.hidden = true;
      App.render();
    } else {
      App.notes.length = before;   // undo, so the screen matches what's really saved
      App.classes = classesBefore;
      showMessage(message, "Could not save. Your browser storage may be full or blocked.", "bad");
    }
  });
}
