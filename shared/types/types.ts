export interface Info {
  answer: string;
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

export interface SearchResponse {
  results: {
    questions: Question[];
    [key: string]: unknown;
  };
}
