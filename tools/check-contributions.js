// Notes Vault: the safety check GitHub runs on every pull request to the library.
// It uses the SAME rules as the app (js/core/share.js), so a file the app made passes,
// and a file someone edited by hand to sneak in a review or an email does not.
//
// Run it yourself:   node tools/check-contributions.js contributions/some-file.json [more files...]
// With no files given, it checks every file in contributions/.

const fs = require("node:fs");
const path = require("node:path");
const { validateContribution } = require("../js/core/share.js");

const MAX_FILE_BYTES = 2 * 1024 * 1024;   // 2 MB per share file
const dir = path.join(__dirname, "..", "contributions");
let files = process.argv.slice(2);
if (!files.length) files = fs.readdirSync(dir).filter(f => f.endsWith(".json")).map(f => path.join(dir, f));

let bad = 0;
for (const file of files) {
  const problems = [];
  const name = path.basename(file);
  if (!name.endsWith(".json")) problems.push("Only .json share files go in contributions/");
  else if (!/^[a-z0-9-]+\.json$/.test(name)) problems.push("File name may only use a-z, 0-9 and - (the app names it for you)");
  let text = "";
  try { text = fs.readFileSync(file, "utf8"); } catch { problems.push("Can't read the file"); }
  if (Buffer.byteLength(text) > MAX_FILE_BYTES) problems.push("File is over 2 MB");
  if (text && !problems.length) {
    try { problems.push(...validateContribution(JSON.parse(text))); }
    catch { problems.push("Not valid JSON"); }
  }
  if (problems.length) { bad++; console.log(`✗ ${name}\n  - ${problems.join("\n  - ")}`); }
  else console.log(`✓ ${name}`);
}
console.log(`\n${files.length - bad} of ${files.length} share file(s) passed.`);
process.exit(bad ? 1 : 0);
