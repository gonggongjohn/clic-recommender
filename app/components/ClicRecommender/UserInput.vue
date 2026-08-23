<template>
  <div>
    <!-- Voice input -->
    <div v-if="speechSupported" class="flex items-center gap-5 mb-6 xs:flex-wrap">
      <v-btn
        :color="listening ? 'dark-purple' : 'clic-blue'"
        variant="flat"
        rounded="xl"
        size="large"
        prepend-icon="mdi-microphone"
        :disabled="loading"
        @click="toggleListening"
      >
        {{ listening ? $t("recommender_voice_stop") : $t("recommender_voice") }}
      </v-btn>

      <span class="text-ink">{{ $t("recommender_or_write") }}</span>
    </div>

    <div class="grid grid-cols-12 gap-6 mb-6">
      <textarea
        v-model="searchQuery"
        class="bg-pale-grey border border-grey-line rounded-lg xs:col-span-12 md:col-span-7"
        :placeholder="placeholder"
        :disabled="loading"
      ></textarea>

      <ClicRecommenderSamples class="xs:col-span-12 md:col-span-5" />
    </div>

    <div class="flex items-center gap-4">
      <v-btn
        class="px-8"
        variant="flat"
        color="dark-purple"
        rounded="xl"
        size="large"
        prepend-icon="mdi-arrow-down"
        :loading="loading"
        :disabled="searchQuery.trim() === '' || loading"
        @click="search"
      >
        {{ $t("recommender_step1_btn") }}
      </v-btn>

      <span v-if="loading && elapsedSeconds > 0" class="text-sm text-ink-soft">
        {{ elapsedSeconds }}s
      </span>
    </div>

    <!-- Only shown if the request takes longer than a normal search -->
    <div
      v-if="loading && showWaitingTip"
      class="mt-5 max-w-xl rounded-lg border border-grey-line bg-pale-grey p-4"
      aria-live="polite"
    >
      <div class="flex gap-3">
        <v-icon icon="mdi-cloud-sync-outline" color="dark-purple" class="mt-1" />

        <div class="grow">
          <div class="font-medium">{{ waitingTitle }}</div>
          <div class="mt-1 text-sm text-ink-soft">{{ waitingDescription }}</div>
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

const { getRankedTopics } = useClic();
const { t, locale } = useI18n();

const loading = ref(false);
const elapsedSeconds = ref(0);
const showWaitingTip = ref(false);
const errorMessage = ref("");

/* ------------------------------------------------------------------ *
 * Placeholder
 * The live site puts the usage tips inside the textarea rather than in a
 * separate block, so reuse the existing translated tips instead of adding
 * duplicate strings.
 * ------------------------------------------------------------------ */
const placeholder = computed(() =>
  [
    t("recommender_step1_input"),
    t("recommender_tips.0"),
    t("recommender_tips.1"),
  ].join("\n\n")
);

/* ------------------------------------------------------------------ *
 * Voice input (Web Speech API)
 * Chrome/Edge/Safari only. The button is hidden entirely when the browser
 * has no SpeechRecognition, so nothing dead ever renders.
 * ------------------------------------------------------------------ */
const speechSupported = ref(false);
const listening = ref(false);
let recognition: any = null;
let committedText = "";

const speechLang = computed(() => {
  if (locale.value === "ZH-HK") return "zh-HK";
  if (locale.value === "ZH-CN") return "zh-CN";
  return "en-US";
});

onMounted(() => {
  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) return;

  speechSupported.value = true;
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (event: any) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) committedText += transcript;
      else interim += transcript;
    }
    searchQuery.value = (committedText + interim).trim();
  };

  recognition.onerror = (event: any) => {
    listening.value = false;
    // "aborted" fires whenever the user stops the mic themselves.
    if (event.error === "aborted" || event.error === "no-speech") return;
    errorMessage.value =
      event.error === "not-allowed"
        ? t("recommender_voice_denied")
        : t("recommender_voice_error");
  };

  recognition.onend = () => {
    listening.value = false;
  };
});

const toggleListening = () => {
  if (!recognition) return;

  if (listening.value) {
    recognition.stop();
    return;
  }

  errorMessage.value = "";
  // Keep anything already typed, and append what gets dictated.
  committedText = searchQuery.value ? searchQuery.value + " " : "";
  recognition.lang = speechLang.value;

  try {
    recognition.start();
    listening.value = true;
  } catch {
    // start() throws if called while already running; ignore.
  }
};

onBeforeUnmount(() => {
  if (recognition && listening.value) recognition.abort();
});

/* ------------------------------------------------------------------ *
 * Search
 * ------------------------------------------------------------------ */
let elapsedTimer: ReturnType<typeof setInterval> | undefined;
let waitingTipTimer: ReturnType<typeof setTimeout> | undefined;

const waitingTitle = computed(() =>
  elapsedSeconds.value >= 8
    ? t("recommender_search_waking_title")
    : t("recommender_search_working_title")
);

const waitingDescription = computed(() =>
  elapsedSeconds.value >= 8
    ? t("recommender_search_waking_desc")
    : t("recommender_search_working_desc")
);

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

  if (listening.value && recognition) recognition.stop();

  loading.value = true;
  errorMessage.value = "";
  startWaitingState();

  try {
    const { results } = await $fetch("/api/search", {
      method: "POST",
      body: { keyword: searchQuery.value },
    });

    questions.value = results.questions;
    topics.value = getRankedTopics(results);

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
  min-height: 560px;
  padding: 18px 20px;
  line-height: 1.9;
  outline: none;
  resize: vertical;
  overflow-y: auto;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

textarea::placeholder {
  color: #9399a5;
}

textarea:focus {
  border-color: var(--clic-mid-purple);
  box-shadow: 0 0 0 3px rgba(141, 129, 155, 0.25);
}
</style>
