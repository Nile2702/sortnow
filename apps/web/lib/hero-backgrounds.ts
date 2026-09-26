// A searchable catalog of hero-section background photos a seller can pick
// for their storefront, grouped by shop type (see Theme Studio). There's no
// fashion-specific photo API this environment has a free key for (Unsplash's
// keyword search needs a developer account; the old keyless
// source.unsplash.com endpoint was shut down in 2023) - the user explicitly
// chose real photos over a CSS gradient anyway, so this uses Picsum Photos
// (picsum.photos), a free, keyless, hotlink-safe service that serves real
// photographs deterministically by seed. The tradeoff, stated plainly: these
// are general stock photography (textures, landscapes, objects, people),
// NOT literally photos of sarees or kids' clothes - the category is a label
// for browsing/searching, not a guarantee of photo content. Swapping in a
// real fashion-photo API later (once there's a key) only means changing
// heroBackgroundImageUrl(); nothing that reads HERO_BACKGROUNDS changes.
export interface HeroBackground {
  id: string;
  category: string;
  label: string;
  seed: string;
}

export const HERO_BACKGROUND_CATEGORIES = [
  "Ethnic Wear",
  "Casual Wear",
  "Formal Wear",
  "Denim & Streetwear",
  "Kids Fashion",
  "Footwear",
  "Bridal & Occasion Wear",
  "Sportswear",
  "Accessories & Jewelry",
  "Winter Wear",
] as const;

const variantNames = [
  "Sunrise", "Midnight", "Dusk", "Bazaar", "Runway", "Studio", "Boutique", "Weave", "Loom", "Aisle",
  "Drape", "Trend", "Atelier", "Market", "Facade", "Showcase", "Gallery", "Thread", "Stitch", "Mannequin",
];

function buildPreset(category: string, index: number): HeroBackground {
  const label = `${category} — ${variantNames[index % variantNames.length]} ${Math.floor(index / variantNames.length) + 1}`;
  const slug = category.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    id: `hero-${slug}-${index + 1}`,
    category,
    label,
    // Distinct per category+index so every one of the 1000 resolves to a
    // different (but stable across reloads) real photo.
    seed: `sio-${slug}-${index + 1}`,
  };
}

// 10 categories x 100 presets = 1000 selectable hero backgrounds.
export const HERO_BACKGROUNDS: HeroBackground[] = HERO_BACKGROUND_CATEGORIES.flatMap((category) =>
  Array.from({ length: 100 }, (_, i) => buildPreset(category, i))
);

export function getHeroBackgroundById(id: string | undefined | null): HeroBackground | null {
  if (!id) return null;
  return HERO_BACKGROUNDS.find((b) => b.id === id) ?? null;
}

// picsum.photos/seed/<seed>/<w>/<h> deterministically returns the same real
// photo for the same seed every time - use a small size for picker
// thumbnails and a larger one for the actual hero banner.
export function heroBackgroundImageUrl(bg: HeroBackground, width: number, height: number): string {
  return `https://picsum.photos/seed/${encodeURIComponent(bg.seed)}/${width}/${height}`;
}
