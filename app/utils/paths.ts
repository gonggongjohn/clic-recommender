import { hasProtocol, joinURL } from "ufo";

/**
 * Path helpers for a deployment that is mounted on a sub-path.
 *
 * The two Static Web Apps are reached through a shared domain that routes by
 * path prefix (`/recommender/` and `/recommender-cle/`; see `app.baseURL` in
 * nuxt.config.ts). Nuxt rewrites the things it owns - the router, `<NuxtLink>`,
 * and the hashed files under `_nuxt/` - but three kinds of URL are written by
 * hand in this codebase and are invisible to it:
 *
 *   1. files served straight from `public/` (logos, the background photo, the
 *      favicon). `<NuxtImg>` runs with `provider: "none"`, which returns `src`
 *      untouched, so `/logo.svg` stays `/logo.svg` and 404s under a prefix.
 *   2. `$fetch("/api/...")` calls. `$fetch` is a plain HTTP client with no
 *      notion of the app's base path, but the Nitro routes now live at
 *      `<baseURL>api/...`.
 *   3. `url(...)` references inside `<style>` blocks, which are emitted
 *      verbatim into the stylesheet. Those are handled at their call sites by
 *      binding a CSS custom property to `publicAssetUrl()`.
 *
 * Both helpers read the base path from the runtime config rather than from a
 * build-time constant, so a deployment can still be re-pointed by setting
 * NUXT_APP_BASE_URL in the Static Web App settings without touching the code.
 *
 * Auto-imported by Nuxt, so no import is needed at the call sites. They read
 * `useRuntimeConfig()` and therefore follow the same rule as a composable: call
 * them from a component (setup, template, or an event handler), not at module
 * scope.
 */

/** This deployment's base path, always with a leading and trailing slash. */
export const appBasePath = (): string => {
  const app = useRuntimeConfig().app as { baseURL?: string };
  return app?.baseURL || "/";
};

/**
 * URL for a file that ships in `public/`.
 *
 *   publicAssetUrl("/logo.svg") -> "/recommender/logo.svg"
 *
 * Absolute URLs and data URIs are returned unchanged, so this is safe to apply
 * to a value that may already be external.
 */
export const publicAssetUrl = (path: string): string => {
  if (!path || hasProtocol(path) || path.startsWith("data:")) return path;

  const app = useRuntimeConfig().app as { baseURL?: string; cdnURL?: string };
  // `cdnURL` wins when set, matching how Nuxt resolves its own build assets.
  return joinURL(app?.cdnURL || app?.baseURL || "/", path);
};

/**
 * URL for one of this app's own Nitro routes.
 *
 *   apiUrl("/api/search") -> "/recommender/api/search"
 */
export const apiUrl = (path: string): string => {
  if (!path || hasProtocol(path)) return path;

  return joinURL(appBasePath(), path);
};
