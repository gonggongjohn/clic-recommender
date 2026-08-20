<template>
  <div class="flex flex-col gap-8 xs:mr-4 md:mr-8">
    <div class="flex flex-col gap-4 ">
      <ClicRecommenderQuestionTab
        v-for="index in Math.min(
          filteredQuestions.length,
          parseInt(config.public.MAX_QUESTION_NUM as string)
        )"
        :index="index"
        :question="filteredQuestions[index - 1]"
      />
    </div>
    <div class="flex xs:flex-col justify-center gap-6">
      <v-btn
        class="text-white"
        variant="flat"
        color="dark-purple"
        rounded="xl"
        prepend-icon="mdi-reload"
        @click="$emit('restart')"
      >
        {{ $t("recommender_step3_restart") }}
      </v-btn>
      <v-btn
        variant="outlined"
        color="dark-purple"
        rounded="xl"
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
