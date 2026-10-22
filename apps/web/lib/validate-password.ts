// Shared password strength rules - previously `length >= 8, a letter, a
// number`, which still passed through things like "password1". Added a
// required special character on top of those same three original rules
// (length/letter/number unchanged) - the minimal strengthening actually
// wanted, not a full rebuild into mixed-case + a longer minimum. Same
// validator signature convention as validate-product.ts/validate-bill.ts so
// the signup route, createStore, and every client-side form can all point
// at one source of truth instead of independently-drifting copies
// (app/account/page.tsx had its own stale inline copy of this rule before
// it was switched over to call this directly).
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
  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push("Password must include at least one special character (e.g. $, !, #).");
  }

  return { errors };
}
