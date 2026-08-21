<template>
  <nav
    class="bg-white shadow-nav relative z-30 flex items-center justify-between gap-4 py-3 xs:px-4 md:px-[4%]"
  >
    <!-- Mobile: hamburger -->
    <button
      type="button"
      class="text-dark-purple flex items-center justify-center w-10 h-10 rounded-lg md:hidden focus:outline-none"
      aria-controls="navbar-default"
      :aria-expanded="!collapse"
      :aria-label="$t('nav_home')"
      @click="collapseOrExpand"
    >
      <v-icon icon="mdi-menu"></v-icon>
    </button>

    <!-- Brand -->
    <NuxtLink
      class="flex items-center shrink-0"
      :to="links.clic"
      target="_blank"
    >
      <NuxtImg
        src="/Logo_markOnly.svg"
        :alt="$t('title')"
        :title="$t('title')"
        width="85"
      />
      <span
        class="-ml-2.5 font-display text-2xl xs:text-xl text-dark-purple font-bold"
        >{{ $t("nav_title") }}</span
      >
    </NuxtLink>

    <!-- Primary links -->
    <div :class="navMenuClass">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="text-lg text-ink hover:text-dark-purple whitespace-nowrap"
        :class="{ 'text-dark-purple font-bold': route.path === item.to }"
      >
        {{ $t(item.label) }}
      </NuxtLink>
    </div>

    <!-- Language switcher -->
    <div class="text-dark-purple flex items-center shrink-0">
      <v-menu transition="slide-y-transition">
        <template v-slot:activator="{ props }">
          <v-btn
            rounded="lg"
            variant="text"
            v-bind="props"
            class="text-none text-lg"
          >
            <v-icon icon="mdi-chevron-down" size="small" class="mr-1"></v-icon>
            {{ currentLang.title }}
          </v-btn>
        </template>
        <v-list>
          <v-list-item
            v-for="(lang, index) in langs"
            :key="index"
            @click="setLang(lang)"
          >
            <v-list-item-title>{{ lang.title }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { links } from "@/data/links";

const { locale, setLocale } = useI18n();
const route = useRoute();

// Matches the live site's header: Home / About Us / How to Use / Feedback.
// (Terms of Use and Disclaimer live in the footer only.)
const navItems = [
  { to: "/", label: "nav_home" },
  { to: "/about", label: "nav_about" },
  { to: "/instructions", label: "nav_howto" },
  { to: "/feedback", label: "nav_feedback" },
];

const langs = [
  { title: "EN", value: "EN-US" },
  { title: "繁體", value: "ZH-HK" },
  { title: "简体", value: "ZH-CN" },
];

const currentLang = ref({
  title: langs.find((lang) => lang.value === locale.value)?.title ?? "EN",
  value: locale.value,
});

const setLang = (lang: { title: string; value: string }) => {
  currentLang.value = lang;
  setLocale(currentLang.value.value);
};

const collapse = ref(true);
const collapseOrExpand = () => {
  collapse.value = !collapse.value;
};

const navMenuClass = computed(
  () =>
    "text-ink flex md:items-center md:gap-8 xs:absolute xs:top-full xs:left-0 xs:right-0 xs:flex-col xs:gap-2 xs:bg-white xs:shadow-nav xs:px-6 transition-height duration-500 ease xs:overflow-hidden " +
    (collapse.value ? "xs:h-0" : "xs:h-48 xs:py-4")
);

// Close the mobile drawer after navigating.
watch(
  () => route.path,
  () => {
    collapse.value = true;
  }
);
</script>

<style scoped>
img {
  transform: scale(0.6, 0.6);
}
</style>
