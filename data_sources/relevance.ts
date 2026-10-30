// Multi-Asset Relevance Engine
// Classifies and filters financial news and economic events by specific asset relevance

import type { NormalizedNewsArticle, NormalizedEconomicEvent } from './types.ts';

export interface AssetRelevanceProfile {
  symbol: string;
  baseCurrency: string;
  quoteCurrency: string;
  relevantCurrencies: string[];
  primaryKeywords: string[];
  secondaryKeywords: string[];
  centralBanks: string[];
}

export class RelevanceEngine {
  private static readonly PROFILES: Record<string, AssetRelevanceProfile> = {
    EURUSD: {
      symbol: 'EURUSD',
      baseCurrency: 'EUR',
      quoteCurrency: 'USD',
      relevantCurrencies: ['EUR', 'USD'],
      primaryKeywords: ['ecb', 'lagarde', 'fed', 'powell', 'inflation', 'cpi', 'pce', 'nfp', 'payrolls', 'rates', 'eurozone'],
      secondaryKeywords: ['pmi', 'gdp', 'bund', 'treasury', 'yield', 'employment', 'german', 'germany'],
      centralBanks: ['ECB', 'Federal Reserve'],
    },
    GBPUSD: {
      symbol: 'GBPUSD',
      baseCurrency: 'GBP',
      quoteCurrency: 'USD',
      relevantCurrencies: ['GBP', 'USD'],
      primaryKeywords: ['boe', 'bailey', 'fed', 'powell', 'uk cpi', 'gilt', 'sterling', 'pound', 'rates'],
      secondaryKeywords: ['pmi', 'uk gdp', 'treasury', 'yield', 'bank of england', 'budget'],
      centralBanks: ['BOE', 'Federal Reserve'],
    },
    USDJPY: {
      symbol: 'USDJPY',
      baseCurrency: 'USD',
      quoteCurrency: 'JPY',
      relevantCurrencies: ['USD', 'JPY'],
      primaryKeywords: ['boj', 'ueda', 'fed', 'powell', 'intervention', 'yen', 'yield curve', 'jgb', 'treasury'],
      secondaryKeywords: ['ministry of finance', 'cpi tokyo', 'rates', 'carry trade', 'export'],
      centralBanks: ['BOJ', 'Federal Reserve'],
    },
    USDCHF: {
      symbol: 'USDCHF',
      baseCurrency: 'USD',
      quoteCurrency: 'CHF',
      relevantCurrencies: ['USD', 'CHF'],
      primaryKeywords: ['snb', 'jordan', 'fed', 'franc', 'safe haven', 'swiss cpi'],
      secondaryKeywords: ['rates', 'inflation', 'swiss national bank'],
      centralBanks: ['SNB', 'Federal Reserve'],
    },
    AUDUSD: {
      symbol: 'AUDUSD',
      baseCurrency: 'AUD',
      quoteCurrency: 'USD',
      relevantCurrencies: ['AUD', 'USD', 'CNY'],
      primaryKeywords: ['rba', 'bullock', 'fed', 'australian', 'commodity', 'china', 'iron ore'],
      secondaryKeywords: ['australian cpi', 'employment', 'rates', 'yield'],
      centralBanks: ['RBA', 'Federal Reserve'],
    },
    USDCAD: {
      symbol: 'USDCAD',
      baseCurrency: 'USD',
      quoteCurrency: 'CAD',
      relevantCurrencies: ['USD', 'CAD'],
      primaryKeywords: ['boc', 'macklem', 'fed', 'loonie', 'crude', 'oil', 'canadian cpi'],
      secondaryKeywords: ['energy', 'employment canada', 'rates', 'wti'],
      centralBanks: ['BOC', 'Federal Reserve'],
    },
    NZDUSD: {
      symbol: 'NZDUSD',
      baseCurrency: 'NZD',
      quoteCurrency: 'USD',
      relevantCurrencies: ['NZD', 'USD', 'CNY'],
      primaryKeywords: ['rbnz', 'orr', 'fed', 'kiwi', 'dairy', 'china', 'new zealand'],
      secondaryKeywords: ['rates', 'inflation', 'export'],
      centralBanks: ['RBNZ', 'Federal Reserve'],
    },
    XAUUSD: {
      symbol: 'XAUUSD',
      baseCurrency: 'XAU',
      quoteCurrency: 'USD',
      relevantCurrencies: ['USD', 'XAU', 'XAUUSD'],
      primaryKeywords: ['gold', 'bullion', 'xau', 'fed', 'real yields', 'treasury', 'safe haven', 'inflation', 'cpi'],
      secondaryKeywords: ['central bank gold', 'geopolitical', 'dollar index', 'dxy', 'sovereign reserves', 'middle east'],
      centralBanks: ['Federal Reserve'],
    },
    BTCUSD: {
      symbol: 'BTCUSD',
      baseCurrency: 'BTC',
      quoteCurrency: 'USD',
      relevantCurrencies: ['USD', 'BTC', 'BTCUSD'],
      primaryKeywords: ['bitcoin', 'btc', 'crypto', 'etf', 'sec', 'liquidity', 'fed', 'digital assets'],
      secondaryKeywords: ['halving', 'mining', 'stablecoin', 'regulation', 'rates'],
      centralBanks: ['Federal Reserve'],
    },
    SPX: {
      symbol: 'SPX',
      baseCurrency: 'USD',
      quoteCurrency: 'USD',
      relevantCurrencies: ['USD'],
      primaryKeywords: ['s&p 500', 'spx', 'fed', 'earnings', 'gdp', 'inflation', 'treasury', 'yields'],
      secondaryKeywords: ['equities', 'rate cut', 'broad market', 'vix'],
      centralBanks: ['Federal Reserve'],
    },
    US500: {
      symbol: 'US500',
      baseCurrency: 'USD',
      quoteCurrency: 'USD',
      relevantCurrencies: ['USD'],
      primaryKeywords: ['s&p 500', 'us500', 'fed', 'earnings', 'gdp', 'inflation', 'treasury', 'yields'],
      secondaryKeywords: ['equities', 'rate cut', 'broad market', 'vix'],
      centralBanks: ['Federal Reserve'],
    },
    NAS100: {
      symbol: 'NAS100',
      baseCurrency: 'USD',
      quoteCurrency: 'USD',
      relevantCurrencies: ['USD'],
      primaryKeywords: ['nasdaq', 'tech', 'semiconductor', 'ai', 'fed', 'treasury', 'yield', 'earnings'],
      secondaryKeywords: ['mega cap', 'growth', 'rates', 'nvidia', 'apple'],
      centralBanks: ['Federal Reserve'],
    },
    US30: {
      symbol: 'US30',
      baseCurrency: 'USD',
      quoteCurrency: 'USD',
      relevantCurrencies: ['USD'],
      primaryKeywords: ['dow jones', 'us30', 'fed', 'industrial', 'blue chip', 'gdp', 'inflation'],
      secondaryKeywords: ['manufacturing', 'earnings', 'treasury'],
      centralBanks: ['Federal Reserve'],
    },
    GER40: {
      symbol: 'GER40',
      baseCurrency: 'EUR',
      quoteCurrency: 'EUR',
      relevantCurrencies: ['EUR', 'USD'],
      primaryKeywords: ['dax', 'ger40', 'germany', 'ecb', 'german manufacturing', 'bund'],
      secondaryKeywords: ['eurozone', 'industrial', 'export', 'auto'],
      centralBanks: ['ECB'],
    },
    UK100: {
      symbol: 'UK100',
      baseCurrency: 'GBP',
      quoteCurrency: 'GBP',
      relevantCurrencies: ['GBP', 'USD'],
      primaryKeywords: ['ftse', 'uk100', 'boe', 'uk inflation', 'gilt', 'sterling'],
      secondaryKeywords: ['energy', 'mining uk', 'bank of england'],
      centralBanks: ['BOE'],
    },
  };

  static getProfile(symbol: string): AssetRelevanceProfile {
    const symUpper = symbol.toUpperCase().trim();
    if (this.PROFILES[symUpper]) {
      return this.PROFILES[symUpper];
    }

    // Default dynamic profile for any currency pair
    const base = symUpper.slice(0, 3);
    const quote = symUpper.length >= 6 ? symUpper.slice(3, 6) : 'USD';

    return {
      symbol: symUpper,
      baseCurrency: base,
      quoteCurrency: quote,
      relevantCurrencies: [base, quote],
      primaryKeywords: [base.toLowerCase(), quote.toLowerCase(), 'inflation', 'rates', 'fed'],
      secondaryKeywords: ['pmi', 'gdp', 'employment', 'yield'],
      centralBanks: ['Central Bank'],
    };
  }

  /**
   * Scores article relevance for a specific asset (0.0 - 1.0)
   */
  static scoreArticleRelevance(article: NormalizedNewsArticle, symbol: string): number {
    const profile = this.getProfile(symbol);
    let score = 0;

    // Direct asset match
    if (article.assets.some((a) => a.toUpperCase() === profile.symbol)) {
      score += 0.5;
    }

    // Direct currency match
    const hasBase = article.currencies.some((c) => c.toUpperCase() === profile.baseCurrency);
    const hasQuote = article.currencies.some((c) => c.toUpperCase() === profile.quoteCurrency);
    if (hasBase && hasQuote) score += 0.4;
    else if (hasBase || hasQuote) score += 0.25;

    // Content keyword match
    const content = `${article.title} ${article.summary}`.toLowerCase();
    for (const kw of profile.primaryKeywords) {
      if (content.includes(kw)) {
        score += 0.15;
        break;
      }
    }
    for (const kw of profile.secondaryKeywords) {
      if (content.includes(kw)) {
        score += 0.08;
        break;
      }
    }

    // Importance boost
    if (article.importance === 'high') score += 0.1;
    if (article.is_breaking) score += 0.1;

    return Math.min(1.0, Number(score.toFixed(2)));
  }

  /**
   * Filters and ranks news articles for a target asset
   */
  static filterAndRankNews(
    articles: NormalizedNewsArticle[],
    symbol: string,
    limit = 10,
    minScore = 0.2
  ): NormalizedNewsArticle[] {
    const scored = articles
      .map((a) => {
        const relevance = this.scoreArticleRelevance(a, symbol);
        return { ...a, relevance_score: relevance };
      })
      .filter((a) => (a.relevance_score ?? 0) >= minScore);

    // Sort by: 1. relevance_score (desc), 2. importance (high first), 3. published_at (newest first)
    return scored
      .sort((a, b) => {
        const diffRel = (b.relevance_score || 0) - (a.relevance_score || 0);
        if (Math.abs(diffRel) > 0.15) return diffRel;

        if (a.importance === 'high' && b.importance !== 'high') return -1;
        if (b.importance === 'high' && a.importance !== 'high') return 1;

        return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
      })
      .slice(0, limit);
  }

  /**
   * Filters economic calendar events relevant to the asset
   */
  static filterEventsForAsset(
    events: NormalizedEconomicEvent[],
    symbol: string
  ): NormalizedEconomicEvent[] {
    const profile = this.getProfile(symbol);
    const currSet = new Set(profile.relevantCurrencies.map((c) => c.toUpperCase()));

    return events.filter((e) => currSet.has(e.currency.toUpperCase()));
  }
}
