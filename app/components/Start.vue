<template>
  <div
    class="flex flex-col justify-center items-center gap-6 bg-blue py-12 bg-start bg-center bg-cover"
  >
    <div class="text-5xl text-center text-white">{{ $t("start_title") }}</div>
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
  background-image: url(/background.jpg);
}
</style>
