// Live Financial Data Pipeline Orchestrator
// Coordinates adapters, background polling, deduplication, store updates, and fault isolation

import type { BaseAdapter, SourceHealthReport, ModelMarketContext } from './types.ts';
import { ForexFactoryAdapter } from './adapters/forexfactory.ts';
import { RealtimeNewsAdapter } from './adapters/realtime_news.ts';
import { InvestingAdapter } from './adapters/investing.ts';
import { MacroCalendarAdapter } from './adapters/macro_calendar.ts';
import { LiveDataStore } from './store.ts';
import { ModelContextBuilder } from './contextBuilder.ts';

export interface PipelineConfig {
  newsIntervalMs?: number;      // default: 60,000ms (1 min)
  calendarIntervalMs?: number;  // default: 180,000ms (3 mins)
  autoStart?: boolean;
}

export class LiveDataPipeline {
  private static instance: LiveDataPipeline | null = null;

  private adapters: Map<string, BaseAdapter> = new Map();
  private store: LiveDataStore;
  private isRunning = false;

  private newsTimer: NodeJS.Timeout | null = null;
  private calendarTimer: NodeJS.Timeout | null = null;

  private newsIntervalMs: number;
  private calendarIntervalMs: number;

  private constructor(config: PipelineConfig = {}) {
    this.store = LiveDataStore.getInstance();
    this.newsIntervalMs = config.newsIntervalMs ?? 60_000;
    this.calendarIntervalMs = config.calendarIntervalMs ?? 180_000;

    // Register all 4 data source adapters
    this.registerAdapter(new ForexFactoryAdapter());
    this.registerAdapter(new RealtimeNewsAdapter());
    this.registerAdapter(new InvestingAdapter());
    this.registerAdapter(new MacroCalendarAdapter());
  }

  static getInstance(config?: PipelineConfig): LiveDataPipeline {
    if (!LiveDataPipeline.instance) {
      LiveDataPipeline.instance = new LiveDataPipeline(config);
    }
    return LiveDataPipeline.instance;
  }

  registerAdapter(adapter: BaseAdapter) {
    this.adapters.set(adapter.id, adapter);
    this.store.updateSourceHealth(adapter.get_health_report());
    console.log(`[Pipeline] Registered data source adapter: ${adapter.name} (${adapter.id})`);
  }

  /**
   * Starts the background data synchronization engine
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log(`[Pipeline] Starting Live Financial Data Ingestion Engine...`);
    console.log(`[Pipeline] News interval: ${this.newsIntervalMs / 1000}s, Calendar interval: ${this.calendarIntervalMs / 1000}s`);

    // Immediate initial sync (sequential to avoid upstream burst limits)
    this.syncNews().then(() => this.syncCalendar());

    // Schedule background loops with non-blocking intervals
    this.newsTimer = setInterval(() => {
      this.syncNews();
    }, this.newsIntervalMs);

    this.calendarTimer = setInterval(() => {
      this.syncCalendar();
    }, this.calendarIntervalMs);
  }

  /**
   * Stops the background ingestion
   */
  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.newsTimer) {
      clearInterval(this.newsTimer);
      this.newsTimer = null;
    }
    if (this.calendarTimer) {
      clearInterval(this.calendarTimer);
      this.calendarTimer = null;
    }

    console.log(`[Pipeline] Live Financial Data Pipeline stopped`);
  }

  /**
   * Triggers an immediate manual sync across all sources
   */
  async forceSync(): Promise<{ newsCount: number; calendarCount: number }> {
    const newsRes = await this.syncNews();
    const calRes = await this.syncCalendar();
    return {
      newsCount: newsRes,
      calendarCount: calRes,
    };
  }

  /**
   * Syncs news from all registered adapters that provide news
   */
  async syncNews(): Promise<number> {
    const startTime = Date.now();
    let totalIngested = 0;

    for (const [id, adapter] of this.adapters.entries()) {
      try {
        const rawArticles = await adapter.fetch_latest_news();
        if (rawArticles && rawArticles.length > 0) {
          const stats = this.store.upsertArticles(rawArticles);
          totalIngested += stats.added + stats.updated;
          console.log(`[Pipeline:News] Ingested ${rawArticles.length} from ${adapter.id} (Added: ${stats.added}, Updated: ${stats.updated}, Deduped: ${stats.deduplicated})`);
        }
        this.store.updateSourceHealth(adapter.get_health_report());
      } catch (err: any) {
        console.warn(`[Pipeline:News] Error fetching from ${id}:`, err?.message || err);
        this.store.updateSourceHealth(adapter.get_health_report());
      }
    }

    return totalIngested;
  }

  /**
   * Syncs economic events from all registered adapters that provide calendar data
   */
  async syncCalendar(): Promise<number> {
    const startTime = Date.now();
    let totalIngested = 0;

    for (const [id, adapter] of this.adapters.entries()) {
      try {
        const rawEvents = await adapter.fetch_economic_events();
        if (rawEvents && rawEvents.length > 0) {
          const stats = this.store.upsertEvents(rawEvents);
          totalIngested += stats.added + stats.updated;
          console.log(`[Pipeline:Calendar] Ingested ${rawEvents.length} events from ${adapter.id} (Added: ${stats.added}, Updated: ${stats.updated})`);
        }
        this.store.updateSourceHealth(adapter.get_health_report());
      } catch (err: any) {
        console.warn(`[Pipeline:Calendar] Error fetching from ${id}:`, err?.message || err);
        this.store.updateSourceHealth(adapter.get_health_report());
      }
    }

    return totalIngested;
  }

  /**
   * Builds the live market context for a given trading asset
   */
  getContext(symbol: string): ModelMarketContext {
    return ModelContextBuilder.buildContext(symbol, this.store);
  }

  /**
   * Returns current health report of all data sources
   */
  getHealth(): SourceHealthReport[] {
    return this.store.getAllSourceHealth();
  }

  getStore(): LiveDataStore {
    return this.store;
  }
}
