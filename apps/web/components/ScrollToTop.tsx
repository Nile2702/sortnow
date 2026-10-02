"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Next's own scroll-to-top-on-navigation doesn't reliably fire for every
// client-side transition (a known App Router quirk, more noticeable the
// further down a long page - like the footer - a link sits) - a shopper
// clicking "Seller Portal" from the footer landed on the new page already
// scrolled to where the footer had been, not the top. Mounted once in the
// root layout, this just re-asserts window scroll position 0 on every
// pathname change, as a backstop regardless of what caused Next's own
// restoration to skip. Keyed on pathname only (not search params), so a
// same-page filter/query change doesn't reset scroll - only an actual page
// change does.
export function ScrollToTop() {
  const pathname = usePathname();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
