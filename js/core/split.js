// Notes Vault: LOGIC LAYER, splitting a whole class into lessons
// A new piece starts at any line that begins with "Lesson <number>:" or "Final:".
// Each piece is an exact slice of what you pasted, so nothing is lost:
// putting all the pieces back together gives your paste back, letter for letter.

// Headings that start a new note: "Lesson 3:", "Final:", "Review:", "Quiz:", "Exam:"
// Anything after the colon ("Lesson 1: Welcome to CS102") becomes the note's title.
// A heading can also be the word alone on its line ("Lesson 1", "Week #3 Review").
// Then the NEXT line is used as the title.
// Also works with markdown headings ("## Lesson 1 — Recap", "# 📝 Lesson 13: Functions II"),
// double lessons ("Lesson 18 & 19") and no colon at all ("Lesson 4 Variables:").
const HEADING = /^\s*(?:#{1,6}\s*)?(?:[^\w\s*•\-#]{1,2}\s*)?(lesson\s*(\d+)(?:\s*(?:&|and)\s*\d+)?|final|review|quiz|exam|project|week\s*#?\s*\d+\s*review)\b\s*(?:[:\-–—]\s*(.*)|\s+(\S.*)|\s*$)/i;

// Clean a heading title: drop stray symbols Facebook leaves at the end, like "\" or "�"
function cleanTitle(s) {
  const t = (s || "").split("�")[0].replace(/[\\�\s:]+$/, "").replace(/^[�\s•*]+/, "").trim();
  // A web link or a date isn't a title
  if (/^https?:\/\//i.test(t) || /^[\d\/\s\-–]+$/.test(t)) return "";
  return t;
}

function splitClass(text) {
  let pieces = [];
  const lines = text.split(/(?<=\n)/);   // split into lines, keeping the line breaks
  let current = null;
  let titleNext = false;   // true when the heading had no title, so the next line is the title

  for (const line of lines) {
    let h = line.match(HEADING);
    // "Final thoughts…" or "Review the code…" (no colon) are sentences, not headings.
    // Only "Lesson <number>" may skip the colon.
    if (h && !h[2] && h[4] !== undefined) h = null;
    // A heading right after an empty heading ("Review" then "Review: thinking in objects")
    // is that heading's title, not a new note.
    if (h && !h[2] && current && titleNext && current.text.trim().split("\n").length === 1) {
      current.title = cleanTitle(h[3] || h[4] || line).slice(0, 80);
      current.text += line;
      titleNext = false;
      continue;
    }
    if (h) {
      if (current) pieces.push(current);
      const word = /review/i.test(h[1]) ? "review" : h[1].replace(/\s*\d+$/, "");
      const name = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      const isProject = /^project/i.test(h[1]);
      current = {
        label: h[2] ? h[1].replace(/\s+/g, " ").replace(/^lesson/i, "Lesson") : name,   // "Lesson 3", "Lesson 18 & 19", "Final"
        order: h[2] ? Number(h[2]) : (isProject ? 900 : 1000),   // projects, then quizzes/finals, sort last
        title: cleanTitle(h[3] || h[4]).slice(0, 80),
        text: line
      };
      titleNext = !current.title;   // no title on the heading line? try the next line
    } else if (current) {
      // first non-empty line after a bare "Lesson 1" heading becomes the title
      // ...unless it's a bullet point, a numbered step, a link or a date (those are notes, not titles)
      if (titleNext && line.trim()) {
        const isBullet = /^\s*([*•◦▪\-–—]|\d+[.)])/.test(line);
        if (!isBullet && line.trim().length < 80) current.title = cleanTitle(line);
        titleNext = false;
      }
      current.text += line;
    } else {
      // text before the first "Lesson" line
      current = { label: "Intro", order: 0, text: line };
    }
  }
  if (current) pieces.push(current);

  // An empty Intro (just blank lines) is dropped.
  pieces = pieces.filter(p => !(p.label === "Intro" && !p.text.trim()));

  // A tiny Intro (up to 3 short lines, like the class name and dates) joins the
  // first lesson instead of becoming its own note.
  if (pieces.length > 1 && pieces[0].label === "Intro") {
    const introLines = pieces[0].text.trim().split("\n");
    if (introLines.length <= 3 && introLines.every(l => l.trim().length < 60)) {
      pieces[1].text = pieces[0].text + pieces[1].text;
      pieces.shift();
    }
  }

  // Same heading twice (like two "Lesson 5:")? The second one becomes "Lesson 5 (2)".
  const seen = {};
  for (const p of pieces) {
    seen[p.label] = (seen[p.label] || 0) + 1;
    if (seen[p.label] > 1) {
      p.order += (seen[p.label] - 1) / 10;   // 5 → 5.1, so it sorts right after Lesson 5
      p.label = `${p.label} (${seen[p.label]})`;
    }
  }
  return pieces;
}

// Safety check: do the pieces add back up to exactly what was pasted?
// (only blank lines at the very top are allowed to be left out)
function piecesMatch(text, pieces) {
  const joined = pieces.map(p => p.text).join("");
  const leftOut = text.slice(0, text.length - joined.length);
  return text.endsWith(joined) && !leftOut.trim();
}

// Facebook adds button text like "See less" or "… See more" to the end of a copied post.
// That's Facebook's words, not yours, so it gets removed from the END of a paste only.
function removeFacebookJunk(text) {
  return text.replace(/[ \t]*(?:…|\.\.\.)?\s*see (?:less|more)\s*$/i, "");
}

// First web link in a piece (for the Watch button)
function findLink(text) {
  const m = text.match(/https?:\/\/[^\s]+/);
  return m ? m[0] : null;
}

// What the link button on a note should say.
// A Maestro lesson page is not a video, so only real video sites get "Watch".
const VIDEO_HOSTS = ["youtube.com", "youtu.be", "vimeo.com"];
function linkLabel(url) {
  let host = "";
  try { host = new URL(url).hostname.toLowerCase(); } catch { return { text: "Open link", kind: "link" }; }
  const is = (h) => host === h || host.endsWith("." + h);
  if (is("maestro.org")) return { text: "Open lesson", kind: "lesson" };
  if (VIDEO_HOSTS.some(is)) return { text: "▶ Watch", kind: "video" };
  return { text: "Open link", kind: "link" };
}

if (typeof module !== "undefined") module.exports = { HEADING, cleanTitle, splitClass, piecesMatch, removeFacebookJunk, findLink, linkLabel };
