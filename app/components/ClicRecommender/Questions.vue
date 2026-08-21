<template>
  <div class="flex flex-col gap-8">
    <div class="flex flex-col gap-6">
      <ClicRecommenderQuestionTab
        v-for="index in Math.min(
          filteredQuestions.length,
          parseInt(config.public.MAX_QUESTION_NUM as string)
        )"
        :index="index"
        :question="filteredQuestions[index - 1]"
      />
    </div>
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
const config = useRuntimeConfig();

const filteredQuestions = useFilteredQuestionsState();
</script>
