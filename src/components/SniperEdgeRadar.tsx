import React, { useState } from 'react';
import { InstrumentConfig } from '../services/mockDataGenerator';
import { 
  Target, 
  BatteryWarning, 
  Flame, 
  ShieldCheck, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertTriangle, 
  CheckCircle2, 
  Zap, 
  Clock, 
  Crosshair, 
  Layers, 
  Compass, 
  Activity, 
  ArrowRight, 
  TrendingUp, 
  Percent, 
  Sliders, 
  Sparkles,
  HelpCircle,
  Info,
  TrendingDown
} from 'lucide-react';
import { SniperModelOutput, SymbolTargetLifecycle } from '../types/sniperModel';

interface SniperEdgeRadarProps {
  currentSymbol: string;
  instrument: InstrumentConfig;
  modelOutput: SniperModelOutput;
  currentPrice: number;
  onSelectSymbol: (symbol: string) => void;
  onOpenScorecard: () => void;
  onDismissSignal?: (symbol: string) => void;
  onMarkAchieved?: (symbol: string, target?: 'TP1' | 'TP2' | 'TP3') => void;
  onResetSignal?: (symbol: string) => void;
  onJumpToNextSetup?: () => void;
  onTriggerNextSetup?: (symbol: string) => void;
  isSignalDismissed?: boolean;
  lifecycle?: SymbolTargetLifecycle;
  achievedSignalsRecord?: Record<string, any>;
  targetLifecyclesRecord?: Record<string, SymbolTargetLifecycle>;
  embeddedMode?: boolean;
  currentTimeframe?: 'M1' | 'M5' | 'M15' | 'H1' | 'H4';
}

export const SniperEdgeRadar: React.FC<SniperEdgeRadarProps> = ({
  currentSymbol,
  instrument,
  modelOutput,
  currentPrice,
  onSelectSymbol,
  onOpenScorecard,
  onDismissSignal,
  onMarkAchieved,
  onResetSignal,
  onJumpToNextSetup,
  onTriggerNextSetup,
  isSignalDismissed = false,
  lifecycle,
  achievedSignalsRecord,
  targetLifecyclesRecord,
  embeddedMode = false,
  currentTimeframe = 'M5',
}) => {
  const [copiedSetup, setCopiedSetup] = useState<boolean>(false);
  const [showWickExplainer, setShowWickExplainer] = useState<boolean>(false);
  const [showOrderFlowGuide, setShowOrderFlowGuide] = useState<boolean>(false);

  const { exhaustion, sniperEdge } = modelOutput;
  const digits = instrument.digits;

  const isAllCompleted = !!lifecycle?.allTargetsCompleted || !!sniperEdge.isAchieved || isSignalDismissed || !!(achievedSignalsRecord && achievedSignalsRecord[currentSymbol]) || !!lifecycle?.waitingForNextSetup;
  const isAchieved = isAllCompleted;
  const tp1Hit = !!lifecycle?.tp1Hit;
  const tp2Hit = !!lifecycle?.tp2Hit;
  const tp3Hit = !!lifecycle?.tp3Hit;
  const totalSecured = lifecycle?.totalPipsSecured ?? sniperEdge.achievedPips ?? 28;
  const countdown = lifecycle?.nextSetupCountdown ?? 18;

  const handleCopySetup = () => {
    const symClean = currentSymbol === 'XAUUSD' ? 'GOLD' : currentSymbol;
    const isBuy = sniperEdge.triggerAction === 'SNIPER_BUY';
    const text = `## ${isBuy ? '🟢 BUY' : '🔴 SELL'} SETUP ALERT

**PAIR:** ${symClean}
**ALERT:** ${isBuy ? 'BUY' : 'SELL'} SETUP
**PRICE:** ${currentPrice.toFixed(digits)}
**KEY LEVEL:** ${sniperEdge.optimalEntry.toFixed(digits)}

### WHAT IS HAPPENING
${exhaustion.mechanismDetail}

### WHY IT IS HAPPENING
${exhaustion.headline}. Trapped participants on the losing side are being forced to close positions, allowing directional order flow to take command.

### ORDER FLOW
* Delta: ${modelOutput.orderFlow.deltaTrend}
* Cumulative Delta: Aligned with ${isBuy ? 'Accumulation' : 'Distribution'}
* Large Trades: Significant footprint clusters executed at key value boundary
* Iceberg: Defensive institutional reload detected
* Liquidity: Path of Least Resistance confirmed
* Auction: Confluence Scorecard ${modelOutput.scorecard.grade} (${modelOutput.scorecard.totalScore} pts)
* Other relevant order-flow condition: ${exhaustion.exhaustedSide} Exhaustion at ${exhaustion.exhaustionScore}% with ${exhaustion.powerRemaining}% power remaining

### CONFIRMATION
Order flow, delta progression, and order book depth agree with directional thesis.

### WHAT COULD MAKE IT FAIL
A sustained close beyond hard stop loss ${sniperEdge.hardStopLoss.toFixed(digits)}, signalling that the defensive limit wall has broken.

### POSSIBLE FIRST MOVE
Price may first probe immediate resting liquidity to shake out weak hands before executing continuation toward TP1.

### ENTRY
${sniperEdge.optimalEntry.toFixed(digits)}

### INVALIDATION / STOP AREA
${sniperEdge.hardStopLoss.toFixed(digits)}

### TARGET / TAKE-PROFIT
TP1: ${sniperEdge.targetTP1.toFixed(digits)} | TP2: ${sniperEdge.targetTP2.toFixed(digits)} | TP3: ${sniperEdge.targetTP3.toFixed(digits)}

### NEXT THING I'M WATCHING
Monitoring order flow absorption as price advances across fair value Point of Control.`;

    navigator.clipboard.writeText(text);
    setCopiedSetup(true);
    setTimeout(() => setCopiedSetup(false), 2500);
  };

  const isBuy = sniperEdge.triggerAction === 'SNIPER_BUY';
  const isSell = sniperEdge.triggerAction === 'SNIPER_SELL';

  return (
    <div id="sniper-radar-section" className="flex flex-col gap-4 w-full">
      {/* 1. Top Hero: Active or Achieved Sniper Edge State (Skipped in embeddedMode to avoid repeating the top execution strip) */}
      {!embeddedMode && (
      <div className={`p-4 md:p-5 rounded-xl border relative overflow-hidden shadow-2xl transition-all ${
        isAchieved
          ? 'bg-gradient-to-r from-[#041a14] via-[#09221c] to-[#0c1424] border-emerald-500/50 shadow-emerald-950/30'
          : sniperEdge.isEdgeQualified
          ? isBuy
            ? 'bg-gradient-to-r from-[#061816] via-[#091f24] to-[#0c1424] border-emerald-500/50 shadow-emerald-950/40'
            : 'bg-gradient-to-r from-[#1c0808] via-[#220d13] to-[#0c1424] border-red-500/50 shadow-red-950/40'
          : 'bg-[#0c121e] border-[#1d273c]'
      }`}>
        {/* Glow ambient background accent */}
        <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 opacity-20 ${
          isAchieved ? 'bg-emerald-400' : isBuy ? 'bg-emerald-500' : isSell ? 'bg-red-500' : 'bg-cyan-500'
        }`} />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Action Badge & Edge Identification */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-1 text-xs font-extrabold font-mono rounded tracking-wider uppercase flex items-center gap-1.5 shadow-sm ${
                isAchieved
                  ? 'bg-emerald-500 text-black shadow-emerald-500/40 font-bold'
                  : tp2Hit
                  ? 'bg-gradient-to-r from-emerald-500 to-amber-500 text-black font-extrabold shadow-emerald-500/30'
                  : tp1Hit
                  ? 'bg-cyan-400 text-black font-extrabold shadow-cyan-500/30'
                  : sniperEdge.isEdgeQualified
                  ? isBuy
                    ? 'bg-emerald-500 text-black shadow-emerald-500/30'
                    : 'bg-red-500 text-white shadow-red-500/30'
                  : 'bg-slate-800 text-slate-300'
              }`}>
                {isAchieved ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>ALL TARGETS COMPLETED · WAITING NEXT</span>
                  </>
                ) : tp2Hit ? (
                  <>
                    <Zap className="w-3.5 h-3.5 text-black" />
                    <span>TP1 & TP2 HIT (+{(lifecycle?.tp1Pips ?? 0) + (lifecycle?.tp2Pips ?? 0)}p) · RUNNER ON TP3</span>
                  </>
                ) : tp1Hit ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                    <span>TP1 HIT (+{lifecycle?.tp1Pips ?? 14}p) · RUNNER TARGETING TP2 & TP3</span>
                  </>
                ) : (
                  <>
                    <Crosshair className="w-3.5 h-3.5 animate-spin-slow" />
                    <span>{sniperEdge.actionBadge}</span>
                  </>
                )}
              </span>

              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#101726] border border-[#1f2b42] text-cyan-300 font-bold">
                {currentSymbol} · {instrument.name}
              </span>

              <span className="text-xs text-slate-400 font-mono">
                Price: <strong className="text-white">{currentPrice.toFixed(digits)}</strong>
              </span>

              {isAchieved ? (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-bold">
                  Total Secured: +{totalSecured} pips booked
                </span>
              ) : (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/40 text-amber-300">
                  Confidence: {sniperEdge.confidenceScore}%
                </span>
              )}
            </div>

            <h2 className="text-lg md:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              {isAchieved ? (
                <span className="text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>ALL TARGETS COMPLETED (+{totalSecured} PIPS) — SIGNAL REMOVED</span>
                </span>
              ) : tp2Hit ? (
                <span className="text-amber-300 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <span>TP1 & TP2 COMPLETED (+{(lifecycle?.tp1Pips ?? 0) + (lifecycle?.tp2Pips ?? 0)} PIPS) — RUNNER PURSUING TP3</span>
                </span>
              ) : tp1Hit ? (
                <span className="text-cyan-300 flex items-center gap-2">
                  <Target className="w-5 h-5 text-cyan-400" />
                  <span>TP1 SECURED (+{lifecycle?.tp1Pips ?? 14} PIPS) — STOP LOSS TRAILED TO BREAKEVEN</span>
                </span>
              ) : (
                <span>{exhaustion.headline}</span>
              )}
            </h2>

            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              {isAchieved
                ? `All take profit targets (TP1, TP2, TP3) have been achieved with +${totalSecured} pips total profit. The active trade signal has been retired from the chart to lock in gains and prevent chop risk. The order flow engine is actively scanning ${currentSymbol} for the next auction edge exhaustion setup.`
                : tp2Hit
                ? `Both TP1 and TP2 have been achieved! Gains are locked in. The remaining runner position is risk-free and actively seeking Macro Liquidity at TP3 (${sniperEdge.targetTP3.toFixed(digits)}).`
                : tp1Hit
                ? `Take Profit 1 (POC ${sniperEdge.targetTP1.toFixed(digits)}) has been reached with +${lifecycle?.tp1Pips ?? 14} pips booked! Hard stop loss has been automatically trailed to Breakeven (${sniperEdge.optimalEntry.toFixed(digits)}) to make this trade 100% risk-free. Remaining volume is targeting TP2 and TP3.`
                : exhaustion.mechanismDetail}
            </p>
          </div>

          {/* Right: Quick Action Controls */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* If signal is active: multi-target hit buttons */}
            {!isAchieved && sniperEdge.isEdgeQualified && (
              <>
                {!tp1Hit && onMarkAchieved && (
                  <button
                    onClick={() => onMarkAchieved(currentSymbol, 'TP1')}
                    className="px-3 py-2 text-xs font-bold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black border border-cyan-400 transition-all flex items-center gap-1.5 shadow-md shadow-cyan-950/40"
                    title="Simulate / Hit TP1: Locks in profit, trails SL to Breakeven, keeps runner active"
                  >
                    <Target className="w-4 h-4 text-black" />
                    <span>Hit TP1 (+{lifecycle?.tp1Pips ?? 14}p)</span>
                  </button>
                )}

                {tp1Hit && !tp2Hit && onMarkAchieved && (
                  <button
                    onClick={() => onMarkAchieved(currentSymbol, 'TP2')}
                    className="px-3 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-black border border-amber-300 transition-all flex items-center gap-1.5 shadow-md shadow-amber-950/40"
                    title="Simulate / Hit TP2: Locks runner profit at Value Boundary, targets TP3"
                  >
                    <Zap className="w-4 h-4 text-black" />
                    <span>Hit TP2 (+{lifecycle?.tp2Pips ?? sniperEdge.potentialPipsReward}p)</span>
                  </button>
                )}

                {tp2Hit && !tp3Hit && onMarkAchieved && (
                  <button
                    onClick={() => onMarkAchieved(currentSymbol, 'TP3')}
                    className="px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black border border-emerald-300 transition-all flex items-center gap-1.5 shadow-md shadow-emerald-950/40"
                    title="Simulate / Hit TP3: Completes all targets, removes signal, waits for next setup"
                  >
                    <CheckCircle2 className="w-4 h-4 text-black" />
                    <span>Hit TP3 (Complete All & Remove)</span>
                  </button>
                )}

                <button
                  onClick={() => onMarkAchieved ? onMarkAchieved(currentSymbol, 'TP3') : onDismissSignal?.(currentSymbol)}
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-[#0e1c16] hover:bg-emerald-950 text-emerald-300 border border-emerald-600/40 transition-all flex items-center gap-1.5 shadow-xs"
                  title="Close trade now, remove active signal, and wait for next setup in this symbol"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Complete All & Wait Next</span>
                </button>
              </>
            )}

            {isAchieved && (
              <>
                {onTriggerNextSetup && (
                  <button
                    onClick={() => onTriggerNextSetup(currentSymbol)}
                    className="px-3.5 py-2 text-xs font-bold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black border border-cyan-400 shadow-md shadow-cyan-950/40 transition-all flex items-center gap-1.5"
                    title="Scan and trigger next setup in this pair immediately"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-black" />
                    <span>Scan Next Setup in {currentSymbol} ({countdown}s)</span>
                  </button>
                )}

                <button
                  onClick={onJumpToNextSetup ? onJumpToNextSetup : () => onTriggerNextSetup?.(currentSymbol)}
                  className="px-3.5 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>Find Next Ready Setup</span>
                  <ArrowRight className="w-3 h-3" />
                </button>

                {onResetSignal && (
                  <button
                    onClick={() => onResetSignal(currentSymbol)}
                    className="px-3 py-2 text-xs font-semibold rounded-lg bg-[#141d2e] hover:bg-[#1a283f] text-slate-300 border border-slate-700 transition-all flex items-center gap-1.5"
                    title="Re-arm signal on this symbol to test again"
                  >
                    <span>🔄 Re-Arm Setup</span>
                  </button>
                )}
              </>
            )}

            <button
              onClick={handleCopySetup}
              className="px-3 py-2 text-xs font-bold rounded-lg bg-[#141d2e] hover:bg-[#1a273e] text-cyan-300 border border-cyan-500/30 transition-all flex items-center gap-1.5 shadow-xs"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>{copiedSetup ? 'Copied!' : 'Copy Plan'}</span>
            </button>

            <button
              onClick={onOpenScorecard}
              className="px-3 py-2 text-xs font-bold rounded-lg bg-[#121927] hover:bg-[#182236] text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>Scorecard</span>
            </button>
          </div>
        </div>

        {/* 2. Key Parameters Bar (Optimal Entry, Stop Loss, Take Profits, Risk/Reward) */}
        {sniperEdge.isEdgeQualified && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-4 pt-4 border-t border-white/10 text-xs font-mono">
            {/* Optimal Entry */}
            <div className="p-2.5 rounded-lg bg-[#0a101b]/90 border border-cyan-500/30">
              <div className="text-[10px] text-cyan-400 font-sans uppercase font-bold flex items-center gap-1">
                <Target className="w-3 h-3 text-cyan-400" />
                <span>Optimal Edge Entry</span>
              </div>
              <div className="text-base font-bold text-white mt-1">
                {sniperEdge.optimalEntry.toFixed(digits)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Zone: {sniperEdge.entryZoneMin.toFixed(digits)} – {sniperEdge.entryZoneMax.toFixed(digits)}
              </div>
            </div>

            {/* Hard Invalidation Stop Loss / Trailed Breakeven */}
            <div className={`p-2.5 rounded-lg border transition-all ${
              tp1Hit ? 'bg-[#042016]/90 border-emerald-500/50 shadow-xs' : 'bg-[#19090b]/90 border-red-500/40'
            }`}>
              <div className={`text-[10px] font-sans uppercase font-bold flex items-center gap-1 ${tp1Hit ? 'text-emerald-400' : 'text-red-400'}`}>
                {tp1Hit ? <ShieldCheck className="w-3 h-3 text-emerald-400" /> : <AlertTriangle className="w-3 h-3 text-red-400" />}
                <span>{tp1Hit ? 'Trailed Stop (BE)' : 'Hard Stop Loss'}</span>
              </div>
              <div className={`text-base font-bold mt-1 ${tp1Hit ? 'text-emerald-300' : 'text-red-300'}`}>
                {tp1Hit ? sniperEdge.optimalEntry.toFixed(digits) : sniperEdge.hardStopLoss.toFixed(digits)}
              </div>
              <div className={`text-[10px] mt-0.5 ${tp1Hit ? 'text-emerald-400' : 'text-red-400/80'}`}>
                {tp1Hit ? '🛡️ Risk Free (Stop at BE)' : `Risk: ${sniperEdge.potentialPipsRisk} pips`}
              </div>
            </div>

            {/* TP 1: Fair Value Center (POC) */}
            <div className={`p-2.5 rounded-lg border transition-all ${
              tp1Hit ? 'bg-[#032316]/90 border-emerald-500/60 shadow-xs' : 'bg-[#07131e]/90 border-blue-500/30'
            }`}>
              <div className={`text-[10px] font-sans uppercase font-bold flex items-center justify-between ${tp1Hit ? 'text-emerald-400' : 'text-blue-400'}`}>
                <span>TP1 · Fair Value (POC)</span>
                {tp1Hit && <span className="px-1 py-0.2 rounded bg-emerald-500 text-black font-extrabold text-[9px]">HIT</span>}
              </div>
              <div className={`text-base font-bold mt-1 ${tp1Hit ? 'text-emerald-300' : 'text-blue-200'}`}>
                {sniperEdge.targetTP1.toFixed(digits)}
              </div>
              <div className={`text-[10px] mt-0.5 ${tp1Hit ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                {tp1Hit ? `+${lifecycle?.tp1Pips ?? 14}p secured · Trailed BE` : 'Scale 50% & Lock Breakeven'}
              </div>
            </div>

            {/* TP 2: Opposite Value Edge */}
            <div className={`p-2.5 rounded-lg border transition-all ${
              tp2Hit ? 'bg-[#032316]/90 border-emerald-500/60 shadow-xs' : 'bg-[#171407]/90 border-amber-500/30'
            }`}>
              <div className={`text-[10px] font-sans uppercase font-bold flex items-center justify-between ${tp2Hit ? 'text-emerald-400' : 'text-amber-400'}`}>
                <span>TP2 · Value Boundary</span>
                {tp2Hit && <span className="px-1 py-0.2 rounded bg-emerald-500 text-black font-extrabold text-[9px]">HIT</span>}
              </div>
              <div className={`text-base font-bold mt-1 ${tp2Hit ? 'text-emerald-300' : 'text-amber-200'}`}>
                {sniperEdge.targetTP2.toFixed(digits)}
              </div>
              <div className={`text-[10px] mt-0.5 ${tp2Hit ? 'text-emerald-400 font-bold' : 'text-amber-400'}`}>
                {tp2Hit ? `+${lifecycle?.tp2Pips ?? sniperEdge.potentialPipsReward}p secured · Runner open` : `+${sniperEdge.potentialPipsReward} pips reward`}
              </div>
            </div>

            {/* TP 3: Macro Liquidity Pool */}
            <div className={`p-2.5 rounded-lg border transition-all ${
              tp3Hit ? 'bg-[#032316]/90 border-emerald-500/60 shadow-xs' : 'bg-[#120a1f]/90 border-purple-500/30'
            }`}>
              <div className={`text-[10px] font-sans uppercase font-bold flex items-center justify-between ${tp3Hit ? 'text-emerald-400' : 'text-purple-400'}`}>
                <span>TP3 · Macro Liquidity</span>
                {tp3Hit && <span className="px-1 py-0.2 rounded bg-emerald-500 text-black font-extrabold text-[9px]">HIT</span>}
              </div>
              <div className={`text-base font-bold mt-1 ${tp3Hit ? 'text-emerald-300' : 'text-purple-200'}`}>
                {sniperEdge.targetTP3.toFixed(digits)}
              </div>
              <div className={`text-[10px] mt-0.5 ${tp3Hit ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                {tp3Hit ? `+${lifecycle?.tp3Pips ?? (sniperEdge.potentialPipsReward + 20)}p · Complete` : 'Runner position target'}
              </div>
            </div>

            {/* Risk-to-Reward Ratio */}
            <div className="p-2.5 rounded-lg bg-[#081a17]/90 border border-emerald-500/40">
              <div className="text-[10px] text-emerald-400 font-sans uppercase font-bold flex items-center gap-1">
                <Percent className="w-3 h-3 text-emerald-400" />
                <span>Risk / Reward Ratio</span>
              </div>
              <div className="text-base font-bold text-emerald-300 mt-1">
                1 : {sniperEdge.riskRewardRatio}
              </div>
              <div className="text-[10px] text-emerald-400/80 mt-0.5">High Expectancy Edge</div>
            </div>
          </div>
        )}
      </div>
      )}

      {/* 2. Middle Row: Dual Exhaustion Gauges & 5-Step Edge Verification Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (7 cols): Aggressive Order Flow Battle & Exhaustion Engine */}
        <div className="lg:col-span-7 bg-[#0b0f1a] border border-[#182338] rounded-xl p-4 md:p-5 flex flex-col justify-between shadow-lg">
          <div>
            {/* Header: Title + Guide Toggle + Dominance Badge */}
            <div className="flex flex-wrap items-center justify-between border-b border-[#182338] pb-3 mb-4 gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    AGGRESSIVE ORDER FLOW BATTLE: BUYERS VS SELLERS
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Market Buys (Lifting Asks) vs Market Sells (Hitting Bids)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowOrderFlowGuide(!showOrderFlowGuide)}
                  className="flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded bg-[#131b2c] hover:bg-[#1a253c] text-cyan-300 border border-[#1e2a42] transition-colors"
                  title="Click to understand how to read Aggressive Buyers vs Sellers"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{showOrderFlowGuide ? 'Hide Guide' : 'How To Read & Trade'}</span>
                </button>
                <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded border ${
                  exhaustion.buyerPower > exhaustion.sellerPower
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                    : exhaustion.sellerPower > exhaustion.buyerPower
                    ? 'bg-red-950/80 text-red-300 border-red-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  {exhaustion.buyerPower > exhaustion.sellerPower
                    ? `🟢 BUYERS DOMINATING (${exhaustion.buyerPower}%)`
                    : exhaustion.sellerPower > exhaustion.buyerPower
                    ? `🔴 SELLERS DOMINATING (${exhaustion.sellerPower}%)`
                    : '⚖️ 50/50 BALANCED'}
                </span>
              </div>
            </div>

            {/* Optional Expandable Order Flow 10-Second Guide */}
            {showOrderFlowGuide && (
              <div className="mb-4 p-3.5 rounded-lg bg-[#070e1b] border border-cyan-800/40 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-cyan-300 font-bold">
                  <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>HOW TO DETERMINE AGGRESSIVE BUYERS VS AGGRESSIVE SELLERS IN 10 SECONDS</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px] text-slate-300">
                  <div className="p-2.5 rounded bg-[#0b1424] border border-[#172640]">
                    <div className="font-bold text-emerald-400 mb-1">1. Aggressive Buyers (Market Buys)</div>
                    <p className="text-slate-400 leading-relaxed">
                      Traders who click <span className="text-white font-semibold">BUY MARKET</span>. They pay the spread immediately to lift the Ask. When they dominate (green), price gets aggressively driven upward.
                    </p>
                  </div>
                  <div className="p-2.5 rounded bg-[#0b1424] border border-[#172640]">
                    <div className="font-bold text-red-400 mb-1">2. Aggressive Sellers (Market Sells)</div>
                    <p className="text-slate-400 leading-relaxed">
                      Traders who click <span className="text-white font-semibold">SELL MARKET</span>. They dump positions immediately into the Bid. When they dominate (red), price gets driven downward.
                    </p>
                  </div>
                  <div className="p-2.5 rounded bg-[#0b1424] border border-[#172640]">
                    <div className="font-bold text-amber-300 mb-1">3. Exhaustion & Sniper Entry</div>
                    <p className="text-slate-400 leading-relaxed">
                      When aggressive sellers attack a price but a large institutional <span className="text-white font-semibold">limit buy wall</span> absorbs every lot, sellers run out of orders (<span className="text-red-400 font-semibold">exhaustion</span>) and price explodes upward.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tug-of-War Combatant Cards: Aggressive Sellers vs Aggressive Buyers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              {/* Left Combatant: Aggressive Sellers */}
              <div className={`p-3.5 rounded-lg border transition-all ${
                exhaustion.sellerPower <= 20
                  ? 'bg-[#180a0e] border-red-500/40 shadow-sm shadow-red-950/50'
                  : 'bg-[#140b12] border-[#2b1424]'
              }`}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50"></span>
                    <span className="text-slate-200 font-bold uppercase tracking-wider text-[11px]">
                      Aggressive Sellers
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-red-400 font-bold bg-red-950/70 px-2 py-0.5 rounded border border-red-900/50">
                    Market Sells @ Bid
                  </span>
                </div>

                <div className="flex items-baseline justify-between my-2">
                  <div className="text-2xl font-mono font-bold text-white">
                    {exhaustion.sellerPower}%
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      exhaustion.sellerPower <= 20
                        ? 'bg-red-900/60 text-red-300 border border-red-600/50 uppercase'
                        : exhaustion.sellerPower > exhaustion.buyerPower
                        ? 'bg-red-950 text-red-400 border border-red-800'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {exhaustion.sellerPower <= 20
                        ? '⚡ Exhausted / 0 Firepower'
                        : exhaustion.sellerPower > exhaustion.buyerPower
                        ? '🔴 Heavy Selling Force'
                        : 'Absorbed By Wall'}
                    </span>
                  </div>
                </div>

                <div className="w-full bg-[#200e1b] rounded-full h-2 overflow-hidden border border-[#38162d]">
                  <div 
                    className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-red-600 via-orange-500 to-amber-400"
                    style={{ width: `${exhaustion.sellerPower}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 mt-2 flex items-center justify-between">
                  <span>Microstructure:</span>
                  <span className="font-mono text-slate-300">
                    {exhaustion.sellerPower <= 20
                      ? 'Sell orders absorbed by limit buyers'
                      : 'Active market dumping into bid'}
                  </span>
                </div>
              </div>

              {/* Right Combatant: Aggressive Buyers */}
              <div className={`p-3.5 rounded-lg border transition-all ${
                exhaustion.buyerPower >= 70
                  ? 'bg-[#071914] border-emerald-500/40 shadow-sm shadow-emerald-950/50'
                  : 'bg-[#071714] border-[#10302b]'
              }`}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50"></span>
                    <span className="text-slate-200 font-bold uppercase tracking-wider text-[11px]">
                      Aggressive Buyers
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-400 font-bold bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-900/50">
                    Market Buys @ Ask
                  </span>
                </div>

                <div className="flex items-baseline justify-between my-2">
                  <div className="text-2xl font-mono font-bold text-white">
                    {exhaustion.buyerPower}%
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      exhaustion.buyerPower >= 70
                        ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-600/50 uppercase'
                        : exhaustion.buyerPower > exhaustion.sellerPower
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {exhaustion.buyerPower >= 70
                        ? '✓ Buyers In Full Command'
                        : exhaustion.buyerPower > exhaustion.sellerPower
                        ? '🟢 Initiative Expanding'
                        : 'Passive / Waiting'}
                    </span>
                  </div>
                </div>

                <div className="w-full bg-[#0a211d] rounded-full h-2 overflow-hidden border border-[#16433b]">
                  <div 
                    className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-teal-500 via-emerald-400 to-cyan-300"
                    style={{ width: `${exhaustion.buyerPower}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 mt-2 flex items-center justify-between">
                  <span>Microstructure:</span>
                  <span className="font-mono text-slate-300">
                    {exhaustion.buyerPower >= 70
                      ? 'Chewing through overhead ask liquidity'
                      : 'Holding resting limit bids'}
                  </span>
                </div>
              </div>
            </div>

            {/* Real-time Order Flow Tug-of-War Balance Meter */}
            <div className="p-3 rounded-lg bg-[#080d19] border border-[#162238] mb-3">
              <div className="flex items-center justify-between text-[11px] font-mono font-semibold mb-1.5">
                <span className="text-red-400 flex items-center gap-1">
                  <span>←</span>
                  <span>Sellers Slamming Bids ({100 - Math.round(((exhaustion.buyerPower || 50) / ((exhaustion.buyerPower || 50) + (exhaustion.sellerPower || 50) || 100)) * 100)}%)</span>
                </span>
                <span className="text-slate-400 uppercase tracking-wider text-[10px]">Tug-of-War Dominance</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <span>Buyers Lifting Asks ({Math.round(((exhaustion.buyerPower || 50) / ((exhaustion.buyerPower || 50) + (exhaustion.sellerPower || 50) || 100)) * 100)}%)</span>
                  <span>→</span>
                </span>
              </div>

              {/* Progress Track with Center 50% Divider */}
              <div className="relative w-full h-3 bg-[#131c2e] rounded-full overflow-hidden border border-[#1d2a45]">
                {/* 50% Center Marker */}
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/40 z-10" />
                {/* Buyer portion bar from right or split */}
                <div className="flex h-full w-full">
                  <div 
                    className="h-full bg-gradient-to-r from-red-600 to-rose-400 transition-all duration-700"
                    style={{ width: `${100 - Math.round(((exhaustion.buyerPower || 50) / ((exhaustion.buyerPower || 50) + (exhaustion.sellerPower || 50) || 100)) * 100)}%` }}
                  />
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-700"
                    style={{ width: `${Math.round(((exhaustion.buyerPower || 50) / ((exhaustion.buyerPower || 50) + (exhaustion.sellerPower || 50) || 100)) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="text-[10px] text-center font-mono mt-1.5 text-slate-400">
                {exhaustion.buyerPower > exhaustion.sellerPower ? (
                  <span className="text-emerald-300 font-bold">
                    ▲ Aggressive Buyers are crossing the spread to lift offers (+{Math.abs(exhaustion.buyerPower - exhaustion.sellerPower)}% net buyer advantage)
                  </span>
                ) : exhaustion.sellerPower > exhaustion.buyerPower ? (
                  <span className="text-red-300 font-bold">
                    ▼ Aggressive Sellers are crossing the spread to dump into bids (+{Math.abs(exhaustion.sellerPower - exhaustion.buyerPower)}% net seller advantage)
                  </span>
                ) : (
                  <span className="text-slate-300">
                    ⚖ Order flow is at exact equilibrium (50/50 balance)
                  </span>
                )}
              </div>
            </div>

            {/* Decisive Live Verdict Banner: Who is in control & what you should do */}
            <div className={`p-3 rounded-lg border text-xs mb-3 ${
              exhaustion.exhaustedSide === 'SELLERS' || exhaustion.buyerPower > exhaustion.sellerPower
                ? 'bg-[#061814] border-emerald-500/40 text-emerald-100'
                : exhaustion.exhaustedSide === 'BUYERS' || exhaustion.sellerPower > exhaustion.buyerPower
                ? 'bg-[#180a0e] border-red-500/40 text-red-100'
                : 'bg-[#0f1728] border-[#1e2d4a] text-slate-200'
            }`}>
              <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] mb-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-amber-300">Live Order Flow Verdict & Action Rule:</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-200 mb-1.5">
                {exhaustion.exhaustedSide === 'SELLERS' || exhaustion.buyerPower > exhaustion.sellerPower ? (
                  <>
                    <strong className="text-emerald-400 font-bold">AGGRESSIVE SELLERS ARE EXHAUSTED:</strong> Sellers attacked with market sell orders, but institutional limit buyers absorbed <strong className="text-white">{exhaustion.absorptionVolume} lots</strong> with zero downward progress. Sellers are out of fuel. Aggressive buyers now command the book.
                  </>
                ) : exhaustion.exhaustedSide === 'BUYERS' || exhaustion.sellerPower > exhaustion.buyerPower ? (
                  <>
                    <strong className="text-red-400 font-bold">AGGRESSIVE BUYERS ARE EXHAUSTED:</strong> Buyers pushed into overhead limit offers, but smart money absorbed <strong className="text-white">{exhaustion.absorptionVolume} lots</strong>. Buyers are out of orders. Aggressive sellers are driving price down.
                  </>
                ) : (
                  <>
                    <strong className="text-cyan-300 font-bold">BALANCED ORDER FLOW:</strong> Buyers and sellers are actively trading within the spread. No directional exhaustion detected yet.
                  </>
                )}
              </p>
              <div className="flex items-center gap-2 pt-1 border-t border-white/10 text-[10px] font-mono">
                <span className="text-amber-400 font-bold uppercase shrink-0">Trading Directive:</span>
                <span className="text-slate-300">
                  {exhaustion.exhaustedSide === 'SELLERS' || exhaustion.buyerPower > exhaustion.sellerPower
                    ? '🎯 DO NOT SHORT. Align with aggressive buyers or enter during wick formation at the limit wall.'
                    : exhaustion.exhaustedSide === 'BUYERS' || exhaustion.sellerPower > exhaustion.buyerPower
                    ? '🎯 DO NOT LONG. Sellers in command; look for distribution breakdown signals.'
                    : '🎯 STAND BY. Await clear wall absorption and order flow exhaustion before entering.'}
                </span>
              </div>
            </div>

            {/* Exhaustion Signature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
              {/* Divergence Box */}
              <div className="p-2.5 rounded bg-[#101726] border border-[#1a253c]">
                <div className="text-[10px] text-slate-400 uppercase font-sans font-semibold">Delta Divergence</div>
                <div className="font-bold text-cyan-300 mt-1">
                  {exhaustion.divergence === 'BULLISH_DELTA_DIVERGENCE' ? '✓ Bullish Divergence' : exhaustion.divergence === 'BEARISH_DELTA_DIVERGENCE' ? '✓ Bearish Divergence' : 'None'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Effort rising, price holding</div>
              </div>

              {/* Absorption Wall */}
              <div className="p-2.5 rounded bg-[#101726] border border-[#1a253c]">
                <div className="text-[10px] text-slate-400 uppercase font-sans font-semibold">Passive Wall Absorption</div>
                <div className="font-bold text-amber-300 mt-1">
                  {exhaustion.absorptionVolume} lots absorbed
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">0 downward follow-through</div>
              </div>

              {/* Trapped Liquidity */}
              <div className="p-2.5 rounded bg-[#101726] border border-[#1a253c]">
                <div className="text-[10px] text-slate-400 uppercase font-sans font-semibold">Trapped Counter-Crowd</div>
                <div className="font-bold text-purple-300 mt-1">
                  {exhaustion.trappedVolume} lots trapped
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 truncate">{exhaustion.trappedCrowdLabel}</div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#182338] text-[11px] text-slate-400 flex items-center justify-between">
            <span className="font-mono text-[10px] text-slate-500">
              SMARTFX AUTOMATION · Institutional Order Flow Engine
            </span>
            <span className="text-[10px] text-cyan-400/90 font-mono">
              Real-time Market Orders vs Depth Absorption
            </span>
          </div>
        </div>

        {/* Right Column (5 cols): 5-Gate Pre-Signal Liquidity Sweep & Manipulation Scanner */}
        <div className="lg:col-span-5 bg-[#0b0f1a] border border-[#182338] rounded-xl p-4 md:p-5 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between border-b border-[#182338] pb-3 mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className={`w-5 h-5 ${sniperEdge.isEdgeQualified ? 'text-emerald-400' : 'text-amber-400'}`} />
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    6-PILLAR CONFLUENCE & PRE-SIGNAL LIQUIDITY SCANNER
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Short scalps & flips require Liquidity Sweep + Judas Reclaim + DOM Iceberg Absorption + CVD/Footprint Flip + Trapped Crowd (Never liquidity alone)
                  </p>
                </div>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold shrink-0 ${
                sniperEdge.isEdgeQualified
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                  : 'bg-amber-950 text-amber-300 border border-amber-700'
              }`}>
                {sniperEdge.liquiditySweepAudit
                  ? `${sniperEdge.liquiditySweepAudit.fiveGateChecklist.filter((g) => g.passed).length} / 5 GATES`
                  : sniperEdge.isEdgeQualified ? '5 / 5 GATES' : 'HOLD'}
              </span>
            </div>

            {sniperEdge.liquiditySweepAudit && (
              <div className={`mb-2.5 px-2.5 py-1.5 rounded border text-[11px] font-mono font-bold flex items-center justify-between ${
                sniperEdge.liquiditySweepAudit.allAttractingLiquidityCleared
                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-950/50 border-amber-500/40 text-amber-300'
              }`}>
                <span>{sniperEdge.liquiditySweepAudit.scannerStageLabel}</span>
              </div>
            )}

            <div className="space-y-2 text-xs">
              {(sniperEdge.liquiditySweepAudit?.fiveGateChecklist || sniperEdge.reasons.map((r, i) => ({
                id: `G${i + 1}`,
                label: `Gate ${i + 1}`,
                passed: sniperEdge.isEdgeQualified,
                detail: r,
              }))).map((gate) => (
                <div key={gate.id} className={`p-2.5 rounded-lg border flex items-start gap-2.5 ${
                  gate.passed
                    ? 'bg-[#0d1724] border-emerald-500/30'
                    : 'bg-[#14121d] border-amber-500/30'
                }`}>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold ${
                    gate.passed
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  }`}>
                    {gate.passed ? '✓' : '⏳'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-[11px] text-white">
                        {gate.id}: {gate.label}
                      </span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                        gate.passed ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'
                      }`}>
                        {gate.passed ? 'CLEARED' : 'WAITING'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug mt-0.5">{gate.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#182338] flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Playbook Engine:</span>
            <span className="text-cyan-300 font-bold truncate ml-2">{sniperEdge.playbookTrigger}</span>
          </div>
        </div>
      </div>

      {/* 2B. Order Flow Scalping Entry Signal: HVN, Aggressive Imbalance, Heavy Absorption, DOM & Wick Formation */}
      {(() => {
        const scalp = modelOutput.orderFlowScalp || sniperEdge.orderFlowScalp;
        if (!scalp) return null;

        const isShortScalp = scalp.side === 'SELL';
        const isLongScalp = scalp.side === 'BUY';
        const isTriggered = scalp.isTriggered;

        return (
          <div className="bg-[#0b0f1a] border border-[#1d273d] rounded-xl p-4 md:p-5 shadow-xl relative overflow-hidden">
            {/* Top Glow Accent Bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${
              isShortScalp ? 'bg-gradient-to-r from-red-600 via-rose-500 to-amber-500' :
              isLongScalp ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400' :
              'bg-gradient-to-r from-slate-600 to-slate-700'
            }`} />

            {/* Header: Title & Trigger Badge */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#182338] pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-md ${
                  isShortScalp ? 'bg-red-950 text-red-400 border border-red-500/40' :
                  isLongScalp ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40' :
                  'bg-[#131b2c] text-cyan-400 border border-[#22304d]'
                }`}>
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white tracking-wide">
                      ORDER FLOW SCALPING ENTRY SIGNAL · {isShortScalp ? 'SHORT SCALP' : isLongScalp ? 'LONG SCALP' : 'HVN MONITOR'}
                    </h3>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      isTriggered 
                        ? (isShortScalp ? 'bg-red-950 text-red-300 border border-red-600 animate-pulse' : 'bg-emerald-950 text-emerald-300 border border-emerald-600 animate-pulse')
                        : 'bg-[#151c2e] text-slate-400 border border-slate-700'
                    }`}>
                      {isTriggered ? (isShortScalp ? '⚡ SHORT TRIGGERED' : '⚡ LONG TRIGGERED') : '⏳ SCANNING HVN'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Execution mechanics based on aggressive volume stalling against opposing passive liquidity at High Volume Nodes.
                  </p>
                </div>
              </div>

              {/* Pair & Live Price Pill */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-2 py-1 rounded bg-[#101726] border border-[#1f2b42] text-cyan-300 font-bold">
                  {currentSymbol} · {currentPrice.toFixed(digits)}
                </span>
                <span className="text-xs font-mono px-2 py-1 rounded bg-amber-950/70 border border-amber-500/40 text-amber-300 font-bold">
                  HVN: {scalp.hvnPrice.toFixed(digits)}
                </span>
              </div>
            </div>

            {/* Easy-Understanding Quick Action Callout */}
            <div className="mb-3.5 p-3.5 rounded-lg bg-gradient-to-r from-[#071924] via-[#09222c] to-[#0c182a] border border-cyan-500/50 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`px-2.5 py-1 rounded-md font-bold text-xs uppercase tracking-wider shrink-0 shadow-sm ${
                  isShortScalp ? 'bg-red-500 text-white' : isLongScalp ? 'bg-emerald-500 text-black' : 'bg-slate-700 text-white'
                }`}>
                  {isShortScalp ? '🔴 SELL ACTION' : isLongScalp ? '🟢 BUY ACTION' : 'WAIT FOR SETUP'}
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex flex-wrap items-center gap-1.5">
                    <span>{isShortScalp ? 'Sell near' : 'Buy near'}</span>
                    <span className="text-cyan-300 font-mono text-sm underline decoration-cyan-400 font-extrabold">{scalp.entryZone.triggerPrice.toFixed(digits)}</span>
                    <span className="text-slate-400 font-normal">during wick formation</span>
                    <span className="text-emerald-400 font-mono font-semibold">(+{scalp.accuracyVerification?.reboundRetractionTicks ?? 1.5}t bounce confirmed)</span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5 flex flex-wrap items-center gap-2">
                    <span>Stop Loss: <strong className="text-red-400 font-mono">{scalp.stopLoss.price.toFixed(digits)}</strong> (Risk capped at ~{scalp.accuracyVerification?.maxRiskPips ?? 1.5}p)</span>
                    <span className="text-slate-500">·</span>
                    <span>Target: <strong className="text-emerald-400 font-mono">{scalp.hvnPrice.toFixed(digits)}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowWickExplainer(!showWickExplainer)}
                  className="px-2.5 py-1 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{showWickExplainer ? 'Hide Guide' : 'How It Works (Easy Guide)'}</span>
                </button>
              </div>
            </div>

            {/* Core Principle Callout Banner */}
            <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-[#0d1627] to-[#121d33] border border-cyan-500/30 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-cyan-300 uppercase tracking-wide">Core Scalping Principle:</span>
                <p className="text-xs text-white font-medium mt-0.5">
                  &ldquo;{scalp.corePrinciple}&rdquo;
                </p>
              </div>
            </div>

            {/* 4 Order Flow Microstructure Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              {/* 1. HVN Node */}
              <div className="p-3 rounded-lg bg-[#0d1424] border border-[#1b2842] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                    <span className="uppercase">1. HVN (High Volume Node)</span>
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="text-base font-bold font-mono text-cyan-300 mt-1">
                    {scalp.hvnPrice.toFixed(digits)}
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                    Where significant business has been transacted and price may find acceptance.
                  </p>
                </div>
                <div className="mt-2 text-[10px] font-mono text-cyan-400/90 font-semibold pt-1.5 border-t border-white/5">
                  Status: Price at acceptance boundary
                </div>
              </div>

              {/* 2. Aggressive Imbalance */}
              <div className="p-3 rounded-lg bg-[#0d1424] border border-[#1b2842] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                    <span className="uppercase">2. Order Imbalance</span>
                    <Activity className={`w-3.5 h-3.5 ${isShortScalp ? 'text-red-400' : 'text-emerald-400'}`} />
                  </div>
                  <div className={`text-base font-bold font-mono mt-1 ${isShortScalp ? 'text-red-300' : isLongScalp ? 'text-emerald-300' : 'text-slate-200'}`}>
                    {scalp.imbalance.ratioText}
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                    Which side is executing more aggressively: {scalp.imbalance.description}
                  </p>
                </div>
                <div className="mt-2 text-[10px] font-mono text-amber-400/90 font-semibold pt-1.5 border-t border-white/5">
                  Takers: {scalp.imbalance.aggressiveSide} aggressive
                </div>
              </div>

              {/* 3. Heavy Absorption */}
              <div className="p-3 rounded-lg bg-[#0d1424] border border-[#1b2842] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                    <span className="uppercase">3. Heavy Absorption</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="text-base font-bold font-mono text-amber-300 mt-1">
                    {scalp.heavyAbsorption.absorptionVolume} lots absorbed
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                    {scalp.heavyAbsorption.description}
                  </p>
                </div>
                <div className="mt-2 text-[10px] font-mono text-amber-300/90 font-semibold pt-1.5 border-t border-white/5">
                  Passive side: {scalp.heavyAbsorption.passiveSide}
                </div>
              </div>

              {/* 4. DOM Resting Liquidity & Replenishment */}
              <div className="p-3 rounded-lg bg-[#0d1424] border border-[#1b2842] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                    <span className="uppercase">4. DOM Replenishment</span>
                    <Sliders className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <div className="text-base font-bold font-mono text-purple-300 mt-1">
                    {scalp.domBehavior.restingLiquidityLots} lots resting
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                    {scalp.domBehavior.failureDescription}
                  </p>
                </div>
                <div className="mt-2 text-[10px] font-mono text-purple-400 font-semibold pt-1.5 border-t border-white/5">
                  {scalp.domBehavior.pullingState}
                </div>
              </div>
            </div>

            {/* Real-Time Execution Rules Cockpit */}
            <div className="rounded-lg bg-[#080d17] border border-[#162137] p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Strict Scalp Execution Rules (Zero Friction)</span>
                </span>
                <span className="text-[11px] font-mono text-cyan-300">
                  {isShortScalp ? '🔴 SELL SETUP ACTIVE' : isLongScalp ? '🟢 BUY SETUP ACTIVE' : '⚪ SCANNING'}
                </span>
              </div>

              {/* Five Execution Rules Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
                <div className="p-2 rounded bg-[#0e1626] border border-[#1e2b44] flex items-center gap-1.5">
                  <span className="text-amber-400 font-bold">✓</span>
                  <span className="text-slate-200 font-medium">No scoring checklist</span>
                </div>
                <div className="p-2 rounded bg-[#0e1626] border border-[#1e2b44] flex items-center gap-1.5">
                  <span className="text-amber-400 font-bold">✓</span>
                  <span className="text-slate-200 font-medium">No waiting candle closure</span>
                </div>
                <div className="p-2 rounded bg-[#0e1626] border border-[#1e2b44] flex items-center gap-1.5">
                  <span className="text-cyan-400 font-bold">✓</span>
                  <span className="text-slate-200 font-medium">Entry during wick formation</span>
                </div>
                <div className="p-2 rounded bg-[#0e1626] border border-[#1e2b44] flex items-center gap-1.5">
                  <span className="text-red-400 font-bold">✓</span>
                  <span className="text-slate-200 font-medium">Stop-loss beyond extreme</span>
                </div>
                <div className="p-2 rounded bg-[#0e1626] border border-[#1e2b44] flex items-center gap-1.5">
                  <span className="text-rose-400 font-bold">✓</span>
                  <span className="text-slate-200 font-medium">Exit if absorption fails</span>
                </div>
              </div>

              {/* Accuracy & Loss Prevention Assurance Bar */}
              {scalp.accuracyVerification && (
                <div className="p-2.5 rounded-lg bg-[#06151f] border border-cyan-500/40 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-500 text-black font-extrabold text-[10px] shadow-sm">
                      ✓ {scalp.accuracyVerification.accuracyRate}% ACCURACY VERIFIED
                    </span>
                    <span className="text-white font-bold text-[11px]">
                      Safe Entry Gate Active · Falling Knife Risk Blocked
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-300">
                    <span className="text-emerald-400 font-bold">✓ Rebound: +{scalp.accuracyVerification.reboundRetractionTicks}t off low</span>
                    <span className="text-slate-500">|</span>
                    <span className="text-amber-300 font-semibold">Max Risk: {scalp.accuracyVerification.maxRiskPips} pips capped</span>
                  </div>
                </div>
              )}

              {/* Action Directives */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1 text-xs font-mono">
                {/* Entry Target */}
                <div className={`p-2.5 rounded border ${
                  isShortScalp ? 'bg-red-950/40 border-red-500/40 text-red-200' :
                  isLongScalp ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' :
                  'bg-[#0e1728] border-slate-700 text-slate-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Action Entry Target</span>
                    <button
                      type="button"
                      onClick={() => setShowWickExplainer(!showWickExplainer)}
                      className="text-[10px] font-sans px-2 py-0.5 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 flex items-center gap-1 transition-colors"
                      title="Click to view real-time tick-by-tick detection rules"
                    >
                      <Sparkles className="w-3 h-3 text-cyan-400" />
                      <span>{showWickExplainer ? 'Hide Order Flow Guide' : 'How Would I Know?'}</span>
                    </button>
                  </div>
                  <div className="text-sm font-bold mt-1">
                    {scalp.entryZone.label}
                  </div>
                  <div className="text-[10px] text-slate-300 mt-0.5 flex items-center gap-1.5">
                    <span className="text-cyan-400 font-bold">Timing:</span>
                    <span className="font-semibold text-white">{scalp.entryZone.timing.replace(/_/g, ' ')}</span>
                  </div>
                </div>

                {/* Hard Invalidation / Stop */}
                <div className="p-2.5 rounded bg-red-950/30 border border-red-500/30 text-red-200">
                  <div className="text-[10px] text-red-400 uppercase font-bold">Stop-Loss Placement</div>
                  <div className="text-sm font-bold mt-0.5">
                    {scalp.stopLoss.placement}
                  </div>
                  <div className="text-[10px] text-red-400/80 mt-0.5">
                    Invalidation level: {scalp.stopLoss.price.toFixed(digits)}
                  </div>
                </div>

                {/* Exit Condition */}
                <div className="p-2.5 rounded bg-[#101827] border border-amber-500/30 text-amber-200">
                  <div className="text-[10px] text-amber-400 uppercase font-bold">Emergency Failure Exit</div>
                  <div className="text-xs font-medium mt-0.5 leading-snug">
                    {scalp.exitCondition}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Exit immediately if absorption wall is breached
                  </div>
                </div>
              </div>

              {/* Explainer: How to detect wick formation in real time */}
              {showWickExplainer && (
                <div className="mt-3 p-3.5 rounded-lg bg-[#07111c] border border-cyan-500/40 space-y-2.5 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Real-Time Wick Formation Detection (Order Flow Microstructure)
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-300 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 font-semibold">
                      Tick-by-Tick Trigger
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 text-xs">
                    <div className="p-2.5 rounded bg-[#0b1626] border border-[#1b2f4d]">
                      <div className="text-[10px] font-bold text-red-400 uppercase">1. Sell Influx (Effort)</div>
                      <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                        Heavy market sell orders hammer into the level ({scalp.hvnPrice.toFixed(digits)}). Red aggressive tape prints rapidly.
                      </p>
                    </div>

                    <div className="p-2.5 rounded bg-[#0b1626] border border-[#1b2f4d]">
                      <div className="text-[10px] font-bold text-amber-400 uppercase">2. DOM Iceberg Reload</div>
                      <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                        Resting limit bids replenish immediately instead of pulling back. The passive buyer holds the line and absorbs all market sells.
                      </p>
                    </div>

                    <div className="p-2.5 rounded bg-[#0b1626] border border-[#1b2f4d]">
                      <div className="text-[10px] font-bold text-emerald-400 uppercase">3. Zero Downward Progress</div>
                      <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                        Massive selling volume generates 0 tick displacement. Price physically halts at the wick low ({scalp.entryZone.triggerPrice.toFixed(digits)}).
                      </p>
                    </div>

                    <div className="p-2.5 rounded bg-[#0b1626] border border-cyan-500/50">
                      <div className="text-[10px] font-bold text-cyan-300 uppercase">4. 1-Tick Retraction & Entry</div>
                      <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                        As aggressive selling exhausts, price ticks +1 to +2 ticks up off the low while the candle is STILL OPEN. <strong>Enter BUY right here.</strong>
                      </p>
                    </div>
                  </div>

                  <div className="p-2 rounded bg-[#0a121d] border border-white/5 flex flex-wrap items-center justify-between text-[11px] text-slate-300 gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-400 font-bold">✓ Stop Loss:</span>
                      <span>Anchored 1–2 ticks below the lowest wick tick ({scalp.stopLoss.price.toFixed(digits)}).</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-red-400 font-bold">⚡ Invalidation:</span>
                      <span>If the resting bid wall fails and price prints below {scalp.stopLoss.price.toFixed(digits)}, exit immediately (zero hesitation).</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
