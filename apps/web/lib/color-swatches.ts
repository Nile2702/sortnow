// Maps a seller-typed free-text color (e.g. "Emerald Green", "Navy Blue")
// to an actual swatch color for the filter sidebar - sellers type colors as
// natural product names, not hex codes, so this is an approximation, not a
// lookup table of exact values. Checked in order: an exact match first,
// then a substring match against each base color word (longest/most
// specific entries first, so "Navy Blue" hits navy before the generic
// "blue" fallback further down would).
const EXACT: Record<string, string> = {
  white: "#ffffff",
  ivory: "#fffff0",
  cream: "#fffdd0",
  beige: "#e8dcc8",
  black: "#0f172a",
  charcoal: "#36454f",
  grey: "#9ca3af",
  gray: "#9ca3af",
  silver: "#c0c0c0",
};

const SUBSTRING_ORDERED: [string, string][] = [
  ["navy", "#1e3a5f"],
  ["royal blue", "#1e40af"],
  ["sky blue", "#7dd3fc"],
  ["indigo", "#3730a3"],
  ["blue", "#3b82f6"],
  ["emerald", "#10b981"],
  ["olive", "#6b7a3a"],
  ["sage", "#9caf88"],
  ["mint", "#98ff98"],
  ["green", "#22c55e"],
  ["maroon", "#7f1d1d"],
  ["wine", "#722f37"],
  ["deep red", "#991b1b"],
  ["red", "#ef4444"],
  ["mustard", "#d4ac0d"],
  ["gold", "#d4af37"],
  ["yellow", "#eab308"],
  ["peach", "#ffcba4"],
  ["coral", "#ff7f50"],
  ["pink", "#ec4899"],
  ["magenta", "#d6336c"],
  ["purple", "#8b5cf6"],
  ["lavender", "#b57edc"],
  ["brown", "#8b5e34"],
  ["tan", "#d2b48c"],
  ["rust", "#b7410e"],
  ["orange", "#f97316"],
  ["turquoise", "#14b8a6"],
  ["teal", "#0d9488"],
];

export function colorToSwatch(colorName: string): string {
  const key = colorName.trim().toLowerCase();
  if (EXACT[key]) return EXACT[key];
  for (const [needle, hex] of SUBSTRING_ORDERED) {
    if (key.includes(needle)) return hex;
  }
  return "#d1d5db"; // neutral fallback for anything unrecognized
}
