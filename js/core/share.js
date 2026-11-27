// Notes Vault: LOGIC LAYER, sharing lessons to the library (a "contribution")
// You pick lessons; this builds the file you upload to the library as a pull request.
// The SAME rules run twice: here in the app, and again on GitHub when the pull request
// arrives (tools/check-contributions.js), so nothing unsafe can slip in either way.
//
// The rules:
//   1. Reviews, finals, quizzes and exams are NEVER shared (school rules). No setting turns this off.
//   2. Notes you locked (private) are never shared.
//   3. Emails and phone numbers are replaced with [hidden].
//   4. Only your display name and random id go with it. Never your real name or email.
//   5. Your refined notes are shared; your originals only if you tick the box.
//   6. Lesson chats (the full lesson, with "YOU:" lines) are NEVER shared: the lesson belongs to the school.
//      What you CAN share: your end-of-lesson notes and notes you wrote yourself.

const CONTRIBUTION_VERSION = 1;
const LIMITS = { lessons: 200, textChars: 60000, nameChars: 40 };

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const PHONE = /(?<![\w-])(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}(?![\w-])/g;

// Addresses made for examples (they can never belong to a real person) are fine to share,
// like player1@example.com in a code sample.
const EXAMPLE_EMAIL = /@(?:[\w-]+\.)*(?:example\.(?:com|org|net)|test|invalid|localhost)$/i;

// Replace emails and phone numbers. Returns the cleaned text and how many were hidden.
function hidePersonalInfo(text) {
  let hidden = 0;
  const clean = (text || "").replace(EMAIL, m => { if (EXAMPLE_EMAIL.test(m)) return m; hidden++; return "[hidden]"; })
                           .replace(PHONE, () => { hidden++; return "[hidden]"; });
  return { text: clean, hidden };
}

function hasPersonalInfo(text) {
  return hidePersonalInfo(text).hidden > 0;
}

// Lines you wrote to a tutor, kept in chat notes as "YOU: ..."
function hasOwnChat(note) {
  return /^YOU:/m.test(note.refined || "") || /^YOU:/m.test(note.text || "") || /^YOU:/m.test(note.original || "");
}

// A lesson chat: the whole lesson as it happened, not your notes from the end of it.
// Spotted by its title ("...lesson chat") or by "YOU:" lines (your side of the chat).
function isLessonChat(note) {
  return /\blesson chat\b/i.test(note.title || "") || hasOwnChat(note);
}

// Can this note be shared at all, and should it start ticked?
//   { allowed: false, reason }            → shown greyed out with the reason
//   { allowed: true, ticked: true|false, warning } → you decide
function shareCheck(note) {
  if (isGradedReview(note)) return { allowed: false, reason: "Reviews and finals are never shared" };
  if (note.private) return { allowed: false, reason: "You locked this note" };
  if (!(note.refined || note.text || "").trim()) return { allowed: false, reason: "Empty" };
  if (isLessonChat(note)) return { allowed: false, reason: "Lesson chats are never shared" };
  return { allowed: true, ticked: true, warning: "" };
}

// Build the contribution file for one class.
// pickedIds: the note ids you ticked. Anything not allowed is dropped even if it was ticked.
function buildContribution({ notes, cls, profile, pickedIds, includeOriginals = false, now = new Date().toISOString() }) {
  const picked = new Set(pickedIds);
  const lessons = [];
  const report = { shared: 0, blocked: 0, notPicked: 0, hidden: 0 };
  for (const n of notes.filter(x => x.classId === cls.id).sort((a, b) => (a.order || 0) - (b.order || 0))) {
    const check = shareCheck(n);
    if (!check.allowed) { report.blocked++; continue; }
    if (!picked.has(n.id)) { report.notPicked++; continue; }
    const refined = hidePersonalInfo(n.refined || "");
    const original = includeOriginals ? hidePersonalInfo(n.text || "") : { text: "", hidden: 0 };
    report.hidden += refined.hidden + original.hidden;
    const { group, item } = splitTopic(n.topic);
    lessons.push({
      group, item, title: n.title || "", topic: n.topic, order: n.order || 0,
      date: n.date || "", dateEnd: n.dateEnd || null,
      refined: refined.text || (includeOriginals ? "" : hidePersonalInfo(n.text || "").text),
      original: original.text,
    });
    report.shared++;
  }
  const file = {
    app: "notes-vault", kind: "contribution", version: CONTRIBUTION_VERSION, createdOn: now,
    contributor: { id: profile.id, displayName: (profile.displayName || "Anonymous").slice(0, LIMITS.nameChars) },
    program: profile.program || "",
    class: { code: cls.code || "", name: cls.name },
    lessons,
  };
  return { file, report };
}

// A safe file name: display name, a piece of the random id, the class, the date.
function contributionFileName(file) {
  const slug = s => (s || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30);
  return `${slug(file.contributor.displayName) || "student"}-${slug(file.contributor.id).slice(0, 6)}-${slug(file.class.code || file.class.name)}-${file.createdOn.slice(0, 10)}.json`;
}

// The check GitHub runs on every pull request (and the app's own tests). Returns a list of problems.
function validateContribution(file) {
  const problems = [];
  const isStr = v => typeof v === "string";
  if (!file || file.app !== "notes-vault" || file.kind !== "contribution") return ["Not a Notes Vault contribution file"];
  if (file.version !== CONTRIBUTION_VERSION) problems.push(`Unknown version ${file.version}`);
  if (!file.contributor || !isStr(file.contributor.id) || !file.contributor.id) problems.push("Missing contributor id");
  if (!file.contributor || !isStr(file.contributor.displayName) || file.contributor.displayName.length > LIMITS.nameChars) problems.push("Bad display name");
  if (file.contributor && hasPersonalInfo(file.contributor.displayName)) problems.push("Display name contains an email or phone number");
  if (!file.class || !isStr(file.class.name) || !file.class.name.trim()) problems.push("Missing class name");
  if (!Array.isArray(file.lessons) || !file.lessons.length) problems.push("No lessons");
  else if (file.lessons.length > LIMITS.lessons) problems.push(`Too many lessons (${file.lessons.length})`);
  const seen = new Set();
  (file.lessons || []).forEach((l, i) => {
    const where = `Lesson ${i + 1} (${l && l.topic})`;
    if (!l || !isStr(l.topic) || !isStr(l.refined) || !isStr(l.original || "")) { problems.push(`${where}: missing fields`); return; }
    if (isGradedReview(l)) problems.push(`${where}: reviews and finals can't be shared`);
    if (isLessonChat(l)) problems.push(`${where}: lesson chats can't be shared (only end-of-lesson notes and your own notes)`);
    if (hasPersonalInfo(l.refined) || hasPersonalInfo(l.original) || hasPersonalInfo(l.title)) problems.push(`${where}: contains an email or phone number`);
    if ((l.refined.length + (l.original || "").length) > LIMITS.textChars) problems.push(`${where}: too long`);
    if (seen.has(l.topic)) problems.push(`${where}: the same lesson twice`);
    seen.add(l.topic);
  });
  return problems;
}

// In Node (tests, the GitHub check), share.js needs the study helpers. In the browser they're already loaded.
if (typeof isGradedReview === "undefined" && typeof require !== "undefined") {
  var { isGradedReview, splitTopic } = require("./study.js");
}

if (typeof module !== "undefined") module.exports = {
  CONTRIBUTION_VERSION, LIMITS, hidePersonalInfo, hasPersonalInfo, hasOwnChat, isLessonChat, shareCheck,
  buildContribution, contributionFileName, validateContribution };
