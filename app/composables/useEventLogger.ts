import { useSearchIdState, useSessionIdState } from "@/composables/states";

export type RecommenderEventType = "search" | "questions" | "rating" | "visit";

interface BaseEvent {
  event_type: RecommenderEventType;
  query: string;
}

export interface SearchEvent extends BaseEvent {
  event_type: "search";
}

export interface QuestionsEvent extends BaseEvent {
  event_type: "questions";
  topics: string[];
  question_ids: string[];
}

export interface RatingEvent extends BaseEvent {
  event_type: "rating";
  question_id: string;
  question: string;
  rating: number;
}

export interface VisitEvent extends BaseEvent {
  event_type: "visit";
  question_id: string;
  clic_page: string;
}

export type RecommenderEvent =
  | SearchEvent
  | QuestionsEvent
  | RatingEvent
  | VisitEvent;

const SESSION_STORAGE_KEY = "clic-recommender-session-id";

const newId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  // randomUUID is available in all currently supported Azure SWA browsers;
  // this fallback keeps logging functional in older clients as well.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random()
    .toString(36)
    .slice(2)}`;
};

export const useEventLogger = () => {
  const sessionId = useSessionIdState();
  const searchId = useSearchIdState();
  const { locale } = useI18n();
  const runtimeConfig = useRuntimeConfig();
  const { collect: collectDeviceInfo } = useDeviceInfo();

  /**
   * Whether this deployment attaches a device profile to its events.
   *
   * Off by default, so the original Static Web App keeps sending exactly what
   * it sent before. The course site turns it on with
   * NUXT_PUBLIC_DEVICE_TELEMETRY_ENABLED=true.
   *
   * This only controls the browser-reported half. The IP and User-Agent are
   * captured server-side, and the backend decides per site whether to store
   * either — so nothing is recorded just because a flag was set here.
   */
  const deviceTelemetryEnabled =
    String(runtimeConfig.public?.DEVICE_TELEMETRY_ENABLED ?? "false").toLowerCase() ===
    "true";

  const ensureSessionId = () => {
    if (sessionId.value) return sessionId.value;

    if (import.meta.client) {
      const existing = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (existing) {
        sessionId.value = existing;
        return existing;
      }
    }

    const id = newId();
    sessionId.value = id;

    if (import.meta.client) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, id);
    }

    return id;
  };

  const startSearch = () => {
    ensureSessionId();
    const id = newId();
    searchId.value = id;
    return id;
  };

  /**
   * Product analytics must never interrupt the recommendation flow.
   * The backend performs durable persistence; this client helper deliberately
   * converts logging errors to console warnings rather than throwing.
   */
  const logEvent = async (event: RecommenderEvent) => {
    try {
      const sid = ensureSessionId();
      const srid = searchId.value || startSearch();

      // Collected per event rather than once, so a rotated device, a resized
      // window or a change of network shows up in the data instead of being
      // frozen at whatever the first page load happened to see.
      const device =
        deviceTelemetryEnabled && import.meta.client ? collectDeviceInfo() : null;

      await $fetch("/api/events", {
        method: "POST",
        body: {
          schema_version: 1,
          event_id: newId(),
          occurred_at: new Date().toISOString(),
          session_id: sid,
          search_id: srid,
          locale: locale.value,
          // Advisory only. The server route overwrites site_id with the value
          // from this deployment's own settings before forwarding.
          site_id: runtimeConfig.public?.SITE_ID ?? "main",
          ...(device ? { device } : {}),
          ...event,
        },
      });
    } catch (error) {
      console.warn("Recommender event logging failed", error);
    }
  };

  return {
    logEvent,
    startSearch,
    ensureSessionId,
  };
};
