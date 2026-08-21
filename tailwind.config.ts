import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";
import colors from "tailwindcss/colors";

/**
 * CLIC brand palette.
 *
 * Every value below was sampled pixel-for-pixel from the production site at
 * https://ai.hklii.hk/recommender/ so the rebuild matches it exactly.
 *
 * These are the SAME hex values as the `ClicTheme` definition in
 * app/plugins/vuetify.ts. Vuetify consumes them via `color="dark-purple"`
 * props; Tailwind consumes them via `bg-* / text-* / border-*` utilities.
 * Keep the two lists in sync - if you add a colour here, add it there too.
 */
const clic = {
  // Purples
  "dark-purple": "#2C1646", // headings, footer links, survey banner
  "mid-purple": "#8D819B", // primary action buttons ("Continue")
  "light-purple": "#766992",
  "muted-purple": "#6C5E86", // hero eyebrow / slogan
  "pale-purple": "#DED8EB", // footer background
  "line-purple": "#D3AAD4", // stepper connector rail
  "alert-purple": "#9F95AB", // disclaimer accent bar

  // Ambers
  amber: "#F5B23A", // step badges, "Go to CLIC"
  "amber-soft": "#FDF9E5", // jumpstart example card fill
  "amber-line": "#FAD99B", // jumpstart example card border
  "amber-text": "#C07E4B", // "Show More" links

  // Blues
  "clic-blue": "#3791CA", // voice-input button, tip bulb
  "dark-blue": "#0c4a6e",
  "mild-blue": "#0369a1",
  "light-blue": "#34B4D1",

  // Recommendation cards
  "card-line": "#EAE8EE", // card hairline border
  excerpt: "#FDF7DE", // excerpt panel fill
  "excerpt-line": "#E8E3CC", // divider inside the excerpt panel
  preview: "#B05E1E", // "Show More" / "Collapse Preview" links
  "topic-soft": "#E7F1F8", // unselected topic chip
  "btn-soft": "#E5E3E8", // secondary button fill

  // Neutrals
  ink: "#37373D", // default body copy
  "ink-soft": "#66666E", // copyright, secondary copy
  "dark-grey": "#45424A",
  "light-grey": "#65616C",
  "pale-grey": "#F1F2F5", // textarea fill
  "grey-line": "#D8D6DB", // textarea border
  "alert-grey": "#E6E3E9", // disclaimer callout fill
  "light-yellow": "#fef3c7",
};

export default {
  content: [
    "./app/components/**/*.{js,vue,ts}",
    "./app/layouts/**/*.vue",
    "./app/pages/**/*.vue",
    "./app/plugins/**/*.{js,ts}",
    "./app/app.vue",
    "./app/error.vue",
  ],
  theme: {
    extend: {
      colors: {
        ...clic,
        // Keep the stock Tailwind scales reachable alongside the brand
        // DEFAULTs, so `bg-amber-500` still resolves if anything needs it.
        orange: { ...colors.orange, DEFAULT: "#C07E4B" },
        blue: { ...colors.blue, DEFAULT: "#3791CA" },
      },
      fontFamily: {
        // Headings, the logo wordmark and step titles are a slab serif;
        // body copy is a humanist sans.
        display: ["Bitter", "Roboto Slab", "Zilla Slab", "Georgia", "serif"],
        sans: [
          "Lato",
          "Helvetica Neue",
          "Helvetica",
          "Arial",
          // CJK fallbacks so the ZH-HK / ZH-CN locales don't drop to a serif
          "PingFang HK",
          "PingFang SC",
          "Microsoft JhengHei",
          "Microsoft YaHei",
          "Noto Sans CJK TC",
          ...defaultTheme.fontFamily.sans,
        ],
      },
      transitionProperty: {
        height: "height",
        "max-height": "max-height",
      },
      transitionDuration: {
        // Navbar.vue uses `duration-1500`, which is not a stock Tailwind value.
        1500: "1500ms",
      },
      boxShadow: {
        nav: "0 1px 3px 0 rgb(44 22 70 / 0.06)",
        card: "0 4px 24px -6px rgb(44 22 70 / 0.12)",
      },
      maxWidth: {
        prose: "68ch",
      },
    },
    screens: {
      xxs: { max: "400px" },
      xs: { min: "0px", max: "768px" },
      ...defaultTheme.screens,
    },
  },
  plugins: [],
} satisfies Config;
