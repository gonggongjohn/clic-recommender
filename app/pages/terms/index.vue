<template>
  <Head>
    <Title>{{ $t("nav_terms") }}</Title>
  </Head>

  <div class="font-display text-5xl xs:text-4xl font-bold text-dark-purple mb-4">
    {{ $t("nav_terms") }}
  </div>

  <div
    class="bg-white rounded-2xl shadow-card py-8 grid grid-cols-12 h-full xs:px-6 md:px-10 [&>div]:my-4"
  >
    <div class="col-span-12">
      <h2 class="font-display text-3xl font-bold text-dark-purple mb-3">
        {{ $t("terms_disclaimer_title") }}
      </h2>

      <p
        v-for="(paragraph, i) in disclaimer"
        :key="i"
        class="leading-relaxed mb-4"
      >
        {{ paragraph }}
      </p>
    </div>

    <!-- The footer links here as /terms#privacy. -->
    <div id="privacy" class="col-span-12 scroll-mt-24">
      <h2 class="font-display text-3xl font-bold text-dark-purple mb-3">
        {{ $t("terms_privacy_title") }}
      </h2>

      <p v-for="(paragraph, i) in privacy" :key="i" class="leading-relaxed mb-4">
        {{ paragraph }}
      </p>
    </div>

    <div class="col-span-12">
      <h2 class="font-display text-3xl font-bold text-dark-purple mb-3">
        {{ $t("terms_usage_title") }}
      </h2>

      <div v-for="(clause, i) in usage" :key="i" class="mb-4">
        <h3 class="font-bold">{{ i + 1 }}. {{ clause.title }}</h3>
        <p class="leading-relaxed">{{ clause.body }}</p>
      </div>
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

const disclaimer = computed(() => list("disclaimer_body"));
const privacy = computed(() => list("privacy_body"));

const usage = computed(() =>
  list("terms_usage_titles").map((title, i) => ({
    title,
    body: list("terms_usage_bodies")[i] ?? "",
  }))
);
</script>
