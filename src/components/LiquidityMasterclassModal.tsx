import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Flame,
  Activity,
  Layers,
  ShieldAlert,
  Sparkles,
  Zap,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Sliders,
  Eye,
  Radio,
  Clock,
  BarChart3,
  Crosshair,
  Volume2,
  Target
} from 'lucide-react';
import { PALETTES } from './LiquidityHeatmapVisualizer';
import { tradingVoice } from '../services/tradingVoiceService';

interface LiquidityMasterclassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyDeepTone?: () => void;
}

export const LiquidityMasterclassModal: React.FC<LiquidityMasterclassModalProps> = ({
  isOpen,
  onClose,
  onApplyDeepTone,
}) => {
  const [activeTab, setActiveTab] = useState<
    'core_dynamics' | 'heatmaps_vs_orderbook' | 'patterns_playbook' | 'deep_tone' | 'news_context'
  >('core_dynamics');

  const [activePattern, setActivePattern] = useState<'reloads' | 'icebergs' | 'sweeps' | 'flips' | 'least_resistance' | 'spoofing'>('icebergs');

  if (!isOpen) return null;

  const handleSpeakSummary = () => {
    tradingVoice.unlockAudio();
    tradingVoice.speak(
      `Liquidity is the true foundation of market movement across all asset classes. Aggressive market orders demand speed and pay the spread, while passive limit orders provide depth and price certainty. Price moves when aggressive flow consumes available passive depth. Advanced liquidity heat maps reveal institutional icebergs, bid reloads, book sweeps, and the path of least resistance.`,
      { priority: true, force: true, category: 'BRIEFING' }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-[#090d16] border border-cyan-500/40 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-200">
        
        {/* Header Strip */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-[#16233a] bg-gradient-to-r from-[#0c1322] via-[#0e182b] to-[#121f36]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-amber-500 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-950/60">
              <div className="w-full h-full bg-[#090d16] rounded-[10px] flex items-center justify-center">
                <Flame className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  Masterclass: Market Liquidity, Heat Maps & Order Flow
                </h2>
                <span className="hidden sm:inline-flex text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  NASDAQ Scalper & Tournament Playbook
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Demystifying aggressive vs passive flow, institutional icebergs, book sweeps, and execution certainty
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSpeakSummary}
              className="px-2.5 py-1 text-xs font-mono font-bold rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Listen to masterclass audio summary"
            >
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Listen Summary</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#192742] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-[#142035] bg-[#070b13] px-3 sm:px-6 py-2 shrink-0 scrollbar-none text-xs font-mono">
          <button
            onClick={() => setActiveTab('core_dynamics')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all shrink-0 cursor-pointer ${
              activeTab === 'core_dynamics'
                ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-950/80'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#121c2e]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>1. Liquidity Pulse & Microstructure</span>
          </button>

          <button
            onClick={() => setActiveTab('heatmaps_vs_orderbook')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all shrink-0 cursor-pointer ${
              activeTab === 'heatmaps_vs_orderbook'
                ? 'bg-amber-500 text-black font-bold shadow-md shadow-amber-950/80'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#121c2e]'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>2. Heat Maps vs Order Books</span>
          </button>

          <button
            onClick={() => setActiveTab('patterns_playbook')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all shrink-0 cursor-pointer ${
              activeTab === 'patterns_playbook'
                ? 'bg-emerald-500 text-black font-bold shadow-md shadow-emerald-950/80'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#121c2e]'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>3. Order Flow Patterns Playbook</span>
          </button>

          <button
            onClick={() => setActiveTab('deep_tone')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all shrink-0 cursor-pointer ${
              activeTab === 'deep_tone'
                ? 'bg-purple-500 text-black font-bold shadow-md shadow-purple-950/80'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#121c2e]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>4. Scalper Heat Map Tuning (Deep Tone)</span>
          </button>

          <button
            onClick={() => setActiveTab('news_context')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all shrink-0 cursor-pointer ${
              activeTab === 'news_context'
                ? 'bg-blue-500 text-black font-bold shadow-md shadow-blue-950/80'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#121c2e]'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>5. Higher Timeframes & Macro Shocks</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs text-slate-300">
          
          {/* TAB 1: CORE LIQUIDITY PULSE & MICROSTRUCTURE */}
          {activeTab === 'core_dynamics' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Highlight Hero Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-[#0d1627] to-[#131f38] border border-cyan-500/30">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 shrink-0">
                    <Zap className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">
                      Liquidity is the Pulse of Every Market Move
                    </h3>
                    <p className="text-slate-300 leading-relaxed">
                      Every single tick on the chart—whether in NASDAQ futures, Gold, Forex, or Bitcoin—results from one fundamental transaction: 
                      <strong> an aggressive market order meeting a passive resting limit order</strong>. 
                      Classical technical analysis relies on guessing liquidity zones through arbitrary trendlines or chart patterns. Order flow analysis eliminates the guesswork by directly revealing who is demanding immediate execution and where limit liquidity is absorbing the move.
                    </p>
                  </div>
                </div>
              </div>

              {/* Aggressive vs Passive Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Takers / Aggressive */}
                <div className="p-4 rounded-xl bg-[#0b101c] border border-red-500/30 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-red-900/40">
                    <span className="font-bold text-red-400 text-sm flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-red-400" />
                      Market Takers (Aggressive Orders)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-950 text-red-300 border border-red-800/40">
                      Execution Certainty
                    </span>
                  </div>
                  <ul className="space-y-2 text-slate-300 leading-relaxed">
                    <li className="flex items-start gap-1.5">
                      <span className="text-red-400 font-bold shrink-0 mt-0.5">•</span>
                      <span><strong>Demand Immediate Execution:</strong> Market buy and market sell orders demand instant fills right now.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-red-400 font-bold shrink-0 mt-0.5">•</span>
                      <span><strong>Price Uncertainty:</strong> Takers cross the bid-ask spread and take whatever price is available in the order book.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-red-400 font-bold shrink-0 mt-0.5">•</span>
                      <span><strong>Drivers of Price Movement:</strong> When aggressive buyers buy more contracts than resting sell limits at the best Ask, the price is forced to step upward to the next level.</span>
                    </li>
                  </ul>
                </div>

                {/* Makers / Passive */}
                <div className="p-4 rounded-xl bg-[#0b101c] border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-900/40">
                    <span className="font-bold text-emerald-400 text-sm flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-emerald-400" />
                      Market Makers (Passive Liquidity)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                      Price Certainty
                    </span>
                  </div>
                  <ul className="space-y-2 text-slate-300 leading-relaxed">
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-400 font-bold shrink-0 mt-0.5">•</span>
                      <span><strong>Wait to be Filled:</strong> Resting limit orders (Limit Buy at bids, Limit Sell at asks) sitting on the exchange order book.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-400 font-bold shrink-0 mt-0.5">•</span>
                      <span><strong>Execution Uncertainty:</strong> They dictate the exact price they want, but risk never being filled if price turns around.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-400 font-bold shrink-0 mt-0.5">•</span>
                      <span><strong>Absorbers & Barriers:</strong> Dense clusters of passive orders act like brick walls or gravitational magnets. If passive depth is thick, price cannot pass without immense aggressive volume.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Order Book Microstructure Dynamics Diagram */}
              <div className="p-4 rounded-xl bg-[#0a0f1d] border border-[#1a263d] space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  <span>How Price Actually Steps Through the Book (Microstructure Stepping)</span>
                </h4>
                <div className="p-3 rounded-lg bg-[#070b14] border border-[#141e30] font-mono text-[11px] space-y-2">
                  <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-white/5">
                    <span>Ask Level 3 (20492.00)</span>
                    <span className="text-amber-400 font-bold">140 Resting Sell Limits</span>
                    <span className="text-slate-500">Unreached</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300 pb-1 border-b border-white/5">
                    <span>Ask Level 2 (20491.50)</span>
                    <span className="text-amber-400 font-bold">85 Resting Sell Limits</span>
                    <span className="text-cyan-400">Next Target if Level 1 clears</span>
                  </div>
                  <div className="flex items-center justify-between text-white bg-red-950/40 p-1.5 rounded border border-red-500/30">
                    <span className="font-bold text-red-300">Best Ask (20491.00)</span>
                    <span className="text-red-400 font-bold">25 Resting Sell Limits</span>
                    <span className="text-emerald-400 font-bold animate-pulse">← Aggressive Market Buy (50 lots) hits</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400 pt-1">
                    <span>Result</span>
                    <span className="text-emerald-300 col-span-2">
                      25 lots filled at 20491.00; remaining 25 lots consume 20491.50 → <strong>Price jumps +0.50 pts instantly!</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HEAT MAPS VS TRADITIONAL ORDER BOOKS */}
          {activeTab === 'heatmaps_vs_orderbook' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-gradient-to-r from-[#0d1627] to-[#1b1c3d] border border-amber-500/30">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 shrink-0">
                    <Flame className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">
                      Why Heat Maps Advance Beyond Static DOM / Level 2
                    </h3>
                    <p className="text-slate-300 leading-relaxed">
                      Traditional Level 2 order books provide only an instantaneous snapshot of the current moment. 
                      They give zero historical context: <em>Was this 300-contract limit wall placed 2 seconds ago, or has it anchored this level for 45 minutes? Did buyers lift offers repeatedly into this wall with zero progress?</em>
                      A liquidity heat map aggregates depth over time, painting historical thickness that reveals true institutional intent versus transient noise.
                    </p>
                  </div>
                </div>
              </div>

              {/* Comparison Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#090e18] border border-slate-700 space-y-2.5">
                  <span className="font-bold text-slate-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400" />
                    Standard Level 2 / DOM Order Book
                  </span>
                  <ul className="space-y-1.5 text-slate-400">
                    <li>✕ No memory of how long liquidity has rested at price.</li>
                    <li>✕ Cannot differentiate genuine reloading from cancelled orders.</li>
                    <li>✕ Flashing numbers create cognitive overload and eye fatigue.</li>
                    <li>✕ High risk of being baited by spoofing and phantom orders.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-[#09121a] border border-cyan-500/40 space-y-2.5">
                  <span className="font-bold text-cyan-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    Advanced Liquidity Heat Map (Bookmap / Deep Tone)
                  </span>
                  <ul className="space-y-1.5 text-slate-200">
                    <li>✓ Continuous historical timeline of resting liquidity clusters.</li>
                    <li>✓ Clearly highlights where institutional absorption halted moves.</li>
                    <li>✓ Visualizes swept zones where stops were harvested.</li>
                    <li>✓ Color intensity corresponds directly to order thickness.</li>
                  </ul>
                </div>
              </div>

              {/* Gravitational Magnet vs Brick Wall Concept */}
              <div className="p-4 rounded-xl bg-[#0c1424] border border-[#1d2d48] space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Target className="w-4 h-4 text-amber-400" />
                  <span>The Two Faces of Liquidity: Gravitational Magnets vs Structural Brick Walls</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-300">
                  <div className="p-3 rounded-lg bg-[#070c16] border border-white/5 space-y-1.5">
                    <strong className="text-amber-300 text-xs">1. The Gravitational Magnet Effect:</strong>
                    <p className="text-[11px] leading-relaxed">
                      Markets seek liquidity like water flows downhill. When a large pool of stop losses or resting limit orders sits within striking distance (e.g., above recent equal highs), the market accelerates toward it because it provides the transactional volume institutions need to fill size.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#070c16] border border-white/5 space-y-1.5">
                    <strong className="text-cyan-300 text-xs">2. The Brick Wall & Absorption Effect:</strong>
                    <p className="text-[11px] leading-relaxed">
                      Once price hits the thick liquidity zone, if passive limit orders reload faster than aggressive market orders can consume them, the wall absorbs the entire move. Counterparties exhaust their capital, resulting in a violent rejection back inside value.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ORDER FLOW PATTERNS PLAYBOOK */}
          {activeTab === 'patterns_playbook' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-3 rounded-xl bg-[#0c1424] border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white text-xs uppercase tracking-wider">
                    Select Scalper Pattern Breakdown:
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                  {(
                    [
                      { id: 'icebergs', label: '🧊 Iceberg Orders' },
                      { id: 'reloads', label: '⚡ Bid / Ask Reloads' },
                      { id: 'sweeps', label: '🌊 Book Sweeps' },
                      { id: 'flips', label: '🔄 Book Flips' },
                      { id: 'least_resistance', label: '🧭 Path of Least Resistance' },
                      { id: 'spoofing', label: '⚠️ Spoof Detection' },
                    ] as const
                  ).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setActivePattern(p.id)}
                      className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                        activePattern === p.id
                          ? 'bg-emerald-500 text-black font-bold'
                          : 'bg-[#111c2e] text-slate-300 hover:bg-[#18263e]'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Pattern Detail Cards */}
              {activePattern === 'icebergs' && (
                <div className="p-4 rounded-xl bg-[#08121a] border border-cyan-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                      <span>🧊 Iceberg Orders & Fractional Execution</span>
                    </h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-700/40">
                      Institutional Stealth Accumulation
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Institutions trading 1,000+ contracts cannot show their full size on the visible book—doing so would trigger front-running and drive price away from them. 
                    Instead, they utilize <strong>algorithmic iceberg orders</strong> that display only a fractional tranche (e.g., 20 contracts) at a time. As soon as the 20 contracts are hit by aggressive market sellers, the algorithm instantly reloads another 20 contracts at the exact same price.
                  </p>
                  <div className="p-3 rounded-lg bg-[#040810] border border-cyan-500/20 font-mono text-[11px] space-y-1 text-slate-300">
                    <p className="text-amber-300 font-bold">🎯 The Scalper's Edge:</p>
                    <p>
                      On the heat map, an iceberg looks like a continuous bright horizontal band that absorbs large footprint volume bubbles without budging. When you spot an iceberg holding support, <strong>place your limit entry right in front of it</strong> with your stop loss protected just 1–2 ticks behind the iceberg wall.
                    </p>
                  </div>
                </div>
              )}

              {activePattern === 'reloads' && (
                <div className="p-4 rounded-xl bg-[#09151c] border border-amber-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                      <span>⚡ Bid & Ask Reloads (Active Defense)</span>
                    </h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-700/40">
                      Passive Order Replenishment
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    A Bid Reload occurs when a dominant buyer continuously replenishes the bid side of the order book as aggressive market sellers hit it. 
                    Unlike a single large limit order that gets consumed and disappears, a reloading level absorbs multiple waves of market orders.
                  </p>
                  <div className="p-3 rounded-lg bg-[#040810] border border-amber-500/20 font-mono text-[11px] space-y-1 text-slate-300">
                    <p className="text-amber-300 font-bold">🎯 The Scalper's Edge:</p>
                    <p>
                      If sellers hit a bid level with 500 lots of cumulative negative delta and price refuses to drop, sellers are trapped. Once seller momentum dries up, the market violently squeezes upward as exhausted sellers cover.
                    </p>
                  </div>
                </div>
              )}

              {activePattern === 'sweeps' && (
                <div className="p-4 rounded-xl bg-[#140b17] border border-purple-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-purple-300 flex items-center gap-2">
                      <span>🌊 Book Sweeps (Liquidity Ingestion & Stop Hunts)</span>
                    </h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-700/40">
                      Thin Depth Velocity Ignition
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    A Book Sweep happens when a large aggressive market order or cascade of stop triggers clears out multiple consecutive price levels in milliseconds. 
                    This creates the classic tall wick or momentum ignition candle on the chart.
                  </p>
                  <div className="p-3 rounded-lg bg-[#040810] border border-purple-500/20 font-mono text-[11px] space-y-1 text-slate-300">
                    <p className="text-purple-300 font-bold">🎯 The Scalper's Edge:</p>
                    <p>
                      Never chase the tail end of a sweep! A sweep exhausts immediate market orders into resting limit walls. The high-probability trade is waiting for the sweep to finish, watching for passive absorption, and entering the <strong>mean-reversion reclaim</strong> back toward the Point of Control.
                    </p>
                  </div>
                </div>
              )}

              {activePattern === 'flips' && (
                <div className="p-4 rounded-xl bg-[#0b1613] border border-emerald-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                      <span>🔄 Book Flips (Support / Resistance Polarity Reversal)</span>
                    </h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/40">
                      Auction Acceptance Shift
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    A Book Flip occurs when a long-standing resistance wall (heavy resting Ask liquidity) is finally consumed by aggressive buyers, and immediately <strong>new dense Bid limit orders reload behind price at that exact same price level</strong>.
                  </p>
                  <div className="p-3 rounded-lg bg-[#040810] border border-emerald-500/20 font-mono text-[11px] space-y-1 text-slate-300">
                    <p className="text-emerald-300 font-bold">🎯 The Scalper's Edge:</p>
                    <p>
                      This confirms value acceptance. What was previously an overhead ceiling is now a fortified wholesale floor. Enter long as price retests the flipped level with a razor-sharp stop behind the new bid wall.
                    </p>
                  </div>
                </div>
              )}

              {activePattern === 'least_resistance' && (
                <div className="p-4 rounded-xl bg-[#0c1424] border border-blue-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-blue-300 flex items-center gap-2">
                      <span>🧭 Path of Least Resistance (Depth Imbalance Ratio)</span>
                    </h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-700/40">
                      Asymmetric Depth Physics
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Price moves easiest where resistance is thinnest. By comparing total resting passive depth within 20–40 ticks above current price (Asks) versus below current price (Bids), traders calculate the <strong>effort-to-reward ratio of price displacement</strong>.
                  </p>
                  <div className="p-3 rounded-lg bg-[#040810] border border-blue-500/20 font-mono text-[11px] space-y-1 text-slate-300">
                    <p className="text-blue-300 font-bold">🎯 Quantitative Rule:</p>
                    <p>
                      If total resting Ask liquidity is 250 lots but Bid cushion is 1,200 lots, moving downward requires 4.8× more aggressive capital. The path of least resistance is UPWARD through the thin Ask vacuum.
                    </p>
                  </div>
                </div>
              )}

              {activePattern === 'spoofing' && (
                <div className="p-4 rounded-xl bg-[#1c0f0d] border border-red-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-red-300 flex items-center gap-2">
                      <span>⚠️ Spoof Detection (Phantom Walls vs Genuine Liquidity)</span>
                    </h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-950 text-red-300 border border-red-700/40">
                      Manipulative Order Flashing
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Spoofing is an illegal yet common manipulation where algorithms flash massive limit orders (e.g., 500 contracts) to intimidate retail traders into selling or buying, only to <strong>cancel the order microseconds before price reaches it</strong>.
                  </p>
                  <div className="p-3 rounded-lg bg-[#040810] border border-red-500/20 font-mono text-[11px] space-y-1 text-slate-300">
                    <p className="text-red-300 font-bold">🎯 How Heat Maps Reveal Spoofs:</p>
                    <p>
                      On a standard DOM, you see a scary 500-lot wall. On a liquidity heat map, if you observe the bright line suddenly vanish into thin air as price approaches without any executed footprint bubble, it was a spoof. <strong>Do not trade in the direction of pulled liquidity!</strong>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DEEP TONE HEAT MAP TUNING */}
          {activeTab === 'deep_tone' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-gradient-to-r from-[#0d1627] to-[#20102b] border border-purple-500/30">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300 shrink-0">
                    <Sliders className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">
                      Platform Customization: The "Deep Tone" Scalper Configuration
                    </h3>
                    <p className="text-slate-300 leading-relaxed">
                      Professional tournament traders and high-intensity scalpers look at the screen for 6 to 8 hours daily. 
                      Standard rainbow palettes cause severe eye fatigue and visual noise from tiny retail micro-orders. 
                      The <strong>Deep Tone</strong> scheme utilizes ultra-dark charcoal backgrounds, muted steel teals for normal depth, and reserves electric amber and crimson strictly for massive institutional resting walls.
                    </p>
                  </div>
                </div>
              </div>

              {/* Palette Demo Strip */}
              <div className="p-4 rounded-xl bg-[#090d16] border border-[#1b263d] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">Deep Tone Visual Gradient Preview</span>
                  {onApplyDeepTone && (
                    <button
                      onClick={() => {
                        onApplyDeepTone();
                        onClose();
                      }}
                      className="px-3 py-1 rounded text-xs font-mono font-bold bg-gradient-to-r from-purple-500 to-amber-500 text-black hover:brightness-110 transition-all cursor-pointer shadow-md"
                    >
                      ⚡ Apply Deep Tone to Heat Map Now
                    </button>
                  )}
                </div>
                <div
                  className="w-full h-8 rounded-lg shadow-inner border border-white/10"
                  style={{ background: PALETTES.deep_tone.getCssGradient() }}
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>0% (Charcoal: Zero Eye Strain)</span>
                  <span>40% (Steel Teal: Normal Depth)</span>
                  <span>75% (Amber: Significant Wall)</span>
                  <span>100% (Crimson: Institutional Iceberg)</span>
                </div>
              </div>

              {/* Scalper Settings Checklist */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-[#070b14] border border-cyan-500/20 space-y-1">
                  <strong className="text-cyan-300 text-xs">1. Contrast Multiplier (1.3x)</strong>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Darkens low-volume background noise and amplifies high-density clusters so only actionable levels stand out.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-[#070b14] border border-amber-500/20 space-y-1">
                  <strong className="text-amber-300 text-xs">2. High-Density Filter</strong>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Hides sub-50 lot micro-noise, exposing clean structural liquidity pools and iceberg reloads.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-[#070b14] border border-emerald-500/20 space-y-1">
                  <strong className="text-emerald-300 text-xs">3. Swept Zone Outlines</strong>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Renders dashed bounding boxes over freshly harvested stop clusters to immediately flag exhaustion reclaims.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: HIGHER TIMEFRAMES & MACRO SHOCKS */}
          {activeTab === 'news_context' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-gradient-to-r from-[#0d1627] to-[#12233b] border border-blue-500/30">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20 text-blue-300 shrink-0">
                    <Compass className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">
                      Harmonizing Microstructure with Higher Timeframes & News Shocks
                    </h3>
                    <p className="text-slate-300 leading-relaxed">
                      Microstructure alone without macro context is like driving with high beams in the fog. 
                      Order flow dictates <em>where to enter with tick precision</em>, while higher-timeframe volume profile (VAH, VAL, Point of Control) provides <em>directional bias and targets</em>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Geopolitical News Dynamics */}
              <div className="p-4 rounded-xl bg-[#090f1d] border border-[#1b2a47] space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Radio className="w-4 h-4 text-cyan-400" />
                  <span>Geopolitical News & Volatility Shocks: How Liquidity Acts</span>
                </h4>
                <div className="space-y-2 text-slate-300 leading-relaxed">
                  <p>
                    During unexpected breaking news (interest rate decisions, CPI prints, geopolitical announcements), market makers immediately widen their spreads or pull passive liquidity from the book entirely.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 rounded-lg bg-[#060b16] border border-red-500/20">
                      <strong className="text-red-300 text-xs">The Vacuum Phase:</strong>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Lack of opposing limit orders creates a liquidity vacuum where small market orders cause enormous 50-tick candle spikes. Do not enter during this phase!
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-[#060b16] border border-emerald-500/20">
                      <strong className="text-emerald-300 text-xs">The Absorption & Reload Phase:</strong>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Once price hits a major macro support/resistance level, massive institutional bids reload on the heat map. This signals the storm has settled and provides the highest R:R sniper entry of the day.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-[#16233a] bg-[#070b13] text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Masterclass Grounded in NASDAQ Microstructure & Tournament Scalper Rules</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#142036] hover:bg-[#1a2b4a] text-slate-200 border border-[#213252] transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
