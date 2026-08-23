<template>
  <div ref="listTop" class="flex flex-col gap-8">
    <!-- Result count / range -->
    <div v-if="total > 0" class="text-ink-soft text-sm">
      {{ $t("recommender_step3_showing", { from: rangeFrom, to: rangeTo, total }) }}
    </div>

    <div class="flex flex-col gap-6">
      <ClicRecommenderQuestionTab
        v-for="(question, offset) in pageQuestions"
        :key="`${question.index}-${question.detailed_info[0]?.q_id ?? offset}`"
        :index="firstIndexOnPage + offset"
        :question="question"
      />
    </div>

    <!-- Pager: hidden when everything already fits on one page -->
    <v-pagination
      v-if="pageCount > 1"
      v-model="page"
      :length="pageCount"
      :total-visible="totalVisible"
      density="comfortable"
      color="dark-purple"
      rounded="circle"
      :aria-label="$t('recommender_step3_pagination')"
      @update:model-value="scrollToTop"
    />

    <div class="flex xs:flex-col justify-start gap-4">
      <v-btn
        variant="flat"
        color="dark-purple"
        rounded="xl"
        size="large"
        prepend-icon="mdi-reload"
        @click="$emit('restart')"
      >
        {{ $t("recommender_step3_restart") }}
      </v-btn>
      <v-btn
        variant="flat"
        color="btn-soft"
        class="text-dark-purple"
        rounded="xl"
        size="large"
        prepend-icon="mdi-pencil"
        @click="$emit('step1')"
        >{{ $t("recommender_step3_tostep1") }}</v-btn
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDisplay } from "vuetify";
import type { Question } from "#shared/types/types";
import { paginate } from "#shared/utils/topics";

defineEmits(["restart", "step1"]);

const config = useRuntimeConfig();
const filteredQuestions = useFilteredQuestionsState();

const readPositiveInt = (value: unknown, fallback: number) => {
  const parsed = parseInt(value as string);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/**
 * Results per page. nuxt.config falls back to MAX_QUESTION_NUM when
 * QUESTIONS_PER_PAGE is unset, so an existing deployment keeps its value.
 */
const perPage = computed(() =>
  readPositiveInt(config.public.QUESTIONS_PER_PAGE, 5)
);

/** Hard ceiling across all pages. 0 (or unset) means "show everything the backend returned". */
const maxTotal = computed(() => {
  const parsed = parseInt(config.public.MAX_QUESTION_TOTAL as string);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
});

const visibleQuestions = computed<Question[]>(() => {
  const all = filteredQuestions.value ?? [];
  return maxTotal.value ? all.slice(0, maxTotal.value) : all;
});

const total = computed(() => visibleQuestions.value.length);
const page = ref(1);

const geometry = computed(() => paginate(total.value, perPage.value, page.value));
const pageCount = computed(() => geometry.value.pageCount);
const firstIndexOnPage = computed(() => geometry.value.firstIndex);
const rangeFrom = computed(() => geometry.value.from);
const rangeTo = computed(() => geometry.value.to);

const pageQuestions = computed(() =>
  visibleQuestions.value.slice(
    firstIndexOnPage.value - 1,
    firstIndexOnPage.value - 1 + perPage.value
  )
);

// Narrow screens can't fit the default seven page buttons.
const { smAndDown } = useDisplay();
const totalVisible = computed(() => (smAndDown.value ? 3 : 7));

const listTop = ref<HTMLElement | null>(null);
const scrollToTop = () => {
  nextTick(() => {
    listTop.value?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
};

// A new search, or a change of topic selection, restarts at page 1. Clamp as well,
// so a shorter result set can never leave the pager on a page that no longer exists.
watch([total, perPage], () => {
  if (page.value > pageCount.value) page.value = pageCount.value;
});
watch(visibleQuestions, () => {
  page.value = 1;
});
</script>
