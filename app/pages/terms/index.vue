<template>
  <Head>
    <Title>{{ $t("nav_terms") }}</Title>
  </Head>

  <div class="font-display text-5xl xs:text-4xl font-bold text-dark-purple mb-4">
    {{ $t("nav_terms") }}
  </div>

  <!--
    Terms of Use only. The Disclaimer and the Privacy Policy used to be
    sections of this page; they now have pages of their own, at /disclaimer
    and /privacy.
  -->
  <div class="bg-white rounded-2xl shadow-card py-8 h-full xs:px-6 md:px-10">
    <h2 class="font-display text-3xl font-bold text-dark-purple mb-3">
      {{ $t("terms_usage_title") }}
    </h2>

    <div v-for="(clause, i) in usage" :key="i" class="mb-4">
      <h3 class="font-bold">{{ i + 1 }}. {{ clause.title }}</h3>
      <p class="leading-relaxed">{{ clause.body }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "info",
});

const { tm, rt } = useI18n();

const list = (key: string) =>
  (tm(key) as unknown[]).map((entry) => rt(entry as string));

const usage = computed(() =>
  list("terms_usage_titles").map((title, i) => ({
    title,
    body: list("terms_usage_bodies")[i] ?? "",
  }))
);
</script>
