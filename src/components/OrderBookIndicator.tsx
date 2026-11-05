import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Minimize2, 
  Maximize2, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  Play, 
  Pause, 
  Info,
  Sliders,
  TrendingUp,
  TrendingDown,
  Lock,
  Target,
  ArrowUp,
  ArrowDown,
  Zap,
  Shield,
  Layers
} from 'lucide-react';
import { 
  OrderBookSnapshot, 
  OrderBookLevel, 
  OrderBookSettings, 
  FilterMode 
} from '../types/orderbook';
import { MarketIntelligenceOutput } from '../types/marketIntelligence';
import { INSTRUMENTS } from '../services/mockDataGenerator';

interface OrderBookIndicatorProps {
  snapshot: OrderBookSnapshot;
  snapshotIndex: number;
  totalSnapshots: number;
  onSelectSnapshotIndex: (index: number) => void;
  settings: OrderBookSettings;
  onUpdateSettings: (newSettings: Partial<OrderBookSettings>) => void;
  isStreaming: boolean;
  onToggleStreaming: () => void;
  onOpenSettings: () => void;
  marketIntelligence?: MarketIntelligenceOutput;
}

export const OrderBookIndicator: React.FC<OrderBookIndicatorProps> = ({
  snapshot,
  snapshotIndex,
  totalSnapshots,
  onSelectSnapshotIndex,
  settings,
  onUpdateSettings,
  isStreaming,
  onToggleStreaming,
  onOpenSettings,
  marketIntelligence,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  // Classic One-Sided Tab: 'orders' (Pending Bids & Asks) vs 'positions' (Open Profit & Loss)
  const [activeTabOneSided, setActiveTabOneSided] = useState<'orders' | 'positions'>('orders');
  const [hoveredLevel, setHoveredLevel] = useState<{
    level: OrderBookLevel;
    side: 'left' | 'right';
    quadrant: string;
  } | null>(null);

  const isHistorical = snapshotIndex < totalSnapshots - 1;
  const currentPrice = snapshot.currentPrice;

  // Instrument precision and pip multiplier
  const cfg = INSTRUMENTS[snapshot.instrument] || INSTRUMENTS.XAUUSD;
  const pipMult = cfg?.pipMultiplier || 10;
  const digits = cfg?.digits || 2;

  // Track live price movement direction (UP vs DOWN)
  const prevPriceRef = useRef(currentPrice);
  const [priceDirection, setPriceDirection] = useState<'UP' | 'DOWN' | 'STABLE'>('UP');

  useEffect(() => {
    if (currentPrice > prevPriceRef.current) {
      setPriceDirection('UP');
    } else if (currentPrice < prevPriceRef.current) {
      setPriceDirection('DOWN');
    }
    prevPriceRef.current = currentPrice;
  }, [currentPrice]);

  // Locked settings: Classic One-Sided layout & Depth 20
  const LOCKED_DEPTH = 20;

  // Center exactly 20 levels around current price
  const visibleLevels = useMemo(() => {
    if (!snapshot.levels || snapshot.levels.length === 0) return [];
    
    // Locate the level closest to current price
    let centerIdx = snapshot.levels.findIndex((l) => l.isCurrentPrice);
    if (centerIdx === -1) {
      centerIdx = snapshot.levels.findIndex((l) => l.price <= currentPrice);
    }
    if (centerIdx === -1) {
      centerIdx = Math.floor(snapshot.levels.length / 2);
    }

    const half = Math.floor(LOCKED_DEPTH / 2); // 10
    const startIdx = Math.max(0, Math.min(snapshot.levels.length - LOCKED_DEPTH, centerIdx - half));
    return snapshot.levels.slice(startIdx, startIdx + LOCKED_DEPTH);
  }, [snapshot.levels, currentPrice]);

  // Detect nearest SL POOL and WALL relative to price trajectory
  const { targetAbove, targetBelow, activeTarget } = useMemo(() => {
    // Search both visible levels and full snapshot levels for clusters
    const abovePools = snapshot.levels
      .filter((l) => l.price > currentPrice && l.hasAbnormalCluster)
      .sort((a, b) => a.price - b.price); // closest above first

    const belowPools = snapshot.levels
      .filter((l) => l.price < currentPrice && l.hasAbnormalCluster)
      .sort((a, b) => b.price - a.price); // closest below first

    const nearestAbove = abovePools[0] || null;
    const nearestBelow = belowPools[0] || null;

    const parseClusterInfo = (lvl: OrderBookLevel | null, isAbove: boolean) => {
      if (!lvl) return null;
      const isWall = lvl.clusterType === 'resistance_wall' || lvl.clusterType === 'support_wall';
      const isSlPool = lvl.clusterType === 'sl_hunt';
      const label = isWall
        ? isAbove ? 'RESISTANCE WALL' : 'SUPPORT WALL'
        : isSlPool
        ? isAbove ? 'BUY-STOP SL POOL' : 'SELL-STOP SL POOL'
        : 'LIQUIDITY POOL';
      const pipsAway = Number((Math.abs(lvl.price - currentPrice) * pipMult).toFixed(1));
      return {
        level: lvl,
        price: lvl.price,
        formattedPrice: lvl.formattedPrice,
        isWall,
        isSlPool,
        label,
        pipsAway,
        isAbove,
      };
    };

    const parsedAbove = parseClusterInfo(nearestAbove, true);
    const parsedBelow = parseClusterInfo(nearestBelow, false);

    // If price is moving UP, active target is above. If DOWN, target is below.
    const active = priceDirection === 'UP' ? parsedAbove || parsedBelow : parsedBelow || parsedAbove;

    return {
      targetAbove: parsedAbove,
      targetBelow: parsedBelow,
      activeTarget: active,
    };
  }, [snapshot.levels, currentPrice, priceDirection, pipMult]);

  // Max volume for scaling bars in the visible 20 levels
  const maxLeftVol = Math.max(
    ...visibleLevels.map((l) => Math.max(l.sellLimit, l.buyStop, l.sellStop, l.buyLimit)),
    100
  );
  const maxRightVol = Math.max(
    ...visibleLevels.map((l) => Math.max(l.profitSellers, l.lossBuyers, l.lossSellers, l.profitBuyers)),
    100
  );

  // Helper to get dynamic fade vs thick color based on order amount:
  const getBarColorStyle = (side: 'sell' | 'buy', amount: number, maxVol: number) => {
    const intensity = Math.min(1, Math.max(0.12, amount / (maxVol || 1)));
    const opacity = 0.28 + intensity * 0.62;
    const isSell = side === 'sell';
    const bg = isSell ? `rgba(239, 68, 68, ${opacity.toFixed(2)})` : `rgba(34, 197, 94, ${opacity.toFixed(2)})`;
    const border = isSell
      ? `rgba(248, 113, 113, ${Math.min(1, opacity + 0.25).toFixed(2)})`
      : `rgba(74, 222, 128, ${Math.min(1, opacity + 0.25).toFixed(2)})`;
    return {
      backgroundColor: bg,
      borderRightColor: border,
      borderLeftColor: border,
    };
  };

  const isNet = settings.filterMode === 'NET';

  return (
    <div className="flex flex-col h-full min-h-[460px] lg:min-h-[520px] bg-[#0a0e17] border-l border-[#1c2438] text-slate-200 select-none overflow-hidden text-xs">
      {/* 1. Header Bar: O.Book indicator panel with Locked Setting Badge */}
      <div className="bg-[#101624] px-3 py-2 border-b border-[#1c2438] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          {/* Status Dot */}
          <div className="flex items-center gap-1.5 font-semibold text-slate-200">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50 inline-block animate-pulse" />
            <span className="tracking-wide">O.Book</span>
          </div>

          <span className="text-slate-600">|</span>

          {/* Locked Setting Badge */}
          <span
            className="flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 font-bold"
            title="OrderBook is locked to Classic One-Sided mode with 20 levels of depth"
          >
            <Lock className="w-3 h-3 text-cyan-400" />
            <span>Classic 1-Sided (Depth 20)</span>
          </span>

          <span className="text-slate-600 hidden sm:inline">|</span>

          {/* Snapshot Time */}
          <span
            className={`font-mono text-[11px] px-1.5 py-0.5 rounded transition-colors hidden sm:inline ${
              isHistorical 
                ? 'text-cyan-300 bg-cyan-950/60 border border-cyan-500/40 font-semibold' 
                : 'text-slate-400'
            }`}
            title={isHistorical ? 'Historical Snapshot (Rewind Active)' : 'Live Snapshot Time'}
          >
            {snapshot.formattedTime.split(' ')[1] || snapshot.formattedTime}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Settings Quick Access */}
          <button
            onClick={onOpenSettings}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1a2234] transition-colors"
            title="OrderBook Settings (Locked to Classic 1-Sided & Depth 20)"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {/* Minimize / Maximize */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1a2234] transition-colors"
            title={isMinimized ? 'Expand Panel' : 'Minimize Panel'}
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* 2. Quick Controls: ALL / NET filters, Rewind Bar, and One-Sided Mode Selector */}
          <div className="bg-[#0d1320] px-3 py-1.5 border-b border-[#192236] flex flex-wrap items-center justify-between gap-1.5 shrink-0">
            {/* One-Sided Mode Selector: Orders vs Positions */}
            <div className="flex items-center gap-1 bg-[#090d16] p-0.5 rounded border border-[#1b253b]">
              <button
                onClick={() => setActiveTabOneSided('orders')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${
                  activeTabOneSided === 'orders'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Pending Orders: Resting Buy/Sell Limits & Stops"
              >
                Pending Orders
              </button>
              <button
                onClick={() => setActiveTabOneSided('positions')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${
                  activeTabOneSided === 'positions'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Open Positions: Trapped Profit & Loss Traders"
              >
                Open Positions
              </button>
            </div>

            {/* ALL / NET Toggle */}
            <div className="flex items-center gap-1 bg-[#090d16] p-0.5 rounded border border-[#1b253b]">
              <button
                onClick={() => onUpdateSettings({ filterMode: 'ALL' })}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors ${
                  !isNet ? 'bg-[#1e2a42] text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ALL
              </button>
              <button
                onClick={() => onUpdateSettings({ filterMode: 'NET' })}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors ${
                  isNet ? 'bg-[#1e2a42] text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                NET
              </button>
            </div>

            {/* History Rewind Bar (Step & Play) */}
            <div className="flex items-center gap-1 bg-[#090d16] p-0.5 rounded border border-[#1b253b]">
              <button
                onClick={() => onSelectSnapshotIndex(0)}
                disabled={snapshotIndex === 0}
                className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition-opacity"
                title="First Snapshot"
              >
                <ChevronsLeft className="w-3 h-3" />
              </button>
              <button
                onClick={() => onSelectSnapshotIndex(Math.max(0, snapshotIndex - 1))}
                disabled={snapshotIndex === 0}
                className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition-opacity"
                title="Previous Snapshot"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <button
                onClick={onToggleStreaming}
                className={`p-1 rounded transition-colors ${isStreaming ? 'text-cyan-400' : 'text-slate-300 hover:text-white'}`}
                title={isStreaming ? 'Pause Auto-Play' : 'Play Live Feed'}
              >
                {isStreaming ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
              <button
                onClick={() => onSelectSnapshotIndex(Math.min(totalSnapshots - 1, snapshotIndex + 1))}
                disabled={snapshotIndex >= totalSnapshots - 1}
                className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition-opacity"
                title="Next Snapshot"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
              <button
                onClick={() => onSelectSnapshotIndex(totalSnapshots - 1)}
                disabled={snapshotIndex >= totalSnapshots - 1}
                className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition-opacity"
                title="Latest Snapshot"
              >
                <ChevronsRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* 3. PROXIMITY TELEMETRY BAR: Shows Current Price moving towards SL POOL or WALL */}
          <div className="px-3 py-2 bg-[#0c1424] border-b border-[#1b2742] flex flex-col gap-1.5 text-[11px] font-mono shrink-0 shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
                <span className="text-white text-xs">PRICE: {currentPrice.toFixed(digits)}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                  priceDirection === 'UP'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                    : 'bg-red-950 text-red-300 border border-red-500/40'
                }`}>
                  {priceDirection === 'UP' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  <span>{priceDirection === 'UP' ? 'MOVING UP' : 'MOVING DOWN'}</span>
                </span>
              </div>

              {activeTarget && (
                <div className="text-right">
                  <span className="text-amber-300 font-bold">
                    {activeTarget.pipsAway} pips
                  </span>
                  <span className="text-slate-400 text-[10px] ml-1">to target</span>
                </div>
              )}
            </div>

            {/* Target Destination Detail */}
            {activeTarget ? (
              <div className="flex items-center justify-between text-[10px] bg-[#070b14] px-2.5 py-1.5 rounded border border-[#162035]">
                <div className="flex items-center gap-1.5 truncate">
                  <Target className={`w-3.5 h-3.5 shrink-0 ${activeTarget.isWall ? 'text-amber-400' : 'text-purple-400'}`} />
                  <span className="text-slate-300">
                    Advancing toward{' '}
                    <strong className={activeTarget.isWall ? 'text-amber-400 font-bold' : 'text-purple-300 font-bold'}>
                      {activeTarget.label}
                    </strong>{' '}
                    @ <span className="font-mono text-white font-bold">{activeTarget.formattedPrice}</span>
                  </span>
                </div>

                <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                  activeTarget.pipsAway <= 3.0
                    ? 'bg-rose-950 text-rose-300 border border-rose-600/50 animate-pulse'
                    : 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
                }`}>
                  {activeTarget.pipsAway <= 3.0 ? '⚡ IMMINENT SWEEP / WALL' : 'IN RANGE'}
                </span>
              </div>
            ) : (
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <Target className="w-3 h-3 text-cyan-400" />
                <span>Scanning order book depth for institutional liquidity walls...</span>
              </div>
            )}
          </div>

          {/* 4. Column Headers for Classic One-Sided Ladder */}
          <div className="grid grid-cols-12 gap-1 px-3 py-1 bg-[#0d1422] border-b border-[#161d2e] text-[10px] font-mono text-slate-400">
            <div className="col-span-5 text-right font-bold text-red-400 pr-2">
              {activeTabOneSided === 'orders' ? 'SELL ORDERS (Limits / Stops)' : 'SELLERS (Profit / Loss)'}
            </div>
            <div className="col-span-2 text-center font-bold text-slate-300">
              PRICE
            </div>
            <div className="col-span-5 text-left font-bold text-emerald-400 pl-2">
              {activeTabOneSided === 'orders' ? 'BUY ORDERS (Stops / Limits)' : 'BUYERS (Loss / Profit)'}
            </div>
          </div>

          {/* 5. The One-Sided Histogram Canvas (Locked Depth: Exactly 20 levels centered around price) */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden relative divide-y divide-[#121927]">
            {visibleLevels.map((lvl, idx) => {
              const isAbove = lvl.price > currentPrice;
              const isCurrent = Math.abs(lvl.price - currentPrice) < (cfg?.tickSize ? cfg.tickSize * 1.5 : 0.0001) || lvl.isCurrentPrice;

              // Check if this level is the active target Wall or SL Pool
              const isTargetWall = activeTarget?.isWall && Math.abs(lvl.price - activeTarget.price) < 0.00001;
              const isTargetSlPool = activeTarget?.isSlPool && Math.abs(lvl.price - activeTarget.price) < 0.00001;

              // Left side bars (SELL)
              const leftVal = activeTabOneSided === 'orders'
                ? (isAbove ? lvl.sellLimit : lvl.sellStop)
                : (isAbove ? lvl.profitSellers : lvl.lossSellers);
              const leftWidth = Math.min(100, (leftVal / (activeTabOneSided === 'orders' ? maxLeftVol : maxRightVol)) * 92);

              // Right side bars (BUY)
              const rightVal = activeTabOneSided === 'orders'
                ? (isAbove ? lvl.buyStop : lvl.buyLimit)
                : (isAbove ? lvl.lossBuyers : lvl.profitBuyers);
              const rightWidth = Math.min(100, (rightVal / (activeTabOneSided === 'orders' ? maxLeftVol : maxRightVol)) * 92);

              return (
                <div
                  key={`lvl-${lvl.price}-${idx}`}
                  className={`flex items-center h-6 text-[10px] font-mono group transition-all relative ${
                    isCurrent
                      ? 'bg-cyan-950/60 border-y-2 border-cyan-400 font-bold shadow-md shadow-cyan-950'
                      : isTargetWall
                      ? 'bg-amber-950/30 border-y border-amber-500/50'
                      : isTargetSlPool
                      ? 'bg-purple-950/30 border-y border-purple-500/50'
                      : 'hover:bg-[#121929]'
                  }`}
                  onMouseEnter={() => {
                    setHoveredLevel({
                      level: lvl,
                      side: 'left',
                      quadrant: isAbove ? 'Sell Limit / Buy Stop' : 'Sell Stop / Buy Limit',
                    });
                  }}
                  onMouseLeave={() => setHoveredLevel(null)}
                >
                  {/* Current Price Marker Indicator with Moving Arrow */}
                  {isCurrent && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-cyan-400 shadow-md shadow-cyan-400 animate-pulse z-10" />
                  )}

                  {/* LEFT COLUMN: SELL BARS */}
                  <div className="flex-1 h-full flex items-center justify-end pr-2 relative overflow-hidden">
                    <div
                      className="h-3.5 rounded-xs transition-all border-r flex items-center justify-start pl-1"
                      style={{
                        width: `${leftWidth}%`,
                        ...getBarColorStyle('sell', leftVal, activeTabOneSided === 'orders' ? maxLeftVol : maxRightVol),
                      }}
                    >
                      {leftWidth > 35 && (
                        <span className="text-[9px] font-mono text-white/90 drop-shadow-xs">
                          {leftVal}
                        </span>
                      )}
                    </div>

                    {/* Specific Level Tags: WALL or SL POOL */}
                    {lvl.hasAbnormalCluster && lvl.clusterType === 'resistance_wall' && isAbove && (
                      <span className="absolute left-2 text-[9px] font-bold text-amber-300 bg-amber-950/80 px-1 rounded border border-amber-500/50 flex items-center gap-0.5">
                        <Shield className="w-2.5 h-2.5 text-amber-400" />
                        <span>WALL</span>
                      </span>
                    )}
                    {lvl.hasAbnormalCluster && lvl.clusterType === 'sl_hunt' && !isAbove && (
                      <span className="absolute left-2 text-[9px] font-bold text-purple-300 bg-purple-950/80 px-1 rounded border border-purple-500/50 flex items-center gap-0.5">
                        <Target className="w-2.5 h-2.5 text-purple-400" />
                        <span>SL POOL</span>
                      </span>
                    )}
                  </div>

                  {/* CENTER COLUMN: EXACT PRICE PILLAR & MOVING TELEMETRY BADGE */}
                  <div className={`w-20 text-center tabular-nums font-mono py-0.5 px-1 shrink-0 z-10 transition-colors ${
                    isCurrent 
                      ? 'bg-cyan-400 text-black font-extrabold rounded-xs shadow-md shadow-cyan-400' 
                      : isTargetWall
                      ? 'bg-amber-950 text-amber-300 font-bold border border-amber-500/50'
                      : isTargetSlPool
                      ? 'bg-purple-950 text-purple-300 font-bold border border-purple-500/50'
                      : 'text-slate-300 group-hover:text-white'
                  }`}>
                    {lvl.formattedPrice}
                  </div>

                  {/* RIGHT COLUMN: BUY BARS */}
                  <div className="flex-1 h-full flex items-center justify-start pl-2 relative overflow-hidden">
                    <div
                      className="h-3.5 rounded-xs transition-all border-l flex items-center justify-end pr-1"
                      style={{
                        width: `${rightWidth}%`,
                        ...getBarColorStyle('buy', rightVal, activeTabOneSided === 'orders' ? maxLeftVol : maxRightVol),
                      }}
                    >
                      {rightWidth > 35 && (
                        <span className="text-[9px] font-mono text-white/90 drop-shadow-xs">
                          {rightVal}
                        </span>
                      )}
                    </div>

                    {/* Specific Level Tags: WALL or SL POOL */}
                    {lvl.hasAbnormalCluster && lvl.clusterType === 'support_wall' && !isAbove && (
                      <span className="absolute right-2 text-[9px] font-bold text-amber-300 bg-amber-950/80 px-1 rounded border border-amber-500/50 flex items-center gap-0.5">
                        <Shield className="w-2.5 h-2.5 text-amber-400" />
                        <span>WALL</span>
                      </span>
                    )}
                    {lvl.hasAbnormalCluster && lvl.clusterType === 'sl_hunt' && isAbove && (
                      <span className="absolute right-2 text-[9px] font-bold text-purple-300 bg-purple-950/80 px-1 rounded border border-purple-500/50 flex items-center gap-0.5">
                        <Target className="w-2.5 h-2.5 text-purple-400" />
                        <span>SL POOL</span>
                      </span>
                    )}
                  </div>

                  {/* Destination Tag Beacon on Target Rows */}
                  {isTargetWall && (
                    <div className="absolute right-2 top-0 bottom-0 flex items-center pointer-events-none">
                      <span className="px-1.5 py-0.2 rounded bg-amber-500 text-black font-extrabold text-[9px] shadow-sm animate-pulse">
                        TARGET WALL ({activeTarget.pipsAway}p)
                      </span>
                    </div>
                  )}
                  {isTargetSlPool && (
                    <div className="absolute right-2 top-0 bottom-0 flex items-center pointer-events-none">
                      <span className="px-1.5 py-0.2 rounded bg-purple-500 text-white font-extrabold text-[9px] shadow-sm animate-pulse">
                        TARGET SL POOL ({activeTarget.pipsAway}p)
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 6. Sentiment Ratio Widget */}
          <div className="p-2.5 bg-[#0d1320] border-t border-[#1c2438] shrink-0">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-slate-200">{snapshot.instrument}</span>
              <div className="flex items-center gap-1.5">
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                  snapshot.sentiment.bias === 'Bullish'
                    ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-500/30'
                    : snapshot.sentiment.bias === 'Bearish'
                    ? 'text-red-400 bg-red-950/60 border border-red-500/30'
                    : 'text-slate-400 bg-slate-800 border border-slate-700'
                }`}>
                  {snapshot.sentiment.bias}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Retail Crowd</span>
              </div>
            </div>

            {/* Dual color Sentiment Bar: Green for Buy, Red for Sell */}
            <div className="h-5 w-full rounded flex overflow-hidden border border-[#222d42] font-mono text-[11px] font-bold text-white shadow-inner">
              <div
                className="bg-emerald-600 flex items-center justify-start pl-2 transition-all"
                style={{ width: `${snapshot.sentiment.buyRatio}%` }}
              >
                <span>{snapshot.sentiment.buyRatio}% Buy</span>
              </div>
              <div
                className="bg-red-600 flex items-center justify-end pr-2 transition-all"
                style={{ width: `${snapshot.sentiment.sellRatio}%` }}
              >
                <span>{snapshot.sentiment.sellRatio}% Sell</span>
              </div>
            </div>
          </div>

          {/* Hover Level Tooltip Panel */}
          {hoveredLevel && (
            <div className="px-3 py-1.5 bg-[#121929] border-t border-cyan-500/30 text-[10px] font-mono shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-3 h-3 text-cyan-400" />
                <span className="text-slate-300">Level {hoveredLevel.level.formattedPrice}:</span>
                <span className="text-amber-300 font-semibold">{hoveredLevel.quadrant}</span>
              </div>
              <div className="text-slate-400">
                Net: <span className={hoveredLevel.level.netOrders >= 0 ? 'text-emerald-400' : 'text-red-400'}>{hoveredLevel.level.netOrders > 0 ? `+${hoveredLevel.level.netOrders}` : hoveredLevel.level.netOrders}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
