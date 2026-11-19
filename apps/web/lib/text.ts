import type { CSSProperties } from "react";

// Splits "Why Shop With Us" into { rest: "Why Shop With ", last: "Us" } so a
// heading can drop its last word into the editorial serif accent font
// (--site-font-accent) the same way the hero headline does (see
// HeroSlider.tsx), without every call site hand-splitting the string.
export function splitAccentWords(text: string): { rest: string; last: string } {
  const words = text.trim().split(" ");
  const last = words[words.length - 1];
  const rest = words.slice(0, -1).join(" ");
  return { rest: rest ? rest + " " : "", last };
}

// Shared style for that italicized last word. fontWeight is pinned to 600
// (lighter than every heading that wraps this, which all sit at 700-800) -
// the same bold-sans/lighter-serif contrast the hero headline established,
// rather than inheriting the heading's own heavier weight into the italic.
export const ACCENT_EM_STYLE: CSSProperties = { fontFamily: "var(--site-font-accent)", fontStyle: "italic", fontWeight: 600 };
