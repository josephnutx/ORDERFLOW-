import React, { useState } from 'react';
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
  TrendingDown
} from 'lucide-react';
import { 
  OrderBookSnapshot, 
  OrderBookLevel, 
  OrderBookSettings, 
  FilterMode 
} from '../types/orderbook';
import { MarketIntelligenceOutput } from '../types/marketIntelligence';

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
  const [activeTabOneSided, setActiveTabOneSided] = useState<'orders' | 'positions'>('orders');
  const [hoveredLevel, setHoveredLevel] = useState<{
    level: OrderBookLevel;
    side: 'left' | 'right';
    quadrant: string;
  } | null>(null);

  const isHistorical = snapshotIndex < totalSnapshots - 1;
  const currentPrice = snapshot.currentPrice;

  // Max volume for scaling bars
  const maxLeftVol = Math.max(
    ...snapshot.levels.map((l) => Math.max(l.sellLimit, l.buyStop, l.sellStop, l.buyLimit)),
    100
  );
  const maxRightVol = Math.max(
    ...snapshot.levels.map((l) => Math.max(l.profitSellers, l.lossBuyers, l.lossSellers, l.profitBuyers)),
    100
  );

  // Helper to get dynamic fade vs thick color based on order amount:
  // Red represents SELL, Green represents BUY.
  // If amount is strong -> thick/solid color. If low amount -> light/faded color.
  const getBarColorStyle = (side: 'sell' | 'buy', amount: number, maxVol: number) => {
    const intensity = Math.min(1, Math.max(0.12, amount / (maxVol || 1)));
    // Faded for low volume (opacity ~0.26), thick/solid for strong volume (opacity ~0.90)
    const opacity = 0.26 + intensity * 0.64;
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
      {/* 1. Header Bar: O.Book indicator panel */}
      <div className="bg-[#101624] px-3 py-2 border-b border-[#1c2438] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          {/* Status Dot */}
          <div className="flex items-center gap-1.5 font-semibold text-slate-200">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50 inline-block animate-pulse" />
            <span className="tracking-wide">O.Book</span>
          </div>

          <span className="text-slate-600">|</span>

          {/* Snapshot Time (Turns blue if historical navigation is active) */}
          <span
            className={`font-mono text-[11px] px-1.5 py-0.5 rounded transition-colors ${
              isHistorical 
                ? 'text-cyan-300 bg-cyan-950/60 border border-cyan-500/40 font-semibold' 
                : 'text-slate-400'
            }`}
            title={isHistorical ? 'Historical Snapshot (Rewind Active)' : 'Live Snapshot Time'}
          >
            {snapshot.formattedTime}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Settings Quick Access */}
          <button
            onClick={onOpenSettings}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1a2234] transition-colors"
            title="OrderBook Settings"
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
          {/* 2. Quick Controls: ALL / NET filters and Rewind Bar */}
          <div className="bg-[#0d1320] px-3 py-1.5 border-b border-[#192236] flex items-center justify-between gap-2 shrink-0">
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

            {/* Layout Mode Selector for One-Sided */}
            {(settings.layout === 'classic_one_sided' || settings.layout === 'simplified_one_sided') && (
              <div className="flex items-center gap-1 bg-[#090d16] p-0.5 rounded border border-[#1b253b]">
                <button
                  onClick={() => setActiveTabOneSided('orders')}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                    activeTabOneSided === 'orders' ? 'bg-[#1e2a42] text-amber-300' : 'text-slate-400'
                  }`}
                >
                  Orders
                </button>
                <button
                  onClick={() => setActiveTabOneSided('positions')}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                    activeTabOneSided === 'positions' ? 'bg-[#1e2a42] text-cyan-300' : 'text-slate-400'
                  }`}
                >
                  Positions
                </button>
              </div>
            )}
          </div>

          {/* Intelligence Alerts Strip (Spoofing / Absorption / LVN) */}
          {marketIntelligence && (
            <div className="px-3 py-1 bg-[#090e18] border-b border-[#141b2c] flex items-center justify-between text-[10px] font-mono">
              <div className="flex items-center gap-1.5 truncate">
                {marketIntelligence.liquidity.spoofDetector.isUnstableLiquidity ? (
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <span>⚠</span>
                    <span>Possible Spoofing / Unstable Liquidity ({Math.round(marketIntelligence.liquidity.spoofDetector.spoofProbability * 100)}%)</span>
                  </span>
                ) : (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <span>✓</span>
                    <span>Stable Institutional Depth ({marketIntelligence.liquidity.orderPersistence}% Persist)</span>
                  </span>
                )}
              </div>
              {marketIntelligence.absorption.absorptionScore >= 75 && (
                <span className="text-cyan-300 font-bold px-1.5 py-0.2 rounded bg-cyan-950/70 border border-cyan-500/30">
                  {marketIntelligence.absorption.absorptionDirection === 'SELL_SIDE_ABSORPTION' ? 'Sell Absorption' : 'Buy Absorption'}
                </span>
              )}
            </div>
          )}

          {/* 3. Quadrant Top Summaries (matching indctr.PNG) */}
          <div className="grid grid-cols-2 gap-1 px-3 py-1.5 bg-[#0a0e17] border-b border-[#161d2e] text-[10px] font-mono">
            {/* Left Book Upper Quadrant Badges */}
            <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-[#131926] border border-[#1d263a]">
              <span className="text-red-400 font-bold">{snapshot.leftBook.sellLimitPct}% Sell Limit</span>
              <span className="text-emerald-400 font-bold">Buy Stop: {snapshot.leftBook.buyStopPct}%</span>
            </div>

            {/* Right Book Upper Quadrant Badges */}
            <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-[#131926] border border-[#1d263a]">
              <span className="text-red-400 font-bold">{snapshot.rightBook.profitSellersPct}% Profit Sell</span>
              <span className="text-emerald-400 font-bold">Loss Buy: {snapshot.rightBook.lossBuyersPct}%</span>
            </div>
          </div>

          {/* 4. The Two-Sided Histogram Canvas */}
          <div className="flex-1 overflow-y-auto overflow-x-auto relative divide-y divide-[#121927]">
            {snapshot.levels.map((lvl, idx) => {
              const isAbove = lvl.price > currentPrice;
              const isCurrent = lvl.isCurrentPrice;

              // Left side bars
              const leftVal1 = isAbove ? lvl.sellLimit : lvl.sellStop; // outer/left -> SELL
              const leftVal2 = isAbove ? lvl.buyStop : lvl.buyLimit; // inner/right -> BUY
              const leftWidth1 = Math.min(100, (leftVal1 / maxLeftVol) * 90);
              const leftWidth2 = Math.min(100, (leftVal2 / maxLeftVol) * 90);

              // Right side bars
              const rightVal1 = isAbove ? lvl.profitSellers : lvl.lossSellers; // inner/left -> SELL
              const rightVal2 = isAbove ? lvl.lossBuyers : lvl.profitBuyers; // outer/right -> BUY
              const rightWidth1 = Math.min(100, (rightVal1 / maxRightVol) * 90);
              const rightWidth2 = Math.min(100, (rightVal2 / maxRightVol) * 90);

              return (
                <div
                  key={`lvl-${lvl.price}-${idx}`}
                  className={`flex items-center h-5 text-[10px] font-mono group transition-colors relative min-w-[280px] ${
                    isCurrent ? 'bg-cyan-950/40 border-y border-cyan-500/60 font-bold' : 'hover:bg-[#121929]'
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
                  {/* Current Price Marker Indicator */}
                  {isCurrent && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400 shadow-sm shadow-cyan-400 animate-pulse z-10" />
                  )}

                  {/* LEFT BOOK: Pending Orders */}
                  {(settings.layout === 'classic_two_sided' || settings.layout === 'simplified_two_sided' || activeTabOneSided === 'orders') && (
                    <div className="flex-1 flex items-center h-full px-1 border-r border-[#192236]">
                      {/* Left Sub-column: SELL (Sell Limit if above, Sell Stop if below) -> Red (fade vs thick) */}
                      <div className="w-1/2 h-full flex items-center justify-end pr-1 relative">
                        <div
                          className="h-3 rounded-xs transition-all border-r"
                          style={{
                            width: `${leftWidth1}%`,
                            ...getBarColorStyle('sell', leftVal1, maxLeftVol),
                          }}
                        />
                        {lvl.hasAbnormalCluster && lvl.clusterType === 'resistance_wall' && isAbove && (
                          <span className="absolute left-1 text-[9px] text-red-300 font-bold">WALL</span>
                        )}
                        {lvl.hasAbnormalCluster && lvl.clusterType === 'sl_hunt' && !isAbove && (
                          <span className="absolute left-1 text-[9px] text-red-300 font-bold">SL POOL</span>
                        )}
                      </div>

                      {/* Right Sub-column: BUY (Buy Stop if above, Buy Limit if below) -> Green (fade vs thick) */}
                      <div className="w-1/2 h-full flex items-center justify-start pl-1 relative">
                        <div
                          className="h-3 rounded-xs transition-all border-l"
                          style={{
                            width: `${leftWidth2}%`,
                            ...getBarColorStyle('buy', leftVal2, maxLeftVol),
                          }}
                        />
                        {lvl.hasAbnormalCluster && lvl.clusterType === 'support_wall' && !isAbove && (
                          <span className="absolute right-1 text-[9px] text-emerald-300 font-bold">WALL</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* CENTER: Exact Price Pillar */}
                  <div className={`w-16 sm:w-20 text-center tabular-nums font-mono py-0.5 px-0.5 sm:px-1 shrink-0 ${
                    isCurrent 
                      ? 'bg-cyan-500 text-black font-extrabold rounded-xs shadow-sm shadow-cyan-400' 
                      : 'text-slate-400 group-hover:text-white'
                  }`}>
                    {lvl.formattedPrice}
                  </div>

                  {/* RIGHT BOOK: Open Positions */}
                  {(settings.layout === 'classic_two_sided' || settings.layout === 'simplified_two_sided' || activeTabOneSided === 'positions') && (
                    <div className="flex-1 flex items-center h-full px-1 border-l border-[#192236]">
                      {/* Left Sub-column: SELL (Profit Sellers if above, Loss Sellers if below) -> Red (fade vs thick) */}
                      <div className="w-1/2 h-full flex items-center justify-end pr-1 relative">
                        <div
                          className="h-3 rounded-xs transition-all border-r"
                          style={{
                            width: `${rightWidth1}%`,
                            ...getBarColorStyle('sell', rightVal1, maxRightVol),
                          }}
                        />
                        {lvl.hasAbnormalCluster && lvl.clusterType === 'sl_hunt' && isAbove && (
                          <span className="absolute left-1 text-[9px] text-red-300 font-bold">TRAPPED</span>
                        )}
                      </div>

                      {/* Right Sub-column: BUY (Loss Buyers if above, Profit Buyers if below) -> Green (fade vs thick) */}
                      <div className="w-1/2 h-full flex items-center justify-start pl-1 relative">
                        <div
                          className="h-3 rounded-xs transition-all border-l"
                          style={{
                            width: `${rightWidth2}%`,
                            ...getBarColorStyle('buy', rightVal2, maxRightVol),
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 5. Quadrant Bottom Summaries (matching indctr.PNG) */}
          <div className="grid grid-cols-2 gap-1 px-3 py-1.5 bg-[#0a0e17] border-t border-[#161d2e] text-[10px] font-mono shrink-0">
            {/* Left Book Lower Quadrant Badges */}
            <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-[#131926] border border-[#1d263a]">
              <span className="text-red-400 font-bold">{snapshot.leftBook.sellStopPct}% Sell Stop</span>
              <span className="text-emerald-400 font-bold">Buy Limit: {snapshot.leftBook.buyLimitPct}%</span>
            </div>

            {/* Right Book Lower Quadrant Badges */}
            <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-[#131926] border border-[#1d263a]">
              <span className="text-red-400 font-bold">{snapshot.rightBook.lossSellersPct}% Loss Sell</span>
              <span className="text-emerald-400 font-bold">Profit Buy: {snapshot.rightBook.profitBuyersPct}%</span>
            </div>
          </div>

          {/* 6. Sentiment Ratio Widget (matching user's bottom left box in indctr.PNG) */}
          <div className="p-3 bg-[#0d1320] border-t border-[#1c2438] shrink-0">
            <div className="flex items-center justify-between text-xs mb-1.5">
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
            <div className="h-6 w-full rounded flex overflow-hidden border border-[#222d42] font-mono text-xs font-bold text-white shadow-inner">
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

            {/* Crowd Dynamic Insight */}
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span className="text-slate-300 font-medium">
                {snapshot.sentiment.crowdTrappedState}
              </span>
              <span className="text-slate-500">{snapshot.formattedTime.split(' ')[1]}</span>
            </div>
          </div>

          {/* Hover Level Tooltip Panel */}
          {hoveredLevel && (
            <div className="px-3 py-2 bg-[#121929] border-t border-cyan-500/30 text-[11px] font-mono shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-300">Level {hoveredLevel.level.formattedPrice}:</span>
                <span className="text-amber-300 font-semibold">{hoveredLevel.quadrant}</span>
              </div>
              <div className="text-slate-400">
                Net skew: <span className={hoveredLevel.level.netOrders >= 0 ? 'text-emerald-400' : 'text-red-400'}>{hoveredLevel.level.netOrders > 0 ? `+${hoveredLevel.level.netOrders}` : hoveredLevel.level.netOrders}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
