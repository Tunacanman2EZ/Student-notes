// Notes Vault: the app's shared state
// One object that every screen file can see: the notes, plus a way to redraw the page.
// Keeping it in one place means no file has its own hidden copy of the notes.

const App = {
  notes: [],
  classes: [],   // one record per class (see core/classes.js)
  profile: {},   // your display name and program
  progress: {},  // lessons you've marked reviewed: { noteId: date }
  classmates: [], // share files you loaded to compare with (never mixed into your notes)
  render: () => {},   // filled in by ui/list.js
};

const $ = id => document.getElementById(id);

function showMessage(el, text, kind) {
  el.textContent = text;
  el.className = kind;
}
