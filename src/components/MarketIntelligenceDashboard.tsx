import React, { useState, useEffect } from 'react';
import { 
  MarketIntelligenceOutput, 
  EconomicCalendarEvent 
} from '../types/marketIntelligence';
import { InstrumentConfig } from '../services/mockDataGenerator';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Zap, 
  TrendingUp, 
  Flame, 
  Layers, 
  Activity, 
  Compass, 
  Clock, 
  Calendar, 
  FileText, 
  Crosshair, 
  Target, 
  Info, 
  CheckCircle2, 
  XCircle, 
  Gauge, 
  HelpCircle,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Scale,
  Radar,
  Newspaper,
  Copy,
  Plus,
  Check,
  Maximize2,
  Minimize2,
  Sparkles,
  Share2,
  Trash2,
  Search,
  ExternalLink
} from 'lucide-react';
import { 
  getCuratedMarketStories, 
  fetchLatestMarketNews, 
  generateSynthesizedMarketAnalysis, 
  MarketNewsStory, 
  MarketAnalysisNote 
} from '../services/marketNewsService';
import {
  fetchForexFactoryCalendar,
  generateCuratedMacroCalendar,
} from '../services/macroCalendarService';

interface MarketIntelligenceDashboardProps {
  intelligence: MarketIntelligenceOutput;
  instrument: InstrumentConfig;
  onOpenScorecard?: () => void;
  onSelectSymbol?: (symbol: string) => void;
}

export const MarketIntelligenceDashboard: React.FC<MarketIntelligenceDashboardProps> = ({
  intelligence,
  instrument,
  onOpenScorecard,
  onSelectSymbol,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'liquidity' | 'auction' | 'orderflow' | 'macro' | 'notrade'>('all');

  const {
    symbol,
    liquidity,
    absorption,
    volumeProfile,
    auction,
    orderFlow,
    participant,
    squeeze,
    shakeout,
    meanReversion,
    climactic,
    compression,
    regime,
    macroNews,
    entryEngine,
    whyPriceIsMoving,
    weights,
    dataQualityDisclosures,
  } = intelligence;

  const isNoTrade = entryEngine.direction === 'NO_TRADE' || !!whyPriceIsMoving.noTradeAdvisory?.isNoTrade;

  // Latest Stories & Macro Calendar Analysis State
  const [macroCardTab, setMacroCardTab] = useState<'stories' | 'calendar' | 'analysis'>('stories');
  const [newsStories, setNewsStories] = useState<MarketNewsStory[]>(() => getCuratedMarketStories(intelligence.symbol));
  const [calendarEvents, setCalendarEvents] = useState<EconomicCalendarEvent[]>(() =>
    macroNews.upcomingEvents.length > 0 ? macroNews.upcomingEvents : generateCuratedMacroCalendar(intelligence.symbol)
  );
  const [calendarSortOrder, setCalendarSortOrder] = useState<'LATEST_TO_NEWEST' | 'NEWEST_TO_LATEST'>('LATEST_TO_NEWEST');
  const [selectedAnalysisNotes, setSelectedAnalysisNotes] = useState<MarketAnalysisNote[]>([]);
  const [isCopiedAnalysis, setIsCopiedAnalysis] = useState<boolean>(false);
  const [isMacroModalExpanded, setIsMacroModalExpanded] = useState<boolean>(false);
  const [storyCategoryFilter, setStoryCategoryFilter] = useState<string>('ALL');

  useEffect(() => {
    setNewsStories(getCuratedMarketStories(intelligence.symbol));
    setCalendarEvents(generateCuratedMacroCalendar(intelligence.symbol));
    fetchLatestMarketNews(intelligence.symbol).then((stories) => {
      if (stories && stories.length > 0) {
        setNewsStories(stories);
      }
    });
    fetchForexFactoryCalendar(intelligence.symbol).then((events) => {
      if (events && events.length > 0) {
        setCalendarEvents(events);
      }
    });
  }, [intelligence.symbol]);

  const sortedCalendarEvents = calendarEvents.slice().sort((a, b) =>
    calendarSortOrder === 'LATEST_TO_NEWEST' ? a.eventTime - b.eventTime : b.eventTime - a.eventTime
  );

  const formatCountdownLabel = (mins: number) => {
    if (mins <= 0) {
      const ago = Math.abs(mins);
      if (ago < 60) return `Released ${ago}m ago`;
      const hrs = Math.floor(ago / 60);
      return hrs < 24 ? `Released ${hrs}h ago` : `Released ${Math.floor(hrs / 24)}d ago`;
    }
    if (mins < 60) return `in ${mins}m`;
    const hrs = Math.floor(mins / 60);
    const remM = mins % 60;
    if (hrs < 24) return remM > 0 ? `in ${hrs}h ${remM}m` : `in ${hrs}h`;
    const days = Math.floor(hrs / 24);
    const remH = hrs % 24;
    return remH > 0 ? `in ${days}d ${remH}h` : `in ${days}d`;
  };

  const handleToggleAddStoryToAnalysis = (story: MarketNewsStory) => {
    setSelectedAnalysisNotes((prev) => {
      const exists = prev.some((n) => n.id === story.id);
      if (exists) {
        return prev.filter((n) => n.id !== story.id);
      }
      const newNote: MarketAnalysisNote = {
        id: story.id,
        symbol: intelligence.symbol,
        title: story.headline,
        type: 'NEWS_CATALYST',
        detail: `${story.source}: ${story.takeaway}`,
        impact: story.impact,
        sentiment: story.sentiment,
        addedAt: Date.now(),
      };
      return [...prev, newNote];
    });
  };

  const handleToggleAddEventToAnalysis = (ev: EconomicCalendarEvent) => {
    setSelectedAnalysisNotes((prev) => {
      const exists = prev.some((n) => n.id === ev.id);
      if (exists) {
        return prev.filter((n) => n.id !== ev.id);
      }
      const newNote: MarketAnalysisNote = {
        id: ev.id,
        symbol: intelligence.symbol,
        title: `${ev.currency} ${ev.eventTitle}`,
        type: 'CALENDAR_EVENT',
        detail: `Exp: ${ev.forecast || 'N/A'}, Prev: ${ev.previous || 'N/A'}${ev.actual ? `, Act: ${ev.actual}` : ''} (${ev.timeUntilMinutes <= 0 ? 'Released' : `in ${ev.timeUntilMinutes}m`})`,
        impact: ev.impact,
        sentiment: ev.surpriseValue && ev.surpriseValue > 0 ? 'BULLISH' : 'NEUTRAL',
        addedAt: Date.now(),
      };
      return [...prev, newNote];
    });
  };

  const handleQuickAddAllTopCatalysts = () => {
    const topStories = newsStories.slice(0, 2);
    const topEvents = macroNews.upcomingEvents.slice(0, 2);
    const newNotes: MarketAnalysisNote[] = [];

    topStories.forEach((story) => {
      if (!selectedAnalysisNotes.some((n) => n.id === story.id)) {
        newNotes.push({
          id: story.id,
          symbol: intelligence.symbol,
          title: story.headline,
          type: 'NEWS_CATALYST',
          detail: `${story.source}: ${story.takeaway}`,
          impact: story.impact,
          sentiment: story.sentiment,
          addedAt: Date.now(),
        });
      }
    });

    topEvents.forEach((ev) => {
      if (!selectedAnalysisNotes.some((n) => n.id === ev.id)) {
        newNotes.push({
          id: ev.id,
          symbol: intelligence.symbol,
          title: `${ev.currency} ${ev.eventTitle}`,
          type: 'CALENDAR_EVENT',
          detail: `Exp: ${ev.forecast || 'N/A'}, Prev: ${ev.previous || 'N/A'} (in ${ev.timeUntilMinutes}m)`,
          impact: ev.impact,
          sentiment: 'NEUTRAL',
          addedAt: Date.now(),
        });
      }
    });

    setSelectedAnalysisNotes((prev) => [...prev, ...newNotes]);
    setMacroCardTab('analysis');
  };

  const handleCopyAnalysis = () => {
    const edge = entryEngine.setupType.includes('ABSORPTION') ? 'SNIPER_BUY' : 'SNIPER_SELL';
    const text = generateSynthesizedMarketAnalysis(
      intelligence.symbol,
      instrument.basePrice,
      'A+',
      edge,
      entryEngine.entryZone.low,
      entryEngine.invalidationLevel,
      entryEngine.targetZones[0]?.price || 0,
      entryEngine.targetZones[1]?.price || 0,
      entryEngine.targetZones[2]?.price || 0,
      entryEngine.targetZones[1]?.rrRatio || 2.4,
      selectedAnalysisNotes
    );
    navigator.clipboard.writeText(text);
    setIsCopiedAnalysis(true);
    setTimeout(() => setIsCopiedAnalysis(false), 2500);
  };

  const handleClearAnalysis = () => {
    setSelectedAnalysisNotes([]);
  };

  const filteredNewsStories = storyCategoryFilter === 'ALL'
    ? newsStories
    : newsStories.filter((s) => s.category === storyCategoryFilter);

  return (
    <div className="flex flex-col gap-4 text-slate-100 font-sans select-none">
      {/* ========================================================
          1. TOP HEADLINE: "WHY IS PRICE MOVING?" & MARKET CONTROL
         ======================================================== */}
      <div className={`p-4 rounded-xl border transition-all ${
        isNoTrade
          ? 'bg-gradient-to-r from-[#171a24] via-[#101522] to-[#0c101c] border-amber-500/40 shadow-lg shadow-amber-950/20'
          : whyPriceIsMoving.marketControl.dominantController === 'BUYERS'
          ? 'bg-gradient-to-r from-[#051c14] via-[#091f24] to-[#0b1322] border-emerald-500/40 shadow-lg shadow-emerald-950/20'
          : 'bg-gradient-to-r from-[#1c080d] via-[#200c19] to-[#0b1322] border-red-500/40 shadow-lg shadow-red-950/20'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            {/* Status Icon */}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl shrink-0 ${
              isNoTrade 
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                : whyPriceIsMoving.marketControl.dominantController === 'BUYERS'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                : 'bg-red-500/20 text-red-400 border border-red-500/50'
            }`}>
              {isNoTrade ? <AlertTriangle className="w-6 h-6" /> : <Activity className="w-6 h-6" />}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[11px] font-mono font-extrabold uppercase px-2.5 py-0.5 rounded tracking-wide ${
                  isNoTrade 
                    ? 'bg-amber-950 text-amber-300 border border-amber-500/40' 
                    : 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                }`}>
                  {whyPriceIsMoving.movementStatus.replace('_', ' ')}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Regime: <strong className="text-white">{regime.regimeLabel}</strong>
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Data Tier: <span className="text-cyan-400 font-bold px-1.5 py-0.2 rounded bg-cyan-950/60 border border-cyan-500/30">{dataQualityDisclosures.overallTier}</span>
                </span>
              </div>

              <h2 className="text-base sm:text-lg font-bold text-white mt-1">
                {whyPriceIsMoving.headline}
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-4xl leading-relaxed">
                <strong className="text-cyan-400">Primary: </strong>{whyPriceIsMoving.primaryReason}{' '}
                <span className="text-slate-400"><strong className="text-slate-300">Secondary: </strong>{whyPriceIsMoving.secondaryReason}</span>
              </p>
            </div>
          </div>

          {/* Market Control Percentage Gauge (§24) */}
          <div className="flex items-center gap-3 shrink-0 bg-[#080d16] p-3 rounded-lg border border-[#1b263c]">
            <div className="flex flex-col text-right">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Market Control</span>
              <span className={`text-sm font-extrabold ${
                whyPriceIsMoving.marketControl.dominantController === 'BUYERS'
                  ? 'text-emerald-400'
                  : whyPriceIsMoving.marketControl.dominantController === 'SELLERS'
                  ? 'text-red-400'
                  : 'text-amber-400'
              }`}>
                {whyPriceIsMoving.marketControl.dominantController} ({whyPriceIsMoving.marketControl.confidence}%)
              </span>
            </div>

            <div className="w-36 flex flex-col gap-1">
              <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden flex">
                <div 
                  className="bg-emerald-500 h-full transition-all" 
                  style={{ width: `${whyPriceIsMoving.marketControl.buyersPct}%` }}
                  title={`Buyers: ${whyPriceIsMoving.marketControl.buyersPct}%`}
                />
                <div 
                  className="bg-amber-500 h-full transition-all opacity-80" 
                  style={{ width: `${whyPriceIsMoving.marketControl.uncertainPct}%` }}
                  title={`Uncertainty: ${whyPriceIsMoving.marketControl.uncertainPct}%`}
                />
                <div 
                  className="bg-red-500 h-full transition-all" 
                  style={{ width: `${whyPriceIsMoving.marketControl.sellersPct}%` }}
                  title={`Sellers: ${whyPriceIsMoving.marketControl.sellersPct}%`}
                />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-slate-400">
                <span className="text-emerald-400 font-bold">B: {whyPriceIsMoving.marketControl.buyersPct}%</span>
                <span className="text-amber-400">?: {whyPriceIsMoving.marketControl.uncertainPct}%</span>
                <span className="text-red-400 font-bold">S: {whyPriceIsMoving.marketControl.sellersPct}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Recommendation Bar */}
        <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-bold font-mono">ACTION GUIDANCE:</span>
            <span className="text-slate-200">{whyPriceIsMoving.actionGuidance}</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
            {whyPriceIsMoving.whyBullets.map((b, i) => (
              <span key={i} className="px-2 py-0.5 rounded bg-black/30 border border-white/5 text-slate-300">
                • {b}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* No-Trade Caution Banner if Active (§18) */}
      {isNoTrade && (
        <div className="p-3.5 rounded-lg bg-[#1f160e] border border-amber-500/50 shadow-md flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <div className="font-bold text-amber-300 uppercase tracking-wide flex items-center gap-2">
              <span>NO-TRADE INTELLIGENCE FILTER ACTIVE — STAND DOWN</span>
              <span className="text-[10px] font-normal px-2 py-0.2 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30">
                Capital Preservation Protocol
              </span>
            </div>
            <p className="text-slate-300 mt-1">
              Conflicting order-flow or high-risk structural conditions detected. The intelligence engine advises against directional entries:
            </p>
            <ul className="mt-1.5 space-y-1 text-amber-200/90 font-mono text-[11px]">
              {entryEngine.warnings.map((w, idx) => (
                <li key={idx} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ========================================================
          2. FILTER TABS FOR SUB-ENGINES
         ======================================================== */}
      <div className="flex items-center gap-1.5 border-b border-[#1b253b] pb-2 text-xs font-semibold overflow-x-auto scrollbar-none whitespace-nowrap touch-pan-x">
        <button
          onClick={() => setActiveSubTab('all')}
          className={`px-3 py-1.5 rounded transition-colors ${
            activeSubTab === 'all'
              ? 'bg-[#1b263b] text-cyan-300 border border-cyan-500/40 shadow-xs'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          All 6 Intelligence Engines
        </button>
        <button
          onClick={() => setActiveSubTab('liquidity')}
          className={`px-3 py-1.5 rounded transition-colors ${
            activeSubTab === 'liquidity'
              ? 'bg-[#1b263b] text-cyan-300 border border-cyan-500/40 shadow-xs'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Liquidity & Spoofing ({liquidity.spoofDetector.spoofProbability.toFixed(2)})
        </button>
        <button
          onClick={() => setActiveSubTab('auction')}
          className={`px-3 py-1.5 rounded transition-colors ${
            activeSubTab === 'auction'
              ? 'bg-[#1b263b] text-cyan-300 border border-cyan-500/40 shadow-xs'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Auction & Volume Profile
        </button>
        <button
          onClick={() => setActiveSubTab('orderflow')}
          className={`px-3 py-1.5 rounded transition-colors ${
            activeSubTab === 'orderflow'
              ? 'bg-[#1b263b] text-cyan-300 border border-cyan-500/40 shadow-xs'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Delta, CVD & Squeeze
        </button>
        <button
          onClick={() => setActiveSubTab('macro')}
          className={`px-3 py-1.5 rounded transition-colors ${
            activeSubTab === 'macro'
              ? 'bg-[#1b263b] text-cyan-300 border border-cyan-500/40 shadow-xs'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          ForexFactory Macro ({macroNews.eventRisk})
        </button>
        <button
          onClick={() => setActiveSubTab('notrade')}
          className={`px-3 py-1.5 rounded transition-colors ${
            activeSubTab === 'notrade'
              ? 'bg-[#1b263b] text-cyan-300 border border-cyan-500/40 shadow-xs'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Entry & No-Trade Sanity
        </button>
      </div>

      {/* ========================================================
          3. MAIN INTELLIGENCE GRID CARDS
         ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {/* CARD 1: LIQUIDITY & SPOOFING DETECTOR (§2 & §3) */}
        {(activeSubTab === 'all' || activeSubTab === 'liquidity') && (
          <div className="p-4 rounded-xl bg-[#0c121e] border border-[#1b263c] flex flex-col justify-between shadow-md">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-[#172236] pb-2 mb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-cyan-400" />
                  <span>Liquidity & Spoofing</span>
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  liquidity.spoofDetector.spoofProbability >= 0.50 
                    ? 'bg-red-950 text-red-300 border border-red-500/40' 
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                }`}>
                  Spoof Prob: {Math.round(liquidity.spoofDetector.spoofProbability * 100)}%
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-2.5 rounded bg-[#101726] border border-[#1d2940]">
                  <div className="text-[11px] text-slate-400">Order Stability Assessment</div>
                  <div className="text-sm font-bold text-white mt-0.5 flex items-center justify-between">
                    <span>{liquidity.spoofDetector.headline}</span>
                    <span className="text-xs font-mono text-cyan-300">{liquidity.orderPersistence}% Persistence</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded bg-[#0e1524] border border-[#172238]">
                    <span className="text-slate-400">Cancellation Rate</span>
                    <div className="text-sm font-bold text-amber-300 mt-0.5">{liquidity.cancellationRate}%</div>
                  </div>
                  <div className="p-2 rounded bg-[#0e1524] border border-[#172238]">
                    <span className="text-slate-400">Pull on Approach</span>
                    <div className="text-sm font-bold text-red-300 mt-0.5">{liquidity.spoofDetector.pullOnApproachRate}%</div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400">
                  <div className="font-semibold text-slate-300 mb-1">Resting Walls Distance:</div>
                  <div className="flex justify-between font-mono">
                    <span>Overhead Ask Wall:</span>
                    <span className="text-red-400 font-bold">{liquidity.distanceToMajorLiquidity.abovePips} pips ({liquidity.distanceToMajorLiquidity.abovePrice.toFixed(instrument.digits)})</span>
                  </div>
                  <div className="flex justify-between font-mono mt-0.5">
                    <span>Underlying Bid Wall:</span>
                    <span className="text-emerald-400 font-bold">{liquidity.distanceToMajorLiquidity.belowPips} pips ({liquidity.distanceToMajorLiquidity.belowPrice.toFixed(instrument.digits)})</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-[#172236] text-[10px] text-slate-400 flex items-center justify-between">
              <span>Replenishment: <strong className="text-cyan-300">{liquidity.replenishmentBehavior}</strong></span>
              <span>Absorption: <strong className="text-amber-300">{liquidity.liquidityAbsorptionScore}/100</strong></span>
            </div>
          </div>
        )}

        {/* CARD 2: ABSORPTION & EFFORT VS RESULT (§4) */}
        {(activeSubTab === 'all' || activeSubTab === 'liquidity' || activeSubTab === 'auction') && (
          <div className="p-4 rounded-xl bg-[#0c121e] border border-[#1b263c] flex flex-col justify-between shadow-md">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-[#172236] pb-2 mb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-amber-400" />
                  <span>Absorption Engine</span>
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  absorption.absorptionScore >= 75
                    ? 'bg-amber-950 text-amber-300 border border-amber-500/40 animate-pulse'
                    : 'bg-slate-900 text-slate-400 border border-slate-700'
                }`}>
                  Score: {absorption.absorptionScore}/100
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-2.5 rounded bg-[#101726] border border-[#1d2940]">
                  <div className="text-[11px] text-slate-400">Directional Absorption State</div>
                  <div className="text-sm font-bold text-amber-300 mt-0.5">
                    {absorption.absorptionDirection.replace(/_/g, ' ')}
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    {absorption.summary}
                  </div>
                </div>

                <div className="p-2 rounded bg-[#0e1524] border border-[#172238] space-y-1 text-[11px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Effort (Delta Z-Score):</span>
                    <span className="text-white font-bold">{absorption.aggressiveDeltaVsPriceProgress.deltaZScore}σ</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Result (Price Progress):</span>
                    <span className="text-cyan-300 font-bold">{absorption.aggressiveDeltaVsPriceProgress.priceProgressionPips} pips</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Effort Without Result:</span>
                    <span className={absorption.aggressiveDeltaVsPriceProgress.isEffortWithoutResult ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                      {absorption.aggressiveDeltaVsPriceProgress.isEffortWithoutResult ? 'YES (FADE TRAP)' : 'NO (CORRELATED)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-[#172236] text-[10px] text-slate-400 flex items-center justify-between">
              <span>Confidence: <strong className="text-emerald-400">{absorption.absorptionConfidence}%</strong></span>
              <span>Absorbed Vol: <strong className="text-white font-mono">{absorption.absorbedVolume} lots</strong></span>
            </div>
          </div>
        )}

        {/* CARD 3: VOLUME PROFILE & LVN TRANSIT (§5) */}
        {(activeSubTab === 'all' || activeSubTab === 'auction') && (
          <div className="p-4 rounded-xl bg-[#0c121e] border border-[#1b263c] flex flex-col justify-between shadow-md">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-[#172236] pb-2 mb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>Volume Profile & LVN</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/40 font-bold">
                  VA Width: {volumeProfile.valueAreaWidthPips}p
                </span>
              </div>

              <div className="space-y-2.5 text-xs font-mono">
                <div className="p-2.5 rounded bg-[#101726] border border-[#1d2940]">
                  <div className="flex justify-between text-slate-300 text-xs">
                    <span>VAH (Value High):</span>
                    <span className="text-amber-400 font-bold">{volumeProfile.vah.toFixed(instrument.digits)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300 text-xs mt-1">
                    <span>POC (Fair Value):</span>
                    <span className="text-cyan-400 font-bold">{volumeProfile.poc.toFixed(instrument.digits)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300 text-xs mt-1">
                    <span>VAL (Value Low):</span>
                    <span className="text-amber-400 font-bold">{volumeProfile.val.toFixed(instrument.digits)}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-[#0e1524] border border-[#172238] font-sans text-xs">
                  <div className="text-[11px] font-mono text-purple-300 font-bold flex items-center justify-between">
                    <span>Low Volume Node (LVN) Transit</span>
                    <span>{volumeProfile.lvnState.transitProbability}% Speed</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed font-sans">
                    {volumeProfile.lvnState.behaviorInterpretation}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-[#172236] text-[10px] text-slate-400 flex items-center justify-between font-mono">
              <span>Distance to POC: <strong className="text-cyan-300">{volumeProfile.distanceFromPocPips} pips</strong></span>
              <span>HVN Status: <strong className="text-amber-300">{volumeProfile.hvnAcceptance.currentStatus}</strong></span>
            </div>
          </div>
        )}

        {/* CARD 4: AUCTION ENGINE & FAILED AUCTION (§6) */}
        {(activeSubTab === 'all' || activeSubTab === 'auction') && (
          <div className="p-4 rounded-xl bg-[#0c121e] border border-[#1b263c] flex flex-col justify-between shadow-md">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-[#172236] pb-2 mb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-emerald-400" />
                  <span>Auction Engine</span>
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  auction.failedAuction.failedAuctionScore >= 70
                    ? 'bg-red-950 text-red-300 border border-red-500/40'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                }`}>
                  {auction.auctionState.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-2.5 rounded bg-[#101726] border border-[#1d2940]">
                  <div className="text-[11px] text-slate-400">Current Auction Behavior</div>
                  <div className="text-xs text-slate-200 mt-1 leading-relaxed">
                    {auction.auctionStateDescription}
                  </div>
                </div>

                <div className="p-2.5 rounded bg-[#0e1524] border border-[#172238]">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Failed Auction Score:</span>
                    <span className={`font-bold ${auction.failedAuction.failedAuctionScore >= 70 ? 'text-red-400 font-extrabold' : 'text-slate-300'}`}>
                      {auction.failedAuction.failedAuctionScore}/100
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono mt-1">
                    <span className="text-slate-400">Direction:</span>
                    <span className="text-cyan-300 font-bold">{auction.failedAuction.failedAuctionDirection}</span>
                  </div>
                  {auction.failedAuction.supportingEvidence.length > 0 && (
                    <div className="mt-1.5 pt-1.5 border-t border-[#172236] text-[10px] text-slate-400">
                      {auction.failedAuction.supportingEvidence[0]}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-[#172236] text-[10px] text-slate-400 flex items-center justify-between">
              <span>Confidence: <strong className="text-white">{auction.failedAuction.failedAuctionConfidence}%</strong></span>
              <span>Rejection Speed: <strong className="text-cyan-300">Fast (&lt;15s)</strong></span>
            </div>
          </div>
        )}

        {/* CARD 5: DELTA & CUMULATIVE VOLUME DELTA (CVD) (§7 & §8) */}
        {(activeSubTab === 'all' || activeSubTab === 'orderflow') && (
          <div className="p-4 rounded-xl bg-[#0c121e] border border-[#1b263c] flex flex-col justify-between shadow-md">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-[#172236] pb-2 mb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <span>Order Flow & CVD</span>
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  orderFlow.cvdDivergence.type.includes('DIVERGENCE')
                    ? 'bg-purple-950 text-purple-300 border border-purple-500/40 animate-pulse'
                    : 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                }`}>
                  {orderFlow.cvdDivergence.type}
                </span>
              </div>

              <div className="space-y-2.5 text-xs font-mono">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded bg-[#101726] border border-[#1d2940]">
                    <span className="text-[10px] text-slate-400">Current Candle Delta</span>
                    <div className={`text-base font-bold mt-0.5 ${orderFlow.delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {orderFlow.delta >= 0 ? `+${orderFlow.delta}` : orderFlow.delta}
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-[#101726] border border-[#1d2940]">
                    <span className="text-[10px] text-slate-400">Cumulative Delta (CVD)</span>
                    <div className={`text-base font-bold mt-0.5 ${orderFlow.cvd >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {orderFlow.cvd >= 0 ? `+${orderFlow.cvd}` : orderFlow.cvd}
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-[#0e1524] border border-[#172238] font-sans">
                  <div className="text-[11px] font-mono font-bold text-slate-300 flex items-center justify-between">
                    <span>CVD Trend & Acceleration</span>
                    <span className="text-cyan-400">{orderFlow.deltaAcceleration}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    {orderFlow.cvdDivergence.detail}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-[#172236] text-[10px] text-slate-400 flex items-center justify-between font-mono">
              <span>CVD Slope: <strong className="text-white">{orderFlow.cvdSlope}</strong></span>
              <span>Imbalance Ratio: <strong className="text-cyan-300">{orderFlow.deltaImbalanceRatio}:1</strong></span>
            </div>
          </div>
        )}

        {/* CARD 6: SQUEEZE & SHAKEOUT ENGINE (§10 & §11) */}
        {(activeSubTab === 'all' || activeSubTab === 'orderflow') && (
          <div className="p-4 rounded-xl bg-[#0c121e] border border-[#1b263c] flex flex-col justify-between shadow-md">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-[#172236] pb-2 mb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Squeeze & Shakeout</span>
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  squeeze.activeSqueeze !== 'NONE'
                    ? 'bg-amber-950 text-amber-300 border border-amber-500/40 animate-pulse'
                    : 'bg-slate-900 text-slate-400 border border-slate-700'
                }`}>
                  {squeeze.activeSqueeze !== 'NONE' ? squeeze.activeSqueeze.replace(/_/g, ' ') : 'NO SQUEEZE'}
                </span>
              </div>

              <div className="space-y-2.5 text-xs font-mono">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded bg-[#101726] border border-[#1d2940]">
                    <span className="text-[10px] text-slate-400">Short Squeeze Score</span>
                    <div className="text-sm font-bold text-amber-400 mt-0.5">{squeeze.shortSqueezeScore}%</div>
                  </div>
                  <div className="p-2 rounded bg-[#101726] border border-[#1d2940]">
                    <span className="text-[10px] text-slate-400">Long Squeeze Score</span>
                    <div className="text-sm font-bold text-cyan-400 mt-0.5">{squeeze.longSqueezeScore}%</div>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-[#0e1524] border border-[#172238] font-sans">
                  <div className="text-[11px] font-mono font-bold text-slate-300 flex items-center justify-between">
                    <span>Shakeout Status</span>
                    <span className={shakeout.isConfirmedShakeout ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                      {shakeout.shakeoutDirection}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    {shakeout.explanation}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-[#172236] text-[10px] text-slate-400 flex items-center justify-between">
              <span>Trapped Longs: <strong className="text-red-400 font-mono">{participant.trappedBuyersPct}%</strong></span>
              <span>Trapped Shorts: <strong className="text-emerald-400 font-mono">{participant.trappedSellersPct}%</strong></span>
            </div>
          </div>
        )}

        {/* CARD 7: MEAN REVERSION & FAIR VALUE EXTENSION (§12) */}
        {(activeSubTab === 'all' || activeSubTab === 'auction') && (
          <div className="p-4 rounded-xl bg-[#0c121e] border border-[#1b263c] flex flex-col justify-between shadow-md">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-[#172236] pb-2 mb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-blue-400" />
                  <span>Mean Reversion Engine</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-500/40 font-bold">
                  {meanReversion.normalizedDeviationZScore}σ Deviation
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-2.5 rounded bg-[#101726] border border-[#1d2940]">
                  <div className="text-[11px] text-slate-400">Extension Condition</div>
                  <div className="text-sm font-bold text-blue-300 mt-0.5">
                    {meanReversion.marketCondition.replace(/_/g, ' ')}
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    {meanReversion.rationale}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded bg-[#0e1524] border border-[#172238]">
                    <span className="text-slate-400">Mean Revert Prob</span>
                    <div className="text-sm font-bold text-blue-300 mt-0.5">{meanReversion.meanReversionProbability}%</div>
                  </div>
                  <div className="p-2 rounded bg-[#0e1524] border border-[#172238]">
                    <span className="text-slate-400">Reversion Target</span>
                    <div className="text-sm font-bold text-cyan-300 mt-0.5">{meanReversion.reversionTargetPrice.toFixed(instrument.digits)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-[#172236] text-[10px] text-slate-400 flex items-center justify-between font-mono">
              <span>Std Dev: <strong className="text-white">{meanReversion.standardDeviationPips}p</strong></span>
              <span>Distance to FV: <strong className="text-cyan-300">{meanReversion.distanceFromFairValuePips}p</strong></span>
            </div>
          </div>
        )}

        {/* CARD 7B: CLIMACTIC BUY/SELL & COMPRESSION COIL ENGINE */}
        {(activeSubTab === 'all' || activeSubTab === 'orderflow' || activeSubTab === 'auction') && (
          <div className="p-4 rounded-xl bg-[#0c121e] border border-[#1b263c] flex flex-col justify-between shadow-md">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-[#172236] pb-2 mb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-rose-400" />
                  <span>Climactic & Compression</span>
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  climactic?.isClimactic
                    ? 'bg-rose-950 text-rose-300 border border-rose-500/40 animate-pulse'
                    : compression?.isCompressed
                    ? 'bg-purple-950 text-purple-300 border border-purple-500/40'
                    : 'bg-slate-900 text-slate-400 border border-slate-700'
                }`}>
                  {climactic?.isClimactic ? climactic.climacticDirection.replace(/_/g, ' ') : compression?.compressionState?.replace(/_/g, ' ') || 'ACTIVE'}
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-2.5 rounded bg-[#101726] border border-[#1d2940]">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Climactic Buy/Sell Score</span>
                    <span className="font-bold text-rose-300">{climactic?.climaxScore ?? 24}/100 ({climactic?.volumeZScore ?? 1.2}x Vol)</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    {climactic?.summary}
                  </p>
                </div>

                <div className="p-2.5 rounded bg-[#0e1524] border border-[#172238]">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Compression Coil Score</span>
                    <span className="font-bold text-purple-300">{compression?.compressionScore ?? 74}/100 ({compression?.atrContractionRatio ?? 0.65}x ATR)</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    {compression?.summary}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-[#172236] text-[10px] text-slate-400 flex items-center justify-between font-mono">
              <span>Coiled Vol: <strong className="text-purple-300">{compression?.coiledOrderVolumeLots ?? 1240} lots</strong></span>
              <span>Release Bias: <strong className="text-cyan-300">{compression?.expectedBreakoutBias?.replace(/_/g, ' ') || 'BULLISH'}</strong></span>
            </div>
          </div>
        )}

        {/* CARD 8: LATEST STORIES, FOREX MACRO & INSTANT MARKET ANALYSIS (§14 & §15) */}
        {(activeSubTab === 'all' || activeSubTab === 'macro') && (
          <div className="p-4 rounded-xl bg-[#0c121e] border border-[#1b263c] flex flex-col justify-between shadow-md">
            <div>
              {/* Header with Title, Risk Badge, and Expand Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#172236] pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Newspaper className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white text-xs uppercase tracking-wider block">
                      Latest Stories & Macro Calendar
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Real-Time Catalysts & Analysis Builder ({intelligence.symbol})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    macroNews.eventRisk.includes('EXTREME') || macroNews.eventRisk.includes('HIGH')
                      ? 'bg-red-950 text-red-300 border border-red-500/40 animate-pulse'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    Risk: {macroNews.eventRisk.replace(/_/g, ' ')}
                  </span>

                  <button
                    onClick={() => setIsMacroModalExpanded(true)}
                    className="p-1 rounded bg-[#131b2c] hover:bg-[#1c2840] text-slate-300 hover:text-white border border-[#22304c] transition-colors cursor-pointer"
                    title="Expand full screen stories & analysis modal"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Sub-Tabs: Stories vs Calendar vs My Analysis */}
              <div className="flex items-center justify-between gap-2 mb-3 bg-[#080d16] p-1 rounded-lg border border-[#182338]">
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                  <button
                    onClick={() => setMacroCardTab('stories')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      macroCardTab === 'stories'
                        ? 'bg-cyan-500 text-black font-bold shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Newspaper className="w-3 h-3" />
                    <span>Latest Stories</span>
                    <span className="text-[10px] font-mono px-1 rounded bg-black/30">
                      {filteredNewsStories.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setMacroCardTab('calendar')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      macroCardTab === 'calendar'
                        ? 'bg-cyan-500 text-black font-bold shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Calendar className="w-3 h-3" />
                    <span>Calendar</span>
                    <span className="text-[10px] font-mono px-1 rounded bg-black/30">
                      {sortedCalendarEvents.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setMacroCardTab('analysis')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      macroCardTab === 'analysis'
                        ? 'bg-emerald-500 text-black font-bold shadow-xs'
                        : selectedAnalysisNotes.length > 0
                        ? 'text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileText className="w-3 h-3" />
                    <span>My Analysis</span>
                    {selectedAnalysisNotes.length > 0 && (
                      <span className="text-[10px] font-mono px-1.5 rounded-full bg-emerald-400 text-black font-extrabold">
                        {selectedAnalysisNotes.length}
                      </span>
                    )}
                  </button>
                </div>

                {macroCardTab !== 'analysis' && (
                  <button
                    onClick={handleQuickAddAllTopCatalysts}
                    className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 whitespace-nowrap flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/50 border border-emerald-500/30 shrink-0 cursor-pointer transition-colors"
                    title="Quick add top high-impact stories & upcoming releases into your market analysis"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span className="hidden sm:inline">Add Top to Analysis</span>
                    <span className="sm:hidden">+ All</span>
                  </button>
                )}
              </div>

              {/* TAB 1: LATEST STORIES */}
              {macroCardTab === 'stories' && (
                <div className="space-y-2">
                  {/* Category filters */}
                  <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
                    {['ALL', 'CENTRAL_BANKS', 'INFLATION', 'COMMODITIES', 'EQUITIES_TECH'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setStoryCategoryFilter(cat)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors whitespace-nowrap ${
                          storyCategoryFilter === cat
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold'
                            : 'bg-[#101726] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {cat.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>

                  {/* Stories list */}
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                    {filteredNewsStories.slice(0, 4).map((story) => {
                      const isAdded = selectedAnalysisNotes.some((n) => n.id === story.id);
                      return (
                        <div
                          key={story.id}
                          className="p-2.5 rounded-lg bg-[#101726] border border-[#1d2940] hover:border-slate-600 transition-all text-xs"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/40">
                                {story.source}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">{story.timeAgo}</span>
                              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                                story.sentiment === 'BULLISH'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                                  : story.sentiment === 'BEARISH'
                                  ? 'bg-red-950 text-red-300 border border-red-500/30'
                                  : 'bg-purple-950 text-purple-300 border border-purple-500/30'
                              }`}>
                                {story.sentiment}
                              </span>
                            </div>

                            {/* Add to Analysis Action Button */}
                            <button
                              onClick={() => handleToggleAddStoryToAnalysis(story)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                isAdded
                                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400 shadow-xs'
                                  : 'bg-[#182338] hover:bg-emerald-950 text-slate-300 hover:text-emerald-300 border border-[#253654]'
                              }`}
                              title={isAdded ? 'Click to remove from analysis' : 'Add this news story catalyst to your market analysis'}
                            >
                              {isAdded ? <Check className="w-3 h-3 text-emerald-400" /> : <Plus className="w-3 h-3 text-cyan-400" />}
                              <span>{isAdded ? 'In Analysis' : 'Add to Analysis'}</span>
                            </button>
                          </div>

                          <h4 className="font-bold text-slate-100 leading-snug">{story.headline}</h4>
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {story.summary}
                          </p>

                          <div className="mt-1.5 pt-1.5 border-t border-[#182338] flex items-center justify-between text-[10px] text-slate-400">
                            <span className="text-cyan-300 font-medium truncate max-w-[260px]">
                              Takeaway: {story.takeaway}
                            </span>
                            <span className="text-slate-500 font-mono shrink-0">
                              {story.relatedCurrencies.join(', ')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: ECONOMIC CALENDAR */}
              {macroCardTab === 'calendar' && (
                <div className="space-y-2">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between gap-2">
                    <span>Economic Calendar ({macroNews.currencyRelevance})</span>
                    <div className="flex items-center gap-1 bg-[#080d16] p-0.5 rounded border border-[#1b253b]">
                      <button
                        onClick={() => setCalendarSortOrder('LATEST_TO_NEWEST')}
                        className={`px-1.5 py-0.5 text-[9px] font-mono rounded cursor-pointer ${
                          calendarSortOrder === 'LATEST_TO_NEWEST'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Latest → Newest
                      </button>
                      <button
                        onClick={() => setCalendarSortOrder('NEWEST_TO_LATEST')}
                        className={`px-1.5 py-0.5 text-[9px] font-mono rounded cursor-pointer ${
                          calendarSortOrder === 'NEWEST_TO_LATEST'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Newest → Latest
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1 scrollbar-thin">
                    {sortedCalendarEvents.map((ev) => {
                      const isAdded = selectedAnalysisNotes.some((n) => n.id === ev.id);
                      const dateStr =
                        ev.dateFormatted ||
                        new Date(ev.eventTime).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        });
                      return (
                        <div
                          key={ev.id}
                          className="p-2 rounded bg-[#101726] border border-[#1d2940] flex items-center justify-between text-[11px] font-mono gap-2"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span className={`px-1 py-0.2 rounded text-[9px] ${
                                ev.impact === 'HIGH' ? 'bg-red-950 text-red-400 border border-red-500/40 font-bold' : 'bg-amber-950 text-amber-400'
                              }`}>
                                {ev.currency}
                              </span>
                              <span className="truncate max-w-[170px] font-sans">{ev.eventTitle}</span>
                            </div>
                            <div className="text-[10px] text-cyan-300/90 mt-0.5 flex items-center gap-1.5">
                              <span>{dateStr}</span>
                              <span>·</span>
                              <span className="text-amber-300 font-semibold">{ev.timeFormatted}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Exp: {ev.forecast || 'N/A'} · Prev: {ev.previous || 'N/A'}{ev.actual ? ` · Act: ${ev.actual}` : ''}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <span className={`font-bold ${ev.timeUntilMinutes > 0 && ev.timeUntilMinutes <= 30 ? 'text-red-400 animate-pulse' : 'text-slate-300'}`}>
                                {formatCountdownLabel(ev.timeUntilMinutes)}
                              </span>
                              <div className="text-[10px] text-slate-500">{ev.impact}</div>
                            </div>

                            <button
                              onClick={() => handleToggleAddEventToAnalysis(ev)}
                              className={`p-1 rounded transition-all cursor-pointer ${
                                isAdded
                                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400'
                                  : 'bg-[#182338] hover:bg-emerald-950 text-slate-300 hover:text-emerald-300 border border-[#253654]'
                              }`}
                              title={isAdded ? 'Remove from analysis' : 'Add to market analysis'}
                            >
                              {isAdded ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Plus className="w-3.5 h-3.5 text-cyan-400" />}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* News Reaction Analysis */}
                  <div className="p-2 rounded bg-[#0e1524] border border-[#172238] text-[11px]">
                    <div className="text-[10px] font-mono font-bold text-cyan-300 uppercase flex items-center justify-between">
                      <span>Post-News Reaction Dynamics</span>
                      <span>Alignment: {macroNews.postNewsReaction.expectationAlignment}</span>
                    </div>
                    <div className="text-slate-300 mt-0.5 text-[11px] leading-relaxed">
                      {macroNews.postNewsReaction.explanation}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: MY MARKET ANALYSIS COMPOSER */}
              {macroCardTab === 'analysis' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Confluence Market Analysis Workspace</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      {selectedAnalysisNotes.length > 0 && (
                        <button
                          onClick={handleClearAnalysis}
                          className="text-[10px] text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-0.5"
                          title="Clear all selected notes"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Clear</span>
                        </button>
                      )}
                      <button
                        onClick={handleCopyAnalysis}
                        className="px-2.5 py-1 text-xs font-bold rounded bg-emerald-500 hover:bg-emerald-400 text-black flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                        title="Copy formatted institutional analysis to clipboard"
                      >
                        {isCopiedAnalysis ? <Check className="w-3 h-3 text-black" /> : <Copy className="w-3 h-3 text-black" />}
                        <span>{isCopiedAnalysis ? 'Copied!' : 'Copy Analysis'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Selected Catalysts Pills */}
                  {selectedAnalysisNotes.length === 0 ? (
                    <div className="p-4 rounded-lg bg-[#0e1524] border border-dashed border-[#1d2b44] text-center text-xs text-slate-400">
                      <p>No catalysts added yet. Click <strong className="text-cyan-300">[+ Add to Analysis]</strong> on any news story or calendar release to build your trade thesis.</p>
                      <button
                        onClick={handleQuickAddAllTopCatalysts}
                        className="mt-2.5 px-3 py-1 text-xs font-bold rounded bg-cyan-600 hover:bg-cyan-500 text-black shadow-xs inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Quick Add All Top Catalysts Now</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5 max-h-[90px] overflow-y-auto scrollbar-none">
                        {selectedAnalysisNotes.map((note) => (
                          <div
                            key={note.id}
                            className="px-2 py-1 rounded bg-[#10192a] border border-cyan-500/30 text-[10px] font-mono text-slate-200 flex items-center gap-1.5"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              note.type === 'NEWS_CATALYST' ? 'bg-cyan-400' : 'bg-emerald-400'
                            }`} />
                            <span className="truncate max-w-[200px]">{note.title}</span>
                            <button
                              onClick={() => {
                                setSelectedAnalysisNotes((prev) => prev.filter((n) => n.id !== note.id));
                              }}
                              className="text-slate-400 hover:text-rose-400 ml-0.5"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Formatted Analysis Preview Block */}
                      <div className="p-2.5 rounded-lg bg-[#080d16] border border-[#172238] font-mono text-[11px] text-slate-300 space-y-1 max-h-[160px] overflow-y-auto scrollbar-thin">
                        <div className="text-emerald-400 font-bold border-b border-[#182338] pb-1 flex items-center justify-between">
                          <span>{intelligence.symbol} TRADE PLAN REPORT</span>
                          <span className="text-[10px] text-slate-500">Auto-Synthesized</span>
                        </div>
                        <div className="text-slate-400 pt-0.5">
                          • <strong className="text-white">Technical Order Flow: </strong>
                          Entry @ {entryEngine.entryZone.low.toFixed(instrument.digits)} | SL @ {entryEngine.invalidationLevel.toFixed(instrument.digits)} | TP1 @ {entryEngine.targetZones[0]?.price.toFixed(instrument.digits)} | TP2 @ {entryEngine.targetZones[1]?.price.toFixed(instrument.digits)}
                        </div>
                        <div className="text-slate-400">
                          • <strong className="text-cyan-300">Macro Catalysts: </strong>
                          {selectedAnalysisNotes.length} active news catalysts supporting market direction.
                        </div>
                        <div className="text-slate-400">
                          • <strong className="text-amber-300">Execution Rule: </strong>
                          Lock TP1, trail stop to Breakeven immediately. Protect capital at fair value boundaries.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-3 pt-2.5 border-t border-[#172236] text-[10px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span>Sources: <strong className="text-cyan-300">ForexFactory · Reuters · Bloomberg Wire</strong></span>
                <span>·</span>
                <span>Surprise: <strong className="text-white font-mono">{macroNews.economicSurprise > 0 ? `+${macroNews.economicSurprise}` : macroNews.economicSurprise}</strong></span>
              </div>
              <button
                onClick={() => setMacroCardTab('analysis')}
                className="text-emerald-400 hover:text-emerald-300 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>My Analysis ({selectedAnalysisNotes.length} items)</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* CARD 9: DYNAMIC CONTRIBUTION WEIGHTS MODEL (§21) */}
        {(activeSubTab === 'all' || activeSubTab === 'notrade') && (
          <div className="p-4 rounded-xl bg-[#0c121e] border border-[#1b263c] flex flex-col justify-between shadow-md">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-[#172236] pb-2 mb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Radar className="w-4 h-4 text-cyan-400" />
                  <span>Dynamic Contribution Weights</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold">
                  Adaptive
                </span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  {weights.activeRegimeReason}
                </p>

                <div className="space-y-1.5 mt-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-sans">Resting Liquidity & Spoofing</span>
                    <span className="text-cyan-300 font-bold">{weights.liquidityWeight}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="bg-cyan-400 h-full" style={{ width: `${weights.liquidityWeight * 2.5}%` }} />
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-sans">Auction & Value Anatomy</span>
                    <span className="text-purple-300 font-bold">{weights.auctionWeight}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="bg-purple-400 h-full" style={{ width: `${weights.auctionWeight * 2.5}%` }} />
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-sans">Aggressive Flow & Delta/CVD</span>
                    <span className="text-emerald-300 font-bold">{weights.orderFlowWeight}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="bg-emerald-400 h-full" style={{ width: `${weights.orderFlowWeight * 2.5}%` }} />
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-sans">Forex Macro News & Volatility</span>
                    <span className="text-amber-300 font-bold">{weights.macroNewsWeight}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="bg-amber-400 h-full" style={{ width: `${weights.macroNewsWeight * 2.5}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-[#172236] text-[10px] text-slate-400">
              Weights adapt automatically based on whether the market is in balanced chop, trend expansion, or news shock.
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          4. DATA QUALITY & DECENTRALIZED SPOT FX DISCLOSURE (§22)
         ======================================================== */}
      <div className="p-3.5 rounded-lg bg-[#080d16] border border-[#182338] text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            <strong className="text-slate-200">Data Quality & Liquidity Disclosure: </strong>
            {dataQualityDisclosures.spotFxNotice}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
          {Object.entries(dataQualityDisclosures.featuresQuality).map(([name, tier]) => (
            <span key={name} className="px-2 py-0.5 rounded bg-[#101726] border border-[#1c273e] text-slate-300">
              {name}: <strong className={tier === 'REAL' ? 'text-emerald-400' : 'text-cyan-300'}>{tier}</strong>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
