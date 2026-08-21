<template>
  <div
    class="flex flex-col justify-center items-center gap-6 py-16 bg-start bg-center bg-cover"
  >
    <div class="font-display text-5xl xs:text-3xl font-bold text-center text-white px-6">
      {{ $t("start_title") }}
    </div>
    <div>
      <NuxtLink to="/">
        <v-btn variant="flat" color="amber" rounded="xl" size="x-large"
          >{{ $t("start_btn") }}</v-btn
        >
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.bg-start {
  /* Brand-purple scrim over the photo so the white headline stays legible.
     Previously this relied on a `bg-blue` utility that was never defined. */
  background-image: linear-gradient(
      to bottom,
      rgba(48, 22, 81, 0.88),
      rgba(48, 22, 81, 0.72)
    ),
    url(/background.jpg);
}
</style>
