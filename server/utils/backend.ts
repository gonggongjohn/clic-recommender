import type { H3Event } from "h3";

/**
 * Resolve the Container App base URL.
 *
 * Same precedence the existing /api routes use (NUXT_BACKEND, then BACKEND,
 * then runtimeConfig), pulled into one place so the warm-up route cannot drift
 * away from the search route and end up pinging a different host than the one
 * the real search will hit — which would defeat the whole point of warming.
 */
export const resolveBackendBaseUrl = (event: H3Event): string | null => {
  const config = useRuntimeConfig(event);
  const backend =
    process.env.NUXT_BACKEND ?? process.env.BACKEND ?? config.backend;

  if (!backend) return null;

  return /^https?:\/\//i.test(backend) ? backend : `http://${backend}`;
};
