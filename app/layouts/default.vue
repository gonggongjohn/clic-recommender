<template>
  <v-app>
    <Metas />
    <header>
      <Navbar />
    </header>
    <div class="flex flex-col content-center min-h-screen">
      <div
        class="bg bg-center bg-cover flex-grow flex flex-col py-6 xs:[&>div]:mx-[0%] md:[&>div]:mx-[4%] lg:[&>div]:mx-[11%] [&>div]:my-[1%]"
      >
        <slot />
      </div>
      <div>
        <BottomNavbar />
      </div>
    </div>
  </v-app>
</template>

<style scoped>
.bg {
  background-image: linear-gradient(
      to bottom,
      rgba(219, 211, 235, 0.86),
      rgba(255, 255, 255, 1)
    ),
    url(/background.jpg);
}
</style>
