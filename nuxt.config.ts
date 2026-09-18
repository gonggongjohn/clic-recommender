import vuetify, { transformAssetUrls } from "vite-plugin-vuetify";

// ---------------------------------------------------------------------------
// Sub-path hosting (base URL)
// ---------------------------------------------------------------------------
// Both deployments are reached through a shared domain that routes by path
// prefix rather than by hostname:
//
//   https://<shared-domain>/recommender/      -> original Static Web App
//   https://<shared-domain>/recommender-cle/  -> course Static Web App
//
// Everything the browser asks for therefore carries that prefix, so the app has
// to be built knowing it: `app.baseURL` is what makes Nuxt emit
// /recommender/_nuxt/*.js instead of /_nuxt/*.js, and what makes the Nitro
// handler answer on the prefixed paths. Without it the HTML loads but every CSS
// and JS request 404s, which is the symptom this block fixes.
//
// IMPORTANT: this is a BUILD-TIME value. The azure-swa preset bakes it into the
// output layout (`.output/public/<baseURL>/...`) and into the generated HTML, so
// the variable must be present in the build job (the GitHub Actions workflow /
// Oryx build), not only in the Static Web App application settings. Setting it
// in both places is correct and harmless; see BASE_PATH.md.
//
// Resolution order:
//   1. NUXT_APP_BASE_URL / SITE_BASE_URL / BASE_URL - explicit override
//   2. the per-site default below, keyed by SITE_ID
//   3. "/recommender/"                              - the default site's prefix
//
// NUXT_APP_BASE_URL is Nuxt's own name for this setting and is also read back
// at runtime, so prefer it; the other two are accepted as conveniences.
const siteId = (process.env.NUXT_PUBLIC_SITE_ID ?? process.env.SITE_ID ?? "main")
  .trim()
  .toLowerCase();

/** Default base path per deployment. Override with NUXT_APP_BASE_URL/BASE_URL. */
const SITE_BASE_URLS: Record<string, string> = {
  main: "/recommender",
  course: "/recommender-cle",
};

/**
 * Nuxt wants a base URL with a leading *and* trailing slash ("/recommender/").
 * Accept the forgiving spellings an operator is likely to type into the portal
 * ("recommender", "/recommender") and normalise them, so a missing slash cannot
 * quietly break every asset URL again.
 */
const normalizeBaseURL = (value?: string | null): string | undefined => {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;

  const path = `/${raw}/`.replace(/\/{2,}/g, "/");
  return path;
};

// Every candidate goes through the normaliser, including the built-in defaults.
//
// It used to be applied only to the environment variables, so with no override
// set `baseURL` was the raw table value "/recommender-cle" - no trailing slash.
// Nuxt itself survives that (it normalises at runtime and joins with joinURL),
// which is why the site looked fine, but every `${baseURL}x` template literal
// in this file silently produced a wrong path:
//
//   `${baseURL}api/*`   -> "/recommender-cleapi/*"    (route rule matched nothing)
//   `${baseURL}_nuxt/*` -> "/recommender-cle_nuxt/*"  (exclusion never applied)
//
// Keep the trailing slash guaranteed here rather than remembering to add it at
// each interpolation.
const baseURL =
  normalizeBaseURL(
    process.env.NUXT_APP_BASE_URL ??
      process.env.SITE_BASE_URL ??
      process.env.BASE_URL ??
      SITE_BASE_URLS[siteId] ??
      SITE_BASE_URLS.main
  ) ?? "/";

// Cheap insurance: this bug cost an afternoon of chasing 405s and it is
// invisible at runtime, so fail the build instead of shipping bad routes.
if (!baseURL.startsWith("/") || !baseURL.endsWith("/")) {
  throw new Error(
    `[nuxt.config] baseURL must have a leading and trailing slash, got "${baseURL}"`
  );
}

export default defineNuxtConfig({
  devtools: { enabled: true },

  experimental: {
    watcher: "builder",
  },

  app: {
    // Resolved above from NUXT_APP_BASE_URL / BASE_URL / SITE_ID.
    baseURL,
    // Made explicit so the asset prefix is visible next to the base path; this
    // is the Nuxt default and the two are joined as <baseURL><buildAssetsDir>,
    // e.g. /recommender/_nuxt/entry.[hash].js.
    buildAssetsDir: "/_nuxt/",
    // Only needed if the built assets are ever fronted by a CDN on a different
    // origin. Empty means "serve them from this site, under baseURL".
    cdnURL: process.env.NUXT_APP_CDN_URL ?? "",

    head: {
      charset: "utf-8",
      viewport: "width=device-width, initial-scale=1",
      link: [
        // The original site sets headings in a slab serif and body copy in a
        // humanist sans. Swap these two families (here and in
        // tailwind.config.ts `fontFamily`) if you want a different pairing.
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossorigin: "",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Bitter:wght@400;600;700&family=Lato:wght@300;400;700&display=swap",
        },
      ],
    },
  },

  runtimeConfig: {
    backend: process.env.BACKEND ?? "",
    teams: process.env.TEAMS ?? "",
    logDir: process.env.LOG_DIR ?? "",
    // Which Static Web App this build is serving. The two deployments run the
    // SAME codebase and differ only in these settings, so content and feature
    // changes ship to both without a second branch to keep in sync.
    //
    //   original site : leave unset (behaves as "main")
    //   course site   : SITE_ID=course
    //
    // Must match a key in the backend's LOG_SITE_TABLES.
    siteId: process.env.SITE_ID ?? "main",
    // Shared secret proving to the backend that this really is one of our
    // frontends, which is what lets it trust the forwarded client IP. Server
    // side only: never place this under `public`.
    analyticsIngestKey: process.env.ANALYTICS_INGEST_KEY ?? "",
    // How long /api/warmup holds the connection open waiting for a cold
    // Container App replica to answer. Long on purpose: the browser never
    // awaits this call, and the reply is how the client learns it can stop
    // re-pinging. Only the server route reads this.
    warmupTimeoutMs: process.env.WARMUP_TIMEOUT_MS ?? "20000",
    public: {
      // Which form of the API path the browser should call:
      //
      //   "auto"      (default) prefixed on the shared domain, direct on the
      //               Static Web App's own *.azurestaticapps.net hostname
      //   "prefixed"  always <baseURL>api/...      e.g. /recommender-cle/api/search
      //   "direct"    always /api<baseURL>...      e.g. /api/recommender-cle/search
      //   "/some/path" an explicit base, for a custom domain that points
      //               straight at the Static Web App with no path prefix
      //
      // See `apiBasePath()` in app/utils/paths.ts. This is deliberately runtime
      // rather than build-time: one deployment answers on both hostnames.
      API_BASE: process.env.API_BASE ?? "auto",
      // Exposed so the client can tag events; the server route re-stamps the
      // value from `siteId` above before forwarding, so this is a hint only.
      SITE_ID: process.env.SITE_ID ?? "main",
      // Attach the browser-reported device profile (form factor, screen,
      // timezone, persistent device id) to analytics events. Off by default so
      // the original site is unchanged; set to "true" on the course site.
      DEVICE_TELEMETRY_ENABLED: process.env.DEVICE_TELEMETRY_ENABLED ?? "false",
      // Background wake-up ping for the scale-to-zero backend. Set
      // NUXT_PUBLIC_WARMUP_ENABLED=false to switch the whole thing off.
      WARMUP_ENABLED: process.env.WARMUP_ENABLED ?? "true",
      // Minimum gap between unforced pings.
      WARMUP_MIN_INTERVAL_MS: process.env.WARMUP_MIN_INTERVAL_MS ?? "60000",
      // Keep-alive cadence. Must stay below the Container App scale-to-zero
      // cooldown (300s by default) or the replica dies between pings.
      WARMUP_KEEPALIVE_MS: process.env.WARMUP_KEEPALIVE_MS ?? "240000",
      // Stop keeping the replica alive once the user has been idle this long,
      // so an abandoned tab is allowed to let the container scale back down.
      WARMUP_ACTIVITY_WINDOW_MS:
        process.env.WARMUP_ACTIVITY_WINDOW_MS ?? "900000",
      // Bounded retries while the backend is still cold or unreachable.
      WARMUP_MAX_ATTEMPTS: process.env.WARMUP_MAX_ATTEMPTS ?? "4",
      WARMUP_RETRY_DELAY_MS: process.env.WARMUP_RETRY_DELAY_MS ?? "5000",
      MAX_TOPIC_NUM: process.env.MAX_TOPIC_NUM ?? "5",
      // Results per page in step 3.
      QUESTIONS_PER_PAGE:
        process.env.QUESTIONS_PER_PAGE ?? process.env.MAX_QUESTION_NUM ?? "5",
      // Ceiling across all pages; "0" shows everything the backend returned.
      MAX_QUESTION_TOTAL: process.env.MAX_QUESTION_TOTAL ?? "0",
      // Deprecated: previously capped the total shown. Kept as a fallback for
      // QUESTIONS_PER_PAGE so an existing deployment keeps its configured value.
      MAX_QUESTION_NUM: process.env.MAX_QUESTION_NUM ?? "",
    },
  },

  css: ["~/assets/css/main.css"],

  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },

  build: {
    transpile: ["vuetify"],
  },

  nitro: {
    // ---------------------------------------------------------------------
    // The door into this app that always accepts POST
    // ---------------------------------------------------------------------
    // Static Web Apps allows non-GET requests on /api/* and nowhere else, so an
    // app mounted under `<baseURL>` has its routes on a GET-only path. This
    // rule exposes the same handlers on the reserved prefix, with the base path
    // moved inside it:
    //
    //   /api/recommender-cle/search  ->  /recommender-cle/api/search
    //
    // On *.azurestaticapps.net the client calls that form directly (see
    // `apiBasePath()` in app/utils/paths.ts), so POST works with no rewrite in
    // front of the site. On the shared domain the edge rewrites
    // <domain>/recommender-cle/api/<x> to this same path, so both hostnames end
    // up in one code path.
    //
    // Why the base path is repeated inside the prefix rather than a plain
    // `/api/**`: route rules are matched against the path with `app.baseURL`
    // stripped off, so `/api/**` would also match its own target
    // (`/recommender-cle/api/search` strips to `/api/search`) and proxy to
    // itself forever. `/api/recommender-cle/**` cannot collide with it, and it
    // stays unique per deployment - which also lets the shared domain route the
    // two sites apart if you ever prefer routing over rewriting.
    //
    // A `/**` key makes Nitro strip the key's prefix before joining, so any
    // <x> maps through, with method, headers and body forwarded untouched.
    routeRules:
      baseURL === "/"
        ? {}
        : { [`/api${baseURL}**`]: { proxy: `${baseURL}api/**` } },

    azure: {
      config: {
        // Nitro's azure-swa preset only recognises the literal strings "16",
        // "18" and "20" in package.json `engines.node`; anything else (such as
        // "22.x") silently falls back to `node:18`, which Azure Static Web Apps
        // retired on 31 May 2025. Set the API runtime explicitly instead.
        platform: {
          apiRuntime: "node:22",
        },
        navigationFallback: {
          // Anything that is not a file on disk goes to the Nitro function,
          // which now answers on the prefixed paths because of `app.baseURL`.
          rewrite: "/api/server",
          // ...except the hashed build assets. Without this exclusion a stale
          // or mistyped /_nuxt/* URL is answered with the HTML shell, and the
          // browser reports a confusing MIME-type error ("Expected a
          // JavaScript module but the server responded with text/html")
          // instead of a plain 404 that points straight at the real problem.
          exclude: [`${baseURL}_nuxt/*`],
        },
        routes: [
          // Non-GET requests to the Nitro routes.
          //
          // `navigationFallback` is the fallback of the *static content*
          // service, which serves GET, HEAD and OPTIONS only - so once the app
          // moved under `<baseURL>`, the API moved with it to `<baseURL>api/*`
          // and every POST was answered with `405 Allow: GET, HEAD, OPTIONS`
          // before any handler ran. A `routes` rule is the only thing that can
          // hand a non-GET request to the Functions host.
          //
          // Azure forwards the pre-rewrite URL in `x-ms-original-url`, which
          // Nitro's azure-swa entry reads, so the handler still sees the
          // prefixed path.
          //
          // Whether this is sufficient is what the current deploy tests. Azure
          // may restrict non-GET to the literal /api/* prefix regardless of
          // route rules (Azure/static-web-apps#1132); if so, this rule cannot
          // help and the `routeRules` fallback above is the route to use.
          {
            route: `${baseURL}api/*`,
            methods: [
              "GET",
              "HEAD",
              "OPTIONS",
              "POST",
              "PUT",
              "PATCH",
              "DELETE",
            ],
            rewrite: "/api/server",
          },
          // The Static Web App's own *.azurestaticapps.net hostname serves the
          // site at the root, where nothing is mounted any more. Send it to the
          // prefix so the direct URL keeps working for smoke tests.
          {
            route: "/",
            redirect: baseURL,
          },
        ],
      },
    },
  },

  modules: [
    "@nuxtjs/i18n",
    "@nuxt/image",
    "@maz-ui/nuxt",
  ],

  image: {
    // Why "none":
    //
    // @nuxt/image's default `ipx` provider rewrites <NuxtImg> to
    // /_ipx/w_85/Logo_markOnly.svg and resizes on demand inside the Nitro
    // server. IPX reads the source file from disk at `ipx.fs.dir`, which
    // Nitro hard-codes to "../../public" relative to the built nitro chunk.
    //
    //   node-server preset -> .output/server/chunks/nitro/ + ../../public
    //                         = .output/public            -> EXISTS  (200)
    //   azure-swa preset   -> .output/server/functions/chunks/nitro/ + ../../public
    //                         = .output/server/functions/public -> MISSING (404)
    //
    // On Azure Static Web Apps the public folder is uploaded to the static
    // CDN and is NOT copied into the Functions bundle, so every /_ipx/**
    // request 404s. That is why the logos break only after deployment.
    //
    // These three images are fixed-size brand assets (an SVG, an .ico and a
    // small PNG) with nothing to gain from runtime resizing, so serve them
    // straight from the CDN. <NuxtImg> now emits <img src="/Logo_markOnly.svg">.
    provider: "none",
  },

  i18n: {
    strategy: "no_prefix",
    langDir: "locales",
    defaultLocale: "EN-US",
    locales: [
      {
        code: "EN-US",
        language: "en-US",
        name: "English (US)",
        file: "en_US.json",
      },
      {
        code: "ZH-CN",
        language: "zh-Hans-CN",
        name: "Simplified Chinese",
        file: "zh_CN.json",
      },
      {
        code: "ZH-HK",
        language: "zh-Hant-HK",
        name: "Traditional Chinese",
        file: "zh_HK.json",
      },
    ],
    bundle: {
      fullInstall: false,
    },
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "i18n_redirected",
      redirectOn: "root",
    },
  },

  vite: {
    plugins: [vuetify({ autoImport: true })],
    vue: {
      template: {
        transformAssetUrls,
      },
    },
  },
});