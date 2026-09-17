import { test } from "node:test";
import assert from "node:assert/strict";
import { fuzzyScore, fuzzyMatchesAny, fuzzyBestScore } from "./fuzzy-search.ts";

test("scores an exact substring match highest", () => {
  assert.equal(fuzzyScore("saree", "Banarasi Silk Saree — Maroon"), 100);
});

test("matches a single typo'd word", () => {
  assert.ok(fuzzyScore("kurthi", "Cotton Anarkali Kurti — Mustard") > 0);
  assert.ok(fuzzyScore("saaree", "Banarasi Silk Saree — Maroon") > 0);
});

test("matches when spaces are missing from the query", () => {
  assert.ok(fuzzyScore("slimfitjeans", "Slim Fit Stretch Jeans — Indigo") > 0);
});

test("does not match unrelated gibberish", () => {
  assert.equal(fuzzyScore("xyzabc123qqq", "Cotton Anarkali Kurti — Mustard"), 0);
});

test("does not match short substrings that only coincidentally overlap", () => {
  assert.equal(fuzzyScore("xy", "Cotton Anarkali Kurti — Mustard"), 0);
});

test("fuzzyMatchesAny checks every field and skips undefined ones", () => {
  assert.ok(fuzzyMatchesAny("kurthi", [undefined, "Cotton Anarkali Kurti — Mustard", "Cotton"]));
  assert.equal(fuzzyMatchesAny("kurthi", [undefined, "Slim Fit Jeans"]), false);
});

test("fuzzyBestScore picks the strongest match across fields", () => {
  const score = fuzzyBestScore("saree", ["Cotton", "Banarasi Silk Saree — Maroon"]);
  assert.equal(score, 100);
});
