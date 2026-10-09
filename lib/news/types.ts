export type Company = {
  ticker: string;
  name: string;
  sector: string;
  summary: string;
  learning_question: string;
  source_url: string;
  cik?: string | null;
  market?: string;
};
export type Evidence = {
  id: string;
  label: string;
  url: string | null;
  text: string;
};
export type Claim = { text: string; evidence_ids: string[] };
export type AnalysisContent = {
  headline: string;
  summary: string;
  sentiment: "positive" | "negative" | "mixed" | "unknown";
  facts: Claim[];
  impact: Claim[];
  upside: Claim[];
  downside: Claim[];
  unknowns: string[];
  terms: { term: string; definition: string }[];
  next_questions: string[];
};
export type Analysis = {
  id: string;
  ticker: string;
  news_id: string | null;
  owner_id: string | null;
  kind: "news" | "material" | "followup";
  parent_id: string | null;
  content: AnalysisContent;
  evidence: Evidence[];
  is_public: boolean;
  created_at: string;
  data_as_of: string;
  language: string;
};
export type Rating = {
  analysis_id: string;
  value: number;
  reason: string | null;
};
