<template>
  <div class="flex flex-col gap-8">
    <!-- Investigators and academic staff -->
    <div>
      <div v-for="c in staff.coordinator" :key="c.name" class="my-3">
        <p>
          <span class="font-bold">{{ localised(c.name) }}</span>
          <span class="text-ink-soft"> ({{ localised(staff.coordinatorTitle) }})</span>
        </p>
        <p>{{ localised(c.ent) }}</p>
      </div>

      <div v-for="s in staff.staff" :key="s.name" class="my-3">
        <p class="font-bold">{{ localised(s.name) }}</p>
        <p>{{ localised(s.ent) }}</p>
      </div>
    </div>

    <!-- Research team -->
    <div>
      <h3 class="font-display text-2xl font-bold text-dark-purple mb-3">
        {{ $t("about_researchers_title") }}
      </h3>

      <div v-for="r in staff.researchers" :key="r.name" class="my-3">
        <p class="font-bold">{{ localised(r.name) }}</p>
        <p>{{ localised(r.ent) }}</p>
      </div>
    </div>

    <!-- Student helpers -->
    <div>
      <p class="mb-3">{{ $t("about_ack") }}</p>

      <ul
        class="grid gap-x-8 gap-y-1 xs:grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      >
        <li v-for="student in staff.students" :key="student">{{ student }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import staff from "@/data/staff.json";

/** Every record carries the same {en, tc, sc} shape; pick by active locale. */
type Localised = { en: string; tc: string; sc: string };

const { locale } = useI18n();

const localised = (value: Localised) => {
  if (locale.value === "ZH-HK") return value.tc;
  if (locale.value === "ZH-CN") return value.sc;
  return value.en;
};
</script>
