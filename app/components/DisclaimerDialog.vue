<template>
  <v-dialog v-model="open" max-width="760" scrollable>
    <v-card rounded="lg" class="disclaimer-card">
      <div class="flex items-start justify-between gap-4 px-8 pt-7">
        <h2 class="text-3xl text-ink">{{ $t("nav_disclaimer") }}</h2>
        <v-btn
          icon="mdi-close"
          variant="text"
          density="comfortable"
          :aria-label="$t('close')"
          @click="open = false"
        />
      </div>

      <v-card-text class="px-8 pt-4 pb-2">
        <p
          v-for="(paragraph, i) in paragraphs"
          :key="i"
          class="text-ink leading-relaxed mb-5 text-base"
        >
          {{ paragraph }}
        </p>
      </v-card-text>

      <div class="px-8 pb-7">
        <v-btn
          color="dark-purple"
          variant="flat"
          rounded="xl"
          size="large"
          prepend-icon="mdi-close"
          class="px-8"
          @click="open = false"
        >
          {{ $t("close") }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
/**
 * Full disclaimer, shown as a modal rather than a separate page.
 * `disclaimer_body` is an array in the locale files - one entry per paragraph.
 */
const open = defineModel<boolean>({ default: false });

const { tm, rt } = useI18n();

const paragraphs = computed(() =>
  (tm("disclaimer_body") as unknown[]).map((p) => rt(p as string))
);
</script>

<style scoped>
.disclaimer-card :deep(.v-card-text) {
  /* Vuetify's default card text is small and grey; the dialog on the live
     site uses full-size body copy. */
  font-size: 1rem;
  line-height: 1.7;
}
</style>
