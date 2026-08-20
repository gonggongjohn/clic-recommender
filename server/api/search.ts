import type { SearchResponse } from "#shared/types/types";

export default defineEventHandler(async (event) => {
  const { keyword } = await readBody<{ keyword: string }>(event);
  const config = useRuntimeConfig(event);
  const backend = process.env.NUXT_BACKEND ?? process.env.BACKEND ?? config.backend;

  if (!backend) {
    throw createError({
      statusCode: 500,
      statusMessage: "BACKEND is not configured",
    });
  }

  const backendBaseUrl = /^https?:\/\//i.test(backend)
    ? backend
    : `http://${backend}`;

  // const payload = new FormData();
  // payload.append("keyword", keyword);

  // console.log(payload);

  return await $fetch<SearchResponse>(
    `${backendBaseUrl}/recommender/search/combine`,
    {
      method: "POST",
      body: {
        keyword,
      }
    },
  );
});
