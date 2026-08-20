<template>
  <div class="bg-amber-lighten-5 border-2 border-[#FFB72F] flex px-3 py-3 rounded gap-3">
    <div>
      <v-icon
        icon="mdi-playlist-plus"
        size="large"
        @click="jumstart($t(`recommender_step1_samples.${index}`))"
      />
    </div>
    <div>
      <div>
        <span class="font-bold">{{ $t(`recommender_samples_step1_titles.${index}`) }}</span>
      </div>
      <ShowMoreText :text="$t(`recommender_step1_samples.${index}`)" max_rows="3"/>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps(["index"]);

const searchQuery = useSearchQueryState();

const jumstart = (jumpStartText: string) => {
  searchQuery.value = jumpStartText;
};
</script>
