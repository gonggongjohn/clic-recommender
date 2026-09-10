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
 * `x-azure-clientip` is added by Front Door and is the most trustworthy of the
 * three because the platform sets it rather than passing it through. The
 * left-most `x-forwarded-for` entry is the standard fallback.
 */
export const resolveClientIp = (event: H3Event): string => {
  const headers = getRequestHeaders(event);

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
    if (incoming["x-forwarded-for"]) {
      headers["X-Forwarded-For"] = String(incoming["x-forwarded-for"]);
    }
    // Client Hints: the only route to a phone's model name on Android.
    for (const hint of ["sec-ch-ua-platform", "sec-ch-ua-model", "sec-ch-ua-mobile"]) {
      if (incoming[hint]) headers[hint] = String(incoming[hint]);
    }
  }

  return headers;
};
