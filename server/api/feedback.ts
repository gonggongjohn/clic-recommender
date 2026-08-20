import type { Feedback } from "#shared/types/types";

export default defineEventHandler(async (event) => {
  const feedback = await readBody<Feedback>(event);
  const config = useRuntimeConfig(event);
  const teams = process.env.NUXT_TEAMS ?? process.env.TEAMS ?? config.teams;

  if (!teams) {
    console.warn("TEAMS is not configured; feedback notification skipped.");
    return { ok: true };
  }

  const text = `CLIC Recommender Feedback Form Submission<br />
Sender: ${feedback.sender}<br />
Body:<br />
${feedback.body}`;

  try {
    await $fetch(teams, {
      method: "POST",
      body: { text },
    });
  } catch (error) {
    console.error("Failed to send feedback notification", error);
  }

  return { ok: true };
});
