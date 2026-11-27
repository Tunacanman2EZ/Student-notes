# Step 2L: Fresh scripts after every update

## The problem
After Step 2K went live, your browser kept running the old Compare for about 10 minutes, even after a reload.
GitHub Pages tells browsers they may keep its files for up to 10 minutes. The page asked for `js/ui/compare.js`,
and the browser said "I already have that" and used its saved copy. The fix was on the site, but you couldn't see it.

## The fix, in plain words
When the site is published, every script and style link in `index.html` gets the update's id stuck on the end:

    js/ui/compare.js   →   js/ui/compare.js?v=3f9c2a1

Each update has a new id, so it's a new address, and the browser has no saved copy of it. It has to download the new file.
Same files, new name tag.

## How it's built
- `tools/stamp-version.js`: `stampVersion(html, version)` adds `?v=<version>` to every local `.js`/`.css` link.
  It leaves full web addresses (`https://...`) and links that already have a `?` alone.
- `.github/workflows/pages.yml` runs it after building the library, with the first 7 characters of the commit id
  (`${GITHUB_SHA::7}`), the same short id GitHub shows next to each commit.
- Only the **published copy** is stamped. The `index.html` in the repo never changes, so the app still works
  opened straight from a file.
- The library files were already fetched with `cache: "no-cache"`, so shared notes always show the newest version.

## Honest limit
The page itself (`index.html`) can still come from the browser's copy for a few minutes. A normal **reload** always
asks for a fresh page, and that fresh page now pulls fresh scripts. So after an update: one reload, no DevTools.

## Tests
- `node tests/run.js`: **149 checks** (4 new):
  - all 27 links get stamped
  - nothing else in the page changes
  - web addresses and already-stamped links are left alone
  - the app really has links to stamp
- **A copy of the publish build:** the same commands as `pages.yml` printed "Stamped 27 file link(s)". A real browser
  then loaded the stamped site: all 27 files were fetched with `?v=`, a class imported, and there were no page errors.

## Also in this round: the check runs on every pull request
`protect-main` is now **Active** and requires the "check". The check used to run only on pull requests with share
files, so app updates never got one and could only be merged with your admin bypass.
Now `check-contributions.yml` runs on every pull request and first decides what kind it is:
- **A share** (touches `contributions/`): same as before. Only share files may change, and each one gets the app's safety rules.
- **An app update** (no share files): runs `node tests/run.js` instead.

A pull request that mixes app code and share files still fails. A share must be share files only.
Classmates can't merge anything either way, because only you have write access.
