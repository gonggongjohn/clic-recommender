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

      <BottomNavbar />
    </div>
  </v-app>
</template>

<script setup lang="ts">
/**
 * The photo lives in `public/`, so its URL has to carry this deployment's base
 * path. A `url()` written inside the <style> block below would be emitted
 * verbatim into the stylesheet and would miss the prefix, so the resolved value
 * is handed to the CSS as a custom property instead. See app/utils/paths.ts.
 */
const backgroundImage = `url("${publicAssetUrl("/background.jpg")}")`;
</script>

<style scoped>
/* Lavender scrim over the Hong Kong street photo, lightening downwards.
   Endpoint colours sampled from the live site (#D3D3E7 -> #EBE4F1). */
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
