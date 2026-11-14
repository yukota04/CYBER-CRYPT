export interface IconFrame {
  sheet: string;
  x: number;
  y: number;
  w: number;
  h: number;
  source?: string;
}

export interface IconAtlas {
  cell: number;
  sheetWidth: number;
  sheetHeight: number;
  icons: Record<string, IconFrame>;
}

let atlas: IconAtlas | null = null;
let ready = false;
const listeners = new Set<() => void>();
/** Decoded sheet object URLs (createImageBitmap → canvas → blob URL). */
const sheetUrls = new Map<string, string>();

function emit() {
  for (const l of listeners) l();
}

export function subscribeIconAtlas(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function isIconAtlasReady(): boolean {
  return ready;
}

export function getIconAtlas(): IconAtlas | null {
  return atlas;
}

export function getIconFrame(id?: string | null): IconFrame | null {
  if (!id || !atlas) return null;
  return atlas.icons[id] || null;
}

/** Prefer decoded blob URL when prefetch finished; else raw /icons path. */
export function getIconSheetUrl(sheet: string): string {
  return sheetUrls.get(sheet) || `/icons/${sheet}`;
}

async function prefetchSheetBitmaps(icons: Record<string, IconFrame>) {
  if (typeof createImageBitmap !== 'function' || typeof fetch !== 'function') return;
  const sheets = new Set<string>();
  for (const frame of Object.values(icons)) {
    if (frame.sheet) sheets.add(frame.sheet);
  }
  await Promise.all(
    [...sheets].map(async sheet => {
      if (sheetUrls.has(sheet)) return;
      try {
        const res = await fetch(`/icons/${sheet}`, {
          // Chromium hint — ignored elsewhere
          priority: 'low'
        } as RequestInit);
        if (!res.ok) return;
        const blob = await res.blob();
        const bitmap = await createImageBitmap(blob);
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          bitmap.close();
          return;
        }
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close();
        const outBlob = await new Promise<Blob | null>(resolve =>
          canvas.toBlob(b => resolve(b), 'image/webp', 0.92)
        );
        if (!outBlob) return;
        sheetUrls.set(sheet, URL.createObjectURL(outBlob));
        emit();
      } catch {
        // Keep CSS url(/icons/...) fallback
      }
    })
  );
}

export async function loadIconAtlas(): Promise<void> {
  if (ready && atlas) return;
  try {
    const res = await fetch('/icons/atlas.json', { priority: 'low' } as RequestInit);
    if (!res.ok) throw new Error(String(res.status));
    atlas = (await res.json()) as IconAtlas;
    ready = true;
    emit();
    // Decode sheets off the critical path (does not block ready)
    void prefetchSheetBitmaps(atlas.icons);
  } catch (err) {
    console.warn('[CYBER-CRYPT] Icon atlas failed to load', err);
    atlas = { cell: 128, sheetWidth: 1024, sheetHeight: 1024, icons: {} };
    ready = true;
    emit();
  }
}
