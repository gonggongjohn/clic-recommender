<template>
  <v-app>
    <Metas />
    <header>
      <Navbar />
    </header>

    <div class="flex flex-col min-h-screen">
      <div class="page-bg flex-grow flex flex-col py-8 xs:px-[6%] md:px-[4%]">
        <slot />
      </div>

      <BottomNavbar />
    </div>
  </v-app>
</template>

<style scoped>
/* Lavender scrim over the Hong Kong street photo, lightening downwards.
   Endpoint colours sampled from the live site (#D3D3E7 -> #EBE4F1). */
.page-bg {
  background-image: linear-gradient(
      to bottom,
      rgba(206, 205, 231, 0.92),
      rgba(236, 229, 243, 0.94)
    ),
    url(/background.jpg);
  background-position: center;
  background-size: cover;
  background-attachment: fixed;
}
</style>
