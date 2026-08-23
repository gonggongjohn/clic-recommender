import type { Feedback } from "#shared/types/types";

/**
 * Feedback form handler.
 *
 * The submission is forwarded to the backend at POST /recommender/feedback
 * (same host as the search endpoint). If a Teams incoming-webhook URL is
 * configured it also posts a notification, but that is best-effort only:
 * a webhook failure must not fail the user's submission.
 */
export default defineEventHandler(async (event) => {
  const feedback = await readBody<Feedback>(event);
  const config = useRuntimeConfig(event);

  const sender = feedback?.sender?.trim() ?? "";
  const body = feedback?.body?.trim() ?? "";

  if (!sender || !body) {
    throw createError({
      statusCode: 400,
      statusMessage: "Both sender and body are required",
    });
  }

  const backend =
    process.env.NUXT_BACKEND ?? process.env.BACKEND ?? config.backend;

  if (!backend) {
    throw createError({
      statusCode: 500,
      statusMessage: "BACKEND is not configured",
    });
  }

  const backendBaseUrl = /^https?:\/\//i.test(backend)
    ? backend
    : `http://${backend}`;

  await $fetch(`${backendBaseUrl}/recommender/feedback`, {
    method: "POST",
    body: { sender, body },
  });

  // Optional Teams notification.
  const teams = process.env.NUXT_TEAMS ?? process.env.TEAMS ?? config.teams;

  if (teams) {
    const text = `CLIC Recommender Feedback Form Submission<br />
Sender: ${sender}<br />
Body:<br />
${body}`;

    try {
      await $fetch(teams, { method: "POST", body: { text } });
    } catch (error) {
      console.error("Failed to send feedback notification", error);
    }
  }

  return { ok: true };
});
