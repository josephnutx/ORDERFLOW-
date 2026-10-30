// Freshness Detection & Timestamp Utilities
// Enforces strict UTC handling and categorizes information age

import type { FreshnessLevel } from './types.ts';

export interface FreshnessResult {
  level: FreshnessLevel;
  ageMinutes: number;
  isStale: boolean;
  isLive: boolean;
}

export class FreshnessEngine {
  /**
   * Evaluates freshness based on published/scheduled timestamp
   * 0 - 2 mins: VERY_FRESH
   * 2 - 10 mins: FRESH
   * 10 - 30 mins: RECENT
   * 30 - 120 mins: OLD
   * > 120 mins: STALE
   */
  static evaluate(isoTimestamp: string, referenceTimeMs: number = Date.now()): FreshnessResult {
    try {
      const timeMs = new Date(isoTimestamp).getTime();
      if (isNaN(timeMs)) {
        return {
          level: 'STALE',
          ageMinutes: 9999,
          isStale: true,
          isLive: false,
        };
      }

      const diffMs = referenceTimeMs - timeMs;
      const ageMinutes = Math.max(0, Math.round(diffMs / 60000));

      let level: FreshnessLevel = 'STALE';
      if (ageMinutes <= 2) {
        level = 'VERY_FRESH';
      } else if (ageMinutes <= 10) {
        level = 'FRESH';
      } else if (ageMinutes <= 30) {
        level = 'RECENT';
      } else if (ageMinutes <= 120) {
        level = 'OLD';
      } else {
        level = 'STALE';
      }

      return {
        level,
        ageMinutes,
        isStale: level === 'STALE',
        isLive: level === 'VERY_FRESH' || level === 'FRESH',
      };
    } catch {
      return {
        level: 'STALE',
        ageMinutes: 9999,
        isStale: true,
        isLive: false,
      };
    }
  }

  /**
   * Determines the aggregate freshness of a collection of items
   */
  static aggregateFreshness(levels: FreshnessLevel[]): FreshnessLevel {
    if (levels.length === 0) return 'STALE';
    if (levels.includes('VERY_FRESH')) return 'VERY_FRESH';
    if (levels.includes('FRESH')) return 'FRESH';
    if (levels.includes('RECENT')) return 'RECENT';
    if (levels.includes('OLD')) return 'OLD';
    return 'STALE';
  }
}
