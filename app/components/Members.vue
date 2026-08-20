<template>
  <div class="flex flex-col gap-3">
    <div>
      <div class="my-2" v-for="c in staff.coordinator">
        <div class="flex">
          <span class="font-bold mr-3">{{ c.name }}</span>
          ({{ getTitle(staff.coordinatorTitle) }})
        </div>
        <div>{{ getInfo(c) }}</div>
      </div>
      <div class="my-4" v-for="s in staff.staff">
        <div class="font-bold">{{ s.name }}</div>
        <div>{{ getInfo(s) }}</div>
      </div>
    </div>
    <div>
      <div class="my-2">{{ $t("about_ack") }}</div>
      <div v-for="student in staff.students">
        <div>{{ student }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import staff from "@/data/staff.json";

const { locale } = useI18n();

const getInfo = (personal: any) => {
  if (locale.value === "ZH-HK") return personal.ent.tc;
  else if (locale.value === "ZH-CN") return personal.ent.sc;
  else return personal.ent.en;
};

const getTitle = (title: any) => {
  if (locale.value === "ZH-HK") return title.tc;
  else if (locale.value === "ZH-CN") return title.sc;
  else return title.en;
};
</script>
