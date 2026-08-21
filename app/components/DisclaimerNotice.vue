<template>
  <!-- Grey callout with a purple accent bar, shown above step 1. -->
  <aside
    class="bg-alert-grey border-l-[6px] border-alert-purple flex gap-4 px-6 py-5"
  >
    <v-icon icon="mdi-information" color="dark-purple" class="mt-1 shrink-0" />

    <div>
      <h2 class="font-display text-2xl text-dark-purple">
        {{ $t("nav_disclaimer") }}
      </h2>

      <p class="text-ink mt-1"
        ><span>{{ before }}</span
        ><NuxtLink to="/disclaimer" class="underline underline-offset-2">{{
          $t("nav_disclaimer")
        }}</NuxtLink
        ><span>{{ after }}</span></p
      >
    </div>
  </aside>
</template>

<script setup lang="ts">
/**
 * This notice puts a link in the middle of a sentence.
 *
 * `<i18n-t>` would be the natural tool, but nuxt.config.ts sets
 * `i18n.bundle.fullInstall: false`, which strips vue-i18n's components. So we
 * split the message around a placeholder instead.
 *
 * The placeholder is `[[link]]`, NOT `{link}`: vue-i18n treats braces as an
 * interpolation slot and silently replaces `{link}` with an empty string when
 * no matching argument is passed, which would leave nothing to split on.
 */
const { t } = useI18n();

const SLOT = "[[link]]";

const parts = computed(() => t("disclaimer_notice").split(SLOT));
const before = computed(() => parts.value[0] ?? "");
const after = computed(() => parts.value[1] ?? "");
</script>
