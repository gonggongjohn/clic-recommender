<template>
  <div class="flex flex-col xs:px-6 mb-8">
    <div
      class="text-sm uppercase tracking-[0.06em] text-muted-purple"
    >
      {{ $t("recommender_slogan") }}
    </div>

    <h1
      class="font-display font-bold text-dark-purple mt-3 xs:text-4xl md:text-6xl leading-tight"
    >
      {{ $t("recommender_name") }}
    </h1>

    <p class="text-xl text-ink mt-8 xs:w-full md:w-9/12">
      {{ $t("recommender_instructions") }}
    </p>

    <p class="text-base text-ink mt-5 xs:w-full md:w-10/12 leading-relaxed">
      {{ $t("recommender_description") }}
    </p>
  </div>
</template>
