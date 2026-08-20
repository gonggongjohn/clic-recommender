import { useRuntimeConfig } from "nuxt/app";
import {
  useQuestionState,
  useFilteredQuestionsState,
} from "@/composables/states";
import { type Question } from "#shared/types/types";

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
  }

  // merge topic translation into 1 string for easier management
  const concatTopicString = (q: Question) => {
    return q["detailed_info"][0]["topic"]
      .concat(",", q["detailed_info"][0]["simplified_chinese_topic"])
      .concat(",", q["detailed_info"][0]["traditional_chinese_topic"]);
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
  }

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

  // get all unique topic and sort them by Occurances
  const getUniqueTopicsSortByOccurances = (questions: Question[]) => {
    const uniqueTopicOccuranceMap = new Map();

    questions.forEach((q) => {
      const topic = concatTopicString(q)
      if (uniqueTopicOccuranceMap.has(topic)) {
        uniqueTopicOccuranceMap.set(
          topic,
          uniqueTopicOccuranceMap.get(topic) + 1
        );
      } else {
        uniqueTopicOccuranceMap.set(topic, 1);
      }
    });

    const topicsByOccurrences = Array.from(uniqueTopicOccuranceMap);
    topicsByOccurrences.sort((a, b) => b[1] - a[1]);
    const num: number = parseInt(config.public.MAX_TOPIC_NUM as string);
    return topicsByOccurrences.slice(0, num ? num : 5).map((topic) => topic[0]);
  };

  return {
    getTopic,
    getQuestionText,
    getScope,
    getUniqueTopicsSortByOccurances,
    updateFilteredQuestions,
  };
};
