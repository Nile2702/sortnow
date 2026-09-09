"use client";

import { useEffect } from "react";

// Mounted once in the root layout. Watches for any element carrying
// `.sio-reveal` (added statically anywhere in the tree, no per-page wiring
// needed) and adds `.sio-revealed` the first time it scrolls into view,
// which triggers the sio-reveal-up keyframe defined in globals.css.
export function ScrollRevealInit() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("sio-revealed");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    function scan() {
      document.querySelectorAll(".sio-reveal:not(.sio-revealed)").forEach((el) => observer.observe(el));
    }

    scan();
    // Re-scan on DOM mutations so client-rendered/streamed content (product
    // grids, category tiles) picks up the reveal treatment too.
    const mutationObserver = new MutationObserver(scan);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  return null;
}
