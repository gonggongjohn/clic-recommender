<template>
  <div>
    <p id="text" :class="`${more ? 'text-expand' : 'text-collapse'}`" ref="textRef">
      {{ text }}
    </p>
  </div>
  <div v-if="showButton">
    <small
      class="bg-pale-grey p-1 rounded text-orange"
      @click="showMoreToggle"
    >
      <a>{{
        more ? $t("collapse") : $t("showmore")
      }}</a>
      <v-icon :icon="more ? 'mdi-chevron-up' : 'mdi-chevron-down'"></v-icon>
    </small>
  </div>
</template>

<script setup lang="ts">
const props = defineProps(["text", "max_rows"]);
const showButton = ref(false);
const more = ref(false);
const textRef = ref<Element | null>(null);

// check if element hiehgt is more than maximum line allowed
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
    // observers to observe resize and innerHTML changes
    const resizeObserver = new ResizeObserver(checkOverflow);
    const mutationObserver = new MutationObserver(checkOverflow);
    resizeObserver.observe(textElement);
    mutationObserver.observe(textElement, {characterData: false, childList: true, attributes: false})
  }
});
</script>

<style scoped>
.text-collapse {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: v-bind(max_rows);
  overflow: hidden;
}

.text-expand {
  display: block;
}

small {
  cursor: pointer;
}

small:hover {
  filter: brightness(0.9);
}
</style>
