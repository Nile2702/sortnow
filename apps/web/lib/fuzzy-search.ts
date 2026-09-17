// Lightweight, dependency-free fuzzy text matching for product search - lets
// a shopper's search work the way Google's does: small typos ("kurthi"),
// missing spaces ("bluejeans"), and partial words ("saree" matching
// "Banarasi Silk Saree") all still find the right products instead of
// requiring an exact substring match.

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]+/g, " ").replace(/\s+/g, " ").trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] =
        a[i - 1] === b[j - 1]
          ? prev[j - 1]
          : 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
    }
    prev = curr;
  }
  return prev[b.length];
}

function editDistanceThreshold(wordLength: number): number {
  if (wordLength <= 3) return 0;
  if (wordLength <= 5) return 1;
  if (wordLength <= 8) return 2;
  return 3;
}

/**
 * Scores how well `query` matches `text`. 0 means no match. Higher is a
 * closer match (exact substring beats a fuzzy/typo match, which beats a
 * loose word-level match).
 */
export function fuzzyScore(query: string, text: string): number {
  const q = normalize(query);
  const t = normalize(text);
  if (!q || !t) return 0;

  if (t.includes(q)) return 100;

  // Missing/extra spaces: "bluejeans" should still find "Blue Jeans".
  const qJoined = q.replace(/\s+/g, "");
  const tJoined = t.replace(/\s+/g, "");
  if (qJoined.length >= 3 && tJoined.includes(qJoined)) return 90;

  const qWords = q.split(" ").filter(Boolean);
  const tWords = t.split(" ").filter(Boolean);

  let best = 0;
  for (const qw of qWords) {
    if (qw.length < 3) continue;
    for (const tw of tWords) {
      if (tw.startsWith(qw) || qw.startsWith(tw)) {
        best = Math.max(best, 75);
        continue;
      }
      const dist = levenshtein(qw, tw);
      if (dist <= editDistanceThreshold(Math.max(qw.length, tw.length))) {
        best = Math.max(best, 60 - dist * 10);
      }
    }
  }
  return best;
}

/** True if `query` matches any of `fields` well enough to count as a hit. */
export function fuzzyMatchesAny(query: string, fields: (string | undefined)[]): boolean {
  return fields.some((f) => f && fuzzyScore(query, f) > 0);
}

/** Best score for `query` across every field, for relevance ranking. */
export function fuzzyBestScore(query: string, fields: (string | undefined)[]): number {
  return fields.reduce((best, f) => (f ? Math.max(best, fuzzyScore(query, f)) : best), 0);
}
