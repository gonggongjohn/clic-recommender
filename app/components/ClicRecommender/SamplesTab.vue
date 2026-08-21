<template>
  <div
    class="bg-amber-soft border-2 border-amber-line rounded-xl flex gap-3 px-4 py-3 cursor-pointer transition-shadow hover:shadow-card"
    role="button"
    tabindex="0"
    :title="$t('recommender_samples_jumpstart')"
    @click="jumpstart($t(`recommender_step1_samples.${index}`))"
    @keydown.enter="jumpstart($t(`recommender_step1_samples.${index}`))"
  >
    <v-icon
      icon="mdi-playlist-plus"
      size="large"
      color="amber"
      class="shrink-0 mt-0.5"
    />

    <div class="min-w-0">
      <div class="font-display font-bold text-ink">
        {{ $t(`recommender_samples_step1_titles.${index}`) }}
      </div>
      <ShowMoreText
        :text="$t(`recommender_step1_samples.${index}`)"
        max_rows="3"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps(["index"]);

const searchQuery = useSearchQueryState();

const jumpstart = (jumpStartText: string) => {
  searchQuery.value = jumpStartText;
};
</script>
