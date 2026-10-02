// Shared password strength rules for seller signup - previously the only
// check anywhere was `length < 8` (lib/seed-data.ts's createStore), which
// let through things like "aaaaaaaa" or "11111111". Same validator
// signature convention as validate-product.ts/validate-bill.ts so the
// signup route, createStore, and the client-side form can all point at one
// source of truth instead of three independently-drifting copies.
const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

export function validatePassword(password: unknown): { errors: string[] } {
  const errors: string[] = [];

  if (typeof password !== "string" || password.length === 0) {
    errors.push("Password is required.");
    return { errors };
  }

  if (password.length < MIN_LENGTH) {
    errors.push(`Password must be at least ${MIN_LENGTH} characters.`);
  }
  if (password.length > MAX_LENGTH) {
    errors.push(`Password must be ${MAX_LENGTH} characters or fewer.`);
  }
  if (!/[a-zA-Z]/.test(password)) {
    errors.push("Password must include at least one letter.");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must include at least one number.");
  }

  return { errors };
}
