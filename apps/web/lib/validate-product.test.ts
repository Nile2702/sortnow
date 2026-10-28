import { test } from "node:test";
import assert from "node:assert/strict";
import { validateProductInput } from "./validate-product.ts";

test("accepts a valid create payload", () => {
  const { errors, data } = validateProductInput(
    { title: "Blue Kurti", basePrice: 999, description: "A comfortable everyday kurti.", fabric: "Cotton" },
    true
  );
  assert.deepEqual(errors, []);
  assert.equal(data.title, "Blue Kurti");
  assert.equal(data.basePrice, 999);
});

test("requires title, basePrice, description, and fabric on create", () => {
  const { errors } = validateProductInput({}, true);
  assert.ok(errors.includes("title is required"));
  assert.ok(errors.includes("basePrice is required"));
  assert.ok(errors.includes("description is required"));
  assert.ok(errors.includes("fabric is required"));
});

test("rejects a blank or whitespace-only description/fabric on create", () => {
  const { errors } = validateProductInput(
    { title: "x", basePrice: 100, description: "   ", fabric: "   " },
    true
  );
  assert.ok(errors.includes("description is required"));
  assert.ok(errors.includes("fabric is required"));
});

test("does not require description/fabric on update", () => {
  const { errors, data } = validateProductInput({ stockRemaining: 5 }, false);
  assert.deepEqual(errors, []);
  assert.equal(data.stockRemaining, 5);
});

test("does not require title/basePrice on update", () => {
  const { errors, data } = validateProductInput({ stockRemaining: 5 }, false);
  assert.deepEqual(errors, []);
  assert.equal(data.stockRemaining, 5);
});

test("rejects a non-positive or absurd basePrice", () => {
  assert.ok(validateProductInput({ title: "x", basePrice: 0 }, true).errors.length > 0);
  assert.ok(validateProductInput({ title: "x", basePrice: -50 }, true).errors.length > 0);
  assert.ok(validateProductInput({ title: "x", basePrice: 50_000_000 }, true).errors.length > 0);
  assert.ok(validateProductInput({ title: "x", basePrice: "not-a-number" }, true).errors.length > 0);
});

test("rejects an oversized title", () => {
  const { errors } = validateProductInput({ title: "a".repeat(301), basePrice: 100 }, true);
  assert.ok(errors.some((e) => e.includes("title")));
});

test("rejects a blank or whitespace-only title", () => {
  assert.ok(validateProductInput({ title: "   ", basePrice: 100 }, true).errors.length > 0);
});

test("rejects an invalid gender", () => {
  const { errors } = validateProductInput({ gender: "alien" }, false);
  assert.ok(errors.some((e) => e.includes("gender")));
});

test("accepts a valid gender", () => {
  const { errors, data } = validateProductInput({ gender: "kids" }, false);
  assert.deepEqual(errors, []);
  assert.equal(data.gender, "kids");
});

test("rejects a negative or non-integer stockRemaining", () => {
  assert.ok(validateProductInput({ stockRemaining: -1 }, false).errors.length > 0);
  assert.ok(validateProductInput({ stockRemaining: 2.5 }, false).errors.length > 0);
});

test("accepts zero stockRemaining (sold out, not invalid)", () => {
  const { errors, data } = validateProductInput({ stockRemaining: 0 }, false);
  assert.deepEqual(errors, []);
  assert.equal(data.stockRemaining, 0);
});

test("rejects sizes that aren't an array of non-empty strings", () => {
  assert.ok(validateProductInput({ sizes: "M" }, false).errors.length > 0);
  assert.ok(validateProductInput({ sizes: ["M", ""] }, false).errors.length > 0);
  assert.ok(validateProductInput({ sizes: Array(21).fill("M") }, false).errors.length > 0);
});

test("accepts a valid sizes array", () => {
  const { errors, data } = validateProductInput({ sizes: ["S", "M", "L"] }, false);
  assert.deepEqual(errors, []);
  assert.deepEqual(data.sizes, ["S", "M", "L"]);
});

// A sizeless listing (zero sizes) is one a shopper can't actually select
// anything for - only an issue when the subCategory actually has real size
// options (a shirt), not a genuinely sizeless one (a handbag).
test("rejects an empty sizes array for a subCategory that has real size options", () => {
  const onCreate = validateProductInput({ ...MINIMAL_CREATE, basePrice: 500, subCategory: "Shirts", sizes: [] }, true);
  assert.ok(onCreate.errors.some((e) => e.includes("sizes")));
  const onUpdate = validateProductInput({ sizes: [] }, false, undefined, "Shirts");
  assert.ok(onUpdate.errors.some((e) => e.includes("sizes")));
});

test("requires sizes on create for a subCategory that has real size options, even if omitted entirely", () => {
  const { errors } = validateProductInput({ ...MINIMAL_CREATE, basePrice: 500, subCategory: "Shirts" }, true);
  assert.ok(errors.some((e) => e.includes("sizes")));
});

test("accepts an empty sizes array for a genuinely sizeless subCategory", () => {
  const { errors, data } = validateProductInput({ ...MINIMAL_CREATE, basePrice: 500, subCategory: "Handbags", sizes: [] }, true);
  assert.deepEqual(errors, []);
  assert.deepEqual(data.sizes, []);
});

test("doesn't require sizes when subCategory is unresolvable (unknown either way)", () => {
  const { errors } = validateProductInput({ ...MINIMAL_CREATE, basePrice: 500 }, true);
  assert.deepEqual(errors, []);
});

test("rejects images missing a url", () => {
  const { errors } = validateProductInput({ images: [{ url: "" }] }, false);
  assert.ok(errors.length > 0);
});

test("accepts valid images", () => {
  const { errors, data } = validateProductInput({ images: [{ url: "https://example.com/a.jpg" }] }, false);
  assert.deepEqual(errors, []);
  assert.deepEqual(data.images, [{ url: "https://example.com/a.jpg" }]);
});

test("rejects an oversized description", () => {
  const { errors } = validateProductInput({ description: "x".repeat(5001) }, false);
  assert.ok(errors.some((e) => e.includes("description")));
});

test("accepts a valid color", () => {
  const { errors, data } = validateProductInput({ color: "Navy Blue" }, false);
  assert.deepEqual(errors, []);
  assert.equal(data.color, "Navy Blue");
});

test("rejects a non-string or oversized color", () => {
  assert.ok(validateProductInput({ color: 123 }, false).errors.length > 0);
  assert.ok(validateProductInput({ color: "x".repeat(301) }, false).errors.length > 0);
});

test("blocks a listing whose description references banned content", () => {
  const { errors } = validateProductInput({ title: "Cotton Kurti", basePrice: 500, description: "Comes bundled with a firearm." }, true);
  assert.ok(errors.some((e) => e.includes("can't be published")));
});

test("blocks a listing whose title uses counterfeit marketing language", () => {
  const { errors } = validateProductInput({ title: "First Copy Designer Handbag", basePrice: 500 }, true);
  assert.ok(errors.some((e) => e.includes("can't be published")));
});

test("does not flag ordinary fashion terms as banned content", () => {
  const { errors } = validateProductInput(
    { title: "Nude Pumps", basePrice: 999, description: "Classic nude heels with a leopard print insole.", fabric: "Synthetic leather", color: "Nude" },
    true
  );
  assert.deepEqual(errors, []);
});

// `null` is a deliberate "clear this field" signal on update, distinct from
// the key being absent entirely ("not mentioned, leave the existing value
// alone") - see ProductForm.tsx's handleSubmit. A seller clearing an
// optional field (e.g. ending a discount by blanking MRP) used to have no
// way to express that: `undefined` just drops the key from the JSON body,
// which the server reads as "unchanged".
test("null explicitly clears compareAtPrice, costPrice, brand, and productCode on update", () => {
  const { errors, data } = validateProductInput({ compareAtPrice: null, costPrice: null, brand: null, productCode: null }, false);
  assert.deepEqual(errors, []);
  assert.ok("compareAtPrice" in data);
  assert.equal(data.compareAtPrice, undefined);
  assert.ok("costPrice" in data);
  assert.equal(data.costPrice, undefined);
  assert.ok("brand" in data);
  assert.equal(data.brand, undefined);
  assert.ok("productCode" in data);
  assert.equal(data.productCode, undefined);
});

test("omitting compareAtPrice, costPrice, brand, and productCode leaves them untouched on update", () => {
  const { errors, data } = validateProductInput({ title: "Updated title" }, false);
  assert.deepEqual(errors, []);
  assert.ok(!("compareAtPrice" in data));
  assert.ok(!("costPrice" in data));
  assert.ok(!("brand" in data));
  assert.ok(!("productCode" in data));
});

// MRP (compareAtPrice) only means a real discount if it's above the selling
// price - otherwise a shopper sees a struck-through "MRP" that's equal to or
// below the price they'd actually pay, a nonsensical discount sign.
const MINIMAL_CREATE = { title: "T", description: "D", fabric: "Cotton" };

test("rejects compareAtPrice at or below basePrice on create", () => {
  const atPrice = validateProductInput({ ...MINIMAL_CREATE, basePrice: 500, compareAtPrice: 500 }, true);
  assert.ok(atPrice.errors.some((e) => e.includes("compareAtPrice")));
  const belowPrice = validateProductInput({ ...MINIMAL_CREATE, basePrice: 500, compareAtPrice: 400 }, true);
  assert.ok(belowPrice.errors.some((e) => e.includes("compareAtPrice")));
});

test("accepts compareAtPrice above basePrice on create", () => {
  const { errors, data } = validateProductInput({ ...MINIMAL_CREATE, basePrice: 500, compareAtPrice: 700 }, true);
  assert.deepEqual(errors, []);
  assert.equal(data.compareAtPrice, 700);
});

test("rejects a new compareAtPrice against the existing basePrice when basePrice isn't resent on update", () => {
  const { errors } = validateProductInput({ compareAtPrice: 400 }, false, 500);
  assert.ok(errors.some((e) => e.includes("compareAtPrice")));
});

test("accepts a new compareAtPrice validated against the existing basePrice on update", () => {
  const { errors, data } = validateProductInput({ compareAtPrice: 600 }, false, 500);
  assert.deepEqual(errors, []);
  assert.equal(data.compareAtPrice, 600);
});

test("validates compareAtPrice against a basePrice also being changed in the same update, not the stale existing one", () => {
  // Raising basePrice to 800 in the same request as compareAtPrice: 700
  // should be rejected against the NEW basePrice, even though 700 would
  // have been valid against the old (lower) existingBasePrice.
  const { errors } = validateProductInput({ basePrice: 800, compareAtPrice: 700 }, false, 500);
  assert.ok(errors.some((e) => e.includes("compareAtPrice")));
});
