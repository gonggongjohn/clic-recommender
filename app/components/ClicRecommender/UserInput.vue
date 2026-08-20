<template>
  <div>
    <form class="grid grid-cols-11 h-full gap-4 mr-6 mb-4">
      <textarea
        v-model="searchQuery"
        class="bg-pale-grey xs:col-span-12 col-span-7"
        :placeholder="$t('recommender_step1_input')"
        style="overflow: auto"
        :disabled="loading"
      ></textarea>

      <ClicRecommenderSamples class="xs:hidden col-span-4" />
    </form>

    <div class="flex items-center gap-4">
      <v-btn
        class="w-28 text-white"
        variant="flat"
        color="dark-purple"
        rounded="xl"
        :loading="loading"
        :disabled="searchQuery === '' || loading"
        @click="search"
      >
        {{ $t("recommender_step1_btn") }}
      </v-btn>

      <span
        v-if="loading && elapsedSeconds > 0"
        class="text-sm text-gray-500"
      >
        {{ elapsedSeconds }}s
      </span>
    </div>

    <!-- Only show this if the request takes longer than a normal search -->
    <div
      v-if="loading && showWaitingTip"
      class="mt-5 max-w-xl rounded-lg border border-gray-200 bg-pale-grey p-4"
      aria-live="polite"
    >
      <div class="flex gap-3">
        <v-icon
          icon="mdi-cloud-sync-outline"
          color="dark-purple"
          class="mt-1"
        />

        <div class="grow">
          <div class="font-medium">
            {{ waitingTitle }}
          </div>

          <div class="mt-1 text-sm text-gray-600">
            {{ waitingDescription }}
          </div>

          <v-progress-linear
            class="mt-3"
            color="dark-purple"
            indeterminate
            rounded
          />
        </div>
      </div>
    </div>

    <v-alert
      v-if="errorMessage"
      class="mt-5 max-w-xl"
      type="error"
      variant="tonal"
      closable
      @click:close="errorMessage = ''"
    >
      {{ errorMessage }}
    </v-alert>
  </div>
</template>

<script setup lang="ts">
const props = defineProps(["nextStep"]);

const searchQuery = useSearchQueryState();
const topics = useTopicState();
const questions = useQuestionState();

const { getUniqueTopicsSortByOccurances } = useClic();
const { t } = useI18n();

const loading = ref(false);
const elapsedSeconds = ref(0);
const showWaitingTip = ref(false);
const errorMessage = ref("");

let elapsedTimer: ReturnType<typeof setInterval> | undefined;
let waitingTipTimer: ReturnType<typeof setTimeout> | undefined;

const waitingTitle = computed(() => {
  if (elapsedSeconds.value >= 8) {
    return t("recommender_search_waking_title");
  }

  return t("recommender_search_working_title");
});

const waitingDescription = computed(() => {
  if (elapsedSeconds.value >= 8) {
    return t("recommender_search_waking_desc");
  }

  return t("recommender_search_working_desc");
});

const startWaitingState = () => {
  elapsedSeconds.value = 0;
  showWaitingTip.value = false;

  elapsedTimer = setInterval(() => {
    elapsedSeconds.value += 1;
  }, 1000);

  // Don't flash the cold-start explanation for normal fast searches.
  waitingTipTimer = setTimeout(() => {
    showWaitingTip.value = true;
  }, 2000);
};

const stopWaitingState = () => {
  if (elapsedTimer) clearInterval(elapsedTimer);
  if (waitingTipTimer) clearTimeout(waitingTipTimer);

  elapsedTimer = undefined;
  waitingTipTimer = undefined;

  showWaitingTip.value = false;
};

const search = async () => {
  if (!searchQuery.value.trim() || loading.value) return;

  loading.value = true;
  errorMessage.value = "";
  startWaitingState();

  try {
    const { results } = await $fetch("/api/search", {
      method: "POST",
      body: {
        keyword: searchQuery.value,
      },
    });

    questions.value = results.questions;
    topics.value = getUniqueTopicsSortByOccurances(results.questions);

    props.nextStep();
  } catch (error) {
    console.error("Search failed:", error);
    errorMessage.value = t("recommender_search_error");
  } finally {
    loading.value = false;
    stopWaitingState();
  }
};

onBeforeUnmount(stopWaitingState);
</script>

<style scoped>
textarea {
  width: 100%;
  outline: none;
  min-height: 320px;
  padding: 8px 14px !important;
  overflow-y: scroll;
  border-radius: 5px;
  line-height: 2.5rem !important;
  border-bottom: 2px solid #45424A;
  resize: vertical !important;
}
</style>
