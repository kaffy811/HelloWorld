export type Bar = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};
export type Price = {
  price: number;
  previous_close: number | null;
  change: number | null;
  change_percent: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  as_of: string;
  history_period_end: string | null;
  currency: string;
  feed: string;
  bars: Bar[];
  features: {
    return_5d: number | null;
    return_20d: number | null;
    ma20: number | null;
    volume_ratio20: number | null;
  };
};
export type Metric = {
  label: string;
  value: number;
  unit: string;
  tag: string;
  filed: string;
  form: string;
  accession: string;
  url: string;
};
export type Period = {
  frequency: "annual" | "quarter" | "year-to-date" | "instant";
  start: string | null;
  end: string;
  metrics: Record<string, Metric>;
};
export type Filing = {
  accession: string;
  form: string;
  date: string;
  period: string;
  title: string;
  url: string;
};
export type StockData = {
  ticker: string;
  kind: string;
  payload: { periods?: Period[]; filings?: Filing[] } & Partial<Price>;
  source: string;
  as_of: string;
  updated_at: string;
};
export type Article = {
  id: string;
  title: string;
  excerpt: string;
  source: string;
  source_url: string;
  category: string;
  topic?:string;
  sector?:string;
  tickers: string[];
  published_at: string;
  sec_news_id: string | null;
  analysis_id?: string;
};
export type Bookmark = {
  id: string;
  source_key: string;
  kind: string;
  text: string;
  explanation: string;
  source_url: string;
  ticker: string | null;
  provenance: string;
  created_at: string;
};
