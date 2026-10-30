import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Flame, 
  Target, 
  Zap, 
  TrendingUp, 
  ArrowRight, 
  Check, 
  Copy, 
  Sparkles, 
  Clock, 
  Volume2, 
  RefreshCw, 
  AlertTriangle,
  Scale,
  Activity,
  Layers,
  Search,
  CheckCircle2,
  Calendar,
  History,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Globe,
  Maximize2,
  Minimize2,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck
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
  const [activeTab, setActiveTab] = useState<'UPCOMING' | 'RECENTLY_RELEASED'>('UPCOMING');
  const [selectedCategory, setSelectedCategory] = useState<MacroReleaseType | 'ALL'>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [liveEvents, setLiveEvents] = useState<RawCalendarEvent[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');
  
  // Track expanded cards so each card expands only after clicked by user to save space
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});

  // Retrospective card state for passed PPI actual print & error analysis
  const [isPpiRetrospectiveOpen, setIsPpiRetrospectiveOpen] = useState<boolean>(true);

  // User's detected local timezone and live clock in local time
  const [userTimeZone, setUserTimeZone] = useState<string>('');
  const [userLocalClock, setUserLocalClock] = useState<string>('');

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setUserTimeZone(tz);
    } catch {
      setUserTimeZone('Local Timezone');
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

  // Fetch live calendar events from the server pipeline
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
    const interval = setInterval(fetchLiveCalendar, 30_000); // Poll every 30s
    return () => clearInterval(interval);
  }, [fetchLiveCalendar]);

  // Generate verified upcoming predictions in chronological order (next release first)
  const predictions = useMemo(() => {
    return generateCuratedPredictions(currentSymbol, modelOutput, digits, liveEvents);
  }, [currentSymbol, modelOutput, digits, liveEvents]);

  // Get recently released historical events to cleanly separate past from future
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

  // Toggle card expanded state on click
  const toggleCard = (id: string) => {
    setExpandedCardIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Toggle expand / collapse all
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

  // Copy concise prediction briefing (PREDICTIONS ONLY, no SL or TP)
  const handleCopyPrediction = (pred: EconomicNewsPrediction) => {
    const localTime = formatToLocalTime(pred.eventTime);
    const text = `=====================================================
INSTITUTIONAL PREDICTION: ${pred.title}
Asset: ${currentSymbol} | Impact: ${pred.impact}
Countdown: ${pred.countdownFormatted}
Local Release Time: ${localTime.fullLocalDisplay}
=====================================================

1. NEWS CONSENSUS:
• Expected: ${pred.newsPrediction.consensusValue} (Prior: ${pred.newsPrediction.previousValue})
• Whisper: ${pred.newsPrediction.whisperNumber}
• Bank Consensus: ${pred.newsPrediction.bankConsensusRange}
• Summary: ${pred.newsPrediction.headlineForecast}

2. WHY THAT PREDICTION (MACRO DRIVERS):
${pred.whyPrediction.primaryDrivers.map((d) => `• ${d}`).join('\n')}
• Leading Signal: ${pred.whyPrediction.leadingIndicatorSignals}

3. WHAT THE MODEL IS SEEING (${currentSymbol}):
• Order Flow: ${pred.modelMarketObservations.orderFlowState}
• Resting Liquidity: ${pred.modelMarketObservations.restingLiquidity}
• Delta / CVD: ${pred.modelMarketObservations.cvdDeltaState}
• Value Area: ${pred.modelMarketObservations.valueAreaPositioning}

4. ASSESSMENT VS NEWS:
• Pricing Status: ${pred.assessmentWithNews.pricingStatus.replace(/_/g, ' ')}
• Market Status: ${pred.assessmentWithNews.pricingExplanation}
• Trap Warning: ${pred.assessmentWithNews.trapWarning}

5. FINAL PREDICTION (PREDICTIONS ONLY):
>>> ${pred.finalPrediction.verdictCall} <<<
Conviction: ${pred.finalPrediction.confidenceScore}% (${pred.finalPrediction.directionalBias})
Expected Action: ${pred.finalPrediction.expectedPriceAction}

6. RECTIFIED 2-PHASE MOVE SEQUENCE & PLAYBOOK:
• Phase 1 (Initial Impact): ${pred.twoPhaseMovePrediction?.phase1KneeJerk.direction.replace(/_/g, ' ')} (${pred.twoPhaseMovePrediction?.phase1KneeJerk.duration}) - ${pred.twoPhaseMovePrediction?.phase1KneeJerk.expectedAction}
• Phase 2 (True Move): ${pred.twoPhaseMovePrediction?.phase2TrueMacroMove.direction.replace(/_/g, ' ')} (${pred.twoPhaseMovePrediction?.phase2TrueMacroMove.duration}) - ${pred.twoPhaseMovePrediction?.phase2TrueMacroMove.expectedAction}
• THE RIGHT ACTUAL MOVE PLAYBOOK: ${pred.twoPhaseMovePrediction?.theRightActualMovePlaybook.verdictSummary} (${pred.twoPhaseMovePrediction?.theRightActualMovePlaybook.timingAdvice})
=====================================================`;

    navigator.clipboard.writeText(text);
    setCopiedId(pred.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Concise audio briefing without SL/TP
  const handleSpeakPrediction = (pred: EconomicNewsPrediction) => {
    if (speakingId === pred.id) {
      window.speechSynthesis?.cancel();
      setSpeakingId(null);
      return;
    }

    const localTime = formatToLocalTime(pred.eventTime);
    const script = `Live economic prediction for ${pred.title}. Release is in ${pred.countdownFormatted}, at ${localTime.timeStr} local time. Consensus expectation is ${pred.newsPrediction.consensusValue}. In the live market for ${currentSymbol}, the model observes that ${pred.modelMarketObservations.orderFlowState}. Final prediction verdict: ${pred.finalPrediction.verdictCall}, with ${pred.finalPrediction.confidenceScore} percent confidence. Expected price path: ${pred.finalPrediction.expectedPriceAction}.`;

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
      title: `${pred.category} Prediction: ${pred.finalPrediction.verdictCall}`,
      type: 'NEWS_CATALYST',
      detail: `Consensus: ${pred.newsPrediction.consensusValue} (Local: ${localTime.fullLocalDisplay}). Model observes: ${pred.modelMarketObservations.orderFlowState}. Final call: ${pred.finalPrediction.verdictCall} (${pred.finalPrediction.confidenceScore}% confidence). Expected: ${pred.finalPrediction.expectedPriceAction}`,
      impact: pred.impact === 'CRITICAL' ? 'HIGH' : pred.impact,
      sentiment: pred.finalPrediction.directionalBias.includes('BULLISH') ? 'BULLISH' : 'BEARISH',
      addedAt: Date.now(),
    });
  };



  const imminentEvent = predictions[0];
  const imminentLocalTime = imminentEvent ? formatToLocalTime(imminentEvent.eventTime) : null;

  return (
    <div className="bg-slate-950/95 border border-slate-800/90 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-900/90 to-indigo-950/40 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-mono font-semibold uppercase tracking-wider">
              <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              Live Upcoming Macro News
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px] font-mono">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              Predictions Only (No SL/TP)
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[11px] font-mono">
              <Globe className="w-3 h-3 text-sky-400" />
              Local Time: {userTimeZone || 'Detected'} ({userLocalClock || 'Live'})
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white mt-1.5 flex items-center gap-2">
            Institutional News & Event Predictions
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-normal">
              {currentSymbol}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
            Real upcoming economic catalysts sequenced by release time, automatically converted to your local timezone. Compact view by default: click any news card to expand full institutional synthesis.
          </p>
        </div>

        {/* Live Controls */}
        <div className="flex items-center gap-2 self-start md:self-center">
          <div className="text-right text-[11px] font-mono text-slate-400 hidden sm:block">
            <span className="text-slate-500">Feed Sync:</span> {lastSyncTime}
          </div>
          <button
            onClick={fetchLiveCalendar}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-xs text-slate-200 transition-colors disabled:opacity-50"
            title="Refresh upcoming releases"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
            Sync Feed
          </button>
        </div>
      </div>

      {/* Main View Mode Selector & Local Time Indicator */}
      <div className="px-4 py-2.5 bg-slate-900/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('UPCOMING')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'UPCOMING'
                ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            🔥 Next Upcoming Releases ({predictions.length})
          </button>
          <button
            onClick={() => setActiveTab('RECENTLY_RELEASED')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'RECENTLY_RELEASED'
                ? 'bg-blue-500/20 text-blue-200 border border-blue-500/40 shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5 text-blue-400" />
            ✓ Recently Released Past Actuals ({releasedEvents.length})
          </button>
        </div>

        {/* Search Input & Expand/Collapse All Button */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {activeTab === 'UPCOMING' && (
            <button
              onClick={handleToggleExpandAll}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-xs font-mono text-slate-300 transition-colors whitespace-nowrap"
              title={areAllExpanded ? 'Collapse all prediction cards to save space' : 'Expand all prediction cards'}
            >
              {areAllExpanded ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
                  Collapse All
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                  Expand All
                </>
              )}
            </button>
          )}

          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search catalyst..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {activeTab === 'UPCOMING' ? (
        <>
          {/* Imminent News Banner with Local Time */}
          {imminentEvent && (
            <div className="px-4 py-3 bg-gradient-to-r from-amber-950/30 via-slate-900 to-indigo-950/20 border-b border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 flex-shrink-0">
                  <Flame className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wide">
                      Next Live Catalyst Arriving
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-mono font-bold">
                      {imminentEvent.countdownFormatted}
                    </span>
                    <span className="text-xs text-sky-300 font-mono flex items-center gap-1 bg-sky-950/60 border border-sky-800/50 px-2 py-0.5 rounded">
                      <Clock className="w-3 h-3 text-sky-400" />
                      {imminentLocalTime?.fullLocalDisplay}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-100 mt-1">
                    {imminentEvent.title} — Expected: <span className="text-amber-300 font-mono">{imminentEvent.newsPrediction.consensusValue}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-indigo-950/80 border border-indigo-700/50 text-indigo-300">
                  Call: {imminentEvent.finalPrediction.directionalBias.replace(/_/g, ' ')} ({imminentEvent.finalPrediction.confidenceScore}%)
                </span>
              </div>
            </div>
          )}

          {/* Strip with only ALL UPCOMING displayed (all other category chips removed) */}
          <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800/60 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600/25 text-indigo-200 border border-indigo-500/40 text-xs font-mono font-semibold shadow-sm">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                ALL UPCOMING
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/40 text-white text-[10px] font-bold">
                  {predictions.length}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 whitespace-nowrap pl-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
              Click any card to expand details
            </div>
          </div>

          {/* Prediction Cards Grid - Compact by default, click to expand */}
          <div className="p-4 sm:p-5 space-y-3">
            {/* Dedicated Passed PPI Print & Retrospective Error Analysis Card */}
            <div className="rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/30 via-slate-900 to-indigo-950/30 overflow-hidden shadow-lg">
              <div 
                onClick={() => setIsPpiRetrospectiveOpen(!isPpiRetrospectiveOpen)}
                className="p-3.5 sm:p-4 cursor-pointer select-none flex items-center justify-between gap-3 border-b border-emerald-500/20"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      NEWS PASSED & PRINTED (ACTUAL VALUE UPDATED)
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded bg-emerald-400/20 text-emerald-200 font-mono font-bold">
                      Actual: {PPI_POST_RELEASE_RETROSPECTIVE.actualPrintedValue}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      (Forecast: {PPI_POST_RELEASE_RETROSPECTIVE.forecastValue} · Prior: {PPI_POST_RELEASE_RETROSPECTIVE.previousValue})
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    {PPI_POST_RELEASE_RETROSPECTIVE.title} — Market Post-Mortem & Error Rectification
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Observation: Price dropped first (Phase 1 Bearish Stop-Hunt) before exploding upward (Phase 2 Bullish Macro Expansion). See model error analysis and how upcoming news is rectified below.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/50 text-emerald-300 text-xs font-mono font-semibold flex-shrink-0">
                  <span>{isPpiRetrospectiveOpen ? 'Hide Analysis' : 'Inspect Analysis'}</span>
                  {isPpiRetrospectiveOpen ? <ChevronUp className="w-3.5 h-3.5 text-emerald-400" /> : <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
              </div>

              {isPpiRetrospectiveOpen && (
                <div className="p-4 bg-slate-950/80 space-y-3.5 text-xs">
                  {/* Two-Phase Sequence of What Actually Happened */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono">
                    {/* Phase 1 What Happened */}
                    <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-800/40">
                      <div className="flex items-center justify-between text-rose-300 font-bold mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <ArrowDownRight className="w-4 h-4 text-rose-400" />
                          Phase 1: Initial Impact (0 - 90 Seconds)
                        </span>
                        <span className="px-2 py-0.5 rounded bg-rose-900/40 text-rose-200 text-[10px]">
                          {PPI_POST_RELEASE_RETROSPECTIVE.marketOutcome.firstImpactPhase1.priceMove}
                        </span>
                      </div>
                      <div className="text-slate-300 font-sans text-[11px] leading-relaxed">
                        {PPI_POST_RELEASE_RETROSPECTIVE.marketOutcome.firstImpactPhase1.mechanism}
                      </div>
                    </div>

                    {/* Phase 2 What Happened */}
                    <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40">
                      <div className="flex items-center justify-between text-emerald-300 font-bold mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                          Phase 2: True Macro Move (2 - 35+ Minutes)
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-200 text-[10px]">
                          {PPI_POST_RELEASE_RETROSPECTIVE.marketOutcome.secondImpactPhase2.priceMove}
                        </span>
                      </div>
                      <div className="text-slate-300 font-sans text-[11px] leading-relaxed">
                        {PPI_POST_RELEASE_RETROSPECTIVE.marketOutcome.secondImpactPhase2.mechanism}
                      </div>
                    </div>
                  </div>

                  {/* Honest Model Error Post-Mortem */}
                  <div className="p-3.5 rounded-lg bg-amber-950/20 border border-amber-500/30">
                    <div className="flex items-center gap-2 text-amber-300 font-mono font-bold mb-1">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Model Mistake Analysis: Why Did It First Go Down When The News Was Bullish?
                    </div>
                    <div className="text-slate-300 font-sans leading-relaxed text-[11px]">
                      {PPI_POST_RELEASE_RETROSPECTIVE.mistakePostMortem.whyPriorCallWasIncomplete}
                    </div>
                    <div className="mt-2 pt-2 border-t border-amber-500/20 flex items-start gap-2 text-[11px] text-amber-200 font-mono">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong>Rectification Implemented on Upcoming News:</strong> {PPI_POST_RELEASE_RETROSPECTIVE.mistakePostMortem.lessonAndRectification}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {filteredPredictions.length === 0 ? (
              <div className="text-center py-12 text-slate-500 font-mono text-sm bg-slate-900/40 rounded-xl border border-dashed border-slate-800">
                No upcoming catalysts matched the search criteria.
              </div>
            ) : (
              filteredPredictions.map((pred, index) => {
                const isSelectedNote = selectedAnalysisNotes.some((n) => n.id === pred.id);
                const isFirst = index === 0;
                const isExpanded = Boolean(expandedCardIds[pred.id]);
                const localTime = formatToLocalTime(pred.eventTime);

                return (
                  <div
                    key={pred.id}
                    className={`rounded-xl border transition-all duration-200 overflow-hidden shadow-md ${
                      isExpanded
                        ? 'bg-slate-900/95 border-indigo-500/50 ring-1 ring-indigo-500/20'
                        : isFirst
                        ? 'bg-slate-900/80 border-amber-500/40 hover:border-amber-400/70 hover:bg-slate-900/90'
                        : 'bg-slate-900/60 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/80'
                    }`}
                  >
                    {/* Collapsed / Header Summary View */}
                    <div 
                      onClick={() => toggleCard(pred.id)}
                      className="p-3.5 sm:p-4 cursor-pointer select-none transition-colors"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        {/* Left Info: Countdown, Local Time, Category, Impact */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold flex items-center gap-1.5 ${
                              isFirst
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}>
                              <Clock className="w-3.5 h-3.5" />
                              {pred.countdownFormatted}
                            </span>

                            {/* Local Time Badge */}
                            <span className="text-xs text-sky-300 font-mono flex items-center gap-1 bg-sky-950/60 border border-sky-800/50 px-2 py-0.5 rounded">
                              <Globe className="w-3 h-3 text-sky-400" />
                              {localTime.fullLocalDisplay}
                            </span>

                            <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono font-semibold">
                              {pred.category}
                            </span>

                            {pred.isVerifiedFromLiveFeed && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                                ✓ LIVE CALENDAR
                              </span>
                            )}

                            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 font-mono uppercase">
                              {pred.impact} IMPACT
                            </span>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-baseline gap-1.5 sm:gap-3">
                            <h3 className="text-sm sm:text-base font-bold text-white truncate">
                              {pred.title}
                            </h3>
                            <span className="text-xs text-slate-400 font-mono truncate">
                              Expected: <strong className="text-amber-300">{pred.newsPrediction.consensusValue}</strong> (Prior: {pred.newsPrediction.previousValue})
                            </span>
                          </div>

                          {/* Quick summary line when collapsed with 2-Phase Sequence */}
                          {!isExpanded && (
                            <div className="mt-2 space-y-1.5 text-xs">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
                                  {pred.finalPrediction.verdictCall}
                                </span>
                                <span className="text-slate-400 font-mono text-[11px]">
                                  Conviction: <strong className="text-white">{pred.finalPrediction.confidenceScore}%</strong>
                                </span>
                              </div>

                              {pred.twoPhaseMovePrediction && (
                                <div className="flex items-center gap-2 flex-wrap font-mono text-[11px]">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950/40 text-rose-300 border border-rose-800/40">
                                    <ArrowDownRight className="w-3 h-3 text-rose-400" />
                                    Phase 1: {pred.twoPhaseMovePrediction.phase1KneeJerk.direction.replace(/_/g, ' ')} ({pred.twoPhaseMovePrediction.phase1KneeJerk.duration})
                                  </span>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/40">
                                    <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                                    Phase 2: {pred.twoPhaseMovePrediction.phase2TrueMacroMove.direction.replace(/_/g, ' ')} ({pred.twoPhaseMovePrediction.phase2TrueMacroMove.duration})
                                  </span>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold">
                                    🎯 {pred.twoPhaseMovePrediction.theRightActualMovePlaybook.verdictSummary}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Right Actions & Expand Indicator */}
                        <div className="flex items-center gap-2 self-start md:self-center flex-shrink-0 pt-1 md:pt-0">
                          {/* Speak & Copy Buttons (stop propagation so card doesn't expand on click) */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSpeakPrediction(pred);
                            }}
                            className={`p-1.5 rounded-lg border text-xs transition-colors flex items-center gap-1 ${
                              speakingId === pred.id
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                            }`}
                            title="Listen to audio briefing"
                          >
                            <Volume2 className={`w-3.5 h-3.5 ${speakingId === pred.id ? 'animate-pulse text-amber-400' : ''}`} />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyPrediction(pred);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs transition-colors"
                            title="Copy prediction summary"
                          >
                            {copiedId === pred.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>

                          {onAddNoteToAnalysis && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddPredictionToNotes(pred);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors flex items-center gap-1 ${
                                isSelectedNote
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700'
                              }`}
                            >
                              {isSelectedNote ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Sparkles className="w-3.5 h-3.5 text-indigo-400" />}
                              <span className="hidden sm:inline">{isSelectedNote ? 'In Thesis' : '+ Note'}</span>
                            </button>
                          )}

                          {/* Expand/Collapse Toggle Button */}
                          <div 
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold transition-all ${
                              isExpanded
                                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                            }`}
                          >
                            <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 text-indigo-400" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* EXPANDED CONTENT: 5-Step Deep Institutional Breakdown */}
                    {isExpanded && (
                      <div className="border-t border-slate-800/80 bg-slate-950/50 p-4 sm:p-5 space-y-4 animate-in fade-in duration-200 text-xs">
                        <div className="text-slate-400 text-xs pb-1 border-b border-slate-800/60 flex items-center justify-between">
                          <span>
                            Affects: <strong className="text-slate-200">{pred.affectedInstruments.join(', ')}</strong>
                          </span>
                          <span className="font-mono text-[11px] text-sky-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Local Release: {localTime.fullLocalDisplay}
                          </span>
                        </div>

                        {/* Step 1: News Consensus */}
                        <div className="bg-slate-950/70 rounded-lg p-3.5 border border-slate-800/80">
                          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800/60">
                            <span className="font-mono font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wide">
                              <Target className="w-3.5 h-3.5" />
                              1. News Prediction & Consensus
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              Forecast vs Prior
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
                            <div>
                              <span className="text-slate-500">Consensus Expectation:</span>{' '}
                              <span className="font-mono font-semibold text-white">{pred.newsPrediction.consensusValue}</span>{' '}
                              <span className="text-slate-500">(Prior: {pred.newsPrediction.previousValue})</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Desk Whisper:</span>{' '}
                              <span className="font-mono text-indigo-300">{pred.newsPrediction.whisperNumber}</span>
                            </div>
                            <div className="sm:col-span-2 text-slate-400 mt-0.5">
                              <span className="text-slate-500">Bank Consensus:</span> {pred.newsPrediction.bankConsensusRange}
                            </div>
                          </div>
                        </div>

                        {/* Step 2: Why That Prediction */}
                        <div className="bg-slate-950/70 rounded-lg p-3.5 border border-slate-800/80">
                          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800/60">
                            <span className="font-mono font-bold text-blue-400 flex items-center gap-1.5 uppercase tracking-wide">
                              <Scale className="w-3.5 h-3.5" />
                              2. Why That Prediction (Macro Drivers)
                            </span>
                          </div>
                          <ul className="space-y-1.5 text-slate-300">
                            {pred.whyPrediction.primaryDrivers.map((driver, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-blue-400 mt-0.5 font-bold">•</span>
                                <span>{driver}</span>
                              </li>
                            ))}
                            <li className="flex items-start gap-2 pt-1 border-t border-slate-900 text-slate-400">
                              <span className="text-cyan-400 mt-0.5 font-bold">↳</span>
                              <span><strong className="text-slate-300">Leading Indicator:</strong> {pred.whyPrediction.leadingIndicatorSignals}</span>
                            </li>
                          </ul>
                        </div>

                        {/* Step 3: What the Model is Seeing */}
                        <div className="bg-slate-950/70 rounded-lg p-3.5 border border-slate-800/80">
                          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800/60">
                            <span className="font-mono font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide">
                              <Activity className="w-3.5 h-3.5" />
                              3. What the Model is Seeing in the Market ({currentSymbol})
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
                            <div>
                              <span className="text-slate-500">Order Flow:</span> {pred.modelMarketObservations.orderFlowState}
                            </div>
                            <div>
                              <span className="text-slate-500">Delta / CVD:</span> {pred.modelMarketObservations.cvdDeltaState}
                            </div>
                            <div className="sm:col-span-2">
                              <span className="text-slate-500">Resting Liquidity:</span> {pred.modelMarketObservations.restingLiquidity}
                            </div>
                            <div className="sm:col-span-2 text-slate-400">
                              <span className="text-slate-500">Value Profile:</span> {pred.modelMarketObservations.valueAreaPositioning}
                            </div>
                          </div>
                        </div>

                        {/* Step 4: Assessment with News Prediction */}
                        <div className="bg-slate-950/70 rounded-lg p-3.5 border border-slate-800/80">
                          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800/60">
                            <span className="font-mono font-bold text-purple-400 flex items-center gap-1.5 uppercase tracking-wide">
                              <Layers className="w-3.5 h-3.5" />
                              4. Assessment vs News Prediction
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                              {pred.assessmentWithNews.pricingStatus.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <p className="text-slate-300 mb-2">
                            {pred.assessmentWithNews.pricingExplanation}
                          </p>
                          <div className="flex items-start gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[11px] mb-3">
                            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                            <span><strong>Trap Warning:</strong> {pred.assessmentWithNews.trapWarning}</span>
                          </div>

                          {/* 3-Way Scenario Matrix */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                            <div className="p-2 rounded bg-rose-950/30 border border-rose-800/40">
                              <div className="font-mono font-bold text-rose-300 mb-0.5">Hot Scenario</div>
                              <div className="text-slate-400 text-[10px] mb-1">{pred.assessmentWithNews.scenarioMatrix.hot.trigger}</div>
                              <div className="text-slate-200">{pred.assessmentWithNews.scenarioMatrix.hot.reaction}</div>
                            </div>
                            <div className="p-2 rounded bg-blue-950/30 border border-blue-800/40">
                              <div className="font-mono font-bold text-blue-300 mb-0.5">In-Line Scenario</div>
                              <div className="text-slate-400 text-[10px] mb-1">{pred.assessmentWithNews.scenarioMatrix.inLine.trigger}</div>
                              <div className="text-slate-200">{pred.assessmentWithNews.scenarioMatrix.inLine.reaction}</div>
                            </div>
                            <div className="p-2 rounded bg-emerald-950/30 border border-emerald-800/40">
                              <div className="font-mono font-bold text-emerald-300 mb-0.5">Cool Scenario</div>
                              <div className="text-slate-400 text-[10px] mb-1">{pred.assessmentWithNews.scenarioMatrix.cool.trigger}</div>
                              <div className="text-slate-200">{pred.assessmentWithNews.scenarioMatrix.cool.reaction}</div>
                            </div>
                          </div>
                        </div>

                        {/* Step 5: Final Prediction (PREDICTIONS ONLY - NO SL, NO TP) */}
                        <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900 to-indigo-950/60 rounded-xl p-4 border border-indigo-500/40 shadow-inner">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono font-bold text-emerald-300 flex items-center gap-1.5 uppercase tracking-wide text-xs">
                              <Zap className="w-4 h-4 text-emerald-400" />
                              5. Final Prediction (Predictions Only)
                            </span>
                            <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                              Conviction: {pred.finalPrediction.confidenceScore}%
                            </span>
                          </div>

                          <div className="text-sm sm:text-base font-bold text-white font-mono bg-slate-950/80 px-3.5 py-2.5 rounded-lg border border-indigo-500/30 mb-2.5 flex items-center justify-between flex-wrap gap-2">
                            <span>{pred.finalPrediction.verdictCall}</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-normal">
                              Bias: {pred.finalPrediction.directionalBias.replace(/_/g, ' ')}
                            </span>
                          </div>

                          <div className="text-xs text-slate-300 flex items-start gap-2">
                            <ArrowRight className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-white">Expected Price Sequence:</strong>{' '}
                              {pred.finalPrediction.expectedPriceAction}
                            </div>
                          </div>
                        </div>

                        {/* Step 6: Rectified 2-Phase Impact Sequence & The Right Actual Move */}
                        {pred.twoPhaseMovePrediction && (
                          <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-emerald-950/40 rounded-xl p-4 border border-amber-500/40 shadow-md space-y-3 font-mono">
                            <div className="flex items-center justify-between pb-2 border-b border-amber-500/30">
                              <span className="font-bold text-amber-300 flex items-center gap-1.5 uppercase text-xs">
                                <Sparkles className="w-4 h-4 text-amber-400" />
                                6. Rectified 2-Phase Move Sequence & Playbook
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                                RECTIFIED POST-PPI ANALYSIS
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              {/* Phase 1 Initial Impact */}
                              <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-800/40 space-y-1">
                                <div className="flex items-center justify-between text-rose-300 font-bold text-[11px]">
                                  <span className="flex items-center gap-1">
                                    <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
                                    Phase 1: First Impact ({pred.twoPhaseMovePrediction.phase1KneeJerk.duration})
                                  </span>
                                  <span className="px-1.5 py-0.2 rounded bg-rose-900/50 text-rose-200 text-[10px]">
                                    STOP-HUNT SWEEP
                                  </span>
                                </div>
                                <div className="text-slate-200 font-sans text-[11px]">
                                  {pred.twoPhaseMovePrediction.phase1KneeJerk.expectedAction}
                                </div>
                                <div className="text-amber-300 text-[10px] font-mono pt-1">
                                  ⚠️ {pred.twoPhaseMovePrediction.phase1KneeJerk.trapWarning}
                                </div>
                              </div>

                              {/* Phase 2 True Directional Move */}
                              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 space-y-1">
                                <div className="flex items-center justify-between text-emerald-300 font-bold text-[11px]">
                                  <span className="flex items-center gap-1">
                                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                                    Phase 2: True Macro Move ({pred.twoPhaseMovePrediction.phase2TrueMacroMove.duration})
                                  </span>
                                  <span className="px-1.5 py-0.2 rounded bg-emerald-900/50 text-emerald-200 text-[10px]">
                                    REAL MOVE
                                  </span>
                                </div>
                                <div className="text-slate-200 font-sans text-[11px]">
                                  {pred.twoPhaseMovePrediction.phase2TrueMacroMove.expectedAction}
                                </div>
                                <div className="text-emerald-300 text-[10px] font-mono pt-1">
                                  ✓ Catalyst: {pred.twoPhaseMovePrediction.phase2TrueMacroMove.primaryCatalyst}
                                </div>
                              </div>
                            </div>

                            {/* The Right Actual Move Trade Verdict */}
                            <div className="p-3 rounded-lg bg-slate-950 border border-amber-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <div className="text-[10px] text-amber-400 uppercase font-bold tracking-wider">
                                  The Right Actual Move Playbook (Predictions Only):
                                </div>
                                <div className="text-xs sm:text-sm font-bold text-white mt-0.5">
                                  {pred.twoPhaseMovePrediction.theRightActualMovePlaybook.verdictSummary}
                                </div>
                                <div className="text-[11px] text-slate-300 font-sans mt-0.5">
                                  {pred.twoPhaseMovePrediction.theRightActualMovePlaybook.recommendedExecution}
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <span className="inline-block px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-mono">
                                  ⏱️ {pred.twoPhaseMovePrediction.theRightActualMovePlaybook.timingAdvice}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Collapse Details Button at bottom of expanded card */}
                        <div className="pt-2 text-center">
                          <button
                            onClick={() => toggleCard(pred.id)}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors"
                          >
                            <ChevronUp className="w-3.5 h-3.5 text-indigo-400" />
                            Collapse details to compact view
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        /* Recently Released News & Past Actuals Table with Local Time */
        <div className="p-4 sm:p-5">
          <div className="p-3 mb-4 rounded-lg bg-blue-950/20 border border-blue-500/30 text-xs text-blue-200 flex items-start gap-2">
            <History className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Verified Historical Archive:</strong> These economic releases have already passed. Release times are converted to your local timezone ({userTimeZone || 'Local'}). The live upcoming queue strictly excludes released events so you always receive genuine next catalysts.
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">Event Title</th>
                  <th className="p-3">Currency</th>
                  <th className="p-3">Local Release Time</th>
                  <th className="p-3">Actual Print</th>
                  <th className="p-3">Forecast</th>
                  <th className="p-3">Previous</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/60 text-slate-300">
                {releasedEvents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500">
                      No recently released events recorded in this calendar cycle.
                    </td>
                  </tr>
                ) : (
                  releasedEvents.map((item) => {
                    const localTime = formatToLocalTime(item.eventTime);
                    return (
                      <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-3">
                          <div className="font-semibold text-white">{item.title}</div>
                          {item.postReleaseAnalysis && (
                            <div className="text-[10px] text-emerald-400 font-sans mt-0.5 leading-tight">
                              {item.postReleaseAnalysis}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-indigo-400 font-bold">{item.currency}</td>
                        <td className="p-3 text-slate-300">
                          {localTime.fullLocalDisplay} <span className="text-slate-500">({formatLiveCountdown(-item.minutesAgo)})</span>
                        </td>
                        <td className="p-3 font-bold text-amber-300">{item.actual}</td>
                        <td className="p-3 text-slate-400">{item.forecast}</td>
                        <td className="p-3 text-slate-500">{item.previous}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                            ✓ RELEASED
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
