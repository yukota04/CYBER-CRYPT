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

export async function loadIconAtlas(): Promise<void> {
  if (ready && atlas) return;
  try {
    const res = await fetch('/icons/atlas.json');
    if (!res.ok) throw new Error(String(res.status));
    atlas = (await res.json()) as IconAtlas;
    ready = true;
    emit();
  } catch (err) {
    console.warn('[CYBER-CRYPT] Icon atlas failed to load', err);
    atlas = { cell: 128, sheetWidth: 1024, sheetHeight: 1024, icons: {} };
    ready = true;
    emit();
  }
}
