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

      await $fetch("/api/events", {
        method: "POST",
        body: {
          schema_version: 1,
          event_id: newId(),
          occurred_at: new Date().toISOString(),
          session_id: sid,
          search_id: srid,
          locale: locale.value,
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
