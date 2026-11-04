import React, { useState } from 'react';
import { 
  Activity, 
  X, 
  Radio, 
  RefreshCw, 
  Database, 
  TrendingUp, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownRight, 
  Cpu, 
  ExternalLink,
  Layers,
  Zap,
  Clock
} from 'lucide-react';
import { DukascopyTick, SystemStatus } from '../services/marketDataService';
import { Candle } from '../types/orderbook';

interface LiveDataInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSymbol: string;
  livePrice: number;
  digits: number;
  candles: Candle[];
  ticks: DukascopyTick[];
  totalTicksCount: number;
  systemStatus: SystemStatus | null;
  isStreaming: boolean;
  onRefreshTicks: () => void;
  isRefreshing: boolean;
  sourceTradingView: string;
  sourceDukascopy: string;
}

export const LiveDataInspectorModal: React.FC<LiveDataInspectorModalProps> = ({
  isOpen,
  onClose,
  currentSymbol,
  livePrice,
  digits,
  candles,
  ticks,
  totalTicksCount,
  systemStatus,
  isStreaming,
  onRefreshTicks,
  isRefreshing,
  sourceTradingView,
  sourceDukascopy,
}) => {
  const [activeTab, setActiveTab] = useState<'ticks' | 'candles' | 'status'>('ticks');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-4xl max-h-[92vh] sm:max-h-[88vh] bg-[#0c1017] border border-[#1c2438] rounded-xl flex flex-col shadow-2xl overflow-hidden font-sans">
        
        {/* Header */}
        <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-[#1c2438] flex flex-wrap items-center justify-between gap-2 bg-[#0e1420]">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Activity className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">Real-Time Data Feeds & Tick Engine</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  LIVE FEEDS CONNECTED
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Powered by <strong className="text-cyan-300">SMARTFX AUTOMATION</strong> Institutional Market WebSocket & High-Precision Tick Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onRefreshTicks}
              disabled={isRefreshing}
              className="px-2.5 py-1.5 rounded text-xs font-mono font-medium bg-[#141b2b] hover:bg-[#1a2338] text-slate-300 hover:text-white border border-[#222e47] flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Fetch latest tick chunk from ECN feed"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Ticks</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-[#1c2438] text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* API Badges Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 p-3 sm:p-4 bg-[#0a0d14] border-b border-[#161e2f] text-xs">
          {/* Real-Time Market Feed Card */}
          <div className="p-3 rounded-lg bg-[#0e1422] border border-[#1e2a42] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse" />
              <div>
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span>SMARTFX Institutional Feed</span>
                  <span className="text-[10px] text-cyan-400 font-mono font-semibold">(Direct ECN)</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Market: <span className="text-cyan-300">{sourceTradingView}</span> • M5 Continuous Feed
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-mono font-bold text-cyan-400 tabular-nums">
                {livePrice.toFixed(digits)}
              </div>
              <div className="text-[10px] text-emerald-400 flex items-center gap-1 justify-end">
                <CheckCircle2 className="w-3 h-3" />
                <span>WebSocket Live</span>
              </div>
            </div>
          </div>

          {/* High-Precision Tick Engine Card */}
          <div className="p-3 rounded-lg bg-[#0e1422] border border-[#1e2a42] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
              <div>
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span>SMARTFX Tick Data Engine</span>
                  <span className="text-[10px] text-amber-400 font-mono font-semibold">(Proprietary Microstructure)</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Instrument: <span className="text-amber-300">{sourceDukascopy}</span> • Microsecond Precision
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-mono font-bold text-amber-300 tabular-nums">
                {totalTicksCount.toLocaleString()} ticks
              </div>
              <div className="text-[10px] text-slate-400">
                Bid/Ask/Volume Stream
              </div>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="px-3 sm:px-5 pt-3 pb-2 border-b border-[#1c2438] bg-[#0c1017] flex items-center gap-2 overflow-x-auto scrollbar-none whitespace-nowrap touch-pan-x">
          <button
            onClick={() => setActiveTab('ticks')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'ticks'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Dukascopy Real Ticks ({ticks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('candles')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'candles'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>TradingView 5m Candles ({candles.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('status')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'status'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>System Pipeline & Sockets</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#0a0d14]">
          {activeTab === 'ticks' && (
            <div>
              <div className="flex items-center justify-between mb-2 text-xs text-slate-400 font-mono">
                <span>Showing latest real market executions from Dukascopy:</span>
                <span>Active Instrument: <strong className="text-white">{currentSymbol}</strong></span>
              </div>

              <div className="overflow-x-auto rounded border border-[#1a2338]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#121929] text-slate-300 border-b border-[#1e2a42]">
                    <tr>
                      <th className="py-2 px-3">Time</th>
                      <th className="py-2 px-3 text-right">Bid Price</th>
                      <th className="py-2 px-3 text-right">Ask Price</th>
                      <th className="py-2 px-3 text-right">Spread</th>
                      <th className="py-2 px-3 text-right">Bid Vol</th>
                      <th className="py-2 px-3 text-right">Ask Vol</th>
                      <th className="py-2 px-3 text-center">Imbalance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#121826]">
                    {ticks.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          Fetching real Dukascopy ticks...
                        </td>
                      </tr>
                    ) : (
                      ticks.slice(-40).reverse().map((t, idx) => {
                        const date = new Date(t.timestamp);
                        const timeStr = `${date.toLocaleTimeString()}.${date.getMilliseconds().toString().padStart(3, '0')}`;
                        const spread = (t.askPrice - t.bidPrice).toFixed(digits);
                        const delta = (t.askVolume - t.bidVolume);
                        const isBuyerDom = delta > 0;

                        return (
                          <tr key={`${t.timestamp}-${idx}`} className="hover:bg-[#0f172a] transition-colors">
                            <td className="py-1.5 px-3 text-slate-400">{timeStr}</td>
                            <td className="py-1.5 px-3 text-right text-emerald-400 font-semibold tabular-nums">
                              {t.bidPrice.toFixed(digits)}
                            </td>
                            <td className="py-1.5 px-3 text-right text-red-400 font-semibold tabular-nums">
                              {t.askPrice.toFixed(digits)}
                            </td>
                            <td className="py-1.5 px-3 text-right text-slate-400 tabular-nums">
                              {spread}
                            </td>
                            <td className="py-1.5 px-3 text-right text-emerald-300 tabular-nums">
                              {t.bidVolume.toFixed(3)}
                            </td>
                            <td className="py-1.5 px-3 text-right text-red-300 tabular-nums">
                              {t.askVolume.toFixed(3)}
                            </td>
                            <td className="py-1.5 px-3 text-center">
                              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] ${
                                isBuyerDom 
                                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30' 
                                  : 'bg-red-950/80 text-red-400 border border-red-500/30'
                              }`}>
                                {isBuyerDom ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                                {isBuyerDom ? 'Ask Aggression' : 'Bid Absorption'}
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

          {activeTab === 'candles' && (
            <div>
              <div className="flex items-center justify-between mb-2 text-xs text-slate-400 font-mono">
                <span>Real-time OHLCV periods streamed from TradingView WebSocket:</span>
                <span>Timeframe: <strong className="text-white">5 Minutes (M5)</strong></span>
              </div>

              <div className="overflow-x-auto rounded border border-[#1a2338]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#121929] text-slate-300 border-b border-[#1e2a42]">
                    <tr>
                      <th className="py-2 px-3">Time</th>
                      <th className="py-2 px-3 text-right">Open</th>
                      <th className="py-2 px-3 text-right">High</th>
                      <th className="py-2 px-3 text-right">Low</th>
                      <th className="py-2 px-3 text-right">Close</th>
                      <th className="py-2 px-3 text-right">Volume</th>
                      <th className="py-2 px-3 text-right">Delta</th>
                      <th className="py-2 px-3 text-right">VWAP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#121826]">
                    {candles.slice(-30).reverse().map((c, idx) => {
                      const isBull = c.close >= c.open;
                      return (
                        <tr key={`${c.timestamp}-${idx}`} className="hover:bg-[#0f172a] transition-colors">
                          <td className="py-1.5 px-3 text-slate-400">{c.timeStr}</td>
                          <td className="py-1.5 px-3 text-right text-slate-300 tabular-nums">{c.open.toFixed(digits)}</td>
                          <td className="py-1.5 px-3 text-right text-emerald-400 tabular-nums">{c.high.toFixed(digits)}</td>
                          <td className="py-1.5 px-3 text-right text-red-400 tabular-nums">{c.low.toFixed(digits)}</td>
                          <td className={`py-1.5 px-3 text-right font-bold tabular-nums ${isBull ? 'text-emerald-400' : 'text-red-400'}`}>
                            {c.close.toFixed(digits)}
                          </td>
                          <td className="py-1.5 px-3 text-right text-amber-300 tabular-nums">{c.volume.toLocaleString()}</td>
                          <td className={`py-1.5 px-3 text-right font-semibold tabular-nums ${c.delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {c.delta >= 0 ? `+${c.delta}` : c.delta}
                          </td>
                          <td className="py-1.5 px-3 text-right text-cyan-300 tabular-nums">{c.vwap.toFixed(digits)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'status' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-[#0e1422] border border-[#1d273d]">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  Dual-Engine Architecture Summary
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  This system combines the two premier institutional market feeds requested:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <div className="p-3 rounded bg-[#090d15] border border-[#162032] text-xs">
                    <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5" />
                      1. SMARTFX High-Frequency Market Stream
                    </div>
                    <p className="text-slate-400 text-[11px] mt-1">
                      Maintains live institutional WebSocket sessions. Feeds uninterrupted tick updates, live candle closes, and current price movements.
                    </p>
                  </div>

                  <div className="p-3 rounded bg-[#090d15] border border-[#162032] text-xs">
                    <div className="font-bold text-amber-300 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5" />
                      2. SMARTFX Microsecond Tick & Order Flow Engine
                    </div>
                    <p className="text-slate-400 text-[11px] mt-1">
                      Direct microsecond bid/ask tick processing. Feeds proprietary microstructure order flow, volume absorption footprints, and sentiment clusters.
                    </p>
                  </div>
                </div>
              </div>

              {systemStatus && (
                <div className="p-4 rounded-lg bg-[#0e1422] border border-[#1d273d]">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Backend Server Health</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
                    <div className="p-2.5 rounded bg-[#0a0e17] border border-[#182133]">
                      <span className="text-[10px] text-slate-500 block">Server Status</span>
                      <span className="text-emerald-400 font-bold">ONLINE (200 OK)</span>
                    </div>
                    <div className="p-2.5 rounded bg-[#0a0e17] border border-[#182133]">
                      <span className="text-[10px] text-slate-500 block">TradingView Sessions</span>
                      <span className="text-cyan-300 font-bold">{systemStatus.tradingView.symbols.length} Active</span>
                    </div>
                    <div className="p-2.5 rounded bg-[#0a0e17] border border-[#182133]">
                      <span className="text-[10px] text-slate-500 block">Dukascopy Cached Instruments</span>
                      <span className="text-amber-300 font-bold">{systemStatus.dukascopy.cachedSymbols.length} Ready</span>
                    </div>
                    <div className="p-2.5 rounded bg-[#0a0e17] border border-[#182133]">
                      <span className="text-[10px] text-slate-500 block">Transport Mode</span>
                      <span className="text-purple-300 font-bold">SSE + REST Proxy</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#1c2438] bg-[#0c1017] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Streaming Real Market Data</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors shadow-sm"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
