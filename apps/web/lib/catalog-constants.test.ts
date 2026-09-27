import { test } from "node:test";
import assert from "node:assert/strict";
import { getSizeOptionsFor } from "./catalog-constants.ts";

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

test("jewellery, accessories, and handbags have no sizes at all", () => {
  assert.deepEqual(getSizeOptionsFor("Jewellery & Accessories"), []);
  assert.deepEqual(getSizeOptionsFor("Accessories"), []);
  assert.deepEqual(getSizeOptionsFor("Handbags"), []);
});

test("falls back to standard clothing sizes for an unrecognized subcategory", () => {
  assert.deepEqual(getSizeOptionsFor("Some New Category"), ["XS", "S", "M", "L", "XL", "XXL", "Free Size"]);
  assert.deepEqual(getSizeOptionsFor(undefined), ["XS", "S", "M", "L", "XL", "XXL", "Free Size"]);
});
