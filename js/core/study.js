// Notes Vault: LOGIC LAYER, study mode (weeks, summaries, study progress)
// Groups each class into weeks or units, so studying a week means opening one week.
// No screen code, so it's tested (tests/run.js).

// "Week 9 · Lesson 2" → { group: "Week 9", item: "Lesson 2" }
// "Lesson 3" (a class without weeks) → { group: "Lessons", item: "Lesson 3" }
function splitTopic(topic) {
  const parts = (topic || "").split(" · ");
  return parts.length > 1 ? { group: parts[0].trim(), item: parts.slice(1).join(" · ").trim() }
                          : { group: "Lessons", item: (topic || "").trim() };
}

// How a lesson is named on screen: "Lesson 2: Issuing a signed token".
// If the title already starts with the item ("Review: API basics"), don't say it twice.
function lessonLabel(item, title) {
  if (!title) return item;
  return title.toLowerCase().startsWith(item.toLowerCase()) ? title : `${item}: ${title}`;
}

// Reviews, finals, quizzes and exams: school rules say these are never shared.
// (Used by study mode to label them, and later by Share to block them.)
// The topic ("Week 9 · Review", "Final") is strict: any of these words blocks it.
// The title is read more carefully, because lessons can be ABOUT reviewing ("end-to-end security
// review", "architecture review"). A title counts only when it's a real review:
//   starts with "Review", says weekly/unit/course/final(s) review, or names a final, quiz, exam or midterm.
function isGradedReview(note) {
  const topic = note.topic || "";
  const title = note.title || "";
  if (/\b(review|finals?|quiz(zes)?|exams?|midterms?)\b/i.test(topic)) return true;
  if (/^\s*review\b/i.test(title)) return true;
  if (/\b(weekly|unit|course|finals?)\s+review\b/i.test(title)) return true;
  return /\b(finals?|quiz(zes)?|exams?|midterms?)\b/i.test(title);
}

// The short "IN PLAIN WORDS" part at the top of a refined note, or "" if there isn't one.
function plainWords(refined) {
  const m = (refined || "").match(/^IN PLAIN WORDS\n([\s\S]*?)(?:\n\n————— YOUR NOTES|\n\n[A-Z][A-Z ,'()\-]{3,}\n|$)/);
  return m ? m[1].trim() : "";
}

// What a lesson shows on the Week page: the plain-words summary, or (in older refined notes) the
// "GOAL:" line, or else the first paragraph. Cut to about 400 characters; the full note is one click away.
function studySummary(note) {
  const text = note.refined || note.text || "";
  let s = plainWords(text);
  if (!s) { const g = text.match(/^GOAL:\s*(.+)$/m); if (g) s = g[1].trim(); }
  if (!s) s = text.split(/\n\s*\n/).map(p => p.trim()).find(p => p.length > 40) || text.trim();
  return s.length > 400 ? s.slice(0, 400).replace(/\s+\S*$/, "") + "…" : s;
}

// The tree for the sidebar: classes → groups (weeks/units) → notes in lesson order.
// Classes come newest first; groups and notes in course order.
function buildTree(notes, classes) {
  const byClass = new Map();
  for (const n of notes) {
    if (!byClass.has(n.classId)) byClass.set(n.classId, []);
    byClass.get(n.classId).push(n);
  }
  const tree = [];
  for (const [classId, list] of byClass) {
    const cls = classes.find(c => c.id === classId) || { id: classId, name: list[0].className, color: "#3a3f4b" };
    const groups = new Map();
    for (const n of list) {
      const g = splitTopic(n.topic).group;
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(n);
    }
    const groupList = [...groups].map(([name, gn]) => {
      gn.sort((a, b) => (a.order || 0) - (b.order || 0));
      return {
        name,
        notes: gn,
        first: Math.min(...gn.map(n => n.order || 0)),
        start: gn.map(n => n.date).sort()[0],
        end: gn.map(n => n.dateEnd || n.date).sort().pop(),
      };
    }).sort((a, b) => a.first - b.first || a.name.localeCompare(b.name, undefined, { numeric: true }));
    tree.push({ cls, groups: groupList, newest: list.map(n => n.date).sort().pop() });
  }
  return tree.sort((a, b) => b.newest.localeCompare(a.newest) || a.cls.name.localeCompare(b.cls.name));
}

// How many of these notes you've marked studied. progress = { noteId: "2026-11-26", ... }
function progressOf(notes, progress) {
  const done = notes.filter(n => progress && progress[n.id]).length;
  return { done, total: notes.length };
}

if (typeof module !== "undefined") module.exports = { splitTopic, lessonLabel, isGradedReview, plainWords, studySummary, buildTree, progressOf };
