import { test } from "node:test";
import assert from "node:assert/strict";
import { moderateText } from "./content-moderation.ts";

test("passes ordinary fashion listing text", () => {
  const result = moderateText(["Banarasi Silk Saree — Maroon", "Handwoven saree with a zari border.", "Silk", "Sarees"]);
  assert.equal(result.blocked, false);
});

test("does not flag 'nude' as a shade name", () => {
  const result = moderateText(["Nude Pumps", "Classic nude heels for everyday wear.", undefined, "Footwear"]);
  assert.equal(result.blocked, false);
});

test("does not flag animal-print fashion patterns", () => {
  const result = moderateText(["Leopard Print Scarf", "Faux leopard print, snake print trim.", "Polyester", "Accessories"]);
  assert.equal(result.blocked, false);
});

test("blocks explicit content terms", () => {
  const result = moderateText(["Some Title", "This is pornographic content.", undefined, undefined]);
  assert.equal(result.blocked, true);
  assert.equal(result.category, "sexually explicit content");
});

test("blocks named illegal drugs", () => {
  const result = moderateText(["Weird listing", "Contains cocaine samples.", undefined, undefined]);
  assert.equal(result.blocked, true);
  assert.equal(result.category, "illegal drugs or narcotics");
});

test("blocks weapons terminology", () => {
  const result = moderateText(["Jacket with hidden firearm pocket", undefined, undefined, undefined]);
  assert.equal(result.blocked, true);
  assert.equal(result.category, "weapons or firearms");
});

test("blocks counterfeit marketing phrases", () => {
  const result = moderateText(["First Copy Branded Watch", undefined, undefined, undefined]);
  assert.equal(result.blocked, true);
  assert.equal(result.category, "counterfeit or replica goods");
});

test("is case-insensitive and ignores punctuation", () => {
  const result = moderateText(["FIRST-COPY Designer Bag!!", undefined, undefined, undefined]);
  assert.equal(result.blocked, true);
});

test("ignores undefined and empty fields", () => {
  const result = moderateText([undefined, "", undefined]);
  assert.equal(result.blocked, false);
});
