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
