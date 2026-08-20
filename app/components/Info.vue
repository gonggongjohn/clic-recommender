<template>
  <div class="mx-20 px-16 py-8 bg-gray-200">
    <h2 class="text-5xl">{{$t('info_title')}}</h2>
    <div class="my-6">
    <h5 class="text-2xl">{{$t('clicPageCount')}} {{ meta.clic_num_pages }}</h5>
    <h5 class="text-2xl">{{$t('totalQuestionsCount')}} {{ meta.clic_num_questions }}</h5>
    <ul class="list-disc list-inside text-xl">
      <li>
        {{ $t('humanQuestionsCount') }} {{ meta.clic_human_questions }}
      </li>
      <li>
        {{ $t('machineQuestionsCount').replace('1', meta.clic_machine_questions_full).replace('2', meta.clic_machine_questions_curated ) }}
      </li>
    </ul>
  </div>
    <div class="text-3xl">{{ $t('topicSet') }}</div>
    <ul class="list-disc list-inside text-xl">
      <li v-for="(value, topic) in topics">{{ topic }} : {{ value }}</li>
    </ul>
  
  </div>
</template>

<script setup lang="ts">
import { topics, meta } from "/data/clic_meta";
</script>
