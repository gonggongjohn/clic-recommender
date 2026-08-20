<template>
  <div
    class="bg-pale-purple relative w-full text-dark-purple py-4 [&>div]:xs:px-[6%] [&>div]:md:px-[8%] [&>div]:lg:px-[12%]"
  >
    <div class="flex justify-center flex-wrap">
      <div class="flex justify-between w-full">
        <div>
          <NuxtLink
            to="/about"
            class="block mt-2 md:inline-block lg:mt-0 mr-4 text-lg"
          >
            {{ $t("nav_about") }}
          </NuxtLink>
          <NuxtLink
            to="/instructions"
            class="block mt-2 md:inline-block lg:mt-0 mr-4 text-lg"
          >
            {{ $t("nav_howto") }}
          </NuxtLink>
          <NuxtLink
            to="/terms"
            class="block mt-2 md:inline-block lg:mt-0 mr-4 text-lg"
          >
            {{ $t("nav_terms") }}
          </NuxtLink>
          <NuxtLink
            to="/disclaimer"
            class="block mt-2 md:inline-block lg:mt-0 mr-4 text-lg"
          >
            {{ $t("nav_disclaimer") }}
          </NuxtLink>
          <NuxtLink
            to="/feedback"
            class="block mt-2 md:inline-block lg:mt-0 mr-4 text-lg"
          >
            {{ $t("nav_feedback") }}
          </NuxtLink>
        </div>
        <div class="flex justify-center">
          <NuxtLink :to="links.clic" target="_blank">
            <v-btn
              class="block text-none mt-2 md:inline-block lg:mt-0 text-lg"
              color="amber"
              rounded="xl"
              size="x-large"
              variant="flat"
              >{{ $t("footer_btn") }}</v-btn>
          </NuxtLink>
        </div>
      </div>
    </div>
    <div class="flex justify-center xs:flex-wrap pt-6 pb-4">
      <div class="flex flex-wrap gap-6">
        <div>
          <NuxtLink :to="links.clic" target="_blank">
            <NuxtImg
              class="flex-shrink-0"
              src="/favicon.ico"
              :alt="$t('title')"
              :title="$t('title')"
              fit="contain"
              width="60"
            />
          </NuxtLink>
        </div>
        <div>
          <NuxtLink :to="links.lawTech" target="_blank">
            <NuxtImg
              class="flex-shrink-0"
              src="/lawtech_logo.png"
              :alt="$t('lawtech')"
              :title="$t('lawtech')"
              fit="contain"
              width="250"
            />
          </NuxtLink>
        </div>
        <div class="xs:hidden vl mt-1 mb-2"></div>
        <div class="flex-grow">
          <div class="text-wrap max-w-lg text-sm">
            {{ $t("footer_disclaimer") }}
          </div>
        </div>
      </div>
    </div>
    <div class="flex justify-center my-2">
      <v-divider thickness="2"></v-divider>
    </div>
    <div class="flex text-dark-grey">
      <div>
        {{ $t("footer_copyright") }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { links } from "@/data/links";
</script>

<style scoped>
.vl {
  border-left: 1px solid #766992;
}
</style>
