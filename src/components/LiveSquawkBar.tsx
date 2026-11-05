import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  tradingVoice,
  TradingVoiceSettings,
  SquawkTranscriptItem,
} from '../services/tradingVoiceService';
import {
  StructuredLiveAlert,
  AlertType,
} from '../services/structuredAlertService';
import {
  FullModelAnalysisReport,
  ModelSectionReport,
  generateFullModelSectionAnalysis,
  fetchAIModelSectionAnalysis,
} from '../services/fullModelAnalysisService';
import {
  getInstrumentPrecision,
  formatPriceExact,
  formatPriceForAudio,
  reconcileScriptPrices,
} from '../services/precisionUtils';
import { SniperModelOutput } from '../types/sniperModel';
import { Candle, OrderBookSnapshot } from '../types/orderbook';
import {
  Mic,
  Volume2,
  VolumeX,
  Sliders,
  Play,
  Square,
  Radio,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Target,
  Flame,
  Activity,
  AlertTriangle,
  ShieldAlert,
  Zap,
  FileText,
  Layers,
  BarChart3,
  Globe,
  Compass,
  RotateCcw,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Crosshair,
  HelpCircle,
  Info,
} from 'lucide-react';

interface LiveSquawkBarProps {
  currentSymbol: string;
  currentPrice?: number;
  candles?: Candle[];
  snapshot?: OrderBookSnapshot;
  modelOutput?: SniperModelOutput;
  onOpenVoiceModal: () => void;
  onInstantBriefing: () => void;
  onOpenModelAnalysis?: () => void;
  liveAlerts?: StructuredLiveAlert[];
  onGenerateAlertNow?: (type: AlertType) => void;
}

export const LiveSquawkBar: React.FC<LiveSquawkBarProps> = ({
  currentSymbol,
  currentPrice = 0,
  candles = [],
  snapshot,
  modelOutput,
  onOpenVoiceModal,
  onInstantBriefing,
  liveAlerts = [],
  onGenerateAlertNow,
}) => {
  const [settings, setSettings] = useState<TradingVoiceSettings>(tradingVoice.getSettings());
  const [isSpeaking, setIsSpeaking] = useState<boolean>(tradingVoice.isSpeaking());
  const [lastItem, setLastItem] = useState<SquawkTranscriptItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Unified AI + Live Model Report State
  const [aiReport, setAiReport] = useState<FullModelAnalysisReport | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);
  const [analysisSource, setAnalysisSource] = useState<string>('Unified Institutional Engine');
  const [speakingSectionId, setSpeakingSectionId] = useState<string | null>(null);

  const latestInputsRef = useRef({ currentPrice, candles, snapshot, modelOutput });
  useEffect(() => {
    latestInputsRef.current = { currentPrice, candles, snapshot, modelOutput };
  }, [currentPrice, candles, snapshot, modelOutput]);

  // Continuously compute unified 6-section synthesis from live chart, order book, and model state without setState inside useEffect
  const baselineReport = useMemo(() => {
    if (!snapshot || !modelOutput || currentPrice <= 0) return null;
    return generateFullModelSectionAnalysis(
      currentSymbol,
      currentPrice,
      candles,
      snapshot,
      modelOutput,
      modelOutput.marketIntelligence
    );
  }, [currentSymbol, currentPrice, candles, snapshot, modelOutput]);

  const report = useMemo(() => {
    if (aiReport && aiReport.symbol === currentSymbol) {
      const formatted = formatPriceExact(currentPrice, currentSymbol);
      return {
        ...aiReport,
        currentPrice,
        priceFormatted: formatted,
      };
    }
    return baselineReport;
  }, [aiReport, currentSymbol, currentPrice, baselineReport]);

  // Fetch deep AI synthesis when drawer opens or symbol changes while open
  useEffect(() => {
    if (!isDrawerOpen) return;
    const {
      currentPrice: lp,
      candles: lc,
      snapshot: ls,
      modelOutput: lm,
    } = latestInputsRef.current;
    if (!ls || !lm || lp <= 0) return;

    setIsLoadingAI(true);
    fetchAIModelSectionAnalysis(
      currentSymbol,
      lp,
      lc,
      ls,
      lm,
      lm.marketIntelligence
    )
      .then((res) => {
        if (res && res.report) {
          setAiReport(res.report);
          setAnalysisSource(res.source);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingAI(false));
  }, [isDrawerOpen, currentSymbol]);

  useEffect(() => {
    const unsub = tradingVoice.subscribe((speaking, item) => {
      setIsSpeaking(speaking);
      if (!speaking) {
        setSpeakingSectionId(null);
      }
      if (item) {
        setLastItem(item);
      }
    });

    const unsubTranscript = tradingVoice.subscribeTranscript((history) => {
      if (history.length > 0) {
        setLastItem((prev) => prev || history[0]);
      }
    });

    return () => {
      unsub();
      unsubTranscript();
    };
  }, []);

  const handleToggleMute = () => {
    const newCadence = settings.cadence === 'muted' ? 'continuous' : 'muted';
    const newEnabled = newCadence !== 'muted';
    tradingVoice.unlockAudio();
    tradingVoice.updateSettings({ cadence: newCadence, enabled: newEnabled });
    setSettings(tradingVoice.getSettings());
    if (!newEnabled) {
      tradingVoice.cancelSpeech();
    } else {
      tradingVoice.speak(`Voice squawk active. Continuous market surveillance armed.`, {
        priority: true,
        category: 'BRIEFING',
        symbol: currentSymbol,
      });
    }
  };

  // Single Unified Action: Opens/Focuses the Unified Intelligence Hub AND speaks the genuine combined briefing
  const handleTriggerUnifiedIntelligence = () => {
    tradingVoice.unlockAudio();
    const nextOpen = !isDrawerOpen;
    setIsDrawerOpen(nextOpen);

    if (nextOpen) {
      if (report?.fullSpokenScript) {
        setSpeakingSectionId('full');
        tradingVoice.speak(report.fullSpokenScript, {
          priority: true,
          force: true,
          category: 'BRIEFING',
          symbol: currentSymbol,
        });
      } else {
        onInstantBriefing();
      }
    }
  };


  // Speak unified live intelligence now with 100% verified real-time price
  const handleSpeakUnifiedNow = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    tradingVoice.unlockAudio();
    if (!isDrawerOpen) setIsDrawerOpen(true);

    if (snapshot && modelOutput && currentPrice > 0) {
      const liveReport = generateFullModelSectionAnalysis(
        currentSymbol,
        currentPrice,
        candles,
        snapshot,
        modelOutput,
        modelOutput.marketIntelligence
      );
      setAiReport(liveReport);
      setSpeakingSectionId('full');
      tradingVoice.speak(liveReport.fullSpokenScript, {
        priority: true,
        force: true,
        category: 'BRIEFING',
        symbol: currentSymbol,
      });
    } else if (report?.fullSpokenScript) {
      setSpeakingSectionId('full');
      tradingVoice.speak(report.fullSpokenScript, {
        priority: true,
        force: true,
        category: 'BRIEFING',
        symbol: currentSymbol,
      });
    } else {
      onInstantBriefing();
    }
  };

  // Master Action: Scans order book, value structure, squeeze, and delta all at once,
  // updates the synthesis report, generates tape alert, and broadcasts the final signal & briefing aloud.
  const handleScanAtOnce = () => {
    tradingVoice.unlockAudio();
    if (!isDrawerOpen) setIsDrawerOpen(true);
    if (onGenerateAlertNow) {
      onGenerateAlertNow('UNIFIED_CONFLUENCE_SIGNAL');
    }

    // Instantly generate and display deterministic report with 100% verified live price
    if (snapshot && modelOutput && currentPrice > 0) {
      const instantReport = generateFullModelSectionAnalysis(
        currentSymbol,
        currentPrice,
        candles,
        snapshot,
        modelOutput,
        modelOutput.marketIntelligence
      );
      setAiReport(instantReport);
      setSpeakingSectionId('full');
      tradingVoice.speak(instantReport.fullSpokenScript, {
        priority: true,
        force: true,
        category: 'BRIEFING',
        symbol: currentSymbol,
      });
    }

    // Refresh deep AI in background
    handleRefreshUnifiedAI();
  };

  const handleRefreshUnifiedAI = () => {
    if (!snapshot || !modelOutput || currentPrice <= 0) return;
    setIsLoadingAI(true);
    fetchAIModelSectionAnalysis(
      currentSymbol,
      currentPrice,
      candles,
      snapshot,
      modelOutput,
      modelOutput.marketIntelligence
    )
      .then((res) => {
        if (res && res.report) {
          setAiReport(res.report);
          setAnalysisSource(res.source);
          // If not currently speaking, broadcast the refined synthesis aloud
          if (!tradingVoice.isSpeaking()) {
            tradingVoice.unlockAudio();
            setSpeakingSectionId('full');
            tradingVoice.speak(res.report.fullSpokenScript, {
              priority: true,
              force: true,
              category: 'BRIEFING',
              symbol: currentSymbol,
            });
          }
        }
      })
      .finally(() => setIsLoadingAI(false));
  };

  const handleSpeakSection = (section: ModelSectionReport) => {
    tradingVoice.unlockAudio();
    setSpeakingSectionId(section.id);
    tradingVoice.speak(section.spokenScript, {
      priority: true,
      force: true,
      category: 'BRIEFING',
      symbol: currentSymbol,
    });
  };

  const latestAlert = liveAlerts.length > 0 ? liveAlerts[0] : null;

  // Unified status line combining Live Voice + AI Synthesis + Latest Tape Alert
  const displayText = isSpeaking
    ? lastItem?.text || `🎙️ Speaking Unified Live Market Intelligence (${currentSymbol === 'XAUUSD' ? 'Gold' : currentSymbol})`
    : latestAlert
    ? `${latestAlert.headline} — ${latestAlert.summary}`
    : report?.headlineSummary
    ? `${report.headlineSummary}`
    : settings.cadence !== 'muted'
    ? `Unified AI & Order-Flow Squawk Active · Scanning liquidity & institutional contracts`
    : `Trading voice muted · Click to expand Unified Market Intelligence`;

  const handleCopyText = (text: string, id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    }
  };

  const getAlertIcon = (type?: AlertType) => {
    switch (type) {
      case 'BUY_SETUP':
        return <span className="text-emerald-400 font-bold">🟢</span>;
      case 'SELL_SETUP':
        return <span className="text-red-400 font-bold">🔴</span>;
      case 'ORDER_STACKING_BUILDUP':
        return <Flame className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />;
      case 'LIQUIDATION_SQUEEZE':
        return <Zap className="w-3.5 h-3.5 text-amber-400 animate-bounce" />;
      case 'IMPULSE_IGNITION':
        return <Zap className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />;
      case 'CLIMACTIC_EXHAUSTION':
        return <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse" />;
      case 'COMPRESSION_COIL':
        return <Layers className="w-3.5 h-3.5 text-purple-400 animate-pulse" />;
      case 'KEY_LEVEL_TAP':
        return <Target className="w-3.5 h-3.5 text-amber-400" />;
      case 'LARGE_TRADE':
        return <Flame className="w-3.5 h-3.5 text-orange-400" />;
      case 'ORDER_FLOW':
        return <Activity className="w-3.5 h-3.5 text-cyan-400" />;
      case 'NEWS':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />;
      case 'TRADE_UNDER_PRESSURE':
        return <ShieldAlert className="w-3.5 h-3.5 text-red-400 animate-pulse" />;
      case 'TAKE_PROFIT_CONTINUATION':
        return <Zap className="w-3.5 h-3.5 text-purple-400" />;
      case 'INVALIDATION':
        return <ShieldAlert className="w-3.5 h-3.5 text-red-500" />;
      case 'CAUTION':
      default:
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  const getSectionIcon = (id: string) => {
    switch (id) {
      case 'regime':
      case 'auction_dynamics':
        return <Layers className="w-3.5 h-3.5 text-cyan-400" />;
      case 'orderflow':
      case 'order_flow':
        return <Activity className="w-3.5 h-3.5 text-blue-400" />;
      case 'crowd':
      case 'trapped_liquidity':
        return <BarChart3 className="w-3.5 h-3.5 text-amber-400" />;
      case 'exhaustion':
      case 'exhaustion_physics':
        return <Flame className="w-3.5 h-3.5 text-rose-400" />;
      case 'tactical':
      case 'tactical_edge':
        return <Target className="w-3.5 h-3.5 text-emerald-400" />;
      case 'macro':
      case 'macro_catalyst':
        return <Globe className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Compass className="w-3.5 h-3.5 text-cyan-400" />;
    }
  };

  return (
    <div className="w-full bg-[#080d17]/95 backdrop-blur-md border-y border-[#18243c] flex flex-col transition-all z-20 shadow-md">
      {/* Top Unified Live Intelligence, Voice Squawk & Alert Bar */}
      <div className="px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2 text-xs">
        {/* Left: Unified Status Badge + Live Synthesized Narrative Stream */}
        <div
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          className="flex items-center gap-2 overflow-hidden flex-1 min-w-0 cursor-pointer group"
          title="Click to expand Unified Live AI Analysis, Spoken Briefing & Tape Alerts"
        >
          <div
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold tracking-wider transition-all shrink-0 ${
              isSpeaking
                ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/60 shadow-xs shadow-emerald-500/20'
                : latestAlert?.priority === 'CRITICAL'
                ? 'bg-red-950/90 text-red-300 border border-red-500/60'
                : 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 group-hover:border-cyan-400'
            }`}
          >
            {isSpeaking ? (
              <div className="flex items-center gap-0.5 text-emerald-400">
                <span className="inline-block w-0.5 h-2.5 bg-emerald-400 animate-pulse" />
                <span className="inline-block w-0.5 h-3.5 bg-emerald-400 animate-pulse delay-75" />
                <span className="inline-block w-0.5 h-1.5 bg-emerald-400 animate-pulse delay-150" />
              </div>
            ) : (
              <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
            )}
            <span>LIVE INTELLIGENCE</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-black/50 text-cyan-300 border border-cyan-500/30">
              {liveAlerts.length}
            </span>
            {isDrawerOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </div>

          {/* Unified Headline Stream */}
          <div className="flex items-center gap-1.5 overflow-hidden min-w-0 flex-1">
            <span className="font-mono text-[10px] font-bold text-amber-300 bg-amber-950/40 border border-amber-500/30 px-1.5 py-0.2 rounded shrink-0 hidden sm:inline">
              {currentSymbol}
            </span>
            {report && (
              <span
                className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0 hidden md:inline ${
                  report.overallBias.includes('BULLISH')
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                    : report.overallBias.includes('BEARISH')
                    ? 'bg-red-950/60 text-red-300 border border-red-500/30'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}
              >
                {report.overallBias.replace(/_/g, ' ')} ({report.biasScore}/100)
              </span>
            )}
            <p className="text-[11px] text-slate-200 truncate group-hover:text-cyan-300 transition-colors">
              {isSpeaking && <span className="text-emerald-400 font-bold mr-1">🎙️</span>}
              {displayText}
            </p>
          </div>
        </div>

        {/* Right: Single Cohesive Intelligence & Voice Control Cluster */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Master Instant Scan + Spoken Briefing Button */}
          <button
            onClick={handleScanAtOnce}
            className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold text-black bg-linear-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:brightness-110 rounded shadow-xs cursor-pointer transition-all"
            title="Scan entire market model across order flow, liquidity stack & squeeze at once, and hear final verdict & debrief"
          >
            <Sparkles className="w-3.5 h-3.5 fill-black/20" />
            <Zap className="w-3 h-3 text-black" />
            <span className="hidden sm:inline">⚡ Scan At Once & Final Brief</span>
            <span className="sm:hidden">⚡ Scan & Brief</span>
          </button>

          {/* Toggle Hub Drawer button */}
          <button
            onClick={handleTriggerUnifiedIntelligence}
            className={`px-2 py-1 text-[11px] font-mono font-bold rounded border transition-colors cursor-pointer hidden md:flex items-center gap-1 ${
              isDrawerOpen
                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/60'
                : 'bg-[#101726] text-slate-300 border-[#1d2942] hover:border-cyan-500/40'
            }`}
            title="Expand or collapse the Unified Market Intelligence & Alerts Hub"
          >
            <span>{isDrawerOpen ? 'Hide Hub' : 'Open Hub'}</span>
            {isDrawerOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {isSpeaking ? (
            <button
              onClick={() => tradingVoice.cancelSpeech()}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-rose-300 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-600/40 rounded transition-colors cursor-pointer"
              title="Silence current speech"
            >
              <Square className="w-2.5 h-2.5 fill-current" />
              <span className="hidden md:inline">Silence</span>
            </button>
          ) : (
            <button
              onClick={handleToggleMute}
              className={`p-1 rounded border transition-colors cursor-pointer ${
                settings.cadence !== 'muted'
                  ? 'text-cyan-400 hover:text-white border-cyan-800/40 bg-cyan-950/30'
                  : 'text-slate-500 hover:text-slate-300 border-slate-700 bg-neutral-900'
              }`}
              title={settings.cadence !== 'muted' ? 'Mute Continuous Voice Squawk' : 'Unmute Continuous Voice Squawk'}
            >
              {settings.cadence !== 'muted' ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            onClick={onOpenVoiceModal}
            className="p-1 rounded text-slate-400 hover:text-slate-200 border border-[#1b253b] hover:bg-slate-800/50 transition-colors cursor-pointer"
            title="Voice Settings & English Accent Selection"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Unified Market Intelligence, 6-Section Synthesis & Live Alerts Hub Drawer */}
      {isDrawerOpen && (
        <div className="border-t border-[#182338] bg-[#060a12] p-3 sm:p-4 animate-in fade-in slide-in-from-top-2 duration-150 space-y-4">
          {/* Top Unified Executive Synthesis Banner (Combines AI Analysis + Spoken Script + Live Model State) */}
          {report && (
            <div className="rounded-xl border border-cyan-500/30 bg-[#09101d] p-3.5 shadow-lg space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#152238] pb-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    Unified Market Intelligence Synthesis ({report.symbol})
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      report.overallBias.includes('BULLISH')
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : report.overallBias.includes('BEARISH')
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {report.overallBias.replace(/_/g, ' ')} · Score {report.biasScore}/100
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 bg-[#0d1627] px-2 py-0.5 rounded border border-[#1c2b46]">
                    Source: {isLoadingAI ? 'Synthesizing Live Tape...' : analysisSource}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={(e) => handleSpeakUnifiedNow(e)}
                    className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded cursor-pointer transition-all ${
                      isSpeaking && speakingSectionId === 'full'
                        ? 'bg-emerald-500 text-black animate-pulse'
                        : 'bg-cyan-400 hover:bg-cyan-300 text-black'
                    }`}
                    title="Speak the complete unified market intelligence debrief aloud"
                  >
                    <Volume2 className="w-3.5 h-3.5 fill-black" />
                    <span>{isSpeaking && speakingSectionId === 'full' ? 'Speaking Live Debrief...' : 'Speak Full Synthesis'}</span>
                  </button>

                  <button
                    onClick={handleRefreshUnifiedAI}
                    disabled={isLoadingAI}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono font-bold rounded bg-[#111c30] hover:bg-[#192844] text-cyan-300 border border-cyan-500/30 cursor-pointer disabled:opacity-50"
                    title="Re-scan live candles, institutional bubbles, and order book depth"
                  >
                    <RotateCcw className={`w-3 h-3 ${isLoadingAI ? 'animate-spin' : ''}`} />
                    <span>Re-Scan Now</span>
                  </button>

                  <button
                    onClick={(e) =>
                      handleCopyText(
                        `${report.headlineSummary}\n\n${report.professionalDebrief || report.executiveSummary}\n\nSpoken Brief:\n${report.fullSpokenScript}`,
                        'unified-report',
                        e
                      )
                    }
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono rounded bg-[#111c30] hover:bg-[#192844] text-slate-300 border border-[#1f3050] cursor-pointer"
                  >
                    {copiedId === 'unified-report' ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copiedId === 'unified-report' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Authoritative Final Signal Verdict, Pre-Move Opportunity & Action Plan */}
              {report.finalSignalVerdict && (
                <div className="rounded-xl border border-cyan-500/40 bg-[#050a16] p-3.5 sm:p-4 shadow-xl space-y-3.5">
                  {/* 1. Final Verdict Status Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-[#14233c]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-cyan-400" />
                        INSTITUTIONAL FINAL VERDICT:
                      </span>
                      <span
                        className={`px-3 py-1 rounded text-xs font-mono font-black tracking-wide border shadow-sm ${
                          report.finalSignalVerdict.action === 'SNIPER_BUY'
                            ? 'bg-emerald-500 text-black border-emerald-400'
                            : report.finalSignalVerdict.action === 'SNIPER_SELL'
                            ? 'bg-red-500 text-white border-red-400'
                            : report.finalSignalVerdict.action === 'PRE_MOVE_BUY'
                            ? 'bg-teal-500 text-black border-teal-400'
                            : report.finalSignalVerdict.action === 'PRE_MOVE_SELL'
                            ? 'bg-amber-500 text-black border-amber-400'
                            : 'bg-slate-800 text-slate-200 border-slate-600'
                        }`}
                      >
                        {report.finalSignalVerdict.actionBadge}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#0d1629] text-cyan-300 border border-cyan-600/40">
                        Confidence: {report.finalSignalVerdict.convictionScore}% · Grade {report.finalSignalVerdict.convictionGrade}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleScanAtOnce}
                        disabled={isLoadingAI}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-bold rounded bg-gradient-to-r from-cyan-400 to-emerald-400 hover:brightness-110 text-black shadow-sm cursor-pointer disabled:opacity-50"
                        title="Re-scan all order book levels and engines at once"
                      >
                        <RotateCcw className={`w-3 h-3 ${isLoadingAI ? 'animate-spin' : ''}`} />
                        <span>⚡ Re-Scan At Once</span>
                      </button>
                    </div>
                  </div>

                  {/* 2. Pre-Move Opportunity Radar: "Can You Take Advantage Before Any Move?" */}
                  <div
                    className={`rounded-lg border p-3 ${
                      report.finalSignalVerdict.preMoveOpportunity.isAvailable
                        ? 'border-emerald-500/40 bg-emerald-950/25'
                        : 'border-slate-800 bg-[#070d18]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <Crosshair
                          className={`w-4 h-4 ${
                            report.finalSignalVerdict.preMoveOpportunity.isAvailable
                              ? 'text-emerald-400 animate-pulse'
                              : 'text-slate-400'
                          }`}
                        />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Pre-Move Opportunity Radar: Can You Take Advantage Before Any Move?
                        </span>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                          report.finalSignalVerdict.preMoveOpportunity.isAvailable
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {report.finalSignalVerdict.preMoveOpportunity.statusTitle}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 leading-snug">
                      {report.finalSignalVerdict.preMoveOpportunity.explanation}
                    </p>
                    <div className="mt-2.5 pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5 text-cyan-300 font-medium">
                        <span className="text-white font-bold">🎯 How to Capitalize Early:</span>
                        <span>{report.finalSignalVerdict.preMoveOpportunity.actionableAdvantage}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-300 bg-black/50 px-2 py-0.5 rounded border border-white/10 shrink-0">
                        ⏱️ {report.finalSignalVerdict.preMoveOpportunity.timingWindow}
                      </span>
                    </div>
                  </div>

                  {/* 3. Tactical Action Plan: What You Should Do vs What You Should NOT Do */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* What You Should Do */}
                    <div className="rounded-lg border border-emerald-500/30 bg-[#071412] p-3 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wide border-b border-emerald-900/40 pb-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>What You Should Do (Action Plan)</span>
                      </div>
                      <ul className="space-y-1.5 text-[11px] text-slate-200">
                        {report.finalSignalVerdict.whatYouShouldDo.map((item: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-1.5 leading-snug">
                            <span className="text-emerald-400 font-bold shrink-0 mt-0.5">✓</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* What You Should NOT Do */}
                    <div className="rounded-lg border border-red-500/30 bg-[#160a0d] p-3 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-red-400 uppercase tracking-wide border-b border-red-900/40 pb-1.5">
                        <XCircle className="w-4 h-4 text-red-400" />
                        <span>What You Should NOT Do (Anti-Trap Guard)</span>
                      </div>
                      <ul className="space-y-1.5 text-[11px] text-slate-200">
                        {report.finalSignalVerdict.whatYouShouldNotDo.map((item: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-1.5 leading-snug">
                            <span className="text-red-400 font-bold shrink-0 mt-0.5">✕</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Institutional Order Flow & Liquidity Microstructure Cockpit (Tournament Scalper Insights) */}
              {report.liquidityMicrostructure && (
                <div className="rounded-lg border border-cyan-500/30 bg-[#060c18] p-3 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-900/40 pb-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Institutional Liquidity Depth & Order Flow Microstructure
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                        {report.liquidityMicrostructure.aggressiveVsPassive.spreadCondition}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-slate-300 border border-slate-700">
                        Live Price: {report.priceFormatted}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    {/* Column 1: Aggressive Takers vs Passive Depth */}
                    <div className="bg-[#040812] p-2.5 rounded border border-[#142036] space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between text-slate-400 font-mono text-[10px]">
                        <span>AUCTION PARTICIPANTS</span>
                        <Zap className="w-3 h-3 text-amber-400" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">Aggressive Market Orders:</span>
                        <span className="font-mono font-bold text-cyan-300">
                          {report.liquidityMicrostructure.aggressiveVsPassive.aggressiveMarketTakers === 'BUYERS_AGGRESSIVE'
                            ? '🟢 Buyers Lifting Offer'
                            : '🔴 Sellers Hitting Bid'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">Passive Limit Liquidity:</span>
                        <span className="font-mono font-bold text-amber-300">
                          {report.liquidityMicrostructure.aggressiveVsPassive.passiveLiquidityProviders === 'BIDS_ABSORBING'
                            ? '🛡️ Bid Walls Defending'
                            : '🧱 Ask Walls Capping'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-white/5">
                        {report.liquidityMicrostructure.aggressiveVsPassive.executionCertainty}
                      </p>
                    </div>

                    {/* Column 2: Advanced Microstructure Patterns */}
                    <div className="bg-[#040812] p-2.5 rounded border border-[#142036] space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between text-slate-400 font-mono text-[10px]">
                        <span>DETECTED MICROSTRUCTURE PATTERNS</span>
                        <Activity className="w-3 h-3 text-cyan-400" />
                      </div>
                      <div className="space-y-1 text-[10px]">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-300">Bid/Ask Reloads:</span>
                          <span className={`font-mono font-bold ${report.liquidityMicrostructure.patterns.bidReloads.detected ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {report.liquidityMicrostructure.patterns.bidReloads.detected ? 'ACTIVE AT ' + report.liquidityMicrostructure.patterns.bidReloads.level : 'INACTIVE'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-300">Institutional Iceberg:</span>
                          <span className={`font-mono font-bold ${report.liquidityMicrostructure.patterns.icebergOrders.detected ? 'text-cyan-400' : 'text-slate-500'}`}>
                            {report.liquidityMicrostructure.patterns.icebergOrders.detected ? `STEALTH ${report.liquidityMicrostructure.patterns.icebergOrders.side} (~${report.liquidityMicrostructure.patterns.icebergOrders.estimatedVolume} Lots)` : 'NONE'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-300">Book Sweep & Flip:</span>
                          <span className={`font-mono font-bold ${report.liquidityMicrostructure.patterns.bookSweeps.detected ? 'text-amber-400' : 'text-slate-500'}`}>
                            {report.liquidityMicrostructure.patterns.bookSweeps.detected ? 'CLEARED & FLIPPED' : 'ROTATING'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Column 3: Path of Least Resistance */}
                    <div className="bg-[#040812] p-2.5 rounded border border-[#142036] space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between text-slate-400 font-mono text-[10px]">
                        <span>PATH OF LEAST RESISTANCE</span>
                        <Compass className="w-3 h-3 text-emerald-400" />
                      </div>
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-slate-300">Depth Bias:</span>
                        <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                          report.liquidityMicrostructure.pathOfLeastResistance.direction === 'UPWARD_VACUUM'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                            : report.liquidityMicrostructure.pathOfLeastResistance.direction === 'DOWNWARD_SLIPPAGE'
                            ? 'bg-red-950 text-red-300 border border-red-500/40'
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          {report.liquidityMicrostructure.pathOfLeastResistance.direction.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>Passive Asks: {report.liquidityMicrostructure.pathOfLeastResistance.overheadPassiveDepthLots} Lots</span>
                        <span>Passive Bids: {report.liquidityMicrostructure.pathOfLeastResistance.downsidePassiveDepthLots} Lots</span>
                      </div>
                      <p className="text-[10px] text-slate-300 leading-tight pt-1 border-t border-white/5">
                        {report.liquidityMicrostructure.pathOfLeastResistance.summary}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Genuine Combined Narrative: What Is Happening Right Now */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                <div className="lg:col-span-7 space-y-1.5 bg-[#060a14] p-3 rounded-lg border border-[#142036]">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Mic className="w-3 h-3" />
                    <span>What Is Happening Right Now (Unified Desk Narrative)</span>
                  </div>
                  <p className="text-xs text-white font-semibold leading-snug">
                    {report.headlineSummary}
                  </p>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {report.professionalDebrief || report.executiveSummary}
                  </p>
                </div>

                {/* Key Level Refusal & Acceptance Telemetry */}
                <div className="lg:col-span-5 bg-[#060a14] p-3 rounded-lg border border-[#142036] flex flex-col justify-between space-y-2">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center justify-between">
                    <span>Key Structural Level Reactions</span>
                    <span className="text-slate-400">Live Price: {report.priceFormatted}</span>
                  </div>
                  <div className="space-y-1.5 max-h-[115px] overflow-y-auto scrollbar-thin pr-1">
                    {(report.levelInteractions || []).map((lvl: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-start justify-between gap-2 text-[11px] bg-[#0a1020] px-2 py-1.5 rounded border border-[#152238]"
                      >
                        <div className="min-w-0">
                          <span className="font-mono font-bold text-white">{lvl.name}</span>{' '}
                          <span className="font-mono text-cyan-300">({lvl.price})</span>
                          <p className="text-[10px] text-slate-300 leading-tight mt-0.5">{lvl.analysis}</p>
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold shrink-0 ${
                            lvl.auctionState === 'REFUSED'
                              ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                              : lvl.auctionState === 'ACCEPTED'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {lvl.auctionState}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 6-Pillar Model Intelligence Strip (All working together in one view) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {(report.sections || []).map((sec: ModelSectionReport, idx: number) => {
                  const isSecSpeaking = isSpeaking && speakingSectionId === sec.id;
                  return (
                    <div
                      key={sec.id || idx}
                      onClick={() => handleSpeakSection(sec)}
                      className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                        isSecSpeaking
                          ? 'bg-cyan-950/40 border-cyan-400 shadow-xs'
                          : 'bg-[#070c17] border-[#152238] hover:border-cyan-500/40'
                      }`}
                      title="Click to hear voice briefing for this pillar"
                    >
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {getSectionIcon(sec.id)}
                          <span className="text-[11px] font-bold text-white truncate">{sec.title}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span
                            className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                              sec.status === 'BULLISH'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                                : sec.status === 'BEARISH'
                                ? 'bg-red-950 text-red-300 border border-red-500/30'
                                : sec.status === 'CAUTION'
                                ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {sec.badge}
                          </span>
                          <Volume2 className={`w-3 h-3 ${isSecSpeaking ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
                        </div>
                      </div>
                      <p className="text-[10px] text-cyan-200 font-medium line-clamp-1">{sec.finding}</p>
                      <p className="text-[10px] text-slate-400 leading-snug mt-0.5 line-clamp-2">{sec.detailedAnalysis}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bottom Part of Hub: Real-Time Tape & Squeeze Alerts Feed */}
          <div className="rounded-xl border border-[#18243c] bg-[#080d18] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-[#141c2c]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  Unified Live Confluence Alerts & Institutional Order Flow
                </span>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/30">
                  {liveAlerts.length} Active
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {onGenerateAlertNow && (
                  <>
                    <button
                      onClick={() => onGenerateAlertNow('CONFIRMED_REVERSAL')}
                      className="px-2.5 py-1 text-[11px] font-mono font-bold rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
                      title="Scan and announce confirmed absorption reversal at defended extremes (VAH/VAL/Iceberg Walls)"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      <span>↩️ Scan Reversal Alert</span>
                    </button>

                    {/* PRIMARY UNIFIED ACTION: Combines all 5 engines into one genuine institutional signal */}
                    <button
                      onClick={() => onGenerateAlertNow('UNIFIED_CONFLUENCE_SIGNAL')}
                      className="px-3 py-1 text-[11px] font-mono font-bold rounded bg-cyan-500 hover:bg-cyan-400 text-black shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
                      title="Synthesize Contract Stacking + Liquidation Squeeze + Velocity Ignition + Climactic Exhaustion + Compression Coil into ONE high-conviction master signal"
                    >
                      <Sparkles className="w-3.5 h-3.5 fill-black" />
                      <span>⚡ Scan Unified Confluence Signal</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {liveAlerts.length === 0 ? (
              <div className="py-4 text-center text-slate-500 font-mono text-xs">
                No active tape alerts yet. The unified engine is continuously monitoring contract buildup, liquidity sweeps, and squeezes.
              </div>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto scrollbar-thin pr-1">
                {liveAlerts.map((alert) => {
                  const isSelected = selectedAlertId === alert.id || (!selectedAlertId && alert.id === liveAlerts[0]?.id);
                  const isCopied = copiedId === alert.id;

                  return (
                    <div
                      key={alert.id}
                      className={`rounded-lg border transition-all overflow-hidden ${
                        isSelected
                          ? 'border-cyan-500/50 bg-[#090f1b]'
                          : 'border-[#172236] bg-[#070b13] hover:border-[#223352]'
                      }`}
                    >
                      <div
                        onClick={() => setSelectedAlertId(isSelected ? null : alert.id)}
                        className="p-2.5 flex items-center justify-between gap-3 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {getAlertIcon(alert.type)}
                          <span className="text-xs font-bold text-white tracking-wide truncate">
                            {alert.headline}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {alert.timeFormatted}
                          </span>
                          {alert.priority === 'CRITICAL' && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-red-950 text-red-300 border border-red-500/40">
                              🔴 CRITICAL
                            </span>
                          )}
                          {alert.priority === 'HIGH' && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-500/40">
                              🟠 HIGH
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={(e) => handleCopyText(alert.formattedText, alert.id, e)}
                            className="px-2 py-0.5 text-[10px] font-mono rounded bg-[#121c2e] hover:bg-cyan-950 text-cyan-300 border border-cyan-800/40 flex items-center gap-1 cursor-pointer transition-colors"
                            title="Copy alert markdown"
                          >
                            {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{isCopied ? 'Copied' : 'Copy'}</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              tradingVoice.speak(alert.spokenText || `${alert.headline}. ${alert.summary}`, {
                                priority: true,
                                force: true,
                                category: 'STRUCTURED_ALERT',
                                symbol: alert.symbol,
                              });
                            }}
                            className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/60 rounded cursor-pointer"
                            title="Speak this alert aloud via Trading Voice"
                          >
                            <Play className="w-3 h-3 fill-current" />
                          </button>
                          <span className="text-slate-500 p-0.5">
                            {isSelected ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="p-3 border-t border-[#141d2e] bg-[#05080f] space-y-2">
                          {alert.spokenText && (
                            <div className="p-2.5 rounded bg-[#060a14] border border-cyan-500/20 text-[11px] text-slate-200">
                              <div className="text-[10px] font-mono text-cyan-400 font-bold mb-1 flex items-center gap-1.5">
                                <Mic className="w-3 h-3" />
                                <span>SPOKEN AUDIO BRIEFING:</span>
                              </div>
                              <p className="leading-relaxed font-sans">{alert.spokenText}</p>
                            </div>
                          )}
                          <pre className="whitespace-pre-wrap text-slate-200 leading-relaxed text-[11px] font-mono select-text bg-[#070b13] p-3 rounded-lg border border-[#141d2e] max-h-[240px] overflow-y-auto scrollbar-thin">
                            {alert.formattedText}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
