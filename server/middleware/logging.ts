/**
 * Operational request logging only.
 *
 * Product analytics (search/questions/rating/visit) are intentionally NOT
 * written to local files here. Azure Static Web Apps has ephemeral function
 * storage; durable analytics are sent through /api/events to the backend and
 * stored in Azure Table Storage.
 *
 * This middleware avoids request bodies so potentially sensitive legal queries
 * do not get duplicated into platform diagnostic logs.
 */
export default defineEventHandler((event) => {
  const startedAt = Date.now();
  const method = event.node.req.method ?? event.method;
  const url = event.node.req.url ?? "";

  event.node.res.once("finish", () => {
    const durationMs = Date.now() - startedAt;
    const status = event.node.res.statusCode;
    const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
    const message = `[http] ${method} ${url} ${status} ${durationMs}ms`;

    if (level === "error") console.error(message);
    else if (level === "warn") console.warn(message);
    else console.info(message);
  });
});
