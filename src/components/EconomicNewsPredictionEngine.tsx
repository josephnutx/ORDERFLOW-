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
  History,
  ChevronDown,
  ChevronUp,
  Globe,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  Radio,
  FileText
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

  // Generate upcoming predictions
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
        p.category.toLowerCase().includes(searchQuery.toLowerCase());
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
    const text = `=====================================================
MACRO INTELLIGENCE REPORT: ${pred.title}
Asset: ${currentSymbol} | Impact: ${pred.impact}
Countdown: ${pred.countdownFormatted} (${localTime.fullLocalDisplay})
=====================================================

1. CONSENSUS & BENCHMARKS:
• Expected: ${pred.newsPrediction.consensusValue} (Prior: ${pred.newsPrediction.previousValue})
• Desk Whisper: ${pred.newsPrediction.whisperNumber}
• Bank Range: ${pred.newsPrediction.bankConsensusRange}

2. ORDER FLOW & POSITIONING:
• Order Flow: ${pred.modelMarketObservations.orderFlowState}
• Resting Liquidity: ${pred.modelMarketObservations.restingLiquidity}
• CVD/Delta: ${pred.modelMarketObservations.cvdDeltaState}
• Pricing Status: ${pred.assessmentWithNews.pricingStatus.replace(/_/g, ' ')}
• Trap Warning: ${pred.assessmentWithNews.trapWarning}

3. MODEL VERDICT & EXPECTED ACTION:
• Call: ${pred.finalPrediction.verdictCall} (${pred.finalPrediction.confidenceScore}% confidence)
• Expected Path: ${pred.finalPrediction.expectedPriceAction}

4. 2-PHASE EXECUTION PLAYBOOK:
• Phase 1 (0-90s): ${pred.twoPhaseMovePrediction?.phase1KneeJerk.direction.replace(/_/g, ' ')} (${pred.twoPhaseMovePrediction?.phase1KneeJerk.duration}) - ${pred.twoPhaseMovePrediction?.phase1KneeJerk.expectedAction}
• Phase 2 (2-35m): ${pred.twoPhaseMovePrediction?.phase2TrueMacroMove.direction.replace(/_/g, ' ')} (${pred.twoPhaseMovePrediction?.phase2TrueMacroMove.duration}) - ${pred.twoPhaseMovePrediction?.phase2TrueMacroMove.expectedAction}
• Action Playbook: ${pred.twoPhaseMovePrediction?.theRightActualMovePlaybook.verdictSummary} (${pred.twoPhaseMovePrediction?.theRightActualMovePlaybook.timingAdvice})
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
    const script = `Macro intelligence for ${pred.title}. Scheduled in ${pred.countdownFormatted}, at ${localTime.timeStr} local time. Consensus is ${pred.newsPrediction.consensusValue}. Order flow indicates ${pred.modelMarketObservations.orderFlowState}. Model forecast: ${pred.finalPrediction.verdictCall}, with ${pred.finalPrediction.confidenceScore} percent confidence. Expecting ${pred.finalPrediction.expectedPriceAction}.`;

    setSpeakingId(pred.id);
    tradingVoice.speak(script, { force: true, priority: true });
    setTimeout(() => {
      setSpeakingId(null);
    }, 9000);
  };

  const handleAddPredictionToNotes = (pred: EconomicNewsPrediction) => {
    if (!onAddNoteToAnalysis) return;
    const localTime = formatToLocalTime(pred.eventTime);
    onAddNoteToAnalysis({
      id: pred.id,
      symbol: currentSymbol,
      title: `${pred.category}: ${pred.finalPrediction.verdictCall}`,
      type: 'NEWS_CATALYST',
      detail: `Consensus: ${pred.newsPrediction.consensusValue} (${localTime.timeStr}). Bias: ${pred.finalPrediction.directionalBias} (${pred.finalPrediction.confidenceScore}%). ${pred.finalPrediction.expectedPriceAction}`,
      impact: pred.impact === 'CRITICAL' ? 'HIGH' : pred.impact,
      sentiment: pred.finalPrediction.directionalBias.includes('BULLISH') ? 'BULLISH' : 'BEARISH',
      addedAt: Date.now(),
    });
  };

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
              const isBullish = pred.finalPrediction.directionalBias.includes('BULL');
              const isBearish = pred.finalPrediction.directionalBias.includes('BEAR');

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

                    {/* Right: Model Bias & Quick Actions */}
                    <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
                      {/* Directional Bias Pill */}
                      <div
                        className={`px-2.5 py-1 rounded text-xs font-mono font-bold flex items-center gap-1.5 border ${
                          isBullish
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50'
                            : isBearish
                            ? 'bg-rose-950/60 text-rose-300 border-rose-700/50'
                            : 'bg-indigo-950/60 text-indigo-300 border-indigo-700/50'
                        }`}
                      >
                        {isBullish ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> : <TrendingDown className="w-3.5 h-3.5 text-rose-400" />}
                        <span>{pred.finalPrediction.verdictCall}</span>
                        <span className="text-[10px] text-slate-400">({pred.finalPrediction.confidenceScore}%)</span>
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
                        title="Listen to briefing"
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
                        title="Copy report"
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

                  {/* Summary Bar when Collapsed (Institutional Execution Path) */}
                  {!isExpanded && pred.twoPhaseMovePrediction && (
                    <div className="px-3 pb-2.5 pt-0 flex flex-wrap items-center gap-2 text-[11px] font-mono border-t border-[#141d30]/60 mt-1 pt-2">
                      <span className="text-slate-400 flex items-center gap-1 font-semibold">
                        2-Phase Path:
                      </span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-950/40 text-rose-300 border border-rose-900/40">
                        <ArrowDownRight className="w-3 h-3 text-rose-400" />
                        Ph.1 Sweep: {pred.twoPhaseMovePrediction.phase1KneeJerk.direction.replace(/_/g, ' ')} ({pred.twoPhaseMovePrediction.phase1KneeJerk.duration})
                      </span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-900/40">
                        <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                        Ph.2 Trend: {pred.twoPhaseMovePrediction.phase2TrueMacroMove.direction.replace(/_/g, ' ')} ({pred.twoPhaseMovePrediction.phase2TrueMacroMove.duration})
                      </span>
                      <span className="text-amber-300/90 font-medium ml-auto hidden md:inline">
                        Playbook: {pred.twoPhaseMovePrediction.theRightActualMovePlaybook.verdictSummary}
                      </span>
                    </div>
                  )}

                  {/* EXPANDED VIEW: Clean 3-Column Institutional Synthesis Matrix */}
                  {isExpanded && (
                    <div className="p-4 border-t border-[#1e2a44] bg-[#070b14] space-y-3.5 text-xs">
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

                        {/* Pillar 2: Order Flow & Liquidity Positioning */}
                        <div className="p-3 rounded-lg bg-[#0c1220] border border-[#1b253b] flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between text-cyan-400 font-mono font-bold text-[11px] uppercase tracking-wider pb-1.5 border-b border-[#182339] mb-2">
                              <span className="flex items-center gap-1.5">
                                <Activity className="w-3.5 h-3.5" />
                                Market Positioning ({currentSymbol})
                              </span>
                            </div>
                            <div className="space-y-1.5 font-mono text-[11px]">
                              <div>
                                <span className="text-slate-400 block text-[10px]">Order Flow:</span>
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

                        {/* Pillar 3: 2-Phase Tactical Sequence & Playbook */}
                        {pred.twoPhaseMovePrediction && (
                          <div className="p-3 rounded-lg bg-[#0c1220] border border-[#1b253b] flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between text-emerald-400 font-mono font-bold text-[11px] uppercase tracking-wider pb-1.5 border-b border-[#182339] mb-2">
                                <span className="flex items-center gap-1.5">
                                  <Layers className="w-3.5 h-3.5" />
                                  2-Phase Tactical Playbook
                                </span>
                              </div>

                              <div className="space-y-2">
                                <div className="p-2 rounded bg-rose-950/30 border border-rose-900/40">
                                  <div className="text-[10px] font-mono font-bold text-rose-300 uppercase flex items-center justify-between">
                                    <span>Phase 1 (Sweep)</span>
                                    <span>{pred.twoPhaseMovePrediction.phase1KneeJerk.duration}</span>
                                  </div>
                                  <div className="text-slate-300 text-[11px] mt-0.5">
                                    {pred.twoPhaseMovePrediction.phase1KneeJerk.expectedAction}
                                  </div>
                                </div>

                                <div className="p-2 rounded bg-emerald-950/30 border border-emerald-900/40">
                                  <div className="text-[10px] font-mono font-bold text-emerald-300 uppercase flex items-center justify-between">
                                    <span>Phase 2 (True Move)</span>
                                    <span>{pred.twoPhaseMovePrediction.phase2TrueMacroMove.duration}</span>
                                  </div>
                                  <div className="text-slate-300 text-[11px] mt-0.5">
                                    {pred.twoPhaseMovePrediction.phase2TrueMacroMove.expectedAction}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="mt-2.5 pt-2 border-t border-[#182339] font-mono text-[11px]">
                              <span className="text-amber-400 font-bold block text-[10px] uppercase">
                                Action Verdict:
                              </span>
                              <span className="text-white font-semibold">
                                {pred.twoPhaseMovePrediction.theRightActualMovePlaybook.verdictSummary}
                              </span>
                              <div className="text-slate-400 text-[10px] mt-0.5">
                                ⏱️ {pred.twoPhaseMovePrediction.theRightActualMovePlaybook.timingAdvice}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Scenario Sensitivity Matrix (Hot vs In-Line vs Cool) */}
                      {pred.assessmentWithNews.scenarioMatrix && (
                        <div className="p-2.5 rounded-lg bg-[#090e1a] border border-[#172136]">
                          <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Scenario Sensitivity Matrix
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                            <div className="p-2 rounded bg-rose-950/20 border border-rose-900/30">
                              <span className="text-rose-400 font-mono font-bold block text-[10px]">HOT PRINT</span>
                              <span className="text-slate-400 text-[10px] block">{pred.assessmentWithNews.scenarioMatrix.hot.trigger}</span>
                              <span className="text-slate-200 mt-0.5 block">{pred.assessmentWithNews.scenarioMatrix.hot.reaction}</span>
                            </div>
                            <div className="p-2 rounded bg-indigo-950/20 border border-indigo-900/30">
                              <span className="text-indigo-300 font-mono font-bold block text-[10px]">IN-LINE PRINT</span>
                              <span className="text-slate-400 text-[10px] block">{pred.assessmentWithNews.scenarioMatrix.inLine.trigger}</span>
                              <span className="text-slate-200 mt-0.5 block">{pred.assessmentWithNews.scenarioMatrix.inLine.reaction}</span>
                            </div>
                            <div className="p-2 rounded bg-emerald-950/20 border border-emerald-900/30">
                              <span className="text-emerald-400 font-mono font-bold block text-[10px]">COOL PRINT</span>
                              <span className="text-slate-400 text-[10px] block">{pred.assessmentWithNews.scenarioMatrix.cool.trigger}</span>
                              <span className="text-slate-200 mt-0.5 block">{pred.assessmentWithNews.scenarioMatrix.cool.reaction}</span>
                            </div>
                          </div>
                        </div>
                      )}
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
