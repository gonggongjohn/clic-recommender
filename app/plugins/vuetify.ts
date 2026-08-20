// import this after install `@mdi/font` package
import "@mdi/font/css/materialdesignicons.css";

import "vuetify/styles";
import { createVuetify, type ThemeDefinition } from "vuetify";

export default defineNuxtPlugin((app) => {
  const ClicTheme: ThemeDefinition = {
    dark: false,
    // all colors
    colors: {
      "dark-blue": "#0c4a6e",
      'orange': "#c16d0b",
      "mild-blue": "#0369a1",
      "light-yellow": "#fef3c7",
      "dark-purple": "#301651",
      "light-purple": "#766992",
      'pale-purple': "#E2DDEE",
      'amber': "#FFB72F",
      'light-blue': "#34B4D1",
      'light-grey': "#65616C",
      'dark-grey': '#45424A',
      'pale-grey': '#f3f4f6'
    },
  };
  const vuetify = createVuetify({
    ssr: true,
    theme: {
      defaultTheme: "ClicTheme",
      themes: {
        ClicTheme,
      },
    },
  });
  app.vueApp.use(vuetify);
});
