import { createHash, timingSafeEqual } from "node:crypto";
import type { H3Event } from "h3";

/**
 * Site identity and client-origin forwarding.
 *
 * Both Static Web Apps run this same codebase; the only thing that separates
 * them is `SITE_ID` in the app settings. That is deliberate — forking the repo
 * for the course site would mean every future content change has to be made
 * and deployed twice, and the two copies would drift.
 *
 *   original SWA -> SITE_ID unset (or "main")  -> RecommenderEvents
 *   course   SWA -> SITE_ID=course             -> RecommenderEventsCourse
 *
 * The IP problem this solves
 * --------------------------
 * The browser talks to the Static Web App, and the SWA managed function talks
 * to the Container App. From the Flask app's point of view the caller is the
 * SWA's egress address, not the visitor. Every row would carry the same
 * handful of Azure IPs. So the visitor's address is read here, at the hop that
 * still knows it, and passed on explicitly in `X-Client-IP`.
 *
 * ...and the second hop, once there is a reverse proxy
 * ----------------------------------------------------
 * Visitors reach the course site through a shared domain, so the chain is
 *
 *   visitor -> Apache (the shared domain) -> Azure edge -> this function
 *
 * Azure sets `x-azure-clientip` itself, which is why it is trusted above
 * anything forwarded - but it names the peer Azure saw, and that is now Apache.
 * Preferring it would stamp every visit from the domain with the proxy's
 * address. The proxy therefore states the address it saw in `X-Edge-Client-IP`
 * and proves it is really ours with `X-Edge-Proxy-Key`; a request that carries
 * the right key gets its stated address believed, ahead of the Azure header.
 *
 * The key matters because `X-Edge-Client-IP` is otherwise trivially spoofable:
 * anyone can send it straight to *.azurestaticapps.net and choose what the
 * analytics record. Without `EDGE_PROXY_KEY` configured the header is ignored
 * altogether, so direct access behaves exactly as it did before.
 */

/** Site slug for this deployment. Must match a key in the backend's LOG_SITE_TABLES. */
export const resolveSiteId = (event: H3Event): string => {
  const config = useRuntimeConfig(event);
  const raw =
    process.env.NUXT_SITE_ID ??
    process.env.SITE_ID ??
    (config.siteId as string | undefined) ??
    "main";

  const slug = String(raw).trim().toLowerCase();
  // The backend rejects anything outside this alphabet, because the value ends
  // up inside an Azure Table PartitionKey. Fail soft rather than send garbage.
  return /^[a-z0-9_-]{1,64}$/.test(slug) ? slug : "main";
};

/** Shared secret that lets the backend trust our forwarded IP header. */
export const resolveIngestKey = (event: H3Event): string => {
  const config = useRuntimeConfig(event);
  return String(
    process.env.NUXT_ANALYTICS_INGEST_KEY ??
      process.env.ANALYTICS_INGEST_KEY ??
      (config.analyticsIngestKey as string | undefined) ??
      ""
  ).trim();
};

/** Shared secret proving a request really arrived through our own edge proxy. */
export const resolveEdgeProxyKey = (event: H3Event): string => {
  const config = useRuntimeConfig(event);
  return String(
    process.env.NUXT_EDGE_PROXY_KEY ??
      process.env.EDGE_PROXY_KEY ??
      (config.edgeProxyKey as string | undefined) ??
      ""
  ).trim();
};

/** Header the proxy signs itself with, and the address it reports. */
const EDGE_KEY_HEADER = "x-edge-proxy-key";
const EDGE_IP_HEADER = "x-edge-client-ip";

/**
 * Compare via SHA-256 digests: `timingSafeEqual` throws on a length mismatch,
 * and comparing the digests instead keeps both the timing and the length of the
 * configured key out of the answer.
 */
const secretsMatch = (a: string, b: string): boolean => {
  if (!a || !b) return false;

  return timingSafeEqual(
    createHash("sha256").update(a).digest(),
    createHash("sha256").update(b).digest()
  );
};

/**
 * Did this request come through our reverse proxy?
 *
 * False whenever no key is configured, which is the safe default: the site is
 * also reachable directly on its *.azurestaticapps.net hostname, and that path
 * has no proxy to trust.
 */
export const isTrustedEdge = (event: H3Event): boolean => {
  const expected = resolveEdgeProxyKey(event);
  if (!expected) return false;

  const presented = String(
    getRequestHeaders(event)[EDGE_KEY_HEADER] ?? ""
  ).trim();

  return secretsMatch(expected, presented);
};

/**
 * Strip a trailing source port and reject anything that is not an address.
 *
 * Azure Front Door writes `1.2.3.4:52194` into X-Forwarded-For, and a bare
 * IPv6 address contains colons of its own, so the two cases have to be told
 * apart before the port is removed.
 */
const cleanIp = (value: string | undefined | null): string => {
  let candidate = (value ?? "").trim();
  if (!candidate) return "";

  if (candidate.startsWith("[")) {
    const closing = candidate.indexOf("]");
    if (closing !== -1) candidate = candidate.slice(1, closing);
  } else if ((candidate.match(/:/g) ?? []).length === 1) {
    candidate = candidate.split(":")[0] ?? "";
  }

  const isIpv4 =
    /^(\d{1,3}\.){3}\d{1,3}$/.test(candidate) &&
    candidate.split(".").every((part) => Number(part) <= 255);
  const isIpv6 = /^[0-9a-f:]+$/i.test(candidate) && candidate.includes(":");

  return isIpv4 || isIpv6 ? candidate : "";
};

/**
 * The visitor's address, best source first.
 *
 * Our own proxy comes first, but only when it authenticated itself, because it
 * is the only hop that still sees the visitor once the shared domain is in the
 * path. After that `x-azure-clientip` is the most trustworthy, being set by the
 * platform rather than passed through, and the left-most `x-forwarded-for`
 * entry is the standard fallback.
 */
export const resolveClientIp = (event: H3Event): string => {
  const headers = getRequestHeaders(event);

  if (isTrustedEdge(event)) {
    const edgeIp = cleanIp(headers[EDGE_IP_HEADER]);
    if (edgeIp) return edgeIp;

    // The proxy vouched for the request but did not name an address (an older
    // vhost, say). Its X-Forwarded-For entry is the next best thing, and is
    // still first-hand, unlike the Azure header below.
    const edgeForwarded = cleanIp(
      String(headers["x-forwarded-for"] ?? "").split(",")[0]
    );
    if (edgeForwarded) return edgeForwarded;
  }

  const azureClientIp = cleanIp(headers["x-azure-clientip"]);
  if (azureClientIp) return azureClientIp;

  const forwardedFor = headers["x-forwarded-for"];
  if (forwardedFor) {
    const first = cleanIp(String(forwardedFor).split(",")[0]);
    if (first) return first;
  }

  const socketIp = cleanIp(headers["x-azure-socketip"]);
  if (socketIp) return socketIp;

  return cleanIp(getRequestIP(event, { xForwardedFor: true }) ?? "");
};

/**
 * The incoming X-Forwarded-For chain with `clientIp` guaranteed at the front.
 *
 * Nothing is dropped: the rest of the chain is still useful for debugging which
 * hops a request took. Duplicating the address when it is already first would
 * only make the chain look like an extra hop, so that case is left alone.
 */
const buildForwardedFor = (event: H3Event, clientIp: string): string => {
  const incoming = String(
    getRequestHeaders(event)["x-forwarded-for"] ?? ""
  ).trim();

  if (!clientIp) return incoming;

  const chain = incoming
    ? incoming
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];

  if (chain.length > 0 && cleanIp(chain[0]) === clientIp) {
    return chain.join(", ");
  }

  return [clientIp, ...chain].join(", ");
};

/**
 * Headers added to every backend call so a request can be attributed without
 * inspecting its body.
 *
 * `withClientContext` is opt-in per route: only the analytics ingest route has
 * any business forwarding the visitor's address, and search queries should not
 * carry it at all.
 */
export const buildBackendHeaders = (
  event: H3Event,
  options: { withClientContext?: boolean } = {}
): Record<string, string> => {
  const headers: Record<string, string> = {
    "X-Site-Id": resolveSiteId(event),
  };

  const ingestKey = resolveIngestKey(event);
  if (ingestKey) headers["X-Analytics-Key"] = ingestKey;

  if (options.withClientContext) {
    const clientIp = resolveClientIp(event);
    if (clientIp) headers["X-Client-IP"] = clientIp;

    const incoming = getRequestHeaders(event);

    // Forwarded verbatim so the backend derives OS/browser/device from the
    // real header rather than from anything the page script chose to report.
    if (incoming["user-agent"]) headers["User-Agent"] = String(incoming["user-agent"]);
    if (incoming["accept-language"]) {
      headers["Accept-Language"] = String(incoming["accept-language"]);
    }
    // The chain as it arrived, with the visitor guaranteed to be the left-most
    // entry. Behind the proxy the incoming chain starts at Apache (or at the
    // Azure edge), so a backend that reads position 0 - as most do - would
    // otherwise attribute the request to infrastructure.
    const forwardedFor = buildForwardedFor(event, clientIp);
    if (forwardedFor) headers["X-Forwarded-For"] = forwardedFor;
    // Client Hints: the only route to a phone's model name on Android.
    for (const hint of ["sec-ch-ua-platform", "sec-ch-ua-model", "sec-ch-ua-mobile"]) {
      if (incoming[hint]) headers[hint] = String(incoming[hint]);
    }
  }

  return headers;
};