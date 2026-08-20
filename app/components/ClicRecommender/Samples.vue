<template>
  <div class="flex flex-col gap-1">
    <div class="font-semibold">{{ $t('recommender_samples_step1_main_title') }}</div>
    <div v-for="index in 3">
      <ClicRecommenderSamplesTab :index="index-1" />
    </div>
  </div>
</template>
