import type { Question, SearchResults } from "#shared/types/types";

/**
 * A topic's identity across the UI is its three labels joined by commas
 * ("Tenancy,租務,租務"). Topic chips are compared by this string, so it has to be
 * produced identically everywhere.
 */
export const concatTopicString = (question: Question): string =>
  question["detailed_info"][0]["topic"]
    .concat(",", question["detailed_info"][0]["simplified_chinese_topic"])
    .concat(",", question["detailed_info"][0]["traditional_chinese_topic"]);

/**
 * Legacy ordering: count how many times each topic appears across every returned
 * question and take the most frequent.
 *
 * This ignores rank, so a topic with twenty weak matches at the bottom of the list
 * beats a topic with three excellent matches at the top. Kept only as a fallback for
 * backends that do not send `topics.ranked`.
 */
export const topicsByOccurrence = (
  questions: Question[],
  maxTopicNum: number
): string[] => {
  const occurrences = new Map<string, number>();

  for (const question of questions ?? []) {
    if (!question?.detailed_info?.[0]) continue;
    const topic = concatTopicString(question);
    occurrences.set(topic, (occurrences.get(topic) ?? 0) + 1);
  }

  return Array.from(occurrences)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTopicNum)
    .map((entry) => entry[0]);
};

/**
 * Topic chips in the backend's relevance order.
 *
 * The backend ranks topics by weighted presence in the retrieval pool and drops any
 * that fall below a relevance threshold, so its ordering is what should drive the UI.
 * Topics that no returned question actually carries are skipped, so selecting a chip
 * always yields at least one result.
 */
export const rankTopicsFromResults = (
  results: SearchResults,
  maxTopicNum: number
): string[] => {
  const questions = results?.questions ?? [];

  const availableByEnglish = new Map<string, string>();
  for (const question of questions) {
    const info = question?.detailed_info?.[0];
    if (!info) continue;
    if (!availableByEnglish.has(info.topic)) {
      availableByEnglish.set(info.topic, concatTopicString(question));
    }
  }

  const ranked = results?.topics?.ranked;
  if (ranked?.length) {
    const ordered: string[] = [];
    for (const entry of ranked) {
      const concatenated = availableByEnglish.get(entry.topic);
      if (concatenated && !ordered.includes(concatenated)) {
        ordered.push(concatenated);
      }
    }
    if (ordered.length) return ordered.slice(0, maxTopicNum);
  }

  return topicsByOccurrence(questions, maxTopicNum);
};

/** Page geometry for the step 3 result list. */
export const paginate = (total: number, perPage: number, page: number) => {
  const size = perPage > 0 ? perPage : 5;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, page), pageCount);
  const firstIndex = (current - 1) * size + 1;

  return {
    pageCount,
    page: current,
    firstIndex,
    from: total === 0 ? 0 : firstIndex,
    to: Math.min(firstIndex - 1 + size, total),
  };
};
