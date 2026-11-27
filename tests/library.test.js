// Notes Vault: the library and Compare (run through node tests/run.js)
const assert = require("node:assert/strict");
const { buildLibrary, libraryClassKey, combineLibraryClasses, newestVersion, libraryClassToNotes, libraryNotesToAdd } = require("../js/core/library.js");
const { sameCourse, compareRows, myTextFor, missingLessons, whatsNew } = require("../js/core/compare.js");
const { buildContribution, shareCheck } = require("../js/core/share.js");
const { migrateToV2 } = require("../js/core/classes.js");

module.exports = function libraryTests(check) {
  const lesson = (topic, title, order, refined) => ({ id: topic, className: "DEMO101: Building Web APIs", topic, title, order, date: "2026-01-05", text: refined, refined });
  const share = (who, id, notes, when) => {
    const m = migrateToV2(notes);
    return buildContribution({ notes: m.notes, cls: m.classes[0], profile: { id, displayName: who }, pickedIds: m.notes.map(n => n.id), now: when }).file;
  };
  const alex = share("Alex", "id-alex", [lesson("Week 1 · Lesson 1", "Intro", 101, "IN PLAIN WORDS\nAn API is a menu.\nClient asks, server answers.")], "2026-01-06T00:00:00Z");
  const samOld = share("Sam", "id-sam", [lesson("Week 1 · Lesson 1", "Intro", 101, "old version")], "2026-01-06T00:00:00Z");
  const samNew = share("Sam", "id-sam", [
    lesson("Week 1 · Lesson 1", "Intro", 101, "IN PLAIN WORDS\nAn API is a menu.\nI built mine for a game backend instead of recipes."),
    lesson("Week 1 · Lesson 2", "Routes", 102, "For finals:\n201 means Created"),
  ], "2026-01-08T00:00:00Z");
  const broken = { ...alex, lessons: [{ ...alex.lessons[0], topic: "Final" }] };
  const lib = buildLibrary([{ name: "a.json", file: alex }, { name: "s1.json", file: samOld }, { name: "s2.json", file: samNew }, { name: "bad.json", file: broken }]);
  const demo = lib.classes.demo101;

  check("library: one class, keyed by its code", () => assert.deepEqual(Object.keys(lib.classes), ["demo101"]));
  check("library: the same lesson from 2 classmates = 1 lesson with 2 versions", () => {
    assert.equal(demo.lessons.length, 2);
    assert.deepEqual(demo.lessons[0].versions.map(v => v.contributor.displayName), ["Alex", "Sam"]);
  });
  check("library: sharing again replaces your old version (no clutter)", () =>
    assert.ok(demo.lessons[0].versions.find(v => v.contributor.id === "id-sam").refined.includes("game backend")));
  check("library: a file that fails the check is left out, and says why", () =>
    assert.deepEqual([lib.skipped.length, lib.skipped[0].name], [1, "bad.json"]));
  check("library: the index counts lessons and classmates", () =>
    assert.deepEqual(lib.index.classes[0], { key: "demo101", code: "DEMO101", name: "DEMO101: Building Web APIs", lessons: 2, contributors: 2, file: "library/demo101.json" }));
  check("library: a class with no code gets a safe key", () => assert.equal(libraryClassKey({ name: "Study Skills!" }), "study-skills"));

  check("library: website library + a loaded file combine, newest version wins", () => {
    const online = buildLibrary([{ name: "a", file: alex }, { name: "s", file: samOld }]).classes.demo101;
    const loaded = buildLibrary([{ name: "s2", file: samNew }]).classes.demo101;
    const both = combineLibraryClasses(online, loaded);
    assert.equal(both.lessons.length, 2);
    assert.equal(both.lessons[0].versions.length, 2);
    assert.ok(both.lessons[0].versions[1].refined.includes("game backend"));
  });
  check("library: combining nothing gives nothing", () => assert.equal(combineLibraryClasses(null, undefined), null));

  // Compare, from Alex's side
  const mine = migrateToV2([lesson("Week 1 · Lesson 1", "Intro", 101, "IN PLAIN WORDS\nAn API is a menu.\nClient asks, server answers.")]);
  check("compare: finds the same course by code", () => assert.ok(sameCourse(mine.classes[0], demo)));
  check("compare: …or by an older name", () => assert.ok(sameCourse({ code: "", name: "X", aliases: ["DEMO101: Building Web APIs"] }, { code: "", name: "DEMO101: Building Web APIs" })));
  check("compare: a different course doesn't match", () => assert.ok(!sameCourse(mine.classes[0], { code: "BE999", name: "Other" })));
  const rows = compareRows(mine.notes, mine.classes[0], demo);
  check("compare: every lesson, yours and theirs, in order", () => assert.deepEqual(rows.map(r => [r.topic, !!r.mine, r.versions.length]),
    [["Week 1 · Lesson 1", true, 2], ["Week 1 · Lesson 2", false, 1]]));
  check("compare: lessons you're missing are flagged", () => assert.deepEqual(missingLessons(rows).map(r => r.topic), ["Week 1 · Lesson 2"]));
  check("compare: 'What's new to you' shows only their new lines", () =>
    assert.deepEqual(whatsNew(mine.notes[0].refined, demo.lessons[0].versions[1].refined), ["I built mine for a game backend instead of recipes."]));
  check("compare: capital letters and punctuation don't count as new", () => assert.deepEqual(whatsNew("An API is a menu.", "an api, is a MENU"), []));
  check("compare: nothing new when the versions match", () => assert.deepEqual(whatsNew(alex.lessons[0].refined, alex.lessons[0].refined), []));

  // Your own share is not a classmate (Alex shared Lesson 1, then opens Compare)
  const asAlex = compareRows(mine.notes, mine.classes[0], demo, "id-alex");
  check("compare: your own share isn't counted as a classmate", () => assert.deepEqual(asAlex[0].versions.map(v => v.contributor.id), ["id-sam"]));
  check("compare: …it's marked 'you shared this' instead", () => assert.deepEqual(asAlex.map(r => r.youShared), [true, false]));
  check("compare: without a profile id, everyone counts (old behaviour)", () => assert.equal(rows[0].versions.length, 2));

  // One lesson, two of your notes: the lesson notes and the lesson chat (the chat listed first on purpose)
  const withChat = migrateToV2([
    lesson("Week 1 · Lesson 1", "Intro: lesson chat", 101.5, "YOU: what is a client?\nThe client is whoever sends the request."),
    lesson("Week 1 · Lesson 1", "Intro", 101, "IN PLAIN WORDS\nAn API is a menu."),
  ]);
  const chatRows = compareRows(withChat.notes, withChat.classes[0], demo, "id-alex");
  check("compare: the lesson notes are the main note, not the chat", () => {
    assert.equal(chatRows[0].title, "Intro");
    assert.equal(chatRows[0].mine.order, 101);
    assert.deepEqual(chatRows[0].myExtras.map(n => n.title), ["Intro: lesson chat"]);
  });
  check("compare: still one row per lesson", () => assert.deepEqual(chatRows.map(r => r.topic), ["Week 1 · Lesson 1", "Week 1 · Lesson 2"]));
  check("compare: 'What's new' checks your chat too", () =>
    assert.deepEqual(whatsNew(myTextFor(chatRows[0]), "The client is whoever sends the request.\nA server answers with a status code."), ["A server answers with a status code."]));

  // ---- "Add to my notes" from the library ----
  const addLib = buildLibrary([{ name: "alex", file: alex }, { name: "sam-new", file: samNew }]).classes.demo101;
  const added = libraryClassToNotes(addLib, "2026-02-01T00:00:00Z");
  check("add: one note per lesson", () => assert.deepEqual(added.map(n => n.topic), ["Week 1 · Lesson 1", "Week 1 · Lesson 2"]));
  check("add: the newest version is used", () => assert.ok(added[0].refined.includes("game backend")));
  check("add: each note remembers who shared it", () => assert.equal(added[0].fromLibrary.displayName, "Sam"));
  check("add: the same lesson always gets the same id (adding again updates, never copies)", () =>
    assert.deepEqual(libraryClassToNotes(addLib).map(n => n.id), added.map(n => n.id)));
  check("add: dates come along", () => assert.equal(added[0].date, "2026-01-05"));
  check("add: newestVersion picks the latest share", () => assert.equal(newestVersion({ versions: [{ sharedOn: "2026-01-06" }, { sharedOn: "2026-01-08" }] }).sharedOn, "2026-01-08"));
  check("add: notes from the library can never be shared again as yours", () =>
    assert.deepEqual(shareCheck(added[0]).allowed, false));
  check("add: with your own notes for the class, only missing lessons come in", () => {
    const mine = [{ topic: "Week 1 · Lesson 1", text: "my own notes" }];
    assert.deepEqual(libraryNotesToAdd(added, mine).map(n => n.topic), ["Week 1 · Lesson 2"]);
  });
  check("add: library notes you added before still get updated", () =>
    assert.equal(libraryNotesToAdd(added, [{ ...added[0] }]).length, 2));
};
