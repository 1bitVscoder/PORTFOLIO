// Whitespace runs stay as plain text nodes so per-word selection works,
// and the root gets an aria-label of the unsplit phrase with masks
// aria-hidden so screen readers announce the original sentence.
export type SplitWord = { mask: HTMLSpanElement; inner: HTMLSpanElement };

export type SplitResult = {
  words: SplitWord[];
  masks: HTMLSpanElement[];
  inners: HTMLSpanElement[];
  revert: () => void;
};

const WORD_MARK = "data-split-word";
const SPLIT_ROOT_MARK = "data-split-root";
const ORIGINAL_LABEL = "data-split-original-label";
const ORIGINAL_LABELLEDBY = "data-split-original-labelledby";

export function splitTextIntoWords(
  root: HTMLElement,
  maskClass: string,
  innerClass: string,
  // Optional CSS selector; text under any matching ancestor is left untouched
  // so callers can opt elements out of the word reveal (e.g. pills/points that
  // get their own entrance animation).
  exclude?: string
): SplitResult {
  const words: SplitWord[] = [];
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      let parent: Node | null = node.parentNode;
      while (parent && parent !== root) {
        if (parent instanceof HTMLElement) {
          if (parent.hasAttribute(WORD_MARK)) return NodeFilter.FILTER_REJECT;
          if (exclude && parent.matches(exclude)) return NodeFilter.FILTER_REJECT;
        }
        parent = parent.parentNode;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let n: Node | null;
  while ((n = walker.nextNode())) textNodes.push(n as Text);

  const replacements: Array<{ original: Text; replacement: Node[] }> = [];

  textNodes.forEach((node) => {
    const text = node.textContent;
    if (!text) return;
    if (!text.trim()) return;

    const frag = document.createDocumentFragment();
    const replacementNodes: Node[] = [];
    const parts = text.split(/(\s+)/);

    parts.forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) {
        const ws = document.createTextNode(part);
        frag.appendChild(ws);
        replacementNodes.push(ws);
        return;
      }
      const mask = document.createElement("span");
      mask.className = maskClass;
      mask.setAttribute(WORD_MARK, "");
      mask.setAttribute("aria-hidden", "true");
      const inner = document.createElement("span");
      inner.className = innerClass;
      inner.textContent = part;
      mask.appendChild(inner);
      frag.appendChild(mask);
      replacementNodes.push(mask);
      words.push({ mask, inner });
    });

    if (node.parentNode) {
      node.parentNode.replaceChild(frag, node);
      replacements.push({ original: node, replacement: replacementNodes });
    }
  });

  let labelApplied = false;
  let originalLabel: string | null = null;
  let originalLabelledBy: string | null = null;
  if (words.length) {
    root.setAttribute(SPLIT_ROOT_MARK, "");
    originalLabel = root.getAttribute("aria-label");
    originalLabelledBy = root.getAttribute("aria-labelledby");
    if (originalLabel != null) {
      root.setAttribute(ORIGINAL_LABEL, originalLabel);
    }
    if (originalLabelledBy != null) {
      root.setAttribute(ORIGINAL_LABELLEDBY, originalLabelledBy);
    }
    if (originalLabel == null && originalLabelledBy == null) {
      // textContent collapses <br> to nothing, fusing words across line
      // breaks ("respectsthe craft"). Walk the tree and emit a space for
      // every <br> so the aria-label reads as the visual phrase does.
      const buf: string[] = [];
      const collect = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          buf.push(node.textContent || "");
        } else if (
          node.nodeType === Node.ELEMENT_NODE &&
          (node as Element).tagName === "BR"
        ) {
          buf.push(" ");
        } else {
          node.childNodes.forEach(collect);
        }
      };
      collect(root);
      const phrase = buf.join("").replace(/\s+/g, " ").trim();
      if (phrase) {
        root.setAttribute("aria-label", phrase);
        labelApplied = true;
      }
    }
  }

  // INVARIANT: revert() re-inserts the *same* original Text node instances
  // captured at split time. This is correct only while the root subtree is not
  // otherwise mutated between split and revert (true for all current consumers,
  // which split static content). If a future consumer splits text that React
  // can re-render with new content while a split is active, re-read the live
  // textContent here instead of re-inserting the captured nodes.
  const revert = () => {
    replacements.forEach(({ original, replacement }) => {
      const first = replacement[0];
      if (!first || !first.parentNode) return;
      const parent = first.parentNode;
      parent.insertBefore(original, first);
      replacement.forEach((node) => {
        if (node.parentNode === parent) parent.removeChild(node);
      });
    });
    if (root.hasAttribute(SPLIT_ROOT_MARK)) {
      root.removeAttribute(SPLIT_ROOT_MARK);
      if (labelApplied) root.removeAttribute("aria-label");
      if (root.hasAttribute(ORIGINAL_LABEL)) {
        root.setAttribute(
          "aria-label",
          root.getAttribute(ORIGINAL_LABEL) || ""
        );
        root.removeAttribute(ORIGINAL_LABEL);
      }
      if (root.hasAttribute(ORIGINAL_LABELLEDBY)) {
        root.setAttribute(
          "aria-labelledby",
          root.getAttribute(ORIGINAL_LABELLEDBY) || ""
        );
        root.removeAttribute(ORIGINAL_LABELLEDBY);
      }
    }
  };

  return {
    words,
    masks: words.map((w) => w.mask),
    inners: words.map((w) => w.inner),
    revert,
  };
}

export function groupWordsByLine(words: SplitWord[]): HTMLSpanElement[][] {
  const lineMap = new Map<number, HTMLSpanElement[]>();
  words.forEach(({ mask, inner }) => {
    const key = Math.round(mask.offsetTop);
    if (!lineMap.has(key)) lineMap.set(key, []);
    lineMap.get(key)!.push(inner);
  });
  return [...lineMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, els]) => els);
}
