<template>
  <footer class="bg-pale-purple w-full text-dark-purple pt-8 pb-6">
    <div class="xs:px-[6%] md:px-[4%]">
      <!-- Link row + primary CTA -->
      <div class="flex justify-between items-center gap-6 xs:flex-col xs:items-start">
        <nav class="flex flex-wrap gap-x-7 gap-y-2">
          <NuxtLink
            v-for="item in footerLinks"
            :key="item.to"
            :to="item.to"
            class="text-lg hover:underline underline-offset-4"
          >
            {{ $t(item.label) }}
          </NuxtLink>
        </nav>

        <NuxtLink :to="links.clic" target="_blank" class="shrink-0">
          <v-btn
            class="text-none font-bold tracking-wide"
            color="amber"
            rounded="xl"
            size="x-large"
            variant="flat"
            >{{ $t("footer_btn") }}</v-btn
          >
        </NuxtLink>
      </div>

      <!-- Logos + disclaimer -->
      <div class="flex justify-center pt-10 pb-6">
        <div class="flex items-center xs:flex-wrap xs:justify-center gap-6">
          <NuxtLink :to="links.clic" target="_blank" class="shrink-0">
            <NuxtImg
              src="/favicon.ico"
              :alt="$t('title')"
              :title="$t('title')"
              width="72"
            />
          </NuxtLink>

          <NuxtLink :to="links.lawTech" target="_blank" class="shrink-0">
            <NuxtImg
              src="/lawtech_logo.png"
              :alt="$t('lawtech')"
              :title="$t('lawtech')"
              width="290"
            />
          </NuxtLink>

          <div class="xs:hidden self-stretch border-l border-light-purple"></div>

          <p class="max-w-prose text-sm leading-relaxed text-ink">
            {{ $t("footer_disclaimer") }}
          </p>
        </div>
      </div>

      <div class="text-sm text-ink-soft">
        {{ $t("footer_copyright") }}
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { links } from "@/data/links";

// Mirrors the live site's footer. Privacy Policy and Acknowledgement are
// sections inside existing pages rather than routes of their own.
const footerLinks = [
  { to: "/", label: "nav_home" },
  { to: "/about", label: "nav_about" },
  { to: "/instructions", label: "nav_howto" },
  { to: "/terms", label: "nav_terms" },
  { to: "/disclaimer", label: "nav_disclaimer" },
  { to: "/terms#privacy", label: "nav_privacy" },
  { to: "/about#acknowledgement", label: "nav_acknowledgement" },
  { to: "/feedback", label: "nav_feedback" },
];
</script>
