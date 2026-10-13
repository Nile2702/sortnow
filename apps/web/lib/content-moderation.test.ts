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

test("blocks edged/other non-firearm weapons terminology", () => {
  const machete = moderateText(["Military Style Machete, 18 inch", undefined, undefined, undefined]);
  assert.equal(machete.blocked, true);
  assert.equal(machete.category, "weapons or firearms");

  const taser = moderateText(["Self Defense Taser Keychain", undefined, undefined, undefined]);
  assert.equal(taser.blocked, true);
  assert.equal(taser.category, "weapons or firearms");

  const pepperSpray = moderateText(["Pocket Pepper Spray", undefined, undefined, undefined]);
  assert.equal(pepperSpray.blocked, true);
  assert.equal(pepperSpray.category, "weapons or firearms");
});

test("does not flag ordinary knife/spray fashion and household terms", () => {
  // "knife pleat" is a real skirt-construction term; kitchen knives and
  // scissors are legitimate household/craft items; hair/body spray are
  // everyday grooming products - none of these should trip the broadened
  // weapons category.
  const knifePleat = moderateText(["Knife Pleat Satin Skirt", "Crisp knife pleats, falls to the knee.", "Satin", "Skirts"]);
  assert.equal(knifePleat.blocked, false);

  const kitchenKnife = moderateText(["Kitchen Knife Print Apron", undefined, "Cotton", "Apron"]);
  assert.equal(kitchenKnife.blocked, false);

  const scissors = moderateText(["Fabric Scissors - Tailoring Kit", undefined, undefined, undefined]);
  assert.equal(scissors.blocked, false);

  const hairSpray = moderateText(["Travel-size Hair Spray Bottle Holder", undefined, undefined, "Accessories"]);
  assert.equal(hairSpray.blocked, false);
});

test("blocks counterfeit marketing phrases", () => {
  const result = moderateText(["First Copy Branded Watch", undefined, undefined, undefined]);
  assert.equal(result.blocked, true);
  assert.equal(result.category, "counterfeit or replica goods");
});

test("blocks sex toy / adult product terms", () => {
  const vibrator = moderateText(["Discreet Vibrator", "Battery operated, waterproof.", undefined, undefined]);
  assert.equal(vibrator.blocked, true);
  assert.equal(vibrator.category, "sex toys or adult products");

  const dildo = moderateText(["Silicone Dildo", undefined, undefined, undefined]);
  assert.equal(dildo.blocked, true);
  assert.equal(dildo.category, "sex toys or adult products");

  const adultToy = moderateText(["Novelty Adult Toy Gift Set", undefined, undefined, undefined]);
  assert.equal(adultToy.blocked, true);
  assert.equal(adultToy.category, "sex toys or adult products");
});

test("does not flag ordinary 'adult' sizing or kids' 'toy' terms", () => {
  // "adult" alone (sizing/category, not "adult toy"/"adult toys") and bare
  // "toy" (a kids'-wear print/theme) must stay clear of the new sex-toy
  // category - only the explicit adult-product phrases should match.
  const adultSizing = moderateText(["Adult Kurta Set - Festive Wear", "Available in adult and kids sizing.", "Cotton", "Kurtas"]);
  assert.equal(adultSizing.blocked, false);

  const kidsToyPrint = moderateText(["Toy Train Print Romper", "Playful toy-print romper for toddlers.", "Cotton", "Kids Wear"]);
  assert.equal(kidsToyPrint.blocked, false);
});

test("is case-insensitive and ignores punctuation", () => {
  const result = moderateText(["FIRST-COPY Designer Bag!!", undefined, undefined, undefined]);
  assert.equal(result.blocked, true);
});

test("ignores undefined and empty fields", () => {
  const result = moderateText([undefined, "", undefined]);
  assert.equal(result.blocked, false);
});
