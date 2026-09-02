/**
 * Keeps the recommender Container App warm so the user does not pay for a
 * scale-from-zero cold start when they press "Search".
 *
 * The whole point is to move that wait off the critical path and into the time
 * the user spends reading the page and typing their question. Two rules follow
 * from that, and everything here is built around them:
 *
 *   1. Nothing in this file may ever block, await into, or throw at the UI.
 *      Every entry point is fire-and-forget and swallows its own errors.
 *   2. Pings are throttled and bounded. An always-on poll would keep a replica
 *      running for every idle open tab and quietly cancel the cost benefit of
 *      scale-to-zero, so keep-alive only runs while the tab is visible and the
 *      user has done something recently.
 *
 * State lives at module scope rather than in `useState` on purpose: this is
 * per-browser-tab scheduling, not application data, and it must not be
 * serialised into the SSR payload. Every mutation is guarded by
 * `import.meta.client` so a server render of a component that calls this
 * composable stays inert.
 */

interface WarmupResult {
  ok: boolean;
  ready?: boolean;
  warming?: boolean;
  reason?: string;
}

interface WarmUpOptions {
  /** Skip the throttle. Use for strong intent signals, e.g. focusing the box. */
  force?: boolean;
  /** Free-text label for the console breadcrumb. */
  reason?: string;
}

/** True once the backend has told us the index is loaded. */
const backendReady = ref(false);
/** True while a ping is outstanding, so the UI can distinguish "cold" states. */
const backendWarming = ref(false);

let inFlight: Promise<WarmupResult> | null = null;
let lastAttemptAt = 0;
let attempts = 0;
let lastActivityAt = 0;
let keepAliveTimer: ReturnType<typeof setTimeout> | undefined;
let listenersBound = false;
let bootstrapped = false;

const now = () => Date.now();

const numeric = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

export const useBackendWarmup = () => {
  const config = useRuntimeConfig();

  const enabled =
    String(config.public.WARMUP_ENABLED ?? "true").toLowerCase() !== "false";

  /** Don't re-ping more often than this unless `force` is set. */
  const minIntervalMs = numeric(config.public.WARMUP_MIN_INTERVAL_MS, 60_000);
  /**
   * Gap between keep-alive pings. Comfortably under the Container App scale-to-
   * zero cooldown (300s by default) so the replica never gets to idle out while
   * the user is still on the page composing a question.
   */
  const keepAliveMs = numeric(config.public.WARMUP_KEEPALIVE_MS, 240_000);
  /**
   * Stop keeping the replica alive once the user has been idle this long. An
   * abandoned tab should be allowed to let the container scale back down.
   */
  const activityWindowMs = numeric(
    config.public.WARMUP_ACTIVITY_WINDOW_MS,
    900_000
  );
  /** Bounded retries while the backend reports "still loading" or unreachable. */
  const maxAttempts = numeric(config.public.WARMUP_MAX_ATTEMPTS, 4);
  /** Backoff before retrying a ping that came back cold. */
  const retryDelayMs = numeric(config.public.WARMUP_RETRY_DELAY_MS, 5_000);

  const noteActivity = () => {
    if (import.meta.client) lastActivityAt = now();
  };

  const userIsActive = () =>
    lastActivityAt > 0 && now() - lastActivityAt < activityWindowMs;

  const tabIsVisible = () =>
    typeof document === "undefined" || document.visibilityState === "visible";

  const ping = async (reason: string): Promise<WarmupResult> => {
    lastAttemptAt = now();
    attempts += 1;
    backendWarming.value = true;

    try {
      const result = await $fetch<WarmupResult>("/api/warmup", {
        method: "GET",
        // The route already resolves errors into `{ ok: false }`; belt and
        // braces so a 502 from the platform cannot reject either.
        retry: 0,
      });

      if (result?.ready) {
        backendReady.value = true;
        attempts = 0;
      }

      return result ?? { ok: false };
    } catch (error) {
      // Deliberately swallowed: warming is an optimisation, and a failed ping
      // just means the user falls back to today's behaviour.
      console.debug(`[warmup] ping failed (${reason})`, error);
      return { ok: false, reason: "request-failed" };
    } finally {
      backendWarming.value = false;
      inFlight = null;
    }
  };

  /**
   * Fire a warm-up ping. Safe to call from anywhere, as often as you like:
   * concurrent calls share one request, and the throttle drops the rest.
   *
   * Returns a promise only so callers *may* chain onto it; nothing in the app
   * should ever await this on a user-visible path.
   */
  const warmUp = (options: WarmUpOptions = {}): Promise<WarmupResult> => {
    const { force = false, reason = "unspecified" } = options;

    if (!import.meta.client || !enabled) {
      return Promise.resolve({ ok: false, reason: "disabled" });
    }

    // Already loaded and confirmed; a keep-alive ping still goes through when
    // forced, but there is nothing to warm.
    if (backendReady.value && !force && now() - lastAttemptAt < keepAliveMs) {
      return Promise.resolve({ ok: true, ready: true });
    }

    if (inFlight) return inFlight;

    if (!force && now() - lastAttemptAt < minIntervalMs) {
      return Promise.resolve({ ok: false, reason: "throttled" });
    }

    if (!force && !backendReady.value && attempts >= maxAttempts) {
      // Backend is persistently cold or broken. Stop hammering it; the search
      // request itself will surface the real error if there is one.
      return Promise.resolve({ ok: false, reason: "attempts-exhausted" });
    }

    inFlight = ping(reason);

    // Retry once the ping resolves cold, so a timed-out first ping (replica
    // still booting) is followed up rather than abandoned.
    void inFlight.then((result) => {
      const cold = !result?.ready;
      if (cold && attempts < maxAttempts && tabIsVisible()) {
        setTimeout(() => {
          void warmUp({ reason: "retry", force: true });
        }, retryDelayMs);
      }
    });

    return inFlight;
  };

  const scheduleKeepAlive = () => {
    if (!import.meta.client || !enabled) return;
    if (keepAliveTimer) clearTimeout(keepAliveTimer);

    keepAliveTimer = setTimeout(() => {
      // Only spend a request when someone is plausibly still about to search.
      if (tabIsVisible() && userIsActive()) {
        void warmUp({ reason: "keep-alive", force: true });
      }
      scheduleKeepAlive();
    }, keepAliveMs);
  };

  const bindListeners = () => {
    if (!import.meta.client || listenersBound) return;
    listenersBound = true;

    // Re-warm when the user comes back to a tab that has been sitting idle:
    // the replica has very likely scaled back to zero in the meantime.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;
      noteActivity();
      if (now() - lastAttemptAt >= keepAliveMs) {
        void warmUp({ reason: "tab-visible" });
      }
    });

    for (const event of ["pointerdown", "keydown", "scroll"]) {
      window.addEventListener(event, noteActivity, { passive: true });
    }
  };

  /**
   * Entry point for the app-start plugin. Idempotent, so it is harmless if a
   * route re-runs it.
   */
  const startAutoWarmup = () => {
    if (!import.meta.client || !enabled || bootstrapped) return;
    bootstrapped = true;

    noteActivity();
    bindListeners();

    const kick = () => {
      void warmUp({ reason: "app-start" });
      scheduleKeepAlive();
    };

    // Defer to idle so the ping never competes with hydration or with fetching
    // the fonts, images and JS the user is actually waiting to see. The timeout
    // guarantees it still fires promptly on a busy main thread.
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(kick, { timeout: 500 });
    } else {
      setTimeout(kick, 200);
    }
  };

  return {
    /** Readonly: has the backend confirmed its index is loaded? */
    isBackendReady: readonly(backendReady),
    /** Readonly: is a warm-up ping currently outstanding? */
    isBackendWarming: readonly(backendWarming),
    warmUp,
    noteActivity,
    startAutoWarmup,
  };
};
