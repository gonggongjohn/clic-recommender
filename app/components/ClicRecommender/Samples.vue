<template>
  <div class="flex flex-col gap-3">
    <div class="font-bold text-lg text-ink">
      {{ $t("recommender_samples_step1_main_title") }}
    </div>
    <ClicRecommenderSamplesTab v-for="index in 3" :key="index" :index="index - 1" />
  </div>
</template>
