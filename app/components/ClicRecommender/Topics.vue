<template>
  <div>
    <div class="flex flex-wrap justify-start gap-4 mb-8">
      <div v-for="(topic, index) in topics" :key="index">
        <v-btn
          class="text-none my-1 px-4"
          variant="flat"
          rounded="md"
          :prepend-icon="
            selectedTopics.includes(topic)
              ? 'mdi-check-circle-outline'
              : 'mdi-circle-outline'
          "
          :color="selectedTopics.includes(topic) ? 'clic-blue' : 'topic-soft'"
          :class="selectedTopics.includes(topic) ? '' : 'text-clic-blue'"
          @click="selectTopic(topic)"
        >
          {{ getTopic(topic) }}
        </v-btn>
      </div>
    </div>
    <v-btn
      class="px-8"
      variant="flat"
      rounded="xl"
      size="large"
      color="dark-purple"
      prepend-icon="mdi-magnify"
      :disabled="selectedTopics.length === 0"
      @click="getRecommendations"
    >
    {{ $t("recommender_step2_btn") }}
    </v-btn>
  </div>
</template>

<script setup lang="ts">
const { locale } = useI18n();
const props = defineProps(["nextStep"]);
const topics = useTopicState();
const searchQuery = useSearchQueryState();
const filteredQuestions = useFilteredQuestionsState();

const selectedTopics: Ref<string []> = ref([]);

const { updateFilteredQuestions } = useClic();
const { logEvent } = useEventLogger();

const getTopic = (topic: string) => {
    // topic string e.g: Intellectual Property,知识产权,知識產權
    const topic_list = topic.split(',')
    if (locale.value === "ZH-HK")
      return topic_list[2];
    else if (locale.value === "ZH-CN")
      return topic_list[1];
    else return topic_list[0];
  }

const selectTopic = (topic: string) => {
  const index = selectedTopics.value.indexOf(topic);
  if (index !== -1) {
    selectedTopics.value.splice(index, 1);
  } else {
    selectedTopics.value.push(topic);
  }
};

const getRecommendations = () => {
  updateFilteredQuestions(selectedTopics.value);

  const questionIds = Array.from(
    new Set(
      filteredQuestions.value.flatMap((question) =>
        question.detailed_info.map((info) => info.q_id).filter(Boolean),
      ),
    ),
  );

  void logEvent({
    event_type: "questions",
    query: searchQuery.value.trim(),
    topics: [...selectedTopics.value],
    question_ids: questionIds,
  });

  props.nextStep();
};
</script>
