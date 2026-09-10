"use client";

// Minimal pub-sub toast system - no external state library needed. Any
// client component can call showToast(...); <ToastHost/> (mounted once in
// the root layout) is the only thing that listens and renders them.

export interface ToastOptions {
  message: string;
  tone?: "default" | "success" | "error";
}

const EVENT = "sio:toast";

export function showToast(message: string, tone: ToastOptions["tone"] = "default") {
  window.dispatchEvent(new CustomEvent<ToastOptions>(EVENT, { detail: { message, tone } }));
}

export function onToast(cb: (opts: ToastOptions) => void) {
  const handler = (e: Event) => cb((e as CustomEvent<ToastOptions>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
