<template>
  <article
    class="bg-white border border-card-line rounded-xl shadow-card grid grid-cols-12 xs:gap-2 gap-6 xs:px-4 md:px-8 py-8"
  >
    <!-- Left rail: question number -->
    <div class="col-span-2 xs:col-span-12">
      <div class="text-sm uppercase tracking-[0.08em] text-ink-soft">
        {{ $t("recommender_step3_question") }} #{{ index }}
      </div>
    </div>

    <!-- Main column -->
    <div class="col-span-10 xs:col-span-12 min-w-0 flex flex-col gap-4">
      <!-- Topic label -->
      <div>
        <span
          class="inline-block bg-clic-blue text-white text-sm rounded px-3 py-1"
          >{{ getTopic(question) }}</span
        >
      </div>

      <!-- Question -->
      <h3 class="font-display text-3xl xs:text-2xl font-bold text-ink leading-snug">
        {{ getQuestionText(question) }}
      </h3>

      <!-- Source URL -->
      <div class="text-ink-soft text-sm break-all">
        {{ question.detailed_info[0].page_url }}
      </div>

      <!-- Preview toggle -->
      <button
        type="button"
        class="text-preview inline-flex items-center gap-1 self-start text-lg hover:opacity-80"
        :aria-expanded="!collapse"
        @click="excerptToggle"
      >
        {{
          collapse
            ? $t("recommender_step3_expand")
            : $t("recommender_step3_collapse")
        }}
        <v-icon :icon="collapse ? 'mdi-chevron-down' : 'mdi-chevron-up'" size="small" />
      </button>

      <!-- Excerpt panel -->
      <div
        v-show="!collapse"
        class="bg-excerpt rounded-lg px-6 py-5 flex flex-col gap-3"
      >
        <ShowMoreText :text="getScope(question)" max_rows="6" />

        <div class="border-t border-excerpt-line pt-3 flex gap-2 text-sm text-ink-soft">
          <v-icon icon="mdi-help-circle-outline" size="small" class="mt-0.5 shrink-0" />
          <p>{{ $t("recommender_step3_excerpt_note") }}</p>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-between gap-6 xs:flex-col xs:items-start mt-2">
        <NuxtLink
          :to="getLink(question.detailed_info[0].page_url)"
          target="_blank"
          @click="visit"
        >
          <v-btn
            variant="flat"
            rounded="xl"
            size="large"
            append-icon="mdi-open-in-new"
            class="btn-visit px-8"
          >
            {{ $t("recommender_step3_visit") }}
          </v-btn>
        </NuxtLink>

        <div class="flex flex-col items-center gap-1">
          <div class="text-ink-soft">
            {{ $t("recommender_step3_feedback") }}
          </div>
          <v-rating
            v-model="rating"
            color="amber"
            active-color="amber"
            density="compact"
            clearable
          ></v-rating>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
const { locale } = useI18n();
const props = defineProps(["index", "question"]);
const collapse = ref(true);
const rating = ref(0);
const searchQuery = useSearchQueryState();

const { getQuestionText, getScope, getTopic } = useClic();

const excerptToggle = () => {
  collapse.value = !collapse.value;
};

const rate = async () => {
  if (rating.value !== 0) {
    await $fetch(`/api/rating`, {
      method: "POST",
      body: {
        search: searchQuery.value,
        question: getQuestionText(props.question),
        topic: getTopic(props.question),
        content: getScope(props.question),
        rating: rating.value,
      },
    });
  }
};

const visit = async () => {
  const url = getLink(props.question.detailed_info[0].page_url);
  const contents = url.slice(url.indexOf(".hk/") + 1);
  await $fetch(`/api/visit`, {
    method: "POST",
    body: { visit: contents },
  });
};

const getLink = (link: string) => {
  if (locale.value === "ZH-HK") return link.replace("/en/", "/zh/");
  else if (locale.value === "ZH-CN") return link.replace("/en/", "/cn/");
  else return link;
};

watch(rating, async () => {
  rate();
});

onMounted(() => {
  // The first recommendation opens its preview by default.
  if (props.index === 1) {
    collapse.value = false;
  }
});
</script>

<style scoped>
/* "Visit page" uses a blue-to-purple gradient rather than a flat theme
   colour, so it can't be expressed with a Vuetify `color` prop. */
.btn-visit {
  background-image: linear-gradient(to right, #4187b5, #402279);
  color: #ffffff;
}
</style>
