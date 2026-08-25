import type { Rating } from "#shared/types/types";

export default defineEventHandler(async (event) => {
  const rating = await readBody<Rating>(event);
  const config = useRuntimeConfig(event);
  const teams = process.env.NUXT_TEAMS ?? process.env.TEAMS ?? config.teams;

  if (!teams) {
    console.warn("TEAMS is not configured; rating notification skipped.");
    return { ok: true };
  }

  const text = `CLIC Recommender Rating Submission<br />
UserInput: ${rating.search}<br />
Question: ${rating.question}<br />
Question ID: ${rating.question_id ?? ""}<br />
Topic: ${rating.topic}<br />
Content: ${rating.content}<br />
Rating: ${rating.rating}<br />`;

  try {
    await $fetch(teams, {
      method: "POST",
      body: { text },
    });
  } catch (error) {
    console.error("Failed to send rating notification", error);
  }

  return { ok: true };
});
