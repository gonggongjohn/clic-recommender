<template>
  <Head>
    <Title>{{ $t("nav_howto") }}</Title>
  </Head>

  <div class="font-display text-5xl xs:text-4xl font-bold text-dark-purple mb-4">
    {{ $t("nav_howto") }}
  </div>

  <div
    class="bg-white rounded-2xl shadow-card py-10 flex flex-col gap-14 xs:px-6 md:px-10"
  >
    <!-- Usage ------------------------------------------------------- -->
    <section>
      <h2 class="font-display text-3xl font-bold text-dark-purple mb-3">
        {{ $t("howto_usage_title") }}
      </h2>
      <p class="max-w-prose leading-relaxed">{{ $t("howto_usage_body") }}</p>
    </section>

    <!-- Features ---------------------------------------------------- -->
    <section>
      <h2 class="font-display text-3xl font-bold text-dark-purple mb-5">
        {{ $t("howto_features_title") }}
      </h2>

      <div class="grid gap-6 xs:grid-cols-1 md:grid-cols-3">
        <article
          v-for="feature in features"
          :key="feature.image"
          class="border border-card-line rounded-xl overflow-hidden flex flex-col"
        >
          <!-- `grow` keeps the three headers the same height, so the
               screenshots below them line up across the row. -->
          <div class="bg-pale-purple px-5 py-4 grow">
            <h3 class="font-bold text-dark-purple">{{ feature.title }}</h3>
            <p class="text-sm mt-2 leading-relaxed">{{ feature.body }}</p>
          </div>

          <NuxtImg
            :src="feature.image"
            :alt="$t('howto_features_alt')"
            width="841"
            height="503"
            sizes="sm:100vw md:33vw"
            class="w-full h-auto"
            loading="lazy"
          />
        </article>
      </div>
    </section>

    <!-- Steps ------------------------------------------------------- -->
    <section>
      <h2 class="font-display text-3xl font-bold text-dark-purple mb-6">
        {{ $t("howto_steps_title") }}
      </h2>

      <ol class="flex flex-col">
        <li
          v-for="(step, index) in steps"
          :key="step.image"
          class="grid grid-cols-[auto_1fr] gap-x-5 xs:gap-x-3"
        >
          <!-- Rail: step label, marker, and the connector down to the next -->
          <div class="flex flex-col items-center">
            <span
              class="text-sm font-bold text-clic-blue whitespace-nowrap mb-2"
            >
              {{ $t("howto_step_label", { n: index + 1 }) }}
            </span>

            <span
              class="bg-clic-blue text-white rounded-full w-8 h-8 flex items-center justify-center shrink-0"
            >
              <v-icon :icon="step.icon" size="18" />
            </span>

            <span
              v-if="index < steps.length - 1"
              class="w-px flex-grow bg-line-purple mt-2"
              aria-hidden="true"
            ></span>
          </div>

          <!-- Card -->
          <article
            class="border border-card-line rounded-xl p-5 min-w-0"
            :class="index === steps.length - 1 ? '' : 'mb-8'"
          >
            <h3 class="font-bold text-dark-purple">{{ step.title }}</h3>
            <p class="mt-2 leading-relaxed max-w-prose">{{ step.body }}</p>

            <NuxtImg
              :src="step.image"
              :alt="$t('howto_steps_alt')"
              width="1000"
              height="350"
              sizes="sm:100vw md:60vw"
              class="w-full h-auto mt-4 rounded-lg border border-card-line"
              loading="lazy"
            />
          </article>
        </li>
      </ol>
    </section>
  </div>

  <!-- Giving feedback ----------------------------------------------- -->
  <section
    class="bg-pale-purple rounded-2xl mt-8 py-10 grid gap-8 items-center xs:px-6 xs:grid-cols-1 md:px-10 md:grid-cols-2"
  >
    <NuxtImg
      src="/howto/feedback.png"
      :alt="$t('howto_feedback_alt')"
      width="875"
      height="573"
      sizes="sm:100vw md:50vw"
      class="w-full h-auto"
      loading="lazy"
    />

    <div>
      <h2 class="font-display text-3xl font-bold text-dark-purple mb-4">
        {{ $t("howto_feedback_title") }}
      </h2>

      <p class="leading-relaxed">{{ $t("howto_feedback_body") }}</p>

      <p class="leading-relaxed mt-4"
        ><span>{{ contactBefore }}</span
        ><NuxtLink
          to="/feedback"
          class="underline underline-offset-2 font-bold text-dark-purple hover:opacity-80"
          >{{ $t("howto_feedback_link") }}</NuxtLink
        ><span>{{ contactAfter }}</span></p
      >
    </div>
  </section>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "info",
});

const { t, tm, rt } = useI18n();

/** `tm` returns the raw message array; `rt` renders each entry to a string. */
const list = (key: string) =>
  (tm(key) as unknown[]).map((entry) => rt(entry as string));

const features = computed(() =>
  list("howto_feature_titles").map((title, i) => ({
    title,
    body: list("howto_feature_bodies")[i] ?? "",
    image: `/howto/feature${i + 1}.png`,
  }))
);

// One icon per step, echoing the control the user actually clicks in that step.
const stepIcons = [
  "mdi-pencil-outline",
  "mdi-tag-multiple-outline",
  "mdi-comment-question-outline",
  "mdi-open-in-new",
];

const steps = computed(() =>
  list("howto_step_titles").map((title, i) => ({
    title,
    body: list("howto_step_bodies")[i] ?? "",
    image: `/howto/step${i + 1}.png`,
    icon: stepIcons[i] ?? "mdi-circle-small",
  }))
);

/**
 * The sentence wraps a link around the Feedback page. `[[link]]` marks where
 * it goes - see DisclaimerNotice.vue for why braces can't be used here.
 */
const SLOT = "[[link]]";
const contactParts = computed(() => t("howto_feedback_contact").split(SLOT));
const contactBefore = computed(() => contactParts.value[0] ?? "");
const contactAfter = computed(() => contactParts.value[1] ?? "");
</script>
