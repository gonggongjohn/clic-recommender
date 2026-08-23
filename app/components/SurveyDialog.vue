<template>
  <v-dialog v-model="open" max-width="940" scrollable>
    <v-card rounded="lg" class="overflow-hidden">
      <div class="grid xs:grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <!-- Product shot, flush to the card edge as on the live site -->
        <NuxtImg
          src="/survey.png"
          :alt="$t('survey_image_alt')"
          width="562"
          height="987"
          sizes="sm:100vw md:40vw"
          class="w-full h-full object-cover xs:max-h-56"
        />

        <div class="flex flex-col justify-center gap-5 px-10 py-10 xs:px-6 xs:py-7">
          <h2 class="font-display text-3xl xs:text-2xl font-bold text-dark-purple">
            {{ $t("survey_message") }}
          </h2>

          <p class="leading-relaxed">{{ $t("survey_body") }}</p>

          <div class="flex items-center gap-4 xs:flex-wrap">
            <v-btn
              class="px-6"
              color="dark-purple"
              variant="flat"
              rounded="xl"
              size="large"
              append-icon="mdi-chevron-right"
              :href="links.survey"
              target="_blank"
              rel="noopener noreferrer"
              @click="dismiss"
            >
              {{ $t("survey_cta") }}
            </v-btn>

            <v-btn variant="text" size="large" @click="dismiss">
              {{ $t("close") }}
            </v-btn>
          </div>
        </div>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
/**
 * Survey invitation popup for the home page.
 *
 * Opens once per browser: the dismissal is remembered in localStorage so
 * returning visitors are not nagged. Clearing the key (or changing
 * STORAGE_KEY when a new survey launches) brings it back.
 *
 * The whole component renders nothing when `links.survey` is empty.
 */
import { links } from "@/data/links";

const STORAGE_KEY = "crec-survey-dismissed";
const OPEN_DELAY_MS = 800;

const open = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;

const dismiss = () => {
  open.value = false;

  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Private browsing / storage disabled - the popup simply shows again.
  }
};

// localStorage is client-only, so this must not run during SSR.
onMounted(() => {
  if (!links.survey) return;

  let dismissed = false;
  try {
    dismissed = window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    dismissed = false;
  }

  if (dismissed) return;

  // A short delay lets the page paint first, so the popup reads as an
  // invitation rather than a wall.
  timer = setTimeout(() => {
    open.value = true;
  }, OPEN_DELAY_MS);
});

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
});

// Closing with Esc or the scrim counts as a dismissal too.
watch(open, (value) => {
  if (!value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  }
});
</script>
