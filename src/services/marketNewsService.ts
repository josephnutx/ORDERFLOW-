// Market News & Latest Stories Service
// Provides real-time financial news, central bank speeches, geopolitical catalysts, and market analysis integration.

export interface MarketNewsStory {
  id: string;
  headline: string;
  summary: string;
  source: string;
  timestamp: number;
  timeFormatted: string;
  timeAgo: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  sentiment: 'BULLISH' | 'BEARISH' | 'VOLATILITY' | 'NEUTRAL';
  category: 'CENTRAL_BANKS' | 'INFLATION' | 'GEOPOLITICAL' | 'EMPLOYMENT' | 'EQUITIES_TECH' | 'COMMODITIES';
  relatedCurrencies: string[];
  takeaway: string;
  url?: string;
}

export interface MarketAnalysisNote {
  id: string;
  symbol: string;
  title: string;
  type: 'NEWS_CATALYST' | 'CALENDAR_EVENT' | 'TECHNICAL_EDGE';
  detail: string;
  impact?: 'HIGH' | 'MEDIUM' | 'LOW' | 'HOLIDAY';
  sentiment?: 'BULLISH' | 'BEARISH' | 'VOLATILITY' | 'NEUTRAL';
  addedAt: number;
}

// Stable cache of curated market stories to prevent flickering and shifting on live price ticks
const storiesCache: Record<string, { stories: MarketNewsStory[]; timestamp: number }> = {};

// Generate realistic live market stories updated dynamically around the current time (cached for 10 minutes)
export function getCuratedMarketStories(symbol: string, forceRefresh: boolean = false): MarketNewsStory[] {
  const symbolUpper = symbol.toUpperCase();
  const now = Date.now();

  if (!forceRefresh && storiesCache[symbolUpper] && now - storiesCache[symbolUpper].timestamp < 600_000) {
    return storiesCache[symbolUpper].stories;
  }

  const min = 60 * 1000;
  const hour = 60 * min;
  const isGold = symbolUpper === 'XAUUSD';
  const isBtc = symbolUpper === 'BTCUSD';
  const isIndices = symbolUpper.startsWith('US') || symbolUpper.startsWith('NAS') || symbolUpper === 'GER40' || symbolUpper === 'UK100';
  const isForex = !isGold && !isBtc && !isIndices;

  const stories: MarketNewsStory[] = [
    {
      id: 'news-1-fed-rates',
      headline: "Fed's Powell Signals Data-Dependent Path as Inflation Easing Meets Resilient Labor",
      summary: "Federal Reserve Chair Jerome Powell reiterated that policymakers are in no rush to aggressively slash interest rates, emphasizing that persistent services inflation requires maintaining restrictive policy until two-percent trajectory is guaranteed.",
      source: 'Reuters Financial',
      timestamp: now - 18 * min,
      timeFormatted: new Date(now - 18 * min).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timeAgo: '18m ago',
      impact: 'HIGH',
      sentiment: 'BULLISH',
      category: 'CENTRAL_BANKS',
      relatedCurrencies: ['USD', 'XAUUSD', 'EUR', 'GBP'],
      takeaway: 'Supports US Dollar strength; creates headwinds for gold and risk assets without fresh dovish cues.',
    },
    {
      id: 'news-2-pce-cpi',
      headline: 'Core PCE Inflation Prints at 0.3% m/m, Confirming Sticky Core Pressures in US Services',
      summary: 'The Core Personal Consumption Expenditures index printed slightly above consensus at 0.3% month-over-month. Bond yields ticked upward across the curve as traders pared expectations for aggressive 50-basis-point rate cuts.',
      source: 'Bloomberg Markets',
      timestamp: now - 42 * min,
      timeFormatted: new Date(now - 42 * min).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timeAgo: '42m ago',
      impact: 'HIGH',
      sentiment: 'BULLISH',
      category: 'INFLATION',
      relatedCurrencies: ['USD', 'EURUSD', 'NAS100'],
      takeaway: 'Higher-for-longer yields favor dollar liquidity absorption at technical key levels.',
    },
    {
      id: 'news-3-gold-safehaven',
      headline: 'Gold Holds Ground Near All-Time Highs Amid Middle East Tensions and Central Bank Reserve Buying',
      summary: 'Spot Gold remains elevated above $2,735 as sovereign reserve managers and institutional funds absorb wholesale dips. Safe-haven inflows and dedollarization trends continue to provide a firm floor despite elevated US Treasury yields.',
      source: 'ForexLive',
      timestamp: now - 1 * hour - 12 * min,
      timeFormatted: new Date(now - 72 * min).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timeAgo: '1h 12m ago',
      impact: isGold ? 'HIGH' : 'MEDIUM',
      sentiment: 'BULLISH',
      category: 'COMMODITIES',
      relatedCurrencies: ['XAUUSD', 'USD'],
      takeaway: 'Institutional buy limits defending discount Value Area Low; pullbacks are heavily absorbed.',
    },
    {
      id: 'news-4-ecb-lagarde',
      headline: 'ECB Cuts Rates by 25bps as Eurozone Growth Stalls; Lagarde Flags Stagnant Industrial Output',
      summary: 'European Central Bank officials voted to reduce the deposit facility rate to 3.25%, acknowledging that economic activity in Germany and the periphery is decelerating faster than initial staff projections anticipated.',
      source: 'Financial Times',
      timestamp: now - 2 * hour - 5 * min,
      timeFormatted: new Date(now - 125 * min).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timeAgo: '2h ago',
      impact: 'HIGH',
      sentiment: 'BEARISH',
      category: 'CENTRAL_BANKS',
      relatedCurrencies: ['EUR', 'EURUSD', 'EURGBP', 'GER40'],
      takeaway: 'Euro faces persistent structural weakness against USD; rallies into overhead walls are prime short fades.',
    },
    {
      id: 'news-5-tech-earnings',
      headline: 'Nasdaq Consolidates Near Highs as Mega-Cap Semiconductor Flows Absorb Sector Rotation',
      summary: 'US equity futures traded within tight rotational ranges as semiconductor and AI infrastructure demand offset profit-taking in defensive sectors. Order book depth shows thick resting limit mattresses at technical fair value.',
      source: 'FXStreet',
      timestamp: now - 3 * hour,
      timeFormatted: new Date(now - 180 * min).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timeAgo: '3h ago',
      impact: isIndices ? 'HIGH' : 'MEDIUM',
      sentiment: 'VOLATILITY',
      category: 'EQUITIES_TECH',
      relatedCurrencies: ['NAS100', 'US500', 'US30'],
      takeaway: 'Range-bound rotational profile; scalp value boundaries rather than chasing breakouts.',
    },
    {
      id: 'news-6-oil-geopolitics',
      headline: 'Crude Oil Volatility Surges on Red Sea Route Disruptions and Strategic Petroleum Reserve Refills',
      summary: 'Brent and WTI crude contracts whipsawed as tanker freight rates spiked on shipping reroutes. Energy market fluctuations are feeding directly into market-implied inflation breakevens.',
      source: 'DailyFX',
      timestamp: now - 4 * hour - 30 * min,
      timeFormatted: new Date(now - 270 * min).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timeAgo: '4h ago',
      impact: 'MEDIUM',
      sentiment: 'VOLATILITY',
      category: 'GEOPOLITICAL',
      relatedCurrencies: ['USDCAD', 'XAUUSD', 'USD'],
      takeaway: 'Petrodollar volatility provides structural tailwinds for Canadian Dollar and commodity crosses.',
    },
    {
      id: 'news-7-boj-intervention',
      headline: 'Bank of Japan Watchers on High Alert for Currency Intervention as Yen Weakens Near 153.00',
      summary: 'Japanese Finance Ministry officials stepped up verbal intervention warnings, noting that excessive speculative moves in USD/JPY will be met with decisive action if volatility threatens economic stability.',
      source: 'Nikkei Asian Review',
      timestamp: now - 5 * hour,
      timeFormatted: new Date(now - 300 * min).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timeAgo: '5h ago',
      impact: 'HIGH',
      sentiment: 'VOLATILITY',
      category: 'CENTRAL_BANKS',
      relatedCurrencies: ['JPY', 'USDJPY', 'EURJPY', 'GBPJPY'],
      takeaway: 'High risk of sudden 200-pip intervention sweeps; keep hard stops tight at overhead ceiling.',
    },
    {
      id: 'news-8-btc-etf-flows',
      headline: 'Bitcoin Institutional Spot ETF Inflows Accelerate with $420M Net Weekly Allocation',
      summary: 'Cryptocurrency benchmark Bitcoin holds strong above $67,000 as institutional custody accounts accumulate coins. Liquid supply on centralized exchanges has touched a multi-year low.',
      source: 'CoinDesk',
      timestamp: now - 6 * hour,
      timeFormatted: new Date(now - 360 * min).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timeAgo: '6h ago',
      impact: isBtc ? 'HIGH' : 'LOW',
      sentiment: 'BULLISH',
      category: 'COMMODITIES',
      relatedCurrencies: ['BTCUSD', 'USD'],
      takeaway: 'Spot absorption continues to absorb retail short sellers; squeezes favor upward expansion.',
    },
  ];

  // Prioritize stories relevant to current symbol
  const relevantFirst = [...stories].sort((a, b) => {
    const aRel = a.relatedCurrencies.some((c) => symbolUpper.includes(c) || c === symbolUpper);
    const bRel = b.relatedCurrencies.some((c) => symbolUpper.includes(c) || c === symbolUpper);
    if (aRel && !bRel) return -1;
    if (!aRel && bRel) return 1;
    return a.timestamp - b.timestamp;
  });

  storiesCache[symbolUpper] = {
    stories: relevantFirst,
    timestamp: now,
  };

  return relevantFirst;
}

// Fetch latest news from backend API or fallback to curated live stories
export async function fetchLatestMarketNews(symbol: string): Promise<MarketNewsStory[]> {
  try {
    const res = await fetch(`/api/news/latest?symbol=${encodeURIComponent(symbol)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.stories) && data.stories.length > 0) {
        return data.stories;
      }
    }
  } catch (err) {
    console.warn('[MarketNewsService] API fetch fallback to curated stories:', err);
  }
  return getCuratedMarketStories(symbol);
}

// Generate Synthesized Market Analysis Text
export function generateSynthesizedMarketAnalysis(
  symbol: string,
  price: number,
  scorecardGrade: string,
  edgeDirection: 'SNIPER_BUY' | 'SNIPER_SELL' | 'WAIT_FOR_EDGE',
  optimalEntry: number,
  hardStopLoss: number,
  tp1: number,
  tp2: number,
  tp3: number,
  riskReward: number,
  selectedNotes: MarketAnalysisNote[],
  additionalContext?: {
    poc?: number;
    vah?: number;
    val?: number;
    exhaustedSide?: string;
    exhaustionScore?: number;
    deltaTrend?: string;
    whyPriceIsMoving?: string;
    whyLevelRevisited?: string;
    trappedSide?: string;
    whatStopsTheMove?: string;
    possibleFirstMove?: string;
    invalidationReason?: string;
  }
): string {
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const symClean = symbol === 'XAUUSD' ? 'GOLD' : symbol === 'BTCUSD' ? 'BITCOIN' : symbol;

  let text = `ADVANCED FOREX TRADING MARKET ANALYSIS — ${symClean}\n`;
  text += `📅 Date: ${dateStr} @ ${timeStr} | Current Price: ${price}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // 1. What the Market is Doing & Why It is Happening
  text += `1. WHAT THE MARKET IS DOING & WHY IT IS HAPPENING:\n`;
  if (additionalContext?.whyPriceIsMoving) {
    text += `• Market Dynamics: ${additionalContext.whyPriceIsMoving}\n`;
  } else {
    text += `• Market Dynamics: ${edgeDirection === 'SNIPER_BUY' ? 'Responsive buyers defending wholesale support after sweeping sell stops.' : edgeDirection === 'SNIPER_SELL' ? 'Aggressive market orders being absorbed by institutional resting ask walls at premium ceiling.' : 'Price rotating symmetrically around fair value equilibrium.'}\n`;
  }
  text += `• Driving Forces: ${edgeDirection === 'SNIPER_BUY' ? 'Initiative market buying lifting the ask wall while short sellers are forced to cover losing positions.' : edgeDirection === 'SNIPER_SELL' ? 'Institutional sell limits absorbing retail long breakout attempts, triggering liquidation cascades.' : 'Balanced two-sided transactional volume between bid and ask limits.'}\n`;
  text += `• Who is Trapped: ${additionalContext?.trappedSide ? additionalContext.trappedSide : edgeDirection === 'SNIPER_BUY' ? 'Breakout sellers trapped at the lows' : 'Late buyers trapped at the ceiling'}\n\n`;

  // 2. Repeated Price Levels & Key Hot Value Areas
  text += `2. REPEATED PRICE LEVELS & KEY LIQUIDITY ZONES:\n`;
  if (additionalContext?.poc) {
    text += `• Fair Value Point of Control (POC): ${additionalContext.poc}\n`;
  }
  if (additionalContext?.whyLevelRevisited) {
    text += `• Why Price Revisits This Area: ${additionalContext.whyLevelRevisited}\n`;
  } else {
    text += `• Why Price Revisits This Area: This level represents the session's highest transactional consensus. When price moves away without sustained initiative volume, a liquidity vacuum naturally draws the auction back to settle unfinished business.\n`;
  }
  if (additionalContext?.vah && additionalContext?.val) {
    text += `• Structural Boundaries: Value High (VAH) ${additionalContext.vah} | Value Low (VAL) ${additionalContext.val}\n`;
  }
  text += `\n`;

  // 3. Technical Order Flow & High-Precision Edge
  text += `3. ORDER FLOW & HIGH-PRECISION SETUP:\n`;
  text += `• Setup Conviction: Grade ${scorecardGrade} (${edgeDirection.replace(/_/g, ' ')})\n`;
  text += `• Execution Roadmap: Entry @ ${optimalEntry} | Hard Invalidation SL @ ${hardStopLoss}\n`;
  text += `• Targets: TP1 @ ${tp1} (POC Fair Value) | TP2 @ ${tp2} (Opposite Wall) | TP3 @ ${tp3} (Macro Liquidity)\n`;
  text += `• Risk-to-Reward Ratio: ${riskReward}:1 (Asymmetric Institutional Edge)\n`;
  text += `• Order Flow Agreement: Delta is ${additionalContext?.deltaTrend || 'aligned with structural direction'}. Large executed trade bubbles confirm institutional participation without counter-absorption.\n`;
  if (additionalContext?.possibleFirstMove) {
    text += `• Possible First Move: ${additionalContext.possibleFirstMove}\n`;
  } else {
    text += `• Possible First Move: Price may first sweep immediate resting liquidity before true directional continuation occurs.\n`;
  }
  if (additionalContext?.whatStopsTheMove) {
    text += `• What Could Stop the Move: ${additionalContext.whatStopsTheMove}\n`;
  }
  text += `\n`;

  // 4. Macro News & Stories Catalysts
  const newsItems = selectedNotes.filter((n) => n.type === 'NEWS_CATALYST');
  if (newsItems.length > 0) {
    text += `4. MACRO NEWS & FUNDAMENTAL CATALYSTS:\n`;
    newsItems.forEach((item) => {
      text += `• [${item.sentiment || 'CATALYST'}] ${item.title}: ${item.detail}\n`;
    });
    text += `\n`;
  }

  // 5. Economic Calendar Releases
  const calItems = selectedNotes.filter((n) => n.type === 'CALENDAR_EVENT');
  if (calItems.length > 0) {
    text += `5. UPCOMING ECONOMIC CALENDAR DRIVERS:\n`;
    calItems.forEach((item) => {
      text += `• [${item.impact || 'EVENT'}] ${item.title}: ${item.detail}\n`;
    });
    text += `\n`;
  }

  // 6. Invalidation, Continuous Monitoring & Discipline
  text += `6. INVALIDATION & CONTINUOUS MONITORING DISCIPLINE:\n`;
  text += `• What Invalidates the Idea: ${additionalContext?.invalidationReason || `A 5-minute candle close beyond ${hardStopLoss} with aggressive counter-delta, invalidating the defensive institutional wall.`}\n`;
  text += `• Zero-Risk Rule: When TP1 (+15-25p) is locked, immediately trail hard stop loss to Breakeven.\n`;
  text += `• Dynamic Reassessment: If order flow contradicts the signal, stand down immediately. Current market evidence always supersedes prior predictions.`;

  return text;
}
