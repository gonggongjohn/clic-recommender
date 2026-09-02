import vuetify, { transformAssetUrls } from "vite-plugin-vuetify";

export default defineNuxtConfig({
  devtools: { enabled: true },

  experimental: {
    watcher: "builder",
  },

  app: {
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
    // How long /api/warmup holds the connection open waiting for a cold
    // Container App replica to answer. Long on purpose: the browser never
    // awaits this call, and the reply is how the client learns it can stop
    // re-pinging. Only the server route reads this.
    warmupTimeoutMs: process.env.WARMUP_TIMEOUT_MS ?? "20000",
    public: {
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
        // Nitro's azure-swa preset only recognises the literal strings "16",
        // "18" and "20" in package.json `engines.node`; anything else (such as
        // "22.x") silently falls back to `node:18`, which Azure Static Web Apps
        // retired on 31 May 2025. Set the API runtime explicitly instead.
        platform: {
          apiRuntime: "node:22",
        },
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
