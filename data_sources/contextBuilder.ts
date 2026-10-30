// Model Context Builder
// Translates normalized financial news and economic events into a high-density, structured prompt context

import type { ModelMarketContext, NormalizedNewsArticle, NormalizedEconomicEvent, FreshnessLevel } from './types.ts';
import { LiveDataStore } from './store.ts';
import { FreshnessEngine } from './freshness.ts';
import { RelevanceEngine } from './relevance.ts';

export class ModelContextBuilder {
  /**
   * Builds the comprehensive ModelMarketContext for any given asset
   */
  static buildContext(symbol: string, store: LiveDataStore = LiveDataStore.getInstance()): ModelMarketContext {
    const symUpper = symbol.toUpperCase().trim();
    const generatedAt = new Date().toISOString();
    const nowMs = Date.now();

    // 1. Retrieve ranked news for this symbol
    const allRankedNews = store.getArticles({ symbol: symUpper, limit: 12 });
    const breakingNews = allRankedNews.filter((a) => a.is_breaking || a.age_minutes! <= 15).slice(0, 4);
    const latestNews = allRankedNews.filter((a) => !breakingNews.some((b) => b.id === a.id)).slice(0, 6);

    // 2. Retrieve calendar events (upcoming 24h & recent released 24h)
    const allEvents = store.getEvents({ symbol: symUpper, timeWindowHours: 24, limit: 20 });
    const upcomingEvents = allEvents.filter((e) => (e.time_until_minutes ?? 0) >= 0).slice(0, 8);
    const recentReleased = allEvents.filter((e) => e.status === 'released' && (e.time_until_minutes ?? 0) < 0).slice(0, 6);
    const highImpactEvents = allEvents.filter((e) => e.importance === 'high').slice(0, 6);

    // 3. Extract event surprises
    const eventSurprises = recentReleased
      .filter((e) => e.surprise && e.actual !== null && e.forecast !== null)
      .map((e) => ({
        event: e.event,
        currency: e.currency,
        actual: e.actual,
        forecast: e.forecast,
        surprise: e.surprise!.raw_surprise,
        interpretation: e.surprise!.interpretation,
      }));

    // 4. Compute data freshness
    const newsFreshnessLevels = allRankedNews.map((a) => a.freshness || 'STALE');
    const calendarFreshnessLevels = allEvents.map((e) => e.freshness || 'STALE');

    const newsFreshness = FreshnessEngine.aggregateFreshness(newsFreshnessLevels);
    const calendarFreshness = FreshnessEngine.aggregateFreshness(calendarFreshnessLevels);
    const overallFreshness = FreshnessEngine.aggregateFreshness([newsFreshness, calendarFreshness]);

    const syncMeta = store.getSyncMetadata();

    // 5. Source Attribution Summary
    const sourceMap = new Map<string, number>();
    for (const a of allRankedNews) {
      for (const s of a.sources || [a.source]) {
        sourceMap.set(s, (sourceMap.get(s) || 0) + 1);
      }
    }
    for (const e of allEvents) {
      sourceMap.set(e.source, (sourceMap.get(e.source) || 0) + 1);
    }

    const healthList = store.getAllSourceHealth();
    const sourceAttribution = Array.from(sourceMap.entries()).map(([source, items_count]) => {
      const h = healthList.find((x) => x.source_id === source);
      return {
        source,
        items_count,
        health: h ? h.status : 'ONLINE',
      };
    });

    // 6. Format Structured Context for AI Model Prompt
    const formattedPrompt = this.formatPromptString({
      symbol: symUpper,
      generatedAt,
      overallFreshness,
      newsFreshness,
      calendarFreshness,
      syncMeta,
      breakingNews,
      latestNews,
      upcomingEvents,
      recentReleased,
      eventSurprises,
      sourceAttribution,
    });

    return {
      asset: symUpper,
      generated_at: generatedAt,
      data_freshness: {
        news: newsFreshness,
        calendar: calendarFreshness,
        overall: overallFreshness,
        last_news_sync: syncMeta.lastNewsSync,
        last_calendar_sync: syncMeta.lastCalendarSync,
      },
      market_context: {
        breaking_news: breakingNews,
        latest_news: latestNews,
        economic_events_next_24h: upcomingEvents,
        recent_released_events: recentReleased,
        high_impact_events: highImpactEvents,
        event_surprises: eventSurprises,
      },
      source_attribution: sourceAttribution,
      formatted_prompt_context: formattedPrompt,
    };
  }

  private static formatPromptString(data: {
    symbol: string;
    generatedAt: string;
    overallFreshness: FreshnessLevel;
    newsFreshness: FreshnessLevel;
    calendarFreshness: FreshnessLevel;
    syncMeta: any;
    breakingNews: NormalizedNewsArticle[];
    latestNews: NormalizedNewsArticle[];
    upcomingEvents: NormalizedEconomicEvent[];
    recentReleased: NormalizedEconomicEvent[];
    eventSurprises: any[];
    sourceAttribution: any[];
  }): string {
    const lines: string[] = [];

    lines.push(`=== VERIFIED LIVE FINANCIAL DATA STREAM ===`);
    lines.push(`Target Asset: ${data.symbol}`);
    lines.push(`Context Generated: ${data.generatedAt} (UTC)`);
    lines.push(`Data Freshness: ${data.overallFreshness} (News: ${data.newsFreshness}, Calendar: ${data.calendarFreshness})`);
    lines.push(`Verified Data Sources: ${data.sourceAttribution.map((s) => `${s.source} (${s.health})`).join(', ') || 'ForexFactory, RealtimeNews, Investing.com, MacroCalendar'}`);
    lines.push(``);

    if (data.breakingNews.length > 0) {
      lines.push(`--- BREAKING FINANCIAL NEWS ---`);
      for (const n of data.breakingNews) {
        lines.push(`• [${n.source.toUpperCase()} | ${n.age_minutes}m ago | ${n.importance.toUpperCase()} IMPACT] ${n.title}`);
        lines.push(`  Summary: ${n.summary.slice(0, 200)}`);
        lines.push(`  Source URL: ${n.url}`);
      }
      lines.push(``);
    }

    if (data.latestNews.length > 0) {
      lines.push(`--- RELEVANT RECENT NEWS & CATALYSTS ---`);
      for (const n of data.latestNews) {
        lines.push(`• [${n.source.toUpperCase()} | ${n.age_minutes}m ago | Sentiment: ${n.sentiment || 'NEUTRAL'}] ${n.title}`);
        lines.push(`  Context: ${n.summary.slice(0, 180)}`);
        lines.push(`  Source URL: ${n.url}`);
      }
      lines.push(``);
    }

    if (data.upcomingEvents.length > 0) {
      lines.push(`--- UPCOMING ECONOMIC EVENTS (NEXT 24H) ---`);
      for (const e of data.upcomingEvents) {
        const timeStr = (e.time_until_minutes ?? 0) > 0 ? `in ${e.time_until_minutes} mins` : 'imminent';
        lines.push(`• [${e.source.toUpperCase()} | ${e.importance.toUpperCase()} | ${timeStr}] ${e.currency} ${e.event} (Forecast: ${e.forecast ?? 'N/A'}, Previous: ${e.previous ?? 'N/A'})`);
      }
      lines.push(``);
    }

    if (data.recentReleased.length > 0) {
      lines.push(`--- RECENT ECONOMIC RELEASES & SURPRISES ---`);
      for (const r of data.recentReleased) {
        const surpriseText = r.surprise && r.surprise.raw_surprise !== null
          ? `| Surprise: ${r.surprise.raw_surprise > 0 ? '+' : ''}${r.surprise.raw_surprise} (${r.surprise.interpretation})`
          : '';
        lines.push(`• [${r.source.toUpperCase()}] ${r.currency} ${r.event}: Printed Actual: ${r.actual} (Forecast: ${r.forecast ?? 'N/A'}, Prior: ${r.previous ?? 'N/A'}) ${surpriseText}`);
      }
      lines.push(``);
    }

    lines.push(`=== END LIVE FINANCIAL STREAM ===`);
    return lines.join('\n');
  }
}
