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
      <h2 class="font-display text-3xl font-bold text-dark-purple">
        {{ $t("terms_disclaimer_title") }}
      </h2>
      <div>Some Contents ...</div>
    </div>
    <div id="privacy" class="col-span-12 scroll-mt-24">
      <h2 class="font-display text-3xl font-bold text-dark-purple">
        {{ $t("terms_privacy_title") }}
      </h2>
      <div>Some Contents ...</div>
    </div>
    <div class="col-span-12">
      <h2 class="font-display text-3xl font-bold text-dark-purple">
        {{ $t("terms_usage_title") }}
      </h2>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "info",
});
</script>
