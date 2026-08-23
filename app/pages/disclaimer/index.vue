<template>
  <Head>
    <Title>{{ $t("nav_disclaimer") }}</Title>
  </Head>

  <div class="font-display text-5xl xs:text-4xl font-bold text-dark-purple mb-4">
    {{ $t("nav_disclaimer") }}
  </div>

  <div class="bg-white rounded-2xl shadow-card py-8 h-full xs:px-6 md:px-10">
    <p v-for="(paragraph, i) in paragraphs" :key="i" class="leading-relaxed mb-4">
      {{ paragraph }}
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "info",
});

/** Same source as the disclaimer modal on the home page. */
const { tm, rt } = useI18n();

const paragraphs = computed(() =>
  (tm("disclaimer_body") as unknown[]).map((p) => rt(p as string))
);
</script>
