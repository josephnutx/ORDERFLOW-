import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Candle, FootprintBubble, OrderBookSnapshot } from '../types/orderbook';
import { SniperModelOutput, SymbolTargetLifecycle } from '../types/sniperModel';
import { INSTRUMENTS, generateHeatmapMatrix } from '../services/mockDataGenerator';
import { Target, Crosshair, Zap, AlertTriangle, ArrowRight, CheckCircle2, Clock, Sparkles, Check, RotateCcw, Mic, Layers } from 'lucide-react';

export interface MajorLiquidityCluster {
  id: string;
  price: number;
  side: 'ask' | 'bid' | 'iceberg';
  label: string;
  sublabel: string;
  volume: number;
  distancePips: number;
  stability: 'GENUINE_WALL' | 'DYNAMIC_RELOAD' | 'SUSPICIOUS_UNSTABLE';
  isIceberg?: boolean;
  restingSharePct: number;
  impactScore: number;
}

interface CandleChartProps {
  candles: Candle[];
  bubbles: FootprintBubble[];
  snapshot: OrderBookSnapshot;
  snapshotIndex: number;
  totalSnapshots: number;
  onSelectSnapshotIndex: (index: number) => void;
  modelOutput: SniperModelOutput;
  showBubbles: boolean;
  onDismissSignal?: (symbol: string) => void;
  isSignalDismissed?: boolean;
  lifecycle?: SymbolTargetLifecycle;
  onHitTarget?: (symbol: string, target: 'TP1' | 'TP2' | 'TP3') => void;
  onCompleteAllTargets?: (symbol: string) => void;
  onTriggerNextSetup?: (symbol: string) => void;
  onInstantBriefing?: () => void;
  onOpenVoiceSettings?: () => void;
}

export const CandleChartWithBubbles: React.FC<CandleChartProps> = ({
  candles,
  bubbles,
  snapshot,
  snapshotIndex,
  totalSnapshots,
  onSelectSnapshotIndex,
  modelOutput,
  showBubbles,
  onDismissSignal,
  isSignalDismissed = false,
  lifecycle,
  onHitTarget,
  onCompleteAllTargets,
  onTriggerNextSetup,
  onInstantBriefing,
  onOpenVoiceSettings,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? Math.min(window.innerWidth - 24, 900) : 700,
    height: typeof window !== 'undefined' && window.innerWidth < 640 ? 370 : 490,
  });
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const [hoveredBubble, setHoveredBubble] = useState<FootprintBubble | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [showSniperOverlay, setShowSniperOverlay] = useState<boolean>(true);
  const [showLiquidityClusters, setShowLiquidityClusters] = useState<boolean>(true);
  const [showWickIndication, setShowWickIndication] = useState<boolean>(true);
  const [removedWickSignalIds, setRemovedWickSignalIds] = useState<Record<string, boolean>>({});
  const [printedTimestamps, setPrintedTimestamps] = useState<Record<string, number>>({});
  const [hoveredClusterId, setHoveredClusterId] = useState<string | null>(null);

  // Track exact container width & height on Android/mobile & desktop resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        setDimensions({ width: el.clientWidth, height: el.clientHeight });
      }
    };
    updateSize();

    const ro = new ResizeObserver(() => {
      updateSize();
    });
    ro.observe(el);
    window.addEventListener('resize', updateSize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  const isMobile = dimensions.width < 520;
  // On mobile phones, display the most recent 24–28 candles so each candle has breathing room and isn't horizontally squeezed
  const visibleCandleCount = isMobile ? Math.min(candles.length, 26) : candles.length;
  const candleStartOffset = Math.max(0, candles.length - visibleCandleCount);
  const displayCandles = useMemo(() => {
    const sliced = candles.slice(candleStartOffset).map((c) => ({ ...c }));
    if (sliced.length > 0 && snapshot.currentPrice) {
      // Ensure the latest forming candle actively reflects genuine live price and true wick formation
      const last = sliced[sliced.length - 1];
      last.close = snapshot.currentPrice;
      if (snapshot.currentPrice > last.high) last.high = snapshot.currentPrice;
      if (snapshot.currentPrice < last.low) last.low = snapshot.currentPrice;
    }
    return sliced;
  }, [candles, candleStartOffset, snapshot.currentPrice]);

  const instCfg = INSTRUMENTS[snapshot.instrument] || INSTRUMENTS.XAUUSD;
  const digits = instCfg.digits;

  // Unique signal ID based on active setup parameters
  const currentSignalId = modelOutput.sniperEdge.isEdgeQualified
    ? `${snapshot.instrument}_${modelOutput.sniperEdge.triggerAction}_${modelOutput.sniperEdge.optimalEntry.toFixed(digits)}_${modelOutput.orderFlowScalp?.hvnPrice.toFixed(digits) || '0'}`
    : '';
  const isWickSignalRemoved = Boolean(currentSignalId && removedWickSignalIds[currentSignalId]);

  // When a new signal appears, record its print timestamp
  useEffect(() => {
    if (currentSignalId) {
      setPrintedTimestamps((prev) => {
        if (prev[currentSignalId]) return prev;
        return { ...prev, [currentSignalId]: Date.now() };
      });
    }
  }, [currentSignalId]);

  // Auto-remove wick signal after print once price departs into profit (3+ ticks) or after 16 seconds
  useEffect(() => {
    if (!currentSignalId || removedWickSignalIds[currentSignalId]) return;
    const printedAt = printedTimestamps[currentSignalId];
    if (!printedAt) return;

    const timer = setInterval(() => {
      const elapsed = Date.now() - printedAt;
      const scalp = modelOutput.orderFlowScalp || modelOutput.sniperEdge?.orderFlowScalp;
      const wickPrice = scalp?.entryZone.triggerPrice ?? modelOutput.sniperEdge.optimalEntry;
      const isBuy = modelOutput.sniperEdge.triggerAction === 'SNIPER_BUY';
      const tick = instCfg.tickSize;

      // Price departure condition (price advanced 3+ ticks into profit away from the wick entry)
      const hasDeparted = isBuy
        ? snapshot.currentPrice >= wickPrice + tick * 3
        : snapshot.currentPrice <= wickPrice - tick * 3;

      // Auto-remove after 16s active entry window or when price departs into profit
      if (hasDeparted || elapsed > 16000) {
        setRemovedWickSignalIds((prev) => ({ ...prev, [currentSignalId]: true }));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [currentSignalId, removedWickSignalIds, printedTimestamps, snapshot.currentPrice, modelOutput, instCfg.tickSize]);

  const handleRemoveWickSignal = () => {
    if (currentSignalId) {
      setRemovedWickSignalIds((prev) => ({ ...prev, [currentSignalId]: true }));
    }
  };

  const handleRestoreWickSignal = () => {
    if (currentSignalId) {
      setRemovedWickSignalIds((prev) => ({ ...prev, [currentSignalId]: false }));
      setPrintedTimestamps((prev) => ({ ...prev, [currentSignalId]: Date.now() }));
    }
  };

  // Major Institutional Liquidity Clusters (Resting Limit Depth, Walls & Iceberg Absorption)
  const majorClusters = useMemo<MajorLiquidityCluster[]>(() => {
    const list: MajorLiquidityCluster[] = [];
    const currentPrice = snapshot.currentPrice;
    const pipMult = instCfg.pipMultiplier || 10;
    const mi = modelOutput.marketIntelligence;

    // 1. From Market Intelligence large resting orders
    if (mi?.liquidity?.largeRestingOrders && mi.liquidity.largeRestingOrders.length > 0) {
      mi.liquidity.largeRestingOrders.forEach((order, idx) => {
        const isAsk = order.side === 'ask';
        list.push({
          id: `mi-order-${idx}-${order.price}`,
          price: order.price,
          side: isAsk ? 'ask' : 'bid',
          label: isAsk ? 'MAJOR ASK CLUSTER' : 'MAJOR BID CLUSTER',
          sublabel: isAsk ? 'RESTING SELL WALL' : 'RESTING BUY WALL',
          volume: order.volume,
          distancePips: Math.abs(Number(((order.price - currentPrice) * pipMult).toFixed(1))),
          stability: order.stability || 'GENUINE_WALL',
          restingSharePct: Math.min(95, Math.max(45, Math.round((order.volume / 800) * 80))),
          impactScore: order.persistenceScore || 85,
        });
      });
    }

    // 2. Add distanceToMajorLiquidity levels if not already closely present
    if (mi?.liquidity?.distanceToMajorLiquidity) {
      const { abovePrice, belowPrice } = mi.liquidity.distanceToMajorLiquidity;
      if (abovePrice && !list.some((c) => Math.abs(c.price - abovePrice) < instCfg.tickSize * 3)) {
        list.push({
          id: `mi-major-above`,
          price: abovePrice,
          side: 'ask',
          label: 'OVERHEAD ASK CLUSTER',
          sublabel: 'RESTING SELL CEILING',
          volume: 720,
          distancePips: Math.abs(Number(((abovePrice - currentPrice) * pipMult).toFixed(1))),
          stability: 'GENUINE_WALL',
          restingSharePct: 78,
          impactScore: 88,
        });
      }
      if (belowPrice && !list.some((c) => Math.abs(c.price - belowPrice) < instCfg.tickSize * 3)) {
        list.push({
          id: `mi-major-below`,
          price: belowPrice,
          side: 'bid',
          label: 'UNDERLYING BID CLUSTER',
          sublabel: 'RESTING BUY FLOOR',
          volume: 810,
          distancePips: Math.abs(Number(((belowPrice - currentPrice) * pipMult).toFixed(1))),
          stability: 'GENUINE_WALL',
          restingSharePct: 82,
          impactScore: 91,
        });
      }
    }

    // 3. Institutional Absorption / Iceberg Reload Pool
    if (mi?.absorption?.absorptionPriceLevel && mi.absorption.absorbedVolume > 0) {
      const absPrice = mi.absorption.absorptionPriceLevel;
      if (!list.some((c) => Math.abs(c.price - absPrice) < instCfg.tickSize * 3)) {
        list.push({
          id: `mi-iceberg-abs`,
          price: absPrice,
          side: 'iceberg',
          label: 'ICEBERG RELOAD CLUSTER',
          sublabel: mi.absorption.absorptionDirection === 'SELL_SIDE_ABSORPTION' ? 'INSTITUTIONAL ASK ABSORPTION' : 'INSTITUTIONAL BID ABSORPTION',
          volume: mi.absorption.absorbedVolume,
          distancePips: Math.abs(Number(((absPrice - currentPrice) * pipMult).toFixed(1))),
          stability: 'DYNAMIC_RELOAD',
          isIceberg: true,
          restingSharePct: 90,
          impactScore: mi.absorption.absorptionScore || 94,
        });
      }
    }

    // 4. Fallback from snapshot.levels if list has fewer than 2 clusters
    if (list.length < 2 && snapshot.levels && snapshot.levels.length > 0) {
      const asks = snapshot.levels
        .filter((l) => l.price > currentPrice)
        .sort((a, b) => (b.sellLimit + b.buyStop) - (a.sellLimit + a.buyStop));
      const bids = snapshot.levels
        .filter((l) => l.price < currentPrice)
        .sort((a, b) => (b.buyLimit + b.sellStop) - (a.buyLimit + a.sellStop));

      if (asks[0]) {
        list.push({
          id: `lvl-ask-${asks[0].price}`,
          price: asks[0].price,
          side: 'ask',
          label: 'MAJOR ASK CLUSTER',
          sublabel: 'RESTING SELL DEPTH',
          volume: asks[0].sellLimit + asks[0].buyStop,
          distancePips: Math.abs(Number(((asks[0].price - currentPrice) * pipMult).toFixed(1))),
          stability: 'GENUINE_WALL',
          restingSharePct: 75,
          impactScore: 82,
        });
      }
      if (bids[0]) {
        list.push({
          id: `lvl-bid-${bids[0].price}`,
          price: bids[0].price,
          side: 'bid',
          label: 'MAJOR BID CLUSTER',
          sublabel: 'RESTING BUY DEPTH',
          volume: bids[0].buyLimit + bids[0].sellStop,
          distancePips: Math.abs(Number(((bids[0].price - currentPrice) * pipMult).toFixed(1))),
          stability: 'GENUINE_WALL',
          restingSharePct: 79,
          impactScore: 86,
        });
      }
    }

    // Sort: highest price to lowest price and limit to top 4 most prominent clusters for maximum clarity
    return list
      .sort((a, b) => b.price - a.price)
      .slice(0, 4);
  }, [snapshot, modelOutput.marketIntelligence, instCfg]);

  // Liquidity Heatmap Matrix (Persistent Horizontal Bands & Sweep Zones matching heatmap.PNG)
  const heatmapData = useMemo(() => {
    return generateHeatmapMatrix(candles, snapshot.instrument);
  }, [candles, snapshot.instrument]);

  // Compute price bounds focused tightly on visible candles so distant TP3 targets never vertically crush the candles
  const { minPrice, maxPrice, priceRange } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    displayCandles.forEach((c) => {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
    });

    const candleSpan = Math.max(max - min, instCfg.tickSize * 10);
    // Allow Sniper levels to expand the viewport by at most 35% of the natural candle range so candles always stay tall & clear
    const maxAllowedExpansion = candleSpan * (isMobile ? 0.25 : 0.45);
    const clampLow = min - maxAllowedExpansion;
    const clampHigh = max + maxAllowedExpansion;

    const edge = modelOutput.sniperEdge;
    if (edge.isEdgeQualified) {
      if (edge.hardStopLoss > 0) {
        min = Math.min(min, Math.max(clampLow, edge.hardStopLoss));
        max = Math.max(max, Math.min(clampHigh, edge.hardStopLoss));
      }
      if (edge.optimalEntry > 0) {
        min = Math.min(min, Math.max(clampLow, edge.optimalEntry));
        max = Math.max(max, Math.min(clampHigh, edge.optimalEntry));
      }
      if (edge.targetTP1 > 0) {
        min = Math.min(min, Math.max(clampLow, edge.targetTP1));
        max = Math.max(max, Math.min(clampHigh, edge.targetTP1));
      }
      if (edge.targetTP2 > 0) {
        min = Math.min(min, Math.max(clampLow, edge.targetTP2));
        max = Math.max(max, Math.min(clampHigh, edge.targetTP2));
      }
    }

    // Ensure nearby major liquidity clusters stay within comfortable view
    majorClusters.forEach((cl) => {
      if (cl.price > 0 && Math.abs(cl.price - snapshot.currentPrice) <= instCfg.tickSize * 70) {
        min = Math.min(min, Math.max(clampLow, cl.price));
        max = Math.max(max, Math.min(clampHigh, cl.price));
      }
    });

    // Add clean vertical breathing margin
    const margin = (max - min) * 0.1 || instCfg.tickSize * 5;
    return {
      minPrice: min - margin,
      maxPrice: max + margin,
      priceRange: max - min + 2 * margin,
    };
  }, [displayCandles, modelOutput.sniperEdge, majorClusters, snapshot.currentPrice, instCfg.tickSize, isMobile]);

  const chartWidth = dimensions.width;
  const chartHeight = dimensions.height;
  const paddingLeft = isMobile ? 26 : 45; // Compact volume profile on mobile
  const paddingRight = isMobile ? 54 : 70; // Price scale
  const paddingTop = 22;
  const paddingBottom = 24;

  const innerHeight = Math.max(180, chartHeight - paddingTop - paddingBottom);

  // Helper to map price to Y coordinate (clamped to chart canvas bounds)
  const priceToY = (price: number) => {
    const ratio = (maxPrice - price) / priceRange;
    const rawY = paddingTop + ratio * innerHeight;
    return Math.max(paddingTop - 6, Math.min(chartHeight - paddingBottom + 6, rawY));
  };

  // Helper to map index to X coordinate with right-margin breathing room (like TradingView)
  const candleCount = displayCandles.length;
  // 5 empty bar spaces on desktop, 4 on mobile so current forming candle is never hidden in the price level
  const rightMarginBars = isMobile ? 4 : 5;
  const totalSlots = candleCount + rightMarginBars;
  const usableWidth = Math.max(120, chartWidth - paddingLeft - paddingRight);
  const candleStep = usableWidth / Math.max(1, totalSlots);

  const getCandleX = (index: number, width: number = chartWidth) => {
    const uWidth = Math.max(120, width - paddingLeft - paddingRight);
    const s = uWidth / Math.max(1, totalSlots);
    return paddingLeft + index * s + s / 2;
  };

  // The active snapshot corresponds to a specific candle near the right
  const snapshotCandleIndex = Math.min(
    displayCandles.length - 1,
    Math.max(0, displayCandles.length - (totalSnapshots - snapshotIndex))
  );
  const snapshotCandle = displayCandles[snapshotCandleIndex] || displayCandles[displayCandles.length - 1];

  // Profile data on left side (like fab.png)
  const volumeProfileBins = useMemo(() => {
    const binCount = 28;
    const binHeight = priceRange / binCount;
    const bins = Array.from({ length: binCount }, (_, i) => ({
      price: minPrice + (i + 0.5) * binHeight,
      volume: 0,
      buyVol: 0,
      sellVol: 0,
    }));

    displayCandles.forEach((c) => {
      const binIdx = Math.min(
        binCount - 1,
        Math.max(0, Math.floor((c.close - minPrice) / binHeight))
      );
      bins[binIdx].volume += c.volume;
      if (c.close >= c.open) {
        bins[binIdx].buyVol += c.volume * 0.6;
      } else {
        bins[binIdx].sellVol += c.volume * 0.6;
      }
    });

    const maxBinVol = Math.max(...bins.map((b) => b.volume), 1);
    return { bins, maxBinVol };
  }, [displayCandles, minPrice, priceRange]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    const usableWidth = rect.width - paddingLeft - paddingRight;
    const s = usableWidth / Math.max(1, totalSlots);
    const rawIdx = Math.floor((x - paddingLeft) / s);
    const clampedIdx = Math.max(0, Math.min(displayCandles.length - 1, rawIdx));
    setHoveredCandle(displayCandles[clampedIdx]);
  };

  const handleMouseLeave = () => {
    setHoveredCandle(null);
    setMousePos(null);
  };

  // Handle clicking on a candle to navigate historical snapshots
  const handleChartClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const usableWidth = rect.width - paddingLeft - paddingRight;
    const s = usableWidth / Math.max(1, totalSlots);
    const rawIdx = Math.floor((x - paddingLeft) / s);
    const clampedIdx = Math.max(0, Math.min(displayCandles.length - 1, rawIdx));

    // Convert visible candle index back to full candle index & snapshot index
    const fullCandleIdx = candleStartOffset + clampedIdx;
    const targetSnapIdx = Math.max(
      0,
      Math.min(totalSnapshots - 1, totalSnapshots - (candles.length - fullCandleIdx))
    );
    onSelectSnapshotIndex(targetSnapIdx);
  };

  return (
    <div className="flex flex-col w-full bg-[#070a10] border border-[#161f33] rounded-lg overflow-hidden shadow-inner">
      {/* 1. Header Toolbar (Put ASIDE above chart canvas, never blocking candles or chart boundaries) */}
      <div className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-[#090e18] border-b border-[#162136] flex flex-wrap items-center justify-between gap-2 z-10 shrink-0">
        {/* Candlestick Legend / Top Status (matching indctr.PNG) */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono bg-[#0d1320] px-2.5 py-1 rounded border border-[#1e273a] max-w-full overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1.5 font-bold text-white shrink-0">
            <span className="text-cyan-400 font-semibold">{snapshot.instrument}</span>
            <span className="text-slate-400">M5</span>
          </div>
          {hoveredCandle ? (
            <div className="flex items-center gap-2 sm:gap-3 text-[11px] whitespace-nowrap">
              <span><span className="text-slate-500">O:</span> <span className="text-slate-200">{hoveredCandle.open}</span></span>
              <span><span className="text-slate-500">H:</span> <span className="text-slate-200">{hoveredCandle.high}</span></span>
              <span><span className="text-slate-500">L:</span> <span className="text-slate-200">{hoveredCandle.low}</span></span>
              <span><span className="text-slate-500">C:</span> <span className={hoveredCandle.close >= hoveredCandle.open ? 'text-emerald-400' : 'text-red-400'}>{hoveredCandle.close}</span></span>
              <span className="hidden xs:inline"><span className="text-slate-500">Vol:</span> <span className="text-amber-300">{hoveredCandle.volume}</span></span>
              <span className="hidden xs:inline"><span className="text-slate-500">Delta:</span> <span className={hoveredCandle.delta >= 0 ? 'text-emerald-400' : 'text-red-400'}>{hoveredCandle.delta > 0 ? `+${hoveredCandle.delta}` : hoveredCandle.delta}</span></span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[11px] text-slate-400 whitespace-nowrap">
              <span>Live Price: <span className="text-cyan-300 font-bold">{snapshot.currentPrice.toFixed(digits)}</span></span>
              <span className="text-slate-600 hidden sm:inline">·</span>
              <span className="text-emerald-400/90 hidden sm:inline">Big Institutional Contracts & Order Flow Patterns Active</span>
            </div>
          )}
        </div>

        {/* Layer Toggles (Pure chart visual controls: Heatmap, Footprint Bubbles, Sniper Overlay) */}
        <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap shrink-0">
          {/* Sniper Edge Overlay Toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowSniperOverlay(!showSniperOverlay);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded border transition-all shadow-xs cursor-pointer ${
              showSniperOverlay
                ? 'bg-[#0f1d33] text-cyan-300 border-cyan-500/50'
                : 'bg-[#0d1320]/85 text-slate-400 border-[#1e273a] hover:text-slate-200'
            }`}
            title="Toggle Value Areas & POI levels on chart"
          >
            <Crosshair className={`w-3.5 h-3.5 ${showSniperOverlay ? 'text-cyan-400' : 'text-slate-500'}`} />
            <span>Order Flow POI</span>
            <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${
              showSniperOverlay ? 'bg-cyan-950 text-cyan-300 font-bold' : 'bg-slate-800 text-slate-400'
            }`}>
              {showSniperOverlay ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Major Liquidity Clusters Toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowLiquidityClusters(!showLiquidityClusters);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded border transition-all shadow-xs cursor-pointer ${
              showLiquidityClusters
                ? 'bg-[#141b2d] text-amber-300 border-amber-500/50'
                : 'bg-[#0d1320]/85 text-slate-400 border-[#1e273a] hover:text-slate-200'
            }`}
            title="Toggle Major Resting Liquidity Clusters & Institutional Order Pools on chart"
          >
            <Layers className={`w-3.5 h-3.5 ${showLiquidityClusters ? 'text-amber-400' : 'text-slate-500'}`} />
            <span>Liquidity Clusters</span>
            <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${
              showLiquidityClusters ? 'bg-amber-950 text-amber-300 font-bold' : 'bg-slate-800 text-slate-400'
            }`}>
              {showLiquidityClusters ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Wick Formation Entry Indication Toggle & Removal State */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isWickSignalRemoved) {
                handleRestoreWickSignal();
              } else {
                handleRemoveWickSignal();
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded border transition-all shadow-xs cursor-pointer ${
              !isWickSignalRemoved && showWickIndication
                ? 'bg-[#09221a] text-emerald-300 border-emerald-500/50'
                : 'bg-[#151322] text-slate-400 border-[#2a243d] hover:text-slate-200'
            }`}
            title={isWickSignalRemoved ? 'Wick signal is removed until next signal appears. Click to re-show' : 'Click to remove wick signal until next signal appears'}
          >
            <Target className={`w-3.5 h-3.5 ${!isWickSignalRemoved && showWickIndication ? 'text-emerald-400' : 'text-slate-500'}`} />
            <span>Wick Signal</span>
            <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${
              !isWickSignalRemoved && showWickIndication ? 'bg-emerald-950 text-emerald-300 font-bold' : 'bg-amber-950 text-amber-300 font-semibold'
            }`}>
              {isWickSignalRemoved ? 'REMOVED' : 'ACTIVE'}
            </span>
          </button>
        </div>
      </div>

      {/* 2. Unobstructed Candlestick & Footprint Chart Canvas (Zero toolbar items or overlays blocking candles) */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleChartClick}
        className="relative w-full h-[370px] sm:h-[430px] lg:h-[490px] bg-[#070a10] overflow-hidden select-none cursor-crosshair"
      >
        <svg className="w-full h-full">


        {/* Background Grid Lines */}
        {Array.from({ length: 7 }).map((_, i) => {
          const y = paddingTop + (i * innerHeight) / 6;
          const p = maxPrice - (i * priceRange) / 6;
          return (
            <g key={i}>
              <line
                x1={paddingLeft}
                y1={y}
                x2="100%"
                y2={y}
                stroke="#131b2e"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x="98%"
                y={y + 3}
                fill="#475569"
                fontSize="10"
                fontFamily="JetBrains Mono"
                textAnchor="end"
              >
                {p.toFixed(digits)}
              </text>
            </g>
          );
        })}

        {/* 2. Left Volume Profile (from fab.png) */}
        {volumeProfileBins.bins.map((bin, idx) => {
          const y = priceToY(bin.price);
          const width = (bin.volume / volumeProfileBins.maxBinVol) * (paddingLeft - 8);
          return (
            <g key={idx}>
              <rect
                x={4}
                y={y - 4}
                width={width}
                height={7}
                fill="#27354f"
                opacity={0.5}
                rx={1}
              />
            </g>
          );
        })}
        <line
          x1={paddingLeft}
          y1={paddingTop}
          x2={paddingLeft}
          y2={chartHeight - paddingBottom}
          stroke="#1f2d47"
          strokeWidth="1"
        />

        {/* Heatmap Background Horizontal Liquidity Bands: Red for Sell / Ask, Green for Buy / Bid (fade vs thick) */}
        {showLiquidityClusters && (
          <g opacity={0.75}>
            {heatmapData.pools.map((pool, pIdx) => {
              const y = priceToY(pool.price);
              const isAsk = pool.side === 'ask'; // Ask = Sell (Red), Bid = Buy (Green)
              const poolAmount = pool.volume || 100;
              const intensity = Math.min(1, Math.max(0.12, poolAmount / 450));
              const poolColor = isAsk ? '#ef4444' : '#22c55e'; // Red for sell, Green for buy
              const poolCoreColor = isAsk ? '#f87171' : '#4ade80';

              // If strong amount: thick rich color (height 16px, opacity 0.55)
              // If low amount: light faded color (height 8px, opacity 0.16)
              const bandHeight = 8 + intensity * 8;
              const bandOpacity = 0.14 + intensity * 0.32;
              const coreOpacity = 0.25 + intensity * 0.50;

              return (
                <g key={`hm-pool-${pIdx}`}>
                  {/* Outer band glow */}
                  <rect
                    x={paddingLeft}
                    y={y - bandHeight / 2}
                    width={Math.max(10, chartWidth - paddingLeft - paddingRight)}
                    height={bandHeight}
                    fill={poolColor}
                    opacity={bandOpacity}
                  />
                  {/* Intense inner core */}
                  <rect
                    x={paddingLeft}
                    y={y - 2.5}
                    width={Math.max(10, chartWidth - paddingLeft - paddingRight)}
                    height={5}
                    fill={poolCoreColor}
                    opacity={coreOpacity}
                  />
                  {/* Subtle edge line */}
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={chartWidth - paddingRight}
                    y2={y}
                    stroke={poolCoreColor}
                    strokeWidth={1.0 + intensity * 1.2}
                    strokeDasharray="4 2"
                    opacity={0.5 + intensity * 0.4}
                  />
                </g>
              );
            })}

            {/* Strictly Necessary Expected Move Marker (Printed ONLY when active setup/magnet exists, max 1) */}
            {(() => {
              const vaar = modelOutput.valueAreaAbsorptionReclaim || modelOutput.sniperEdge?.valueAreaAbsorptionReclaim;
              const sweepAudit = modelOutput.sniperEdge?.liquiditySweepAudit;
              const current = snapshot.currentPrice;
              const pipMult = instCfg.pipMultiplier || 10;

              // Priority 1: Active Defended Reversal Level
              if (vaar && vaar.status !== 'INSIDE_VALUE_EQUILIBRIUM' && vaar.defendedLevel) {
                const distToDefended = Math.abs((current - vaar.defendedLevel) * pipMult);
                if (distToDefended <= 12) {
                  const y = priceToY(vaar.defendedLevel);
                  const isShort = vaar.activeSide === 'SHORT_ABOVE_VAH';
                  return (
                    <g pointerEvents="none" key="active-reversal-badge">
                      <rect
                        x={paddingLeft + 4}
                        y={y - 8}
                        width={isMobile ? 88 : 108}
                        height={16}
                        fill={isShort ? '#2a070e' : '#042416'}
                        fillOpacity={0.94}
                        stroke={isShort ? '#ef4444' : '#10b981'}
                        strokeWidth={1.1}
                        rx={3}
                      />
                      <rect x={paddingLeft + 4} y={y - 8} width={3} height={16} fill={isShort ? '#ef4444' : '#10b981'} rx={1} />
                      <text
                        x={paddingLeft + 11}
                        y={y + 3.5}
                        fill="#ffffff"
                        fontSize={isMobile ? '7.5' : '8.2'}
                        fontFamily="JetBrains Mono"
                        fontWeight="bold"
                      >
                        ↩️ REVERSAL ({vaar.defendedLevel.toFixed(digits)})
                      </text>
                    </g>
                  );
                }
              }

              // Active Attracting Liquidity Magnet (Shows where price is currently attracted toward)
              const magnetPrice = sweepAudit?.unclaimedAttractingPoolPrice;
              if (magnetPrice) {
                const distPips = Math.abs((magnetPrice - current) * pipMult);
                if (distPips >= 4) {
                  const y = priceToY(magnetPrice);
                  return (
                    <g pointerEvents="none" key="active-magnet-badge">
                      <rect
                        x={paddingLeft + 4}
                        y={y - 8}
                        width={isMobile ? 86 : 106}
                        height={16}
                        fill="#210c36"
                        fillOpacity={0.94}
                        stroke="#a855f7"
                        strokeWidth={1.1}
                        rx={3}
                      />
                      <rect x={paddingLeft + 4} y={y - 8} width={3} height={16} fill="#a855f7" rx={1} />
                      <text
                        x={paddingLeft + 11}
                        y={y + 3.5}
                        fill="#ffffff"
                        fontSize={isMobile ? '7.5' : '8.2'}
                        fontFamily="JetBrains Mono"
                        fontWeight="bold"
                      >
                        🧲 MAGNET ({magnetPrice.toFixed(digits)})
                      </text>
                    </g>
                  );
                }
              }

              return null;
            })()}
          </g>
        )}

        {/* 3. Value Area Horizontal Levels (POC, VAH, VAL, INV) - Extended across chart with tags in right price margin */}
        {/* Value Area High (VAH) - Red for Sell Resistance Ceiling */}
        {modelOutput.valueStructure.vah && (
          <g>
            <line
              x1={paddingLeft}
              y1={priceToY(modelOutput.valueStructure.vah)}
              x2={chartWidth - paddingRight}
              y2={priceToY(modelOutput.valueStructure.vah)}
              stroke="#ef4444"
              strokeDasharray="4 4"
              strokeWidth="1.2"
              opacity={0.8}
            />
            {/* Extended to right margin: never covers candles */}
            <rect
              x={chartWidth - paddingRight + 2}
              y={priceToY(modelOutput.valueStructure.vah) - 9}
              width={Math.max(50, paddingRight - 4)}
              height={18}
              fill="#220b0e"
              stroke="#ef4444"
              strokeWidth="0.8"
              rx={2}
            />
            <text
              x={chartWidth - paddingRight / 2}
              y={priceToY(modelOutput.valueStructure.vah) + 3.5}
              fill="#f87171"
              fontSize={isMobile ? '7.5' : '8.5'}
              fontFamily="JetBrains Mono"
              fontWeight="bold"
              textAnchor="middle"
            >
              VAH {modelOutput.valueStructure.vah.toFixed(digits)}
            </text>
          </g>
        )}

        {/* Fair Value Center (POC) - Neutral slate */}
        {modelOutput.valueStructure.poc && (
          <g>
            <line
              x1={paddingLeft}
              y1={priceToY(modelOutput.valueStructure.poc)}
              x2={chartWidth - paddingRight}
              y2={priceToY(modelOutput.valueStructure.poc)}
              stroke="#94a3b8"
              strokeWidth="1.2"
              opacity={0.7}
            />
            {/* Extended to right margin: never covers candles */}
            <rect
              x={chartWidth - paddingRight + 2}
              y={priceToY(modelOutput.valueStructure.poc) - 9}
              width={Math.max(50, paddingRight - 4)}
              height={18}
              fill="#0d1522"
              stroke="#475569"
              strokeWidth="0.8"
              rx={2}
            />
            <text
              x={chartWidth - paddingRight / 2}
              y={priceToY(modelOutput.valueStructure.poc) + 3.5}
              fill="#cbd5e1"
              fontSize={isMobile ? '7.5' : '8.5'}
              fontFamily="JetBrains Mono"
              fontWeight="bold"
              textAnchor="middle"
            >
              POC {modelOutput.valueStructure.poc.toFixed(digits)}
            </text>
          </g>
        )}

        {/* Value Area Low (VAL) - Green for Buy Support Floor */}
        {modelOutput.valueStructure.val && (
          <g>
            <line
              x1={paddingLeft}
              y1={priceToY(modelOutput.valueStructure.val)}
              x2={chartWidth - paddingRight}
              y2={priceToY(modelOutput.valueStructure.val)}
              stroke="#22c55e"
              strokeDasharray="4 4"
              strokeWidth="1.2"
              opacity={0.8}
            />
            {/* Extended to right margin: never covers candles */}
            <rect
              x={chartWidth - paddingRight + 2}
              y={priceToY(modelOutput.valueStructure.val) - 9}
              width={Math.max(50, paddingRight - 4)}
              height={18}
              fill="#081d13"
              stroke="#22c55e"
              strokeWidth="0.8"
              rx={2}
            />
            <text
              x={chartWidth - paddingRight / 2}
              y={priceToY(modelOutput.valueStructure.val) + 3.5}
              fill="#4ade80"
              fontSize={isMobile ? '7.5' : '8.5'}
              fontFamily="JetBrains Mono"
              fontWeight="bold"
              textAnchor="middle"
            >
              VAL {modelOutput.valueStructure.val.toFixed(digits)}
            </text>
          </g>
        )}

        {/* Invalidation Level (Hard red line) - Extended to right margin */}
        {modelOutput.invalidation.price && (
          <g>
            <line
              x1={paddingLeft}
              y1={priceToY(modelOutput.invalidation.price)}
              x2={chartWidth - paddingRight}
              y2={priceToY(modelOutput.invalidation.price)}
              stroke="#ef4444"
              strokeWidth="1.5"
              strokeDasharray="5 3"
            />
            {/* Extended to right margin: never covers candles */}
            <rect
              x={chartWidth - paddingRight + 2}
              y={priceToY(modelOutput.invalidation.price) - 9}
              width={Math.max(50, paddingRight - 4)}
              height={18}
              fill="#2b0e0e"
              stroke="#ef4444"
              strokeWidth="0.8"
              rx={2}
            />
            <text
              x={chartWidth - paddingRight / 2}
              y={priceToY(modelOutput.invalidation.price) + 3.5}
              fill="#f87171"
              fontSize={isMobile ? '7.5' : '8.5'}
              fontFamily="JetBrains Mono"
              fontWeight="bold"
              textAnchor="middle"
            >
              INV {modelOutput.invalidation.price.toFixed(digits)}
            </text>
          </g>
        )}

        {/* 4. Candlesticks */}
        {displayCandles.map((candle, idx) => {
          const x = getCandleX(idx, chartWidth);
          const bodyWidth = Math.max(4.5, Math.min(12, candleStep * 0.7));
          const yOpen = priceToY(candle.open);
          const yClose = priceToY(candle.close);
          const yHigh = priceToY(candle.high);
          const yLow = priceToY(candle.low);
          const isBull = candle.close >= candle.open;
          const bodyY = Math.min(yOpen, yClose);
          const bodyHeight = Math.max(2.5, Math.abs(yClose - yOpen));
          const candleColor = isBull ? '#22c55e' : '#ef4444';
          const isLast = idx === displayCandles.length - 1;

          return (
            <g key={`candle-${candle.timestamp}-${idx}`} className="cursor-pointer">
              {/* Wick */}
              <line
                x1={x}
                y1={yHigh}
                x2={x}
                y2={yLow}
                stroke={candleColor}
                strokeWidth={isLast ? "1.8" : "1.2"}
              />
              {/* Body */}
              <rect
                x={x - bodyWidth / 2}
                y={bodyY}
                width={bodyWidth}
                height={bodyHeight}
                fill={candleColor}
                stroke={candleColor}
                rx={0.5}
              />

              {/* Active Current Forming Candle Indicator */}
              {isLast && (
                <g pointerEvents="none">
                  {/* Pulsing live tick dot at current close */}
                  <circle
                    cx={x}
                    cy={yClose}
                    r={3.5}
                    fill="#38bdf8"
                    stroke="#ffffff"
                    strokeWidth="1"
                    className="animate-pulse"
                  />
                  {/* Live Forming badge above candle */}
                  <rect
                    x={x - 22}
                    y={yHigh - 16}
                    width={44}
                    height={12}
                    fill="#082f49"
                    fillOpacity={0.92}
                    stroke="#38bdf8"
                    strokeWidth="0.8"
                    rx={2}
                  />
                  <text
                    x={x}
                    y={yHigh - 7.5}
                    fill="#7dd3fc"
                    fontSize="7"
                    fontFamily="JetBrains Mono"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    FORMING
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* 5. Big Market-Moving Institutional Contracts & Order Flow Candle Patterns (pp1.PNG & pp2.PNG)
            Strictly filtered to ONLY the top 4–5 highest-impact institutional orders so the chart is never full of bubbles */}
        {showBubbles &&
          (() => {
            const containerWidth = chartWidth;

            // Balanced dual-sided selection: guarantee both Green (Bid Absorption / Reclaim) and Red (Ask Absorption / Capping) are represented
            const visibleBubbles = [...bubbles].filter(
              (b) =>
                b.candleIndex >= candleStartOffset &&
                ((b.volume || 0) >= 480 || b.impactClassification === 'MARKET_MOVING' || b.isAbsorption)
            );

            const buys = visibleBubbles.filter((b) => b.side === 'buy').sort((a, b) => (b.volume || 0) - (a.volume || 0));
            const sells = visibleBubbles.filter((b) => b.side === 'sell').sort((a, b) => (b.volume || 0) - (a.volume || 0));

            const topMarketMovingClusters: FootprintBubble[] = [];
            const maxBubbles = isMobile ? 3 : 5;

            // 1. Guarantee top Green Buy Absorption / Cluster is included if present
            if (buys[0]) {
              topMarketMovingClusters.push(buys[0]);
            }

            // 2. Guarantee top Red Sell Absorption / Cluster is included if present (spaced >= 3 candles)
            for (const s of sells) {
              if (!topMarketMovingClusters.some((existing) => Math.abs(existing.candleIndex - s.candleIndex) < 3)) {
                topMarketMovingClusters.push(s);
                break;
              }
            }

            // 3. Fill remaining slots with the highest volume non-adjacent clusters
            const remaining = visibleBubbles
              .filter((b) => !topMarketMovingClusters.some((existing) => existing.id === b.id))
              .sort((a, b) => (b.volume || 0) - (a.volume || 0));

            for (const b of remaining) {
              if (topMarketMovingClusters.length >= maxBubbles) break;
              if (!topMarketMovingClusters.some((existing) => Math.abs(existing.candleIndex - b.candleIndex) < 3)) {
                topMarketMovingClusters.push(b);
              }
            }

            return topMarketMovingClusters.map((bubble, bIdx) => {
              // Find matching candle in displayCandles by timestamp or offset index
              let candleIdx = -1;
              if (bubble.timestamp) {
                candleIdx = displayCandles.findIndex(
                  (c) => Math.abs(c.timestamp - bubble.timestamp) < 5 * 60 * 1000
                );
              }
              if (candleIdx === -1) {
                candleIdx = Math.max(
                  0,
                  Math.min(displayCandles.length - 1, bubble.candleIndex - candleStartOffset)
                );
              }

              const candle = displayCandles[candleIdx];
              if (!candle) return null;

              const x = getCandleX(candleIdx, containerWidth);
              const isBullCandle = candle.close >= candle.open;
              const bodyTop = Math.max(candle.open, candle.close);
              const bodyBottom = Math.min(candle.open, candle.close);
              const bodyMid = (bodyTop + bodyBottom) / 2;

              // Determine exact pattern & vertical anchor from pp1.PNG (Bearish Candles) & pp2.PNG (Bullish Candles)
              const placement =
                bubble.patternPlacement ||
                (bubble.price > bodyTop
                  ? 'UPPER_WICK'
                  : bubble.price < bodyBottom
                  ? 'LOWER_WICK'
                  : 'BODY');

              let anchorPrice = bubble.price;
              if (placement === 'UPPER_WICK') {
                anchorPrice = Math.min(candle.high, Math.max(bodyTop, (candle.high + bodyTop) / 2));
              } else if (placement === 'LOWER_WICK') {
                anchorPrice = Math.max(candle.low, Math.min(bodyBottom, (candle.low + bodyBottom) / 2));
              } else {
                anchorPrice = bodyMid;
              }

              const y = priceToY(anchorPrice);
              const isBuy = bubble.side === 'buy';
              const contracts = bubble.volume || 680;
              const intensity = Math.min(1, Math.max(0.35, (contracts - 450) / 750));

              const mainRadius = Math.max(8, Math.min(candleStep * 0.85, 13.5));
              const secondaryRadius = mainRadius * 0.64;
              const secondaryOffsetY =
                placement === 'UPPER_WICK'
                  ? -mainRadius * 0.72
                  : placement === 'LOWER_WICK'
                  ? mainRadius * 0.72
                  : -mainRadius * 0.78;
              const tertiaryOffsetY =
                placement === 'BODY' ? mainRadius * 0.78 : secondaryOffsetY * 0.45;

              // Strictly GREEN for Buy orders, RED/VIOLET-RED for Sell orders
              const bubbleColor = isBuy ? '#22c55e' : '#ef4444';
              const coreColor = isBuy ? '#16a34a' : '#dc2626';
              const strokeColor = isBuy ? '#4ade80' : '#f87171';

              const patternTitle =
                bubble.patternLabel ||
                (placement === 'BODY'
                  ? (isBuy ? 'Acceptance (Bullish Body)' : 'Acceptance (Bearish Body)')
                  : placement === 'LOWER_WICK'
                  ? (isBuy ? 'BUY ABSORPTION' : 'Absorption (Continuation)')
                  : (isBuy ? 'Absorption (Continuation)' : 'SELL ABSORPTION'));

              const tagY =
                placement === 'UPPER_WICK'
                  ? Math.max(paddingTop + 14, priceToY(candle.high) - 18)
                  : placement === 'LOWER_WICK'
                  ? Math.min(chartHeight - paddingBottom - 8, priceToY(candle.low) + 22)
                  : Math.max(paddingTop + 14, priceToY(candle.high) - 16);

              return (
                <g
                  key={`bubble-${bubble.id}-${bIdx}`}
                  className="transition-all cursor-pointer"
                  onMouseEnter={() =>
                    setHoveredBubble({
                      ...bubble,
                      candleIndex: candleIdx,
                      price: anchorPrice,
                      patternLabel: patternTitle,
                    })
                  }
                  onMouseLeave={() => setHoveredBubble(null)}
                >
                  {/* Secondary Stacked Bubble (Matching the 2-bubble / 3-bubble stacked signature in pp1.PNG & pp2.PNG) */}
                  <circle
                    cx={x}
                    cy={y + secondaryOffsetY}
                    r={secondaryRadius}
                    fill={bubbleColor}
                    fillOpacity={0.28 + intensity * 0.25}
                    stroke={strokeColor}
                    strokeWidth={1.3}
                    strokeOpacity={0.85}
                  />

                  {/* For Acceptance pattern inside candle body, render the 3rd symmetric stacked bubble as shown in pp1.PNG & pp2.PNG */}
                  {placement === 'BODY' && (
                    <circle
                      cx={x}
                      cy={y + tertiaryOffsetY}
                      r={secondaryRadius * 0.9}
                      fill={bubbleColor}
                      fillOpacity={0.25 + intensity * 0.22}
                      stroke={strokeColor}
                      strokeWidth={1.2}
                      strokeOpacity={0.8}
                    />
                  )}

                  {/* Primary High-Impact Institutional Contract Bubble */}
                  <circle
                    cx={x}
                    cy={y}
                    r={mainRadius}
                    fill={bubbleColor}
                    fillOpacity={0.38 + intensity * 0.32}
                    stroke={strokeColor}
                    strokeWidth={2.0}
                    strokeOpacity={0.95}
                  />

                  {/* Glowing Inner Density Core */}
                  <circle
                    cx={x}
                    cy={y}
                    r={mainRadius * 0.42}
                    fill={coreColor}
                    fillOpacity={0.65}
                  />

                  {/* Contract Lot Size inside Primary Bubble */}
                  <text
                    x={x}
                    y={y + 2.8}
                    fill="#ffffff"
                    fontSize="7.5"
                    fontFamily="JetBrains Mono"
                    textAnchor="middle"
                    fontWeight="bold"
                    pointerEvents="none"
                  >
                    {contracts >= 1000 ? `${(contracts / 1000).toFixed(1)}k` : contracts}
                  </text>

                  {/* Compact Pattern Badge (BID ABSORPTION / ASK ABSORPTION / ACCEPTANCE / REJECTION) */}
                  {(() => {
                    const tagWidth = Math.max(90, Math.min(125, patternTitle.length * 5.6 + 12));
                    return (
                      <g pointerEvents="none">
                        <rect
                          x={x - tagWidth / 2}
                          y={tagY - 9}
                          width={tagWidth}
                          height={13}
                          fill="#080d18"
                          fillOpacity={0.92}
                          stroke={strokeColor}
                          strokeWidth="0.8"
                          rx={2.5}
                        />
                        <text
                          x={x}
                          y={tagY}
                          fill={strokeColor}
                          fontSize="6.6"
                          fontFamily="JetBrains Mono"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {patternTitle.toUpperCase()}
                        </text>
                      </g>
                    );
                  })()}
                </g>
              );
            });
          })()}

        {/* 7. Current Price Horizontal Line & Glow Tag */}
        {(() => {
          const y = priceToY(snapshot.currentPrice);
          const currentCandleX = getCandleX(displayCandles.length - 1, chartWidth);
          return (
            <g>
              {/* Subtle background reference line */}
              <line
                x1={paddingLeft}
                y1={y}
                x2={currentCandleX}
                y2={y}
                stroke="#06b6d4"
                strokeWidth="0.8"
                strokeDasharray="2 4"
                opacity={0.3}
              />
              {/* Clean active price projection across the open right margin space */}
              <line
                x1={currentCandleX}
                y1={y}
                x2={chartWidth - paddingRight}
                y2={y}
                stroke="#06b6d4"
                strokeWidth="1.4"
                strokeDasharray="3 2"
              />
              <rect
                x={chartWidth - paddingRight + 2}
                y={y - 9}
                width={Math.max(50, paddingRight - 4)}
                height={18}
                fill="#083344"
                stroke="#06b6d4"
                strokeWidth="1"
                rx={2}
              />
              <text
                x={chartWidth - paddingRight / 2}
                y={y + 3.5}
                fill="#67e8f9"
                fontSize={isMobile ? '8.5' : '10'}
                fontFamily="JetBrains Mono"
                fontWeight="bold"
                textAnchor="middle"
              >
                {snapshot.currentPrice.toFixed(digits)}
              </text>
            </g>
          );
        })()}

        {/* 8. SNIPER EDGE & EXHAUSTION OVERLAY */}
        {showSniperOverlay && (
          <g className="transition-all pointer-events-none">
            {/* Upper Auction Edge (VAH) Shaded Ceiling Band - Extended across candle chart */}
            {modelOutput.valueStructure.vah && (
              <g>
                <rect
                  x={paddingLeft}
                  y={priceToY(modelOutput.valueStructure.vah) - 6}
                  width={Math.max(10, chartWidth - paddingLeft - paddingRight)}
                  height={12}
                  fill="#ef4444"
                  fillOpacity={0.06}
                />
                <line
                  x1={paddingLeft}
                  y1={priceToY(modelOutput.valueStructure.vah)}
                  x2={chartWidth - paddingRight}
                  y2={priceToY(modelOutput.valueStructure.vah)}
                  stroke="#ef4444"
                  strokeWidth="1.6"
                  strokeDasharray="5 3"
                  opacity={0.7}
                />
              </g>
            )}

            {/* Lower Auction Edge (VAL) Shaded Floor Band - Extended across candle chart */}
            {modelOutput.valueStructure.val && (
              <g>
                <rect
                  x={paddingLeft}
                  y={priceToY(modelOutput.valueStructure.val) - 6}
                  width={Math.max(10, chartWidth - paddingLeft - paddingRight)}
                  height={12}
                  fill="#10b981"
                  fillOpacity={0.06}
                />
                <line
                  x1={paddingLeft}
                  y1={priceToY(modelOutput.valueStructure.val)}
                  x2={chartWidth - paddingRight}
                  y2={priceToY(modelOutput.valueStructure.val)}
                  stroke="#10b981"
                  strokeWidth="1.6"
                  strokeDasharray="5 3"
                  opacity={0.7}
                />
              </g>
            )}

            {/* If Sniper Edge is qualified, plot Entry Callout & Projections */}
            {modelOutput.sniperEdge.isEdgeQualified && (() => {
              const edge = modelOutput.sniperEdge;
              const exhaust = modelOutput.exhaustion;
              const width = chartWidth;
              const rawExIdx = (exhaust.exhaustionCandleIndex ?? candles.length - 2) - candleStartOffset;
              const exIdx = Math.max(0, Math.min(displayCandles.length - 1, rawExIdx));
              const exX = getCandleX(exIdx, width);
              const isBuy = edge.triggerAction === 'SNIPER_BUY';

              const entryY = priceToY(edge.optimalEntry);
              const tp1Y = priceToY(edge.targetTP1);
              const tp2Y = priceToY(edge.targetTP2);
              const tp3Y = priceToY(edge.targetTP3);

              const tp1Hit = !!lifecycle?.tp1Hit;
              const tp2Hit = !!lifecycle?.tp2Hit;
              const tp3Hit = !!lifecycle?.tp3Hit;

              // Trailed stop loss: once TP1 is hit, stop loss is trailed to Breakeven (entry price)
              const effectiveSlPrice = tp1Hit ? edge.optimalEntry : edge.hardStopLoss;
              const slY = priceToY(effectiveSlPrice);

              const boxColor = isBuy ? '#10b981' : '#ef4444';
              const boxBg = isBuy ? '#041d16' : '#22080a';
              const hudWidth = Math.min(355, Math.max(210, width - paddingLeft - paddingRight - 12));

              const isAllCompleted = lifecycle?.allTargetsCompleted || edge.isAchieved || isSignalDismissed || lifecycle?.waitingForNextSetup;
              const totalSecured = lifecycle?.totalPipsSecured ?? edge.achievedPips ?? 28;
              const countdown = lifecycle?.nextSetupCountdown ?? 18;

              // IF ALL TARGETS COMPLETED OR RETIRED: REMOVE ACTIVE SIGNAL FROM CHART & SHOW CLEAN RETIRED / WAITING STATE
              if (isAllCompleted) {
                const bannerW = Math.min(420, Math.max(220, width - paddingLeft - paddingRight - 12));
                return (
                  <g key="sniper-achieved-waiting" className="transition-all pointer-events-none">
                    {/* Subtle dashed marker indicating target completion level */}
                    <line
                      x1={exX}
                      y1={tp1Y}
                      x2={width - paddingRight}
                      y2={tp1Y}
                      stroke="#10b981"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                      opacity={0.3}
                    />
                    <g transform={`translate(${Math.max(paddingLeft + 6, width / 2 - bannerW / 2)}, 12)`}>
                      <rect
                        x={0}
                        y={0}
                        width={bannerW}
                        height={36}
                        fill="#031610"
                        stroke="#10b981"
                        strokeWidth="1.4"
                        rx={6}
                      />
                      <text
                        x={bannerW / 2}
                        y={15}
                        fill="#6ee7b7"
                        fontSize={isMobile ? '7.5' : '9.5'}
                        fontFamily="JetBrains Mono"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        🏆 ALL TARGETS COMPLETED (+{totalSecured}p) · SIGNAL REMOVED
                      </text>
                      <text
                        x={bannerW / 2}
                        y={28}
                        fill="#38bdf8"
                        fontSize={isMobile ? '7' : '8'}
                        fontFamily="JetBrains Mono"
                        textAnchor="middle"
                      >
                        Waiting for next setup in {snapshot.instrument}... (~{countdown}s)
                      </text>
                    </g>
                  </g>
                );
              }

              const scalp = edge.orderFlowScalp;
              const hasScalp = !!scalp?.isTriggered;
              const hudHeight = hasScalp ? 46 : 34;

              return (
                <g key="sniper-execution-overlay" className="pointer-events-none">
                  {/* Clean Prediction HUD with Order Flow Scalp Entry Rules (No SL / TP clutter) */}
                  <g transform={`translate(${paddingLeft + 6}, ${paddingTop + 4})`}>
                    <rect
                      x={0}
                      y={0}
                      width={hudWidth}
                      height={hudHeight}
                      fill={boxBg}
                      fillOpacity={0.96}
                      stroke={boxColor}
                      strokeWidth="1.2"
                      rx={4}
                    />

                    {/* Left Accent Bar */}
                    <rect
                      x={0}
                      y={0}
                      width={4}
                      height={hudHeight}
                      fill={boxColor}
                      rx={2}
                    />

                    {/* Top Row: Prediction Direction & Confidence */}
                    <text
                      x={10}
                      y={13}
                      fill={boxColor}
                      fontSize={isMobile ? '7.5' : '8.8'}
                      fontFamily="JetBrains Mono"
                      fontWeight="bold"
                    >
                      PREDICTION: {isBuy ? 'BUY · BULLISH REVERSAL' : 'SELL · BEARISH REVERSAL'} ({edge.confidenceScore || 96}%)
                    </text>

                    {/* Order Flow Scalp Trigger at HVN & Wick Formation */}
                    {isWickSignalRemoved ? (
                      <>
                        <text
                          x={10}
                          y={26}
                          fill="#6ee7b7"
                          fontSize={isMobile ? '7.2' : '8.1'}
                          fontFamily="JetBrains Mono"
                          fontWeight="bold"
                        >
                          ✓ WICK SIGNAL EXECUTED & REMOVED · STANDING BY UNTIL NEXT SIGNAL
                        </text>
                        <text
                          x={10}
                          y={38}
                          fill="#38bdf8"
                          fontSize={isMobile ? '6.8' : '7.3'}
                          fontFamily="JetBrains Mono"
                        >
                          Signal retired to keep chart clean. Next setup will appear automatically.
                        </text>
                        {/* Quick restore button */}
                        <g
                          pointerEvents="all"
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestoreWickSignal();
                          }}
                          transform={`translate(${hudWidth - (isMobile ? 74 : 88)}, 6)`}
                        >
                          <rect
                            x={0}
                            y={0}
                            width={isMobile ? 68 : 82}
                            height={16}
                            fill="#0d1b2a"
                            stroke="#38bdf8"
                            strokeWidth="0.8"
                            rx={3}
                          />
                          <text
                            x={isMobile ? 34 : 41}
                            y={11.5}
                            fill="#7dd3fc"
                            fontSize={isMobile ? '6.8' : '7.5'}
                            fontFamily="JetBrains Mono"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            🔄 RE-SHOW
                          </text>
                        </g>
                      </>
                    ) : hasScalp && scalp ? (
                      <>
                        <text
                          x={10}
                          y={26}
                          fill="#f8fafc"
                          fontSize={isMobile ? '7.2' : '8.1'}
                          fontFamily="JetBrains Mono"
                          fontWeight="bold"
                        >
                          {isBuy ? 'LONG SCALP' : 'SHORT SCALP'} @ HVN ({scalp.hvnPrice.toFixed(digits)}) · {isBuy ? 'Enter BUY near lower wick' : 'Enter SELL near upper wick'}
                        </text>
                        <text
                          x={10}
                          y={38}
                          fill="#94a3b8"
                          fontSize={isMobile ? '6.8' : '7.3'}
                          fontFamily="JetBrains Mono"
                        >
                          Core: Aggressive vol absorbed, opposing liquidity holds · No waiting for candle close
                        </text>
                        {/* Instant Remove Signal Button */}
                        <g
                          pointerEvents="all"
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveWickSignal();
                          }}
                          transform={`translate(${hudWidth - (isMobile ? 86 : 102)}, 6)`}
                        >
                          <rect
                            x={0}
                            y={0}
                            width={isMobile ? 80 : 96}
                            height={16}
                            fill="#072016"
                            stroke="#10b981"
                            strokeWidth="0.9"
                            rx={3}
                          />
                          <text
                            x={isMobile ? 40 : 48}
                            y={11.5}
                            fill="#6ee7b7"
                            fontSize={isMobile ? '6.8' : '7.5'}
                            fontFamily="JetBrains Mono"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            ✓ REMOVE SIGNAL
                          </text>
                        </g>
                      </>
                    ) : (
                      <text
                        x={10}
                        y={26}
                        fill="#e2e8f0"
                        fontSize={isMobile ? '7.1' : '8'}
                        fontFamily="JetBrains Mono"
                      >
                        Setup: Sweep & Turn at {(edge.liquiditySweepAudit?.sweptLiquidityPrice ?? edge.edgePrice).toFixed(digits)} · Target: {edge.targetTP2.toFixed(digits)}
                      </text>
                    )}
                    {/* Real-Time Wick Formation Entry Indication on the Candlestick Chart (Directly at price, zero overlap) */}
                    {showWickIndication && !isWickSignalRemoved && (() => {
                      const scalpPrice = scalp?.entryZone.triggerPrice ?? edge.optimalEntry;
                      const isBuySetup = isBuy;

                      // Directly anchor to the live forming candle at the right
                      const formingIdx = displayCandles.length - 1;
                      const formingCandle = displayCandles[formingIdx];
                      const exactEntryX = getCandleX(formingIdx, chartWidth);

                      // Exact forming wick tip price & vertical position directly on the candle's true wick
                      const exactWickPrice = isBuySetup ? formingCandle.low : formingCandle.high;
                      const exactWickY = priceToY(exactWickPrice);
                      const slPrice = scalp?.stopLoss.price ?? edge.hardStopLoss;
                      const slY = priceToY(slPrice);
                      const themeColor = isBuySetup ? '#10b981' : '#ef4444';
                      const themeBg = isBuySetup ? '#041d14' : '#24080a';
                      const pipMult = instCfg.pipMultiplier || (snapshot.instrument === 'BTCUSD' ? 1 : 10);
                      const riskPips = Math.abs(Number(((exactWickPrice - slPrice) * pipMult).toFixed(1)));

                      // Position the Sniper Reticle directly at the forming wick tip with zero awkward offset
                      const reticleX = exactEntryX;
                      const reticleY = exactWickY;

                      // Place details badge cleanly to the right of the candle in the open margin, perfectly safe from top HUD
                      const badgeWidth = isMobile ? 168 : 194;
                      const badgeHeight = 40;
                      const hasRoomRight = chartWidth - paddingRight - (exactEntryX + 16) >= badgeWidth - 10;
                      
                      const badgeX = hasRoomRight
                        ? exactEntryX + 16
                        : Math.max(paddingLeft + 6, exactEntryX - badgeWidth - 16);

                      // Safe Y clamping: never overlaps the Top Prediction HUD (which ends at paddingTop + 50) and never clips off bottom
                      const topSafeBound = paddingTop + 52;
                      const bottomSafeBound = chartHeight - paddingBottom - badgeHeight - 4;
                      const badgeY = Math.max(topSafeBound, Math.min(bottomSafeBound, exactWickY - badgeHeight / 2));

                      return (
                        <g key="wick-formation-indication" className="pointer-events-none">
                          {/* 1. Horizontal Execution Ray starting directly from forming candle wick to price scale */}
                          <line
                            x1={exactEntryX}
                            y1={exactWickY}
                            x2={chartWidth - paddingRight}
                            y2={exactWickY}
                            stroke={themeColor}
                            strokeWidth="1.5"
                            strokeDasharray="4 3"
                            opacity={0.85}
                          />

                          {/* 2. Invalidation Stop-Loss Ray starting directly from forming candle entry */}
                          <line
                            x1={exactEntryX}
                            y1={slY}
                            x2={chartWidth - paddingRight}
                            y2={slY}
                            stroke="#ef4444"
                            strokeWidth="1.2"
                            strokeDasharray="3 3"
                            opacity={0.7}
                          />

                          {/* 3. Right price margin badge for Wick Entry */}
                          <rect
                            x={chartWidth - paddingRight + 2}
                            y={exactWickY - 10}
                            width={Math.max(56, paddingRight - 4)}
                            height={20}
                            fill={themeBg}
                            stroke={themeColor}
                            strokeWidth="1.2"
                            rx={2}
                          />
                          <text
                            x={chartWidth - paddingRight / 2}
                            y={exactWickY + 3.5}
                            fill={themeColor}
                            fontSize={isMobile ? '7.5' : '8.5'}
                            fontFamily="JetBrains Mono"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            🎯 {isBuySetup ? 'BUY' : 'SELL'} {exactWickPrice.toFixed(digits)}
                          </text>

                          {/* 4. Right price margin badge for SL beyond extreme */}
                          <rect
                            x={chartWidth - paddingRight + 2}
                            y={slY - 8}
                            width={Math.max(56, paddingRight - 4)}
                            height={16}
                            fill="#1e080b"
                            stroke="#ef4444"
                            strokeWidth="0.8"
                            rx={2}
                          />
                          <text
                            x={chartWidth - paddingRight / 2}
                            y={slY + 3.5}
                            fill="#f87171"
                            fontSize={isMobile ? '7' : '7.8'}
                            fontFamily="JetBrains Mono"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            🛑 SL {slPrice.toFixed(digits)}
                          </text>

                          {/* 5. Precision Leader Line from Wick Reticle directly to the Entry Details Badge */}
                          <line
                            x1={hasRoomRight ? reticleX + 10 : reticleX - 10}
                            y1={reticleY}
                            x2={hasRoomRight ? badgeX : badgeX + badgeWidth}
                            y2={badgeY + badgeHeight / 2}
                            stroke={themeColor}
                            strokeWidth="1.2"
                            strokeDasharray="2 2"
                            opacity={0.8}
                          />

                          {/* 6. Target Sniper Reticle Icon Located DIRECTLY on the Wick Tip */}
                          <g transform={`translate(${reticleX}, ${reticleY})`}>
                            {/* Sniper scope outer ring */}
                            <circle
                              r={9}
                              fill={themeBg}
                              fillOpacity={0.92}
                              stroke={themeColor}
                              strokeWidth="1.6"
                            />
                            {/* Animated pulsing outer radar ping */}
                            <circle
                              r={14}
                              fill="none"
                              stroke={themeColor}
                              strokeWidth="1.2"
                              strokeDasharray="3 2"
                              className="animate-ping"
                              opacity={0.65}
                            />
                            {/* Inner reticle ring */}
                            <circle
                              r={4.5}
                              fill="none"
                              stroke={themeColor}
                              strokeWidth="1.1"
                            />
                            {/* Center precision bullseye */}
                            <circle
                              r={2.2}
                              fill={themeColor}
                            />
                            {/* 4 Sniper Crosshair lines (North, South, East, West) */}
                            <line x1={-13} y1={0} x2={-6} y2={0} stroke={themeColor} strokeWidth="1.4" strokeLinecap="round" />
                            <line x1={6} y1={0} x2={13} y2={0} stroke={themeColor} strokeWidth="1.4" strokeLinecap="round" />
                            <line x1={0} y1={-13} x2={0} y2={-6} stroke={themeColor} strokeWidth="1.4" strokeLinecap="round" />
                            <line x1={0} y1={6} x2={0} y2={13} stroke={themeColor} strokeWidth="1.4" strokeLinecap="round" />
                          </g>

                          {/* 7. Exact Forming Wick Entry Details Badge (Always 100% visible, never clipped) */}
                          <g transform={`translate(${badgeX}, ${badgeY})`}>
                            <rect
                              x={0}
                              y={0}
                              width={badgeWidth}
                              height={badgeHeight}
                              fill={themeBg}
                              fillOpacity={0.96}
                              stroke={themeColor}
                              strokeWidth="1.3"
                              rx={4}
                            />
                            <rect
                              x={0}
                              y={0}
                              width={3.5}
                              height={badgeHeight}
                              fill={themeColor}
                              rx={1.5}
                            />
                            <text
                              x={8}
                              y={12.5}
                              fill={themeColor}
                              fontSize={isMobile ? '7.5' : '8.5'}
                              fontFamily="JetBrains Mono"
                              fontWeight="bold"
                            >
                              🎯 {isBuySetup ? 'BUY WICK ENTRY' : 'SELL WICK ENTRY'} ({exactWickPrice.toFixed(digits)})
                            </text>
                            <text
                              x={8}
                              y={23.5}
                              fill="#fde047"
                              fontSize={isMobile ? '7' : '7.6'}
                              fontFamily="JetBrains Mono"
                              fontWeight="bold"
                            >
                              🛑 SL: {slPrice.toFixed(digits)} · Risk: {riskPips}p
                            </text>
                            <text
                              x={8}
                              y={34}
                              fill="#6ee7b7"
                              fontSize={isMobile ? '6.8' : '7.3'}
                              fontFamily="JetBrains Mono"
                              fontWeight="bold"
                            >
                              ✓ Absorption Confirmed · Zero Float Target
                            </text>
                          </g>
                        </g>
                      );
                    })()}
                  </g>
                </g>
              );
            })()}

            {/* When Premature Signal Guard is active (Unswept Liquidity Magnet still attracting price), show unobtrusive status badge */}
            {!modelOutput.sniperEdge.isEdgeQualified && modelOutput.sniperEdge.liquiditySweepAudit && (
              <g transform={`translate(${paddingLeft + 6}, ${paddingTop + 4})`} className="pointer-events-none">
                <rect
                  x={0}
                  y={0}
                  width={Math.min(365, Math.max(210, chartWidth - paddingLeft - paddingRight - 12))}
                  height={30}
                  fill="#171307"
                  fillOpacity={0.92}
                  stroke="#f59e0b"
                  strokeWidth="1.1"
                  rx={4}
                />
                <rect x={0} y={0} width={4} height={30} fill="#f59e0b" rx={2} />
                <text x={10} y={12} fill="#fbbf24" fontSize={isMobile ? '7.3' : '8.5'} fontFamily="JetBrains Mono" fontWeight="bold">
                  {isMobile ? '⏳ SCANNING FOR LIQUIDITY SWEEP' : '⏳ PREMATURE SIGNAL BLOCKED · SCANNING FOR LIQUIDITY SWEEP'}
                </text>
                <text x={10} y={24} fill="#cbd5e1" fontSize={isMobile ? '7' : '7.8'} fontFamily="JetBrains Mono">
                  Magnet @ {(modelOutput.sniperEdge.liquiditySweepAudit.unclaimedAttractingPoolPrice ?? modelOutput.valueStructure.poc).toFixed(digits)} · Waiting for Stop-Hunt
                </text>
              </g>
            )}
          </g>
        )}



        {/* Interactive Crosshair Lines */}
        {mousePos && (
          <g pointerEvents="none">
            <line
              x1={paddingLeft}
              y1={mousePos.y}
              x2="100%"
              y2={mousePos.y}
              stroke="#64748b"
              strokeWidth="0.8"
              strokeDasharray="2 2"
            />
            <line
              x1={mousePos.x}
              y1={paddingTop}
              x2={mousePos.x}
              y2={chartHeight - paddingBottom}
              stroke="#64748b"
              strokeWidth="0.8"
              strokeDasharray="2 2"
            />
          </g>
        )}

        {/* Floating Tooltip for Hovered Market-Impact Big Contract Cluster */}
        {hoveredBubble && (
          <g 
            pointerEvents="none" 
            transform={`translate(${Math.max(paddingLeft + 6, Math.min(chartWidth - 265, getCandleX(hoveredBubble.candleIndex, chartWidth) - 130))}, ${Math.max(paddingTop + 10, priceToY(hoveredBubble.price) - 66)})`}
          >
            <rect
              x={0}
              y={0}
              width={255}
              height={58}
              fill="#0b121e"
              stroke={hoveredBubble.side === 'buy' ? '#22c55e' : '#ef4444'}
              strokeWidth="1.5"
              rx={4}
              filter="drop-shadow(0 4px 6px rgba(0,0,0,0.5))"
            />
            <text x={8} y={15} fill={hoveredBubble.side === 'buy' ? '#4ade80' : '#f87171'} fontSize="8.8" fontFamily="JetBrains Mono" fontWeight="bold">
              {hoveredBubble.patternLabel ? hoveredBubble.patternLabel.toUpperCase() : 'BIG INSTITUTIONAL ORDER'} · {hoveredBubble.side.toUpperCase()}
            </text>
            <text x={8} y={29} fill="#ffffff" fontSize="8.3" fontFamily="JetBrains Mono">
              Big Order: {hoveredBubble.volume} Contracts · Delta: {hoveredBubble.delta > 0 ? `+${hoveredBubble.delta}` : hoveredBubble.delta}
            </text>
            <text x={8} y={42} fill="#38bdf8" fontSize="8" fontFamily="JetBrains Mono">
              Location: {(hoveredBubble.patternPlacement || 'WICK').replace('_', ' ')} @ {hoveredBubble.price.toFixed(digits)}
            </text>
            <text x={8} y={53} fill="#94a3b8" fontSize="7.6" fontFamily="JetBrains Mono">
              Market Impact Score: {hoveredBubble.tradeImpactScore ?? 92}/100 (Market-Moving)
            </text>
          </g>
        )}
      </svg>
      </div>
    </div>
  );
};
