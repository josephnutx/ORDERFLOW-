// High-Performance Indexed Live Data Store
// Provides indexed storage and querying for normalized financial news, economic events, and source health

import type {
  NormalizedNewsArticle,
  NormalizedEconomicEvent,
  SourceHealthReport,
  SourceHealthStatus,
  FreshnessLevel
} from './types.ts';
import { FreshnessEngine } from './freshness.ts';
import { DeduplicationEngine } from './deduplication.ts';
import { RelevanceEngine } from './relevance.ts';

export interface NewsQueryOptions {
  symbol?: string;
  currency?: string;
  breakingOnly?: boolean;
  highImpactOnly?: boolean;
  limit?: number;
  maxAgeMinutes?: number;
}

export interface CalendarQueryOptions {
  symbol?: string;
  currency?: string;
  status?: 'upcoming' | 'released' | 'all';
  highImpactOnly?: boolean;
  timeWindowHours?: number;
  limit?: number;
}

export class LiveDataStore {
  private static instance: LiveDataStore | null = null;

  // Primary tables
  private articles: Map<string, NormalizedNewsArticle> = new Map();
  private events: Map<string, NormalizedEconomicEvent> = new Map();
  private sourceHealth: Map<string, SourceHealthReport> = new Map();

  // Secondary indexes for sub-millisecond retrieval
  private articlesByCurrency: Map<string, Set<string>> = new Map();
  private articlesByAsset: Map<string, Set<string>> = new Map();
  private eventsByCurrency: Map<string, Set<string>> = new Map();

  // Metadata
  private lastNewsSync: string | null = null;
  private lastCalendarSync: string | null = null;

  private constructor() {}

  static getInstance(): LiveDataStore {
    if (!LiveDataStore.instance) {
      LiveDataStore.instance = new LiveDataStore();
    }
    return LiveDataStore.instance;
  }

  // ==========================================
  // NEWS INGESTION & QUERYING
  // ==========================================

  upsertArticles(incoming: NormalizedNewsArticle[]): { added: number; updated: number; deduplicated: number } {
    if (!incoming || incoming.length === 0) return { added: 0, updated: 0, deduplicated: 0 };

    const deduplicated = DeduplicationEngine.deduplicateNews(incoming);
    let added = 0;
    let updated = 0;

    for (const item of deduplicated) {
      const existing = this.articles.get(item.id);
      if (existing) {
        // Merge updates
        this.articles.set(item.id, {
          ...existing,
          ...item,
          sources: Array.from(new Set([...(existing.sources || []), ...(item.sources || [item.source])])),
          updated_at: new Date().toISOString(),
        });
        updated++;
      } else {
        this.articles.set(item.id, item);
        added++;

        // Index by currency
        for (const curr of item.currencies) {
          const upper = curr.toUpperCase();
          if (!this.articlesByCurrency.has(upper)) this.articlesByCurrency.set(upper, new Set());
          this.articlesByCurrency.get(upper)!.add(item.id);
        }

        // Index by asset
        for (const asset of item.assets) {
          const upper = asset.toUpperCase();
          if (!this.articlesByAsset.has(upper)) this.articlesByAsset.set(upper, new Set());
          this.articlesByAsset.get(upper)!.add(item.id);
        }
      }
    }

    // Keep store memory bounded (keep latest 300 articles)
    if (this.articles.size > 300) {
      const sortedIds = Array.from(this.articles.values())
        .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
        .map((a) => a.id);

      const toRemove = sortedIds.slice(300);
      for (const id of toRemove) {
        this.articles.delete(id);
      }
    }

    this.lastNewsSync = new Date().toISOString();
    return { added, updated, deduplicated: incoming.length - deduplicated.length };
  }

  getArticles(options: NewsQueryOptions = {}): NormalizedNewsArticle[] {
    const {
      symbol,
      currency,
      breakingOnly = false,
      highImpactOnly = false,
      limit = 20,
      maxAgeMinutes,
    } = options;

    let candidateArticles: NormalizedNewsArticle[];

    if (symbol) {
      // Use relevance engine
      candidateArticles = RelevanceEngine.filterAndRankNews(
        Array.from(this.articles.values()),
        symbol,
        limit * 2,
        0.15
      );
    } else if (currency) {
      const ids = this.articlesByCurrency.get(currency.toUpperCase()) || new Set();
      candidateArticles = Array.from(ids)
        .map((id) => this.articles.get(id))
        .filter((a): a is NormalizedNewsArticle => Boolean(a));
    } else {
      candidateArticles = Array.from(this.articles.values());
    }

    // Apply filters
    const now = Date.now();
    return candidateArticles
      .map((a) => {
        const fresh = FreshnessEngine.evaluate(a.published_at, now);
        return {
          ...a,
          freshness: fresh.level,
          age_minutes: fresh.ageMinutes,
        };
      })
      .filter((a) => {
        if (breakingOnly && !a.is_breaking) return false;
        if (highImpactOnly && a.importance !== 'high') return false;
        if (maxAgeMinutes !== undefined && (a.age_minutes ?? 999) > maxAgeMinutes) return false;
        return true;
      })
      .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
      .slice(0, limit);
  }

  // ==========================================
  // ECONOMIC CALENDAR INGESTION & QUERYING
  // ==========================================

  upsertEvents(incoming: NormalizedEconomicEvent[]): { added: number; updated: number } {
    if (!incoming || incoming.length === 0) return { added: 0, updated: 0 };

    const deduplicated = DeduplicationEngine.deduplicateEvents(incoming);
    let added = 0;
    let updated = 0;

    for (const ev of deduplicated) {
      const existing = this.events.get(ev.id);
      if (existing) {
        this.events.set(ev.id, {
          ...existing,
          ...ev,
          updated_at: new Date().toISOString(),
        });
        updated++;
      } else {
        this.events.set(ev.id, ev);
        added++;

        // Index by currency
        const curr = ev.currency.toUpperCase();
        if (!this.eventsByCurrency.has(curr)) this.eventsByCurrency.set(curr, new Set());
        this.eventsByCurrency.get(curr)!.add(ev.id);
      }
    }

    // Keep store bounded (keep max 400 events)
    if (this.events.size > 400) {
      const sortedIds = Array.from(this.events.values())
        .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
        .map((e) => e.id);

      const toRemove = sortedIds.slice(400);
      for (const id of toRemove) {
        this.events.delete(id);
      }
    }

    this.lastCalendarSync = new Date().toISOString();
    return { added, updated };
  }

  getEvents(options: CalendarQueryOptions = {}): NormalizedEconomicEvent[] {
    const {
      symbol,
      currency,
      status = 'all',
      highImpactOnly = false,
      timeWindowHours = 192,
      limit = 80,
    } = options;

    let candidateEvents: NormalizedEconomicEvent[];

    if (symbol) {
      candidateEvents = RelevanceEngine.filterEventsForAsset(
        Array.from(this.events.values()),
        symbol
      );
    } else if (currency) {
      const ids = this.eventsByCurrency.get(currency.toUpperCase()) || new Set();
      candidateEvents = Array.from(ids)
        .map((id) => this.events.get(id))
        .filter((e): e is NormalizedEconomicEvent => Boolean(e));
    } else {
      candidateEvents = Array.from(this.events.values());
    }

    const now = Date.now();
    const windowMs = timeWindowHours * 3600000;

    return candidateEvents
      .map((e) => {
        const scheduledTime = new Date(e.scheduled_at).getTime();
        const diffMin = Math.round((scheduledTime - now) / 60000);
        const fresh = FreshnessEngine.evaluate(e.scheduled_at, now);

        return {
          ...e,
          time_until_minutes: diffMin,
          freshness: fresh.level,
        };
      })
      .filter((e) => {
        const scheduledTime = new Date(e.scheduled_at).getTime();
        const diffMs = Math.abs(scheduledTime - now);
        if (diffMs > windowMs) return false;

        if (status === 'upcoming' && (e.time_until_minutes ?? 0) < 0) return false;
        if (status === 'released' && e.status !== 'released') return false;
        if (highImpactOnly && e.importance !== 'high') return false;

        return true;
      })
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
      .slice(0, limit);
  }

  // ==========================================
  // SOURCE HEALTH MONITORING
  // ==========================================

  updateSourceHealth(report: SourceHealthReport) {
    this.sourceHealth.set(report.source_id, report);
  }

  getAllSourceHealth(): SourceHealthReport[] {
    return Array.from(this.sourceHealth.values());
  }

  getOverallHealth(): SourceHealthStatus {
    const list = Array.from(this.sourceHealth.values());
    if (list.length === 0) return 'ONLINE';
    if (list.every((s) => s.status === 'ONLINE')) return 'ONLINE';
    if (list.every((s) => s.status === 'OFFLINE')) return 'OFFLINE';
    return 'DEGRADED';
  }

  getSyncMetadata() {
    return {
      lastNewsSync: this.lastNewsSync,
      lastCalendarSync: this.lastCalendarSync,
      totalArticlesStored: this.articles.size,
      totalEventsStored: this.events.size,
    };
  }
}
