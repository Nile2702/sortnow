// Shared validation for a seller-submitted bill-creation request. Same
// reasoning as validate-product.ts: a malformed request (a non-numeric
// quantity, a missing productId, a payment mode that isn't one of the
// three real options) should get a clear 400, not corrupt the bill/stock
// state or crash createBill's assumptions.
const PAYMENT_MODES = ["cash", "upi", "card", "other"] as const;
const MAX_ITEMS = 50;
const MAX_QUANTITY = 1000;
const MAX_TEXT = 200;

export interface BillInput {
  items?: unknown;
  paymentMode?: unknown;
  customerName?: unknown;
  customerPhone?: unknown;
}

export interface ValidatedBillItem {
  productId: string;
  quantity: number;
  size?: string;
}

export interface ValidatedBillInput {
  items: ValidatedBillItem[];
  paymentMode: "cash" | "upi" | "card" | "other";
  customerName?: string;
  customerPhone?: string;
}

export function validateBillInput(input: BillInput): { errors: string[]; data: ValidatedBillInput | null } {
  const errors: string[] = [];

  if (!Array.isArray(input.items) || input.items.length === 0) {
    errors.push("items must be a non-empty array");
  } else if (input.items.length > MAX_ITEMS) {
    errors.push(`items must have at most ${MAX_ITEMS} entries`);
  }

  const items: ValidatedBillItem[] = [];
  if (Array.isArray(input.items)) {
    for (const [i, raw] of input.items.entries()) {
      const line = raw as { productId?: unknown; quantity?: unknown; size?: unknown } | null;
      if (!line || typeof line.productId !== "string" || !line.productId.trim()) {
        errors.push(`items[${i}].productId is required`);
        continue;
      }
      const quantity = Number(line.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0 || quantity > MAX_QUANTITY) {
        errors.push(`items[${i}].quantity must be a positive integer up to ${MAX_QUANTITY}`);
        continue;
      }
      let size: string | undefined;
      if (line.size !== undefined && line.size !== null) {
        if (typeof line.size !== "string" || line.size.length > MAX_TEXT) {
          errors.push(`items[${i}].size must be a string of ${MAX_TEXT} characters or fewer`);
          continue;
        }
        size = line.size.trim() || undefined;
      }
      items.push({ productId: line.productId.trim(), quantity, size });
    }
  }

  if (typeof input.paymentMode !== "string" || !PAYMENT_MODES.includes(input.paymentMode as any)) {
    errors.push(`paymentMode must be one of: ${PAYMENT_MODES.join(", ")}`);
  }

  let customerName: string | undefined;
  if (input.customerName !== undefined && input.customerName !== null) {
    if (typeof input.customerName !== "string" || input.customerName.length > MAX_TEXT) {
      errors.push(`customerName must be a string of ${MAX_TEXT} characters or fewer`);
    } else {
      customerName = input.customerName.trim() || undefined;
    }
  }

  let customerPhone: string | undefined;
  if (input.customerPhone !== undefined && input.customerPhone !== null) {
    if (typeof input.customerPhone !== "string" || input.customerPhone.length > MAX_TEXT) {
      errors.push(`customerPhone must be a string of ${MAX_TEXT} characters or fewer`);
    } else {
      customerPhone = input.customerPhone.trim() || undefined;
    }
  }

  if (errors.length > 0) return { errors, data: null };

  return {
    errors: [],
    data: {
      items,
      paymentMode: input.paymentMode as "cash" | "upi" | "card" | "other",
      customerName,
      customerPhone,
    },
  };
}
