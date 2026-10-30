// Shared validation for seller-submitted product data (single create/update
// and each row of a bulk import). Nothing here enforced any shape before -
// createProduct/updateProduct just spread whatever JSON body arrived
// straight into a Product, so a malformed request (negative price, a
// multi-megabyte "title" string, a non-numeric stockRemaining) would
// silently corrupt the catalog instead of getting rejected.
import { moderateText } from "./content-moderation.ts";
import { getSizeOptionsFor } from "./catalog-constants.ts";

const GENDERS = ["men", "women", "kids"] as const;
const MAX_TEXT = 300;
const MAX_DESCRIPTION = 5000;
const MAX_PRICE = 10_000_000;
const MAX_SIZES = 20;
const MAX_IMAGES = 10;

export interface ProductInput {
  title?: unknown;
  description?: unknown;
  fabric?: unknown;
  color?: unknown;
  brand?: unknown;
  colorGroupId?: unknown;
  productCode?: unknown;
  gender?: unknown;
  subCategory?: unknown;
  basePrice?: unknown;
  compareAtPrice?: unknown;
  costPrice?: unknown;
  sizes?: unknown;
  stockRemaining?: unknown;
  images?: unknown;
}

export interface ValidatedProductInput {
  title?: string;
  description?: string;
  fabric?: string;
  color?: string;
  // Optional, seller-assigned - a multi-brand store (e.g. a reseller
  // boutique) can tag which label an item is, so a shopper can filter or
  // just know what they're buying. Skipped entirely by a single-brand
  // store, same as color/productCode.
  brand?: string;
  // Shared across every colorway created together from the same "select
  // colors" step in the product form, so the product page can look up and
  // show the sibling colors as swatches. Not user-facing text, so it skips
  // content moderation below.
  colorGroupId?: string;
  // Seller-assigned lookup code (e.g. "UV-042") - not user-facing prose, so
  // it also skips content moderation, same reasoning as colorGroupId.
  productCode?: string;
  gender?: "men" | "women" | "kids";
  subCategory?: string;
  basePrice?: number;
  compareAtPrice?: number;
  costPrice?: number;
  sizes?: string[];
  stockRemaining?: number;
  images?: { url: string }[];
}

/**
 * Validates a product create/update payload. `requireCore` demands
 * title/basePrice be present (for creates); update requests can omit
 * fields they're not changing. Every field that IS present is still
 * validated regardless of `requireCore`. `existingBasePrice`/
 * `existingSubCategory` are only needed for an update that changes
 * compareAtPrice/sizes without also resending basePrice/subCategory - see
 * the MRP-vs-selling-price and sizes-required checks below, which
 * otherwise have no way to know what the final value would actually end
 * up being.
 */
export function validateProductInput(
  input: ProductInput,
  requireCore: boolean,
  existingBasePrice?: number,
  existingSubCategory?: string
): { errors: string[]; data: ValidatedProductInput } {
  const errors: string[] = [];
  const data: ValidatedProductInput = {};

  if (requireCore && (typeof input.title !== "string" || !input.title.trim())) {
    errors.push("title is required");
  }
  if (input.title !== undefined) {
    if (typeof input.title !== "string" || !input.title.trim()) {
      errors.push("title must be a non-empty string");
    } else if (input.title.length > MAX_TEXT) {
      errors.push(`title must be ${MAX_TEXT} characters or fewer`);
    } else {
      data.title = input.title.trim();
    }
  }

  if (requireCore && (input.basePrice === undefined || input.basePrice === null)) {
    errors.push("basePrice is required");
  }
  if (input.basePrice !== undefined && input.basePrice !== null) {
    const price = Number(input.basePrice);
    if (!Number.isFinite(price) || price <= 0 || price > MAX_PRICE) {
      errors.push(`basePrice must be a number greater than 0 and at most ${MAX_PRICE}`);
    } else {
      data.basePrice = price;
    }
  }

  // `null` is a deliberate "clear this field" signal, distinct from the key
  // being absent entirely ("not mentioned, leave the existing value alone")
  // - see ProductForm.tsx's handleSubmit. Setting `data.compareAtPrice =
  // undefined` as an own property (rather than just never assigning it)
  // means updateProduct's Object.assign actually overwrites the existing
  // value with undefined instead of leaving the key out of the patch.
  if (input.compareAtPrice === null) {
    data.compareAtPrice = undefined;
  } else if (input.compareAtPrice !== undefined) {
    const compareAt = Number(input.compareAtPrice);
    if (!Number.isFinite(compareAt) || compareAt <= 0 || compareAt > MAX_PRICE) {
      errors.push(`compareAtPrice must be a number greater than 0 and at most ${MAX_PRICE}`);
    } else {
      // MRP (compareAtPrice) only means anything as a "was X, now Y"
      // discount if it's actually higher than the selling price - nothing
      // previously stopped a seller from saving MRP <= selling price, which
      // would render as a struck-through "MRP" underneath an equal or
      // higher "sale" price, a nonsensical discount sign a shopper has no
      // way to make sense of. effectiveBasePrice falls back to
      // existingBasePrice for the update case where this request only
      // touches compareAtPrice, not basePrice itself.
      const effectiveBasePrice = data.basePrice ?? existingBasePrice;
      if (effectiveBasePrice !== undefined && compareAt <= effectiveBasePrice) {
        errors.push("compareAtPrice (MRP) must be greater than basePrice (selling price) to show a discount");
      } else {
        data.compareAtPrice = compareAt;
      }
    }
  }

  if (input.costPrice === null) {
    data.costPrice = undefined;
  } else if (input.costPrice !== undefined && input.costPrice !== "") {
    const cost = Number(input.costPrice);
    if (!Number.isFinite(cost) || cost < 0 || cost > MAX_PRICE) {
      errors.push(`costPrice must be a non-negative number and at most ${MAX_PRICE}`);
    } else {
      data.costPrice = cost;
    }
  }

  if (input.gender !== undefined) {
    if (typeof input.gender !== "string" || !GENDERS.includes(input.gender as any)) {
      errors.push(`gender must be one of: ${GENDERS.join(", ")}`);
    } else {
      data.gender = input.gender as "men" | "women" | "kids";
    }
  }

  if (input.subCategory !== undefined) {
    if (typeof input.subCategory !== "string" || !input.subCategory.trim()) {
      errors.push("subCategory must be a non-empty string");
    } else if (input.subCategory.length > MAX_TEXT) {
      errors.push(`subCategory must be ${MAX_TEXT} characters or fewer`);
    } else {
      data.subCategory = input.subCategory.trim();
    }
  }

  if (requireCore && (typeof input.description !== "string" || !input.description.trim())) {
    errors.push("description is required");
  }
  if (input.description !== undefined && input.description !== null) {
    if (typeof input.description !== "string" || !input.description.trim()) {
      errors.push("description must be a non-empty string");
    } else if (input.description.length > MAX_DESCRIPTION) {
      errors.push(`description must be ${MAX_DESCRIPTION} characters or fewer`);
    } else {
      data.description = input.description;
    }
  }

  if (requireCore && (typeof input.fabric !== "string" || !input.fabric.trim())) {
    errors.push("fabric is required");
  }
  if (input.fabric !== undefined && input.fabric !== null) {
    if (typeof input.fabric !== "string" || !input.fabric.trim()) {
      errors.push("fabric must be a non-empty string");
    } else if (input.fabric.length > MAX_TEXT) {
      errors.push(`fabric must be ${MAX_TEXT} characters or fewer`);
    } else {
      data.fabric = input.fabric;
    }
  }

  if (input.productCode === null) {
    data.productCode = undefined;
  } else if (input.productCode !== undefined) {
    if (typeof input.productCode !== "string") {
      errors.push("productCode must be a string");
    } else if (input.productCode.length > MAX_TEXT) {
      errors.push(`productCode must be ${MAX_TEXT} characters or fewer`);
    } else {
      data.productCode = input.productCode.trim() || undefined;
    }
  }

  if (input.color !== undefined && input.color !== null) {
    if (typeof input.color !== "string") {
      errors.push("color must be a string");
    } else if (input.color.length > MAX_TEXT) {
      errors.push(`color must be ${MAX_TEXT} characters or fewer`);
    } else {
      data.color = input.color;
    }
  }

  if (input.brand === null) {
    data.brand = undefined;
  } else if (input.brand !== undefined) {
    if (typeof input.brand !== "string") {
      errors.push("brand must be a string");
    } else if (input.brand.length > MAX_TEXT) {
      errors.push(`brand must be ${MAX_TEXT} characters or fewer`);
    } else {
      data.brand = input.brand.trim() || undefined;
    }
  }

  if (input.colorGroupId !== undefined && input.colorGroupId !== null) {
    if (typeof input.colorGroupId !== "string" || input.colorGroupId.length > MAX_TEXT) {
      errors.push("colorGroupId must be a string");
    } else {
      data.colorGroupId = input.colorGroupId;
    }
  }

  if (input.stockRemaining !== undefined && input.stockRemaining !== null) {
    const stock = Number(input.stockRemaining);
    if (!Number.isFinite(stock) || !Number.isInteger(stock) || stock < 0) {
      errors.push("stockRemaining must be a non-negative integer");
    } else {
      data.stockRemaining = stock;
    }
  }

  // A listing with zero sizes is one a shopper can't actually select
  // anything for - nothing previously stopped this, including the common
  // way it happens by accident: re-picking subCategory client-side filters
  // the size options down to whatever's valid for the new one, which can
  // silently empty out a selection that was valid for the old subCategory.
  // Only enforced when the (possibly-existing, for an update that doesn't
  // resend subCategory) subCategory is actually known and its size group
  // isn't "none" (bangles, earrings, bags - genuinely sizeless) - an
  // unresolvable subCategory skips this rather than guessing.
  const effectiveSubCategory = data.subCategory ?? existingSubCategory;
  const sizesRequired = !!effectiveSubCategory && getSizeOptionsFor(effectiveSubCategory).length > 0;

  if (input.sizes !== undefined) {
    if (!Array.isArray(input.sizes) || input.sizes.some((s) => typeof s !== "string" || !s.trim())) {
      errors.push("sizes must be an array of non-empty strings");
    } else if (input.sizes.length > MAX_SIZES) {
      errors.push(`sizes must have at most ${MAX_SIZES} entries`);
    } else if (input.sizes.length === 0 && sizesRequired) {
      errors.push("sizes must include at least one size for this category");
    } else {
      data.sizes = input.sizes as string[];
    }
  } else if (requireCore && sizesRequired) {
    errors.push("sizes is required for this category");
  }

  if (input.images !== undefined) {
    if (!Array.isArray(input.images) || input.images.some((img) => typeof img?.url !== "string" || !img.url.trim())) {
      errors.push("images must be an array of objects with a non-empty url");
    } else if (input.images.length > MAX_IMAGES) {
      errors.push(`images must have at most ${MAX_IMAGES} entries`);
    } else {
      data.images = input.images as { url: string }[];
    }
  }

  // Content-safety gate - runs on every field actually present in this
  // request, using the validated/trimmed values above rather than the raw
  // input, so this can't be bypassed by whitespace or case tricks that
  // slipped past the earlier per-field checks.
  const moderation = moderateText([data.title, data.description, data.fabric, data.subCategory, data.color]);
  if (moderation.blocked) {
    errors.push(`This listing can't be published: it appears to reference ${moderation.category}, which isn't allowed on this marketplace.`);
  }

  return { errors, data };
}
