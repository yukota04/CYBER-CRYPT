/**
 * AdsBitvex rewarded ads helper (https://adsbitvex.com/)
 * App ID: 000572
 *
 * Flow: show loading UI → wait until SDK is ready → call showadsbitvex()
 * → keep loading until the ad UI appears / promise settles → grant reward only on success.
 */

export const ADSBITVEX_APP_ID = '000572';
export const ADSBITVEX_SDK_SRC = `https://sdk.adsbitvex.com/functions/v1/ad-script?appid=${ADSBITVEX_APP_ID}`;

declare global {
  interface Window {
    showadsbitvex?: () => Promise<unknown>;
    __adsbitvexLoadingPromise?: Promise<void>;
  }
}

export type AdsBitvexResult =
  | { ok: true }
  | { ok: false; reason: 'unavailable' | 'error' | 'timeout' | 'blocked'; message?: string };

const SDK_LOAD_TIMEOUT_MS = 20000;
const AD_SHOW_TIMEOUT_MS = 90000;

function loadSdkScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('NO_WINDOW'));
  }
  if (typeof window.showadsbitvex === 'function') {
    return Promise.resolve();
  }
  if (window.__adsbitvexLoadingPromise) {
    return window.__adsbitvexLoadingPromise;
  }

  window.__adsbitvexLoadingPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-adsbitvex-sdk="1"], script[src*="sdk.adsbitvex.com"]`
    );
    if (existing && typeof window.showadsbitvex === 'function') {
      resolve();
      return;
    }

    const script = existing ?? document.createElement('script');
    let settled = false;
    const finishOk = () => {
      if (settled) return;
      settled = true;
      // SDK may attach showadsbitvex slightly after onload
      const started = Date.now();
      const poll = () => {
        if (typeof window.showadsbitvex === 'function') {
          resolve();
          return;
        }
        if (Date.now() - started > 4000) {
          reject(new Error('SDK_READY_TIMEOUT'));
          return;
        }
        requestAnimationFrame(poll);
      };
      poll();
    };
    const finishErr = (err: Error) => {
      if (settled) return;
      settled = true;
      window.__adsbitvexLoadingPromise = undefined;
      reject(err);
    };

    const timer = window.setTimeout(() => finishErr(new Error('SDK_LOAD_TIMEOUT')), SDK_LOAD_TIMEOUT_MS);

    script.async = true;
    script.dataset.adsbitvexSdk = '1';
    script.src = ADSBITVEX_SDK_SRC;
    script.onload = () => {
      window.clearTimeout(timer);
      finishOk();
    };
    script.onerror = () => {
      window.clearTimeout(timer);
      finishErr(new Error('SDK_LOAD_FAILED'));
    };

    if (!existing) {
      document.head.appendChild(script);
    } else {
      // Script tag present but API not ready yet — wait for it
      const waitExisting = () => {
        if (typeof window.showadsbitvex === 'function') {
          window.clearTimeout(timer);
          finishOk();
          return;
        }
        window.setTimeout(waitExisting, 120);
      };
      waitExisting();
    }
  });

  return window.__adsbitvexLoadingPromise;
}

/**
 * Show a rewarded AdsBitvex ad.
 * Call while your loading overlay is already visible so the user never
 * stares at a blank screen before the ad appears.
 */
export async function showAdsBitvexRewarded(
  hooks?: {
    /** Fired once the SDK is loaded and showadsbitvex() is about to run (ad should appear soon). */
    onAdLaunching?: () => void;
  }
): Promise<AdsBitvexResult> {
  try {
    await loadSdkScript();
  } catch (err) {
    return {
      ok: false,
      reason: 'unavailable',
      message: err instanceof Error ? err.message : 'SDK_LOAD_FAILED'
    };
  }

  if (typeof window.showadsbitvex !== 'function') {
    return { ok: false, reason: 'unavailable', message: 'showadsbitvex missing' };
  }

  hooks?.onAdLaunching?.();

  try {
    const showPromise = Promise.resolve(window.showadsbitvex());
    const timeoutPromise = new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error('AD_SHOW_TIMEOUT')), AD_SHOW_TIMEOUT_MS);
    });
    await Promise.race([showPromise, timeoutPromise]);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('TIMEOUT')) {
      return { ok: false, reason: 'timeout', message };
    }
    // Network / no fill / user closed early
    return { ok: false, reason: 'error', message };
  }
}

/** Preload SDK in the background (optional warm-up on title / first gesture). */
export function preloadAdsBitvex(): void {
  if (typeof window === 'undefined') return;
  loadSdkScript().catch(() => {
    /* ignore preload failures — will retry on demand */
  });
}
