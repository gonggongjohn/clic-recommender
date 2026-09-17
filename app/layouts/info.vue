<template>
  <v-app>
    <Metas />
    <header>
      <Navbar />
    </header>

    <div class="flex flex-col min-h-screen">
      <div
        class="page-bg flex-grow flex flex-col py-8 xs:px-[6%] md:px-[4%]"
        :style="{ '--page-bg-image': backgroundImage }"
      >
        <slot />
      </div>

      <Start />
      <BottomNavbar />
    </div>
  </v-app>
</template>

<script setup lang="ts">
/** See the note in layouts/default.vue - public/ URLs need the base path. */
const backgroundImage = `url("${publicAssetUrl("/background.jpg")}")`;
</script>

<style scoped>
.page-bg {
  background-image: linear-gradient(
      to bottom,
      rgba(206, 205, 231, 0.92),
      rgba(236, 229, 243, 0.94)
    ),
    var(--page-bg-image);
  background-position: center;
  background-size: cover;
  background-attachment: fixed;
}
</style>
