// Notes Vault: SCREEN LAYER, code boxes
// In refined notes, code is written between ``` fences, like:
//   ```python
//   stack.append("A")
//   ```
// Those parts become a dark code box with a Copy button. Everything else stays normal text.
// Text is added with createTextNode / textContent (never innerHTML), so a note can't break the page.

function withCodeBoxes(text) {
  const frag = document.createDocumentFragment();
  const fence = /```(\w*)\n([\s\S]*?)```\n?/g;
  let last = 0, m;
  while ((m = fence.exec(text))) {
    if (m.index > last) frag.append(document.createTextNode(text.slice(last, m.index)));
    frag.append(codeBox(m[2].replace(/\n$/, ""), m[1]));
    last = fence.lastIndex;
  }
  if (last < text.length) frag.append(document.createTextNode(text.slice(last)));
  return frag;
}

function codeBox(code, lang) {
  const box = document.createElement("div");
  box.className = "code-box";

  const head = document.createElement("div");
  head.className = "code-head";
  const name = document.createElement("span");
  name.textContent = lang || "code";
  const copy = document.createElement("button");
  copy.className = "copy-btn";
  copy.textContent = "Copy";
  copy.addEventListener("click", () => copyText(code, copy));
  head.append(name, copy);

  const pre = document.createElement("pre");
  const codeEl = document.createElement("code");
  codeEl.textContent = code;
  pre.append(codeEl);

  box.append(head, pre);
  return box;
}

// Copy to clipboard. If the browser blocks the modern way, use the old way.
async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.append(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  btn.textContent = "Copied!";
  setTimeout(() => (btn.textContent = "Copy"), 1500);
}
