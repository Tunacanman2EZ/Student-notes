// Notes Vault: LOGIC LAYER, search
// Finds notes that contain EVERY word you type (in any order). Capital letters don't matter.
// Put words in quotes to find them together: "status code" finds that exact phrase.
// Looks in the title, the topic ("Week 9 · Lesson 2"), the class name, the refined notes and your original.
// Never changes a note: it only decides which ones to show.

// Lowercase, and turn curly quotes/apostrophes into plain ones, so "don’t" finds "don't".
function normalize(s) {
  return (s || "").toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
}

// 'jwt "status code" 401' → ["jwt", "status code", "401"]
function parseQuery(query) {
  const terms = [];
  const re = /"([^"]+)"|(\S+)/g;
  let m;
  while ((m = re.exec(normalize(query)))) {
    const t = (m[1] || m[2]).trim();
    if (t) terms.push(t);
  }
  return terms;
}

// A short piece of text around the first match, on one line, for the result list.
function makeSnippet(text, terms, width = 150) {
  const flat = (text || "")
    .replace(/```\w*/g, " ")                                     // code fence marks
    .replace(/IN PLAIN WORDS|—+ YOUR NOTES \(tidied\) —+/g, " ")   // section labels in refined notes
    .replace(/\s+/g, " ").trim();
  const low = normalize(flat);
  let at = -1;
  for (const t of terms) {
    const i = low.indexOf(t);
    if (i !== -1 && (at === -1 || i < at)) at = i;
  }
  if (at === -1) return "";
  const start = Math.max(0, at - Math.floor(width / 3));
  const end = Math.min(flat.length, start + width);
  return (start > 0 ? "…" : "") + flat.slice(start, end).trim() + (end < flat.length ? "…" : "");
}

// Where a note should rank: matches in the title count most, then the topic, then the text.
const WEIGHTS = { title: 8, topic: 4, className: 2, refined: 1, text: 1 };

function searchNotes(notes, query, className = "") {
  const terms = parseQuery(query);
  const inClass = notes.filter(n => !className || n.className === className);
  if (!terms.length) return inClass.map(note => ({ note, score: 0, snippet: "", where: null }));

  const results = [];
  for (const note of inClass) {
    const fields = {};
    for (const f of Object.keys(WEIGHTS)) fields[f] = normalize(note[f]);
    const all = Object.values(fields).join("\n");
    if (!terms.every(t => all.includes(t))) continue;   // every word must be somewhere

    let score = 0;
    for (const t of terms) for (const [f, w] of Object.entries(WEIGHTS)) if (fields[f].includes(t)) score += w;

    // Which tab should open: Refined if the words are there, otherwise your Original.
    const inRefined = terms.some(t => fields.refined.includes(t));
    const inText = terms.some(t => fields.text.includes(t));
    const where = inRefined ? "refined" : inText ? "original" : null;
    const snippet = makeSnippet(where === "original" ? note.text : (note.refined || note.text), terms);
    results.push({ note, score, snippet, where });
  }
  return results.sort((a, b) => b.score - a.score);
}

if (typeof module !== "undefined") module.exports = { normalize, parseQuery, makeSnippet, searchNotes };
