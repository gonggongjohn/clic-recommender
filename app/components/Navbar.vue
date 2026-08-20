<template>
  <nav class="grid grid-cols-12 bg-white py-2">
    <div class="xs:col-span-2 flex justify-center items-center md:hidden">
      <button
        data-collapse-toggle="navbar-default"
        type="button"
        class="text-light-purple flex items-center w-10 h-10 justify-center rounded-lg md:hidden focus:outline-none"
        aria-controls="navbar-default"
        aria-expanded="false"
        density="compact"
        @click="collapseOrExpand"
      >
        <v-icon icon="mdi-menu"></v-icon>
      </button>
    </div>

    <div class="xs:col-span-8 md:col-span-4 ">
      <NuxtLink class="flex items-center justify-center" :to="links.clic" target="_blank">
        <NuxtImg
          src="/Logo_markOnly.svg"
          :alt="$t('title')"
          :title="$t('title')"
          width="85"
        />
        <span class="-ml-2.5 text-xl text-dark-purple font-bold">{{$t("nav_title")}}</span>
      </NuxtLink>
    </div>

    <div class="flex justify-center items-center md:hidden">
      <v-menu>
        <template v-slot:activator="{ props }">
          <v-btn rounded="lg" variant="flat" small v-bind="props">
            <v-icon small class="" icon="mdi-chevron-down"></v-icon>
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
    <div :class="navMenuClass">
      <NuxtLink to="/" class="mt-1 text-lg">
        {{ $t("nav_home") }}
      </NuxtLink>
      <NuxtLink to="/about" class="mt-1 text-lg">
        {{ $t("nav_about") }}
      </NuxtLink>
      <NuxtLink to="/instructions" class="mt-1 text-lg">
        {{ $t("nav_howto") }}
      </NuxtLink>
      <NuxtLink to="/terms" class="mt-1 text-lg">
        {{ $t("nav_terms") }}
      </NuxtLink>
    </div>
    <div
      class="xs:col-span-2 text-dark-purple flex items-center justify-center xs:hidden"
    >
      <v-menu transition="slide-y-transition">
        <template v-slot:activator="{ props }">
          <v-btn rounded="lg" variant="flat" small v-bind="props">
            <v-icon small class="" icon="mdi-chevron-down"></v-icon>
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

const langs = [
  { title: "EN", value: "EN-US" },
  { title: "繁體", value: "ZH-HK" },
  { title: "简体", value: "ZH-CN" },
];

const currentLang = ref(
  {
    title: langs.find((lang) => lang.value === locale.value)?.title,
    value: locale.value,
  } || { title: "EN", value: "EN-US" }
);

const setLang = (lang: { title: string; value: string }) => {
  currentLang.value = lang;
  setLocale(currentLang.value.value);
};

const collapse = ref(true);
const collapseOrExpand = () => {
  collapse.value = !collapse.value;
};
const navMenuClass = computed(() => {
  return (
    "xs:col-span-8 md:col-span-6 xs:ml-[10%] text-dark-grey flex xs:flex-col xs:gap-2 gap-5 md:items-center text transition-height duration-1500 ease xs:overflow-hidden " +
    (collapse.value ? "xs:h-0" : "xs:h-40")
  );
});

onMounted(() => {
  console.log("Current Language: " + currentLang.value.title);
});
</script>

<style scoped>
li {
  align-items: center;
}

img {
  transform: scale(0.6, 0.6);
}
</style>
