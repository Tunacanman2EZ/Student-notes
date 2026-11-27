// Notes Vault: builds the organized library from contributions/, for the website.
// Run:   node tools/build-library.js [output folder]     (default: the repo folder itself)
// Writes:
//   <out>/library/index.json        every class in the library: name, lessons, how many classmates
//   <out>/library/<class>.json      one class: lessons in order, each with every classmate's version
// GitHub runs this each time the site is published (.github/workflows/pages.yml), so the library
// on the website is always up to date, and nothing generated is ever committed to the repo.

const fs = require("node:fs");
const path = require("node:path");
const { buildLibrary } = require("../js/core/library.js");

const root = path.join(__dirname, "..");
const out = path.resolve(process.argv[2] || root);
const dir = path.join(root, "contributions");
const contributions = fs.readdirSync(dir).filter(f => f.endsWith(".json")).map(name => {
  try { return { name, file: JSON.parse(fs.readFileSync(path.join(dir, name), "utf8")) }; }
  catch { return { name, file: null }; }
});

const { index, classes, skipped } = buildLibrary(contributions);
fs.mkdirSync(path.join(out, "library"), { recursive: true });
fs.writeFileSync(path.join(out, "library", "index.json"), JSON.stringify(index, null, 2));
for (const [key, cls] of Object.entries(classes)) {
  fs.writeFileSync(path.join(out, "library", `${key}.json`), JSON.stringify(cls, null, 2));
}
console.log(`Library: ${index.classes.length} class(es) from ${contributions.length - skipped.length} share file(s).`);
for (const s of skipped) console.log(`  skipped ${s.name}: ${s.problems.join("; ")}`);
