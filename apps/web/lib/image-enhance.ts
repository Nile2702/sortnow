// The background-removal model is a general saliency segmenter, not a
// garment-specific one - a white strip, piping, or print inside the
// garment often has too little contrast against a light/white backdrop,
// and the model misclassifies it as background right along with the real
// backdrop, cutting a hole in the middle of the garment. But not every
// enclosed transparent region is a mistake: a shirt's neckline, an armpit
// gap, or the space between a hanger and the fabric are *real* holes the
// model got right, and they can be just as "enclosed" as a false-positive
// strip - there's no reliable way to tell them apart just by whether they
// touch the image border (an earlier version of this function assumed
// exactly that, and ended up painting real neckline gaps solid black,
// since a background-removal tool's alpha=0 pixels usually have their RGB
// zeroed out too - there's no color left there to restore).
//
// Instead this only closes *small* gaps: morphological closing (dilate,
// then erode by the same radius) on the alpha mask, which mathematically
// can only fill a hole narrower than roughly 2x the radius - a thin strip
// or seam gets bridged, while a real neckline or armpit opening (wider
// than that) is left alone.
//
// Separately, every pixel's color always comes from the original photo,
// never from the background-removal output's own RGB - not just for
// gap-filled pixels. In low-contrast areas (a fold, a shadow, a soft
// fabric edge) the segmentation model's alpha "matting" gets noisy, and
// since its RGB is alpha-premultiplied (color already multiplied by that
// pixel's own opacity), a locally noisy alpha value drags the stored
// color toward black right along with it - producing visible dark
// speckling in exactly those spots, even where the pixel is still meant
// to be opaque garment. Only the model's alpha channel is trustworthy as
// a mask; sourcing color from the untouched original avoids that
// corruption at every alpha level (opaque, transparent, or a soft
// antialiased edge in between).
export function closeSmallGaps(bgRemovedDataUrl: string, sourceDataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const bgImg = new Image();
    bgImg.onload = () => {
      const width = bgImg.width;
      const height = bgImg.height;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(bgImg, 0, 0);
      const imageData = ctx.getImageData(0, 0, width, height);
      const { data } = imageData;

      const ALPHA_THRESHOLD = 10;
      const mask = new Uint8Array(width * height);
      for (let i = 0; i < width * height; i++) mask[i] = data[i * 4 + 3] >= ALPHA_THRESHOLD ? 1 : 0;

      const radius = Math.min(16, Math.max(3, Math.round(Math.max(width, height) / 220)));
      const closed = boxMorph(boxMorph(mask, width, height, radius, true), width, height, radius, false);

      const srcImg = new Image();
      srcImg.onload = () => {
        const srcCanvas = document.createElement("canvas");
        srcCanvas.width = width;
        srcCanvas.height = height;
        const srcCtx = srcCanvas.getContext("2d");
        if (!srcCtx) return reject(new Error("Canvas not supported"));
        srcCtx.drawImage(srcImg, 0, 0, width, height);
        const srcData = srcCtx.getImageData(0, 0, width, height).data;

        for (let i = 0; i < width * height; i++) {
          const o = i * 4;
          data[o] = srcData[o];
          data[o + 1] = srcData[o + 1];
          data[o + 2] = srcData[o + 2];
          if (closed[i] === 1 && mask[i] === 0) {
            data[o + 3] = 255;
          }
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      srcImg.onerror = () => reject(new Error("Couldn't load original photo for gap-filling"));
      srcImg.src = sourceDataUrl;
    };
    bgImg.onerror = () => reject(new Error("Couldn't load background-removed image"));
    bgImg.src = bgRemovedDataUrl;
  });
}

// Separable box-filter approximation of dilate (isMax) / erode (!isMax) on a
// binary mask - a pixel becomes 1 (dilate) if any pixel in its
// (2*radius+1)-wide window is 1, or stays 1 (erode) only if every pixel in
// that window is 1. Row and column passes each run in O(width*height) via a
// prefix-sum sliding window, rather than an O(radius) inner loop per pixel.
function boxMorph(mask: Uint8Array, width: number, height: number, radius: number, isMax: boolean): Uint8Array {
  const temp = new Uint8Array(width * height);
  const rowPrefix = new Int32Array(width + 1);
  for (let y = 0; y < height; y++) {
    const off = y * width;
    for (let x = 0; x < width; x++) rowPrefix[x + 1] = rowPrefix[x] + mask[off + x];
    for (let x = 0; x < width; x++) {
      const lo = Math.max(0, x - radius);
      const hi = Math.min(width - 1, x + radius);
      const count = rowPrefix[hi + 1] - rowPrefix[lo];
      temp[off + x] = isMax ? (count > 0 ? 1 : 0) : count === hi - lo + 1 ? 1 : 0;
    }
  }

  const result = new Uint8Array(width * height);
  const colPrefix = new Int32Array(height + 1);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) colPrefix[y + 1] = colPrefix[y] + temp[y * width + x];
    for (let y = 0; y < height; y++) {
      const lo = Math.max(0, y - radius);
      const hi = Math.min(height - 1, y + radius);
      const count = colPrefix[hi + 1] - colPrefix[lo];
      result[y * width + x] = isMax ? (count > 0 ? 1 : 0) : count === hi - lo + 1 ? 1 : 0;
    }
  }
  return result;
}

// Shared by the single-product form and the AI bulk photo upload flow -
// both run free client-side background removal, then this. Runs right
// after background removal, while the image still has real transparency to
// work with: finds the bounding box of the actual garment (non-transparent
// pixels) and re-frames the photo tightly around it, recentered, on the
// same 3:4 aspect ratio product cards use everywhere - fixing the common
// case of a seller's photo leaving the garment small and off-center with a
// lot of empty margin. Pure canvas/pixel math, no AI call, so it's free and
// instant like background removal itself.
export function autoAlignAndZoom(dataUrl: string, targetAspect = 3 / 4): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const srcCanvas = document.createElement("canvas");
      srcCanvas.width = img.width;
      srcCanvas.height = img.height;
      const srcCtx = srcCanvas.getContext("2d");
      if (!srcCtx) return reject(new Error("Canvas not supported"));
      srcCtx.drawImage(img, 0, 0);

      const { data } = srcCtx.getImageData(0, 0, img.width, img.height);
      const ALPHA_THRESHOLD = 12; // ignores near-fully-transparent antialiasing noise at the cutout edge
      let minX = img.width;
      let minY = img.height;
      let maxX = 0;
      let maxY = 0;
      let found = false;
      for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
          if (data[(y * img.width + x) * 4 + 3] > ALPHA_THRESHOLD) {
            found = true;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      // No transparency to measure (background wasn't actually removed, or
      // the cutout is empty) - nothing meaningful to crop to.
      const subjectW = maxX - minX + 1;
      const subjectH = maxY - minY + 1;
      if (!found || subjectW < img.width * 0.03 || subjectH < img.height * 0.03) {
        return resolve(dataUrl);
      }

      // Pad around the subject, then grow the crop to the target aspect
      // ratio (rather than stretching the subject to fit it).
      const padX = subjectW * 0.08;
      const padY = subjectH * 0.08;
      let cropX = minX - padX;
      let cropY = minY - padY;
      let cropW = subjectW + padX * 2;
      let cropH = subjectH + padY * 2;
      if (cropW / cropH > targetAspect) {
        const neededH = cropW / targetAspect;
        cropY -= (neededH - cropH) / 2;
        cropH = neededH;
      } else {
        const neededW = cropH * targetAspect;
        cropX -= (neededW - cropW) / 2;
        cropW = neededW;
      }

      // Clamp the crop to the source image's actual bounds.
      const x0 = Math.max(0, cropX);
      const y0 = Math.max(0, cropY);
      const x1 = Math.min(img.width, cropX + cropW);
      const y1 = Math.min(img.height, cropY + cropH);

      const OUT_HEIGHT = 1000;
      const outCanvas = document.createElement("canvas");
      outCanvas.width = Math.round(OUT_HEIGHT * targetAspect);
      outCanvas.height = OUT_HEIGHT;
      const outCtx = outCanvas.getContext("2d");
      if (!outCtx) return reject(new Error("Canvas not supported"));
      outCtx.drawImage(srcCanvas, x0, y0, x1 - x0, y1 - y0, 0, 0, outCanvas.width, outCanvas.height);
      resolve(outCanvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Couldn't load image for auto-align"));
    img.src = dataUrl;
  });
}

/**
 * Corrects a harsh, flat, or poorly-lit phone photo - the common case of a
 * seller's own quick snapshot, including one that's already a real photo of
 * a model wearing the garment (not just a flat-lay that needs the paid AI
 * mannequin step). Runs a classic per-channel "auto levels" histogram
 * stretch (clipping the extreme 0.5% at each end so a few blown-out or
 * crushed pixels don't skew the whole correction) plus a mild saturation
 * lift, so a dull or washed-out shot reads closer to a properly lit one.
 * Free, instant, client-side - applied to the raw photo before background
 * removal runs, so segmentation also works from a cleaner image.
 */
export function autoEnhanceQuality(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { data } = imageData;

      const histR = new Array(256).fill(0);
      const histG = new Array(256).fill(0);
      const histB = new Array(256).fill(0);
      for (let i = 0; i < data.length; i += 4) {
        histR[data[i]]++;
        histG[data[i + 1]]++;
        histB[data[i + 2]]++;
      }
      const totalPixels = data.length / 4;
      const clip = totalPixels * 0.005;

      function findBounds(hist: number[]): { lo: number; hi: number } {
        let lo = 0;
        let hi = 255;
        let acc = 0;
        for (let v = 0; v < 256; v++) {
          acc += hist[v];
          if (acc > clip) {
            lo = v;
            break;
          }
        }
        acc = 0;
        for (let v = 255; v >= 0; v--) {
          acc += hist[v];
          if (acc > clip) {
            hi = v;
            break;
          }
        }
        return hi <= lo ? { lo: 0, hi: 255 } : { lo, hi };
      }

      const r = findBounds(histR);
      const g = findBounds(histG);
      const b = findBounds(histB);
      const stretch = (v: number, lo: number, hi: number) => Math.max(0, Math.min(255, ((v - lo) / (hi - lo)) * 255));

      const SATURATION_BOOST = 1.12;
      for (let i = 0; i < data.length; i += 4) {
        let rv = stretch(data[i], r.lo, r.hi);
        let gv = stretch(data[i + 1], g.lo, g.hi);
        let bv = stretch(data[i + 2], b.lo, b.hi);
        const luma = 0.299 * rv + 0.587 * gv + 0.114 * bv;
        rv = Math.max(0, Math.min(255, luma + (rv - luma) * SATURATION_BOOST));
        gv = Math.max(0, Math.min(255, luma + (gv - luma) * SATURATION_BOOST));
        bv = Math.max(0, Math.min(255, luma + (bv - luma) * SATURATION_BOOST));
        data[i] = rv;
        data[i + 1] = gv;
        data[i + 2] = bv;
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Couldn't load image for auto-enhance"));
    img.src = dataUrl;
  });
}

// Fast blur via canvas 2D context's native CSS-filter support, used as the
// "low-frequency" stand-in for both lighting stabilization and wrinkle
// smoothing below - blurring away fine detail leaves only the slow-changing
// shading/light behind, without hand-rolling a box/gaussian kernel.
function blurCanvas(source: HTMLCanvasElement, radiusPx: number): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = source.width;
  out.height = source.height;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.filter = `blur(${radiusPx}px)`;
  ctx.drawImage(source, 0, 0);
  return out;
}

/**
 * Flattens uneven lighting - a bright flash hotspot or a shadowed corner
 * from window light - without touching the garment's actual color. A heavy
 * blur of the photo stands in for just the lighting (all fine detail is
 * gone, leaving only the slow brightness gradient), then every pixel is
 * rescaled by how far its neighborhood's brightness sits from the photo's
 * overall average: a dim corner gets brightened, a blown-out hotspot gets
 * pulled back down, both toward the same middle. Free, client-side, runs
 * alongside the other canvas-based fixes before background removal.
 */
export function stabilizeLighting(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, 0, 0);

      const radius = Math.max(12, Math.round(Math.min(img.width, img.height) * 0.12));
      const blurCtx = blurCanvas(canvas, radius).getContext("2d");
      if (!blurCtx) return reject(new Error("Canvas not supported"));

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { data } = imageData;
      const lightData = blurCtx.getImageData(0, 0, canvas.width, canvas.height).data;

      let sumLuma = 0;
      const count = data.length / 4;
      for (let i = 0; i < lightData.length; i += 4) {
        sumLuma += 0.299 * lightData[i] + 0.587 * lightData[i + 1] + 0.114 * lightData[i + 2];
      }
      const targetLuma = sumLuma / count;

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue; // leave transparent pixels alone
        const localLuma = 0.299 * lightData[i] + 0.587 * lightData[i + 1] + 0.114 * lightData[i + 2];
        // Clamp the correction so a near-black corner doesn't get blown out
        // trying to match the target brightness exactly.
        const ratio = Math.max(0.6, Math.min(1.6, targetLuma / Math.max(localLuma, 24)));
        data[i] = Math.max(0, Math.min(255, data[i] * ratio));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] * ratio));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] * ratio));
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Couldn't load image for lighting stabilization"));
    img.src = dataUrl;
  });
}

/**
 * Softens the fine, low-contrast shading that creases and wrinkles put into
 * a fabric photo, while leaving real edges - the garment outline, prints,
 * seams, buttons - untouched. Blends each pixel toward a blurred version of
 * itself, but only where the local difference from that blur is small (a
 * wrinkle's soft shading); a big difference means a real edge or pattern
 * boundary, which is left almost entirely alone. Free, client-side - a mild
 * texture-smoothing pass, not true fabric de-wrinkling.
 */
export function reduceWrinkles(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, 0, 0);

      const radius = Math.max(3, Math.round(Math.min(img.width, img.height) * 0.012));
      const blurCtx = blurCanvas(canvas, radius).getContext("2d");
      if (!blurCtx) return reject(new Error("Canvas not supported"));

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { data } = imageData;
      const blurData = blurCtx.getImageData(0, 0, canvas.width, canvas.height).data;

      const EDGE_THRESHOLD = 26; // luma difference above this reads as a real edge, not a wrinkle
      const MAX_SMOOTH = 0.65; // never fully replace a pixel - keeps fabric texture believable
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;
        const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const blurLuma = 0.299 * blurData[i] + 0.587 * blurData[i + 1] + 0.114 * blurData[i + 2];
        const diff = Math.abs(luma - blurLuma);
        const weight = MAX_SMOOTH * Math.max(0, 1 - diff / EDGE_THRESHOLD);
        data[i] += (blurData[i] - data[i]) * weight;
        data[i + 1] += (blurData[i + 1] - data[i + 1]) * weight;
        data[i + 2] += (blurData[i + 2] - data[i + 2]) * weight;
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Couldn't load image for wrinkle smoothing"));
    img.src = dataUrl;
  });
}

export interface BackgroundPreset {
  key: string;
  label: string;
  swatch: string; // CSS background for the picker UI
  wall?: string; // upper backdrop color, if this preset isn't transparent
  floor?: string; // lower/ground color - a touch darker than the wall, like a real studio cove
}

// Catalog-style studio scenes a seller can drop the cutout onto instead of
// leaving it transparent (which renders as plain white on most storefronts
// anyway). Each one is a wall/floor pair rather than a flat fill - a single
// flat color reads as a color swatch, not a place, whereas a wall meeting a
// slightly darker floor at a soft horizon is what an actual studio
// backdrop/cove looks like, and gives the product something to visually
// "stand on".
export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  { key: "transparent", label: "Transparent", swatch: "repeating-conic-gradient(#e2e8f0 0% 25%, #fff 0% 50%) 50% / 12px 12px" },
  { key: "white", label: "Studio White", wall: "#ffffff", floor: "#e4e4e4", swatch: "linear-gradient(#ffffff 60%, #e4e4e4 60%)" },
  { key: "light-grey", label: "Soft Grey", wall: "#eef1f4", floor: "#cfd6dc", swatch: "linear-gradient(#eef1f4 60%, #cfd6dc 60%)" },
  { key: "beige", label: "Warm Beige", wall: "#f5ead9", floor: "#d9c3a0", swatch: "linear-gradient(#f5ead9 60%, #d9c3a0 60%)" },
  { key: "gradient", label: "Studio Cove", wall: "#fbfbfb", floor: "#c3c9cf", swatch: "linear-gradient(#fbfbfb 60%, #c3c9cf 60%)" },
];

/**
 * Draws `cutoutDataUrl` (expected to have real transparency, e.g. straight
 * out of background removal / autoAlignAndZoom) onto a wall-meets-floor
 * studio scene instead of a flat color: a soft gradient "horizon" band
 * blends the wall into the floor the way a real coved backdrop curves, and
 * a soft shadow ellipse is dropped under the subject's own visible base so
 * it looks grounded rather than pasted on. Re-runs from the original cutout
 * each time rather than compositing onto whatever's currently displayed, so
 * switching backgrounds back and forth never degrades the image or leaves a
 * previous backdrop showing through.
 */
export function compositeBackground(cutoutDataUrl: string, preset: BackgroundPreset): Promise<string> {
  const wall = preset.key === "transparent" ? undefined : preset.wall;
  if (!wall) return Promise.resolve(cutoutDataUrl);
  const floor = preset.floor ?? wall;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));

      // Wall for the top ~68%, a soft blended horizon band, then floor for
      // the rest - approximates the curved sweep of a real studio cove
      // without needing an actual gradient mesh.
      const horizonY = canvas.height * 0.68;
      const bandHeight = canvas.height * 0.16;
      const wallGrad = ctx.createLinearGradient(0, horizonY - bandHeight, 0, horizonY + bandHeight);
      wallGrad.addColorStop(0, wall);
      wallGrad.addColorStop(1, floor);

      ctx.fillStyle = wall;
      ctx.fillRect(0, 0, canvas.width, horizonY - bandHeight);
      ctx.fillStyle = wallGrad;
      ctx.fillRect(0, horizonY - bandHeight, canvas.width, bandHeight * 2);
      ctx.fillStyle = floor;
      ctx.fillRect(0, horizonY + bandHeight, canvas.width, canvas.height - (horizonY + bandHeight));

      // Find where the subject actually sits so the shadow lines up with its
      // real base instead of a guessed fixed position.
      const probeCanvas = document.createElement("canvas");
      probeCanvas.width = img.width;
      probeCanvas.height = img.height;
      const probeCtx = probeCanvas.getContext("2d");
      let subjectBottom = canvas.height * 0.85;
      let subjectCenterX = canvas.width / 2;
      let subjectWidth = canvas.width * 0.5;
      if (probeCtx) {
        probeCtx.drawImage(img, 0, 0);
        const { data } = probeCtx.getImageData(0, 0, img.width, img.height);
        let minX = img.width;
        let maxX = 0;
        let maxY = 0;
        let found = false;
        for (let y = 0; y < img.height; y++) {
          for (let x = 0; x < img.width; x++) {
            if (data[(y * img.width + x) * 4 + 3] > 24) {
              found = true;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            }
          }
        }
        if (found) {
          subjectBottom = maxY;
          subjectCenterX = (minX + maxX) / 2;
          subjectWidth = maxX - minX;
        }
      }

      // Flatten a circular gradient into a soft ground-shadow ellipse by
      // scaling the canvas vertically before drawing it - the standard trick
      // for an elliptical gradient, since canvas has no native ellipse
      // gradient primitive.
      ctx.save();
      ctx.translate(subjectCenterX, subjectBottom);
      ctx.scale(1, 0.3);
      const shadowRadius = subjectWidth * 0.55;
      const shadow = ctx.createRadialGradient(0, 0, 0, 0, 0, shadowRadius);
      shadow.addColorStop(0, "rgba(0,0,0,0.22)");
      shadow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = shadow;
      ctx.fillRect(-shadowRadius, -shadowRadius, shadowRadius * 2, shadowRadius * 2);
      ctx.restore();

      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Couldn't load image for background composite"));
    img.src = cutoutDataUrl;
  });
}

/**
 * Picks a backdrop automatically instead of making the seller choose one:
 * averages the color of the garment's own (opaque) pixels and reasons about
 * it like a photographer would - a dark garment gets the brightest backdrop
 * for maximum contrast, a light/white garment gets a soft tinted backdrop
 * instead of white (which would make it blend in and lose its edges), and
 * anything in between gets the neutral studio gradient.
 */
export function pickAutoBackground(cutoutDataUrl: string): Promise<BackgroundPreset> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, 0, 0);

      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const ALPHA_THRESHOLD = 12;
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > ALPHA_THRESHOLD) {
          rSum += data[i];
          gSum += data[i + 1];
          bSum += data[i + 2];
          count++;
        }
      }

      const byKey = (key: string) => BACKGROUND_PRESETS.find((p) => p.key === key)!;
      if (count === 0) return resolve(byKey("white"));

      const avgR = rSum / count;
      const avgG = gSum / count;
      const avgB = bSum / count;
      const luminance = 0.299 * avgR + 0.587 * avgG + 0.114 * avgB; // 0 (black) - 255 (white)
      const warm = avgR > avgB; // used only to break the light-garment tie

      let chosen: string;
      if (luminance < 90) {
        chosen = "white"; // dark garment: brightest backdrop for max contrast
      } else if (luminance > 180) {
        chosen = warm ? "beige" : "light-grey"; // light/white garment: soft tint, not white-on-white
      } else {
        chosen = "gradient"; // mid-tone garment: the neutral studio look flatters most colors
      }
      resolve(byKey(chosen));
    };
    img.onerror = () => reject(new Error("Couldn't load image for auto background selection"));
    img.src = cutoutDataUrl;
  });
}
