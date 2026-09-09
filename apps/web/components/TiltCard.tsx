"use client";

import { useRef } from "react";

// Wraps a card in a subtle 3D tilt-on-hover effect: mousemove position
// within the card drives --rx/--ry custom properties, which globals.css'
// `.sio-tilt` class turns into a perspective rotateX/rotateY. Pointer-only
// (no-op on touch, since there's no hover position to track).
export function TiltCard({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty("--rx", `${px * 10}deg`);
    el.style.setProperty("--ry", `${py * -10}deg`);
  }

  function handleMouseLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }

  return (
    <div ref={ref} className={`sio-tilt ${className}`} style={style} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      {children}
    </div>
  );
}
