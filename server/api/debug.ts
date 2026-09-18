/**
 * TEMPORARY diagnostic endpoint - delete once the routing is fixed.
 *
 * Answers on <baseURL>api/_debug and reports what the Nitro function actually
 * received. Everything interesting about the Static Web Apps routing is in the
 * difference between `path` and `originalUrl`:
 *
 *   path        what h3 matched on. Must start with `baseURL` for the handler
 *               to be reachable at all.
 *   originalUrl the `x-ms-original-url` header. Present => the request arrived
 *               through a REWRITE (navigationFallback or a `routes` rule) and
 *               Nitro reconstructed the path from it. Absent => the request
 *               came in on the reserved /api/* prefix directly.
 *   baseURL     what this build was compiled with. If it does not match the
 *               prefix in the URL you typed, the build read the wrong SITE_ID.
 *
 * No method suffix on the filename, so it answers on every verb - which is the
 * point: compare GET and POST.
 */
export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event);

  return {
    path: event.path,
    method: event.method,
    baseURL: (config.app as { baseURL?: string })?.baseURL ?? null,
    siteId: config.siteId ?? null,
    originalUrl: getHeader(event, "x-ms-original-url") ?? null,

    // Client-origin forwarding. Through the proxy `trustedEdge` must be true
    // and `clientIp` must be YOUR address, not the proxy's; on the
    // *.azurestaticapps.net hostname `trustedEdge` is false and `clientIp`
    // falls back to Azure's own header.
    clientIp: resolveClientIp(event),
    trustedEdge: isTrustedEdge(event),
    edgeClientIpHeader: getHeader(event, "x-edge-client-ip") ?? null,
    azureClientIpHeader: getHeader(event, "x-azure-clientip") ?? null,
    forwardedFor: getHeader(event, "x-forwarded-for") ?? null,
  };
});