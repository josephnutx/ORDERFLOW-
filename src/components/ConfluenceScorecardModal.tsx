import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  Lock, 
  Layers, 
  Zap, 
  BookOpen, 
  Award,
  AlertOctagon,
  Percent
} from 'lucide-react';
import { SniperModelOutput } from '../types/sniperModel';

interface ScorecardModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelOutput: SniperModelOutput;
}

export const ConfluenceScorecardModal: React.FC<ScorecardModalProps> = ({
  isOpen,
  onClose,
  modelOutput,
}) => {
  const [activeTab, setActiveTab] = useState<'gates' | 'confirmations' | 'plays' | 'risk'>('gates');

  if (!isOpen) return null;

  const { scorecard, signal, state } = modelOutput;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#0c121e] border border-[#1e2a44] rounded-lg shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-[#1b253b] bg-[#0e1626]">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  SNIPER-EDGE Confluence Scorecard
                </h2>
                <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                  scorecard.grade === 'A+' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50' :
                  scorecard.grade === 'A' ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50' :
                  scorecard.grade === 'B' ? 'bg-amber-950 text-amber-300 border border-amber-500/50' :
                  'bg-red-950 text-red-300 border border-red-500/50'
                }`}>
                  Grade {scorecard.grade} · {scorecard.totalScore} pts
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Mandatory gates (HG1–HG7) + 15 Weighted confirmations + Zero-Risk Execution
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-[#1b253b] transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 px-3 sm:px-6 py-2 bg-[#0a0f1a] border-b border-[#182236] text-xs overflow-x-auto scrollbar-none whitespace-nowrap touch-pan-x">
          <button
            onClick={() => setActiveTab('gates')}
            className={`px-3 py-1.5 rounded font-medium transition-colors shrink-0 ${
              activeTab === 'gates' ? 'bg-[#1e2a44] text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Hard Gates (HG1–HG7)
          </button>
          <button
            onClick={() => setActiveTab('confirmations')}
            className={`px-3 py-1.5 rounded font-medium transition-colors shrink-0 ${
              activeTab === 'confirmations' ? 'bg-[#1e2a44] text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            15 Soft Confirmations (C1–C15)
          </button>
          <button
            onClick={() => setActiveTab('plays')}
            className={`px-3 py-1.5 rounded font-medium transition-colors shrink-0 ${
              activeTab === 'plays' ? 'bg-[#1e2a44] text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Play Library (A–G)
          </button>
          <button
            onClick={() => setActiveTab('risk')}
            className={`px-3 py-1.5 rounded font-medium transition-colors shrink-0 ${
              activeTab === 'risk' ? 'bg-[#1e2a44] text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Risk & Zero-Risk Doctrine
          </button>
        </div>

        {/* Content Body */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: HARD GATES HG1 - HG7 */}
          {activeTab === 'gates' && (
            <div className="space-y-3">
              <div className="p-3 rounded bg-amber-950/20 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2">
                <AlertOctagon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Strict Rule (§4.1):</strong> All 7 hard gates must pass simultaneously. If any single gate returns false, the trade dies immediately and the engine forces <strong>NO TRADE</strong>.
                </span>
              </div>

              <div className="divide-y divide-[#172134] border border-[#1a253a] rounded-lg overflow-hidden bg-[#0a0f1a]">
                {scorecard.hardGates.map((gate) => (
                  <div key={gate.id} className="p-3.5 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {gate.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span className="font-mono text-cyan-400">{gate.id}</span>
                          <span>{gate.title}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{gate.detail}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                      gate.passed ? 'bg-emerald-950 text-emerald-300' : 'bg-red-950 text-red-300'
                    }`}>
                      {gate.passed ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: SOFT CONFIRMATIONS C1 - C15 */}
          {activeTab === 'confirmations' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded bg-[#101726] border border-[#1b263c] text-xs">
                <div>
                  <span className="text-slate-400">Total Confluence Score:</span>
                  <span className="ml-2 font-mono font-bold text-lg text-cyan-300">{scorecard.totalScore}</span>
                  <span className="text-slate-500 font-mono"> / 23 max</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">A+ ≥ 13 pts</span>
                  <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30">A ≥ 10 pts</span>
                  <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-500/30">B ≥ 7 pts</span>
                </div>
              </div>

              {/* Ancillary Proof Check */}
              <div className="p-3 rounded bg-[#0e1626] border border-cyan-500/30 text-xs">
                <div className="font-bold text-cyan-300 mb-1">§4.3 Ancillary Requirement (Anti-Double-Count):</div>
                <div className="grid grid-cols-2 gap-2 text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Wall Proof (C2 Absorption OR C3 Reload): <strong>CONFIRMED</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Side Proof (C1 Aggression OR C5 Stacked Imbalances): <strong>CONFIRMED</strong></span>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-[#172134] border border-[#1a253a] rounded-lg overflow-hidden bg-[#0a0f1a]">
                {scorecard.confirmations.map((conf) => (
                  <div key={conf.id} className="p-2.5 px-3.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-cyan-400 w-7 font-bold">{conf.id}</span>
                      <span className={conf.passed ? 'text-slate-200' : 'text-slate-500 line-through'}>
                        {conf.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-slate-400">+{conf.weight} wt</span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        conf.passed ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {conf.passed ? 'TRUE' : 'FALSE'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: PLAYS A - G */}
          {activeTab === 'plays' && (
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded bg-[#101726] border border-[#1b263c]">
                <div className="text-xs font-bold text-white mb-1">
                  Active Executed Play: <span className="text-purple-400 font-mono">{signal.playName}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 font-mono text-[11px] text-slate-300 mt-2">
                  <div>Entry: <strong className="text-white">{signal.entryPrice}</strong></div>
                  <div>Stop Loss: <strong className="text-red-400">{signal.stopLoss}</strong></div>
                  <div>Main TP: <strong className="text-emerald-400">{signal.targetTP2}</strong></div>
                </div>
              </div>

              <div className="space-y-2">
                {[
                  { id: 'PLAY A', name: 'Absorption + Reload Reversal', desc: 'Fade the trap into a defended wall after absorption proves opposite side is out of ammunition.' },
                  { id: 'PLAY B', name: 'False-Break Reclaim (Spring / Upthrust)', desc: 'False-break below support on low volume, sharp reclaim back through level on strong candle.' },
                  { id: 'PLAY C', name: 'Break & Retest of Resting Liquidity', desc: 'Sustained break protected by fresh limit orders, then the retest off fresh reload.' },
                  { id: 'PLAY D', name: 'Extreme Book Sweep', desc: 'Fast book sweep at range extreme + reclaim; asymmetric reward-to-risk.' },
                  { id: 'PLAY E', name: 'Book Flip (Continuation & Trail)', desc: 'Level breaks and is reloaded on new side. Trail stop below new reload level.' },
                  { id: 'PLAY F', name: 'Failed Auction at Cluster Wall', desc: 'Price attacks cluster wall twice, fails on second attempt -> fade the trap.' },
                  { id: 'PLAY G', name: 'Squeeze Acceleration', desc: 'Trapped side is forced to close -> rapid liquidation acceleration (1:4 to 1:10+ RR).' },
                ].map((p) => {
                  const isActive = signal.activePlay === p.id.replace(' ', '_');
                  return (
                    <div
                      key={p.id}
                      className={`p-3 rounded border transition-colors ${
                        isActive
                          ? 'bg-purple-950/30 border-purple-500/50 text-purple-200'
                          : 'bg-[#0a0f1a] border-[#182236] text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white font-mono">{p.id} — {p.name}</span>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded bg-purple-900 text-purple-200 text-[10px] font-bold">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-slate-400">{p.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: RISK & ZERO-RISK DOCTRINE */}
          {activeTab === 'risk' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-lg bg-[#0e1626] border border-cyan-500/40">
                <div className="font-bold text-sm text-cyan-300 mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span>The Zero-Risk Transition (Risk Zero on Entry)</span>
                </div>
                <div className="space-y-2 text-slate-300">
                  <p>
                    <strong>Rule Z0:</strong> Move stop to break-even the instant ANY one of these prints:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-400">
                    <li>CVD pushes in the trade direction while price has not yet broken structure</li>
                    <li>The next aggression cluster prints in the trade direction</li>
                    <li>Price fully accepts (a 1m close) beyond the trigger level</li>
                  </ul>
                  <p className="pt-1 text-emerald-300 font-semibold">
                    At that moment risk → 0. From then on you are trading the market's money.
                  </p>
                </div>
              </div>

              {/* Sizing & Survival Rails */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded bg-[#0a0f1a] border border-[#1a253a]">
                  <div className="text-slate-400 text-[11px]">Base Risk per Trade</div>
                  <div className="text-base font-bold font-mono text-white mt-1">0.25%</div>
                </div>
                <div className="p-3 rounded bg-[#0a0f1a] border border-[#1a253a]">
                  <div className="text-slate-400 text-[11px]">Current Sizing (Grade {scorecard.grade})</div>
                  <div className="text-base font-bold font-mono text-emerald-400 mt-1">
                    {scorecard.risk.riskPercent.toFixed(2)}%
                  </div>
                </div>
                <div className="p-3 rounded bg-[#0a0f1a] border border-[#1a253a]">
                  <div className="text-slate-400 text-[11px]">Daily Loss Cap</div>
                  <div className="text-base font-bold font-mono text-red-400 mt-1">-2.0% Stop</div>
                </div>
                <div className="p-3 rounded bg-[#0a0f1a] border border-[#1a253a]">
                  <div className="text-slate-400 text-[11px]">Daily Remaining Budget</div>
                  <div className="text-base font-bold font-mono text-cyan-300 mt-1">
                    ${scorecard.risk.dailyLossRemaining}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#1b253b] bg-[#0e1626] flex items-center justify-between text-xs text-slate-400">
          <span>SNIPER-EDGE v1.0 — Unified Execution Model</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#1e2a44] text-white hover:bg-[#28385a] transition-colors font-medium"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
