/**
 * Same-origin ingestion endpoint for product analytics events.
 *
 * The browser never receives Azure Storage credentials. Events are forwarded
 * to the Flask Container App, whose managed identity writes them to Table
 * Storage. Logging failures are returned to the caller, but the UI helper
 * treats them as best-effort and never interrupts the user journey.
 */
export default defineEventHandler(async (event) => {
  const payload = await readBody<Record<string, unknown>>(event);
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

  await $fetch(`${backendBaseUrl}/recommender/events`, {
    method: "POST",
    body: payload,
  });

  return { ok: true };
});
