/**
 * Background wake-up ping for the Container App.
 *
 * The recommender backend scales to zero. A cold search therefore pays for the
 * replica starting up *and* for the index loading lazily inside the first
 * request, which is where the ~30s first-search wait comes from.
 *
 * Hitting `GET /recommender/health` does two things: reaching the ingress at
 * all is what tells Azure to activate a replica, and the handler then kicks off
 * index loading on a background thread. So by the time the user has finished
 * typing, both halves of the cold start are usually already paid for.
 *
 * Contract with the browser: this endpoint NEVER throws and NEVER returns a
 * non-2xx status. The client fires it and forgets it, so a rejected promise
 * would surface as an unhandled rejection in the console for no benefit. Real
 * problems come back as `{ ok: false, reason }` for callers that care.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const backendBaseUrl = resolveBackendBaseUrl(event);

  if (!backendBaseUrl) {
    // Not fatal: search will report the same misconfiguration loudly. A warm-up
    // ping is an optimisation and must not be the thing that breaks a page.
    return { ok: false, reason: "backend-not-configured" as const };
  }

  const timeoutMs = Number(config.warmupTimeoutMs ?? 20000) || 20000;
  const startedAt = Date.now();

  try {
    const response = await $fetch<{
      status?: string;
      ready?: boolean;
      initialized?: boolean;
      warming?: boolean;
      warmup_seconds?: number | null;
      warmup_error?: string | null;
    }>(`${backendBaseUrl}/recommender/health`, {
      method: "GET",
      // A cold replica can take tens of seconds to answer. We still want to
      // hold the connection rather than give up early: the reply is how the
      // client learns the index is loaded and stops re-pinging.
      timeout: timeoutMs,
      retry: 0,
      headers: { "x-warmup": "1" },
    });

    return {
      ok: true,
      // `ready` is the backend's own flag; `initialized` is its older name.
      ready: Boolean(response?.ready ?? response?.initialized),
      warming: Boolean(response?.warming),
      warmupError: response?.warmup_error ?? null,
      elapsedMs: Date.now() - startedAt,
    };
  } catch (error) {
    // Timeouts are the expected case on a very cold container: the replica is
    // still starting, but the activation was already triggered by this request,
    // so the ping did its job even though we never saw a response.
    const reason =
      error instanceof Error && /abort|timeout/i.test(error.name + error.message)
        ? ("timeout" as const)
        : ("unreachable" as const);

    console.warn(
      `[warmup] backend ping ${reason} after ${Date.now() - startedAt}ms`
    );

    return { ok: false, reason, elapsedMs: Date.now() - startedAt };
  }
});
