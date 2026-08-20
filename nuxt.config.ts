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
    },
  },

  runtimeConfig: {
    backend: process.env.BACKEND ?? "",
    teams: process.env.TEAMS ?? "",
    logDir: process.env.LOG_DIR ?? "",
    public: {
      MAX_TOPIC_NUM: process.env.MAX_TOPIC_NUM ?? "5",
      MAX_QUESTION_NUM: process.env.MAX_QUESTION_NUM ?? "5",
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
