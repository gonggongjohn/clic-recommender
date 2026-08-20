<template>
  <div>
    <div class="flex flex-wrap justify-start gap-4 mb-8">
      <div v-for="(topic, index) in topics" :key="index">
        <v-btn
          class="text-none my-2 p-1 rounded-l-md"
          variant="flat"
          :prepend-icon="selectedTopics.includes(topic) ? 'mdi-check-bold' : ''"
          :color="
            selectedTopics.includes(topic) ? 'amber' : 'amber-lighten-4'
          "
          @click="selectTopic(topic)"
        >
          {{ getTopic(topic) }}
        </v-btn>
      </div>
    </div>
    <v-btn
      class=" text-white"
      variant="flat"
      rounded="xl"
      color="dark-purple"
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

const selectedTopics: Ref<string []> = ref([]);

const { updateFilteredQuestions } = useClic();

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
  props.nextStep();
};
</script>
