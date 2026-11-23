// A random id the browser generates for itself once and keeps in
// localStorage, purely to let the site-visit tracker (components/
// VisitorTracking.tsx) tell "the same browser came back" from "a different
// browser" without any real identity attached - no name, phone, email, or
// account is ever linked to it. Same storage-resilience pattern as
// lib/location.ts (private mode / blocked storage fails silently rather
// than breaking the page).
const KEY = "sio_visitor_id";

export function getOrCreateVisitorId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const existing = localStorage.getItem(KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
    return id;
  } catch {
    // Private mode / blocked storage - this visit just isn't counted rather
    // than breaking the page or generating a fresh id (and inflating the
    // visitor count) on every single page load.
    return null;
  }
}
