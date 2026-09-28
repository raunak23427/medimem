// Normalizes any uploaded file into a downscaled JPEG that the vision model
// can actually read. Handles the three real-world cases that were silently
// failing before:
//   1. PDF          → render page 1 (and up to 3 pages) to canvas → JPEG
//   2. HEIC (iPhone) → convert to JPEG via heic2any
//   3. Large photo  → downscale longest edge to <= 1600px, re-encode JPEG
//
// Returns one or more base64 JPEG strings (multi-page PDFs return several).
// Throws a human-readable Error the UI can surface directly.

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.85;
const MAX_PDF_PAGES = 3;

export interface PreparedImage {
  base64: string;      // raw base64, no data: prefix
  mimeType: 'image/jpeg';
  pageCount: number;   // how many source pages/images this came from
}

function canvasToBase64(canvas: HTMLCanvasElement): string {
  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  return dataUrl.split(',')[1];
}

// Draw an ImageBitmap/HTMLImageElement onto a downscaled canvas → base64 JPEG.
function downscaleToBase64(source: CanvasImageSource, w: number, h: number): string {
  const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process the image (canvas unavailable).');
  // White background so transparent PNGs don't come out black as JPEG.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvasToBase64(canvas);
}

async function loadImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('This image could not be read. Try a clearer photo or a PNG/JPEG.'));
      img.src = url;
    });
  } finally {
    // revoke after load resolves on next tick
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

// ─── PDF → images ─────────────────────────────────────────────

async function preparePdf(file: File): Promise<PreparedImage[]> {
  const pdfjs = await import('pdfjs-dist');
  // Vite-friendly worker wiring
  const workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const pages = Math.min(pdf.numPages, MAX_PDF_PAGES);
  const out: PreparedImage[] = [];

  for (let i = 1; i <= pages; i++) {
    const page = await pdf.getPage(i);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(2, MAX_EDGE / Math.max(baseViewport.width, baseViewport.height));
    const viewport = page.getViewport({ scale: Math.max(scale, 1) });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not render the PDF.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    out.push({ base64: canvasToBase64(canvas), mimeType: 'image/jpeg', pageCount: pages });
  }
  if (out.length === 0) throw new Error('This PDF appears to be empty.');
  return out;
}

// ─── HEIC → JPEG ──────────────────────────────────────────────

async function prepareHeic(file: File): Promise<Blob> {
  const heic2any = (await import('heic2any')).default;
  const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: JPEG_QUALITY });
  return Array.isArray(converted) ? converted[0] : converted;
}

// ─── Public entry point ───────────────────────────────────────

export async function prepareForAI(file: File): Promise<PreparedImage[]> {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  // PDF
  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return preparePdf(file);
  }

  // HEIC / HEIF (iPhone default)
  if (type === 'image/heic' || type === 'image/heif' || name.endsWith('.heic') || name.endsWith('.heif')) {
    const jpeg = await prepareHeic(file);
    const img = await loadImage(jpeg);
    return [{ base64: downscaleToBase64(img, img.naturalWidth, img.naturalHeight), mimeType: 'image/jpeg', pageCount: 1 }];
  }

  // Regular raster image (jpeg/png/webp/gif...) → downscale + re-encode
  if (type.startsWith('image/')) {
    const img = await loadImage(file);
    return [{ base64: downscaleToBase64(img, img.naturalWidth, img.naturalHeight), mimeType: 'image/jpeg', pageCount: 1 }];
  }

  throw new Error('Unsupported file type. Please upload an image (JPG, PNG, HEIC) or a PDF.');
}
