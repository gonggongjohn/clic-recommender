import { useRuntimeConfig } from "nuxt/app";
import {
  useQuestionState,
  useFilteredQuestionsState,
} from "@/composables/states";
import type { Question, SearchResults } from "#shared/types/types";
import {
  concatTopicString,
  rankTopicsFromResults,
  topicsByOccurrence,
} from "#shared/utils/topics";

export const useClic = () => {
  // utility
  const { locale } = useI18n();
  const config = useRuntimeConfig();

  // states
  const questions = useQuestionState();
  const filteredQuestions = useFilteredQuestionsState();

  // get topic based on locale
  const getTopic = (question: Question) => {
    if (locale.value === "ZH-HK")
      return question["detailed_info"][0]["traditional_chinese_topic"];
    else if (locale.value === "ZH-CN")
      return question["detailed_info"][0]["simplified_chinese_topic"];
    else return question["detailed_info"][0]["topic"];
  };

  // get question text by locale
  const getQuestionText = (question: Question) => {
    if (locale.value === "ZH-HK")
      return question["detailed_info"][0]["traditional_chinese_question"];
    else if (locale.value === "ZH-CN")
      return question["detailed_info"][0]["simplified_chinese_question"];
    else return question["q_text"];
  };

  // get scope text by locale
  const getScope = (question: Question) => {
    if (locale.value === "ZH-HK")
      return question["detailed_info"][0]["traditional_chinese_scope"];
    else if (locale.value === "ZH-CN")
      return question["detailed_info"][0]["simplified_chinese_scope"];
    else return question["detailed_info"][0]["scope_text"];
  };

  // filter questions with the selected topics
  const updateFilteredQuestions = (selectedTopics: string[]) => {
    filteredQuestions.value = questions.value
      .filter((question: Question) => {
        if (selectedTopics.includes(concatTopicString(question))) {
          return question;
        }
      })
      .sort((a: Question, b: Question) => {
        return a!.index - b!.index;
      });
  };

  const maxTopicNum = () => {
    const num: number = parseInt(config.public.MAX_TOPIC_NUM as string);
    return Number.isFinite(num) && num > 0 ? num : 5;
  };

  /**
   * Topic chips, most relevant first. See #shared/utils/topics for the reasoning.
   */
  const getRankedTopics = (results: SearchResults) =>
    rankTopicsFromResults(results, maxTopicNum());

  /** Legacy occurrence ordering, retained for backends without `topics.ranked`. */
  const getUniqueTopicsSortByOccurances = (questions: Question[]) =>
    topicsByOccurrence(questions, maxTopicNum());

  return {
    getTopic,
    getQuestionText,
    getScope,
    getRankedTopics,
    getUniqueTopicsSortByOccurances,
    updateFilteredQuestions,
  };
};
