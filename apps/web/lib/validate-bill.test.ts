import { test } from "node:test";
import assert from "node:assert/strict";
import { validateBillInput } from "./validate-bill.ts";

test("accepts a valid bill payload", () => {
  const { errors, data } = validateBillInput({
    items: [{ productId: "p-1", quantity: 2 }],
    paymentMode: "cash",
  });
  assert.deepEqual(errors, []);
  assert.deepEqual(data?.items, [{ productId: "p-1", quantity: 2, size: undefined }]);
  assert.equal(data?.paymentMode, "cash");
});

test("accepts and trims an optional size per line item", () => {
  const { errors, data } = validateBillInput({
    items: [{ productId: "p-1", quantity: 1, size: "  M  " }],
    paymentMode: "cash",
  });
  assert.deepEqual(errors, []);
  assert.equal(data?.items[0].size, "M");
});

test("treats a blank size as omitted", () => {
  const { data } = validateBillInput({ items: [{ productId: "p-1", quantity: 1, size: "   " }], paymentMode: "cash" });
  assert.equal(data?.items[0].size, undefined);
});

test("rejects a non-string size", () => {
  const { errors } = validateBillInput({ items: [{ productId: "p-1", quantity: 1, size: 42 }], paymentMode: "cash" });
  assert.ok(errors.some((e) => e.includes("size")));
});

test("rejects an empty items array", () => {
  const { errors } = validateBillInput({ items: [], paymentMode: "cash" });
  assert.ok(errors.some((e) => e.includes("items")));
});

test("rejects a non-array items field", () => {
  const { errors } = validateBillInput({ items: "not-an-array", paymentMode: "cash" });
  assert.ok(errors.some((e) => e.includes("items")));
});

test("rejects a missing or blank productId", () => {
  const { errors } = validateBillInput({ items: [{ quantity: 1 }], paymentMode: "cash" });
  assert.ok(errors.some((e) => e.includes("productId")));
});

test("rejects a non-positive or non-integer quantity", () => {
  assert.ok(validateBillInput({ items: [{ productId: "p-1", quantity: 0 }], paymentMode: "cash" }).errors.length > 0);
  assert.ok(validateBillInput({ items: [{ productId: "p-1", quantity: -2 }], paymentMode: "cash" }).errors.length > 0);
  assert.ok(validateBillInput({ items: [{ productId: "p-1", quantity: 1.5 }], paymentMode: "cash" }).errors.length > 0);
  assert.ok(validateBillInput({ items: [{ productId: "p-1", quantity: 5000 }], paymentMode: "cash" }).errors.length > 0);
});

test("rejects an invalid payment mode", () => {
  const { errors } = validateBillInput({ items: [{ productId: "p-1", quantity: 1 }], paymentMode: "bitcoin" });
  assert.ok(errors.some((e) => e.includes("paymentMode")));
});

test("accepts every valid payment mode", () => {
  for (const mode of ["cash", "upi", "card", "other"]) {
    const { errors } = validateBillInput({ items: [{ productId: "p-1", quantity: 1 }], paymentMode: mode });
    assert.deepEqual(errors, []);
  }
});

test("accepts an omitted customer name/phone", () => {
  const { errors, data } = validateBillInput({ items: [{ productId: "p-1", quantity: 1 }], paymentMode: "upi" });
  assert.deepEqual(errors, []);
  assert.equal(data?.customerName, undefined);
  assert.equal(data?.customerPhone, undefined);
});

test("trims customer name/phone and treats blank as omitted", () => {
  const { data } = validateBillInput({
    items: [{ productId: "p-1", quantity: 1 }],
    paymentMode: "upi",
    customerName: "  Asha  ",
    customerPhone: "   ",
  });
  assert.equal(data?.customerName, "Asha");
  assert.equal(data?.customerPhone, undefined);
});

test("rejects too many line items", () => {
  const items = Array.from({ length: 51 }, (_, i) => ({ productId: `p-${i}`, quantity: 1 }));
  const { errors } = validateBillInput({ items, paymentMode: "cash" });
  assert.ok(errors.some((e) => e.includes("items")));
});
