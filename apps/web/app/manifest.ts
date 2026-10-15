import type { MetadataRoute } from "next";

// Without this file, a browser's "Install as app" / "Add to desktop" (what
// shows up to a user as creating a literal desktop/taskbar shortcut "piece
// of software") has no manifest to read icon purpose from, so it falls back
// to generating the shortcut's icon itself - which composites the existing
// transparent app/icon.png onto a white square plate, even though the
// source PNG's background is genuinely transparent. Declaring the icon
// here with purpose "any" (not "maskable", which the PWA spec expects to
// have its own solid-color safe zone a mask can crop into - a plain
// transparent logo isn't designed for that and would still show a
// background plate) tells the installer to use the file's own real
// transparency instead of inventing a backing plate for it.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SORT NOW — Find fashion near you",
    short_name: "SORT NOW",
    description: "Discover apparel from stores near you, sort by what matters, and walk into the store to try it on or buy.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f5f6",
    theme_color: "#16140f",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
