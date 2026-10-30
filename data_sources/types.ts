// Normalized Financial Data Types & Adapter Interfaces

export type FreshnessLevel = 'VERY_FRESH' | 'FRESH' | 'RECENT' | 'OLD' | 'STALE';
export type SourceHealthStatus = 'ONLINE' | 'DEGRADED' | 'OFFLINE';
export type EventStatus = 'upcoming' | 'released' | 'cancelled' | 'unknown';
export type ImportanceLevel = 'low' | 'medium' | 'high' | 'unknown';
export type MarketSentiment = 'bullish' | 'bearish' | 'neutral' | 'volatile' | null;

export interface NormalizedNewsArticle {
  id: string;
  canonical_id?: string;
  source: string; // e.g. 'forexfactory' | 'realtime_news' | 'investing'
  sources?: string[]; // Merged sources if deduplicated
  title: string;
  summary: string;
  url: string;
  published_at: string; // ISO UTC format
  fetched_at: string;   // ISO UTC format
  updated_at: string;   // ISO UTC format
  currencies: string[];
  countries: string[];
  assets: string[];
  importance: ImportanceLevel;
  category: string;
  sentiment: MarketSentiment;
  relevance_score: number | null; // 0.0 - 1.0 (derived)
  is_breaking?: boolean;
  freshness?: FreshnessLevel;
  age_minutes?: number;
}

export interface NormalizedEconomicEvent {
  id: string;
  source: string; // e.g. 'forexfactory' | 'macro_calendar' | 'investing'
  event: string;
  country: string;
  currency: string;
  scheduled_at: string; // ISO UTC format
  importance: ImportanceLevel;
  forecast: string | number | null;
  previous: string | number | null;
  actual: string | number | null;
  status: EventStatus;
  surprise: {
    raw_surprise: number | null;
    interpretation: 'BULLISH' | 'BEARISH' | 'IN_LINE' | 'UNINTERPRETED';
    percentage_deviation?: number | null;
    unit?: string;
  } | null;
  unit?: string;
  fetched_at: string;   // ISO UTC format
  updated_at: string;   // ISO UTC format
  freshness?: FreshnessLevel;
  time_until_minutes?: number;
}

export interface SourceHealthReport {
  source_id: string;
  source_name: string;
  status: SourceHealthStatus;
  last_success_at: string | null;
  last_attempt_at: string | null;
  last_error: string | null;
  consecutive_failures: number;
  total_records_ingested: number;
  avg_latency_ms: number;
}

export interface ModelMarketContext {
  asset: string;
  generated_at: string;
  data_freshness: {
    news: FreshnessLevel;
    calendar: FreshnessLevel;
    overall: FreshnessLevel;
    last_news_sync: string | null;
    last_calendar_sync: string | null;
  };
  market_context: {
    breaking_news: NormalizedNewsArticle[];
    latest_news: NormalizedNewsArticle[];
    economic_events_next_24h: NormalizedEconomicEvent[];
    recent_released_events: NormalizedEconomicEvent[];
    high_impact_events: NormalizedEconomicEvent[];
    event_surprises: Array<{
      event: string;
      currency: string;
      actual: string | number | null;
      forecast: string | number | null;
      surprise: number | null;
      interpretation: string;
    }>;
  };
  source_attribution: Array<{
    source: string;
    items_count: number;
    health: SourceHealthStatus;
  }>;
  formatted_prompt_context: string;
}

export interface BaseAdapter {
  readonly id: string;
  readonly name: string;
  fetch_latest_news(): Promise<NormalizedNewsArticle[]>;
  fetch_economic_events(): Promise<NormalizedEconomicEvent[]>;
  fetch_market_data?(): Promise<any>;
  health_check(): Promise<SourceHealthStatus>;
  get_health_report(): SourceHealthReport;
}
