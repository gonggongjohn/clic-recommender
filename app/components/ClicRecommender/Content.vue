<template>
  <div class="bg-white rounded-md py-8">
    <MazStepper color="warning" :model-value="step">
      <template #title-1>
        <div class="flex gap-3">
          <div>
            <span class="text-lg">{{ $t("recommender_step1_title") }}</span>
          </div>
          <div class="flex items-center peer">
            <v-icon icon="mdi-lightbulb" size="x-small" color="light-blue" />
          </div>
          <div class="hidden peer-hover:md:block">
            <div class="bg-dark-grey opacity-70 p-4 absolute z-10 max-w-80">
              <div class="text-semibold text-lg">
                {{ $t("recommender_tip_title") }}
              </div>
              <ul class="list-disc list-outside pl-6 text-base [&>li]:m-2">
                <li>{{ $t("recommender_tips.0") }}</li>
                <li>{{ $t("recommender_tips.1") }}</li>
              </ul>
            </div>
          </div>
        </div>
      </template>
      <template #subtitle-1>
        <div class="xs:w-64 max-w-xl">
          {{ $t("recommender_step1_desc") }}
        </div>
      </template>
      <template #content-1="{ nextStep }">
        <ClicRecommenderUserInput :nextStep="next" />
      </template>

      <template #title-2 
        ><div class="text-xl">
          {{ $t("recommender_step2_title") }}
        </div></template
      >
      <template #subtitle-2>
        <div class="break-words xs:max-w-xs md:max-w-md lg:max-w-xl">
          {{ $t("recommender_step2_desc") }}
        </div>
      </template>
      <template #content-2="{ nextStep }">
        <ClicRecommenderTopics :nextStep="next" />
      </template>

      <template #title-3 
        ><div class="text-xl">{{ $t("recommender_step3_title") }}</div></template
      >
      <template #subtitle-3>
        <div class="xs:max-w-xs max-w-xl">
          {{ $t("recommender_step3_desc") }}
        </div>
      </template>
      <template #content-3="{ nextStep, previousStep }">
        <ClicRecommenderQuestions @restart="restart" @step1="toStep1"/>
      </template>
    </MazStepper>
  </div>
</template>

<script setup lang="ts">
const step = ref(1)
const topics = useTopicState();
const query = useSearchQueryState();
const question = useQuestionState();
const filtered_questions = useFilteredQuestionsState();

const next = () => {
  if (step.value < 3) step.value += 1
}

const toStep1 = () => {
  window.scrollTo(0,0);
  step.value = 1
}

const restart = () => {
  topics.value = []
  query.value = ""
  question.value = []
  filtered_questions.value = []
  window.scrollTo(0,0);
  step.value = 1
}
</script>

<style scoped>
.m-stepper__count[data-v-201c89f3] {
  background-color: red;
}
</style>
