// Derives a stable HSL hue (0-359) from a string's own characters, so the
// same label/name always gets the same color across reloads without a
// lookup table. Callers pick their own saturation/lightness for the
// specific UI they're coloring (a store-initial avatar badge and a
// category-tile background want different tones from the same hue).
export function hashHue(s: string, chars = 2): number {
  let hash = 0;
  for (let i = 0; i < Math.min(chars, s.length); i++) {
    hash += s.charCodeAt(i) * (i === 0 ? 37 : 11);
  }
  return hash % 360;
}
