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