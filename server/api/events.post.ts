/**
 * Same-origin ingestion endpoint for product analytics events.
 *
 * The browser never receives Azure Storage credentials. Events are forwarded
 * to the Flask Container App, whose managed identity writes them to Table
 * Storage. Logging failures are returned to the caller, but the UI helper
 * treats them as best-effort and never interrupts the user journey.
 *
 * Two things are added here that the browser cannot supply itself:
 *
 *   site_id      which Static Web App this came from, so the backend picks the
 *                right table. Sent in the body and as a header.
 *   X-Client-IP  the visitor's address. By the time the request reaches the
 *                Container App the only remaining source IP is the Static Web
 *                App's own egress, so it has to be captured at this hop.
 *
 * The `device` block in the body is filled in by the client composable. It is
 * advisory: the backend overrides anything it can derive from the real request
 * headers, so a tampered payload cannot rewrite a visitor's origin.
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

  const siteId = resolveSiteId(event);

  await $fetch(`${backendBaseUrl}/recommender/events`, {
    method: "POST",
    // The server-resolved site id wins over anything the page sent, so one
    // site can never be made to write into the other site's table.
    body: { ...payload, site_id: siteId },
    headers: buildBackendHeaders(event, { withClientContext: true }),
  });

  return { ok: true };
});
