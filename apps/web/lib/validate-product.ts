// Shared validation for seller-submitted product data (single create/update
// and each row of a bulk import). Nothing here enforced any shape before -
// createProduct/updateProduct just spread whatever JSON body arrived
// straight into a Product, so a malformed request (negative price, a
// multi-megabyte "title" string, a non-numeric stockRemaining) would
// silently corrupt the catalog instead of getting rejected.
import { moderateText } from "./content-moderation.ts";

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
  colorGroupId?: unknown;
  productCode?: unknown;
  gender?: unknown;
  subCategory?: unknown;
  basePrice?: unknown;
  compareAtPrice?: unknown;
  sizes?: unknown;
  stockRemaining?: unknown;
  images?: unknown;
}

export interface ValidatedProductInput {
  title?: string;
  description?: string;
  fabric?: string;
  color?: string;
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
  sizes?: string[];
  stockRemaining?: number;
  images?: { url: string }[];
}

/**
 * Validates a product create/update payload. `requireCore` demands
 * title/basePrice be present (for creates); update requests can omit
 * fields they're not changing. Every field that IS present is still
 * validated regardless of `requireCore`.
 */
export function validateProductInput(input: ProductInput, requireCore: boolean): { errors: string[]; data: ValidatedProductInput } {
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

  if (input.compareAtPrice !== undefined && input.compareAtPrice !== null) {
    const compareAt = Number(input.compareAtPrice);
    if (!Number.isFinite(compareAt) || compareAt <= 0 || compareAt > MAX_PRICE) {
      errors.push(`compareAtPrice must be a number greater than 0 and at most ${MAX_PRICE}`);
    } else {
      data.compareAtPrice = compareAt;
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

  if (input.productCode !== undefined && input.productCode !== null) {
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

  if (input.sizes !== undefined) {
    if (!Array.isArray(input.sizes) || input.sizes.some((s) => typeof s !== "string" || !s.trim())) {
      errors.push("sizes must be an array of non-empty strings");
    } else if (input.sizes.length > MAX_SIZES) {
      errors.push(`sizes must have at most ${MAX_SIZES} entries`);
    } else {
      data.sizes = input.sizes as string[];
    }
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
