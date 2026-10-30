import { EconomicCalendarEvent, MacroNewsIntelligence } from '../types/marketIntelligence';

// Stable cache of curated macro calendar events per symbol to prevent constant rerendering/flicker
const calendarCache: Record<string, { events: EconomicCalendarEvent[]; timestamp: number }> = {};

// Default realistic macro event calendar schedule around the current period (cached for 10 minutes)
export function generateCuratedMacroCalendar(symbol: string, forceRefresh: boolean = false): EconomicCalendarEvent[] {
  const symbolUpper = symbol.toUpperCase();
  const now = Date.now();

  if (!forceRefresh && calendarCache[symbolUpper] && now - calendarCache[symbolUpper].timestamp < 600_000) {
    return calendarCache[symbolUpper].events;
  }

  const oneHour = 60 * 60 * 1000;
  const oneDay = 24 * oneHour;

  // Identify base and quote currencies for the symbol
  const currencyMatch = symbol.match(/^[A-Z]{3}/)?.[0] || 'USD';
  const quoteMatch = symbol.length >= 6 ? symbol.slice(3, 6) : 'USD';

  const baseEvents: Array<{
    currency: string;
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
    eventTitle: string;
    forecast: string;
    previous: string;
    actual?: string;
    timeOffsetMs: number;
    surprise?: number;
  }> = [
    {
      currency: 'USD',
      impact: 'HIGH',
      eventTitle: 'Core PCE Price Index m/m',
      forecast: '0.2%',
      previous: '0.2%',
      actual: '0.3%',
      timeOffsetMs: -2 * oneHour,
      surprise: 0.1, // Hot inflation surprise
    },
    {
      currency: 'USD',
      impact: 'HIGH',
      eventTitle: 'Fed Interest Rate Decision & FOMC Statement',
      forecast: '5.25%',
      previous: '5.25%',
      timeOffsetMs: 4 * oneHour,
    },
    {
      currency: 'EUR',
      impact: 'HIGH',
      eventTitle: 'ECB Monetary Policy Statement & Press Conference',
      forecast: '3.65%',
      previous: '3.75%',
      actual: '3.65%',
      timeOffsetMs: -6 * oneHour,
      surprise: 0.0,
    },
    {
      currency: 'USD',
      impact: 'HIGH',
      eventTitle: 'Non-Farm Employment Change (NFP)',
      forecast: '175K',
      previous: '142K',
      timeOffsetMs: 22 * oneHour,
    },
    {
      currency: 'GBP',
      impact: 'HIGH',
      eventTitle: 'BOE Official Bank Rate Vote',
      forecast: '5.00%',
      previous: '5.00%',
      actual: '5.00%',
      timeOffsetMs: -14 * oneHour,
      surprise: 0.0,
    },
    {
      currency: 'JPY',
      impact: 'HIGH',
      eventTitle: 'BOJ Monetary Policy Statement & Press Conference',
      forecast: '0.25%',
      previous: '0.25%',
      actual: '0.25%',
      timeOffsetMs: -18 * oneHour,
      surprise: 0.0,
    },
    {
      currency: 'CAD',
      impact: 'HIGH',
      eventTitle: 'BOC Overnight Rate & Policy Report',
      forecast: '4.25%',
      previous: '4.50%',
      actual: '4.25%',
      timeOffsetMs: -1 * oneDay,
      surprise: 0.0,
    },
    {
      currency: 'AUD',
      impact: 'HIGH',
      eventTitle: 'RBA Cash Rate Release',
      forecast: '4.35%',
      previous: '4.35%',
      timeOffsetMs: 36 * oneHour,
    },
    {
      currency: 'USD',
      impact: 'MEDIUM',
      eventTitle: 'ISM Manufacturing PMI',
      forecast: '47.6',
      previous: '47.2',
      timeOffsetMs: 8 * oneHour,
    },
    {
      currency: 'USD',
      impact: 'MEDIUM',
      eventTitle: 'Unemployment Claims',
      forecast: '218K',
      previous: '219K',
      actual: '215K',
      timeOffsetMs: -3 * oneHour,
      surprise: -3,
    },
  ];

  const mapped = baseEvents
    .map((ev, idx) => {
      const eventTime = now + ev.timeOffsetMs;
      const date = new Date(eventTime);
      const dateFormatted = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const timeFormatted = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      const timeUntilMinutes = Math.round((eventTime - now) / 60000);

      return {
        id: `ff-event-${idx}-${ev.currency}-${ev.eventTitle.slice(0, 8)}`,
        currency: ev.currency,
        impact: ev.impact,
        eventTitle: ev.eventTitle,
        actual: ev.actual ?? null,
        forecast: ev.forecast,
        previous: ev.previous,
        eventTime,
        dateFormatted,
        timeFormatted,
        dateTimeFormatted: `${dateFormatted} · ${timeFormatted}`,
        timeUntilMinutes,
        isHighImpact: ev.impact === 'HIGH',
        surpriseValue: ev.surprise ?? null,
      };
    })
    .sort((a, b) => a.eventTime - b.eventTime);

  calendarCache[symbolUpper] = {
    events: mapped,
    timestamp: now,
  };

  return mapped;
}

// Fetch economic calendar from backend / ForexFactory & Myfxbook API
export async function fetchForexFactoryCalendar(symbol: string): Promise<EconomicCalendarEvent[]> {
  try {
    const res = await fetch(`/api/macro/calendar?symbol=${encodeURIComponent(symbol)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.events) && data.events.length > 0) {
        return data.events;
      }
    }
  } catch {
    // Fallback to curated schedule
  }
  return generateCuratedMacroCalendar(symbol);
}

// Compute comprehensive MacroNewsIntelligence
export function analyzeMacroReaction(
  events: EconomicCalendarEvent[],
  symbol: string,
  priceChangePct: number,
  deltaImbalance: number
): MacroNewsIntelligence {
  const symbolUpper = symbol.toUpperCase();
  const isUsdPair = symbolUpper.includes('USD');
  const isEurPair = symbolUpper.includes('EUR');
  const isGbpPair = symbolUpper.includes('GBP');
  const isJpyPair = symbolUpper.includes('JPY');
  const isCadPair = symbolUpper.includes('CAD');
  const isAudPair = symbolUpper.includes('AUD');

  // Filter events relevant to this instrument
  const relevantCurrencies = new Set<string>();
  if (isUsdPair || symbolUpper === 'XAUUSD' || symbolUpper === 'BTCUSD' || symbolUpper.startsWith('US') || symbolUpper.startsWith('NAS')) {
    relevantCurrencies.add('USD');
  }
  if (isEurPair || symbolUpper === 'GER40') relevantCurrencies.add('EUR');
  if (isGbpPair || symbolUpper === 'UK100') relevantCurrencies.add('GBP');
  if (isJpyPair) relevantCurrencies.add('JPY');
  if (isCadPair) relevantCurrencies.add('CAD');
  if (isAudPair) relevantCurrencies.add('AUD');

  const filtered = events.filter((e) => relevantCurrencies.has(e.currency));
  const activeEvents = filtered.length > 0 ? filtered : events;

  // Upcoming vs Recent
  const upcomingEvents = activeEvents
    .filter((e) => e.timeUntilMinutes >= 0 && e.timeUntilMinutes <= 1440)
    .sort((a, b) => a.timeUntilMinutes - b.timeUntilMinutes);

  const recentEvents = activeEvents
    .filter((e) => e.timeUntilMinutes < 0 && e.timeUntilMinutes >= -1440)
    .sort((a, b) => b.timeUntilMinutes - a.timeUntilMinutes);

  // Check imminent high impact event (< 30 minutes away)
  const imminentHighImpact = upcomingEvents.find((e) => e.isHighImpact && e.timeUntilMinutes <= 30);
  const nextHighImpact = upcomingEvents.find((e) => e.isHighImpact);

  let eventRisk: MacroNewsIntelligence['eventRisk'] = 'LOW_CLEAR';
  if (imminentHighImpact) {
    eventRisk = 'EXTREME_RISK_STAND_DOWN';
  } else if (nextHighImpact && nextHighImpact.timeUntilMinutes <= 90) {
    eventRisk = 'HIGH_RISK_APPROACHING';
  } else if (upcomingEvents.some((e) => e.timeUntilMinutes <= 180)) {
    eventRisk = 'MODERATE';
  }

  // Calculate economic surprise from the most recent release
  const latestReleased = recentEvents.find((e) => e.actual !== null && e.surpriseValue !== undefined && e.surpriseValue !== null);
  const economicSurprise = latestReleased?.surpriseValue ?? 0.1;

  // Analyze Post-News Reaction vs Price behavior (§15)
  // For instance: USD inflation came in hotter (+0.1% surprise -> USD bullish),
  // Did EURUSD decline as expected or fail to drop?
  let reactionStrength: MacroNewsIntelligence['postNewsReaction']['reactionStrength'] = 'MODERATE_ACCEPTANCE';
  let reactionDirection: MacroNewsIntelligence['postNewsReaction']['reactionDirection'] = 'DOLLAR_STRENGTH';
  let expectationAlignment: MacroNewsIntelligence['postNewsReaction']['expectationAlignment'] = 'ALIGNED_WITH_SURPRISE';
  let newsFailureScore = 0;
  let explanation = '';

  const isDollarQuoted = symbolUpper.endsWith('USD') && symbolUpper !== 'USDJPY' && symbolUpper !== 'USDCAD' && symbolUpper !== 'USDCHF';

  if (economicSurprise > 0) {
    // Bullish USD surprise
    if (isDollarQuoted) {
      // Expect pair to drop
      if (priceChangePct < -0.15) {
        reactionStrength = 'MODERATE_ACCEPTANCE';
        reactionDirection = 'DOLLAR_STRENGTH';
        expectationAlignment = 'ALIGNED_WITH_SURPRISE';
        newsFailureScore = 12;
        explanation = `Bullish USD macro surprise confirmed: ${symbolUpper} declined in alignment with dollar strength. Sell liquidity absorbed downward continuation.`;
      } else if (priceChangePct > 0.08) {
        // News failure! Hot inflation didn't sink the pair
        reactionStrength = 'IMMEDIATE_FADE';
        reactionDirection = 'DOLLAR_WEAKNESS';
        expectationAlignment = 'DIVERGENT_SURPRISE_REJECTED';
        newsFailureScore = 84;
        explanation = `News Failure Detected! Bullish USD surprise (+${economicSurprise}) failed to trigger downside in ${symbolUpper}. Passive buyers absorbed all post-news supply; market rejecting dollar strength.`;
      } else {
        reactionStrength = 'MUTED_NO_REACTION';
        reactionDirection = 'CHOP';
        expectationAlignment = 'NEUTRAL';
        newsFailureScore = 40;
        explanation = `Muted price response to macro data. Dense two-sided resting orders compressing volatility around Fair Value POC.`;
      }
    } else {
      reactionStrength = 'MODERATE_ACCEPTANCE';
      reactionDirection = 'DOLLAR_STRENGTH';
      expectationAlignment = 'ALIGNED_WITH_SURPRISE';
      newsFailureScore = 15;
      explanation = `Macro surprise aligned with currency direction. Institutional flow supporting dollar expansion.`;
    }
  } else {
    reactionStrength = 'MODERATE_ACCEPTANCE';
    reactionDirection = 'DOLLAR_WEAKNESS';
    expectationAlignment = 'ALIGNED_WITH_SURPRISE';
    newsFailureScore = 10;
    explanation = `Macro expectations priced in. Market rotating in technical auction boundaries.`;
  }

  return {
    upcomingEvents,
    recentEvents,
    eventRisk,
    economicSurprise,
    currencyRelevance: Array.from(relevantCurrencies).join(' / ') || 'USD Global',
    preNewsRisk: eventRisk === 'EXTREME_RISK_STAND_DOWN' || eventRisk === 'HIGH_RISK_APPROACHING',
    postNewsReaction: {
      reactionStrength,
      reactionDirection,
      expectationAlignment,
      newsFailureScore,
      explanation,
    },
  };
}
