import React, { useState, useEffect } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  ShieldAlert, 
  Zap, 
  BarChart2, 
  Compass, 
  Target, 
  AlertTriangle, 
  Check, 
  X, 
  HelpCircle, 
  TrendingUp, 
  Layers, 
  ArrowRight, 
  Flame, 
  Scale, 
  Calendar, 
  Activity, 
  Info, 
  ChevronDown, 
  ChevronUp,
  Newspaper,
  Copy,
  Plus,
  Sparkles,
  Trash2,
  Clock,
  CheckCircle2,
  RefreshCw,
  Volume2,
  Share2,
  ExternalLink,
  FileText,
  Search,
  ShieldCheck
} from 'lucide-react';
import { SniperModelOutput } from '../types/sniperModel';
import { 
  getCuratedMarketStories, 
  fetchLatestMarketNews, 
  generateSynthesizedMarketAnalysis, 
  MarketNewsStory, 
  MarketAnalysisNote 
} from '../services/marketNewsService';
import { generateCuratedMacroCalendar } from '../services/macroCalendarService';
import { EconomicCalendarEvent } from '../types/marketIntelligence';
import { tradingVoice } from '../services/tradingVoiceService';
import { EconomicNewsPredictionEngine } from './EconomicNewsPredictionEngine';

interface InfographicEngineProps {
  modelOutput: SniperModelOutput;
  onOpenScorecard: () => void;
  digits?: number;
  onOpenIntelligenceDashboard?: () => void;
  currentSymbol?: string;
}

export const InfographicEngine: React.FC<InfographicEngineProps> = ({
  modelOutput,
  onOpenScorecard,
  digits: customDigits,
  onOpenIntelligenceDashboard,
  currentSymbol,
}) => {
  const [showIntelligenceDetails, setShowIntelligenceDetails] = useState<boolean>(true);

  const {
    state,
    location,
    valueStructure,
    liquidity,
    orderFlow,
    signal,
    invalidation,
    scorecard,
    nineQuestions,
    marketIntelligence,
    exhaustion,
    valueAreaAbsorptionReclaim,
    sniperEdge,
  } = modelOutput;

  const vaar = valueAreaAbsorptionReclaim || sniperEdge?.valueAreaAbsorptionReclaim;
  const isNoTrade = state.isNoTrade || marketIntelligence?.entryEngine.direction === 'NO_TRADE';
  const isUp = liquidity.plr === 'UP';
  const digits = customDigits ?? (location.currentPrice.toString().split('.')[1]?.length ?? 2);
  const mi = marketIntelligence;
  const currentSym = currentSymbol || mi?.symbol || 'XAUUSD';

  // Section 8 State: Live Breaking News, Stories & Macro Calendar Analysis
  const [macroTab, setMacroTab] = useState<'stories' | 'calendar' | 'analysis'>('stories');
  const [newsStories, setNewsStories] = useState<MarketNewsStory[]>(() => getCuratedMarketStories(currentSym));
  const [calendarEvents, setCalendarEvents] = useState<EconomicCalendarEvent[]>(() => {
    return mi?.macroNews?.upcomingEvents?.length ? mi.macroNews.upcomingEvents : generateCuratedMacroCalendar(currentSym);
  });
  const [selectedAnalysisNotes, setSelectedAnalysisNotes] = useState<MarketAnalysisNote[]>([]);
  const [isCopiedAnalysis, setIsCopiedAnalysis] = useState<boolean>(false);
  const [isSpeakingAnalysis, setIsSpeakingAnalysis] = useState<boolean>(false);
  const [storyCategoryFilter, setStoryCategoryFilter] = useState<string>('ALL');
  const [calendarImpactFilter, setCalendarImpactFilter] = useState<'ALL' | 'HIGH'>('ALL');
  const [calendarSortOrder, setCalendarSortOrder] = useState<'LATEST_TO_NEWEST' | 'NEWEST_TO_LATEST'>('LATEST_TO_NEWEST');
  const [newsSearchQuery, setNewsSearchQuery] = useState<string>('');
  const [isRefreshingFeed, setIsRefreshingFeed] = useState<boolean>(false);
  const [showAuctionGuide, setShowAuctionGuide] = useState<boolean>(true);
  const [isSpeakingAuction, setIsSpeakingAuction] = useState<boolean>(false);

  // Sync news & calendar ONLY when selected symbol changes (never on streaming price ticks)
  useEffect(() => {
    let isMounted = true;

    // Load initial cached curated stories & calendar for this symbol
    setNewsStories(getCuratedMarketStories(currentSym));
    setCalendarEvents(generateCuratedMacroCalendar(currentSym));

    // Asynchronously update with fresh live feeds once per symbol change
    Promise.all([
      fetchLatestMarketNews(currentSym),
      fetch(`/api/macro/calendar?symbol=${encodeURIComponent(currentSym)}`)
        .then((res) => res.json())
        .catch(() => null),
    ]).then(([stories, calData]) => {
      if (!isMounted) return;
      if (stories && stories.length > 0) {
        setNewsStories(stories);
      }
      if (calData && Array.isArray(calData.events) && calData.events.length > 0) {
        setCalendarEvents(calData.events);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentSym]);

  // Handlers for Stories & Calendar Market Analysis Addition
  const handleToggleAddStoryToAnalysis = (story: MarketNewsStory) => {
    setSelectedAnalysisNotes((prev) => {
      const exists = prev.some((n) => n.id === story.id);
      if (exists) {
        return prev.filter((n) => n.id !== story.id);
      }
      const newNote: MarketAnalysisNote = {
        id: story.id,
        symbol: currentSym,
        title: story.headline,
        type: 'NEWS_CATALYST',
        detail: `${story.source} [${story.timeAgo}]: ${story.takeaway}`,
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
        symbol: currentSym,
        title: `${ev.currency} · ${ev.eventTitle}`,
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
    const topEvents = calendarEvents.slice(0, 2);
    const newNotes: MarketAnalysisNote[] = [];

    topStories.forEach((story) => {
      if (!selectedAnalysisNotes.some((n) => n.id === story.id)) {
        newNotes.push({
          id: story.id,
          symbol: currentSym,
          title: story.headline,
          type: 'NEWS_CATALYST',
          detail: `${story.source} [${story.timeAgo}]: ${story.takeaway}`,
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
          symbol: currentSym,
          title: `${ev.currency} · ${ev.eventTitle}`,
          type: 'CALENDAR_EVENT',
          detail: `Exp: ${ev.forecast || 'N/A'}, Prev: ${ev.previous || 'N/A'}${ev.actual ? `, Act: ${ev.actual}` : ''} (${ev.timeUntilMinutes <= 0 ? 'Released' : `in ${ev.timeUntilMinutes}m`})`,
          impact: ev.impact,
          sentiment: ev.surpriseValue && ev.surpriseValue > 0 ? 'BULLISH' : 'NEUTRAL',
          addedAt: Date.now(),
        });
      }
    });

    if (newNotes.length > 0) {
      setSelectedAnalysisNotes((prev) => [...prev, ...newNotes]);
    }
    setMacroTab('analysis');
  };

  const handleRefreshFeed = async () => {
    setIsRefreshingFeed(true);
    try {
      const [stories, calRes] = await Promise.all([
        fetchLatestMarketNews(currentSym),
        fetch(`/api/macro/calendar?symbol=${encodeURIComponent(currentSym)}`).then((r) => r.json()).catch(() => null),
      ]);
      if (stories && stories.length > 0) {
        setNewsStories(stories);
      }
      if (calRes && Array.isArray(calRes.events) && calRes.events.length > 0) {
        setCalendarEvents(calRes.events);
      }
    } catch {
      // fallback
    } finally {
      setTimeout(() => setIsRefreshingFeed(false), 600);
    }
  };

  const handleCopySynthesizedAnalysis = () => {
    const riskReward = modelOutput.sniperEdge?.riskRewardRatio || 2.5;
    const direction = (modelOutput.sniperEdge?.triggerAction as any) || 'WAIT_FOR_EDGE';
    const text = generateSynthesizedMarketAnalysis(
      currentSym,
      location.currentPrice,
      scorecard.grade,
      direction,
      modelOutput.sniperEdge?.optimalEntry || location.currentPrice,
      modelOutput.sniperEdge?.hardStopLoss || location.currentPrice * 0.995,
      modelOutput.sniperEdge?.targetTP1 || location.currentPrice * 1.005,
      modelOutput.sniperEdge?.targetTP2 || location.currentPrice * 1.01,
      modelOutput.sniperEdge?.targetTP3 || location.currentPrice * 1.02,
      riskReward,
      selectedAnalysisNotes,
      {
        poc: valueStructure.poc,
        vah: valueStructure.vah,
        val: valueStructure.val,
        exhaustedSide: exhaustion.exhaustedSide,
        exhaustionScore: exhaustion.exhaustionScore,
        deltaTrend: orderFlow.deltaTrend,
        whyPriceIsMoving: mi?.whyPriceIsMoving.primaryReason,
        whyLevelRevisited: mi?.whyPriceIsMoving.whyLevelRevisited,
        trappedSide: mi?.whyPriceIsMoving.whyBullets?.[2],
        whatStopsTheMove: mi?.whyPriceIsMoving.whatStopsTheMove,
        possibleFirstMove: mi?.whyPriceIsMoving.expectedInitialSweep,
        invalidationReason: mi?.whyPriceIsMoving.invalidationConditions,
      }
    );

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setIsCopiedAnalysis(true);
      setTimeout(() => setIsCopiedAnalysis(false), 2500);
    }
  };

  const handleSpeakSynthesizedAnalysis = () => {
    const direction = modelOutput.sniperEdge?.triggerAction || 'BALANCED';
    const speechSummary = `Desk market analysis for ${currentSym}. Technical bias is ${direction.replace(/_/g, ' ')}, setup grade ${scorecard.grade}. We have integrated ${selectedAnalysisNotes.length} macro and news catalysts into the trade thesis. High probability targets remain active. Risk discipline strictly enforced.`;
    
    tradingVoice.speak(speechSummary, {
      category: 'BRIEFING',
      symbol: currentSym,
      priority: true,
    });

    setIsSpeakingAnalysis(true);
    setTimeout(() => setIsSpeakingAnalysis(false), 4000);
  };

  const handleRemoveNote = (id: string) => {
    setSelectedAnalysisNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleClearAllNotes = () => {
    setSelectedAnalysisNotes([]);
  };

  // Filtered stories & events
  const filteredStories = newsStories.filter((story) => {
    const matchesCat = storyCategoryFilter === 'ALL' || story.category === storyCategoryFilter;
    if (!matchesCat) return false;
    if (!newsSearchQuery.trim()) return true;
    const q = newsSearchQuery.toLowerCase();
    return (
      story.headline.toLowerCase().includes(q) ||
      story.summary.toLowerCase().includes(q) ||
      story.source.toLowerCase().includes(q) ||
      story.takeaway.toLowerCase().includes(q)
    );
  });

  const formatEventDate = (ev: EconomicCalendarEvent): string => {
    if (ev.dateFormatted) return ev.dateFormatted;
    if (ev.eventTime) {
      return new Date(ev.eventTime).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    return 'Scheduled';
  };

  const formatEventTime = (ev: EconomicCalendarEvent): string => {
    if (ev.timeFormatted) return ev.timeFormatted;
    if (ev.eventTime) {
      return new Date(ev.eventTime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
    return 'TBD';
  };

  const formatTimeRemaining = (minutes: number): string => {
    if (minutes <= 0) {
      const ago = Math.abs(minutes);
      if (ago < 60) return `Released ${ago}m ago`;
      const hrs = Math.floor(ago / 60);
      if (hrs < 24) return `Released ${hrs}h ago`;
      return `Released ${Math.floor(hrs / 24)}d ago`;
    }
    if (minutes < 60) return `in ${minutes}m`;
    const hrs = Math.floor(minutes / 60);
    const remMins = minutes % 60;
    if (hrs < 24) return remMins > 0 ? `in ${hrs}h ${remMins}m` : `in ${hrs}h`;
    const days = Math.floor(hrs / 24);
    const remHrs = hrs % 24;
    return remHrs > 0 ? `in ${days}d ${remHrs}h` : `in ${days}d`;
  };

  const filteredCalendar = calendarEvents
    .filter((ev) => {
      if (calendarImpactFilter === 'HIGH') {
        return ev.impact === 'HIGH';
      }
      return true;
    })
    .slice()
    .sort((a, b) =>
      calendarSortOrder === 'LATEST_TO_NEWEST'
        ? a.eventTime - b.eventTime
        : b.eventTime - a.eventTime
    );

  return (
    <div className="flex flex-col gap-4 text-slate-100 select-none">
      {/* ========================================================
          LEVEL 1 — CURRENT MODEL STATE (1-SECOND GLANCE)
         ======================================================== */}
      <div className={`p-4 rounded-lg border transition-all ${
        isNoTrade
          ? 'bg-[#151922] border-slate-700/80'
          : state.color === 'green'
          ? 'bg-gradient-to-r from-emerald-950/70 via-[#0e1724] to-[#0c1420] border-emerald-500/40 shadow-sm shadow-emerald-500/10'
          : 'bg-gradient-to-r from-red-950/70 via-[#0e1724] to-[#0c1420] border-red-500/40 shadow-sm shadow-red-500/10'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            {/* Model State Giant Indicator */}
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-black text-xl shrink-0 ${
              isNoTrade
                ? 'bg-slate-800 text-slate-300 border border-slate-600'
                : state.color === 'green'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-md shadow-emerald-500/20'
                : 'bg-red-500/20 text-red-400 border border-red-500/50 shadow-md shadow-red-500/20'
            }`}>
              {isNoTrade ? '⚪' : state.color === 'green' ? '🟢' : '🔴'}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold tracking-wider uppercase px-2 py-0.5 rounded ${
                  isNoTrade
                    ? 'bg-slate-800 text-slate-300'
                    : state.color === 'green'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                    : 'bg-red-950 text-red-400 border border-red-500/30'
                }`}>
                  {state.badge}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Setup Grade: <span className="font-bold text-white">{scorecard.grade}</span> ({scorecard.totalScore} pts)
                </span>
                {mi && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#131d2e] border border-cyan-500/30 text-cyan-300">
                    Regime: {mi.regime.primaryRegime}
                  </span>
                )}
              </div>

              <h2 className="text-lg md:text-xl font-bold tracking-tight text-white mt-1 text-balance">
                {state.headline}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 max-w-3xl">
                {state.subheadline}
              </p>
            </div>
          </div>

          {/* Quick Action Decision & Risk zero trigger */}
          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            <button
              onClick={onOpenScorecard}
              className="px-3 py-1.5 text-xs font-semibold rounded bg-[#1b253b] hover:bg-[#253350] border border-[#2c3b59] text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Full G0–G6 Scorecard</span>
            </button>

            {!isNoTrade && (
              <div className="px-3 py-1.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>FIRE: {signal.action} @ {signal.entryPrice.toFixed(digits)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Integrated Seven-Stage Pipeline Gate Status (G0–G6) Strip */}
        <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
          {[
            { step: 'G0', name: 'Regime', desc: mi?.regime?.primaryRegime || 'Trending', status: 'PASS' },
            { step: 'G1', name: 'Frame & Bias', desc: location.isDiscount ? 'Discount Edge' : 'Premium Edge', status: 'PASS' },
            { step: 'G2', name: 'Location', desc: location.relationToValue, status: 'PASS' },
            { step: 'G3', name: 'Liquidity', desc: `PLR ${liquidity.plr}`, status: 'PASS' },
            { step: 'G4', name: 'Effort', desc: orderFlow.absorption ? 'Absorption + Imbal' : orderFlow.deltaTrend, status: 'PASS' },
            { step: 'G5', name: 'Trigger', desc: signal.playName, status: isNoTrade ? 'WAIT' : 'PASS' },
            { step: 'G6', name: 'Zero Risk', desc: 'BE on TP1 Hit', status: 'ARMED' },
          ].map((st) => (
            <div key={st.step} className="p-2 rounded bg-[#0a101b]/90 border border-[#1b253a] flex flex-col justify-between">
              <div className="flex items-center justify-between font-mono font-bold">
                <span className="text-cyan-400 text-[11px]">{st.step} · {st.name}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded border ${
                  st.status === 'WAIT'
                    ? 'text-amber-300 bg-amber-950/60 border-amber-500/30'
                    : 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30'
                }`}>
                  {st.status}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 truncate mt-1 font-mono">{st.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================
          NEW: "WHY IS PRICE MOVING?" EXPLANATION PANEL (§19 & §24)
         ======================================================== */}
      {mi && (
        <div className="p-3.5 rounded-lg bg-[#0b101b] border border-[#1b263b] flex flex-col gap-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#162136] pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Why is Price Moving? — Market Control & Causation Engine
              </h3>
            </div>

            {/* Market Control % Pill */}
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-slate-400">Control:</span>
              <span className={`px-2 py-0.5 rounded font-bold ${
                mi.whyPriceIsMoving.marketControl.dominantController === 'BUYERS'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                  : mi.whyPriceIsMoving.marketControl.dominantController === 'SELLERS'
                  ? 'bg-red-950 text-red-300 border border-red-500/40'
                  : 'bg-amber-950 text-amber-300 border border-amber-500/40'
              }`}>
                {mi.whyPriceIsMoving.marketControl.dominantController} — {mi.whyPriceIsMoving.marketControl.confidence}%
              </span>
              <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-400">
                <span>(B: {mi.whyPriceIsMoving.marketControl.buyersPct}% · S: {mi.whyPriceIsMoving.marketControl.sellersPct}%)</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
            {/* Primary Driver */}
            <div className="md:col-span-8 space-y-1">
              <div className="text-slate-300 leading-relaxed">
                <strong className="text-cyan-300 font-bold uppercase tracking-wide">Status [{mi.whyPriceIsMoving.movementStatus.replace(/_/g, ' ')}]: </strong>
                {mi.whyPriceIsMoving.primaryReason}
              </div>
              <div className="text-slate-400 text-[11px] leading-relaxed">
                <strong className="text-slate-300">Secondary Driver: </strong>
                {mi.whyPriceIsMoving.secondaryReason}
              </div>
              <div className="pt-1 text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                <span>Action: {mi.whyPriceIsMoving.actionGuidance}</span>
              </div>
            </div>

            {/* Quick Evidence Bullets */}
            <div className="md:col-span-4 bg-[#080d16] p-2 rounded border border-[#162136] flex flex-col justify-between">
              <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold mb-1">
                Active Evidence Drivers
              </div>
              <ul className="space-y-1 text-[11px] font-mono text-slate-300">
                {mi.whyPriceIsMoving.whyBullets.slice(0, 3).map((bullet, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-cyan-400">•</span>
                    <span className="leading-tight">{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          LEVEL 2 & 3: MAIN MARKET AUCTION INFOGRAPHIC CANVAS & PLAIN-ENGLISH INTERPRETER
          (Simplified, intuitive, zero-jargon explanation of Floor, Fair Value Magnet, and Ceiling)
         ======================================================== */}
      {(() => {
        const curPrice = location.currentPrice;
        const vahPrice = valueStructure.vah;
        const valPrice = valueStructure.val;
        const pocPrice = valueStructure.poc;
        const pipMultiplier = currentSym.includes('JPY') ? 100 : currentSym === 'XAUUSD' ? 10 : 10000;

        const distPocPips = Math.round(Math.abs(curPrice - pocPrice) * pipMultiplier);
        const isBelowFloor = curPrice < valPrice;
        const isAboveCeiling = curPrice > vahPrice;
        const isAtEquilibrium = Math.abs(curPrice - pocPrice) * pipMultiplier <= 2.5;
        const isDiscountZone = !isBelowFloor && !isAboveCeiling && curPrice < pocPrice;

        let statusBadgeText = '';
        let statusBadgeBg = '';
        let statusBadgeBorder = '';
        let statusBadgeColor = '';
        let statusPlainHeadline = '';
        let statusPlainExplanation = '';
        let statusActionRule = '';

        if (isBelowFloor) {
          statusBadgeText = '🛒 WHOLESALE DISCOUNT (CHEAP ZONE)';
          statusBadgeBg = 'bg-emerald-950/80';
          statusBadgeBorder = 'border-emerald-500/50';
          statusBadgeColor = 'text-emerald-300';
          statusPlainHeadline = `Price is CHEAP (${Math.round((valPrice - curPrice) * pipMultiplier)} pips below the Day's Floor)`;
          statusPlainExplanation = `Price has fallen below the normal Value Floor (${valPrice.toFixed(digits)}). In auction theory, this is like a clearance sale: institutional buyers see this price as a bargain and are actively stepping in to buy. Expect price to snap back UP like a rubber band toward Fair Value (${pocPrice.toFixed(digits)}).`;
          statusActionRule = `FAVOR BUY/LONG SETUPS: Do NOT sell here (sellers get trapped at the lows). Look for buyers absorbing sell orders and pushing back into value.`;
        } else if (isAboveCeiling) {
          statusBadgeText = '🏷️ PREMIUM EXPENSIVE (OVERPRICED ZONE)';
          statusBadgeBg = 'bg-rose-950/80';
          statusBadgeBorder = 'border-rose-500/50';
          statusBadgeColor = 'text-rose-300';
          statusPlainHeadline = `Price is EXPENSIVE (${Math.round((curPrice - vahPrice) * pipMultiplier)} pips above the Day's Ceiling)`;
          statusPlainExplanation = `Price is trading above the normal Value Ceiling (${vahPrice.toFixed(digits)}). Big institutions consider this expensive and use this zone to take profits or initiate short positions. Unless explosive volume breaks out, price will reject and fall back DOWN toward Fair Value (${pocPrice.toFixed(digits)}).`;
          statusActionRule = `FAVOR SELL/SHORT SETUPS: Do NOT buy at the top (buyers get trapped at highs). Look for buyers stalling and price rolling back down toward Fair Value.`;
        } else if (isAtEquilibrium) {
          statusBadgeText = '⚖️ AT FAIR VALUE (EQUILIBRIUM MAGNET)';
          statusBadgeBg = 'bg-cyan-950/80';
          statusBadgeBorder = 'border-cyan-500/50';
          statusBadgeColor = 'text-cyan-300';
          statusPlainHeadline = `Price is BALANCED right at Point of Control (${pocPrice.toFixed(digits)})`;
          statusPlainExplanation = `Price is sitting right at the Fair Value Center where the vast majority of today's contracts traded. Buyers and sellers agree this price is fair. Because price is right in the middle, there is NO distinct directional edge right now.`;
          statusActionRule = `WAIT FOR EXTREMES: Patient traders do not enter at Fair Value. Wait for price to reach the Cheap Floor or Expensive Ceiling for high-probability trades.`;
        } else if (isDiscountZone) {
          statusBadgeText = '📈 DISCOUNT RANGE (PULLING UPWARD TO FAIR VALUE)';
          statusBadgeBg = 'bg-teal-950/80';
          statusBadgeBorder = 'border-teal-500/50';
          statusBadgeColor = 'text-teal-300';
          statusPlainHeadline = `Price is in the Lower Half of Value (${distPocPips} pips below Fair Value)`;
          statusPlainExplanation = `Price is between the Value Floor (${valPrice.toFixed(digits)}) and Fair Value (${pocPrice.toFixed(digits)}). The Point of Control at ${pocPrice.toFixed(digits)} acts as an overhead magnet pulling price up toward equilibrium.`;
          statusActionRule = `FAVOR LONGS TOWARD MAGNET: Target is Fair Value POC @ ${pocPrice.toFixed(digits)}. Take profit as price approaches the center.`;
        } else {
          statusBadgeText = '📉 PREMIUM RANGE (PULLING DOWNWARD TO FAIR VALUE)';
          statusBadgeBg = 'bg-amber-950/80';
          statusBadgeBorder = 'border-amber-500/50';
          statusBadgeColor = 'text-amber-300';
          statusPlainHeadline = `Price is in the Upper Half of Value (${distPocPips} pips above Fair Value)`;
          statusPlainExplanation = `Price is between Fair Value (${pocPrice.toFixed(digits)}) and the Ceiling (${vahPrice.toFixed(digits)}). The Point of Control at ${pocPrice.toFixed(digits)} acts as a downward magnet pulling price back down toward equilibrium.`;
          statusActionRule = `FAVOR SHORTS OR PROFIT-TAKING: Target is Fair Value POC @ ${pocPrice.toFixed(digits)}.`;
        }

        const handleSpeakAuctionBrief = () => {
          setIsSpeakingAuction(true);
          const speech = `Market auction breakdown for ${currentSym}. ${statusPlainHeadline}. ${statusPlainExplanation}. Strategy recommendation: ${statusActionRule}`;
          tradingVoice.speak(speech, {
            category: 'BRIEFING',
            symbol: currentSym,
            priority: true,
            force: true,
          });
          setTimeout(() => setIsSpeakingAuction(false), 4500);
        };

        return (
          <div className="bg-[#0b101b] rounded-lg border border-[#1b253b] p-3.5 sm:p-4 relative overflow-hidden shadow-xl">
            {/* 1. Header with Mode & Voice Squawk Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#182236] pb-3 mb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-500/40 flex items-center justify-center font-bold">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold tracking-wide text-white uppercase">
                      Market Auction & Value Anatomy
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                      PLAIN-ENGLISH INTERPRETER
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    How buyers and sellers are valuing {currentSym} today (Floor, Magnet & Ceiling)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Voice Interpreter Button */}
                <button
                  onClick={handleSpeakAuctionBrief}
                  disabled={isSpeakingAuction}
                  className={`px-2.5 py-1 text-xs font-semibold rounded border transition-colors flex items-center gap-1.5 cursor-pointer ${
                    isSpeakingAuction
                      ? 'bg-cyan-500 text-black border-cyan-400 animate-pulse font-bold'
                      : 'bg-[#121c2d] hover:bg-[#1a283f] text-cyan-300 border-cyan-500/30'
                  }`}
                  title="Listen to spoken plain-English auction explanation"
                >
                  <Volume2 className={`w-3.5 h-3.5 ${isSpeakingAuction ? 'animate-bounce' : 'text-cyan-400'}`} />
                  <span>{isSpeakingAuction ? 'Speaking...' : 'Listen in Simple Words'}</span>
                </button>

                {/* Guide Toggle */}
                <button
                  onClick={() => setShowAuctionGuide((v) => !v)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded border transition-colors flex items-center gap-1 cursor-pointer ${
                    showAuctionGuide
                      ? 'bg-amber-950/70 text-amber-300 border-amber-500/40'
                      : 'bg-[#121827] text-slate-400 border-[#1e273a]'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{showAuctionGuide ? 'Hide 10s Guide' : 'Show 10s Guide'}</span>
                </button>

                {/* Profile shape badges */}
                <div className="hidden md:flex items-center gap-1.5 text-[11px] font-mono text-slate-400 pl-1 border-l border-white/10">
                  <span className="text-slate-400">Profile:</span>
                  <strong className="text-amber-400 font-bold">{valueStructure.dayProfileShape}</strong>
                </div>
              </div>
            </div>

            {/* 2. PLAIN-ENGLISH BOTTOM LINE VERDICT BANNER (Answers: "What does this mean for me right now?") */}
            <div className={`p-3 rounded-lg border mb-3.5 transition-all ${statusBadgeBg} ${statusBadgeBorder}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                  </span>
                  <span className={`text-xs font-bold tracking-wider uppercase px-2 py-0.5 rounded border ${statusBadgeColor} ${statusBadgeBorder} bg-black/40`}>
                    {statusBadgeText}
                  </span>
                </div>
                <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                  <span className="text-slate-400 font-normal">Live Price:</span>
                  <span className="text-cyan-300 text-sm">{curPrice.toFixed(digits)}</span>
                  <span className="text-slate-500 font-normal">·</span>
                  <span className="text-slate-300 font-normal">{distPocPips}p from Fair Value</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="text-cyan-400 text-sm">💡</span>
                  <span>{statusPlainHeadline}</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                  {statusPlainExplanation}
                </p>
                <div className="pt-1 text-xs font-mono font-semibold flex items-center gap-1.5 text-emerald-300">
                  <span className="text-emerald-400 font-bold">⚡ ACTION:</span>
                  <span className="text-white">{statusActionRule}</span>
                </div>
              </div>
            </div>

            {/* 3. THREE-LEVEL AUCTION SPECTRUM LADDER (Ceiling ➔ Fair Value ➔ Floor) */}
            <div className="space-y-2 mb-3.5">
              <div className="text-[11px] font-mono text-slate-400 uppercase font-semibold flex items-center justify-between px-1">
                <span>The 3 Auction Levels (Plain English vs Price)</span>
                <span className="text-cyan-400">Directional Trajectory: {signal.expectedPath.description}</span>
              </div>

              {/* CEILING (VAH) */}
              <div className={`p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-all ${
                isAboveCeiling ? 'bg-rose-950/60 border-rose-500 shadow-md ring-1 ring-rose-500/30' : 'bg-[#10141f] border-[#222f47]'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded bg-rose-950 text-rose-400 border border-rose-500/40 flex items-center justify-center font-bold text-xs shrink-0">
                    ▲
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-rose-300">THE EXPENSIVE CEILING (VAH)</span>
                      <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-rose-950 text-rose-300 border border-rose-500/30">
                        Sell Zone / Rejection Area
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Price is considered high here. Institutional sellers take profit and defend this roof.
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono font-bold text-sm text-rose-300 tabular-nums">{vahPrice.toFixed(digits)}</div>
                  <div className="text-[10px] font-mono text-slate-400">
                    {curPrice > vahPrice ? `+${Math.round((curPrice - vahPrice) * pipMultiplier)}p above` : `${Math.round((vahPrice - curPrice) * pipMultiplier)}p above live`}
                  </div>
                </div>
              </div>

              {/* ACTIVE LIVE PRICE MARKER IF BETWEEN CEILING & POC */}
              {!isBelowFloor && !isAboveCeiling && curPrice >= pocPrice && (
                <div className="px-3 py-2 rounded-lg bg-cyan-950/70 border-2 border-cyan-400 flex items-center justify-between text-xs font-mono shadow-lg shadow-cyan-500/10">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400"></span>
                    </span>
                    <strong className="text-white">YOU ARE HERE: LIVE PRICE</strong>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-400 text-black">
                      {isAtEquilibrium ? 'AT FAIR VALUE' : 'PREMIUM SIDE'}
                    </span>
                    <span className="text-slate-300 text-[11px] hidden sm:inline">
                      ({distPocPips} pips {isAtEquilibrium ? 'at balance' : 'above Fair Value, gravity pulling down'})
                    </span>
                  </div>
                  <span className="text-sm font-black text-cyan-200 tabular-nums">{curPrice.toFixed(digits)}</span>
                </div>
              )}

              {/* FAIR VALUE CENTER (POC - THE MAGNET) */}
              <div className={`p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-all ${
                isAtEquilibrium ? 'bg-cyan-950/70 border-cyan-400 shadow-lg ring-1 ring-cyan-400/50' : 'bg-[#0a1829] border-cyan-500/40'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/50 flex items-center justify-center font-bold text-xs shrink-0">
                    🧲
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-cyan-300">FAIR VALUE CENTER (POC)</span>
                      <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                        The Market Magnet (70% Volume)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Where most traders traded today. Acts like gravity: when price wanders away, it pulls price back here.
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono font-bold text-sm text-cyan-300 tabular-nums">{pocPrice.toFixed(digits)}</div>
                  <div className="text-[10px] font-mono text-cyan-400 font-semibold">
                    {distPocPips === 0 ? 'Equilibrium' : `${distPocPips}p from Live`}
                  </div>
                </div>
              </div>

              {/* ACTIVE LIVE PRICE MARKER IF BETWEEN POC & FLOOR */}
              {!isBelowFloor && !isAboveCeiling && curPrice < pocPrice && (
                <div className="px-3 py-2 rounded-lg bg-cyan-950/70 border-2 border-cyan-400 flex items-center justify-between text-xs font-mono shadow-lg shadow-cyan-500/10">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400"></span>
                    </span>
                    <strong className="text-white">YOU ARE HERE: LIVE PRICE</strong>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-400 text-black">
                      DISCOUNT SIDE
                    </span>
                    <span className="text-slate-300 text-[11px] hidden sm:inline">
                      ({distPocPips} pips below Fair Value, gravity pulling upward)
                    </span>
                  </div>
                  <span className="text-sm font-black text-cyan-200 tabular-nums">{curPrice.toFixed(digits)}</span>
                </div>
              )}

              {/* ACTIVE LIVE PRICE MARKER IF BELOW FLOOR */}
              {isBelowFloor && (
                <div className="px-3 py-2 rounded-lg bg-emerald-950/70 border-2 border-emerald-400 flex items-center justify-between text-xs font-mono shadow-lg shadow-emerald-500/20">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
                    </span>
                    <strong className="text-white">YOU ARE HERE: DEEP DISCOUNT</strong>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-400 text-black">
                      BELOW FLOOR
                    </span>
                    <span className="text-emerald-300 text-[11px] hidden sm:inline">
                      ({Math.round((valPrice - curPrice) * pipMultiplier)}p below Floor, expecting rubber band bounce back to {pocPrice.toFixed(digits)})
                    </span>
                  </div>
                  <span className="text-sm font-black text-emerald-300 tabular-nums">{curPrice.toFixed(digits)}</span>
                </div>
              )}

              {/* FLOOR (VAL) */}
              <div className={`p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-all ${
                isBelowFloor ? 'bg-emerald-950/60 border-emerald-500 shadow-md ring-1 ring-emerald-500/30' : 'bg-[#10141f] border-[#222f47]'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold text-xs shrink-0">
                    ▼
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-300">THE WHOLESALE FLOOR (VAL)</span>
                      <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                        Buy Zone / Bargain Support
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Price is considered cheap here. Institutional buyers absorb sell orders and defend this floor.
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono font-bold text-sm text-emerald-300 tabular-nums">{valPrice.toFixed(digits)}</div>
                  <div className="text-[10px] font-mono text-slate-400">
                    {curPrice < valPrice ? `-${Math.round((valPrice - curPrice) * pipMultiplier)}p below` : `${Math.round((curPrice - valPrice) * pipMultiplier)}p below live`}
                  </div>
                </div>
              </div>

              {/* Target & Invalidation Summary Pill */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded bg-black/40 border border-white/5 text-[11px] font-mono">
                <div className="flex items-center gap-1.5 text-purple-300">
                  <Target className="w-3.5 h-3.5 text-purple-400" />
                  <span>Main Liquidity Target:</span>
                  <strong className="text-white">{signal.targetTP2.toFixed(digits)}</strong>
                </div>
                <div className="flex items-center gap-1.5 text-rose-300">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>Invalidation Stop:</span>
                  <strong className="text-white">{invalidation.price.toFixed(digits)}</strong>
                  <span className="text-slate-500 text-[10px] hidden sm:inline">({invalidation.condition})</span>
                </div>
              </div>
            </div>

            {/* 4. EXPANDABLE 10-SECOND CHEAT SHEET (Simple Real-World Analogies) */}
            {showAuctionGuide && (
              <div className="p-3 rounded-lg bg-[#070b14] border border-[#1b253b] text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                  <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                    <span className="text-amber-400">💡</span>
                    <span>How to Read This in 10 Seconds (Real-Life Analogy)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Auction Market Theory</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1 text-[11px] leading-relaxed">
                  <div className="p-2 rounded bg-[#0e1422] border border-rose-500/20">
                    <div className="font-bold text-rose-300 mb-1 flex items-center gap-1">
                      <span>🏰 The Ceiling (VAH)</span>
                    </div>
                    <p className="text-slate-300">
                      Think of this as the top of today's normal room. When price reaches here, it is <strong>expensive</strong>. Smart traders do NOT buy here. Sellers look to short and drive price back down.
                    </p>
                  </div>

                  <div className="p-2 rounded bg-[#0e1422] border border-cyan-500/20">
                    <div className="font-bold text-cyan-300 mb-1 flex items-center gap-1">
                      <span>🧲 The Magnet (POC)</span>
                    </div>
                    <p className="text-slate-300">
                      Think of this as <strong>gravity</strong>. It's the fair price where most buyers and sellers met today. When price stretches too far up or down, it snaps back here like a rubber band.
                    </p>
                  </div>

                  <div className="p-2 rounded bg-[#0e1422] border border-emerald-500/20">
                    <div className="font-bold text-emerald-300 mb-1 flex items-center gap-1">
                      <span>🛡️ The Floor (VAL)</span>
                    </div>
                    <p className="text-slate-300">
                      Think of this as the bottom of today's normal room. When price reaches here, it is on <strong>wholesale discount</strong>. Smart traders do NOT sell here. Buyers look to purchase bargains and push price back up.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ========================================================
          ADD-ON: VALUE AREA ABSORPTION & RECLAIM INTELLIGENCE LAYER
          Bidirectional strategy operating alongside the existing model:
          - Below VAL: seller exhaustion → buyer absorption → value reclaim → LONG
          - Above VAH: buyer exhaustion → seller absorption → value rejection → SHORT
         ======================================================== */}
      {vaar && (
        <div className="bg-[#0b101b] rounded-lg border border-[#1d273d] p-4 relative overflow-hidden shadow-xl">
          {/* Top Edge Indicator Bar */}
          <div className={`absolute top-0 left-0 right-0 h-1 ${
            vaar.activeSide === 'LONG_BELOW_VAL'
              ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400'
              : vaar.activeSide === 'SHORT_ABOVE_VAH'
              ? 'bg-gradient-to-r from-red-600 via-rose-500 to-amber-500'
              : 'bg-gradient-to-r from-cyan-600 to-blue-600'
          }`} />

          {/* Header Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#182338] pb-3 mb-3.5">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-md ${
                vaar.activeSide === 'LONG_BELOW_VAL'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                  : vaar.activeSide === 'SHORT_ABOVE_VAH'
                  ? 'bg-red-950 text-red-400 border border-red-500/40'
                  : 'bg-[#121c2d] text-cyan-400 border border-[#202e48]'
              }`}>
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                    VALUE AREA ABSORPTION & RECLAIM
                  </h3>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    vaar.signal.triggerConditionMet
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-600 animate-pulse'
                      : vaar.status === 'ABSORPTION_IN_PROGRESS'
                      ? 'bg-amber-950 text-amber-300 border border-amber-600'
                      : 'bg-[#151c2e] text-slate-400 border border-slate-700'
                  }`}>
                    {vaar.signal.triggerConditionMet ? '⚡ ENTRY TRIGGERED' : vaar.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Bidirectional strategy identifying when price tests outside accepted value without volume, absorbs, and returns.
                </p>
              </div>
            </div>

            {/* Target Status Pill */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className={`px-2.5 py-1 rounded font-bold border ${
                vaar.activeSide === 'LONG_BELOW_VAL'
                  ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                  : vaar.activeSide === 'SHORT_ABOVE_VAH'
                  ? 'bg-red-950/70 border-red-500/40 text-red-300'
                  : 'bg-[#101726] border-[#1f2b42] text-slate-300'
              }`}>
                {vaar.activeSide === 'LONG_BELOW_VAL' 
                  ? '🟢 LONG · Below VAL' 
                  : vaar.activeSide === 'SHORT_ABOVE_VAH' 
                  ? '🔴 SHORT · Above VAH' 
                  : '⚪ MONITORING INSIDE VALUE'}
              </span>
            </div>
          </div>

          {/* 4 Core Intelligence Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3.5">
            {/* Card 1: Accepted Value Boundaries & Excursion */}
            <div className="p-3 rounded-lg bg-[#0d1424] border border-[#1a2842] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                  <span className="uppercase">1. Accepted Value Area</span>
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="text-xs font-mono mt-1.5 space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>VAH Ceiling:</span>
                    <strong className="text-amber-300">{vaar.acceptedValueArea.vah.toFixed(digits)}</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>POC Center:</span>
                    <strong className="text-cyan-300">{vaar.acceptedValueArea.poc.toFixed(digits)}</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>VAL Floor:</span>
                    <strong className="text-amber-300">{vaar.acceptedValueArea.val.toFixed(digits)}</strong>
                  </div>
                </div>
                <p className="text-[10px] text-slate-300 mt-2 leading-tight">
                  Defended Level: <strong className="text-white">{vaar.defendedLevelLabel}</strong>
                </p>
              </div>
              <div className="mt-2 pt-1.5 border-t border-white/5 text-[10px] font-mono text-cyan-400">
                Zone: {vaar.acceptedValueArea.zoneState.replace(/_/g, ' ')}
              </div>
            </div>

            {/* Card 2: Volume Participation Trend */}
            <div className="p-3 rounded-lg bg-[#0d1424] border border-[#1a2842] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                  <span className="uppercase">2. Volume Participation</span>
                  <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-xs font-bold font-mono text-amber-300 mt-1">
                  {vaar.auctionContext.volumeParticipationTrend.replace(/_/g, ' ')}
                </div>
                <p className="text-[11px] text-slate-300 mt-1.5 leading-snug">
                  {vaar.auctionContext.volumeTrendDescription}
                </p>
              </div>
              <div className="mt-2 pt-1.5 border-t border-white/5 text-[10px] font-mono text-slate-400">
                Participation: {vaar.auctionContext.isFailedAuctionReversion ? 'Declining outside value (exhaustion)' : 'Active acceptance'}
              </div>
            </div>

            {/* Card 3: Order Flow Evidence & Failure Point */}
            <div className="p-3 rounded-lg bg-[#0d1424] border border-[#1a2842] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                  <span className="uppercase">3. Order Flow Evidence</span>
                  <Activity className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div className="text-xs font-mono mt-1 space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Aggressive Takers:</span>
                    <strong className="text-white">{vaar.auctionContext.orderFlowEvidence.aggressiveVolume} Lots</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Passive Wall Depth:</span>
                    <strong className="text-emerald-300">{vaar.auctionContext.orderFlowEvidence.domWallDepthLots} Lots</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Price Progress:</span>
                    <strong className="text-amber-300">{vaar.auctionContext.orderFlowEvidence.priceProgressPips} pips (Stalled)</strong>
                  </div>
                </div>
                <p className="text-[10px] text-slate-300 mt-1.5 leading-tight">
                  Failure Point: <strong className="text-cyan-300">{vaar.auctionContext.orderFlowEvidence.failurePointPrice.toFixed(digits)}</strong>
                </p>
              </div>
              <div className="mt-2 pt-1.5 border-t border-white/5 text-[10px] font-mono text-purple-300">
                Tier: {vaar.auctionContext.orderFlowEvidence.measurementTier.replace(/_/g, ' ')}
              </div>
            </div>

            {/* Card 4: Critical Market Intelligence (Failed Auction vs Trend Discovery) */}
            <div className="p-3 rounded-lg bg-[#0d1424] border border-[#1a2842] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                  <span className="uppercase">4. Auction Classification</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className={`text-xs font-bold font-mono mt-1 ${
                  vaar.auctionContext.isFailedAuctionReversion ? 'text-emerald-300' : 'text-amber-300'
                }`}>
                  {vaar.auctionContext.classification.replace(/_/g, ' ')}
                </div>
                <p className="text-[10px] text-slate-300 mt-1.5 leading-snug">
                  {vaar.auctionContext.isFailedAuctionReversion
                    ? 'LOW VOL + ABSORPTION + VALUE RECLAIM: Verified failed auction. Opposing liquidity held and aggressive volume stopped moving price.'
                    : 'RISING VOL + ACCEPTANCE OUTSIDE VALUE: Genuine price discovery underway. Reversal entry strictly blocked to prevent counter-trend traps.'}
                </p>
              </div>
              <div className="mt-2 pt-1.5 border-t border-white/5 text-[10px] font-mono text-slate-400">
                Rule: Order flow backed (DOM + Delta), not assumed
              </div>
            </div>
          </div>

          {/* Strategy Target Progression & Action Directive Bar */}
          <div className="rounded-lg bg-[#080d17] border border-[#162137] p-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2 mb-2">
              <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Strategy Progression (VAL/VAH Reclaim → POC → Opposite Value Edge)</span>
              </span>
              <span className="font-mono text-cyan-300 text-[11px]">
                {vaar.signal.triggerHeadline}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
              <div className={`p-2 rounded border ${
                vaar.signal.targetProgression.stage1.hit 
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300' 
                  : 'bg-[#0f1728] border-slate-700 text-slate-300'
              }`}>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Stage 1 · Boundary Reclaim</div>
                <div className="font-bold mt-0.5">{vaar.signal.targetProgression.stage1.label}</div>
                <div className="text-[10px] mt-0.5">{vaar.signal.targetProgression.stage1.hit ? '✓ Reclaimed & Defended' : 'Pending Reclaim'}</div>
              </div>

              <div className={`p-2 rounded border ${
                vaar.signal.targetProgression.stage2.hit 
                  ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300' 
                  : 'bg-[#0f1728] border-slate-700 text-slate-300'
              }`}>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Stage 2 · Mean Reversion Target</div>
                <div className="font-bold mt-0.5">{vaar.signal.targetProgression.stage2.label}</div>
                <div className="text-[10px] mt-0.5">Equilibrium Fair Value Center</div>
              </div>

              <div className="p-2 rounded border bg-[#0f1728] border-slate-700 text-slate-300">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Stage 3 · Full Value Rotation</div>
                <div className="font-bold mt-0.5">{vaar.signal.targetProgression.stage3.label}</div>
                <div className="text-[10px] mt-0.5">Opposite Value Area Boundary</div>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
              <span className="text-white">
                <strong>Entry Directive:</strong> {vaar.signal.entryTrigger}
              </span>
              <span className="text-red-300">
                <strong>Invalidation:</strong> {vaar.signal.invalidationCondition}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          LEVEL 4 & 5: FOUR TECHNICAL OBSERVATION TILES
          (LIQUIDITY | ORDER FLOW | EFFORT VS RESULT | ACTIVE SETUP)
         ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* TILE 1: LIQUIDITY (PLR & SPOOFING) */}
        <div className="p-3.5 rounded-lg bg-[#0c121e] border border-[#19243a] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="font-semibold uppercase tracking-wider">Liquidity & PLR</span>
              {mi ? (
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                  mi.liquidity.spoofDetector.spoofProbability >= 0.50
                    ? 'bg-red-950 text-red-300 border border-red-500/30'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                }`}>
                  Spoof: {Math.round(mi.liquidity.spoofDetector.spoofProbability * 100)}%
                </span>
              ) : (
                <span className="font-mono text-cyan-400 font-bold">G3 Gate</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className={`p-1.5 rounded ${isUp ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
                {isUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-sm font-bold text-white">PATH LEAST RESISTANCE: {liquidity.plr}</div>
                <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{liquidity.plrReason}</div>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#172134] text-[10px] font-mono text-slate-400 flex items-center justify-between">
            <span>Resting Wall:</span>
            <span className="text-emerald-400 font-bold">
              {mi ? `${mi.liquidity.distanceToMajorLiquidity.belowPips}p below / ${mi.liquidity.distanceToMajorLiquidity.abovePips}p above` : liquidity.restingWallBelow.label}
            </span>
          </div>
        </div>

        {/* TILE 2: ORDER FLOW MICROSCOPE & CVD */}
        <div className="p-3.5 rounded-lg bg-[#0c121e] border border-[#19243a] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="font-semibold uppercase tracking-wider">Order Flow & CVD</span>
              {mi && mi.orderFlow.cvdDivergence.type !== 'NONE' && mi.orderFlow.cvdDivergence.type !== 'CONFIRMING' ? (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded font-bold bg-purple-950 text-purple-300 border border-purple-500/30 animate-pulse">
                  {mi.orderFlow.cvdDivergence.type.replace('_DIVERGENCE', ' DIV')}
                </span>
              ) : (
                <span className="font-mono text-cyan-400 font-bold">G4 Footprint</span>
              )}
            </div>
            <div className="mt-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">Delta: {orderFlow.delta > 0 ? `+${orderFlow.delta}` : orderFlow.delta}</span>
                <span className="text-xs font-mono font-bold text-emerald-400">{orderFlow.deltaTrend}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 text-xs">
                <span className="px-1.5 py-0.5 rounded bg-[#162033] text-cyan-300 font-mono font-semibold">
                  CVD {orderFlow.cvdSlope} ({orderFlow.cvd})
                </span>
                {orderFlow.stackedImbalances && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 font-mono font-semibold border border-emerald-500/30">
                    Stacked Imbalance ≥3
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#172134] text-[10px] font-mono text-slate-400 flex items-center justify-between">
            <span>Absorption at Wall:</span>
            <span className={orderFlow.absorption ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
              {orderFlow.absorption ? 'CONFIRMED' : 'NONE'}
            </span>
          </div>
        </div>

        {/* TILE 3: EFFORT VS RESULT (LAW 1 & ABSORPTION) */}
        <div className="p-3.5 rounded-lg bg-[#0c121e] border border-[#19243a] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="font-semibold uppercase tracking-wider">Effort vs Result</span>
              {mi ? (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded font-bold bg-amber-950 text-amber-300 border border-amber-500/30">
                  Absorp: {mi.absorption.absorptionScore}%
                </span>
              ) : (
                <span className="font-mono text-amber-400 font-bold">Law 1</span>
              )}
            </div>
            <div className="mt-1">
              <div className="text-sm font-bold text-amber-300">{orderFlow.effortVsResult}</div>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                {mi ? mi.absorption.summary : orderFlow.effortMismatchExplanation}
              </p>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#172134] text-[10px] font-mono text-slate-400 flex items-center justify-between">
            <span>Effort Score:</span>
            <span className="text-amber-300 font-bold">{(orderFlow.effortScore * 100).toFixed(0)}% Intensity</span>
          </div>
        </div>

        {/* TILE 4: ACTIVE PLAYBOOK & SETUP TYPE */}
        <div className="p-3.5 rounded-lg bg-[#0c121e] border border-[#19243a] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="font-semibold uppercase tracking-wider">Play Fired</span>
              {mi ? (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded font-bold bg-purple-950 text-purple-300 border border-purple-500/30">
                  {mi.entryEngine.setupType.replace(/_/g, ' ')}
                </span>
              ) : (
                <span className="font-mono text-purple-400 font-bold">G5 Trigger</span>
              )}
            </div>
            <div className="mt-1">
              <div className="text-xs font-bold text-purple-300 truncate" title={signal.playName}>
                {signal.playName}
              </div>
              <div className="flex items-center gap-2 mt-1.5 text-xs font-mono">
                <span className="text-slate-400">RR Ratio:</span>
                <span className="font-bold text-emerald-400">{signal.riskRewardRatio}:1 (≥ 2.0 HG7)</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#172134] text-[10px] font-mono text-slate-400 flex items-center justify-between">
            <span>Stop to Break-Even:</span>
            <span className="text-cyan-300 font-bold">Zero-Risk Doctrine</span>
          </div>
        </div>
      </div>

      {/* ========================================================
          NEW: INSTITUTIONAL INTELLIGENCE STRIP
          (ForexFactory Macro News, Squeeze Engine, Shakeout, Mean-Reversion)
         ======================================================== */}
      {mi && (
        <div className="p-3 rounded-lg bg-[#080d16] border border-[#162136] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Scale className="w-3.5 h-3.5 text-cyan-400" />
              <span>Multi-Engine Confluence Matrix</span>
            </span>
            <button
              onClick={() => setShowIntelligenceDetails(!showIntelligenceDetails)}
              className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <span>{showIntelligenceDetails ? 'Hide Metrics' : 'Expand Metrics'}</span>
              {showIntelligenceDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {showIntelligenceDetails && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1 text-xs font-mono">
              {/* Metric 1: Macro News Event */}
              <div className="p-2 rounded bg-[#0e1422] border border-[#182338]">
                <div className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Macro Risk</span>
                  <Calendar className="w-3 h-3 text-emerald-400" />
                </div>
                <div className={`text-xs font-bold mt-0.5 truncate ${
                  mi.macroNews.eventRisk.includes('EXTREME') || mi.macroNews.eventRisk.includes('HIGH')
                    ? 'text-red-400'
                    : 'text-emerald-400'
                }`}>
                  {mi.macroNews.eventRisk.replace(/_/g, ' ')}
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                  {mi.macroNews.upcomingEvents[0]?.eventTitle || 'No immediate events'}
                </div>
              </div>

              {/* Metric 2: Squeeze Engine */}
              <div className="p-2 rounded bg-[#0e1422] border border-[#182338]">
                <div className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Squeeze Engine</span>
                  <Zap className="w-3 h-3 text-amber-400" />
                </div>
                <div className="text-xs font-bold mt-0.5 text-amber-300">
                  {mi.squeeze.activeSqueeze !== 'NONE' ? mi.squeeze.activeSqueeze.replace(/_/g, ' ') : 'Balanced'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Short: {mi.squeeze.shortSqueezeScore}% · Long: {mi.squeeze.longSqueezeScore}%
                </div>
              </div>

              {/* Metric 3: Shakeout Engine */}
              <div className="p-2 rounded bg-[#0e1422] border border-[#182338]">
                <div className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Shakeout Engine</span>
                  <Compass className="w-3 h-3 text-purple-400" />
                </div>
                <div className={`text-xs font-bold mt-0.5 ${mi.shakeout.isConfirmedShakeout ? 'text-purple-300' : 'text-slate-300'}`}>
                  {mi.shakeout.isConfirmedShakeout ? mi.shakeout.shakeoutDirection : 'No Sweep'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Confidence: {mi.shakeout.shakeoutConfidence}%
                </div>
              </div>

              {/* Metric 4: Mean Reversion */}
              <div className="p-2 rounded bg-[#0e1422] border border-[#182338]">
                <div className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Mean Reversion</span>
                  <Activity className="w-3 h-3 text-blue-400" />
                </div>
                <div className="text-xs font-bold mt-0.5 text-blue-300">
                  {mi.meanReversion.normalizedDeviationZScore}σ from POC
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Revert: {mi.meanReversion.meanReversionProbability}% prob
                </div>
              </div>

              {/* Metric 5: Climactic Buy/Sell Detector */}
              <div className="p-2 rounded bg-[#0e1422] border border-[#182338]">
                <div className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Climactic Buy/Sell</span>
                  <Flame className="w-3 h-3 text-rose-400" />
                </div>
                <div className={`text-xs font-bold mt-0.5 truncate ${mi.climactic?.isClimactic ? 'text-rose-300' : 'text-slate-300'}`}>
                  {mi.climactic?.isClimactic
                    ? mi.climactic.climacticDirection === 'CLIMACTIC_BUY_EXHAUSTION'
                      ? 'BUY CLIMAX'
                      : 'SELL CLIMAX'
                    : `Score ${mi.climactic?.climaxScore ?? 24}%`}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Vol: {mi.climactic?.volumeZScore ?? 1.2}x · Wick: {Math.round((mi.climactic?.wickRejectionRatio ?? 0.3) * 100)}%
                </div>
              </div>

              {/* Metric 6: Compression & Coiling Detector */}
              <div className="p-2 rounded bg-[#0e1422] border border-[#182338]">
                <div className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Compression Coil</span>
                  <Layers className="w-3 h-3 text-cyan-400" />
                </div>
                <div className={`text-xs font-bold mt-0.5 truncate ${mi.compression?.isCompressed ? 'text-cyan-300' : 'text-slate-300'}`}>
                  {mi.compression?.isCompressed ? `COILED (${mi.compression.valueAreaCompressionPct}%)` : `${mi.compression?.atrContractionRatio ?? 0.72}x ATR`}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {mi.compression?.coiledOrderVolumeLots ?? 1240} lots · {mi.compression?.expectedBreakoutBias?.replace('_RELEASE', '') || 'READY'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          THE 9 CORE QUESTIONS (1-3 SECOND VISUAL STORY)
         ======================================================== */}
      <div className="bg-[#0b101b] rounded-lg border border-[#1b253b] p-4">
        <div className="flex items-center justify-between border-b border-[#182236] pb-2 mb-3">
          <h3 className="text-sm font-bold tracking-wide text-white uppercase flex items-center gap-2">
            <span>The 9 Core Market Questions</span>
            <span className="text-xs text-slate-400 font-normal tracking-normal">(Instant 1–3 Second Scan)</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 text-xs">
          {/* Question 1 */}
          <div className="p-2.5 rounded bg-[#0f1523] border border-[#1a2336]">
            <div className="text-slate-400 text-[11px] font-medium">1. WHERE IS THE MARKET?</div>
            <div className="font-bold text-cyan-300 mt-0.5">{nineQuestions.whereIsMarket}</div>
          </div>

          {/* Question 2 */}
          <div className="p-2.5 rounded bg-[#0f1523] border border-[#1a2336]">
            <div className="text-slate-400 text-[11px] font-medium">2. WHAT IS THE MARKET DOING?</div>
            <div className="font-semibold text-slate-200 mt-0.5">{nineQuestions.whatIsDoing}</div>
          </div>

          {/* Question 3 */}
          <div className="p-2.5 rounded bg-[#0f1523] border border-[#1a2336]">
            <div className="text-slate-400 text-[11px] font-medium">3. WHERE IS VALUE?</div>
            <div className="font-semibold text-amber-300 mt-0.5">{nineQuestions.whereIsValue}</div>
          </div>

          {/* Question 4 */}
          <div className="p-2.5 rounded bg-[#0f1523] border border-[#1a2336]">
            <div className="text-slate-400 text-[11px] font-medium">4. WHO IS IN CONTROL?</div>
            <div className="font-bold text-emerald-400 mt-0.5">{nineQuestions.whoIsInControl}</div>
          </div>

          {/* Question 5 */}
          <div className="p-2.5 rounded bg-[#0f1523] border border-[#1a2336]">
            <div className="text-slate-400 text-[11px] font-medium">5. WHERE IS LIQUIDITY?</div>
            <div className="font-semibold text-purple-300 mt-0.5">{nineQuestions.whereIsLiquidity}</div>
          </div>

          {/* Question 6 */}
          <div className="p-2.5 rounded bg-[#0f1523] border border-[#1a2336]">
            <div className="text-slate-400 text-[11px] font-medium">6. WHAT IS THE MODEL SEEING?</div>
            <div className="font-semibold text-slate-200 mt-0.5">{nineQuestions.whatIsModelSeeing}</div>
          </div>

          {/* Question 7 */}
          <div className="p-2.5 rounded bg-[#0f1523] border border-[#1a2336]">
            <div className="text-slate-400 text-[11px] font-medium">7. WHAT IS THE MODEL EXPECTING?</div>
            <div className="font-bold text-cyan-300 mt-0.5">{nineQuestions.whatIsModelExpecting}</div>
          </div>

          {/* Question 8 */}
          <div className="p-2.5 rounded bg-[#0f1523] border border-[#1a2336]">
            <div className="text-slate-400 text-[11px] font-medium">8. WHAT WOULD INVALIDATE?</div>
            <div className="font-bold text-red-400 mt-0.5">{nineQuestions.whatWouldInvalidate}</div>
          </div>

          {/* Question 9 */}
          <div className="p-2.5 rounded bg-[#0f1523] border border-[#1a2336]">
            <div className="text-slate-400 text-[11px] font-medium">9. IS THERE A TRADE OR NO TRADE?</div>
            <div className="font-extrabold text-white mt-0.5">{nineQuestions.tradeOrNoTrade}</div>
          </div>
        </div>
      </div>

      {/* ========================================================
          LEVEL 8: LIVE & UPCOMING ECONOMIC NEWS & PREDICTIONS
          (CPI, NFP, PPI, FOMC & Core PCE - 5-Stage Synthesis)
         ======================================================== */}
      <EconomicNewsPredictionEngine
        currentSymbol={currentSym}
        modelOutput={modelOutput}
        digits={digits}
        onAddNoteToAnalysis={(note) => {
          setSelectedAnalysisNotes((prev) => {
            if (prev.some((n) => n.id === note.id)) return prev;
            return [...prev, note];
          });
        }}
        selectedAnalysisNotes={selectedAnalysisNotes}
        onRemoveNoteFromAnalysis={(noteId) => {
          setSelectedAnalysisNotes((prev) => prev.filter((n) => n.id !== noteId));
        }}
        onClearAnalysisNotes={() => setSelectedAnalysisNotes([])}
        onOpenAnalysisTab={() => setMacroTab('analysis')}
      />

      {/* Optional: If User Has Active Synthesized Analysis Notes, Show Synthesized Thesis Drawer */}
      {selectedAnalysisNotes.length > 0 && (
        <div className="bg-[#090d16] rounded-lg border border-emerald-500/40 p-3.5 shadow-lg">
          <div className="flex items-center justify-between border-b border-[#162136] pb-2.5 mb-2.5">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Synthesized Market Analysis Thesis ({selectedAnalysisNotes.length} Active Catalysts)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopySynthesizedAnalysis}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-[#101b2c] hover:bg-[#16253c] text-cyan-300 border border-cyan-500/30 flex items-center gap-1 cursor-pointer transition-colors"
              >
                {isCopiedAnalysis ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{isCopiedAnalysis ? 'Copied!' : 'Copy Thesis'}</span>
              </button>
              <button
                onClick={() => setSelectedAnalysisNotes([])}
                className="p-1 rounded text-slate-400 hover:text-red-400 cursor-pointer"
                title="Clear all thesis notes"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <pre className="whitespace-pre-wrap text-slate-300 leading-relaxed text-[11px] font-mono max-h-[260px] overflow-y-auto scrollbar-thin select-text">
            {generateSynthesizedMarketAnalysis(
              currentSym,
              location.currentPrice,
              scorecard.grade,
              (modelOutput.sniperEdge?.triggerAction as any) || 'WAIT_FOR_EDGE',
              modelOutput.sniperEdge?.optimalEntry || location.currentPrice,
              modelOutput.sniperEdge?.hardStopLoss || location.currentPrice * 0.995,
              modelOutput.sniperEdge?.targetTP1 || location.currentPrice * 1.005,
              modelOutput.sniperEdge?.targetTP2 || location.currentPrice * 1.01,
              modelOutput.sniperEdge?.targetTP3 || location.currentPrice * 1.02,
              modelOutput.sniperEdge?.riskRewardRatio || 2.5,
              selectedAnalysisNotes,
              {
                poc: valueStructure.poc,
                vah: valueStructure.vah,
                val: valueStructure.val,
                exhaustedSide: exhaustion.exhaustedSide,
                exhaustionScore: exhaustion.exhaustionScore,
                deltaTrend: orderFlow.deltaTrend,
                whyPriceIsMoving: mi?.whyPriceIsMoving.primaryReason,
                whyLevelRevisited: mi?.whyPriceIsMoving.whyLevelRevisited,
                trappedSide: mi?.whyPriceIsMoving.whyBullets?.[2],
                whatStopsTheMove: mi?.whyPriceIsMoving.whatStopsTheMove,
                possibleFirstMove: mi?.whyPriceIsMoving.expectedInitialSweep,
                invalidationReason: mi?.whyPriceIsMoving.invalidationConditions,
              }
            )}
          </pre>
        </div>
      )}
    </div>
  );
};
