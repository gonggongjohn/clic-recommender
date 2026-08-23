<template>
  <Head>
    <Title>{{ $t("nav_about") }}</Title>
  </Head>

  <div class="font-display text-5xl xs:text-4xl font-bold text-dark-purple mb-4">
    {{ $t("nav_about") }}
  </div>

  <div
    class="bg-white rounded-2xl shadow-card py-8 grid grid-cols-12 h-full xs:px-6 md:px-10 [&>div]:my-4"
  >
    <div class="col-span-12">
      <h2 class="font-display text-3xl font-bold text-dark-purple mb-4">
        {{ $t("about_team_title") }}
      </h2>
      <Members />
    </div>

    <!--
      The live site keeps funding acknowledgement on its own /acknowledgement
      page. Here it is a section with an anchor, because the footer links to
      /about#acknowledgement.
    -->
    <div id="acknowledgement" class="col-span-12 scroll-mt-24">
      <h2 class="font-display text-3xl font-bold text-dark-purple mb-3">
        {{ $t("about_ack_title") }}
      </h2>

      <p class="max-w-prose leading-relaxed">{{ $t("about_ack_body") }}</p>

      <NuxtImg
        src="/wyng_foundation_logo.jpg"
        :alt="$t('about_ack_logo_alt')"
        :title="$t('about_ack_logo_alt')"
        width="300"
        class="mt-6"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "info",
});
</script>
