<template>
  <div
    :class="`flex flex-col rounded-t [&>div]:px-4 [&>div]:xs:px-4 [&>div]:grid [&>div]:grid-cols-12 ${
      collapse ? 'bg-amber-lighten-4' : 'bg-amber'
    }`"
  >
    <div class="[&>div]:px-4 [&>div]:pt-4 [&>div]:xs:px-1 [&>div]:xs:pt-4">
      <div class="col-span-2 xs:col-span-12">
        <div class="flex flex-nowrap text-lg">
          {{ $t("recommender_step3_question") }} #{{ index }}
        </div>
      </div>
      <div class="col-span-7 xs:col-span-12 flex flex-col gap-3">
        <div class="text-2xl text-wrap">
          {{ getQuestionText(question) }}
        </div>
        <div>
          <v-chip variant="flat" class="bg-amber-lighten-5" label>{{
            getTopic(question)
          }}</v-chip>
        </div>
      </div>
      <div class="col-span-3 xs:col-span-12">
        <NuxtLink :to="getLink(question.detailed_info[0].page_url)" target="_blank" @click="visit">
          <v-btn
            variant="flat"
            rounded="xl"
            append-icon="mdi-open-in-new"
            class="bg-dark-purple rounded text-white w-full"
          >
            {{ $t("recommender_step3_visit") }}
          </v-btn>
        </NuxtLink>
      </div>
    </div>

    <div class="[&>div]:md:px-4 [&>div]:py-2">
      <div class="col-span-2"></div>
      <div
        class="col-span-10 xs:col-span-12 flex xs:justify-center cursor-pointer rounded text-dark-purple"
        @click="excerptToggle"
      >
        <a>{{
          collapse
            ? $t("recommender_step3_expand")
            : $t("recommender_step3_collapse")
        }}</a>
        <v-icon
          :icon="collapse ? 'mdi-chevron-down' : 'mdi-chevron-up'"
        ></v-icon>
      </div>
    </div>

    <div
      :class="`[&>div]:px-4 [&>div]:pt-4 [&>div]:xs:px-2 [&>div]:xs:pt-4 bg-pale-grey  ${
        collapse ? 'max-h-0' : 'max-h-svh'
      } overflow-hidden text transition-max-height duration-[150ms] ease-in-out`"
    >
      <div class="col-span-2 xs:col-span-12">
        {{ $t("recommender_step3_awnser") }}
      </div>
      <div class="col-span-7 xs:col-span-12 flex flex-col gap-1 xs:pb-2 md:pb-4">
        <ShowMoreText :text="getScope(question)" max_rows="5" />
        <div class="flex mt-4 gap-3 xs:flex-col">
          <div class="flex items-center">
            {{ $t("recommender_step3_feedback") }}
          </div>
          <div>
            <v-rating
              v-model="rating"
              color="dark-purple"
              density="compact"
              clearable
            ></v-rating>
          </div>
        </div>
      </div>
    </div>
  </div>
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
      method: 'POST',
      body: {
        search: searchQuery.value,
        question: getQuestionText(props.question),
        topic: getTopic(props.question),
        content: getScope(props.question),
        rating: rating.value
      },
    });
  }
};

const visit = async () => {
  const url = getLink(props.question.detailed_info[0].page_url)
  const contents = url.slice(url.indexOf('.hk/') + 1);
  await $fetch(`/api/visit`, {
    method: 'POST',
    body: { 
      visit: contents
    }
  })
}

const getLink = (link: string) => {
  if (locale.value === "ZH-HK")
    return link.replace('/en/', '/zh/');
  else if (locale.value === "ZH-CN")
    return link.replace('/en/', '/cn/');
  else return link;
}

watch(rating, async () => {
  rate()
})

onMounted(() => {
  if (props.index === 1) {
    collapse.value = false;
  }
});
</script>
