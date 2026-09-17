<template>
  <Head>
    <Title>{{ $t("nav_acknowledgement") }}</Title>
  </Head>

  <div class="font-display text-5xl xs:text-4xl font-bold text-dark-purple mb-4">
    {{ $t("nav_acknowledgement") }}
  </div>

  <div class="bg-white rounded-2xl shadow-card py-8 h-full xs:px-6 md:px-10">
    <p class="max-w-prose leading-relaxed">{{ $t("about_ack_body") }}</p>

    <NuxtImg
      src="/wyng_foundation_logo.jpg"
      :alt="$t('about_ack_logo_alt')"
      :title="$t('about_ack_logo_alt')"
      width="300"
      class="mt-6"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "info",
});
</script>
