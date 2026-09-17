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

const baseURL =
  normalizeBaseURL(
    process.env.NUXT_APP_BASE_URL ??
      process.env.SITE_BASE_URL ??
      process.env.BASE_URL
  ) ??
  SITE_BASE_URLS[siteId] ??
  SITE_BASE_URLS.main!;

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
    azure: {
      config: {
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