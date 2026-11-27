// Notes Vault: SCREEN LAYER, the Share panel
// Pick a class, tick lessons, download a share file, then upload it to the library on GitHub
// as a pull request. The rules (what can and can't be shared) live in core/share.js.

const LIBRARY_UPLOAD_URL = "https://github.com/Tunacanman2EZ/student-notes/upload/main/contributions";
const Share = { classId: "", picked: new Set(), includeOriginals: false };

function setUpSharePanel() {
  $("share-class").addEventListener("change", e => { Share.classId = e.target.value; resetSharePicks(); renderSharePanel(); });
  $("share-originals").addEventListener("change", e => { Share.includeOriginals = e.target.checked; renderSharePanel(); });
  $("share-all").addEventListener("click", () => { for (const n of shareableNotes()) Share.picked.add(n.id); renderSharePanel(); });
  $("share-none").addEventListener("click", () => { Share.picked.clear(); renderSharePanel(); });
  $("share-download").addEventListener("click", downloadShareFile);
  $("share-upload").href = LIBRARY_UPLOAD_URL;
}

function shareClassNotes() {
  return App.notes.filter(n => n.classId === Share.classId).sort((a, b) => (a.order || 0) - (b.order || 0));
}
function shareableNotes() { return shareClassNotes().filter(n => shareCheck(n).allowed); }

// When you pick a class, everything allowed starts ticked, except notes with your own chat lines.
function resetSharePicks() {
  Share.picked = new Set(shareClassNotes().filter(n => { const c = shareCheck(n); return c.allowed && c.ticked; }).map(n => n.id));
}

function renderSharePanel() {
  // class dropdown
  const pick = $("share-class");
  const tree = buildTree(App.notes, App.classes);
  if (!Share.classId || !tree.some(t => t.cls.id === Share.classId)) {
    Share.classId = tree.length ? tree[0].cls.id : "";
    resetSharePicks();
  }
  pick.innerHTML = "";
  for (const t of tree) {
    const o = document.createElement("option");
    o.value = t.cls.id; o.textContent = t.cls.name;
    pick.append(o);
  }
  pick.value = Share.classId;

  // who it's from
  const who = App.profile.displayName;
  $("share-who").textContent = who
    ? `Shared as "${who}" (your display name). Your real name and email are never included.`
    : "Set a display name first (Profile & classes). It's the only name that goes with your share.";
  $("share-who").className = who ? "muted" : "bad";

  // lesson list, week by week
  const list = $("share-list");
  list.innerHTML = "";
  const branch = tree.find(t => t.cls.id === Share.classId);
  for (const g of branch ? branch.groups : []) {
    const h = document.createElement("div");
    h.className = "final-week";
    h.textContent = g.name;
    list.append(h);
    for (const n of g.notes) {
      const c = shareCheck(n);
      const row = document.createElement("label");
      row.className = "share-row" + (c.allowed ? "" : " blocked");
      const box = document.createElement("input");
      box.type = "checkbox";
      box.disabled = !c.allowed;
      box.checked = c.allowed && Share.picked.has(n.id);
      box.addEventListener("change", () => { box.checked ? Share.picked.add(n.id) : Share.picked.delete(n.id); renderShareSummary(); });
      const name = document.createElement("span");
      name.className = "share-name";
      const { item } = splitTopic(n.topic);
      name.textContent = lessonLabel(item, n.title);
      row.append(box, name);
      const note = c.allowed ? c.warning : c.reason;
      if (note) {
        const tag = document.createElement("span");
        tag.className = "tag" + (c.allowed ? " warn" : "");
        tag.textContent = note;
        row.append(tag);
      }
      list.append(row);
    }
  }
  renderShareSummary();
}

function currentContribution() {
  const cls = App.classes.find(c => c.id === Share.classId);
  if (!cls) return null;
  return buildContribution({ notes: App.notes, cls, profile: App.profile, pickedIds: [...Share.picked], includeOriginals: Share.includeOriginals });
}

function renderShareSummary() {
  const result = currentContribution();
  const btn = $("share-download");
  if (!result) { $("share-summary").textContent = ""; btn.disabled = true; return; }
  const r = result.report;
  const parts = [`${r.shared} lesson${r.shared === 1 ? "" : "s"} will be shared`];
  if (r.blocked) parts.push(`${r.blocked} never shared (reviews, finals, lesson chats or locked)`);
  if (r.hidden) parts.push(`${r.hidden} email${r.hidden === 1 ? "" : "s"}/phone number${r.hidden === 1 ? "" : "s"} will be hidden`);
  $("share-summary").textContent = parts.join("  ·  ");
  btn.disabled = !r.shared || !App.profile.displayName;
}

function downloadShareFile() {
  const result = currentContribution();
  if (!result || !result.report.shared) return;
  const problems = validateContribution(result.file);   // the same check GitHub will run
  if (problems.length) { showMessage($("share-message"), "Can't share this yet: " + problems.join("; "), "bad"); return; }
  const blob = new Blob([JSON.stringify(result.file, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = contributionFileName(result.file);
  a.click();
  URL.revokeObjectURL(a.href);
  showMessage($("share-message"), `Saved ${a.download}. Now do steps 2 and 3 below.`, "ok");
  $("share-steps").classList.add("highlight");
}
