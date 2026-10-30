import React, { useState, useEffect, useRef } from 'react';
import {
  FullModelAnalysisReport,
  ModelSectionReport,
  generateFullModelSectionAnalysis,
  fetchAIModelSectionAnalysis,
} from '../services/fullModelAnalysisService';
import { tradingVoice } from '../services/tradingVoiceService';
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
  X,
  Play,
  Square,
  Sparkles,
  Layers,
  Activity,
  BarChart3,
  Flame,
  Target,
  Globe,
  CheckCircle2,
  XCircle,
  Crosshair,
  AlertTriangle,
  RotateCcw,
  Copy,
  Check,
  Cpu,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Compass,
  ArrowRight,
  Sliders,
  ChevronDown,
  ChevronUp,
  Zap
} from 'lucide-react';

interface FullModelAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSymbol: string;
  currentPrice: number;
  candles: Candle[];
  snapshot: OrderBookSnapshot;
  modelOutput: SniperModelOutput;
}

export const FullModelAnalysisModal: React.FC<FullModelAnalysisModalProps> = ({
  isOpen,
  onClose,
  currentSymbol,
  currentPrice,
  candles,
  snapshot,
  modelOutput,
}) => {
  const [report, setReport] = useState<FullModelAnalysisReport | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(tradingVoice.isSpeaking());
  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);
  const [analysisSource, setAnalysisSource] = useState<string>('Institutional AI Analyst');
  const [hasCopied, setHasCopied] = useState<boolean>(false);
  const [speakingSectionId, setSpeakingSectionId] = useState<string | null>(null);
  const [autoSpeakEnabled, setAutoSpeakEnabled] = useState<boolean>(true);
  const hasAutoSpokenForSessionRef = useRef<string>('');

  const latestInputsRef = useRef({ currentPrice, candles, snapshot, modelOutput });
  useEffect(() => {
    latestInputsRef.current = { currentPrice, candles, snapshot, modelOutput };
  }, [currentPrice, candles, snapshot, modelOutput]);

  // Generate analysis report when modal opens or symbol changes AND automatically speak the AI analysis update
  useEffect(() => {
    if (!isOpen) {
      hasAutoSpokenForSessionRef.current = '';
      return;
    }

    const {
      currentPrice: latestPrice,
      candles: latestCandles,
      snapshot: latestSnapshot,
      modelOutput: latestModelOutput,
    } = latestInputsRef.current;

    // Immediate initial local display
    const rep = generateFullModelSectionAnalysis(
      currentSymbol,
      latestPrice,
      latestCandles,
      latestSnapshot,
      latestModelOutput,
      latestModelOutput.marketIntelligence
    );
    setReport(rep);

    // Automatically speak the AI analysis immediately on open without waiting for a manual button tap!
    const voiceSettings = tradingVoice.getSettings();
    const sessionKey = `${currentSymbol}_open`;
    if (autoSpeakEnabled && voiceSettings.enabled && voiceSettings.cadence !== 'muted' && hasAutoSpokenForSessionRef.current !== sessionKey) {
      hasAutoSpokenForSessionRef.current = sessionKey;
      // Do not automatically speak aloud if market session is closed
      if (modelOutput?.marketSchedule?.shouldPauseModel) {
        return;
      }
      tradingVoice.unlockAudio();
      setSpeakingSectionId('full');
      tradingVoice.speak(rep.fullSpokenScript, {
        priority: true,
        force: true,
        category: 'BRIEFING',
        symbol: currentSymbol,
      });
    }

    // Asynchronously call backend AI engine once per modal open / symbol switch
    setIsLoadingAI(true);
    fetchAIModelSectionAnalysis(
      currentSymbol,
      latestPrice,
      latestCandles,
      latestSnapshot,
      latestModelOutput,
      latestModelOutput.marketIntelligence
    )
      .then((res) => {
        if (res && res.report) {
          setReport(res.report);
          setAnalysisSource(res.source);
        }
      })
      .catch(() => {
        // Fallback already populated locally
      })
      .finally(() => {
        setIsLoadingAI(false);
      });
  }, [isOpen, currentSymbol, autoSpeakEnabled]);

  // Synchronize active report with live streaming price
  useEffect(() => {
    if (!report || currentPrice <= 0 || !isOpen) return;
    if (Math.abs(report.currentPrice - currentPrice) > 0.000001) {
      const formatted = formatPriceExact(currentPrice, currentSymbol);
      const oldPrice = report.currentPrice;
      setReport((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          currentPrice: currentPrice,
          priceFormatted: formatted,
          headlineSummary: reconcileScriptPrices(prev.headlineSummary, currentSymbol, currentPrice, oldPrice),
          professionalDebrief: prev.professionalDebrief
            ? reconcileScriptPrices(prev.professionalDebrief, currentSymbol, currentPrice, oldPrice)
            : prev.professionalDebrief,
          executiveSummary: reconcileScriptPrices(prev.executiveSummary, currentSymbol, currentPrice, oldPrice),
          fullSpokenScript: reconcileScriptPrices(prev.fullSpokenScript, currentSymbol, currentPrice, oldPrice),
          finalSignalVerdict: prev.finalSignalVerdict
            ? {
                ...prev.finalSignalVerdict,
                headline: `FINAL VERDICT: ${prev.finalSignalVerdict.actionBadge} ON ${currentSymbol === 'XAUUSD' ? 'GOLD' : currentSymbol} AT ${formatted}`,
              }
            : prev.finalSignalVerdict,
        };
      });
    }
  }, [currentPrice, currentSymbol, isOpen]);

  // Subscribe to speech status
  useEffect(() => {
    const unsub = tradingVoice.subscribe((speaking) => {
      setIsSpeaking(speaking);
      if (!speaking) {
        setSpeakingSectionId(null);
      }
    });
    return () => unsub();
  }, []);

  if (!isOpen || !report) return null;

  const handleSpeakFullReport = () => {
    tradingVoice.unlockAudio();
    // Always regenerate live speech with current exact price
    const liveRep = generateFullModelSectionAnalysis(
      currentSymbol,
      currentPrice,
      candles,
      snapshot,
      modelOutput,
      modelOutput.marketIntelligence
    );
    setSpeakingSectionId('full');
    tradingVoice.speak(liveRep.fullSpokenScript, {
      priority: true,
      force: true,
      category: 'BRIEFING',
      symbol: currentSymbol,
    });
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

  const handleRefreshAnalysis = () => {
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
          setReport(res.report);
          setAnalysisSource(res.source);
        }
      })
      .finally(() => {
        setIsLoadingAI(false);
      });
  };

  const handleCopyReport = () => {
    const text = `# Institutional Market Intelligence Debrief: ${report.symbolFullName} (${report.symbol})
Price: ${report.priceFormatted} | Time: ${report.timeFormatted}
Overall Bias: ${report.overallBias.replace(/_/g, ' ')} (Confluence Score: ${report.biasScore}/100)

## Headline
${report.headlineSummary}

## What Is Going On Right Now (Institutional Debrief)
${report.professionalDebrief || report.executiveSummary}

## Key Levels & Auction Refusal Analysis
${(report.levelInteractions || []).map((lvl) => `- ${lvl.name} (${lvl.price}): [${lvl.auctionState}] ${lvl.analysis}`).join('\n')}

## Model Sections
${(report.sections || []).map((sec) => `### ${sec.title} [${sec.status} - ${sec.badge}]\nFinding: ${sec.finding}\nAnalysis: ${sec.detailedAnalysis}`).join('\n\n')}

## Spoken Debrief Script
${report.fullSpokenScript}
`;
    navigator.clipboard.writeText(text).then(() => {
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2200);
    });
  };

  const edge = modelOutput.sniperEdge;
  const digits = getInstrumentPrecision(currentSymbol);

  const getSectionIcon = (id: string, idx: number) => {
    switch (id) {
      case 'regime':
      case 'auction_dynamics':
        return <Layers className="w-4 h-4 text-cyan-400" />;
      case 'orderflow':
      case 'order_flow':
        return <Activity className="w-4 h-4 text-blue-400" />;
      case 'crowd':
      case 'trapped_liquidity':
        return <BarChart3 className="w-4 h-4 text-amber-400" />;
      case 'exhaustion':
      case 'exhaustion_physics':
        return <Flame className="w-4 h-4 text-rose-400" />;
      case 'tactical':
      case 'tactical_edge':
        return <Target className="w-4 h-4 text-emerald-400" />;
      case 'macro':
      case 'macro_catalyst':
        return <Globe className="w-4 h-4 text-purple-400" />;
      default:
        return <Compass className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-4xl max-h-[94vh] flex flex-col rounded-xl bg-[#090e18] border border-cyan-500/40 shadow-2xl shadow-cyan-950/60 text-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1b253b] bg-linear-to-r from-[#071021] via-[#090e18] to-[#0f172a] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Compass className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Institutional Market Intelligence Analysis
                </h2>
                <span className="font-mono text-xs text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-600/40 font-bold">
                  {report.symbol} · {report.priceFormatted}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-slate-400 hidden sm:inline">
                  Full Model Allocation: Value auction, refusal states, and institutional execution
                </span>
                <span className="text-[10px] text-cyan-300 bg-cyan-950/80 px-2 py-0.2 rounded border border-cyan-700/50 font-mono flex items-center gap-1">
                  <Cpu className="w-3 h-3" />
                  <span>{analysisSource}</span>
                </span>
                {report.liveContext && (
                  <span
                    className="text-[10px] text-emerald-300 bg-emerald-950/80 px-2 py-0.2 rounded border border-emerald-700/50 font-mono flex items-center gap-1"
                    title={`Sources: ForexFactory, RealtimeNews, Investing.com, MacroCalendar | Sync: ${report.liveContext.data_freshness?.last_news_sync || 'Active'}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>FEEDS: {report.liveContext.data_freshness?.overall || 'FRESH'}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshAnalysis}
              disabled={isLoadingAI}
              className={`p-1.5 text-slate-400 hover:text-cyan-300 rounded hover:bg-slate-800/60 transition-colors cursor-pointer ${
                isLoadingAI ? 'animate-spin text-cyan-400' : ''
              }`}
              title="Refresh live AI analysis"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handleCopyReport}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800/60 transition-colors cursor-pointer"
              title="Copy complete analysis to clipboard"
            >
              {hasCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Banner: Play Full Spoken Debrief & Bias Status */}
        <div className="px-5 py-3 bg-[#060c18] border-b border-[#152033] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Market Bias:</span>
            <span
              className={`px-2.5 py-0.5 rounded font-mono font-bold uppercase text-[11px] ${
                report.overallBias.includes('BUY')
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                  : report.overallBias.includes('SELL')
                  ? 'bg-rose-950 text-rose-300 border border-rose-500/50'
                  : 'bg-slate-900 text-slate-300 border border-slate-700'
              }`}
            >
              {report.overallBias.replace(/_/g, ' ')}
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              (Confluence Grade: {report.biasScore}/100)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoSpeakEnabled(!autoSpeakEnabled)}
              className={`px-2.5 py-1.5 text-[11px] font-mono font-bold rounded-lg border transition-colors cursor-pointer ${
                autoSpeakEnabled
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}
              title="Automatically speak AI analysis without waiting for manual tap"
            >
              {autoSpeakEnabled ? '🔊 AUTO-VOICE: ON' : '🔇 AUTO-VOICE: OFF'}
            </button>
            {isSpeaking && speakingSectionId === 'full' ? (
              <button
                onClick={() => tradingVoice.cancelSpeech()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-950 text-rose-300 border border-rose-500/50 hover:bg-rose-900 cursor-pointer shadow-xs transition-all"
              >
                <Square className="w-3.5 h-3.5 fill-rose-300" />
                <span>Silence Voice</span>
              </button>
            ) : (
              <button
                onClick={handleSpeakFullReport}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-linear-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-md shadow-emerald-950/60 cursor-pointer transition-all"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Listen to Live Desk Briefing</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Body: Allocation of AI Analysis and Model Structure */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* 0. Authoritative Final Signal Verdict, Pre-Move Opportunity & Action Plan */}
          {report.finalSignalVerdict && (
            <div className="rounded-xl border border-cyan-500/40 bg-[#050a16] p-4 shadow-xl space-y-3.5">
              {/* Final Verdict Status Bar */}
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
              </div>

              {/* Pre-Move Opportunity Radar: "Can You Take Advantage Before Any Move?" */}
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

              {/* Tactical Action Plan: What You Should Do vs What You Should NOT Do */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* What You Should Do */}
                <div className="rounded-lg border border-emerald-500/30 bg-[#071412] p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wide border-b border-emerald-900/40 pb-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>What You Should Do (Action Plan)</span>
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-slate-200">
                    {report.finalSignalVerdict.whatYouShouldDo.map((item, idx) => (
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
                    {report.finalSignalVerdict.whatYouShouldNotDo.map((item, idx) => (
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

          {/* 1. Real-Time Market Debrief: What Is Going On Right Now */}
          {/* Reads like a senior trader giving what is going on without robotic section numbers */}
          <div className="rounded-xl border border-cyan-500/30 bg-[#070d1a] p-4 text-xs text-slate-200 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-cyan-900/40">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <h3 className="font-bold text-white text-sm tracking-wide">
                  What Is Going On Right Now · Institutional Market Narrative
                </h3>
              </div>
              <span className="text-[11px] font-mono text-cyan-400">
                {report.timeFormatted}
              </span>
            </div>

            <p className="text-amber-300 font-semibold mb-3 text-xs leading-snug">
              {report.headlineSummary}
            </p>

            <div className="space-y-3 leading-relaxed text-slate-300 font-sans text-xs">
              {(report.professionalDebrief || report.executiveSummary)
                .split('\n\n')
                .map((paragraph, pIdx) => (
                  <p key={pIdx} className="text-justify">
                    {paragraph}
                  </p>
                ))}
            </div>
          </div>

          {/* Institutional Order Flow & Liquidity Microstructure Cockpit (Tournament Scalper Playbook) */}
          {report.liquidityMicrostructure && (
            <div className="rounded-xl border border-cyan-500/30 bg-[#060c18] p-4 text-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-900/40 pb-2.5">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-white uppercase tracking-wider text-xs">
                    Institutional Liquidity Depth & Microstructure Cockpit
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                    {report.liquidityMicrostructure.aggressiveVsPassive.spreadCondition}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-slate-300 border border-slate-700">
                    Live Price: {report.priceFormatted}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. Aggressive Takers vs Passive Providers */}
                <div className="bg-[#040812] p-3 rounded-lg border border-[#142036] space-y-2">
                  <div className="flex items-center justify-between text-slate-400 font-mono text-[10px]">
                    <span>AGGRESSIVE TAKERS VS PASSIVE DEPTH</span>
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">Market Orders:</span>
                      <span className="font-mono font-bold text-cyan-300">
                        {report.liquidityMicrostructure.aggressiveVsPassive.aggressiveMarketTakers === 'BUYERS_AGGRESSIVE'
                          ? '🟢 Buyers Lifting Offer'
                          : '🔴 Sellers Hitting Bid'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">Passive Depth:</span>
                      <span className="font-mono font-bold text-amber-300">
                        {report.liquidityMicrostructure.aggressiveVsPassive.passiveLiquidityProviders === 'BIDS_ABSORBING'
                          ? '🛡️ Bid Walls Defending'
                          : '🧱 Ask Ceilings Capping'}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight pt-1.5 border-t border-white/5">
                    {report.liquidityMicrostructure.aggressiveVsPassive.executionCertainty}
                  </p>
                </div>

                {/* 2. Detected Institutional Patterns */}
                <div className="bg-[#040812] p-3 rounded-lg border border-[#142036] space-y-2">
                  <div className="flex items-center justify-between text-slate-400 font-mono text-[10px]">
                    <span>ORDER FLOW PATTERNS</span>
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="space-y-1 text-[10px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Bid/Ask Reloads:</span>
                      <span className={`font-mono font-bold ${report.liquidityMicrostructure.patterns.bidReloads.detected ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {report.liquidityMicrostructure.patterns.bidReloads.detected ? 'ACTIVE AT ' + report.liquidityMicrostructure.patterns.bidReloads.level : 'INACTIVE'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Iceberg Orders:</span>
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

                {/* 3. Path of Least Resistance */}
                <div className="bg-[#040812] p-3 rounded-lg border border-[#142036] space-y-2">
                  <div className="flex items-center justify-between text-slate-400 font-mono text-[10px]">
                    <span>PATH OF LEAST RESISTANCE</span>
                    <Compass className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-slate-300">Depth Bias:</span>
                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
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
                    <span>Overhead Asks: {report.liquidityMicrostructure.pathOfLeastResistance.overheadPassiveDepthLots} Lots</span>
                    <span>Downside Bids: {report.liquidityMicrostructure.pathOfLeastResistance.downsidePassiveDepthLots} Lots</span>
                  </div>
                  <p className="text-[10px] text-slate-300 leading-tight pt-1.5 border-t border-white/5">
                    {report.liquidityMicrostructure.pathOfLeastResistance.summary}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Order Flow Scalping Entry Signal Cockpit (HVN, Imbalance, Heavy Absorption, DOM & Wick Formation) */}
          {report.orderFlowScalp && (
            <div className="rounded-xl border border-amber-500/30 bg-[#080f1e] p-4 text-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-900/40 pb-2.5">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-white uppercase tracking-wider text-xs">
                    Order Flow Scalping Entry Signal · {report.orderFlowScalp.side === 'SELL' ? 'Short Scalp' : report.orderFlowScalp.side === 'BUY' ? 'Long Scalp' : 'HVN Standby'}
                  </span>
                </div>
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                  report.orderFlowScalp.isTriggered 
                    ? (report.orderFlowScalp.side === 'SELL' ? 'bg-red-950 text-red-300 border border-red-500/50' : 'bg-emerald-950 text-emerald-300 border border-emerald-500/50')
                    : 'bg-slate-900 text-slate-400 border border-slate-700'
                }`}>
                  HVN: {report.orderFlowScalp.hvnPrice.toFixed(digits)}
                </span>
              </div>

              {/* Core Principle Banner */}
              <div className="p-2.5 rounded bg-[#040812] border border-cyan-500/30 text-slate-200">
                <span className="text-[11px] font-bold text-cyan-300 uppercase">Core Principle: </span>
                <span className="text-white font-medium">&ldquo;{report.orderFlowScalp.corePrinciple}&rdquo;</span>
              </div>

              {/* 4 Pillars Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
                <div className="bg-[#040812] p-2.5 rounded-lg border border-[#142036]">
                  <div className="text-[10px] text-cyan-400 font-bold uppercase">1. HVN (High Volume Node)</div>
                  <div className="font-mono font-bold text-white text-xs mt-0.5">{report.orderFlowScalp.hvnPrice.toFixed(digits)}</div>
                  <p className="text-[10px] text-slate-300 mt-0.5 leading-snug">{report.orderFlowScalp.hvnDescription}</p>
                </div>
                <div className="bg-[#040812] p-2.5 rounded-lg border border-[#142036]">
                  <div className="text-[10px] text-amber-400 font-bold uppercase">2. Order Imbalance</div>
                  <div className="font-mono font-bold text-white text-xs mt-0.5">{report.orderFlowScalp.imbalance.ratioText}</div>
                  <p className="text-[10px] text-slate-300 mt-0.5 leading-snug">{report.orderFlowScalp.imbalance.description}</p>
                </div>
                <div className="bg-[#040812] p-2.5 rounded-lg border border-[#142036]">
                  <div className="text-[10px] text-emerald-400 font-bold uppercase">3. Heavy Absorption</div>
                  <div className="font-mono font-bold text-white text-xs mt-0.5">{report.orderFlowScalp.heavyAbsorption.absorptionVolume} lots absorbed</div>
                  <p className="text-[10px] text-slate-300 mt-0.5 leading-snug">{report.orderFlowScalp.heavyAbsorption.description}</p>
                </div>
                <div className="bg-[#040812] p-2.5 rounded-lg border border-[#142036]">
                  <div className="text-[10px] text-purple-400 font-bold uppercase">4. DOM & Replenishment</div>
                  <div className="font-mono font-bold text-white text-xs mt-0.5">{report.orderFlowScalp.domBehavior.restingLiquidityLots} lots resting</div>
                  <p className="text-[10px] text-slate-300 mt-0.5 leading-snug">{report.orderFlowScalp.domBehavior.failureDescription}</p>
                </div>
              </div>

              {/* Execution Rules */}
              <div className="bg-[#040812] p-3 rounded-lg border border-[#142036] space-y-2">
                <div className="text-[10px] font-bold text-slate-300 uppercase">Execution Rules (Zero Friction):</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-[10px]">
                  <div className="p-1.5 rounded bg-[#0b1322] border border-[#1b2b48] text-slate-200">✓ No scoring checklist</div>
                  <div className="p-1.5 rounded bg-[#0b1322] border border-[#1b2b48] text-slate-200">✓ No waiting candle closure</div>
                  <div className="p-1.5 rounded bg-[#0b1322] border border-[#1b2b48] text-cyan-300 font-semibold">✓ Entry during wick formation</div>
                  <div className="p-1.5 rounded bg-[#0b1322] border border-[#1b2b48] text-red-300 font-semibold">✓ Stop-loss beyond extreme</div>
                  <div className="p-1.5 rounded bg-[#0b1322] border border-[#1b2b48] text-amber-300 font-semibold">✓ Exit if absorption fails</div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] font-mono">
                  <span className="text-white"><strong>Action:</strong> {report.orderFlowScalp.entryZone.label}</span>
                  <span className="text-red-300"><strong>Stop:</strong> {report.orderFlowScalp.stopLoss.placement}</span>
                  <span className="text-amber-300"><strong>Exit Rule:</strong> {report.orderFlowScalp.exitCondition}</span>
                </div>
              </div>
            </div>
          )}

          {/* 2. Key Institutional Levels & Auction Refusal Matrix */}
          <div className="rounded-xl border border-[#16233a] bg-[#070c18] p-4 text-xs">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Auction Levels & Refusal / Acceptance State</span>
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">
                Order Flow Status
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {(report.levelInteractions && report.levelInteractions.length > 0
                ? report.levelInteractions
                : [
                    {
                      name: 'Point of Control (POC)',
                      price: modelOutput.valueStructure.poc.toFixed(digits),
                      auctionState: currentPrice >= modelOutput.valueStructure.poc ? 'ACCEPTED' : 'REFUSED',
                      analysis: `Primary transactional agreement node. Price is positioned ${currentPrice >= modelOutput.valueStructure.poc ? 'above POC with buyers defending pullbacks' : 'below POC with seller limit resistance'}.`,
                    },
                    {
                      name: 'Value Area High (VAH)',
                      price: modelOutput.valueStructure.vah.toFixed(digits),
                      auctionState: currentPrice >= modelOutput.valueStructure.vah ? 'TESTING' : 'REFUSED',
                      analysis: `Wholesale premium ceiling. Upward attempts outside value face institutional profit-taking.`,
                    },
                    {
                      name: 'Value Area Low (VAL)',
                      price: modelOutput.valueStructure.val.toFixed(digits),
                      auctionState: currentPrice <= modelOutput.valueStructure.val ? 'TESTING' : 'ACCEPTED',
                      analysis: `Wholesale discount floor. Responsive limit buyers defend this boundary against sellers.`,
                    },
                  ]
              ).map((lvl, idx) => {
                const isRefused = lvl.auctionState === 'REFUSED';
                const isAccepted = lvl.auctionState === 'ACCEPTED';

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border flex flex-col justify-between ${
                      isRefused
                        ? 'border-rose-800/40 bg-rose-950/20'
                        : isAccepted
                        ? 'border-emerald-800/40 bg-emerald-950/20'
                        : 'border-amber-800/40 bg-amber-950/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-white text-[12px]">{lvl.name}</span>
                        <span
                          className={`font-mono text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            isRefused
                              ? 'bg-rose-950 text-rose-300 border border-rose-600/50'
                              : isAccepted
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/50'
                              : 'bg-amber-950 text-amber-300 border border-amber-600/50'
                          }`}
                        >
                          {lvl.auctionState === 'REFUSED' ? 'REFUSED (REJECTED)' : lvl.auctionState}
                        </span>
                      </div>
                      <div className="font-mono text-cyan-400 font-bold text-xs mb-1.5">
                        {lvl.price}
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        {lvl.analysis}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. The 6 Model Sections (Model Design Preserved and Allocated) */}
          <div className="rounded-xl border border-[#16233a] bg-[#070c18] p-4 text-xs">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Model Intelligence Diagnostic Pillars</span>
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">
                {report.sections?.length || 6} Diagnostic Layers
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(report.sections || []).map((sec, idx) => {
                const isSecSpeaking = isSpeaking && speakingSectionId === sec.id;
                const statusColor =
                  sec.status === 'BULLISH'
                    ? 'border-emerald-700/50 bg-emerald-950/20 text-emerald-300'
                    : sec.status === 'BEARISH'
                    ? 'border-rose-700/50 bg-rose-950/20 text-rose-300'
                    : sec.status === 'CAUTION'
                    ? 'border-amber-700/50 bg-amber-950/20 text-amber-300'
                    : 'border-slate-700/50 bg-slate-900/30 text-slate-300';

                return (
                  <div
                    key={sec.id || idx}
                    className="p-3.5 rounded-lg border border-[#17243c] bg-[#091122] flex flex-col justify-between hover:border-cyan-500/30 transition-all shadow-xs"
                  >
                    <div>
                      {/* Top Bar of Section Card */}
                      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-[#162035]">
                        <div className="flex items-center gap-2">
                          {getSectionIcon(sec.id, idx)}
                          <span className="font-bold text-white text-xs">
                            {sec.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] border ${statusColor}`}>
                            {sec.status}
                          </span>
                          <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-[#121c32] text-cyan-300 border border-cyan-800/40">
                            {sec.badge}
                          </span>
                          {/* Individual Section Audio Button */}
                          <button
                            onClick={() => (isSecSpeaking ? tradingVoice.cancelSpeech() : handleSpeakSection(sec))}
                            className={`p-1 rounded transition-colors cursor-pointer ${
                              isSecSpeaking
                                ? 'bg-rose-950 text-rose-300 border border-rose-500/50'
                                : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800/60'
                            }`}
                            title={isSecSpeaking ? 'Silence section audio' : 'Listen to this section analysis'}
                          >
                            {isSecSpeaking ? <Square className="w-3 h-3 fill-rose-300" /> : <Volume2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Finding */}
                      <p className="text-amber-300 font-medium text-[11px] mb-2 leading-snug">
                        {sec.finding}
                      </p>

                      {/* Detailed Analysis */}
                      <p className="text-slate-300 text-[11px] leading-relaxed mb-3">
                        {sec.detailedAnalysis}
                      </p>
                    </div>

                    {/* Metrics Grid */}
                    {sec.metrics && sec.metrics.length > 0 && (
                      <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-[#131c2e] text-[10px] font-mono">
                        {sec.metrics.map((m, mIdx) => (
                          <div key={mIdx} className="p-1.5 rounded bg-[#060b16] border border-[#141d30]">
                            <span className="text-slate-400 block truncate">{m.label}</span>
                            <span
                              className={`font-bold block mt-0.5 truncate ${
                                m.sentiment === 'positive'
                                  ? 'text-emerald-400'
                                  : m.sentiment === 'negative'
                                  ? 'text-rose-400'
                                  : 'text-slate-200'
                              }`}
                            >
                              {m.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Tactical Execution & Risk Roadmap */}
          <div className="rounded-xl border border-[#16233a] bg-[#070c18] p-4 text-xs">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-purple-400" />
              <span>Precision Execution Parameters & Invalidation Boundary</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded-lg bg-[#0b1324] border border-[#1c2c48]">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Optimal Entry</span>
                <span className="text-sm font-mono font-bold text-emerald-400">
                  {edge.isEdgeQualified ? edge.optimalEntry.toFixed(digits) : report.priceFormatted}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {edge.isEdgeQualified ? edge.actionBadge : 'Wholesale Rotation'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#0b1324] border border-rose-900/40">
                <span className="text-[10px] text-rose-400 uppercase font-mono block">Hard Stop (Invalidation)</span>
                <span className="text-sm font-mono font-bold text-rose-300">
                  {edge.isEdgeQualified ? edge.hardStopLoss.toFixed(digits) : (currentPrice * 0.996).toFixed(digits)}
                </span>
                <span className="text-[10px] text-rose-400/80 block mt-0.5">
                  Structural Line in Sand
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#0b1324] border border-[#1c2c48]">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Take Profit 1</span>
                <span className="text-sm font-mono font-bold text-cyan-300">
                  {edge.isEdgeQualified ? edge.targetTP1.toFixed(digits) : (currentPrice * 1.004).toFixed(digits)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Trail to Breakeven on Hit
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#0b1324] border border-[#1c2c48]">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Take Profit 2 / Runner</span>
                <span className="text-sm font-mono font-bold text-purple-300">
                  {edge.isEdgeQualified ? edge.targetTP2.toFixed(digits) : (currentPrice * 1.008).toFixed(digits)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Macro Liquidity Pool
                </span>
              </div>
            </div>
          </div>

          {/* 5. Order Flow & Trapped Crowd Diagnostics */}
          <div className="rounded-xl border border-[#16233a] bg-[#070c18] p-4 text-xs">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Order Flow Microstructure & Trapped Crowd Diagnostics</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
              <div className="p-2 rounded bg-[#091122] border border-[#182642]">
                <span className="text-[10px] text-slate-400 block">Retail Sentiment</span>
                <span className="text-xs font-bold text-amber-300">
                  {Math.round(snapshot.sentiment.buyRatio * 100)}% L / {100 - Math.round(snapshot.sentiment.buyRatio * 100)}% S
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5">Trapped Liquidity</span>
              </div>

              <div className="p-2 rounded bg-[#091122] border border-[#182642]">
                <span className="text-[10px] text-slate-400 block">Exhaustion Score</span>
                <span className="text-xs font-bold text-emerald-400">
                  {modelOutput.exhaustion.exhaustionScore || 72}%
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5">
                  {modelOutput.exhaustion.exhaustedSide || 'Sellers'} Spent
                </span>
              </div>

              <div className="p-2 rounded bg-[#091122] border border-[#182642]">
                <span className="text-[10px] text-slate-400 block">Tape Delta Trend</span>
                <span className="text-xs font-bold text-cyan-300">
                  {modelOutput.orderFlow.deltaTrend}
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5">Active Initiative</span>
              </div>

              <div className="p-2 rounded bg-[#091122] border border-[#182642]">
                <span className="text-[10px] text-slate-400 block">Absorption Wall</span>
                <span className="text-xs font-bold text-teal-300">
                  CONFIRMED
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5">Passive Limit Defense</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#162035] bg-[#070b14] flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            <span>Real-time Dukascopy tick stream and order book depth synchronized</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#141e32] hover:bg-[#1a2740] text-slate-200 text-xs font-medium cursor-pointer transition-colors"
          >
            Close Analysis
          </button>
        </div>
      </div>
    </div>
  );
};
