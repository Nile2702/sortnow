"use client";

import { useEffect, useRef } from "react";

// A soft ambient glow that follows the pointer, mounted once in the root
// layout. Desktop-only (skips touch devices, where there's no hover cursor
// to follow) and respects prefers-reduced-motion.
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    function handleMove(e: MouseEvent) {
      ref.current?.style.setProperty("--cx", `${e.clientX}px`);
      ref.current?.style.setProperty("--cy", `${e.clientY}px`);
    }
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return <div ref={ref} className="sio-cursor-glow" aria-hidden />;
}
