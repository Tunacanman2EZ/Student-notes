// Notes Vault: LOGIC LAYER, dates
// Finds dates like "November 3, 2025", "Nov 3", "11/3/25", "10/27", "2025-11-03".
// Also finds a range like "10/27 - 11/03". Returns { start, end } as "YYYY-MM-DD".
//
// Logic files never touch the page. That's why they can be tested on their own (tests/).
// "now" can be passed in, so tests always get the same answer no matter what day they run.

const MONTHS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];

function pad(n) { return String(n).padStart(2, "0"); }

function today(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// No year written? Use this year, unless that would be in the future: then last year.
function guessYear(month, day, now = new Date()) {
  const thisYear = now.getFullYear();
  const candidate = `${thisYear}-${pad(month)}-${pad(day)}`;
  return candidate > today(now) ? thisYear - 1 : thisYear;
}

function fullYear(y) { return y.length === 2 ? "20" + y : y; }

function findDates(text, now = new Date()) {
  let m;

  // Range: 10/27 - 11/03   (years optional)
  m = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s*(?:-|–|—|to)\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (m) {
    const y1 = m[3] ? fullYear(m[3]) : guessYear(m[1], m[2], now);
    const y2 = m[6] ? fullYear(m[6]) : (Number(m[4]) < Number(m[1]) ? Number(y1) + 1 : y1);
    return { start: `${y1}-${pad(m[1])}-${pad(m[2])}`, end: `${y2}-${pad(m[4])}-${pad(m[5])}` };
  }

  // Range with month names: Nov 24 - Dec 01   (years optional)
  const MON = "(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?";
  m = text.match(new RegExp(`\\b${MON}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(20\\d\\d))?\\s*(?:-|–|—|to)\\s*${MON}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(20\\d\\d))?`, "i"));
  if (m) {
    const mo1 = MONTHS.indexOf(m[1].toLowerCase()) + 1, mo2 = MONTHS.indexOf(m[4].toLowerCase()) + 1;
    const y1 = m[3] || m[6] || guessYear(mo1, m[2], now);
    const y2 = m[6] || (mo2 < mo1 ? Number(y1) + 1 : y1);
    return { start: `${y1}-${pad(mo1)}-${pad(m[2])}`, end: `${y2}-${pad(mo2)}-${pad(m[5])}` };
  }

  // 2025-11-03
  m = text.match(/\b(20\d\d)-(\d{1,2})-(\d{1,2})\b/);
  if (m) return { start: `${m[1]}-${pad(m[2])}-${pad(m[3])}`, end: null };

  // 11/3/2025 or 11/3/25 or 11/3
  m = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (m && Number(m[1]) <= 12 && Number(m[2]) <= 31) {
    const y = m[3] ? fullYear(m[3]) : guessYear(m[1], m[2], now);
    return { start: `${y}-${pad(m[1])}-${pad(m[2])}`, end: null };
  }

  // November 3, 2025  /  Nov 3
  m = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(20\d\d))?/i);
  if (m) {
    const month = MONTHS.indexOf(m[1].toLowerCase()) + 1;
    const y = m[3] || guessYear(month, m[2], now);
    return { start: `${y}-${pad(month)}-${pad(m[2])}`, end: null };
  }

  return null;
}

// In the browser these functions are simply available to the other files.
// In Node (the tests), this line hands them over.
if (typeof module !== "undefined") module.exports = { pad, today, guessYear, fullYear, findDates };
