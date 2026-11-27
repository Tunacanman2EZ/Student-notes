// Notes Vault: sharing rules (run with: node tests/share.test.js, or through node tests/run.js)
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { hidePersonalInfo, shareCheck, buildContribution, contributionFileName, validateContribution } = require("../js/core/share.js");
const { migrateToV2 } = require("../js/core/classes.js");

module.exports = function shareTests(check) {
  const v1 = [
    { id: "a", className: "DEMO101: Building Web APIs", topic: "Week 1 · Lesson 1", title: "Intro", order: 101, date: "2026-01-05", text: "orig a", refined: "IN PLAIN WORDS\nA. Mail me at real.person@gmail.com or 505-555-0142." },
    { id: "b", className: "DEMO101: Building Web APIs", topic: "Week 1 · Lesson 2", title: "Routes", order: 102, date: "2026-01-05", text: "orig b", refined: "B. Example user: player1@example.com" },
    { id: "c", className: "DEMO101: Building Web APIs", topic: "Week 1 · Review", title: "Review: basics", order: 150, date: "2026-01-05", text: "review", refined: "answers" },
    { id: "d", className: "DEMO101: Building Web APIs", topic: "Week 1 · Lesson 3", title: "Chat", order: 103, date: "2026-01-05", text: "x", refined: "Tutor said hi\n\nYOU: my own words\n" },
    { id: "e", className: "DEMO101: Building Web APIs", topic: "Week 1 · Lesson 4", title: "Locked", order: 104, date: "2026-01-05", text: "secret", refined: "secret", private: true },
    { id: "f", className: "DEMO101: Building Web APIs", topic: "Final", title: "Final exam", order: 1000, date: "2026-01-05", text: "final", refined: "final" },
  ];
  const { notes, classes } = migrateToV2(v1);
  const cls = classes[0];
  const profile = { id: "abc123-random", displayName: "Alex", program: "AAS" };
  const all = notes.map(n => n.id);

  check("share: emails and phone numbers are hidden", () => assert.equal(hidePersonalInfo("a@gmail.com, (505) 555-0142").text, "[hidden], [hidden]"));
  check("share: example addresses in code samples stay", () => assert.equal(hidePersonalInfo("player1@example.com").hidden, 0));
  check("share: reviews are never allowed", () => assert.equal(shareCheck(notes[2]).allowed, false));
  check("share: finals are never allowed", () => assert.equal(shareCheck(notes[5]).allowed, false));
  check("share: locked notes are never allowed", () => assert.equal(shareCheck(notes[4]).allowed, false));
  check("share: a pasted lesson (tutor's opening, no YOU: lines) is never allowed", () =>
    assert.deepEqual(shareCheck({ topic: "Week 2 · Lesson 1", title: "Objects", text: "Tue, Sep 15\n\nWelcome to your next lesson: Objects.\n\nI'm preparing your personalized lesson...", refined: "IN PLAIN WORDS\nObjects group values." }), { allowed: false, reason: "Lesson chats are never shared" }));
  check("share: the other tutor opening is caught too", () =>
    assert.equal(shareCheck({ topic: "Week 2 · Lesson 2", title: "Arrays", text: "I'm getting your lesson ready, using what you've learned", refined: "x" }).allowed, false));
  check("share: your own notes that mention a lesson are still allowed", () =>
    assert.equal(shareCheck({ topic: "Week 2 · Lesson 3", title: "Loops", text: "In the next lesson we use while loops.", refined: "Loops repeat code." }).allowed, true));
  check("check: a contribution with a pasted lesson as its original is refused", () => {
    const f = buildContribution({ notes, cls, profile, pickedIds: all, includeOriginals: true }).file;
    f.lessons[0].original = "Welcome to your next lesson: Intro.";
    assert.ok(validateContribution(f).some(p => p.includes("lesson chats")));
  });
  check("share: a note with your own chat lines (a lesson chat) is never allowed", () => assert.deepEqual(shareCheck(notes[3]), { allowed: false, reason: "Lesson chats are never shared" }));
  check("share: a note titled 'lesson chat' is never allowed, even without YOU: lines", () =>
    assert.equal(shareCheck({ topic: "Week 1 · Lesson 4", title: "Routes: lesson chat", refined: "Tutor: hi" }).allowed, false));
  check("share: end-of-lesson notes and your own notes are allowed", () => {
    assert.equal(shareCheck(notes[0]).allowed, true);
    assert.equal(shareCheck({ topic: "Week 1 · Lesson 4", title: "My notes on building a chat server", refined: "I wrote this myself." }).allowed, true);
  });
  const { file, report } = buildContribution({ notes, cls, profile, pickedIds: all, now: "2026-11-26T00:00:00Z" });
  check("share: even if EVERYTHING is ticked, reviews/finals/locked/lesson chats stay out", () =>
    assert.deepEqual(file.lessons.map(l => l.topic), ["Week 1 · Lesson 1", "Week 1 · Lesson 2"]));
  check("share: the report counts it all", () => assert.deepEqual(report, { shared: 2, blocked: 4, notPicked: 0, hidden: 2 }));
  check("share: no email or phone left in the file", () => assert.ok(!/gmail|555-0142/.test(JSON.stringify(file))));
  check("share: originals stay home unless you tick the box", () => assert.ok(file.lessons.every(l => l.original === "")));
  check("share: …and go along when you do", () => assert.equal(
    buildContribution({ notes, cls, profile, pickedIds: all, includeOriginals: true }).file.lessons[0].original, "orig a"));
  check("share: only display name + random id identify you", () => assert.deepEqual(file.contributor, { id: "abc123-random", displayName: "Alex" }));
  check("share: unticked lessons stay home", () => assert.equal(buildContribution({ notes, cls, profile, pickedIds: ["b"] }).file.lessons.length, 1));
  check("share: the app's own file passes GitHub's check", () => assert.deepEqual(validateContribution(file), []));
  check("share: file name is safe", () => assert.equal(contributionFileName(file), "alex-abc123-demo101-2026-11-26.json"));

  // Someone edits a share file by hand to sneak things in: the check catches each one.
  const sneaky = (change) => { const f = JSON.parse(JSON.stringify(file)); change(f); return validateContribution(f); };
  check("check: a review slipped in is caught", () => assert.ok(sneaky(f => f.lessons.push({ ...f.lessons[0], topic: "Week 1 · Review", title: "Review: x" })).some(p => p.includes("reviews"))));
  check("check: a final slipped in is caught", () => assert.ok(sneaky(f => f.lessons.push({ ...f.lessons[0], topic: "Final", title: "" })).length));
  check("check: an email put back is caught", () => assert.ok(sneaky(f => { f.lessons[0].refined += " me@gmail.com"; }).some(p => p.includes("email"))));
  check("check: an email as the display name is caught", () => assert.ok(sneaky(f => { f.contributor.displayName = "me@gmail.com"; }).length));
  check("check: a lesson chat slipped in is caught (by its YOU: lines)", () =>
    assert.ok(sneaky(f => { f.lessons[0].refined += "\nYOU: what's a route?"; }).some(p => p.includes("lesson chats"))));
  check("check: …or by its title", () => assert.ok(sneaky(f => { f.lessons[0].title = "Intro: lesson chat"; }).some(p => p.includes("lesson chats"))));
  check("check: …or hidden in the originals", () => assert.ok(sneaky(f => { f.lessons[0].original = "YOU: hi"; }).some(p => p.includes("lesson chats"))));
  check("check: the same lesson twice is caught", () => assert.ok(sneaky(f => f.lessons.push(f.lessons[0])).some(p => p.includes("twice"))));
  check("check: something that isn't a share file is refused", () => assert.deepEqual(validateContribution({ hello: 1 }), ["Not a Notes Vault contribution file"]));

  // The command GitHub runs
  check("tools/check-contributions.js passes a good file and fails a bad one", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nv-"));
    const good = path.join(tmp, "alex-abc123-demo101-2026-11-26.json");
    const bad = path.join(tmp, "bad-file.json");
    fs.writeFileSync(good, JSON.stringify(file));
    fs.writeFileSync(bad, JSON.stringify({ ...file, lessons: [{ ...file.lessons[0], topic: "Final" }] }));
    const tool = path.join(__dirname, "..", "tools", "check-contributions.js");
    execFileSync("node", [tool, good]);   // throws if it fails
    assert.throws(() => execFileSync("node", [tool, bad], { stdio: "pipe" }));
  });
};
