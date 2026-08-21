<template>
  <!-- Set title tag -->
  <Head>
    <Title>{{ $t("title") }}</Title>
  </Head>

  <SurveyBanner class="mb-10" />
  <ClicRecommenderHeader />
  <ClicRecommenderContent />
</template>

<script setup lang="ts">
useHead({
  link: [
    {
      rel: "canonical",
      href: "https://www.ai.hklii.hk/recommender",
    },
  ],
});
</script>
