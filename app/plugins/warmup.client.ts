/**
 * Wakes the recommender Container App as soon as the page is interactive.
 *
 * Registered globally rather than on the recommender page alone: a visitor who
 * lands on /about or /instructions first is exactly the visitor we most want to
 * have a warm replica waiting by the time they reach the search box.
 *
 * `.client` suffix keeps it out of SSR entirely, and the work is hooked to
 * `app:mounted` and then deferred to idle, so it can never delay hydration or
 * first paint. The plugin returns immediately; the ping is fire-and-forget.
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook("app:mounted", () => {
    try {
      useBackendWarmup().startAutoWarmup();
    } catch (error) {
      // A warm-up failure must never take the app down with it.
      console.debug("[warmup] could not start background warm-up", error);
    }
  });
});
