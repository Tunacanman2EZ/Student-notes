// Notes Vault: START HERE
// The app is built in 3 layers (like routes → services → data in BE105):
//   js/data/   DATA:   the only place notes are read or saved
//   js/core/   LOGIC:  splitting, dates, merging, sorting. No screen code, so it can be tested (tests/)
//   js/ui/     SCREEN: draws the page and handles the buttons
// This file loads last and connects them.
//
// Rule: the app NEVER changes the text you pasted. It only adds labels around it.
// A "refined" version can sit beside it, but the original always stays.

// Loading from the database takes a moment, so start() waits for it before drawing anything.
async function start() {
  const data = await loadData();
  App.notes = data.notes;
  App.classes = data.classes;
  App.profile = data.profile;
  App.progress = data.progress || {};
  App.classmates = data.classmates || [];
  App.render = renderAll;
  setUpToolbar();
  setUpSidebar();
  setUpAddBox();
  setUpBackup();
  setUpClassesPanel();
  setUpPanels();
  setUpSharePanel();
  setUpCompare();
  if (!App.notes.length) openPanel("add-panel");   // brand new? open the paste box
  App.render();
  askToKeepData();
}

start();
