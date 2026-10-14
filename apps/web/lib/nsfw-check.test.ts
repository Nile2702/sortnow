import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateNsfwPredictions } from "./nsfw-check.ts";
import type { PredictionType } from "nsfwjs";

// These exercise the pure threshold logic only - evaluateNsfwPredictions()
// never touches the real nsfwjs model or an actual image, so this verifies
// the blocking path with fake/mocked classifier output instead of a real
// explicit test image, which was deliberately not sourced (see the report
// for why).

test("passes an ordinary neutral fashion photo", () => {
  const predictions: PredictionType[] = [
    { className: "Neutral", probability: 0.95 },
    { className: "Drawing", probability: 0.03 },
    { className: "Sexy", probability: 0.015 },
    { className: "Porn", probability: 0.004 },
    { className: "Hentai", probability: 0.001 },
  ];
  const result = evaluateNsfwPredictions(predictions);
  assert.equal(result.safe, true);
});

test("does not flag a swimwear/lingerie product photo as unsafe", () => {
  // High "Sexy" (nsfwjs's own bucket for bikinis/lingerie/swimwear - not
  // pornographic) with low Porn/Hentai is exactly the legitimate-apparel
  // case the threshold is designed to let through untouched.
  const predictions: PredictionType[] = [
    { className: "Sexy", probability: 0.88 },
    { className: "Neutral", probability: 0.1 },
    { className: "Porn", probability: 0.015 },
    { className: "Hentai", probability: 0.004 },
    { className: "Drawing", probability: 0.001 },
  ];
  const result = evaluateNsfwPredictions(predictions);
  assert.equal(result.safe, true);
});

test("blocks a clearly explicit photographic result", () => {
  const predictions: PredictionType[] = [
    { className: "Porn", probability: 0.92 },
    { className: "Sexy", probability: 0.05 },
    { className: "Hentai", probability: 0.01 },
    { className: "Neutral", probability: 0.015 },
    { className: "Drawing", probability: 0.005 },
  ];
  const result = evaluateNsfwPredictions(predictions);
  assert.equal(result.safe, false);
  assert.ok(result.reason);
});

test("blocks a clearly explicit drawing/hentai result", () => {
  const predictions: PredictionType[] = [
    { className: "Hentai", probability: 0.86 },
    { className: "Drawing", probability: 0.08 },
    { className: "Sexy", probability: 0.04 },
    { className: "Porn", probability: 0.015 },
    { className: "Neutral", probability: 0.005 },
  ];
  const result = evaluateNsfwPredictions(predictions);
  assert.equal(result.safe, false);
});

test("stays below the threshold just under the cutoff", () => {
  // Porn + Hentai = 0.7, below the 0.8 combined cutoff.
  const predictions: PredictionType[] = [
    { className: "Porn", probability: 0.5 },
    { className: "Hentai", probability: 0.2 },
    { className: "Sexy", probability: 0.2 },
    { className: "Neutral", probability: 0.08 },
    { className: "Drawing", probability: 0.02 },
  ];
  const result = evaluateNsfwPredictions(predictions);
  assert.equal(result.safe, true);
});

test("flags right at/above the threshold", () => {
  // Porn + Hentai = 0.81, at/above the 0.8 combined cutoff.
  const predictions: PredictionType[] = [
    { className: "Porn", probability: 0.6 },
    { className: "Hentai", probability: 0.21 },
    { className: "Sexy", probability: 0.1 },
    { className: "Neutral", probability: 0.08 },
    { className: "Drawing", probability: 0.01 },
  ];
  const result = evaluateNsfwPredictions(predictions);
  assert.equal(result.safe, false);
});

test("missing classes default to zero probability rather than throwing", () => {
  const result = evaluateNsfwPredictions([{ className: "Neutral", probability: 1 }]);
  assert.equal(result.safe, true);
});
