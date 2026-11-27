// Notes Vault: TESTS
// Run from the project folder with:   node tests/run.js
// Every check prints nothing when it passes. Failures are listed at the end.
// These test the LOGIC layer only (js/core), the same way your API suites test routes.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { findDates } = require("../js/core/dates.js");
const { splitClass, piecesMatch, removeFacebookJunk, findLink, cleanTitle } = require("../js/core/split.js");
const { readNotesFile, mergeNotes, makeBackup, sortNotes } = require("../js/core/merge.js");
const { parseQuery, makeSnippet, searchNotes } = require("../js/core/search.js");
const { splitTopic, lessonLabel, isGradedReview, plainWords, studySummary, buildTree, progressOf } = require("../js/core/study.js");
const { studyBlocks, correctionBlocks, buildFinalPrep } = require("../js/core/finals.js");
const { backupStatus, backupMessage } = require("../js/core/backup.js");
const { codeFromName, makeClassId, findClass, migrateToV2, renameClass, mergeClasses, classStatus } = require("../js/core/classes.js");

let passed = 0;
const failed = [];
function check(name, fn) {
  try { fn(); passed++; }
  catch (err) { failed.push(`${name}\n    ${err.message.split("\n")[0]}`); }
}

// A fixed "today" (Nov 26, 2026), so date guesses are the same every run.
const NOW = new Date(2026, 10, 26);

// ---------- dates ----------
check("full date", () => assert.deepEqual(findDates("Due November 3, 2025", NOW), { start: "2025-11-03", end: null }));
check("ISO date", () => assert.deepEqual(findDates("on 2026-02-09", NOW), { start: "2026-02-09", end: null }));
check("slash date with year", () => assert.deepEqual(findDates("11/3/25", NOW), { start: "2025-11-03", end: null }));
check("slash range, no year", () => assert.deepEqual(findDates("10/27 - 11/03", NOW), { start: "2026-10-27", end: "2026-11-03" }));
check("range across new year", () => assert.deepEqual(findDates("12/22 - 1/05", NOW), { start: "2025-12-22", end: "2026-01-05" }));
check("month-name range", () => assert.deepEqual(findDates("Nov 24 - Dec 01", NOW), { start: "2026-11-24", end: "2026-12-01" }));
check("future date without a year means last year", () => assert.deepEqual(findDates("Dec 15", NOW), { start: "2025-12-15", end: null }));
check("no date", () => assert.equal(findDates("no dates here", NOW), null));

// ---------- splitting ----------
const sample = "BE999 Test\nSep 07 - Sep 14\nLesson 1: Hello\nfirst\nLesson 2\nSecond title\nmore\nLesson 2\nagain\nReview\nReview: the whole thing\n";
const pieces = splitClass(sample);
check("splits into lessons", () => assert.deepEqual(pieces.map(p => p.label), ["Lesson 1", "Lesson 2", "Lesson 2 (2)", "Review"]));
check("pieces rebuild the paste exactly", () => assert.equal(pieces.map(p => p.text).join(""), sample));
check("short intro joins Lesson 1", () => assert.ok(pieces[0].text.startsWith("BE999 Test\n")));
check("title after the colon", () => assert.equal(pieces[0].title, "Hello"));
check("title on the next line", () => assert.equal(pieces[1].title, "Second title"));
check("duplicate lesson sorts right after", () => assert.equal(pieces[2].order, 2.1));
check("'Review' then 'Review: x' is one note", () => assert.equal(pieces[3].title, "the whole thing"));
check("'Final thoughts' is a sentence, not a heading",
  () => assert.equal(splitClass("Lesson 1: A\nFinal thoughts on this\n").length, 1));
check("markdown heading", () => assert.equal(splitClass("## Lesson 3 — Loops\nx\n")[0].title, "Loops"));
check("piecesMatch catches a lost line", () => assert.equal(piecesMatch(sample, pieces.slice(1)), false));
check("Facebook 'See more' removed at the end only",
  () => assert.equal(removeFacebookJunk("see more here\nend… See more"), "see more here\nend"));
check("first link found", () => assert.equal(findLink("watch https://youtu.be/x now"), "https://youtu.be/x"));
check("a link isn't a title", () => assert.equal(cleanTitle("https://x.com"), ""));

// Example data: every class file, glued back into one paste, must split back with nothing lost.
// The demo course in examples/ (made-up notes, safe to share). Point this at your own class files to test them too.
const classDir = path.join(__dirname, "..", "examples");
for (const file of fs.readdirSync(classDir).filter(f => f.endsWith(".json"))) {
  const notes = readNotesFile(fs.readFileSync(path.join(classDir, file), "utf8"));
  check(`${file}: every note has an original`, () => assert.ok(notes.every(n => typeof n.text === "string" && n.text.length)));
  const glued = notes.map(n => n.text).join("");
  check(`${file}: split loses nothing`, () => assert.ok(piecesMatch(glued, splitClass(glued))));
}

// ---------- merging (Load a file) ----------
const mine = () => [{ id: "a", className: "C", topic: "Lesson 1", text: "my words", refined: "", title: "", date: "2026-01-01", dateEnd: null }];
check("same note again: nothing added", () => {
  const list = mine();
  assert.deepEqual(mergeNotes(list, mine()), { added: 0, updated: 0, same: 1 });
  assert.equal(list.length, 1);
});
check("refined version and new dates are added", () => {
  const list = mine();
  const r = mergeNotes(list, [{ ...mine()[0], refined: "R", date: "2026-02-02" }]);
  assert.deepEqual(r, { added: 0, updated: 1, same: 0 });
  assert.equal(list[0].refined, "R");
  assert.equal(list[0].date, "2026-02-02");
});
check("your original words never change", () => {
  const list = mine();
  mergeNotes(list, [{ ...mine()[0], text: "different words" }], i => `new${i}`);
  assert.equal(list[0].text, "my words");
  assert.equal(list.length, 2);
});
check("loading never deletes", () => {
  const list = mine();
  mergeNotes(list, []);
  assert.equal(list.length, 1);
});
check("a note without text is skipped", () => assert.equal(mergeNotes(mine(), [{ className: "C" }]).added, 0));
check("a file with no notes is refused", () => assert.throws(() => readNotesFile('{"hello": 1}')));
check("backup can be loaded back", () => assert.deepEqual(readNotesFile(makeBackup(mine())), mine()));
check("sorting: newest class first, then lesson order", () => {
  const s = sortNotes([
    { date: "2026-01-01", className: "A", order: 2 }, { date: "2026-03-01", className: "B", order: 1 },
    { date: "2026-01-01", className: "A", order: 1 }]);
  assert.deepEqual(s.map(n => n.className + n.order), ["B1", "A1", "A2"]);
});

// ---------- search ----------
const lib = [
  { id: "1", className: "BE104", topic: "Week 9 · Lesson 5", title: "401 versus 403", text: "auth notes", refined: "IN PLAIN WORDS\n401 = who are you" },
  { id: "2", className: "BE104", topic: "Week 8 · Lesson 4", title: "Hashing passwords", text: "scrypt is slow on purpose", refined: "" },
  { id: "3", className: "BE105", topic: "Unit 3 · Lesson 6", title: "gather", text: "Don’t forget await", refined: "results in input order" },
];
check("words in quotes stay together", () => assert.deepEqual(parseQuery('jwt "Status Code" 401'), ["jwt", "status code", "401"]));
check("empty search shows everything", () => assert.equal(searchNotes(lib, "  ").length, 3));
check("capital letters don't matter", () => assert.deepEqual(searchNotes(lib, "SCRYPT").map(r => r.note.id), ["2"]));
check("every word must match", () => assert.equal(searchNotes(lib, "scrypt gather").length, 0));
check("finds words in the title", () => assert.deepEqual(searchNotes(lib, "403").map(r => r.note.id), ["1"]));
check("class dropdown limits results", () => assert.deepEqual(searchNotes(lib, "", "BE105").map(r => r.note.id), ["3"]));
check("curly apostrophe matches a plain one", () => assert.equal(searchNotes(lib, "don't").length, 1));
check("found only in the original → open the Original tab", () => assert.equal(searchNotes(lib, "slow")[0].where, "original"));
check("found in refined → open the Refined tab", () => assert.equal(searchNotes(lib, "input order")[0].where, "refined"));
check("title matches rank first", () => {
  const two = [{ ...lib[1], id: "a", title: "x", text: "hashing" }, { ...lib[1], id: "b" }];
  assert.deepEqual(searchNotes(two, "hashing").map(r => r.note.id), ["b", "a"]);
});
check("snippet shows the text around the match", () => assert.ok(makeSnippet("a ".repeat(200) + "TARGET word", ["target"]).includes("TARGET word")));
check("search never changes notes", () => {
  const before = JSON.stringify(lib);
  searchNotes(lib, "401 who");
  assert.equal(JSON.stringify(lib), before);
});
check("snippet skips section labels", () => assert.ok(!makeSnippet("IN PLAIN WORDS\nscrypt is slow", ["scrypt"]).includes("IN PLAIN")));
// Real data: searching your notes works on every class
const every = fs.readdirSync(classDir).filter(f => f.endsWith(".json"))
  .flatMap(f => readNotesFile(fs.readFileSync(path.join(classDir, f), "utf8")));
check("example notes: '401' is found in DEMO101", () => assert.ok(searchNotes(every, "401", "DEMO101: Building Web APIs").length >= 1));
check("example notes: nonsense finds nothing", () => assert.equal(searchNotes(every, "zzqqxx").length, 0));

// ---------- classes (data version 2) ----------
check("course code from a name", () => assert.equal(codeFromName("BE104: Securing Your API"), "BE104"));
check("no code in a name", () => assert.equal(codeFromName("Motivation Psychology"), ""));
check("ids never clash", () => assert.equal(makeClassId("BE104: other", new Set(["be104"])), "be104-2"));
check("id from a plain name", () => assert.equal(makeClassId("Cognitive Biases & Decision Making", new Set()), "cognitive-biases-decision-making"));
const v1 = [
  { id: "1", className: "BE104: Securing Your API", topic: "Week 7 · Lesson 1", text: "a", date: "2026-09-07", dateEnd: "2026-09-14" },
  { id: "2", className: "BE105: Scaling Flask APIs", topic: "Unit 1 · Lesson 1", text: "b", date: "2026-10-05", dateEnd: "2026-10-12" },
  { id: "3", className: "BE104: Securing Your API", topic: "Week 7 · Lesson 2", text: "c", date: "2026-09-07", dateEnd: "2026-09-14" },
];
const moved = migrateToV2(v1, "AAS in AI Software Engineering");
check("move to v2: one class per class name", () => assert.deepEqual(moved.classes.map(c => c.id), ["be104", "be105"]));
check("move to v2: every note points at its class", () => assert.deepEqual(moved.notes.map(n => n.classId), ["be104", "be105", "be104"]));
check("move to v2: words, ids and order unchanged", () => assert.deepEqual(moved.notes.map(n => [n.id, n.text]), v1.map(n => [n.id, n.text])));
check("move to v2: the old notes aren't touched", () => assert.equal(v1[0].classId, undefined));
check("move to v2: program filled in", () => assert.equal(moved.classes[0].program, "AAS in AI Software Engineering"));
check("rename: notes follow, old name kept", () => {
  const { notes, classes } = migrateToV2(v1);
  assert.ok(renameClass(classes, notes, "be104", "BE104: Authentication, Authorization, and Middleware"));
  assert.deepEqual(notes.filter(n => n.classId === "be104").map(n => n.className), Array(2).fill("BE104: Authentication, Authorization, and Middleware"));
  assert.deepEqual(classes[0].aliases, ["BE104: Securing Your API"]);
  assert.equal(findClass(classes, "be104: securing your api").id, "be104");
});
check("rename to another class's name is refused", () => {
  const { notes, classes } = migrateToV2(v1);
  assert.equal(renameClass(classes, notes, "be104", "BE105: Scaling Flask APIs"), false);
});
check("THE OLD PROBLEM: rename, then load the old class file again: no doubles", () => {
  const { notes, classes } = migrateToV2(v1);
  renameClass(classes, notes, "be104", "BE104: Real Name");
  const r = mergeNotes(notes, v1.map(n => ({ ...n, refined: "R" })), i => `x${i}`, classes);
  assert.deepEqual([r.added, r.updated], [0, 3]);
  assert.equal(notes.length, 3);
  assert.equal(classes.length, 2);
});
check("loading a brand-new class makes its record", () => {
  const { notes, classes } = migrateToV2(v1);
  mergeNotes(notes, [{ className: "SPCH100: Public Speaking", topic: "Week 5 · Lesson 1", text: "z", date: "2026-08-24" }], i => `n${i}`, classes);
  assert.equal(classes.length, 3);
  assert.equal(notes[3].classId, "spch100");
});
check("a backup's classes bring older names along", () => {
  const { classes } = migrateToV2(v1);
  mergeClasses(classes, [{ id: "be104", name: "BE104: Real Name", aliases: ["BE104: Securing Your API"], color: "#000" }]);
  assert.equal(classes.length, 2);
  assert.ok(findClass(classes, "BE104: Real Name"));
});
check("class status from dates", () => {
  assert.equal(classStatus(moved.notes, "be104", "2026-11-26"), "done");
  assert.equal(classStatus(moved.notes, "be105", "2026-10-07"), "current");
  assert.equal(classStatus(moved.notes, "be105", "2026-01-01"), "upcoming");
  assert.equal(classStatus(moved.notes, "be104", "2026-11-26", "current"), "current");   // what you picked wins
});
check("example notes: moving all 25 classes to v2 keeps every word", () => {
  const m = migrateToV2(every);
  assert.equal(m.classes.length, new Set(every.map(n => n.className)).size);
  assert.ok(m.notes.every((n, i) => n.text === every[i].text && n.classId));
});
check("backup v2 holds classes and profile", () => {
  const b = JSON.parse(makeBackup(moved.notes, moved.classes, { id: "u1", displayName: "T" }));
  assert.equal(b.version, 2);
  assert.equal(b.classes.length, 2);
  assert.equal(readNotesFile(makeBackup(moved.notes)).length, 3);
});

// ---------- study mode ----------
check("topic splits into week + lesson", () => assert.deepEqual(splitTopic("Week 9 · Lesson 2"), { group: "Week 9", item: "Lesson 2" }));
check("lesson label doesn't repeat itself", () => {
  assert.equal(lessonLabel("Review", "Review: API basics"), "Review: API basics");
  assert.equal(lessonLabel("Lesson 2", "Routes"), "Lesson 2: Routes");
  assert.equal(lessonLabel("Lesson 2", ""), "Lesson 2");
});
check("a class without weeks", () => assert.deepEqual(splitTopic("Lesson 3"), { group: "Lessons", item: "Lesson 3" }));
check("reviews and finals are spotted", () => {
  assert.ok(isGradedReview({ topic: "Week 9 · Review" }));
  assert.ok(isGradedReview({ topic: "Final" }));
  assert.ok(isGradedReview({ topic: "Lesson 13", title: "Weekly review stacks & queues" }));
  assert.ok(!isGradedReview({ topic: "Week 9 · Lesson 2", title: "Issuing a signed token" }));
});
check("lessons ABOUT reviewing are not reviews", () => {
  assert.ok(!isGradedReview({ topic: "Week 10 · Lesson 4", title: "Challenge: end-to-end security review of your API" }));
  assert.ok(!isGradedReview({ topic: "Unit 4 · Lesson 6", title: "Challenge: architecture review and recap" }));
  assert.ok(!isGradedReview({ topic: "Lesson 7", title: "Removing Items (Review of Lesson 6)" }));
});
check("real reviews, finals, quizzes and exams are still blocked", () => {
  assert.ok(isGradedReview({ topic: "Week 10 · Review", title: "Review: authentication, authorization, and middleware" }));
  assert.ok(isGradedReview({ topic: "Week 10 · Lesson 1", title: "What web security is: lesson chat and finals review" }));
  assert.ok(isGradedReview({ topic: "Week 3 · Lesson 9", title: "Unit review: routes" }));
  assert.ok(isGradedReview({ topic: "Lesson 12", title: "Practice quiz" }));
  assert.ok(isGradedReview({ topic: "Lesson 12", title: "Midterm exam prep" }));
  assert.ok(isGradedReview({ topic: "Week 4 · Lesson 1", title: "Final project" }));
  assert.ok(!isGradedReview({ topic: "Week 4 · Lesson 1", title: "Finalizing the schema" }));
});
check("plain-words summary is pulled out", () =>
  assert.equal(plainWords("IN PLAIN WORDS\nShort version.\nLine two.\n\n————— YOUR NOTES (tidied) —————\n\nlong"), "Short version.\nLine two."));
check("no summary → empty", () => assert.equal(plainWords("just notes"), ""));
check("summary stops before a heading like CORRECTION", () => assert.equal(plainWords("IN PLAIN WORDS\nA.\n\nCORRECTION\nB"), "A."));
const tree = buildTree(moved.notes, moved.classes);
check("tree: newest class first", () => assert.deepEqual(tree.map(t => t.cls.id), ["be105", "be104"]));
check("tree: weeks hold their lessons in order", () => {
  const w7 = tree[1].groups[0];
  assert.equal(w7.name, "Week 7");
  assert.deepEqual(w7.notes.map(n => n.id), ["1", "3"]);
});
check("progress counts reviewed lessons", () => assert.deepEqual(progressOf(moved.notes, { "1": "2026-11-26" }), { done: 1, total: 3 }));
check("example notes: every DEMO101 week is found, in order", () => {
  const m = migrateToV2(every);
  const demo = buildTree(m.notes, m.classes).find(t => t.cls.code === "DEMO101");
  assert.deepEqual(demo.groups.map(g => g.name), ["Week 1", "Week 2"]);
});
check("example notes: every note lands in exactly one group", () => {
  const m = migrateToV2(every);
  const count = buildTree(m.notes, m.classes).flatMap(t => t.groups).reduce((s, g) => s + g.notes.length, 0);
  assert.equal(count, every.length);
});
check("summary falls back to the GOAL line", () => assert.equal(studySummary({ refined: "GOAL: Learn loops.\n\nmore" }), "Learn loops."));
check("long summaries are cut, ending at a whole word", () => {
  const s = studySummary({ refined: "IN PLAIN WORDS\n" + "word ".repeat(200) });
  assert.ok(s.length <= 401 && s.endsWith("word…"));
});
check("example notes: EVERY note gets something to show on the Week page", () => assert.ok(every.every(n => studySummary(n).length > 0)));
check("example notes: most refined notes have a summary", () => {
  const refined = every.filter(n => n.refined);
  assert.ok(refined.filter(n => plainWords(n.refined)).length / refined.length > 0.5);
});

// ---------- final prep ----------
const prepNote = { refined: "IN PLAIN WORDS\nshort\n\n————— YOUR NOTES (tidied) —————\n\nintro\nCheat sheet:\nA = 1\nB = 2\n\n\nother stuff\nFor finals:\n```python\nx = 1\n\n\ny = 2\n```\nGame dev fact: fun\n\nCORRECTION\nThe notes said X; it's Y.\n\nCORRECTION (game fact)\nDoom.\n" };
check("finds study blocks", () => assert.deepEqual(studyBlocks(prepNote).map(b => b.split("\n")[0]), ["Cheat sheet:", "For finals:"]));
check("a block ends at two blank lines", () => assert.equal(studyBlocks(prepNote)[0], "Cheat sheet:\nA = 1\nB = 2"));
check("blank lines inside code don't end a block", () => assert.ok(studyBlocks(prepNote)[1].includes("y = 2")));
check("the game-dev reward isn't a study line", () => assert.ok(!studyBlocks(prepNote)[1].includes("fun")));
check("a block stops at a numbered section title", () =>
  assert.equal(studyBlocks({ text: "For finals:\nknow A\n3. Target package layout: feature areas\nmore" })[0], "For finals:\nknow A"));
check("very long blocks are cut with a pointer to the note", () =>
  assert.ok(studyBlocks({ text: "Cheat sheet\n" + "line\n".repeat(40) })[0].endsWith("(open the note for the rest)")));
check("corrections found, game-fact fixes left out", () => assert.deepEqual(correctionBlocks(prepNote), ["CORRECTION\nThe notes said X; it's Y."]));
check("example notes: DEMO101 final prep has both weeks, its study lines and its one real correction", () => {
  const m = migrateToV2(every);
  const p = buildFinalPrep(m.notes, m.classes, "demo101");
  assert.deepEqual(p.weeks.map(w => w.name), ["Week 1", "Week 2"]);
  assert.equal(p.counts.lessons, 8);
  assert.deepEqual([p.counts.study, p.counts.fixes], [4, 1], JSON.stringify(p.counts));   // the game-fact fix stays out
});
check("example notes: every code box in a study block is closed", () => {
  const m = migrateToV2(every);
  for (const c of m.classes) for (const w of buildFinalPrep(m.notes, m.classes, c.id).weeks)
    for (const l of w.lessons) for (const b of [...l.study, ...l.fixes]) assert.equal((b.match(/^```/gm) || []).length % 2, 0, l.note.topic);
});
const MAXL = 18 + 15 + 2;   // 18 lines, or a long code box cut at 33 + its closing line + the pointer
check("example notes: no study block is empty or huge", () => {
  const m = migrateToV2(every);
  for (const c of m.classes) for (const w of buildFinalPrep(m.notes, m.classes, c.id).weeks)
    for (const l of w.lessons) for (const b of l.study) assert.ok(b.split("\n").length >= 2 && b.split("\n").length <= MAXL, l.note.topic);
});

// ---------- backup reminders ----------
const NOW_ISO = "2026-11-26T20:00:00.000Z";
check("no notes: nothing to back up", () => assert.equal(backupStatus({ noteCount: 0, now: NOW_ISO }).level, "none"));
check("notes but never backed up: big reminder", () => assert.deepEqual(
  [backupStatus({ noteCount: 5, now: NOW_ISO }).level, backupStatus({ noteCount: 5, now: NOW_ISO }).banner], ["never", true]));
check("backup has everything: no reminder", () => assert.equal(
  backupStatus({ noteCount: 5, lastBackupOn: "2026-11-20T00:00:00Z", changedOn: "2026-11-19T00:00:00Z", now: NOW_ISO }).level, "ok"));
check("changed since a recent backup: small dot only", () => {
  const s = backupStatus({ noteCount: 5, lastBackupOn: "2026-11-24T00:00:00Z", changedOn: "2026-11-25T00:00:00Z", now: NOW_ISO });
  assert.deepEqual([s.level, s.banner, s.days], ["changed", false, 2]);
});
check("changed, and the backup is 7+ days old: big reminder", () => {
  const s = backupStatus({ noteCount: 5, lastBackupOn: "2026-11-14T00:00:00Z", changedOn: "2026-11-25T00:00:00Z", now: NOW_ISO });
  assert.deepEqual([s.level, s.banner, s.days], ["stale", true, 12]);
});
check("an old backup with NO changes since is still fine", () => assert.equal(
  backupStatus({ noteCount: 5, lastBackupOn: "2026-10-01T00:00:00Z", changedOn: "2026-09-30T00:00:00Z", now: NOW_ISO }).level, "ok"));
check("'Remind me tomorrow' hides the big reminder until then", () => {
  assert.equal(backupStatus({ noteCount: 5, now: NOW_ISO, snoozeUntil: "2026-11-27T20:00:00Z" }).banner, false);
  assert.equal(backupStatus({ noteCount: 5, now: NOW_ISO, snoozeUntil: "2026-11-25T20:00:00Z" }).banner, true);
});
check("messages are plain words", () => assert.ok(backupMessage({ level: "stale", days: 12 }).includes("12 days ago")));

// ---------- sharing (in its own file) ----------
require("./share.test.js")(check);
require("./library.test.js")(check);

// ---- Step 2L: fresh scripts after every update ----
{
  const { stampVersion } = require("../tools/stamp-version.js");
  const html = require("fs").readFileSync(require("path").join(__dirname, "..", "index.html"), "utf8");
  const out = stampVersion(html, "abc1234");
  const links = (html.match(/<script[^>]*src="[^"]+\.js"|<link[^>]*href="[^"]+\.css"/g) || []).length;
  check("stamp: every script and style link gets the version", () => assert.equal((out.match(/\?v=abc1234/g) || []).length, links));
  check("stamp: the app has links to stamp", () => assert.ok(links >= 20));
  check("stamp: nothing else in the page changes", () => assert.equal(out.replace(/\?v=abc1234/g, ""), html));
  check("stamp: web addresses and already-stamped links are left alone", () => {
    const t = '<script src="https://x.com/a.js"></script><script src="js/b.js?v=old"></script><link rel="stylesheet" href="style.css">';
    assert.equal(stampVersion(t, "n"), '<script src="https://x.com/a.js"></script><script src="js/b.js?v=old"></script><link rel="stylesheet" href="style.css?v=n">');
  });
}

// ---------- result ----------
console.log(`${passed} passed, ${failed.length} failed`);
if (failed.length) { console.log("\nFAILED:\n  " + failed.join("\n  ")); process.exit(1); }
