import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Flame, 
  Target, 
  TrendingUp, 
  TrendingDown,
  Check, 
  Copy, 
  Sparkles, 
  Clock, 
  Volume2, 
  RefreshCw, 
  AlertTriangle,
  Activity,
  Layers,
  Search,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Globe,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  Radio,
  Compass,
  ArrowRight
} from 'lucide-react';
import { 
  MacroReleaseType, 
  EconomicNewsPrediction, 
  RawCalendarEvent,
  generateCuratedPredictions,
  getRecentlyReleasedEvents,
  formatLiveCountdown,
  formatToLocalTime,
  PPI_POST_RELEASE_RETROSPECTIVE
} from '../services/economicPredictionService';
import { SniperModelOutput } from '../types/sniperModel';
import { MarketAnalysisNote } from '../services/marketNewsService';
import { tradingVoice } from '../services/tradingVoiceService';
import { getDstInfo } from '../services/marketHoursService';
import { INSTRUMENTS } from '../services/mockDataGenerator';

interface EconomicNewsPredictionEngineProps {
  currentSymbol: string;
  modelOutput: SniperModelOutput;
  digits?: number;
  onAddNoteToAnalysis?: (note: MarketAnalysisNote) => void;
  selectedAnalysisNotes?: MarketAnalysisNote[];
  onRemoveNoteFromAnalysis?: (noteId: string) => void;
  onClearAnalysisNotes?: () => void;
  onOpenAnalysisTab?: () => void;
}

export const EconomicNewsPredictionEngine: React.FC<EconomicNewsPredictionEngineProps> = ({
  currentSymbol,
  modelOutput,
  digits = 2,
  onAddNoteToAnalysis,
  selectedAnalysisNotes = [],
}) => {
  const [activeTab, setActiveTab] = useState<'UPCOMING' | 'HISTORY'>('UPCOMING');
  const [selectedCategory, setSelectedCategory] = useState<MacroReleaseType | 'ALL'>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [liveEvents, setLiveEvents] = useState<RawCalendarEvent[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Live');
  
  // Track expanded cards
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});

  // User's detected local timezone and live clock
  const [userTimeZone, setUserTimeZone] = useState<string>('');
  const [userLocalClock, setUserLocalClock] = useState<string>('');

  // Real-time Daylight Saving Time (DST) calibration
  const dstInfo = useMemo(() => getDstInfo(), []);
  const currentInst = INSTRUMENTS[currentSymbol] || INSTRUMENTS.XAUUSD;

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setUserTimeZone(tz);
    } catch {
      setUserTimeZone('Local Time');
    }

    const updateClock = () => {
      setUserLocalClock(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch live calendar events
  const fetchLiveCalendar = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch(`/api/macro/calendar?symbol=${encodeURIComponent(currentSymbol)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.events && Array.isArray(data.events)) {
          setLiveEvents(data.events);
          setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
        }
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsRefreshing(false);
    }
  }, [currentSymbol]);

  useEffect(() => {
    fetchLiveCalendar();
    const interval = setInterval(fetchLiveCalendar, 30_000);
    return () => clearInterval(interval);
  }, [fetchLiveCalendar]);

  // Generate upcoming predictions tailored specifically to currentSymbol
  const predictions = useMemo(() => {
    return generateCuratedPredictions(currentSymbol, modelOutput, digits, liveEvents);
  }, [currentSymbol, modelOutput, digits, liveEvents]);

  // Released events for historical tab
  const releasedEvents = useMemo(() => {
    return getRecentlyReleasedEvents(liveEvents);
  }, [liveEvents]);

  // Filter based on category or search
  const filteredPredictions = useMemo(() => {
    return predictions.filter((p) => {
      const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
      const matchesSearch = !searchQuery || 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.finalPrediction.verdictCall.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.pairSpecificImpact.impactBadge.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [predictions, selectedCategory, searchQuery]);

  const toggleCard = (id: string) => {
    setExpandedCardIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const areAllExpanded = filteredPredictions.length > 0 && filteredPredictions.every((p) => expandedCardIds[p.id]);
  const handleToggleExpandAll = () => {
    if (areAllExpanded) {
      setExpandedCardIds({});
    } else {
      const next: Record<string, boolean> = {};
      filteredPredictions.forEach((p) => {
        next[p.id] = true;
      });
      setExpandedCardIds(next);
    }
  };

  const handleCopyPrediction = (pred: EconomicNewsPrediction) => {
    const localTime = formatToLocalTime(pred.eventTime);
    const pi = pred.pairSpecificImpact;
    const text = `=====================================================
MACRO INTELLIGENCE REPORT: ${pred.title}
Active Pair: ${currentSymbol} (${pi.symbolFullName})
Pair Impact: ${pi.impactBadge} (${pi.expectedExcursionDisplay})
Countdown: ${pred.countdownFormatted} (${localTime.fullLocalDisplay})
=====================================================

1. HOW THIS NEWS AFFECTS ${currentSymbol}:
• Currency Transmission: ${pi.roleExplanation}
• Mechanism: ${pi.transmissionMechanics}

2. CONSENSUS & BENCHMARKS:
• Expected: ${pred.newsPrediction.consensusValue} (Prior: ${pred.newsPrediction.previousValue})
• Desk Whisper: ${pred.newsPrediction.whisperNumber}
• Bank Range: ${pred.newsPrediction.bankConsensusRange}

3. ORDER FLOW & POSITIONING ON ${currentSymbol}:
• Order Flow: ${pred.modelMarketObservations.orderFlowState}
• Resting Liquidity: ${pred.modelMarketObservations.restingLiquidity}
• CVD/Delta: ${pred.modelMarketObservations.cvdDeltaState}
• Trap Warning: ${pred.assessmentWithNews.trapWarning}

4. 2-PHASE EXECUTION PLAYBOOK FOR ${currentSymbol}:
• Phase 1 (0-90s Stop-Hunt): ${pi.phase1KneeJerk.direction.replace(/_/g, ' ')} -> ${pi.phase1KneeJerk.targetPriceStr} (${pi.phase1KneeJerk.levelName})
  Details: ${pi.phase1KneeJerk.expectedAction}
  Warning: ${pi.phase1KneeJerk.trapWarning}
• Phase 2 (2-35m True Move): ${pi.phase2TrueMacroMove.direction.replace(/_/g, ' ')} -> ${pi.phase2TrueMacroMove.targetPriceStr} (${pi.phase2TrueMacroMove.levelName})
  Details: ${pi.phase2TrueMacroMove.expectedAction}
• Direct Action: ${pi.rightActualMovePlaybook.verdictSummary}
• Timing Rule: ${pi.rightActualMovePlaybook.timingAdvice}
=====================================================`;

    navigator.clipboard.writeText(text);
    setCopiedId(pred.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSpeakPrediction = (pred: EconomicNewsPrediction) => {
    if (speakingId === pred.id) {
      window.speechSynthesis?.cancel();
      setSpeakingId(null);
      return;
    }

    const localTime = formatToLocalTime(pred.eventTime);
    const pi = pred.pairSpecificImpact;
    const script = `Macro catalyst update for ${pred.title}. On ${currentSymbol}, model prediction is ${pi.impactBadge}, with expected move of ${pi.expectedExcursionDisplay}. ${pi.transmissionMechanics} In phase one, expect an initial fakeout toward ${pi.phase1KneeJerk.targetPriceStr}. Phase two will initiate the true macro expansion toward ${pi.phase2TrueMacroMove.targetPriceStr}. Recommendation: ${pi.rightActualMovePlaybook.verdictSummary}.`;

    setSpeakingId(pred.id);
    tradingVoice.speak(script, { force: true, priority: true });
    setTimeout(() => {
      setSpeakingId(null);
    }, 11000);
  };

  const handleAddPredictionToNotes = (pred: EconomicNewsPrediction) => {
    if (!onAddNoteToAnalysis) return;
    const localTime = formatToLocalTime(pred.eventTime);
    const pi = pred.pairSpecificImpact;
    onAddNoteToAnalysis({
      id: pred.id,
      symbol: currentSymbol,
      title: `${pred.category} on ${currentSymbol}: ${pi.impactBadge}`,
      type: 'NEWS_CATALYST',
      detail: `${pi.expectedExcursionDisplay} expected. ${pi.transmissionMechanics} Playbook: ${pi.rightActualMovePlaybook.verdictSummary}`,
      impact: pred.impact === 'CRITICAL' ? 'HIGH' : pred.impact,
      sentiment: pi.directionalBias.includes('BULLISH') ? 'BULLISH' : 'BEARISH',
      addedAt: Date.now(),
    });
  };

  // Quick summary of how the current pair reacts to USD news
  const pairTransmissionTag = useMemo(() => {
    if (currentInst.type === 'metals') {
      return {
        label: 'Hard Asset · Inversely Correlated with Real Yields & DXY',
        color: 'text-amber-300 bg-amber-950/40 border-amber-800/50',
      };
    }
    if (currentInst.type === 'crypto') {
      return {
        label: 'Digital Liquidity · High Beta Sensitivity to Global M2',
        color: 'text-cyan-300 bg-cyan-950/40 border-cyan-800/50',
      };
    }
    if (currentInst.type === 'indices') {
      return {
        label: 'Equity Multiples · Inversely Sensitive to Discount Rates',
        color: 'text-indigo-300 bg-indigo-950/40 border-indigo-800/50',
      };
    }
    if (currentSymbol.startsWith('USD')) {
      return {
        label: 'USD is Base Currency · Dollar Weakness = Pair Plummets (Direct)',
        color: 'text-rose-300 bg-rose-950/40 border-rose-800/50',
      };
    }
    return {
      label: 'USD is Quote Currency · Dollar Weakness = Pair Rallies (Inverted)',
      color: 'text-emerald-300 bg-emerald-950/40 border-emerald-800/50',
    };
  }, [currentSymbol, currentInst.type]);

  return (
    <div className="bg-[#0b0f19] border border-[#1b253b] rounded-xl overflow-hidden shadow-2xl">
      {/* Sleek Terminal Header */}
      <div className="px-4 py-3 bg-[#0d1424] border-b border-[#1b253b] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <h2 className="text-sm font-bold text-white tracking-wide uppercase font-mono flex items-center gap-2">
              Economic Catalysts & Macro Playbook
              <span className="text-[11px] px-2 py-0.5 rounded bg-[#162035] text-cyan-300 font-mono font-medium border border-cyan-800/40">
                {currentSymbol}
              </span>
            </h2>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono text-slate-400 bg-[#080d18] px-2.5 py-1 rounded-md border border-[#162137]">
            <Globe className="w-3 h-3 text-sky-400" />
            <span className="text-slate-300">{userLocalClock || '--:--'}</span>
            <span className="text-slate-500">({userTimeZone ? userTimeZone.split('/').pop()?.replace(/_/g, ' ') : 'Local'})</span>
          </div>
        </div>

        {/* Tab & Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-[#070b14] p-0.5 rounded-lg border border-[#1a243a]">
            <button
              onClick={() => setActiveTab('UPCOMING')}
              className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-colors ${
                activeTab === 'UPCOMING'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Upcoming ({predictions.length})
            </button>
            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-colors ${
                activeTab === 'HISTORY'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Archive & Post-Mortem
            </button>
          </div>

          {activeTab === 'UPCOMING' && (
            <button
              onClick={handleToggleExpandAll}
              className="text-xs font-mono px-2.5 py-1 rounded-md bg-[#131b2e] hover:bg-[#19243d] text-slate-300 border border-[#202c48] transition-colors"
              title={areAllExpanded ? 'Collapse All Cards' : 'Expand All Cards'}
            >
              {areAllExpanded ? 'Compact All' : 'Expand All'}
            </button>
          )}

          <div className="relative">
            <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-28 sm:w-36 bg-[#080d18] border border-[#1b253b] rounded-md pl-7 pr-2 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <button
            onClick={fetchLiveCalendar}
            disabled={isRefreshing}
            className="p-1.5 rounded-md bg-[#131b2e] hover:bg-[#19243d] border border-[#202c48] text-slate-300 transition-colors disabled:opacity-50"
            title={`Last sync: ${lastSyncTime}`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
          </button>
        </div>
      </div>

      {/* Real-time Pair Transmission & Daylight Saving Time (DST) Intelligence Strip */}
      <div className="px-4 py-2 bg-[#090e1b] border-b border-[#162137] flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold">
            <Compass className="w-3.5 h-3.5 text-indigo-400" />
            <span>Active Pair Transmission:</span>
          </span>
          <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${pairTransmissionTag.color}`}>
            {currentSymbol} · {pairTransmissionTag.label}
          </span>
        </div>

        {/* Daylight Saving Time Notice */}
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="flex items-center gap-1 text-amber-300 font-bold">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>DST Status:</span>
          </span>
          <span className="px-2 py-0.5 rounded bg-[#101728] text-slate-200 border border-[#1e2a44]">
            {dstInfo.activePolicyNote}
          </span>
        </div>
      </div>

      {/* Category Filter Pills (When in Upcoming view) */}
      {activeTab === 'UPCOMING' && (
        <div className="px-4 py-2 bg-[#080d19] border-b border-[#141e32] flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono scrollbar-none">
          <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px] mr-1">Catalysts:</span>
          {(['ALL', 'NFP', 'FOMC', 'CPI', 'RETAIL', 'CLAIMS', 'OTHER'] as const).map((cat) => {
            const count = cat === 'ALL' ? predictions.length : predictions.filter((p) => p.category === cat).length;
            if (count === 0 && cat !== 'ALL') return null;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-0.5 rounded-full font-medium transition-all flex items-center gap-1 shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-[#101726] hover:bg-[#162136] text-slate-400 hover:text-slate-200 border border-[#1b2742]'
                }`}
              >
                {cat === 'NFP' && <span>🔥</span>}
                {cat === 'FOMC' && <span>⚡</span>}
                <span>{cat}</span>
                <span className={`text-[9px] px-1 rounded ${selectedCategory === cat ? 'bg-indigo-700 text-white' : 'bg-[#182338] text-slate-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {activeTab === 'UPCOMING' ? (
        <div className="p-3.5 space-y-2.5">
          {filteredPredictions.length === 0 ? (
            <div className="text-center py-10 text-slate-500 font-mono text-xs bg-[#080d18] rounded-lg border border-dashed border-[#1b253b]">
              No upcoming catalysts found matching &ldquo;{searchQuery}&rdquo;.
            </div>
          ) : (
            filteredPredictions.map((pred, index) => {
              const isFirst = index === 0;
              const isExpanded = Boolean(expandedCardIds[pred.id]);
              const localTime = formatToLocalTime(pred.eventTime);
              const isSelectedNote = selectedAnalysisNotes.some((n) => n.id === pred.id);
              const pi = pred.pairSpecificImpact;
              const isBullish = pi.directionalBias.includes('BULL');
              const isBearish = pi.directionalBias.includes('BEAR');

              return (
                <div
                  key={pred.id}
                  className={`rounded-lg border transition-all duration-150 overflow-hidden ${
                    isExpanded
                      ? 'bg-[#0f172a] border-indigo-500/60 shadow-lg ring-1 ring-indigo-500/20'
                      : isFirst
                      ? 'bg-[#0d1424] border-amber-500/40 hover:border-amber-400/60'
                      : 'bg-[#0a0f1d] border-[#182338] hover:border-[#22314e]'
                  }`}
                >
                  {/* Compact Header Bar */}
                  <div
                    onClick={() => toggleCard(pred.id)}
                    className="p-3 cursor-pointer select-none flex flex-col md:flex-row md:items-center justify-between gap-2.5"
                  >
                    {/* Left: Timing & Event Title */}
                    <div className="flex items-center gap-2.5 flex-wrap flex-1 min-w-0">
                      {/* Countdown Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold tracking-tight ${
                          isFirst
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800/80 text-slate-300 border border-slate-700'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        {pred.countdownFormatted}
                      </span>

                      {/* Local Clock Badge */}
                      <span className="text-[11px] font-mono text-sky-400 bg-sky-950/40 border border-sky-800/30 px-2 py-0.5 rounded">
                        {localTime.timeStr}
                      </span>

                      {/* Event Title */}
                      <span className="text-xs sm:text-sm font-bold text-white tracking-wide">
                        {pred.title}
                      </span>

                      {/* Impact Tag */}
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                          pred.impact === 'CRITICAL'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {pred.impact}
                      </span>

                      {/* Key Benchmark Pill */}
                      <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                        Exp: <strong className="text-amber-300">{pred.newsPrediction.consensusValue}</strong> (Prev: {pred.newsPrediction.previousValue})
                      </span>
                    </div>

                    {/* Right: Dynamic Model Bias for THIS Active Pair & Quick Actions */}
                    <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
                      {/* Directional Bias Pill Tailored to currentSymbol */}
                      <div
                        className={`px-2.5 py-1 rounded text-xs font-mono font-bold flex items-center gap-1.5 border ${
                          isBullish
                            ? 'bg-emerald-950/70 text-emerald-300 border-emerald-600/60 shadow-xs shadow-emerald-500/20'
                            : isBearish
                            ? 'bg-rose-950/70 text-rose-300 border-rose-600/60 shadow-xs shadow-rose-500/20'
                            : 'bg-indigo-950/70 text-indigo-300 border-indigo-600/60'
                        }`}
                      >
                        {isBullish ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> : <TrendingDown className="w-3.5 h-3.5 text-rose-400" />}
                        <span>{pi.impactBadge}</span>
                        <span className="text-[10px] text-slate-300 font-normal">({pi.expectedExcursionDisplay})</span>
                      </div>

                      {/* Audio Briefing */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSpeakPrediction(pred);
                        }}
                        className={`p-1.5 rounded border text-xs transition-colors ${
                          speakingId === pred.id
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-[#121a2c] hover:bg-[#19243c] text-slate-300 border-[#202c46]'
                        }`}
                        title="Listen to pair-specific briefing"
                      >
                        <Volume2 className={`w-3.5 h-3.5 ${speakingId === pred.id ? 'animate-pulse text-amber-400' : ''}`} />
                      </button>

                      {/* Copy Summary */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyPrediction(pred);
                        }}
                        className="p-1.5 rounded bg-[#121a2c] hover:bg-[#19243c] border border-[#202c46] text-slate-300 text-xs transition-colors"
                        title="Copy pair report"
                      >
                        {copiedId === pred.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      {/* Add to Thesis Note */}
                      {onAddNoteToAnalysis && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddPredictionToNotes(pred);
                          }}
                          className={`px-2 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1 border ${
                            isSelectedNote
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-[#121a2c] hover:bg-[#19243c] text-slate-300 border-[#202c46]'
                          }`}
                          title="Add to market thesis notes"
                        >
                          {isSelectedNote ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Sparkles className="w-3 h-3 text-indigo-400" />}
                          <span className="hidden sm:inline">{isSelectedNote ? 'In Note' : '+ Note'}</span>
                        </button>
                      )}

                      {/* Chevron */}
                      <div className="text-slate-400 pl-1">
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-indigo-400" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Summary Bar when Collapsed (Institutional Execution Path specifically for currentSymbol) */}
                  {!isExpanded && (
                    <div className="px-3 pb-2.5 pt-0 flex flex-wrap items-center gap-2 text-[11px] font-mono border-t border-[#141d30]/60 mt-1 pt-2">
                      <span className="text-cyan-400 flex items-center gap-1 font-bold">
                        {currentSymbol} 2-Phase Path:
                      </span>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${
                        pi.phase1KneeJerk.direction.includes('BEAR')
                          ? 'bg-rose-950/40 text-rose-300 border border-rose-900/40'
                          : 'bg-emerald-950/40 text-emerald-300 border border-emerald-900/40'
                      }`}>
                        {pi.phase1KneeJerk.direction.includes('BEAR') ? <ArrowDownRight className="w-3 h-3 text-rose-400" /> : <ArrowUpRight className="w-3 h-3 text-emerald-400" />}
                        Ph.1 Sweep: {pi.phase1KneeJerk.direction.replace(/_/g, ' ')} &rarr; {pi.phase1KneeJerk.targetPriceStr}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${
                        pi.phase2TrueMacroMove.direction.includes('BULL')
                          ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-900/40'
                          : 'bg-rose-950/40 text-rose-300 border border-rose-900/40'
                      }`}>
                        {pi.phase2TrueMacroMove.direction.includes('BULL') ? <ArrowUpRight className="w-3 h-3 text-emerald-400" /> : <ArrowDownRight className="w-3 h-3 text-rose-400" />}
                        Ph.2 Trend: {pi.phase2TrueMacroMove.direction.replace(/_/g, ' ')} &rarr; {pi.phase2TrueMacroMove.targetPriceStr}
                      </span>
                      <span className="text-amber-300/90 font-medium ml-auto hidden md:inline truncate max-w-md">
                        {pi.rightActualMovePlaybook.verdictSummary}
                      </span>
                    </div>
                  )}

                  {/* EXPANDED VIEW: Complete Pair-Specific Institutional Playbook */}
                  {isExpanded && (
                    <div className="p-4 border-t border-[#1e2a44] bg-[#070b14] space-y-3.5 text-xs">
                      {/* Pair Transmission Banner */}
                      <div className="p-2.5 rounded-lg bg-[#0e1628] border border-cyan-800/40 flex flex-col md:flex-row md:items-center justify-between gap-2 font-mono text-[11px]">
                        <div>
                          <span className="text-cyan-400 font-bold uppercase tracking-wider block">
                            Direct Transmission on {currentSymbol} ({pi.symbolFullName})
                          </span>
                          <span className="text-slate-300 mt-0.5 block">
                            {pi.transmissionMechanics}
                          </span>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <span className="text-slate-400">Expected Excursion:</span>
                          <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-bold border border-cyan-800">
                            {pi.expectedExcursionDisplay}
                          </span>
                        </div>
                      </div>

                      {/* 3 Pillars Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Pillar 1: Consensus & Macro Drivers */}
                        <div className="p-3 rounded-lg bg-[#0c1220] border border-[#1b253b] flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between text-amber-400 font-mono font-bold text-[11px] uppercase tracking-wider pb-1.5 border-b border-[#182339] mb-2">
                              <span className="flex items-center gap-1.5">
                                <Target className="w-3.5 h-3.5" />
                                Consensus & Whispers
                              </span>
                            </div>
                            <div className="space-y-1.5 font-mono text-[11px]">
                              <div className="flex justify-between">
                                <span className="text-slate-400">Consensus:</span>
                                <span className="text-white font-bold">{pred.newsPrediction.consensusValue}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Prior Print:</span>
                                <span className="text-slate-300">{pred.newsPrediction.previousValue}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Desk Whisper:</span>
                                <span className="text-indigo-300">{pred.newsPrediction.whisperNumber}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Bank Range:</span>
                                <span className="text-slate-300 text-right">{pred.newsPrediction.bankConsensusRange}</span>
                              </div>
                            </div>

                            <div className="mt-3 pt-2 border-t border-[#182339]">
                              <span className="text-[10px] uppercase font-mono text-slate-500 font-bold block mb-1">
                                Macro Drivers:
                              </span>
                              <ul className="space-y-1 text-slate-300 text-[11px]">
                                {pred.whyPrediction.primaryDrivers.map((driver, dIdx) => (
                                  <li key={dIdx} className="flex items-start gap-1.5">
                                    <span className="text-cyan-400 font-bold">•</span>
                                    <span>{driver}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>

                        {/* Pillar 2: Order Flow & Liquidity Positioning on currentSymbol */}
                        <div className="p-3 rounded-lg bg-[#0c1220] border border-[#1b253b] flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between text-cyan-400 font-mono font-bold text-[11px] uppercase tracking-wider pb-1.5 border-b border-[#182339] mb-2">
                              <span className="flex items-center gap-1.5">
                                <Activity className="w-3.5 h-3.5" />
                                {currentSymbol} Market Positioning
                              </span>
                            </div>
                            <div className="space-y-1.5 font-mono text-[11px]">
                              <div>
                                <span className="text-slate-400 block text-[10px]">Order Flow on {currentSymbol}:</span>
                                <span className="text-slate-200">{pred.modelMarketObservations.orderFlowState}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">CVD Delta:</span>
                                <span className="text-slate-200">{pred.modelMarketObservations.cvdDeltaState}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">Resting Liquidity:</span>
                                <span className="text-amber-300">{pred.modelMarketObservations.restingLiquidity}</span>
                              </div>
                              <div className="pt-1">
                                <span className="text-slate-400 block text-[10px]">Pricing Status:</span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-950/60 text-indigo-300 border border-indigo-800/40">
                                  {pred.assessmentWithNews.pricingStatus.replace(/_/g, ' ')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {pred.assessmentWithNews.trapWarning && (
                            <div className="mt-2.5 pt-2 border-t border-[#182339] flex items-start gap-1.5 text-[11px] text-amber-300/90">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                              <span>{pred.assessmentWithNews.trapWarning}</span>
                            </div>
                          )}
                        </div>

                        {/* Pillar 3: 2-Phase Sequence for currentSymbol */}
                        <div className="p-3 rounded-lg bg-[#0c1220] border border-[#1b253b] flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between text-emerald-400 font-mono font-bold text-[11px] uppercase tracking-wider pb-1.5 border-b border-[#182339] mb-2">
                              <span className="flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5" />
                                {currentSymbol} 2-Phase Playbook
                              </span>
                            </div>

                            <div className="space-y-2">
                              {/* Phase 1 */}
                              <div className={`p-2 rounded border ${
                                pi.phase1KneeJerk.direction.includes('BEAR')
                                  ? 'bg-rose-950/30 border-rose-900/40'
                                  : 'bg-emerald-950/30 border-emerald-900/40'
                              }`}>
                                <div className={`text-[10px] font-mono font-bold uppercase flex items-center justify-between ${
                                  pi.phase1KneeJerk.direction.includes('BEAR') ? 'text-rose-300' : 'text-emerald-300'
                                }`}>
                                  <span>Phase 1 (Stop Sweep) &rarr; {pi.phase1KneeJerk.targetPriceStr}</span>
                                  <span>{pi.phase1KneeJerk.duration}</span>
                                </div>
                                <div className="text-slate-300 text-[11px] mt-0.5">
                                  {pi.phase1KneeJerk.expectedAction}
                                </div>
                                <div className="text-amber-400/90 text-[10px] mt-1 font-mono">
                                  ⚠️ {pi.phase1KneeJerk.trapWarning}
                                </div>
                              </div>

                              {/* Phase 2 */}
                              <div className={`p-2 rounded border ${
                                pi.phase2TrueMacroMove.direction.includes('BULL')
                                  ? 'bg-emerald-950/30 border-emerald-900/40'
                                  : 'bg-rose-950/30 border-rose-900/40'
                              }`}>
                                <div className={`text-[10px] font-mono font-bold uppercase flex items-center justify-between ${
                                  pi.phase2TrueMacroMove.direction.includes('BULL') ? 'text-emerald-300' : 'text-rose-300'
                                }`}>
                                  <span>Phase 2 (True Macro Trend) &rarr; {pi.phase2TrueMacroMove.targetPriceStr}</span>
                                  <span>{pi.phase2TrueMacroMove.duration}</span>
                                </div>
                                <div className="text-slate-300 text-[11px] mt-0.5">
                                  {pi.phase2TrueMacroMove.expectedAction}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-[#182339] font-mono text-[11px]">
                            <span className="text-amber-400 font-bold block text-[10px] uppercase">
                              Action Verdict for {currentSymbol}:
                            </span>
                            <span className="text-white font-semibold">
                              {pi.rightActualMovePlaybook.verdictSummary}
                            </span>
                            <div className="text-slate-400 text-[10px] mt-0.5">
                              ⏱️ {pi.rightActualMovePlaybook.timingAdvice}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Scenario Sensitivity Matrix for currentSymbol */}
                      <div className="p-2.5 rounded-lg bg-[#090e1a] border border-[#172136]">
                        <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                          <span>{currentSymbol} Scenario Sensitivity Matrix</span>
                          <span className="text-slate-500 font-normal">Calculated for {pi.symbolFullName}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                          <div className={`p-2 rounded border ${
                            pi.scenarioMatrix.hot.bias.includes('BEAR')
                              ? 'bg-rose-950/20 border-rose-900/30'
                              : 'bg-emerald-950/20 border-emerald-900/30'
                          }`}>
                            <span className="text-amber-400 font-mono font-bold block text-[10px]">
                              {pi.scenarioMatrix.hot.trigger}
                            </span>
                            <span className="text-slate-200 mt-1 block font-mono">
                              {pi.scenarioMatrix.hot.reaction}
                            </span>
                          </div>
                          <div className="p-2 rounded bg-indigo-950/20 border border-indigo-900/30">
                            <span className="text-indigo-300 font-mono font-bold block text-[10px]">
                              {pi.scenarioMatrix.inLine.trigger}
                            </span>
                            <span className="text-slate-200 mt-1 block font-mono">
                              {pi.scenarioMatrix.inLine.reaction}
                            </span>
                          </div>
                          <div className={`p-2 rounded border ${
                            pi.scenarioMatrix.cool.bias.includes('BULL')
                              ? 'bg-emerald-950/20 border-emerald-900/30'
                              : 'bg-rose-950/20 border-rose-900/30'
                          }`}>
                            <span className="text-cyan-400 font-mono font-bold block text-[10px]">
                              {pi.scenarioMatrix.cool.trigger}
                            </span>
                            <span className="text-slate-200 mt-1 block font-mono">
                              {pi.scenarioMatrix.cool.reaction}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Historical Archive & Post-Mortem Tab */
        <div className="p-4 space-y-4">
          {/* Post-Mortem & Rectifications Panel */}
          <div className="rounded-lg border border-emerald-500/30 bg-[#090e1a] p-3.5">
            <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-[#162137]">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Post-Mortem: {PPI_POST_RELEASE_RETROSPECTIVE.title} Actual Print & Rectification
              </h3>
              <span className="ml-auto text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Printed: {PPI_POST_RELEASE_RETROSPECTIVE.actualPrintedValue} (Exp: {PPI_POST_RELEASE_RETROSPECTIVE.forecastValue})
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono mb-3">
              <div className="p-2.5 rounded bg-rose-950/20 border border-rose-900/30">
                <span className="text-rose-300 font-bold block text-[11px]">
                  Phase 1 Sweep ({PPI_POST_RELEASE_RETROSPECTIVE.marketOutcome.firstImpactPhase1.duration}):
                </span>
                <span className="text-slate-300 text-[11px] font-sans block mt-0.5">
                  {PPI_POST_RELEASE_RETROSPECTIVE.marketOutcome.firstImpactPhase1.mechanism} ({PPI_POST_RELEASE_RETROSPECTIVE.marketOutcome.firstImpactPhase1.priceMove})
                </span>
              </div>
              <div className="p-2.5 rounded bg-emerald-950/20 border border-emerald-900/30">
                <span className="text-emerald-300 font-bold block text-[11px]">
                  Phase 2 Expansion ({PPI_POST_RELEASE_RETROSPECTIVE.marketOutcome.secondImpactPhase2.duration}):
                </span>
                <span className="text-slate-300 text-[11px] font-sans block mt-0.5">
                  {PPI_POST_RELEASE_RETROSPECTIVE.marketOutcome.secondImpactPhase2.mechanism} ({PPI_POST_RELEASE_RETROSPECTIVE.marketOutcome.secondImpactPhase2.priceMove})
                </span>
              </div>
            </div>
            <div className="p-2.5 rounded bg-[#0d1424] border border-[#1e2a44] text-[11px] text-slate-300 flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-300 font-mono">Engine Rectification:</strong>{' '}
                {PPI_POST_RELEASE_RETROSPECTIVE.mistakePostMortem.lessonAndRectification}
              </div>
            </div>
          </div>

          {/* Historical Table */}
          <div className="overflow-x-auto rounded-lg border border-[#1b253b]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0d1424] text-slate-400 border-b border-[#1b253b]">
                <tr>
                  <th className="p-2.5">Event</th>
                  <th className="p-2.5">Currency</th>
                  <th className="p-2.5">Release Time</th>
                  <th className="p-2.5">Actual</th>
                  <th className="p-2.5">Forecast</th>
                  <th className="p-2.5">Prior</th>
                  <th className="p-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#162137] bg-[#070b14] text-slate-300">
                {releasedEvents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-5 text-center text-slate-500">
                      No recently released events recorded in this calendar window.
                    </td>
                  </tr>
                ) : (
                  releasedEvents.map((item) => {
                    const localTime = formatToLocalTime(item.eventTime);
                    return (
                      <tr key={item.id} className="hover:bg-[#0c1220] transition-colors">
                        <td className="p-2.5">
                          <div className="font-semibold text-white">{item.title}</div>
                          {item.postReleaseAnalysis && (
                            <div className="text-[10px] text-emerald-400 font-sans mt-0.5">
                              {item.postReleaseAnalysis}
                            </div>
                          )}
                        </td>
                        <td className="p-2.5 text-indigo-400 font-bold">{item.currency}</td>
                        <td className="p-2.5 text-slate-300">
                          {localTime.timeStr} <span className="text-slate-500">({formatLiveCountdown(-item.minutesAgo)})</span>
                        </td>
                        <td className="p-2.5 font-bold text-amber-300">{item.actual}</td>
                        <td className="p-2.5 text-slate-400">{item.forecast}</td>
                        <td className="p-2.5 text-slate-500">{item.previous}</td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-[#11192a] text-slate-300 border border-[#1c2944]">
                            RELEASED
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
