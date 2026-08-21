<template>
  <p :class="more ? 'text-expand' : 'text-collapse'" ref="textRef">
    {{ text }}
  </p>

  <button
    v-if="showButton"
    type="button"
    class="text-amber-text inline-flex items-center gap-1 mt-1 hover:opacity-80"
    @click.stop="showMoreToggle"
  >
    {{ more ? $t("collapse") : $t("showmore") }}
    <v-icon :icon="more ? 'mdi-chevron-up' : 'mdi-chevron-down'" size="small" />
  </button>
</template>

<script setup lang="ts">
const props = defineProps(["text", "max_rows"]);
const showButton = ref(false);
const more = ref(false);
const textRef = ref<Element | null>(null);

// Check whether the element is taller than the maximum number of lines.
const checkOverflow = () => {
  const textElement = textRef.value;
  if (textElement) {
    const lineHeight = parseInt(window.getComputedStyle(textElement).lineHeight);
    const maxHeight = lineHeight * props.max_rows;
    showButton.value = textElement.scrollHeight > maxHeight;
  }
};

const showMoreToggle = () => {
  more.value = !more.value;
};

onMounted(() => {
  const textElement = textRef.value;
  if (textElement) {
    // Observe resize and content changes.
    const resizeObserver = new ResizeObserver(checkOverflow);
    const mutationObserver = new MutationObserver(checkOverflow);
    resizeObserver.observe(textElement);
    mutationObserver.observe(textElement, {
      characterData: false,
      childList: true,
      attributes: false,
    });
  }
});
</script>

<style scoped>
.text-collapse {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: v-bind(max_rows);
  overflow: hidden;
  white-space: pre-line;
}

.text-expand {
  display: block;
  white-space: pre-line;
}
</style>
