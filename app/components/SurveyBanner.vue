<template>
  <!--
    The dark pill banner at the top of the live site. It only renders when a
    survey URL is configured, so it disappears cleanly once the survey closes.
    Set the URL in app/data/links.ts (`survey`).
  -->
  <NuxtLink
    v-if="links.survey"
    :to="links.survey"
    target="_blank"
    class="bg-dark-purple text-white rounded-full flex items-center justify-between gap-4 px-8 py-5 xs:px-5 xs:py-4 hover:opacity-95"
  >
    <span class="flex items-center gap-3">
      <v-icon icon="mdi-information-outline" size="small" />
      <span class="font-bold xs:text-sm">{{ $t("survey_message") }}</span>
    </span>

    <span
      class="flex items-center gap-2 uppercase tracking-wide whitespace-nowrap xs:text-sm"
    >
      {{ $t("survey_cta") }}
      <v-icon icon="mdi-chevron-right" size="small" />
    </span>
  </NuxtLink>
</template>

<script setup lang="ts">
import { links } from "@/data/links";
</script>
