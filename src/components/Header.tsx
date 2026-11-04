import React, { useState, useRef, useEffect } from 'react';
import { 
  Activity, 
  BarChart3, 
  Layers, 
  Sliders, 
  BookOpen, 
  Play, 
  Pause, 
  CheckCircle2, 
  AlertOctagon, 
  HelpCircle,
  Eye,
  Flame,
  ChevronDown,
  Target,
  Crosshair,
  Zap,
  Volume2,
  VolumeX,
  Mic,
  Radio,
  Search,
  X,
  Sparkles
} from 'lucide-react';
import { INSTRUMENTS, InstrumentConfig } from '../services/mockDataGenerator';
import { SniperModelOutput, SymbolTargetLifecycle } from '../types/sniperModel';
import { getMarketScheduleStatus } from '../services/marketHoursService';

interface HeaderProps {
  currentSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  activeView: 'combined' | 'sniper' | 'heatmap' | 'infographic' | 'orderbook' | 'pipeline' | 'intelligence';
  setActiveView: (view: 'combined' | 'sniper' | 'heatmap' | 'infographic' | 'orderbook' | 'pipeline' | 'intelligence') => void;
  isStreaming: boolean;
  onToggleStreaming: () => void;
  onOpenSettings: () => void;
  onOpenScorecard: () => void;
  onOpenCrowdGuide: () => void;
  onOpenLiveInspector: () => void;
  modelOutput: SniperModelOutput;
  isLiveConnected?: boolean;
  tickCount?: number;
  isSignalAchieved?: boolean;
  achievedPips?: number;
  isVoiceAlertsEnabled?: boolean;
  onToggleVoiceAlerts?: () => void;
  onOpenVoiceSettings?: () => void;
  onInstantBriefing?: () => void;
  isVoiceSpeaking?: boolean;
  lifecycle?: SymbolTargetLifecycle;
  currentTimeframe?: 'M1' | 'M5' | 'M15' | 'H1' | 'H4';
  onSelectTimeframe?: (tf: 'M1' | 'M5' | 'M15' | 'H1' | 'H4') => void;
  onOpenModelAnalysis?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentSymbol,
  onSelectSymbol,
  activeView,
  setActiveView,
  isStreaming,
  onToggleStreaming,
  onOpenSettings,
  onOpenScorecard,
  onOpenCrowdGuide,
  onOpenLiveInspector,
  modelOutput,
  isLiveConnected = true,
  tickCount = 0,
  isSignalAchieved = false,
  achievedPips = 24,
  isVoiceAlertsEnabled = true,
  onToggleVoiceAlerts,
  onOpenVoiceSettings,
  onInstantBriefing,
  isVoiceSpeaking = false,
  lifecycle,
  currentTimeframe = 'M5',
  onSelectTimeframe,
  onOpenModelAnalysis,
}) => {
  const currentInst: InstrumentConfig = INSTRUMENTS[currentSymbol] || INSTRUMENTS.XAUUSD;
  const marketSchedule = modelOutput.marketSchedule || getMarketScheduleStatus(currentSymbol);
  const isNoTrade = modelOutput.state.isNoTrade;
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Grouped instruments for the selector
  const forexSymbols = Object.keys(INSTRUMENTS).filter((k) => INSTRUMENTS[k].type === 'forex');
  const indexSymbols = Object.keys(INSTRUMENTS).filter((k) => INSTRUMENTS[k].type === 'indices');
  const otherSymbols = Object.keys(INSTRUMENTS).filter((k) => INSTRUMENTS[k].type === 'metals' || INSTRUMENTS[k].type === 'crypto');
  const allSymbols = Object.keys(INSTRUMENTS);

  // Mobile pair navigation filter state
  const [mobileSearch, setMobileSearch] = useState<string>('');
  const [mobileTab, setMobileTab] = useState<'all' | 'forex' | 'indices' | 'metals_crypto'>('all');

  const filteredSymbols = allSymbols.filter((sym) => {
    const inst = INSTRUMENTS[sym];
    if (mobileTab === 'forex' && inst.type !== 'forex') return false;
    if (mobileTab === 'indices' && inst.type !== 'indices') return false;
    if (mobileTab === 'metals_crypto' && inst.type !== 'metals' && inst.type !== 'crypto') return false;
    if (!mobileSearch.trim()) return true;
    const q = mobileSearch.toLowerCase().trim();
    return sym.toLowerCase().includes(q) || inst.name.toLowerCase().includes(q);
  });

  // Quick favorite access buttons with distinct signal indicators
  const quickPills = ['XAUUSD', 'EURUSD', 'NAS100', 'US500', 'GBPUSD', 'BTCUSD'];

  const getQuickSignalInfo = (sym: string) => {
    if (sym === 'USDCAD' && (isSignalAchieved || lifecycle?.allTargetsCompleted)) {
      return { label: 'WON +80p', dot: 'bg-purple-400', text: 'text-purple-300', badgeBg: 'bg-purple-950/60 border-purple-500/30' };
    }
    if (sym === 'EURUSD' || sym === 'NAS100' || sym === 'US500' || sym === 'USDCAD') {
      return { label: 'SELL', dot: 'bg-red-500', text: 'text-red-400', badgeBg: 'bg-red-950/60 border-red-500/30' };
    }
    if (sym === 'XAUUSD' || sym === 'BTCUSD' || sym === 'USDJPY' || sym === 'AUDUSD' || sym === 'GER40') {
      return { label: 'BUY', dot: 'bg-emerald-400', text: 'text-emerald-400', badgeBg: 'bg-emerald-950/60 border-emerald-500/30' };
    }
    return { label: 'CHOP', dot: 'bg-slate-400', text: 'text-slate-400', badgeBg: 'bg-slate-900 border-slate-700/50' };
  };

  // Simplified Unified Terminal Navigation Tab (All redundant tabs consolidated into one organized model)
  const renderNavButtons = () => (
    <button
      onClick={() => setActiveView('combined')}
      className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded bg-gradient-to-r from-[#182236] to-[#121b2d] text-white border border-cyan-500/40 shadow-xs whitespace-nowrap shrink-0 cursor-pointer"
      title="Unified Institutional Order-Flow, Sniper Execution & Macro Intelligence Terminal"
    >
      <Layers className="w-3.5 h-3.5 text-cyan-400" />
      <span>Unified Terminal</span>
      {isSignalAchieved ? (
        <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-500/40 font-mono font-bold">
          WON +{achievedPips}p
        </span>
      ) : modelOutput.sniperEdge.isEdgeQualified ? (
        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold animate-pulse">
          EDGE READY
        </span>
      ) : (
        <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 font-mono">
          ALL-IN-ONE
        </span>
      )}
    </button>
  );

  return (
    <header className="relative z-[90] border-b border-[#1c2438] bg-[#0d121d] flex flex-col shrink-0 select-none">
      {/* Top Main Row */}
      <div className="h-14 px-2 sm:px-4 flex items-center justify-between gap-1 sm:gap-2 shrink-0 overflow-x-auto sm:overflow-visible scrollbar-none">
        {/* Zone 1: Brand Title & Instrument Selection */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <a href="#home" className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-sm shadow-cyan-500/20 shrink-0">
              <Activity className="w-3.5 h-3.5" />
            </div>
            <span>SNIPER<span className="text-cyan-400">EDGE</span></span>
          </a>

          <div className="h-4 w-px bg-[#1e2638] mx-0.5 sm:mx-1" />

          {/* Quick Instrument Switcher Pills (visible on large screens) */}
          <div className="hidden 2xl:flex items-center gap-1 bg-[#121826] p-0.5 rounded border border-[#1e273a]">
            {quickPills.map((sym) => {
              const isSelected = sym === currentSymbol;
              const sig = getQuickSignalInfo(sym);
              return (
                <button
                  key={sym}
                  onClick={() => onSelectSymbol(sym)}
                  className={`px-2 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#1e273a] text-cyan-300 border border-cyan-500/30 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={`${sym} - Current Edge: ${sig.label}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${sig.dot}`} />
                  <span>{sym}</span>
                  <span className={`text-[9px] font-mono px-1 rounded border ${sig.badgeBg} ${sig.text}`}>
                    {sig.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Categorized Full Symbol Dropdown Menu & Mobile Overlapping Selector */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 text-xs font-semibold rounded bg-[#121826] text-slate-300 hover:text-white border border-[#1e273a] hover:border-cyan-500/40 transition-colors shrink-0"
              title="Browse all Forex pairs and Indices"
            >
              <span className="text-cyan-400 font-bold">{currentSymbol}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isDropdownOpen && (
              <>
                {/* Mobile Android / Mobile Devices Full Overlapping Sheet (Z-[99999] so it ALWAYS comes in front) */}
                <div className="fixed inset-0 z-[99999] flex flex-col justify-end sm:hidden font-sans">
                  {/* Dimmed Blurred Backdrop */}
                  <div
                    className="fixed inset-0 bg-black/85 backdrop-blur-xs transition-opacity"
                    onClick={() => setIsDropdownOpen(false)}
                  />

                  {/* Overlapping Drawer Panel */}
                  <div
                    className="relative z-10 w-full max-h-[85vh] bg-[#0c121e] border-t-2 border-cyan-500/60 rounded-t-2xl shadow-2xl flex flex-col overflow-hidden text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Header */}
                    <div className="p-3 bg-[#111827] border-b border-[#1f293d] flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                          <Activity className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">Select Trading Pair</div>
                          <div className="text-[10px] text-slate-400">All available pairs ({filteredSymbols.length})</div>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsDropdownOpen(false)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-[#1a2337] active:bg-[#24314c]"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Search & Tabs */}
                    <div className="p-2.5 bg-[#0e1626] border-b border-[#1c263c] space-y-2 shrink-0">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={mobileSearch}
                          onChange={(e) => setMobileSearch(e.target.value)}
                          placeholder="Search pairs (e.g. EUR, US30, Gold, BTC)..."
                          className="w-full bg-[#141d30] border border-[#232f48] focus:border-cyan-500 text-white rounded-lg pl-8 pr-8 py-2 text-xs placeholder-slate-500 outline-none"
                        />
                        {mobileSearch && (
                          <button
                            onClick={() => setMobileSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                        {(['all', 'forex', 'indices', 'metals_crypto'] as const).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setMobileTab(tab)}
                            className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors ${
                              mobileTab === tab
                                ? 'bg-cyan-500 text-black font-bold shadow-xs'
                                : 'bg-[#182236] text-slate-400 hover:text-white'
                            }`}
                          >
                            {tab === 'all'
                              ? `All (${allSymbols.length})`
                              : tab === 'forex'
                              ? `Forex (${forexSymbols.length})`
                              : tab === 'indices'
                              ? `Indices (${indexSymbols.length})`
                              : `Metals & Crypto (${otherSymbols.length})`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Scrollable Touch-Friendly Pair List */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-1.5 overscroll-contain max-h-[55vh]">
                      {filteredSymbols.map((sym) => {
                        const sig = getQuickSignalInfo(sym);
                        const isSelected = currentSymbol === sym;
                        const inst = INSTRUMENTS[sym];
                        return (
                          <button
                            key={sym}
                            onClick={() => {
                              onSelectSymbol(sym);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors text-left ${
                              isSelected
                                ? 'bg-cyan-950/90 text-cyan-300 font-bold border border-cyan-500/50 shadow-xs'
                                : 'text-slate-300 hover:bg-[#182238] active:bg-[#1f2c48] border border-[#182236]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className={`w-2.5 h-2.5 rounded-full ${sig.dot} shrink-0`} />
                              <div>
                                <div className="text-sm font-bold text-white flex items-center gap-2">
                                  <span>{sym}</span>
                                  {isSelected && (
                                    <span className="text-[10px] text-cyan-400 font-mono font-normal bg-cyan-950 px-1.5 py-0.2 rounded border border-cyan-800">
                                      Active
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400">{inst?.name}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${sig.badgeBg} ${sig.text}`}>
                                {sig.label}
                              </span>
                              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-black/40 text-slate-400">
                                {inst?.type}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                      {filteredSymbols.length === 0 && (
                        <div className="p-8 text-center text-slate-500 text-xs">
                          No matching trading pairs found for "{mobileSearch}".
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Desktop Popover Menu (hidden on mobile, floats cleanly with z-[9999]) */}
                <div className="hidden sm:block absolute left-0 top-full mt-1.5 w-64 max-h-[80vh] overflow-y-auto rounded-lg bg-[#0e1422] border border-[#232f48] shadow-2xl z-[9999] p-2 font-sans text-xs">
                  {/* Indices Group */}
                  <div className="mb-2">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400 px-2 py-1 flex items-center justify-between">
                      <span>Major Indices</span>
                      <span className="text-slate-500">Global Equities</span>
                    </div>
                    <div className="space-y-0.5">
                      {indexSymbols.map((sym) => {
                        const sig = getQuickSignalInfo(sym);
                        return (
                          <button
                            key={sym}
                            onClick={() => {
                              onSelectSymbol(sym);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded transition-colors ${
                              currentSymbol === sym ? 'bg-cyan-950/70 text-cyan-300 font-bold' : 'text-slate-300 hover:bg-[#182238] hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${sig.dot}`} />
                              <span>{sym}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-mono px-1 rounded border ${sig.badgeBg} ${sig.text}`}>
                                {sig.label}
                              </span>
                              <span className="text-[10px] text-slate-400">{INSTRUMENTS[sym].name}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Forex Group */}
                  <div className="mb-2 pt-1 border-t border-[#1c263c]">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 px-2 py-1 flex items-center justify-between">
                      <span>Forex Pairs</span>
                      <span className="text-slate-500">Major Currencies</span>
                    </div>
                    <div className="space-y-0.5">
                      {forexSymbols.map((sym) => {
                        const sig = getQuickSignalInfo(sym);
                        return (
                          <button
                            key={sym}
                            onClick={() => {
                              onSelectSymbol(sym);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded transition-colors ${
                              currentSymbol === sym ? 'bg-cyan-950/70 text-cyan-300 font-bold' : 'text-slate-300 hover:bg-[#182238] hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${sig.dot}`} />
                              <span>{sym}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-mono px-1 rounded border ${sig.badgeBg} ${sig.text}`}>
                                {sig.label}
                              </span>
                              <span className="text-[10px] text-slate-400">{INSTRUMENTS[sym].name}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Metals & Crypto */}
                  <div className="pt-1 border-t border-[#1c263c]">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 px-2 py-1 flex items-center justify-between">
                      <span>Metals & Crypto</span>
                      <span className="text-slate-500">Gold & BTC</span>
                    </div>
                    <div className="space-y-0.5">
                      {otherSymbols.map((sym) => {
                        const sig = getQuickSignalInfo(sym);
                        return (
                          <button
                            key={sym}
                            onClick={() => {
                              onSelectSymbol(sym);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded transition-colors ${
                              currentSymbol === sym ? 'bg-cyan-950/70 text-cyan-300 font-bold' : 'text-slate-300 hover:bg-[#182238] hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${sig.dot}`} />
                              <span>{sym}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-mono px-1 rounded border ${sig.badgeBg} ${sig.text}`}>
                                {sig.label}
                              </span>
                              <span className="text-[10px] text-slate-400">{INSTRUMENTS[sym].name}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Live Market Price & Interactive Timeframe Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-mono ml-0.5 sm:ml-1 shrink-0">
            <span className="hidden lg:inline text-slate-300 font-semibold">{currentInst.name}</span>
            <span className="text-cyan-400 font-bold tabular-nums">
              {modelOutput.location.currentPrice.toFixed(currentInst.digits)}
            </span>
            {/* Interactive Timeframe Control (§15) - Always visible on mobile & desktop */}
            <div className="flex items-center gap-0.5 bg-[#121826] p-0.5 rounded border border-[#1e273a] text-[10px] shrink-0">
              {(['M1', 'M5', 'M15', 'H1', 'H4'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => onSelectTimeframe && onSelectTimeframe(tf)}
                  className={`px-1.5 py-0.5 rounded font-mono font-bold transition-colors cursor-pointer ${
                    currentTimeframe === tf
                      ? 'bg-cyan-500 text-black shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={`Switch to ${tf} timeframe & recalibrate full model`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Zone 2: Navigation / View Mode Tabs (Desktop inline view) */}
        <nav className="hidden xl:flex items-center gap-1 bg-[#121826] p-1 rounded-md border border-[#1e273a]">
          {renderNavButtons()}
        </nav>

        {/* Zone 3: Primary Actions & State Indicator */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Active Sniper Edge & Exhaustion Status Chip (Desktop) */}
          <button
            onClick={() => {
              setActiveView('combined');
              const el = document.getElementById('sniper-radar-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold rounded border transition-all cursor-pointer ${
              isSignalAchieved
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60 hover:bg-emerald-900 shadow-xs shadow-emerald-500/20'
                : lifecycle?.tp2Hit
                ? 'bg-gradient-to-r from-emerald-950 to-amber-950 text-amber-300 border-amber-500/50 shadow-xs'
                : lifecycle?.tp1Hit
                ? 'bg-cyan-950/90 text-cyan-300 border-cyan-500/50 shadow-xs'
                : modelOutput.sniperEdge.isEdgeQualified
                ? modelOutput.sniperEdge.triggerAction === 'SNIPER_BUY'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900/80 shadow-xs shadow-emerald-500/20'
                  : 'bg-red-950/80 text-red-300 border-red-500/50 hover:bg-red-900/80 shadow-xs shadow-red-500/20'
                : 'bg-[#101726] text-slate-400 border-[#1f2b42] hover:text-slate-200'
            }`}
            title="Click to view full Sniper Edge Execution & Exhaustion Radar"
          >
            {isSignalAchieved ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>ALL TARGETS COMPLETED (+{achievedPips}p) · SCANNING NEXT</span>
              </>
            ) : lifecycle?.tp2Hit ? (
              <>
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>TP1 & TP2 HIT (+{(lifecycle?.tp1Pips ?? 0) + (lifecycle?.tp2Pips ?? 0)}p) · RUNNER ON TP3</span>
              </>
            ) : lifecycle?.tp1Hit ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>TP1 HIT (+{lifecycle?.tp1Pips ?? 14}p) · RUNNER TARGETING TP2</span>
              </>
            ) : (
              <>
                <Crosshair className={`w-3.5 h-3.5 ${modelOutput.sniperEdge.isEdgeQualified ? 'animate-spin-slow' : ''}`} />
                <span>
                  {modelOutput.sniperEdge.isEdgeQualified
                    ? `${modelOutput.sniperEdge.actionBadge}: ${modelOutput.exhaustion.exhaustedSide} EXHAUSTED`
                    : 'AUCTION BALANCED'}
                </span>
              </>
            )}
          </button>

          {/* Model State Quick Chip */}
          <button
            onClick={onOpenScorecard}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 text-xs font-semibold rounded border transition-colors shrink-0 ${
              isNoTrade
                ? 'bg-neutral-800/80 text-neutral-300 border-neutral-700 hover:bg-neutral-700/80'
                : modelOutput.state.color === 'green'
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600/40 hover:bg-emerald-900/60'
                : 'bg-red-950/60 text-red-300 border-red-600/40 hover:bg-red-900/60'
            }`}
            title="Click to view full Confluence Scorecard"
          >
            {isNoTrade ? (
              <AlertOctagon className="w-3.5 h-3.5 text-neutral-400" />
            ) : (
              <div className={`w-2 h-2 rounded-full ${modelOutput.state.color === 'green' ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`} />
            )}
            <span>{modelOutput.scorecard.grade}</span>
            <span className="text-slate-500 font-normal hidden sm:inline">|</span>
            <span className="font-mono hidden sm:inline">{modelOutput.scorecard.totalScore} pts</span>
          </button>

          {/* Live Market Schedule & Session Badge (Market Hours / Weekend Pause Awareness) */}
          <div
            className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold rounded border transition-all shrink-0 ${
              marketSchedule.statusColor === 'emerald'
                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
                : marketSchedule.statusColor === 'amber'
                ? 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                : marketSchedule.statusColor === 'rose'
                ? 'bg-rose-950/80 text-rose-300 border-rose-500/50'
                : 'bg-slate-900 text-slate-400 border-slate-700/60'
            }`}
            title={`${marketSchedule.name} (${marketSchedule.symbol}): ${marketSchedule.reason}${marketSchedule.timeUntilOpenFormatted ? ` · Next session opens in ${marketSchedule.timeUntilOpenFormatted}` : ''}`}
          >
            <span className="relative flex h-2 w-2">
              {marketSchedule.isOpen ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-400"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              )}
            </span>
            <span className="text-[10px] font-bold tracking-tight">
              {marketSchedule.statusBadge}
            </span>
            {marketSchedule.dstInfo && (
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#070b14] text-amber-300 border border-amber-500/40 font-mono hidden 2xl:inline" title={marketSchedule.dstInfo.activePolicyNote}>
                {marketSchedule.dstInfo.tzAbbreviation} ({marketSchedule.dstInfo.utcOffsetLabel})
              </span>
            )}
            {marketSchedule.timeUntilOpenFormatted && !marketSchedule.isOpen && (
              <span className="text-[9px] px-1 py-0.2 rounded bg-black/60 text-slate-300 border border-slate-700/60 font-mono">
                {marketSchedule.timeUntilOpenFormatted}
              </span>
            )}
          </div>

          {/* Live Real Data Badge / Inspector Toggle */}
          <button
            onClick={onOpenLiveInspector}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 text-xs font-mono font-semibold rounded border transition-all bg-[#0e1626] text-cyan-300 border-cyan-500/40 hover:bg-[#152038] hover:border-cyan-400/60 shadow-xs shrink-0"
            title="Inspect Live TradingView WebSocket and Dukascopy Real Tick Stream"
          >
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isLiveConnected ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isLiveConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <span className="text-[11px] font-bold text-white">LIVE</span>
            <span className="text-[10px] text-cyan-400 hidden md:inline">FEEDS</span>
            {tickCount > 0 && (
              <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 hidden 2xl:inline">
                {(tickCount / 1000).toFixed(1)}k
              </span>
            )}
          </button>

          {/* Live Streaming Toggle */}
          <button
            onClick={onToggleStreaming}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 text-xs font-medium rounded border transition-colors shrink-0 ${
              isStreaming
                ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40 hover:bg-cyan-900/60'
                : 'bg-[#121826] text-slate-400 border-[#1e273a] hover:text-slate-200'
            }`}
          >
            {isStreaming ? <Pause className="w-3 h-3 text-cyan-400" /> : <Play className="w-3 h-3" />}
            <span className="hidden md:inline">{isStreaming ? 'Live Stream' : 'Paused'}</span>
          </button>

          {/* OrderBook Crowd Rules Guide */}
          <button
            onClick={onOpenCrowdGuide}
            className="p-1.5 rounded text-slate-400 hover:text-amber-300 hover:bg-[#1c2438] transition-colors shrink-0"
            title="How to Trade with OrderBook Indicator (Crowd Behavior Rules)"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          {/* Indicator Settings */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#1c2438] transition-colors shrink-0"
            title="OrderBook Settings (Depth, Layout, Scale, Filters)"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

