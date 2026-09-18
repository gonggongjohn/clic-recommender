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
 * Where this app's own Nitro routes are reachable FROM THE CURRENT HOSTNAME.
 *
 * There are two answers, because Azure Static Web Apps serves non-GET requests
 * only on its reserved /api/* prefix. Anything else is handled by the static
 * content service, which answers GET, HEAD and OPTIONS and returns
 * `405 Allow: GET, HEAD, OPTIONS` for a POST. Mounting the app under
 * `app.baseURL` moved its routes to `<baseURL>api/*`, i.e. off that prefix.
 *
 *   prefixed  <baseURL>api        e.g. /recommender-cle/api
 *             The only path the shared domain routes to this deployment, since
 *             it dispatches on the `/recommender-cle` prefix. POSTs work
 *             because the domain rewrites them onto the direct form below
 *             (see EDGE-ROUTING.md) - or, if Azure honours the `routes` rewrite
 *             in nuxt.config.ts, directly.
 *
 *   direct    /api<baseURL>       e.g. /api/recommender-cle
 *             On the reserved prefix, so every verb is accepted with no rewrite
 *             anywhere. `routeRules` in nuxt.config.ts maps it back onto
 *             <baseURL>api/* inside Nitro. Used when the site is opened on its
 *             *.azurestaticapps.net hostname, which has no edge in front of it.
 *
 * The same deployment answers on both hostnames, so this cannot be a build-time
 * flag - it is decided per request, in the browser. `NUXT_PUBLIC_API_BASE`
 * overrides it: "direct", "prefixed", or an explicit path such as
 * "/api/recommender-cle" (useful if the app later gets its own custom domain
 * pointing straight at the Static Web App).
 */
export const apiBasePath = (): string => {
  const base = appBasePath();
  const prefixed = joinURL(base, "/api");

  // No sub-path means the routes already sit on the reserved prefix.
  if (base === "/") return prefixed;

  const direct = joinURL("/api", base);
  const mode = String(
    (useRuntimeConfig().public as { API_BASE?: string })?.API_BASE ?? "auto"
  )
    .trim()
    .toLowerCase();

  if (mode === "prefixed") return prefixed;
  if (mode === "direct") return direct;
  if (mode.startsWith("/")) return mode;

  // Auto. Only the browser knows which hostname the visitor actually typed:
  // the reverse proxy in front of the shared domain rewrites the Host header,
  // so a server-side guess would be wrong. SSR therefore answers "prefixed",
  // which is what the edge expects; nothing calls an API route during SSR.
  if (!import.meta.client) return prefixed;

  return /\.azurestaticapps\.net$/i.test(window.location.hostname)
    ? direct
    : prefixed;
};

/**
 * URL for one of this app's own Nitro routes.
 *
 *   apiUrl("/api/search") -> "/recommender-cle/api/search"           (shared domain)
 *                         -> "https://<host>/api/recommender-cle/search"
 *                                                            (*.azurestaticapps.net)
 *
 * Call sites keep passing the handler's own path, "/api/<name>"; the "/api"
 * segment is supplied by the base, so it is stripped here before joining.
 *
 * Why the direct form comes back absolute
 * ---------------------------------------
 * Every call site uses Nuxt's `$fetch`, which is created with
 * `baseURL: app.baseURL` and puts the base back on with ufo's `withBase()`.
 * That helper leaves a path alone only when it ALREADY starts with the base:
 *
 *   "/recommender-cle/api/search"  starts with the base -> untouched
 *   "/api/recommender-cle/search"  does not             -> "/recommender-cle" + it
 *
 * which is how a perfectly correct direct path turned into
 * /recommender-cle/api/recommender-cle/search on the wire. `withBase()` also
 * returns the input untouched when it has a protocol, so making the direct form
 * absolute is what keeps `$fetch` from prefixing it - and it stays same-origin,
 * so nothing about CORS or cookies changes. Fixing it here rather than passing
 * `baseURL: ""` at each call site means a new call site cannot reintroduce it.
 */
export const apiUrl = (path: string): string => {
  if (!path || hasProtocol(path)) return path;

  const route = /^\/api(?=\/|$)(.*)$/.exec(path);
  // Not an API route after all - treat it as a plain in-app path.
  if (!route) return joinURL(appBasePath(), path);

  const url = joinURL(apiBasePath(), route[1] || "/");

  // Only the direct form needs the origin; the prefixed form already starts
  // with the base, so `$fetch` leaves it alone and it stays readable.
  if (import.meta.client && !url.startsWith(appBasePath())) {
    return joinURL(window.location.origin, url);
  }

  return url;
};