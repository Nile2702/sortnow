import { test } from "node:test";
import assert from "node:assert/strict";
import { getSizeOptionsFor, syncFabricInDescription } from "./catalog-constants.ts";

test("clothing subcategories offer standard XS-XXL sizes plus Free Size", () => {
  const sizes = getSizeOptionsFor("Shirts");
  assert.deepEqual(sizes, ["XS", "S", "M", "L", "XL", "XXL", "Free Size"]);
});

test("footwear offers shoe sizes, not clothing sizes", () => {
  const sizes = getSizeOptionsFor("Footwear");
  assert.deepEqual(sizes, ["6", "7", "8", "9", "10", "11", "Free Size"]);
  assert.ok(!sizes.includes("M"));
});

test("jeans and trousers offer waist sizes, not shoe or clothing sizes", () => {
  const sizes = getSizeOptionsFor("Jeans");
  assert.deepEqual(sizes, ["28", "30", "32", "34", "36", "38", "Free Size"]);
});

test("sarees are free-size only", () => {
  assert.deepEqual(getSizeOptionsFor("Sarees"), ["Free Size"]);
});

test("kids categories offer age-based sizes", () => {
  const sizes = getSizeOptionsFor("Boys");
  assert.ok(sizes.includes("2-3Y"));
  assert.ok(!sizes.includes("M"));
});

test("syncFabricInDescription swaps a whole-word, case-insensitive mention of the old fabric", () => {
  assert.equal(
    syncFabricInDescription("The kurti is cotton with gold embroidery.", "Cotton", "Silk"),
    "The kurti is Silk with gold embroidery."
  );
});

test("syncFabricInDescription replaces every occurrence, not just the first", () => {
  assert.equal(
    syncFabricInDescription("This Cotton shirt is made of soft Cotton.", "Cotton", "Linen"),
    "This Linen shirt is made of soft Linen."
  );
});

test("syncFabricInDescription only matches whole words, not a substring inside another word", () => {
  // "Cotton" must not match inside "Cottonwood" or similar - word-boundary guarded.
  assert.equal(syncFabricInDescription("A Cottonwood pattern print.", "Cotton", "Silk"), "A Cottonwood pattern print.");
});

test("syncFabricInDescription leaves the description untouched when the old fabric was never filled in", () => {
  assert.equal(syncFabricInDescription("A plain cotton shirt.", "", "Silk"), "A plain cotton shirt.");
});

test("syncFabricInDescription leaves the description untouched when the old fabric never appears in it", () => {
  assert.equal(syncFabricInDescription("A plain shirt with no fabric mentioned.", "Cotton", "Silk"), "A plain shirt with no fabric mentioned.");
});

test("syncFabricInDescription is a no-op when the fabric didn't actually change", () => {
  assert.equal(syncFabricInDescription("A cotton shirt.", "Cotton", "Cotton"), "A cotton shirt.");
});

test("syncFabricInDescription escapes regex-special characters in the old fabric", () => {
  assert.equal(
    syncFabricInDescription("Made of Mesh & EVA for comfort.", "Mesh & EVA", "Leather"),
    "Made of Leather for comfort."
  );
});

test("jewellery, accessories, and handbags have no sizes at all", () => {
  assert.deepEqual(getSizeOptionsFor("Jewellery & Accessories"), []);
  assert.deepEqual(getSizeOptionsFor("Accessories"), []);
  assert.deepEqual(getSizeOptionsFor("Handbags"), []);
});

test("falls back to standard clothing sizes for an unrecognized subcategory", () => {
  assert.deepEqual(getSizeOptionsFor("Some New Category"), ["XS", "S", "M", "L", "XL", "XXL", "Free Size"]);
  assert.deepEqual(getSizeOptionsFor(undefined), ["XS", "S", "M", "L", "XL", "XXL", "Free Size"]);
});
