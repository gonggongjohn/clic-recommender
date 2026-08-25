import { useState } from "nuxt/app";
import type { Question } from "#shared/types/types";

// current state of unique topics
export const useTopicState = () => useState<string[]>("topics", () => [])

// search query string state in the input text area
export const useSearchQueryState = () => useState<string>("searchQuery", () => "")

// all avaiable question sate returned from backend
export const useQuestionState = () => useState<Question[]>("questions", () => [])

// all questions filtered by selected topics
export const useFilteredQuestionsState = () => useState<Question[]>("filteredQuestions", () => [])

// Random browser-session correlation ID used only for product analytics.
export const useSessionIdState = () => useState<string>("sessionId", () => "")

// Correlation ID for the currently submitted search. A fresh value is created
// for every search so later topic/rating/visit events can be joined reliably.
export const useSearchIdState = () => useState<string>("searchId", () => "")
