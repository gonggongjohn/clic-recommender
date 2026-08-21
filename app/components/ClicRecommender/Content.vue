<template>
  <div class="bg-white rounded-2xl shadow-card xs:py-6 md:py-10 clic-stepper">
    <div class="xs:px-4 md:px-10">
      <DisclaimerNotice />
    </div>

    <!--
      `all-steps-opened` keeps steps 1 and 2 expanded once the user moves on,
      so their original wording and topic choices stay visible next to the
      results. `auto-validate-steps` gives completed steps the green tick.
      `can-close-steps=false` stops a click on a header from collapsing one.
    -->
    <MazStepper
      class="mt-8"
      color="warning"
      :model-value="step"
      all-steps-opened
      auto-validate-steps
      :can-close-steps="false"
      @update:model-value="step = $event"
    >
      <template #title-1>
        <div class="flex items-center gap-3">
          <span>{{ $t("recommender_step1_title") }}</span>

          <span class="flex items-center peer">
            <v-icon icon="mdi-lightbulb" size="small" color="clic-blue" />
          </span>

          <span class="hidden peer-hover:md:block">
            <span
              class="bg-dark-purple text-white rounded-lg shadow-card p-4 absolute z-10 max-w-xs block font-sans"
            >
              <span class="font-semibold text-lg block">
                {{ $t("recommender_tip_title") }}
              </span>
              <span class="block list-disc list-outside pl-6 text-base mt-1">
                <span class="block my-2">{{ $t("recommender_tips.0") }}</span>
                <span class="block my-2">{{ $t("recommender_tips.1") }}</span>
              </span>
            </span>
          </span>
        </div>
      </template>
      <template #subtitle-1>
        <div class="max-w-xl">
          {{ $t("recommender_step1_desc") }}
        </div>
      </template>
      <template #content-1>
        <ClicRecommenderUserInput :nextStep="next" />
      </template>

      <template #title-2>{{ $t("recommender_step2_title") }}</template>
      <template #subtitle-2>
        <div class="break-words xs:max-w-xs md:max-w-md lg:max-w-xl">
          {{ $t("recommender_step2_desc") }}
        </div>
      </template>
      <template #content-2>
        <ClicRecommenderTopics :nextStep="next" />
      </template>

      <template #title-3>{{ $t("recommender_step3_title") }}</template>
      <template #subtitle-3>
        <div class="xs:max-w-xs max-w-xl">
          {{ $t("recommender_step3_desc") }}
        </div>
      </template>
      <template #content-3>
        <ClicRecommenderQuestions @restart="restart" @step1="toStep1" />
      </template>
    </MazStepper>
  </div>
</template>

<script setup lang="ts">
const step = ref(1);
const topics = useTopicState();
const query = useSearchQueryState();
const question = useQuestionState();
const filtered_questions = useFilteredQuestionsState();

const next = () => {
  if (step.value < 3) step.value += 1;
};

const toStep1 = () => {
  window.scrollTo(0, 0);
  step.value = 1;
};

const restart = () => {
  topics.value = [];
  query.value = "";
  question.value = [];
  filtered_questions.value = [];
  window.scrollTo(0, 0);
  step.value = 1;
};
</script>
