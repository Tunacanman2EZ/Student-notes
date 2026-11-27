// Notes Vault: SCREEN LAYER, highlighting search words
// After a note is drawn, this walks through its text and wraps each searched word in <mark>,
// which shows as a yellow highlight. It only splits text into pieces: the words themselves never change.

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function highlightTerms(root, terms) {
  if (!terms.length) return;
  const re = new RegExp(terms.map(escapeRegex).join("|"), "gi");
  // Collect the text pieces first (changing them while walking would confuse the walker).
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: n => n.parentElement.closest("button:not(.note-head), .code-head, mark") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
  });
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  for (const node of textNodes) {
    const text = node.nodeValue;
    re.lastIndex = 0;
    if (!re.test(text)) continue;
    re.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) frag.append(document.createTextNode(text.slice(last, m.index)));
      const mark = document.createElement("mark");
      mark.textContent = m[0];
      frag.append(mark);
      last = re.lastIndex;
    }
    if (last < text.length) frag.append(document.createTextNode(text.slice(last)));
    node.replaceWith(frag);
  }
}
