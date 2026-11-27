// Notes Vault: SCREEN LAYER, the panel buttons (Add notes, Backup, Profile & classes, Library, Share)
// Three equal buttons in a row. Click one to open its panel below; click it again to close it.
// Only one panel is open at a time, so the page stays tidy.

function openPanel(id) {
  for (const tab of document.querySelectorAll(".panel-tab")) {
    const panel = $(tab.dataset.panel);
    const open = tab.dataset.panel === id;
    panel.hidden = !open;
    tab.classList.toggle("active", open);
    if (open && tab.dataset.panel === "share-panel") renderSharePanel();
    if (open && tab.dataset.panel === "library-panel") renderLibraryPanel();
    tab.setAttribute("aria-expanded", String(open));
  }
}

function setUpPanels() {
  for (const tab of document.querySelectorAll(".panel-tab")) {
    tab.setAttribute("aria-controls", tab.dataset.panel);
    tab.setAttribute("aria-expanded", "false");
    tab.addEventListener("click", () => openPanel(tab.classList.contains("active") ? null : tab.dataset.panel));
  }
}
