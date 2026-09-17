// Deterministic, always-on content-safety gate for seller listings. Wired
// into validateProductInput() so every product-mutation path (single
// create/update form, CSV bulk import, AI bulk-photo upload) runs through
// the same check with no way to bypass it - there's exactly one function
// that turns a raw payload into a stored Product, and this sits inside it.
//
// Scope is intentionally narrow: only categories where a keyword match is a
// reliable signal for a fashion marketplace specifically. Two categories
// that would seem obvious were deliberately left out, because keyword-
// matching them causes serious false positives here:
//   - Wildlife/animal-derived materials - "leopard print", "snake print",
//     "faux tiger", "python-embossed clutch" are completely ordinary, legal
//     fashion patterns. A text filter can't tell a real poached-hide
//     listing from a printed synthetic without seeing the actual material
//     claim - that needs human or image review, not keyword matching.
//   - Hate symbols - e.g. the swastika is a common auspicious motif in
//     Indian textiles and jewellery (Hindu/Jain/Buddhist use, predating and
//     unrelated to its use as a hate symbol elsewhere). Blocking it here
//     would be both wrong and culturally tone-deaf for an Indian platform.
// "nude" is deliberately not in the explicit-content list either - it's one
// of the most common shade names in footwear, lingerie, and hosiery.
interface BannedCategory {
  label: string;
  terms: string[];
}

const BANNED_CATEGORIES: BannedCategory[] = [
  {
    label: "sexually explicit content",
    terms: ["porn", "pornographic", "pornography", "xxx video", "hardcore sex", "explicit sex", "nsfw", "hentai", "sex tape", "escort service", "camgirl", "onlyfans"],
  },
  {
    label: "illegal drugs or narcotics",
    terms: ["cocaine", "heroin", "methamphetamine", "crystal meth", "mdma", "ecstasy pills", "opium poppy", "ketamine", "fentanyl", "lsd tabs"],
  },
  {
    label: "weapons or firearms",
    terms: ["firearm", "handgun", "pistol", "assault rifle", "ak-47", "ak47", "live ammunition", "gun silencer", "hand grenade", "explosive device"],
  },
  {
    label: "counterfeit or replica goods",
    terms: ["first copy", "master copy", "mirror quality replica", "aaa quality replica", "counterfeit", "fake branded", "replica branded"],
  },
];

export interface ModerationResult {
  blocked: boolean;
  category?: string;
}

function normalize(s: string): string {
  return ` ${s.toLowerCase().replace(/[^a-z0-9\s]+/g, " ").replace(/\s+/g, " ").trim()} `;
}

/** Checks free-text listing fields (title, description, fabric, subCategory, ...) for banned content. */
export function moderateText(fields: (string | undefined)[]): ModerationResult {
  const combined = normalize(fields.filter(Boolean).join(" "));
  if (combined.trim().length === 0) return { blocked: false };

  for (const category of BANNED_CATEGORIES) {
    for (const term of category.terms) {
      if (combined.includes(normalize(term))) {
        return { blocked: true, category: category.label };
      }
    }
  }
  return { blocked: false };
}
