<template>
  <Head>
    <Title>{{ $t("nav_terms") }}</Title>
  </Head>

  <div class="text-5xl font-bold text-dark-purple xs:px-4">
    {{ $t("nav_terms") }}
  </div>
  <div
    class="bg-white rounded-md py-8 grid grid-cols-12 h-full xs:px-6 md:px-10 [&>div]:my-4"
  >
    <div class="col-span-12">
      <h2 class="text-4xl font-bold text-dark-purple">
        {{ $t("terms_disclaimer_title") }}
      </h2>
      <div>Some Contents ...</div>
    </div>
    <div class="col-span-12">
      <h2 class="text-4xl font-bold text-dark-purple">
        {{ $t("terms_privacy_title") }}
      </h2>
      <div>Some Contents ...</div>
    </div>
    <div class="col-span-12">
      <h2 class="text-4xl font-bold text-dark-purple">
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
