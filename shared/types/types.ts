export interface Info {
  answer: string;
  q_id: string;
  scope_q_score?: number;
  q_score?: number;
  method: string;
  page: string | number;
  page_url: string;
  scope_text: string;
  simplified_chinese_scope: string;
  traditional_chinese_scope: string;
  simplified_chinese_question: string;
  traditional_chinese_question: string;
  topic: string;
  simplified_chinese_topic: string;
  traditional_chinese_topic: string;
}

export interface Question {
  detailed_info: Info[];
  index: number;
  q_text: string;
  real_index?: number[];
}

/**
 * One entry of `results.topics.ranked`, ordered by relevance to the query.
 * `primary` marks the topics that cleared the backend's relevance threshold;
 * the rest were pulled in through group.csv topic grouping.
 */
export interface RankedTopic {
  topic: string;
  simplified_chinese_topic: string;
  traditional_chinese_topic: string;
  count: number;
  score: number;
  primary: boolean;
}

export interface Topics {
  raw: Record<string, number>;
  "top-ranked": string[];
  filtered: string[];
  /** Added by the backend alongside the legacy fields; older backends omit it. */
  ranked?: RankedTopic[];
}

export interface Rating {
  search: string;
  question: string;
  topic: string;
  content: string;
  rating: number;
}

export interface Feedback {
  sender: string;
  body: string;
}

export interface SearchResults {
  key: string;
  approach: string | null;
  questions: Question[];
  topics?: Topics;
}

export interface SearchResponse {
  results: SearchResults;
}
