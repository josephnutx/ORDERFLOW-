// Comprehensive Test Suite for Live Financial Data Pipeline
// Tests all 4 data adapters, normalization, deduplication, freshness, relevance, event surprise, and context building

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  FreshnessEngine,
  DeduplicationEngine,
  RelevanceEngine,
  LiveDataStore,
  ModelContextBuilder,
  LiveDataPipeline,
  ForexFactoryAdapter,
  RealtimeNewsAdapter,
  InvestingAdapter,
  MacroCalendarAdapter,
  NormalizedNewsArticle,
  NormalizedEconomicEvent,
} from '../data_sources';

describe('1. Freshness Detection & Timestamps', () => {
  test('categorizes 1 minute old timestamp as VERY_FRESH', () => {
    const oneMinAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const result = FreshnessEngine.evaluate(oneMinAgo);
    assert.equal(result.level, 'VERY_FRESH');
    assert.equal(result.isLive, true);
    assert.equal(result.isStale, false);
    assert.equal(result.ageMinutes, 1);
  });

  test('categorizes 5 minutes old timestamp as FRESH', () => {
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const result = FreshnessEngine.evaluate(fiveMinsAgo);
    assert.equal(result.level, 'FRESH');
    assert.equal(result.isLive, true);
    assert.equal(result.isStale, false);
  });

  test('categorizes 20 minutes old timestamp as RECENT', () => {
    const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    const result = FreshnessEngine.evaluate(twentyMinsAgo);
    assert.equal(result.level, 'RECENT');
    assert.equal(result.isLive, false);
    assert.equal(result.isStale, false);
  });

  test('categorizes 60 minutes old timestamp as OLD', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const result = FreshnessEngine.evaluate(oneHourAgo);
    assert.equal(result.level, 'OLD');
    assert.equal(result.isStale, false);
  });

  test('categorizes 180 minutes old timestamp as STALE', () => {
    const threeHoursAgo = new Date(Date.now() - 180 * 60 * 1000).toISOString();
    const result = FreshnessEngine.evaluate(threeHoursAgo);
    assert.equal(result.level, 'STALE');
    assert.equal(result.isStale, true);
    assert.equal(result.isLive, false);
  });

  test('handles malformed timestamp gracefully as STALE', () => {
    const result = FreshnessEngine.evaluate('invalid-date-string');
    assert.equal(result.level, 'STALE');
    assert.equal(result.isStale, true);
  });

  test('aggregates multiple freshness levels correctly', () => {
    assert.equal(FreshnessEngine.aggregateFreshness(['VERY_FRESH', 'OLD']), 'VERY_FRESH');
    assert.equal(FreshnessEngine.aggregateFreshness(['RECENT', 'OLD']), 'RECENT');
    assert.equal(FreshnessEngine.aggregateFreshness(['STALE', 'STALE']), 'STALE');
  });
});

describe('2. Deduplication Engine', () => {
  test('normalizes headlines correctly', () => {
    const raw = "BREAKING: Fed's Powell Signals Rate Pause in 2026!!!";
    const norm = DeduplicationEngine.normalizeHeadline(raw);
    assert.equal(norm, 'breaking fed s powell signals rate pause in 2026');
  });

  test('calculates headline similarity between identical and near-identical titles', () => {
    const t1 = "Fed's Powell Signals Data-Dependent Path Ahead";
    const t2 = "Fed Chairman Powell Signals Data-Dependent Rate Path";
    const sim = DeduplicationEngine.calculateSimilarity(t1, t2);
    assert.ok(sim > 0.5, `Expected similarity > 0.5, got ${sim}`);

    const unrelated = "Gold prices surge amid geopolitical safe haven buying";
    const simUnrelated = DeduplicationEngine.calculateSimilarity(t1, unrelated);
    assert.ok(simUnrelated < 0.2, `Expected low similarity, got ${simUnrelated}`);
  });

  test('deduplicates and merges news across sources', () => {
    const now = new Date().toISOString();
    const articles: NormalizedNewsArticle[] = [
      {
        id: 'news-1',
        source: 'realtime_news',
        title: 'Fed Powell Says Policy Restrictive Until Inflation Hits Target',
        summary: 'Short wire summary from Bloomberg.',
        url: 'https://news.com/1',
        published_at: now,
        fetched_at: now,
        updated_at: now,
        currencies: ['USD'],
        countries: ['US'],
        assets: ['EURUSD'],
        importance: 'high',
        category: 'CENTRAL_BANKS',
        sentiment: 'bullish',
        relevance_score: 0.9,
      },
      {
        id: 'news-2',
        source: 'investing',
        title: 'Fed Powell Says Policy Restrictive Until Inflation Hits 2% Target',
        summary: 'Longer comprehensive summary from Investing.com with detailed analysis of rate implications.',
        url: 'https://investing.com/1',
        published_at: now,
        fetched_at: now,
        updated_at: now,
        currencies: ['USD', 'EUR'],
        countries: ['US', 'EU'],
        assets: ['EURUSD', 'US500'],
        importance: 'high',
        category: 'CENTRAL_BANKS',
        sentiment: 'bullish',
        relevance_score: 0.9,
      },
    ];

    const deduplicated = DeduplicationEngine.deduplicateNews(articles);
    assert.equal(deduplicated.length, 1, 'Expected 2 articles to merge into 1');

    const merged = deduplicated[0];
    assert.ok(merged.sources?.includes('realtime_news'));
    assert.ok(merged.sources?.includes('investing'));
    assert.ok(merged.currencies.includes('USD') && merged.currencies.includes('EUR'));
    assert.ok(merged.summary.includes('comprehensive summary'));
  });

  test('deduplicates economic events matching currency and scheduled time', () => {
    const scheduled = '2026-10-05T12:30:00.000Z';
    const now = new Date().toISOString();

    const events: NormalizedEconomicEvent[] = [
      {
        id: 'ff-cpi-1',
        source: 'forexfactory',
        event: 'Core CPI m/m',
        country: 'US',
        currency: 'USD',
        scheduled_at: scheduled,
        importance: 'high',
        forecast: '0.3%',
        previous: '0.2%',
        actual: null,
        status: 'upcoming',
        surprise: null,
        fetched_at: now,
        updated_at: now,
      },
      {
        id: 'finn-cpi-2',
        source: 'macro_calendar',
        event: 'US Core CPI Month-over-Month',
        country: 'US',
        currency: 'USD',
        scheduled_at: scheduled,
        importance: 'high',
        forecast: '0.3%',
        previous: '0.2%',
        actual: '0.4%', // released actual outcome
        status: 'released',
        surprise: {
          raw_surprise: 0.1,
          interpretation: 'BULLISH',
        },
        fetched_at: now,
        updated_at: now,
      },
    ];

    const deduped = DeduplicationEngine.deduplicateEvents(events);
    assert.equal(deduped.length, 1);
    assert.equal(deduped[0].actual, '0.4%');
    assert.equal(deduped[0].status, 'released');
    assert.equal(deduped[0].surprise?.interpretation, 'BULLISH');
  });
});

describe('3. Relevance Engine', () => {
  test('scores EURUSD news higher than unrelated currency news', () => {
    const now = new Date().toISOString();
    const eurusdNews: NormalizedNewsArticle = {
      id: 'news-eur',
      source: 'investing',
      title: 'ECB President Lagarde Highlights Sluggish Eurozone Growth as Fed Holds Rates',
      summary: 'Euro falls against the dollar as monetary divergence widens.',
      url: 'https://test.com/eur',
      published_at: now,
      fetched_at: now,
      updated_at: now,
      currencies: ['EUR', 'USD'],
      countries: ['EU', 'US'],
      assets: ['EURUSD'],
      importance: 'high',
      category: 'CENTRAL_BANKS',
      sentiment: 'bearish',
      relevance_score: null,
    };

    const jpyNews: NormalizedNewsArticle = {
      id: 'news-jpy',
      source: 'realtime_news',
      title: 'Bank of Japan Signals Possible Yen Intervention at 155.00 Threshold',
      summary: 'Japanese finance ministry officials maintain elevated market surveillance.',
      url: 'https://test.com/jpy',
      published_at: now,
      fetched_at: now,
      updated_at: now,
      currencies: ['JPY'],
      countries: ['JP'],
      assets: ['USDJPY'],
      importance: 'medium',
      category: 'CENTRAL_BANKS',
      sentiment: 'neutral',
      relevance_score: null,
    };

    const scoreEur = RelevanceEngine.scoreArticleRelevance(eurusdNews, 'EURUSD');
    const scoreJpy = RelevanceEngine.scoreArticleRelevance(jpyNews, 'EURUSD');

    assert.ok(scoreEur > scoreJpy, `Expected EUR score (${scoreEur}) > JPY score (${scoreJpy})`);
    assert.ok(scoreEur >= 0.7, `Expected scoreEur >= 0.7, got ${scoreEur}`);
  });

  test('prioritizes Gold/XAUUSD specific catalysts', () => {
    const now = new Date().toISOString();
    const goldNews: NormalizedNewsArticle = {
      id: 'news-gold',
      source: 'investing',
      title: 'Gold Tests $2,740 as Safe-Haven Inflows and Central Bank Bullion Demand Accelerate',
      summary: 'Sovereign reserves increase physical bullion allocations.',
      url: 'https://test.com/gold',
      published_at: now,
      fetched_at: now,
      updated_at: now,
      currencies: ['USD', 'XAUUSD'],
      countries: ['US'],
      assets: ['XAUUSD'],
      importance: 'high',
      category: 'COMMODITIES',
      sentiment: 'bullish',
      relevance_score: null,
    };

    const score = RelevanceEngine.scoreArticleRelevance(goldNews, 'XAUUSD');
    assert.ok(score >= 0.8, `Expected gold score >= 0.8, got ${score}`);
  });

  test('filters calendar events relevant to asset currencies', () => {
    const now = new Date().toISOString();
    const events: NormalizedEconomicEvent[] = [
      {
        id: 'ev-1',
        source: 'forexfactory',
        event: 'US Non-Farm Payrolls',
        country: 'US',
        currency: 'USD',
        scheduled_at: now,
        importance: 'high',
        forecast: '175K',
        previous: '142K',
        actual: null,
        status: 'upcoming',
        surprise: null,
        fetched_at: now,
        updated_at: now,
      },
      {
        id: 'ev-2',
        source: 'forexfactory',
        event: 'ECB Main Refinancing Rate',
        country: 'EU',
        currency: 'EUR',
        scheduled_at: now,
        importance: 'high',
        forecast: '3.65%',
        previous: '3.75%',
        actual: null,
        status: 'upcoming',
        surprise: null,
        fetched_at: now,
        updated_at: now,
      },
      {
        id: 'ev-3',
        source: 'forexfactory',
        event: 'Australian CPI YoY',
        country: 'AU',
        currency: 'AUD',
        scheduled_at: now,
        importance: 'high',
        forecast: '3.8%',
        previous: '3.6%',
        actual: null,
        status: 'upcoming',
        surprise: null,
        fetched_at: now,
        updated_at: now,
      },
    ];

    const filteredEurUsd = RelevanceEngine.filterEventsForAsset(events, 'EURUSD');
    assert.equal(filteredEurUsd.length, 2, 'Expected USD and EUR events for EURUSD');
    assert.ok(filteredEurUsd.every((e) => e.currency === 'USD' || e.currency === 'EUR'));
  });
});

describe('4. Data Source Adapters & Normalization', () => {
  test('ForexFactoryAdapter provides normalized events with raw values preserved', async () => {
    const adapter = new ForexFactoryAdapter();
    const events = await adapter.fetch_economic_events();
    assert.ok(Array.isArray(events));
    assert.ok(events.length > 0, 'ForexFactory should return events');

    const first = events[0];
    assert.equal(first.source, 'forexfactory');
    assert.ok(first.currency.length > 0);
    assert.ok(first.scheduled_at.includes('T'));
    assert.ok(['low', 'medium', 'high', 'unknown'].includes(first.importance));
    assert.ok(['upcoming', 'released', 'cancelled', 'unknown'].includes(first.status));
  });

  test('RealtimeNewsAdapter provides normalized news with UTC timestamps', async () => {
    const adapter = new RealtimeNewsAdapter();
    const news = await adapter.fetch_latest_news();
    assert.ok(Array.isArray(news));
    assert.ok(news.length > 0, 'RealtimeNews should return articles');

    const first = news[0];
    assert.equal(first.source, 'realtime_news');
    assert.ok(first.title.length > 0);
    assert.ok(first.url.startsWith('http'));
    assert.ok(first.published_at.endsWith('Z'));
    assert.ok(Array.isArray(first.currencies));
  });

  test('InvestingAdapter provides normalized market commentary and events', async () => {
    const adapter = new InvestingAdapter();
    const news = await adapter.fetch_latest_news();
    assert.ok(Array.isArray(news));
    assert.ok(news.length > 0, 'InvestingAdapter should return articles');

    const first = news[0];
    assert.equal(first.source, 'investing');
    assert.ok(first.title.length > 0);
    assert.ok(first.url.includes('investing.com'));
  });

  test('MacroCalendarAdapter calculates raw surprise when actual and forecast exist', async () => {
    const adapter = new MacroCalendarAdapter();
    const events = await adapter.fetch_economic_events();
    assert.ok(Array.isArray(events));
    assert.ok(events.length > 0, 'MacroCalendarAdapter should return events');

    const releasedWithSurprise = events.find((e) => e.status === 'released' && e.surprise !== null);
    if (releasedWithSurprise) {
      assert.ok(releasedWithSurprise.surprise !== null);
      assert.equal(typeof releasedWithSurprise.surprise?.raw_surprise, 'number');
      assert.ok(['BULLISH', 'BEARISH', 'IN_LINE'].includes(releasedWithSurprise.surprise?.interpretation!));
    }
  });

  test('Adapters track health status and error isolation', async () => {
    const adapter = new RealtimeNewsAdapter();
    const health = adapter.get_health_report();
    assert.equal(health.source_id, 'realtime_news');
    assert.ok(['ONLINE', 'DEGRADED', 'OFFLINE'].includes(health.status));
  });
});

describe('5. Live Data Store & Context Builder', () => {
  test('Store ingests and retrieves articles with freshness scoring', () => {
    const store = LiveDataStore.getInstance();
    const now = new Date().toISOString();

    const sampleArticle: NormalizedNewsArticle = {
      id: 'store-test-1',
      source: 'realtime_news',
      title: 'US CPI Rises 0.2% MoM in Line with Forecasts',
      summary: 'Consumer price index meets institutional estimates.',
      url: 'https://test.com/cpi',
      published_at: now,
      fetched_at: now,
      updated_at: now,
      currencies: ['USD'],
      countries: ['US'],
      assets: ['EURUSD', 'XAUUSD'],
      importance: 'high',
      category: 'INFLATION',
      sentiment: 'neutral',
      relevance_score: 0.9,
    };

    const stats = store.upsertArticles([sampleArticle]);
    assert.ok(stats.added > 0 || stats.updated > 0);

    const fetched = store.getArticles({ symbol: 'EURUSD', limit: 5 });
    assert.ok(fetched.length > 0);
    const found = fetched.find((a) => a.id === 'store-test-1');
    assert.ok(found);
    assert.ok(found.freshness === 'VERY_FRESH' || found.freshness === 'FRESH');
  });

  test('ModelContextBuilder constructs full structured context with source attribution', () => {
    const store = LiveDataStore.getInstance();
    const context = ModelContextBuilder.buildContext('XAUUSD', store);

    assert.equal(context.asset, 'XAUUSD');
    assert.ok(context.generated_at.endsWith('Z'));
    assert.ok(['VERY_FRESH', 'FRESH', 'RECENT', 'OLD', 'STALE'].includes(context.data_freshness.overall));
    assert.ok(Array.isArray(context.market_context.breaking_news));
    assert.ok(Array.isArray(context.market_context.economic_events_next_24h));
    assert.ok(Array.isArray(context.source_attribution));

    // Formatted prompt string contains verified headers and asset tags
    assert.ok(context.formatted_prompt_context.includes('VERIFIED LIVE FINANCIAL DATA STREAM'));
    assert.ok(context.formatted_prompt_context.includes('Target Asset: XAUUSD'));
    assert.ok(context.formatted_prompt_context.includes('Data Freshness:'));
  });

  test('LiveDataPipeline coordinates background ingestion and exposes health', async () => {
    const pipeline = LiveDataPipeline.getInstance({ newsIntervalMs: 60000, calendarIntervalMs: 180000 });
    const health = pipeline.getHealth();
    assert.ok(Array.isArray(health));
    assert.equal(health.length, 4, 'Expected 4 adapters registered (ForexFactory, RealtimeNews, Investing, MacroCalendar)');

    const context = pipeline.getContext('EURUSD');
    assert.equal(context.asset, 'EURUSD');
    assert.ok(context.formatted_prompt_context.length > 0);
  });
});
