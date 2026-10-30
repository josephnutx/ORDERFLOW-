// Deduplication Engine for Financial News and Economic Events
// Employs headline normalization, URL hashing, and multi-source merging

import type { NormalizedNewsArticle, NormalizedEconomicEvent } from './types.ts';

export class DeduplicationEngine {
  /**
   * Normalizes headline by lowercasing, removing non-alphanumeric noise, and stripping common stop words
   */
  static normalizeHeadline(headline: string): string {
    return headline
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Generates a canonical fingerprint from a normalized headline
   */
  static generateFingerprint(headline: string): string {
    const clean = this.normalizeHeadline(headline);
    const words = clean.split(' ').filter((w) => w.length > 2);
    // Sort words to handle reordered headlines
    const keyWords = words.slice(0, 8).sort().join('_');
    return keyWords || clean;
  }

  /**
   * Calculates word-level Jaccard similarity between two headlines (0.0 to 1.0)
   */
  static calculateSimilarity(titleA: string, titleB: string): number {
    const setA = new Set(this.normalizeHeadline(titleA).split(' ').filter((w) => w.length > 2));
    const setB = new Set(this.normalizeHeadline(titleB).split(' ').filter((w) => w.length > 2));

    if (setA.size === 0 || setB.size === 0) return 0;

    let intersectionCount = 0;
    for (const w of setA) {
      if (setB.has(w)) intersectionCount++;
    }

    const unionCount = new Set([...setA, ...setB]).size;
    return unionCount === 0 ? 0 : intersectionCount / unionCount;
  }

  /**
   * Deduplicates and merges an array of news articles across sources
   */
  static deduplicateNews(articles: NormalizedNewsArticle[]): NormalizedNewsArticle[] {
    const merged: NormalizedNewsArticle[] = [];

    for (const article of articles) {
      const normTitle = this.normalizeHeadline(article.title);
      let matchFound = false;

      for (let i = 0; i < merged.length; i++) {
        const existing = merged[i];
        const similarity = this.calculateSimilarity(article.title, existing.title);

        // If similarity is above 0.65 or identical URL
        if (similarity >= 0.65 || (article.url && article.url === existing.url)) {
          matchFound = true;

          // Merge sources
          const sourceSet = new Set<string>(existing.sources || [existing.source]);
          sourceSet.add(article.source);
          existing.sources = Array.from(sourceSet);

          // Merge currencies & assets
          const currSet = new Set<string>([...existing.currencies, ...article.currencies]);
          existing.currencies = Array.from(currSet);

          const assetSet = new Set<string>([...existing.assets, ...article.assets]);
          existing.assets = Array.from(assetSet);

          // Update timestamps: earliest published_at, latest updated_at
          if (new Date(article.published_at).getTime() < new Date(existing.published_at).getTime()) {
            existing.published_at = article.published_at;
          }
          if (new Date(article.updated_at).getTime() > new Date(existing.updated_at).getTime()) {
            existing.updated_at = article.updated_at;
          }

          // Prioritize higher importance
          if (article.importance === 'high') existing.importance = 'high';

          // Use the richer summary if available
          if (article.summary.length > existing.summary.length) {
            existing.summary = article.summary;
          }

          break;
        }
      }

      if (!matchFound) {
        merged.push({
          ...article,
          canonical_id: `canon-${this.generateFingerprint(normTitle)}`,
          sources: article.sources || [article.source],
        });
      }
    }

    return merged;
  }

  /**
   * Deduplicates economic calendar events (matching by currency + scheduled_at + similar event title)
   */
  static deduplicateEvents(events: NormalizedEconomicEvent[]): NormalizedEconomicEvent[] {
    const map = new Map<string, NormalizedEconomicEvent>();

    for (const ev of events) {
      // Key: currency + date slice to hour + event fingerprint
      const timeKey = ev.scheduled_at ? ev.scheduled_at.slice(0, 13) : 'unknown';
      const titleKey = this.generateFingerprint(ev.event).slice(0, 20);
      const key = `${ev.currency}_${timeKey}_${titleKey}`;

      if (map.has(key)) {
        const existing = map.get(key)!;
        // Merge actual/forecast if new has it and existing does not
        if (existing.actual === null && ev.actual !== null) {
          existing.actual = ev.actual;
          existing.status = 'released';
        }
        if (existing.forecast === null && ev.forecast !== null) {
          existing.forecast = ev.forecast;
        }
        if (!existing.surprise && ev.surprise) {
          existing.surprise = ev.surprise;
        }
      } else {
        map.set(key, { ...ev });
      }
    }

    return Array.from(map.values());
  }
}
