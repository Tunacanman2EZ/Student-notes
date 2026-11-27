// Notes Vault: LOGIC LAYER, Final prep (one page per course, for finals)
// Finals mix all 3–4 weeks of a course, so this gathers, for every lesson of a class:
//   - its short summary
//   - its study lines: the blocks your notes already mark for exams, like "Cheat sheet",
//     "For finals", "Key exam…", "Exam line", "Memorize"
//   - its corrections: where the course notes were wrong (CORRECTION, BUG, MORE EXACT…),
//     so you never study the wrong answer
// It only reads notes. Nothing is changed.

// A line that starts a study block
const STUDY_MARK = /^\s*(?:\d+[.)]\s*)?(cheat ?sheet|for (?:your )?finals?|finals?(?: focus| review|-ready)?\b|key exam|exam (?:line|phrase|sentence|answer|tip)|memorize|phrase for finals|interview (?:phrasing|phrase)|key memory (?:line|phrase)|core rule|decision rule|quick (?:mental )?checklist|one-sentence summar|(?:ultra-?short )?cram sheet)/i;

// Lines that end a block: the reward bits at the end of a lesson, the start of a refined section, a new lesson
const BLOCK_END = /(game ?dev(?:elopment)? (?:fact|reward)|godot (?:project )?idea|reward(?: time)?|fun fact|you earned it|^\s*————|^lesson \d+\b|^review\b)/i;
// A numbered section title in your notes, like "3. Target package layout: feature areas + layers"
// (short, starts with a capital, doesn't end like a sentence)
const SECTION_TITLE = /^\s*\d{1,2}[.)]\s+[A-Z][^.!?]{2,70}$/;
// An ALL-CAPS heading in a refined note, like "CORRECTION" or "NOTES (checked by running it)"
const CAPS_HEADING = /^[A-Z][A-Z0-9 ,'’()\-:&]{3,}$/;
// The headings that mean "the course notes were wrong or incomplete here"
const FIX_HEADING = /^(CORRECTIONS?|BUG|MORE EXACT|CHECK YOUR NUMBERS|MISMATCH WITH LOGIN|DECORATOR ORDER|TWO FIXES FOR CURRENT VERSIONS|FIX FOR THE 500|IMPORTANT)\b/;

const MAX_BLOCK_LINES = 18;

// Text to read: the refined version if there is one (tidier, code already in boxes), else your original.
function prepSource(note) {
  const r = note.refined || "";
  const i = r.indexOf("————— YOUR NOTES (tidied) —————");
  if (i !== -1) return r.slice(i);          // only your notes part (the summary is shown separately)
  return r || note.text || "";
}

// Every study block in a note: the marker line plus the lines under it.
function studyBlocks(note) {
  const lines = prepSource(note).split("\n");
  const blocks = [];
  let i = 0, outerCode = false;   // a "Cheat sheet" line INSIDE a code box isn't a marker
  while (i < lines.length) {
    if (lines[i].startsWith("```")) outerCode = !outerCode;
    if (outerCode || !STUDY_MARK.test(lines[i]) || lines[i].trim().length > 120) { i++; continue; }
    const block = [lines[i]];
    let j = i + 1, inCode = false, blanks = 0;
    while (j < lines.length) {
      const l = lines[j];
      if (l.startsWith("```")) {
        inCode = !inCode;
        if (!inCode) { block.push(l); j++; continue; }   // the line that closes a code box always stays with it
      }
      if (!inCode) {
        if (BLOCK_END.test(l.trim()) || STUDY_MARK.test(l) || CAPS_HEADING.test(l.trim()) || SECTION_TITLE.test(l)) break;
        blanks = l.trim() ? 0 : blanks + 1;
        if (blanks >= 2) break;
        if (block.length >= MAX_BLOCK_LINES) { block.push("…  (open the note for the rest)"); break; }
      } else if (block.length >= MAX_BLOCK_LINES + 15) {   // a very long code box: cut it too, and close it
        block.push("```", "…  (open the note for the rest)"); inCode = false; j++; break;
      }
      block.push(l);
      j++;
    }
    if (inCode) block.push("```");   // never leave a code box half open
    const text = block.join("\n").trim();
    if (text.split("\n").length > 1) blocks.push(text);   // a marker with nothing under it isn't useful
    i = j;
  }
  return blocks;
}

// Every correction block in a refined note.
function correctionBlocks(note) {
  const lines = (note.refined || "").split("\n");
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    if (!FIX_HEADING.test(lines[i].trim()) || /game fact/i.test(lines[i])) continue;   // game-fact fixes aren't exam material
    const block = [lines[i]];
    let j = i + 1, inCode = false;
    while (j < lines.length) {
      const l = lines[j];
      if (l.startsWith("```")) inCode = !inCode;
      if (!inCode && ((CAPS_HEADING.test(l.trim()) && !/^[A-Z]{2,6}\d/.test(l.trim())) || FIX_HEADING.test(l.trim()))) break;
      block.push(l);
      j++;
    }
    blocks.push(block.join("\n").trim());
    i = j - 1;
  }
  return blocks;
}

// The whole Final prep page for one class: its weeks, and per lesson its summary, study blocks and fixes.
function buildFinalPrep(notes, classes, classId) {
  const branch = buildTree(notes.filter(n => n.classId === classId), classes)[0];
  if (!branch) return null;
  const weeks = branch.groups.map(g => ({
    name: g.name, start: g.start, end: g.end,
    lessons: g.notes.map(note => ({
      note,
      item: splitTopic(note.topic).item,
      summary: studySummary(note),
      study: studyBlocks(note),
      fixes: correctionBlocks(note),
    })),
  }));
  const all = weeks.flatMap(w => w.lessons);
  return {
    cls: branch.cls,
    weeks,
    counts: { lessons: all.length, study: all.reduce((s, l) => s + l.study.length, 0), fixes: all.reduce((s, l) => s + l.fixes.length, 0) },
  };
}

// In Node (tests), finals.js needs the study helpers too. In the browser they're already loaded.
if (typeof buildTree === "undefined" && typeof require !== "undefined") {
  var { buildTree, splitTopic, studySummary } = require("./study.js");
}

if (typeof module !== "undefined") module.exports = { STUDY_MARK, studyBlocks, correctionBlocks, buildFinalPrep };
