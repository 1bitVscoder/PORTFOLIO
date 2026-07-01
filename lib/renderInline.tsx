import { Fragment, type ReactNode } from "react";

// Renders a string that may contain markdown-style **bold** spans as a
// React fragment, wrapping bold runs in <strong>. Used by case-study
// section components to surface emphasis encoded in case-studies.json.
//
// Encoding contract: balanced ** pairs (even split count) alternate
// plain/bold/plain. Unbalanced ** (odd dangling sentinel) is author
// intent we cannot resolve, so every run renders as plain text and a
// dev-only console warning surfaces the malformed input.
export function renderInline(input: string): ReactNode[] {
  const parts = input.split("**");
  const balanced = parts.length % 2 === 1;
  if (!balanced && process.env.NODE_ENV !== "production") {
    console.warn(`[renderInline] unbalanced "**" in input; rendering as plain text: ${input}`);
  }
  const nodes: ReactNode[] = [];
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    if (part === "") continue;
    const isBold = balanced && i % 2 === 1;
    nodes.push(
      isBold ? (
        <strong key={i}>{part}</strong>
      ) : (
        <Fragment key={i}>{part}</Fragment>
      )
    );
  }
  return nodes;
}
