// Notes Vault: stamps every script and style link in the published index.html with a version,
// e.g. js/main.js → js/main.js?v=3f9c2a1, so browsers fetch the new files after each update
// instead of running a saved copy of the old ones (GitHub Pages lets browsers keep files ~10 minutes).
// Runs only when the site is published (pages.yml). The index.html in the repo is never changed,
// so the app still works opened straight from a file.
//   node tools/stamp-version.js <site folder> <version>
const fs = require("fs");
const path = require("path");

function stampVersion(html, version) {
  const v = encodeURIComponent(version);
  return html.replace(/(<(?:script|link)\b[^>]*?\b(?:src|href)=")([^"?#]+\.(?:js|css))(")/g,
    (all, before, file, after) => /^[a-z]+:|^\/\//i.test(file) ? all : `${before}${file}?v=${v}${after}`);
}

if (require.main === module) {
  const [site, version] = process.argv.slice(2);
  if (!site || !version) { console.error("Usage: node tools/stamp-version.js <site folder> <version>"); process.exit(1); }
  const file = path.join(site, "index.html");
  const before = fs.readFileSync(file, "utf8");
  const after = stampVersion(before, version);
  const count = (after.match(/\?v=/g) || []).length;
  if (!count) { console.error("No script or style links found to stamp."); process.exit(1); }
  fs.writeFileSync(file, after);
  console.log(`Stamped ${count} file link(s) with version ${version}.`);
}

module.exports = { stampVersion };
