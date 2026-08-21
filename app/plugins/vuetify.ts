// import this after install `@mdi/font` package
import "@mdi/font/css/materialdesignicons.css";

import "vuetify/styles";
import { createVuetify, type ThemeDefinition } from "vuetify";

export default defineNuxtPlugin((app) => {
  /**
   * Brand palette. Mirrors tailwind.config.ts - the two must stay in sync,
   * because some surfaces are coloured by Vuetify `color=` props and others
   * by Tailwind utilities, and they sit next to each other in the UI.
   * Values sampled from https://ai.hklii.hk/recommender/
   */
  const ClicTheme: ThemeDefinition = {
    dark: false,
    colors: {
      "dark-purple": "#2C1646",
      "mid-purple": "#8D819B",
      "light-purple": "#766992",
      "muted-purple": "#6C5E86",
      "pale-purple": "#DED8EB",
      "line-purple": "#D3AAD4",
      "alert-purple": "#9F95AB",

      amber: "#F5B23A",
      "amber-soft": "#FDF9E5",
      "amber-line": "#FAD99B",
      "amber-text": "#C07E4B",

      "clic-blue": "#3791CA",
      // Used via `color=` props on chips/buttons, so they must exist here as
      // well as in tailwind.config.ts.
      "topic-soft": "#E7F1F8",
      "btn-soft": "#E5E3E8",
      excerpt: "#FDF7DE",
      "dark-blue": "#0c4a6e",
      "mild-blue": "#0369a1",
      "light-blue": "#34B4D1",

      ink: "#37373D",
      "ink-soft": "#66666E",
      "dark-grey": "#45424A",
      "light-grey": "#65616C",
      "pale-grey": "#F1F2F5",
      "alert-grey": "#E6E3E9",
      "light-yellow": "#fef3c7",
      orange: "#c16d0b",
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
    defaults: {
      VBtn: {
        // The original site's buttons are pill-shaped with the Vuetify
        // uppercase + letter-spaced label.
        rounded: "xl",
        elevation: 0,
      },
    },
  });
  app.vueApp.use(vuetify);
});
