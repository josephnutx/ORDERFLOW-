import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { 
  Candle, 
  HeatmapSettings, 
  HeatmapPalette, 
  LiquidityPoolNode, 
  LiquiditySweepZone 
} from '../types/orderbook';
import { SniperModelOutput } from '../types/sniperModel';
import { InstrumentConfig, generateHeatmapMatrix } from '../services/mockDataGenerator';
import { 
  Flame, 
  Sliders, 
  Eye, 
  Maximize2, 
  Target, 
  ShieldAlert, 
  Sparkles, 
  ArrowUpRight, 
  ArrowDownRight,
  Info,
  Layers,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  TrendingUp,
  Clock,
  Activity,
  CheckCircle2,
  Zap,
  Compass,
  Radio
} from 'lucide-react';
import { tradingVoice } from '../services/tradingVoiceService';

interface LiquidityHeatmapVisualizerProps {
  candles: Candle[];
  instrument: InstrumentConfig;
  modelOutput: SniperModelOutput;
  currentPrice: number;
  onSelectSymbol?: (symbol: string) => void;
}

// Color palettes for heatmap rendering
export const PALETTES: Record<HeatmapPalette, {
  name: string;
  description: string;
  getColor: (intensity: number) => [number, number, number];
  getCssGradient: () => string;
}> = {
  bookmap_classic: {
    name: 'Viridis (Bookmap Standard)',
    description: 'Deep Purple (Low) → Indigo → Teal → Lime → Neon Yellow (Peak Wall)',
    getColor: (t: number): [number, number, number] => {
      const clamped = Math.max(0, Math.min(1, t));
      if (clamped < 0.2) {
        const f = clamped / 0.2;
        return [Math.round(24 + f * 5), Math.round(4 + f * 24), Math.round(43 + f * 41)];
      } else if (clamped < 0.45) {
        const f = (clamped - 0.2) / 0.25;
        return [Math.round(29 - f * 21), Math.round(28 + f * 89), Math.round(84 + f * 52)];
      } else if (clamped < 0.72) {
        const f = (clamped - 0.45) / 0.27;
        return [Math.round(8 + f * 69), Math.round(117 + f * 67), Math.round(136 - f * 90)];
      } else if (clamped < 0.90) {
        const f = (clamped - 0.72) / 0.18;
        return [Math.round(77 + f * 86), Math.round(184 + f * 46), Math.round(46 - f * 20)];
      } else {
        const f = (clamped - 0.90) / 0.10;
        return [Math.round(163 + f * 87), Math.round(230 - f * 26), Math.round(26 - f * 5)];
      }
    },
    getCssGradient: () => 'linear-gradient(to right, #18042b, #1b1c54, #087588, #4db82e, #a3e635, #facc15)',
  },
};

export const LiquidityHeatmapVisualizer: React.FC<LiquidityHeatmapVisualizerProps> = ({
  candles,
  instrument,
  modelOutput,
  currentPrice,
  onSelectSymbol,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Heatmap View Configuration (Locked to Viridis Bookmap Standard)
  const [settings, setSettings] = useState<HeatmapSettings>({
    palette: 'bookmap_classic',
    intensityMultiplier: 1.3,
    showCandles: true,
    showSweptZones: true,
    showPoolBadges: true,
    filterHighDensity: false,
    resolution: 'detailed',
  });

  const [hoverData, setHoverData] = useState<{
    x: number;
    y: number;
    price: number;
    candle: Candle;
    intensity: number;
    volume: number;
    side: 'ask' | 'bid';
    isWall?: boolean;
    isSwept?: boolean;
  } | null>(null);

  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [showExpectedMoves, setShowExpectedMoves] = useState<boolean>(true);
  const [hoveredExpectedMove, setHoveredExpectedMove] = useState<{
    id: string;
    badgeTitle: string;
    badgeDetail: string;
    explanation: string;
    symbol: string;
    price: number;
    color: string;
    targetDestinationPrice?: number;
    targetDestinationLabel?: string;
    direction?: 'UP' | 'DOWN';
    isReached?: boolean;
  } | null>(null);

  const [dismissedMoveIds, setDismissedMoveIds] = useState<Record<string, boolean>>({});

  // Generate Matrix for temporal view
  const rowCount = settings.resolution === 'detailed' ? 84 : settings.resolution === 'balanced' ? 64 : 45;
  const heatmapData = useMemo(() => {
    return generateHeatmapMatrix(candles, instrument, rowCount);
  }, [candles, instrument, rowCount]);

  const { columns, priceLevels, pools, sweepZones, minPrice, maxPrice, priceStep } = heatmapData;
  const digits = instrument.digits;

  // Expected Move Levels (Strict Necessity: Only printed where an active setup, test, or trigger actually exists)
  const expectedMoveLevels = useMemo(() => {
    const list: {
      id: string;
      price: number;
      symbol: string;
      moveType: 'REVERSAL' | 'RAPID_CONTINUATION' | 'TREND_CONTINUATION' | 'LIQUIDITY_MAGNET';
      badgeTitle: string;
      badgeDetail: string;
      explanation: string;
      color: string;
      bgColor: string;
      borderColor: string;
      targetDestinationPrice?: number;
      targetDestinationLabel?: string;
      direction?: 'UP' | 'DOWN';
      isReached?: boolean;
    }[] = [];

    const pipMult = instrument.pipMultiplier || 10;
    const vs = modelOutput.valueStructure;
    const mi = modelOutput.marketIntelligence;
    const current = currentPrice;
    const vaar = modelOutput.valueAreaAbsorptionReclaim || modelOutput.sniperEdge?.valueAreaAbsorptionReclaim;
    const sweepAudit = modelOutput.sniperEdge?.liquiditySweepAudit;
    const plr = modelOutput.liquidity?.plr || 'UP';

    // 1. REVERSAL (↩️) vs BYPASS WARNING (⚠️):
    // Dynamically checks if the wall is genuinely absorbing or if it is being pulled / consumed!
    if (vaar && vaar.status !== 'INSIDE_VALUE_EQUILIBRIUM') {
      const isShortAbove = vaar.activeSide === 'SHORT_ABOVE_VAH';
      const isLongBelow = vaar.activeSide === 'LONG_BELOW_VAL';
      const distToDefended = Math.abs((current - vaar.defendedLevel) * pipMult);

      if ((isShortAbove || isLongBelow) && distToDefended <= 12 && !dismissedMoveIds['active-defended-reversal']) {
        const isSpoofHigh = (mi?.liquidity?.spoofDetector?.spoofProbability ?? 0) >= 0.50;
        const isGenuineDiscovery = !!vaar.auctionContext?.isGenuinePriceDiscovery;
        const isBypassRisk = isSpoofHigh || isGenuineDiscovery;

        if (isBypassRisk) {
          list.push({
            id: 'active-defended-reversal',
            price: vaar.defendedLevel,
            symbol: '⚠️',
            moveType: 'REVERSAL',
            badgeTitle: isSpoofHigh ? '⚠️ PULLING (BYPASS RISK)' : '⚡ WALL CONSUMED (NO REVERSAL)',
            badgeDetail: isSpoofHigh
              ? `Phantom Limit Depth @ ${vaar.defendedLevel.toFixed(digits)} (Pull Rate: ${Math.round((mi?.liquidity?.spoofDetector?.spoofProbability ?? 0.6) * 100)}%)`
              : `Aggressive Initiative @ ${vaar.defendedLevel.toFixed(digits)} Overwhelming Limits`,
            explanation: isSpoofHigh
              ? 'Warning: High order pulling rate detected. Resting limit orders are being cancelled as price approaches without absorbing volume. Expecting price to bypass this level.'
              : 'Warning: Aggressive market orders are consuming the resting wall. Do NOT fade into active momentum. If this is a stop-hunt, wait for price to reject the extreme and reclaim value — the system will fire a Confirmed Reversal signal the moment the reclaim is proven.',
            color: isSpoofHigh ? '#facc15' : '#fb923c',
            bgColor: isSpoofHigh ? '#2a2205' : '#2b1206',
            borderColor: isSpoofHigh ? '#eab308' : '#ea580c',
          });
        } else {
          list.push({
            id: 'active-defended-reversal',
            price: vaar.defendedLevel,
            symbol: '↩️',
            moveType: 'REVERSAL',
            badgeTitle: vaar.status === 'ABSORPTION_AND_RECLAIM_TRIGGERED' ? '↩️ CONFIRMED REVERSAL' : '↩️ REVERSAL',
            badgeDetail: isShortAbove
              ? `Passive Seller Absorption @ ${vaar.defendedLevel.toFixed(digits)}`
              : `Passive Buyer Absorption @ ${vaar.defendedLevel.toFixed(digits)}`,
            explanation: isShortAbove
              ? 'Aggressive buyers halted by resting sell limit wall; failure to advance triggers downside reversal.'
              : 'Aggressive sellers halted by resting buy limit wall; failure to push lower triggers upside reclaim.',
            color: isShortAbove ? '#f87171' : '#34d399',
            bgColor: isShortAbove ? '#2b0e14' : '#08291b',
            borderColor: isShortAbove ? '#ef4444' : '#10b981',
          });
        }
      }
    } else if (modelOutput.sniperEdge?.isEdgeQualified) {
      // Sniper Edge is qualified at edgePrice
      const edgePrice = modelOutput.sniperEdge.edgePrice;
      const isBuyEdge = modelOutput.sniperEdge.triggerAction === 'SNIPER_BUY';
      const distToEdge = Math.abs((current - edgePrice) * pipMult);

      if (distToEdge <= 8 && !dismissedMoveIds['qualified-edge-reversal']) {
        list.push({
          id: 'qualified-edge-reversal',
          price: edgePrice,
          symbol: '↩️',
          moveType: 'REVERSAL',
          badgeTitle: '↩️ REVERSAL',
          badgeDetail: `${modelOutput.sniperEdge.edgeLabel} (${edgePrice.toFixed(digits)})`,
          explanation: `Qualified auction edge with multi-pillar confluence; expecting sharp reversal turn.`,
          color: isBuyEdge ? '#4ade80' : '#f87171',
          bgColor: isBuyEdge ? '#052912' : '#2b0e14',
          borderColor: isBuyEdge ? '#22c55e' : '#ef4444',
        });
      }
    }

    // 2. LIQUIDITY MAGNET (🧲): Shows where price is actively being attracted toward!
    const magnetTargetPrice = sweepAudit?.unclaimedAttractingPoolPrice 
      ?? (plr === 'UP' 
          ? pools.find((p) => p.side === 'ask' && p.price > current + 4 / pipMult)?.price
          : pools.find((p) => p.side === 'bid' && p.price < current - 4 / pipMult)?.price);

    if (magnetTargetPrice && !dismissedMoveIds['primary-magnet-target']) {
      const distPips = Math.abs((magnetTargetPrice - current) * pipMult);
      const isOverhead = magnetTargetPrice > current;
      // Auto-retire magnet once price reaches within 2.5 pips of the attracting cluster
      if (distPips > 2.5) {
        list.push({
          id: 'primary-magnet-target',
          price: magnetTargetPrice,
          symbol: '🧲',
          moveType: 'LIQUIDITY_MAGNET',
          badgeTitle: '🧲 MAGNET',
          badgeDetail: isOverhead
            ? `Attracting Buy-Stops (${distPips.toFixed(0)}p above)`
            : `Attracting Sell-Stops (${distPips.toFixed(0)}p below)`,
          explanation: `Price is attracted toward this resting liquidity pool @ ${magnetTargetPrice.toFixed(digits)} because large institutional orders seek this liquidity cluster to execute size.`,
          color: '#c084fc',
          bgColor: '#240f36',
          borderColor: '#a855f7',
        });
      }
    }

    // 3. RAPID CONTINUATION (⏩): Strictly ONLY when price is actively inside or transiting a Low Volume Node (LVN)
    const isInsideLvn = mi?.volumeProfile?.lvnState?.isInsideLvn;
    const currentLvnPrice = mi?.volumeProfile?.lvnState?.currentLvnPrice;
    if (isInsideLvn && currentLvnPrice) {
      const liveCandle = candles[candles.length - 1];
      // Live ongoing price flow: track whether current live price is advancing upward or descending downward
      const isOngoingUpward = liveCandle
        ? current > liveCandle.open || (current === liveCandle.open && current >= currentLvnPrice)
        : current >= currentLvnPrice || plr === 'UP';
      const direction: 'UP' | 'DOWN' = isOngoingUpward ? 'UP' : 'DOWN';

      // CRITICAL GUARANTEE:
      // For UPWARD move: Target MUST be strictly ABOVE the live current price (> current)
      // For DOWNWARD move: Target MUST be strictly BELOW the live current price (< current)
      let targetDestinationPrice: number;
      let targetDestinationLabel: string;

      if (isOngoingUpward) {
        // Search for the closest resting ask liquidity pool ABOVE the live current price
        const overheadAskPool = pools
          .filter((p) => p.side === 'ask' && p.price > current + 2 / pipMult)
          .sort((a, b) => a.price - b.price)[0];

        if (overheadAskPool) {
          targetDestinationPrice = overheadAskPool.price;
        } else if (vs?.vah && vs.vah > current + 2 / pipMult) {
          targetDestinationPrice = vs.vah;
        } else if (modelOutput.sniperEdge?.targetTP2 && modelOutput.sniperEdge.targetTP2 > current + 2 / pipMult) {
          targetDestinationPrice = modelOutput.sniperEdge.targetTP2;
        } else {
          targetDestinationPrice = Number((current + Math.max(16 / pipMult, priceStep * 10)).toFixed(digits));
        }
        targetDestinationLabel = 'Overhead HVN & Resting Asks';
      } else {
        // Search for the closest resting bid liquidity pool BELOW the live current price
        const lowerBidPool = pools
          .filter((p) => p.side === 'bid' && p.price < current - 2 / pipMult)
          .sort((a, b) => b.price - a.price)[0];

        if (lowerBidPool) {
          targetDestinationPrice = lowerBidPool.price;
        } else if (vs?.val && vs.val < current - 2 / pipMult) {
          targetDestinationPrice = vs.val;
        } else if (modelOutput.sniperEdge?.targetTP2 && modelOutput.sniperEdge.targetTP2 < current - 2 / pipMult) {
          targetDestinationPrice = modelOutput.sniperEdge.targetTP2;
        } else {
          targetDestinationPrice = Number((current - Math.max(16 / pipMult, priceStep * 10)).toFixed(digits));
        }
        targetDestinationLabel = 'Lower HVN & Resting Bids';
      }

      const distPips = Math.round(Math.abs(targetDestinationPrice - current) * pipMult);
      const arrowSymbol = isOngoingUpward ? '↗' : '↘';
      const isReached = distPips <= 2 || (isOngoingUpward ? current >= targetDestinationPrice : current <= targetDestinationPrice);

      // AUTO-RETIREMENT: Once target is reached, the LVN void transit is complete. 
      // Retire from chart to eliminate clutter unless still actively pending.
      if (!isReached && !dismissedMoveIds['active-lvn-transit']) {
        list.push({
          id: 'active-lvn-transit',
          price: currentLvnPrice,
          symbol: '⏩',
          moveType: 'RAPID_CONTINUATION',
          direction,
          targetDestinationPrice,
          targetDestinationLabel,
          badgeTitle: `⏩ RAPID CONTINUATION ➔ ${arrowSymbol} ${targetDestinationPrice.toFixed(digits)}`,
          badgeDetail: `Live ${current.toFixed(digits)} ➔ ${direction} to HVN ${targetDestinationPrice.toFixed(digits)} (${isOngoingUpward ? '+' : '-'}${distPips}p)`,
          explanation: `Price is transiting a Low Volume Node (LVN) liquidity vacuum with zero resting friction. Order flow accelerates in the live ongoing direction (${direction}) toward the next High Volume Node (HVN) @ ${targetDestinationPrice.toFixed(digits)} (${distPips} pips ${isOngoingUpward ? 'above' : 'below'} live price ${current.toFixed(digits)}) where resting depth resumes.`,
          color: '#fbbf24',
          bgColor: '#261b07',
          borderColor: '#f59e0b',
        });
      }
    }

    // 4. TREND CONTINUATION (↗️/↘️): Strictly ONLY when there is genuine breakout / discovery acceptance outside value
    if (vaar?.auctionContext.isGenuinePriceDiscovery) {
      const isUpside = current >= (vs?.vah ?? 0);
      const isDownside = current <= (vs?.val ?? Infinity);

      if (isUpside) {
        const direction: 'UP' = 'UP';
        const breakLevel = vs?.vah || current;
        // Search for overhead liquidity pool strictly ABOVE live current price
        const overheadPool = pools
          .filter((p) => p.side === 'ask' && p.price > current + 3 / pipMult)
          .sort((a, b) => a.price - b.price)[0];

        let targetDestinationPrice: number;
        if (overheadPool) {
          targetDestinationPrice = overheadPool.price;
        } else if (modelOutput.sniperEdge?.targetTP2 && modelOutput.sniperEdge.targetTP2 > current + 2 / pipMult) {
          targetDestinationPrice = modelOutput.sniperEdge.targetTP2;
        } else if (modelOutput.signal?.targetTP2 && modelOutput.signal.targetTP2 > current + 2 / pipMult) {
          targetDestinationPrice = modelOutput.signal.targetTP2;
        } else {
          targetDestinationPrice = Number((current + Math.max(22 / pipMult, priceStep * 14)).toFixed(digits));
        }

        const distPips = Math.round(Math.abs(targetDestinationPrice - current) * pipMult);
        const isReached = distPips <= 2 || current >= targetDestinationPrice;

        // AUTO-RETIREMENT: Once expansion target TP2 is reached, the breakout drive is completed.
        // Retire from chart to eliminate clutter unless still actively pending.
        if (!isReached && !dismissedMoveIds['genuine-trend-continuation']) {
          list.push({
            id: 'genuine-trend-continuation',
            price: breakLevel,
            symbol: '↗️',
            moveType: 'TREND_CONTINUATION',
            direction,
            targetDestinationPrice,
            targetDestinationLabel: 'Expansion Target TP2',
            badgeTitle: `↗️ CONTINUATION ➔ ↗ ${targetDestinationPrice.toFixed(digits)}`,
            badgeDetail: `Live ${current.toFixed(digits)} ➔ TP2 ${targetDestinationPrice.toFixed(digits)} (+${distPips}p above)`,
            explanation: `Rising volume and acceptance outside Value Area confirms genuine upside price discovery. Momentum continues expanding UPWARD directly toward institutional liquidity pool TP2 @ ${targetDestinationPrice.toFixed(digits)} (${distPips} pips above live price ${current.toFixed(digits)}). Counter-trend reversals are strictly blocked.`,
            color: '#38bdf8',
            bgColor: '#082738',
            borderColor: '#0284c7',
          });
        }
      } else if (isDownside) {
        const direction: 'DOWN' = 'DOWN';
        const breakLevel = vs?.val || current;
        // Search for lower liquidity pool strictly BELOW live current price
        const lowerPool = pools
          .filter((p) => p.side === 'bid' && p.price < current - 3 / pipMult)
          .sort((a, b) => b.price - a.price)[0];

        let targetDestinationPrice: number;
        if (lowerPool) {
          targetDestinationPrice = lowerPool.price;
        } else if (modelOutput.sniperEdge?.targetTP2 && modelOutput.sniperEdge.targetTP2 < current - 2 / pipMult) {
          targetDestinationPrice = modelOutput.sniperEdge.targetTP2;
        } else if (modelOutput.signal?.targetTP2 && modelOutput.signal.targetTP2 < current - 2 / pipMult) {
          targetDestinationPrice = modelOutput.signal.targetTP2;
        } else {
          targetDestinationPrice = Number((current - Math.max(22 / pipMult, priceStep * 14)).toFixed(digits));
        }

        const distPips = Math.round(Math.abs(current - targetDestinationPrice) * pipMult);
        const isReached = distPips <= 2 || current <= targetDestinationPrice;

        // AUTO-RETIREMENT: Once expansion target TP2 is reached, the breakout drive is completed.
        // Retire from chart to eliminate clutter unless still actively pending.
        if (!isReached && !dismissedMoveIds['genuine-trend-continuation']) {
          list.push({
            id: 'genuine-trend-continuation',
            price: breakLevel,
            symbol: '↘️',
            moveType: 'TREND_CONTINUATION',
            direction,
            targetDestinationPrice,
            targetDestinationLabel: 'Discount Expansion TP2',
            badgeTitle: `↘️ CONTINUATION ➔ ↘ ${targetDestinationPrice.toFixed(digits)}`,
            badgeDetail: `Live ${current.toFixed(digits)} ➔ TP2 ${targetDestinationPrice.toFixed(digits)} (-${distPips}p below)`,
            explanation: `Rising volume and acceptance outside Value Area confirms genuine downside price discovery. Momentum continues expanding DOWNWARD directly toward institutional liquidity pool TP2 @ ${targetDestinationPrice.toFixed(digits)} (${distPips} pips below live price ${current.toFixed(digits)}). Counter-trend reversals are strictly blocked.`,
            color: '#fb923c',
            bgColor: '#2e1205',
            borderColor: '#ea580c',
          });
        }
      }
    }

    return list;
  }, [pools, modelOutput, currentPrice, instrument, digits, dismissedMoveIds]);

  // Chart dimensions for temporal view
  const paddingLeft = 10;
  const paddingRight = 75; // Right price scale
  const paddingTop = 25;
  const paddingBottom = 32; // Bottom time scale

  // Helper to map price to Y coordinate
  const priceToY = useCallback((price: number, height: number) => {
    const innerHeight = height - paddingTop - paddingBottom;
    const ratio = (maxPrice - price) / (maxPrice - minPrice);
    return paddingTop + ratio * innerHeight;
  }, [maxPrice, minPrice, paddingTop, paddingBottom]);

  // Helper to map candle index to X coordinate
  const candleCount = columns.length;
  const getCandleX = useCallback((index: number, width: number) => {
    const usableWidth = width - paddingLeft - paddingRight;
    const step = usableWidth / Math.max(1, candleCount);
    return paddingLeft + index * step + step / 2;
  }, [candleCount, paddingLeft, paddingRight]);

  // Render 2D Heatmap Grid onto Canvas (Temporal Mode)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const usableWidth = width - paddingLeft - paddingRight;
    const usableHeight = height - paddingTop - paddingBottom;

    // Clear background
    ctx.fillStyle = '#0f051d';
    ctx.fillRect(0, 0, width, height);

    const colWidth = usableWidth / Math.max(1, candleCount);
    const rowHeight = usableHeight / Math.max(1, priceLevels.length);
    const colorFunc = PALETTES[settings.palette].getColor;

    // Draw Heatmap Cells
    columns.forEach((col, cIdx) => {
      const x = paddingLeft + cIdx * colWidth;

      col.levels.forEach((cell, rIdx) => {
        const y = height - paddingBottom - (rIdx + 1) * rowHeight;

        let intensity = cell.intensity * settings.intensityMultiplier;
        if (settings.filterHighDensity && intensity < 0.6) {
          intensity = intensity * 0.15;
        }
        intensity = Math.min(1.0, Math.max(0.01, intensity));

        const [r, g, b] = colorFunc(intensity);
        const alpha = Math.min(0.98, Math.max(0.2, 0.35 + intensity * 0.65));
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;

        ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(colWidth) + 1, Math.ceil(rowHeight) + 1);

        if (cell.isWall && intensity > 0.85) {
          ctx.fillStyle = `rgba(255, 255, 220, 0.3)`;
          ctx.fillRect(Math.floor(x), Math.floor(y + rowHeight * 0.3), Math.ceil(colWidth), Math.ceil(rowHeight * 0.4));
        }
      });
    });

    // Horizontal grid guides
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);

    for (let i = 0; i < 6; i++) {
      const y = paddingTop + (i * usableHeight) / 5;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }, [columns, priceLevels, settings, paddingLeft, paddingRight, paddingTop, paddingBottom, candleCount]);

  // Handle Canvas Resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      canvasRef.current.width = rect.width;
      canvasRef.current.height = rect.height;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mouse hover detection (Temporal Mode)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    const usableWidth = rect.width - paddingLeft - paddingRight;
    const usableHeight = rect.height - paddingTop - paddingBottom;

    if (x < paddingLeft || x > rect.width - paddingRight || y < paddingTop || y > rect.height - paddingBottom) {
      setHoverData(null);
      return;
    }

    const stepX = usableWidth / Math.max(1, candleCount);
    const colIdx = Math.floor((x - paddingLeft) / stepX);
    const clampedColIdx = Math.max(0, Math.min(candleCount - 1, colIdx));
    const col = columns[clampedColIdx];

    const ratioY = (y - paddingTop) / usableHeight;
    const priceAtCursor = maxPrice - ratioY * (maxPrice - minPrice);

    let closestCell = col.levels[0];
    let minDelta = Infinity;
    col.levels.forEach((lvl) => {
      const delta = Math.abs(lvl.price - priceAtCursor);
      if (delta < minDelta) {
        minDelta = delta;
        closestCell = lvl;
      }
    });

    setHoverData({
      x,
      y,
      price: closestCell.price,
      candle: col.candle,
      intensity: closestCell.intensity,
      volume: closestCell.volume,
      side: closestCell.side,
      isWall: closestCell.isWall,
      isSwept: closestCell.isSwept,
    });
  };

  const handleMouseLeave = () => {
    setMousePos(null);
    setHoverData(null);
  };

  // Top resting ask wall and top resting bid wall
  const topAskPool = pools.filter((p) => p.side === 'ask')[0];
  const topBidPool = pools.filter((p) => p.side === 'bid')[0];

  // Advanced Microstructure Order Flow Dynamics (NASDAQ Scalper System)
  const askPools = useMemo(() => pools.filter((p) => p.side === 'ask'), [pools]);
  const bidPools = useMemo(() => pools.filter((p) => p.side === 'bid'), [pools]);
  const totalAskVolume = useMemo(() => askPools.reduce((acc, p) => acc + p.volume, 0), [askPools]);
  const totalBidVolume = useMemo(() => bidPools.reduce((acc, p) => acc + p.volume, 0), [bidPools]);
  const totalDepthVolume = totalAskVolume + totalBidVolume;
  const bidDominancePct = totalDepthVolume > 0 ? Math.round((totalBidVolume / totalDepthVolume) * 100) : 50;
  const askDominancePct = 100 - bidDominancePct;

  // Path of Least Resistance calculation
  const pathOfLeastResistance = useMemo(() => {
    if (bidDominancePct >= 57) {
      return {
        direction: 'UP' as const,
        label: 'PATH OF LEAST RESISTANCE: UPWARD',
        badge: '🟢 UPWARD BIAS',
        friction: 'Thin Overhead Resistance',
        details: `Bid cushion holds ${bidDominancePct}% of resting depth (${totalBidVolume} lots) vs fragile Ask ceiling (${totalAskVolume} lots). Market requires significantly less volume to step upward.`,
      };
    } else if (askDominancePct >= 57) {
      return {
        direction: 'DOWN' as const,
        label: 'PATH OF LEAST RESISTANCE: DOWNWARD',
        badge: '🔴 DOWNWARD BIAS',
        friction: 'Heavy Overhead Wall',
        details: `Ask ceiling caps ${askDominancePct}% of resting depth (${totalAskVolume} lots) vs thin Bid cushion (${totalBidVolume} lots). Downward displacement offers least resistance.`,
      };
    } else {
      return {
        direction: 'BALANCED' as const,
        label: 'PATH OF LEAST RESISTANCE: BALANCED / RANGE',
        badge: '🟡 BALANCED DEPTH',
        friction: 'Symmetric Liquidity',
        details: `Bid cushion (${bidDominancePct}%) and Ask wall (${askDominancePct}%) are balanced. Price rotating within value area awaiting momentum ignition.`,
      };
    }
  }, [bidDominancePct, askDominancePct, totalBidVolume, totalAskVolume]);

  // Active Iceberg & Bid Reload Detection
  const activeIceberg = useMemo(() => {
    const dominantPool = (topBidPool?.volume || 0) >= (topAskPool?.volume || 0) ? topBidPool : topAskPool;
    if (dominantPool && dominantPool.volume >= 600) {
      return {
        isDetected: true,
        price: dominantPool.price,
        side: dominantPool.side,
        tranchesReloaded: Math.max(3, Math.round(dominantPool.volume / 120)),
        volumeAbsorbed: dominantPool.volume,
        label: `${dominantPool.side === 'bid' ? 'BID' : 'ASK'} ICEBERG RELOAD ACTIVE`,
      };
    }
    return {
      isDetected: false,
      price: currentPrice,
      side: 'bid' as const,
      tranchesReloaded: 0,
      volumeAbsorbed: 0,
      label: 'NORMAL VISIBLE DEPTH',
    };
  }, [topBidPool, topAskPool, currentPrice]);

  // Book Flip Polarity
  const isBookFlipped = useMemo(() => {
    const isAbovePoc = currentPrice > modelOutput.valueStructure.poc;
    return isAbovePoc && bidDominancePct > 53;
  }, [currentPrice, modelOutput.valueStructure.poc, bidDominancePct]);



  return (
    <div className="flex flex-col gap-3 w-full">
      {/* 1. Heatmap Toolbar */}
      <div className="bg-[#0b0e17] border border-[#1a2337] rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 shadow-md">
        {/* Title & Instrument Info */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-amber-500 via-orange-600 to-purple-700 flex items-center justify-center text-white shadow-sm shadow-orange-500/30 shrink-0">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-wide">
                2-DIMENSIONAL HEAT MAP ENGINE
              </span>
              <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-600/40 font-semibold">
                {instrument.symbol}
              </span>
              <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
                {instrument.name}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
              <span>Dual-Axis Visual Summary & Color Gradation Mapping</span>
              <span className="text-slate-600">·</span>
              <span className="text-cyan-400 font-mono font-semibold">
                Live {currentPrice.toFixed(digits)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2-DIMENSIONAL CONTINUOUS TEMPORAL ORDER FLOW STREAM (Bookmap Standard) */}
      <div className="flex flex-col gap-3">
          {/* Advanced Microstructure & Order Flow Dynamics Ribbon (NASDAQ Scalper Radar) */}
          <div className="bg-[#080d17] border border-cyan-500/30 rounded-xl p-3 shadow-md space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-[#141f33] text-xs font-mono">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                  MICROSTRUCTURE SCANNER:
                </span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border shadow-xs ${
                  pathOfLeastResistance.direction === 'UP'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                    : pathOfLeastResistance.direction === 'DOWN'
                    ? 'bg-red-950 text-red-300 border-red-500/50'
                    : 'bg-amber-950 text-amber-300 border-amber-500/50'
                }`}>
                  {pathOfLeastResistance.label}
                </span>
                <span className="text-[10px] text-slate-400 bg-[#0e1626] px-2 py-0.5 rounded border border-[#1b2842]">
                  Depth Ratio: <strong className="text-emerald-300">{bidDominancePct}% Bid</strong> vs <strong className="text-red-300">{askDominancePct}% Ask</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {activeIceberg.isDetected && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40 flex items-center gap-1 animate-pulse">
                    <span>🧊</span>
                    <span>{activeIceberg.label} @ {activeIceberg.price.toFixed(digits)}</span>
                  </span>
                )}
                {isBookFlipped && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                    <span>🔄</span>
                    <span>BOOK FLIP: BIDS DEFENDING POC</span>
                  </span>
                )}
              </div>
            </div>

            {/* Depth Cushion vs Ceiling Meter Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span>🛡️ Defended Bid Bed: {totalBidVolume} Lots ({bidDominancePct}%)</span>
                </span>
                <span className="text-slate-400 text-[10px] hidden sm:inline">
                  {pathOfLeastResistance.details}
                </span>
                <span className="text-red-400 font-semibold flex items-center gap-1">
                  <span>🔺 Overhead Ask Wall: {totalAskVolume} Lots ({askDominancePct}%)</span>
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#111928] overflow-hidden flex border border-[#1b263a]">
                <div
                  className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 transition-all duration-300"
                  style={{ width: `${bidDominancePct}%` }}
                />
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300"
                  style={{ width: `${askDominancePct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Secondary Filter & Sensitivity Bar */}
          <div className="bg-[#0e1320] border border-[#1a243a] rounded-lg px-3 py-2 flex flex-wrap items-center justify-between text-xs font-mono">
            {/* Quick Stats on Key Walls */}
            <div className="flex items-center gap-4">
              {topAskPool && (
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-slate-400">Y-Axis Resistance Wall:</span>
                  <span className="font-bold text-red-300">{topAskPool.price.toFixed(digits)}</span>
                  <span className="text-amber-400 text-[11px]">({topAskPool.volume} lots)</span>
                </div>
              )}
              {topBidPool && (
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-slate-400">Y-Axis Defended Bed:</span>
                  <span className="font-bold text-emerald-300">{topBidPool.price.toFixed(digits)}</span>
                  <span className="text-cyan-400 text-[11px]">({topBidPool.volume} lots)</span>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 font-sans">
              {/* Heat Multiplier */}
              <div className="flex items-center gap-1.5 bg-[#121827] px-2 py-0.5 rounded border border-[#1e273a]">
                <span className="text-[11px] text-slate-400">Heat:</span>
                <input
                  type="range"
                  min="0.6"
                  max="2.5"
                  step="0.1"
                  value={settings.intensityMultiplier}
                  onChange={(e) => setSettings((s) => ({ ...s, intensityMultiplier: parseFloat(e.target.value) }))}
                  className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
                <span className="text-[11px] font-mono text-amber-300">{settings.intensityMultiplier.toFixed(1)}x</span>
              </div>

              {/* Candles Toggle */}
              <button
                onClick={() => setSettings((s) => ({ ...s, showCandles: !s.showCandles }))}
                className={`px-2 py-0.5 text-xs font-semibold rounded border transition-colors ${
                  settings.showCandles ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40' : 'bg-[#121827] text-slate-400 border-[#1e273a]'
                }`}
              >
                Candles
              </button>

              {/* Sweep Zone Toggle */}
              <button
                onClick={() => setSettings((s) => ({ ...s, showSweptZones: !s.showSweptZones }))}
                className={`px-2 py-0.5 text-xs font-semibold rounded border transition-colors ${
                  settings.showSweptZones ? 'bg-red-950/60 text-red-300 border-red-500/40' : 'bg-[#121827] text-slate-400 border-[#1e273a]'
                }`}
              >
                Sweep Zone
              </button>

              {/* Active Expected Moves Toggle */}
              <button
                onClick={() => setShowExpectedMoves((v) => !v)}
                className={`px-2 py-0.5 text-xs font-semibold rounded border transition-colors flex items-center gap-1.5 cursor-pointer ${
                  showExpectedMoves
                    ? 'bg-amber-950/70 text-amber-300 border-amber-500/50 shadow-xs'
                    : 'bg-[#121827] text-slate-400 border-[#1e273a]'
                }`}
                title="Mark active confirmed moves on heat map levels (↩️ Reversal at Defended Wall, ⏩ Thin Void Transit)"
              >
                <span className="relative flex h-1.5 w-1.5">
                  {showExpectedMoves && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${showExpectedMoves ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
                </span>
                <span>Active Moves</span>
                <span className="text-[10px] font-mono font-bold text-amber-400">{showExpectedMoves ? 'LIVE IN-PLAY' : 'OFF'}</span>
              </button>
            </div>
          </div>

          {/* Temporal Canvas Container (Height 560px) */}
          <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="relative w-full h-[560px] bg-[#070312] border border-[#1e1333] rounded-lg overflow-hidden select-none cursor-crosshair shadow-2xl"
          >
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

            <svg className="absolute inset-0 w-full h-full">
              {/* Right Y-Axis Grid Lines and Price Labels */}
              {Array.from({ length: 7 }).map((_, i) => {
                const innerHeight = 560 - paddingTop - paddingBottom;
                const y = paddingTop + (i * innerHeight) / 6;
                const p = maxPrice - (i * (maxPrice - minPrice)) / 6;
                return (
                  <g key={`grid-${i}`}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2="100%"
                      y2={y}
                      stroke="rgba(255, 255, 255, 0.06)"
                      strokeDasharray="2 3"
                      strokeWidth="1"
                    />
                    <text
                      x="98.5%"
                      y={y + 3.5}
                      fill="#94a3b8"
                      fontSize="9.5"
                      fontFamily="JetBrains Mono"
                      textAnchor="end"
                      className="select-none font-medium"
                    >
                      {p.toFixed(digits)}
                    </text>
                  </g>
                );
              })}

              {/* Bottom X-Axis Time Markers */}
              {columns.map((col, idx) => {
                if (idx % 6 !== 0) return null;
                const x = getCandleX(idx, containerRef.current?.clientWidth || 900);
                return (
                  <text
                    key={`time-${idx}`}
                    x={x}
                    y={560 - 10}
                    fill="#64748b"
                    fontSize="9"
                    fontFamily="JetBrains Mono"
                    textAnchor="middle"
                  >
                    {col.timeStr}
                  </text>
                );
              })}

              {/* POC Line */}
              {modelOutput.valueStructure.poc && (
                <g>
                  <line
                    x1={paddingLeft}
                    y1={priceToY(modelOutput.valueStructure.poc, 560)}
                    x2="100%"
                    y2={priceToY(modelOutput.valueStructure.poc, 560)}
                    stroke="#38bdf8"
                    strokeWidth="1.2"
                    strokeDasharray="4 3"
                    opacity={0.65}
                  />
                  <rect
                    x={paddingLeft + 6}
                    y={priceToY(modelOutput.valueStructure.poc, 560) - 9}
                    width={80}
                    height={14}
                    fill="#0b1b2b"
                    rx={2}
                  />
                  <text
                    x={paddingLeft + 10}
                    y={priceToY(modelOutput.valueStructure.poc, 560) + 1}
                    fill="#7dd3fc"
                    fontSize="8.5"
                    fontFamily="JetBrains Mono"
                    fontWeight="bold"
                  >
                    POC {modelOutput.valueStructure.poc.toFixed(digits)}
                  </text>
                </g>
              )}

              {/* Expected Move Level Badges & Lines (↩️ Reversal, ⏩ Rapid Continuation, 🧲 Magnet, ↗️/↘️ Trend Continuation) */}
              {showExpectedMoves &&
                expectedMoveLevels.map((lvl) => {
                  const y = priceToY(lvl.price, 560);
                  if (y < paddingTop - 4 || y > 560 - paddingBottom + 4) return null;
                  const isHovered = hoveredExpectedMove?.id === lvl.id;
                  const width = containerRef.current?.clientWidth || 900;
                  const rightMargin = width - paddingRight;
                  const hasTarget = !!lvl.targetDestinationPrice;
                  const badgeWidth = hasTarget ? 298 : 224;
                  const yDest = hasTarget ? priceToY(lvl.targetDestinationPrice!, 560) : null;
                  const isUpward = lvl.direction === 'UP';

                  const pipMult = instrument.pipMultiplier || 10;
                  const pipDistToLive = Number(((lvl.price - currentPrice) * pipMult).toFixed(1));
                  const pipDistToTarget = hasTarget && lvl.targetDestinationPrice !== undefined
                    ? Math.abs(Number(((lvl.targetDestinationPrice - currentPrice) * pipMult).toFixed(1)))
                    : null;

                  return (
                    <g 
                      key={`exp-move-${lvl.id}`} 
                      className="cursor-pointer transition-all"
                      onMouseEnter={() => setHoveredExpectedMove(lvl)}
                      onMouseLeave={() => setHoveredExpectedMove(null)}
                      onClick={() => {
                        tradingVoice.unlockAudio();
                        tradingVoice.speak(
                          `Expected move alert for ${instrument.name || instrument.symbol}. ${lvl.badgeTitle} at ${lvl.price.toFixed(digits)}. ${lvl.explanation}`,
                          { priority: true, force: true, symbol: instrument.symbol }
                        );
                      }}
                    >
                      {/* Horizontal Level Guide Line spanning the heatmap */}
                      <line
                        x1={paddingLeft}
                        y1={y}
                        x2={rightMargin}
                        y2={y}
                        stroke={lvl.color}
                        strokeWidth={isHovered ? 1.8 : 1.1}
                        strokeDasharray={lvl.moveType === 'RAPID_CONTINUATION' ? '2 2' : '4 3'}
                        opacity={isHovered ? 0.95 : 0.65}
                      />

                      {/* Directional Continuation Arrow & Destination Target Track (Answering "Continuation to Where?") */}
                      {hasTarget && yDest !== null && (
                        <g className="transition-all" opacity={isHovered ? 1 : 0.92}>
                          {/* Trajectory Guide Curved Vector connecting Entry Level to Destination */}
                          <path
                            d={`M ${paddingLeft + badgeWidth + 6} ${y} C ${paddingLeft + badgeWidth + 28} ${y}, ${paddingLeft + badgeWidth + 38} ${yDest}, ${paddingLeft + badgeWidth + 68} ${yDest}`}
                            fill="none"
                            stroke={lvl.color}
                            strokeWidth={isHovered ? 2.2 : 1.6}
                            strokeDasharray="4 3"
                          />

                          {/* Arrow Head pointing directly into Destination Target */}
                          <polygon
                            points={
                              isUpward
                                ? `${paddingLeft + badgeWidth + 68},${yDest} ${paddingLeft + badgeWidth + 59},${yDest + 4.5} ${paddingLeft + badgeWidth + 59},${yDest - 4.5}`
                                : `${paddingLeft + badgeWidth + 68},${yDest} ${paddingLeft + badgeWidth + 59},${yDest - 4.5} ${paddingLeft + badgeWidth + 59},${yDest + 4.5}`
                            }
                            fill={lvl.color}
                          />

                          {/* Destination Target Badge (Selector 2 & Selector 3) */}
                          <g transform={`translate(${paddingLeft + badgeWidth + 72}, ${yDest - 10})`}>
                            <rect
                              x={0}
                              y={0}
                              width={lvl.isReached ? 172 : 194}
                              height={20}
                              fill={lvl.isReached ? '#05291b' : lvl.bgColor}
                              fillOpacity={0.96}
                              stroke={lvl.isReached ? '#10b981' : lvl.borderColor}
                              strokeWidth={lvl.isReached ? 1.6 : (isHovered ? 1.5 : 1.1)}
                              rx={3}
                            />
                            {/* Live Pulsating Radar Beacon */}
                            <circle
                              cx={10}
                              cy={10}
                              r={4.2}
                              fill={lvl.isReached ? '#10b981' : '#38bdf8'}
                              className={lvl.isReached ? '' : 'animate-ping'}
                              opacity={lvl.isReached ? 0 : 0.8}
                            />
                            <circle cx={10} cy={10} r={2.8} fill={lvl.isReached ? '#10b981' : lvl.color} />
                            <text
                              x={18}
                              y={13.5}
                              fill={lvl.isReached ? '#6ee7b7' : '#ffffff'}
                              fontSize="8"
                              fontFamily="JetBrains Mono"
                              fontWeight="bold"
                            >
                              {lvl.isReached ? `✓ REACHED: ${lvl.targetDestinationPrice!.toFixed(digits)}` : `LIVE TARGET: ${lvl.targetDestinationPrice!.toFixed(digits)}`}
                            </text>
                            <text
                              x={lvl.isReached ? 166 : 188}
                              y={13.5}
                              fill={lvl.isReached ? '#a7f3d0' : '#38bdf8'}
                              fontSize="7.5"
                              fontFamily="JetBrains Mono"
                              textAnchor="end"
                              fontWeight="bold"
                            >
                              {lvl.isReached ? 'STALLED' : pipDistToTarget !== null ? `${pipDistToTarget.toFixed(1)}p away` : (isUpward ? '▲ HVN' : '▼ HVN')}
                            </text>
                          </g>

                          {/* Subtle Destination Projection Ray across Heatmap */}
                          <line
                            x1={paddingLeft + badgeWidth + (lvl.isReached ? 250 : 272)}
                            y1={yDest}
                            x2={rightMargin}
                            y2={yDest}
                            stroke={lvl.color}
                            strokeWidth="0.8"
                            strokeDasharray="2 4"
                            opacity={0.45}
                          />
                        </g>
                      )}

                      {/* Expected Move Badge Pill (Selector 1) */}
                      <rect
                        x={paddingLeft + 6}
                        y={y - 10}
                        width={badgeWidth}
                        height={20}
                        fill={lvl.bgColor}
                        fillOpacity={0.96}
                        stroke={lvl.borderColor}
                        strokeWidth={isHovered ? 1.8 : 1.2}
                        rx={3}
                      />

                      {/* Left accent marker */}
                      <rect
                        x={paddingLeft + 6}
                        y={y - 10}
                        width={3}
                        height={20}
                        fill={lvl.color}
                        rx={1}
                      />

                      {/* Pulsing Live Beacon Indicator */}
                      <circle
                        cx={paddingLeft + 15}
                        cy={y}
                        r={3.8}
                        fill={lvl.color}
                        className="animate-ping"
                        opacity={0.8}
                      />
                      <circle
                        cx={paddingLeft + 15}
                        cy={y}
                        r={2.2}
                        fill={lvl.color}
                      />

                      {/* LIVE NOW Chip */}
                      <rect
                        x={paddingLeft + 22}
                        y={y - 6.5}
                        width={30}
                        height={13}
                        fill="#05020c"
                        stroke={lvl.borderColor}
                        strokeWidth={0.8}
                        rx={2}
                      />
                      <text
                        x={paddingLeft + 37}
                        y={y + 3}
                        fill={lvl.color}
                        fontSize="7"
                        fontFamily="JetBrains Mono"
                        fontWeight="bold"
                        textAnchor="middle"
                        pointerEvents="none"
                      >
                        LIVE
                      </text>

                      {/* Symbol & Title */}
                      <text
                        x={paddingLeft + 56}
                        y={y + 3.5}
                        fill="#ffffff"
                        fontSize="8.4"
                        fontFamily="JetBrains Mono"
                        fontWeight="bold"
                        pointerEvents="none"
                      >
                        {lvl.badgeTitle}
                      </text>

                      {/* Dynamic Live Delta from Current Live Tick Price */}
                      <text
                        x={paddingLeft + badgeWidth - 20}
                        y={y + 3.5}
                        fill={lvl.color}
                        fontSize="8"
                        fontFamily="JetBrains Mono"
                        fontWeight="bold"
                        textAnchor="end"
                        pointerEvents="none"
                      >
                        {Math.abs(pipDistToLive) < 0.2
                          ? 'AT LIVE'
                          : `${pipDistToLive > 0 ? '+' : ''}${pipDistToLive.toFixed(1)}p Live`}
                      </text>

                      {/* Instant Dismiss Button (✕) */}
                      <g
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDismissedMoveIds((prev) => ({ ...prev, [lvl.id]: true }));
                        }}
                      >
                        <circle
                          cx={paddingLeft + badgeWidth - 8}
                          cy={y}
                          r={5.5}
                          fill="#180e29"
                          stroke={lvl.borderColor}
                          strokeWidth={0.8}
                        />
                        <text
                          x={paddingLeft + badgeWidth - 8}
                          y={y + 2.5}
                          fill="#cbd5e1"
                          fontSize="7.5"
                          fontFamily="JetBrains Mono"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          ×
                        </text>
                      </g>
                    </g>
                  );
                })}

              {/* Red Consolidation Sweep Box */}
              {settings.showSweptZones &&
                sweepZones.map((zone, zIdx) => {
                  const width = containerRef.current?.clientWidth || 900;
                  const x1 = getCandleX(zone.startCandleIndex, width) - 12;
                  const x2 = getCandleX(zone.endCandleIndex, width) + 12;
                  const yTop = priceToY(zone.highPrice, 560) - 4;
                  const yBottom = priceToY(zone.lowPrice, 560) + 4;
                  const boxWidth = Math.max(20, x2 - x1);
                  const boxHeight = Math.max(16, yBottom - yTop);

                  return (
                    <g key={`sweep-zone-${zIdx}`}>
                      <rect
                        x={x1}
                        y={yTop}
                        width={boxWidth}
                        height={boxHeight}
                        fill="rgba(239, 68, 68, 0.08)"
                        stroke="#ef4444"
                        strokeWidth="2.5"
                        rx={2}
                      />
                      <rect
                        x={x1}
                        y={yTop - 18}
                        width={185}
                        height={16}
                        fill="#2a0808"
                        stroke="#ef4444"
                        strokeWidth="1"
                        rx={2}
                      />
                      <text
                        x={x1 + 6}
                        y={yTop - 6}
                        fill="#fca5a5"
                        fontSize="8.5"
                        fontFamily="JetBrains Mono"
                        fontWeight="bold"
                      >
                        ⚡ LIQUIDITY SWEEP & DEFENSE
                      </text>
                    </g>
                  );
                })}

              {/* Candlesticks */}
              {settings.showCandles &&
                columns.map((col, idx) => {
                  const candle = col.candle;
                  const width = containerRef.current?.clientWidth || 900;
                  const x = getCandleX(idx, width);
                  const yOpen = priceToY(candle.open, 560);
                  const yClose = priceToY(candle.close, 560);
                  const yHigh = priceToY(candle.high, 560);
                  const yLow = priceToY(candle.low, 560);
                  const isBull = candle.close >= candle.open;
                  const bodyY = Math.min(yOpen, yClose);
                  const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));
                  const candleColor = isBull ? '#22c55e' : '#ef4444';

                  return (
                    <g key={`candlestick-${idx}`}>
                      <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={candleColor} strokeWidth="1.2" />
                      <rect
                        x={x - 3.5}
                        y={bodyY}
                        width={7}
                        height={bodyHeight}
                        fill={candleColor}
                        stroke={candleColor}
                        strokeWidth="0.5"
                        rx={0.5}
                      />
                      {/* Live forming candle beacon on the latest active bar */}
                      {idx === columns.length - 1 && (
                        <g pointerEvents="none">
                          <circle cx={x} cy={Math.min(yHigh, bodyY) - 7} r={3} fill="#06b6d4" className="animate-ping" opacity={0.8} />
                          <circle cx={x} cy={Math.min(yHigh, bodyY) - 7} r={2} fill="#22d3ee" />
                          <rect x={x - 22} y={Math.min(yHigh, bodyY) - 18} width={44} height={9.5} fill="#083344" stroke="#06b6d4" strokeWidth={0.8} rx={2} />
                          <text x={x} y={Math.min(yHigh, bodyY) - 11} fill="#67e8f9" fontSize="6.5" fontFamily="JetBrains Mono" textAnchor="middle" fontWeight="bold">
                            LIVE BAR
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

              {/* Current Live Price Line & Beacon */}
              {(() => {
                const y = priceToY(currentPrice, 560);
                const width = containerRef.current?.clientWidth || 900;
                const rightX = width - paddingRight;
                return (
                  <g>
                    <line x1={paddingLeft} y1={y} x2={rightX} y2={y} stroke="#06b6d4" strokeWidth="1.6" strokeDasharray="3 2" />
                    {/* Live price tag badge on the right price scale */}
                    <g transform={`translate(${rightX + 2}, ${y - 10})`}>
                      <rect width={Math.max(68, paddingRight - 4)} height={20} fill="#083344" stroke="#06b6d4" strokeWidth="1.4" rx={2} />
                      <circle cx={7.5} cy={10} r={2.8} fill="#22d3ee" />
                      <text x={38} y={13.5} fill="#67e8f9" fontSize="9.2" fontFamily="JetBrains Mono" fontWeight="bold" textAnchor="middle">
                        {currentPrice.toFixed(digits)}
                      </text>
                    </g>
                  </g>
                );
              })()}

              {/* Crosshair */}
              {mousePos && (
                <g pointerEvents="none">
                  <line x1={paddingLeft} y1={mousePos.y} x2="100%" y2={mousePos.y} stroke="#cbd5e1" strokeWidth="0.8" strokeDasharray="2 2" opacity={0.5} />
                  <line x1={mousePos.x} y1={paddingTop} x2={mousePos.x} y2={560 - paddingBottom} stroke="#cbd5e1" strokeWidth="0.8" strokeDasharray="2 2" opacity={0.5} />
                </g>
              )}
            </svg>

            {/* Hover Tooltip */}
            {hoverData && (
              <div
                className="absolute z-30 pointer-events-none p-2.5 rounded-md bg-[#0a0717]/95 border border-[#301c4f] shadow-2xl backdrop-blur-md text-xs font-mono w-60"
                style={{
                  left: Math.min(hoverData.x + 14, (containerRef.current?.clientWidth || 800) - 260),
                  top: Math.max(10, Math.min(hoverData.y - 70, 420)),
                }}
              >
                <div className="flex items-center justify-between border-b border-[#21163b] pb-1.5 mb-1.5">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${hoverData.side === 'ask' ? 'bg-red-400' : 'bg-emerald-400'}`} />
                    {hoverData.side === 'ask' ? 'RESTING ASKS' : 'RESTING BIDS'}
                  </span>
                  <span className="text-cyan-300 font-bold">{hoverData.price.toFixed(digits)}</span>
                </div>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Resting Liquidity:</span>
                    <span className="font-semibold text-amber-300">{hoverData.volume} lots</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Heat Intensity:</span>
                    <span className="font-semibold text-white">{(hoverData.intensity * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Time (X-Axis):</span>
                    <span className="text-slate-300">{hoverData.candle.timeStr}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tooltip for Hovered Expected Move Level */}
            {hoveredExpectedMove && (
              <div
                className="absolute z-40 pointer-events-none p-3 rounded-lg bg-[#0b0e1a]/95 border shadow-2xl backdrop-blur-md text-xs font-mono max-w-sm"
                style={{
                  borderColor: hoveredExpectedMove.color,
                  left: paddingLeft + 195,
                  top: Math.max(15, Math.min(priceToY(hoveredExpectedMove.price, 560) - 35, 460)),
                }}
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-1 mb-1.5">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span className="text-base">{hoveredExpectedMove.symbol}</span>
                    <span className="tracking-wide">{hoveredExpectedMove.badgeTitle}</span>
                    <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                      LIVE
                    </span>
                  </span>
                  <span className="font-bold font-mono" style={{ color: hoveredExpectedMove.color }}>
                    {hoveredExpectedMove.price.toFixed(digits)}
                  </span>
                </div>
                <div className="text-[11px] text-slate-200 leading-snug">
                  {hoveredExpectedMove.explanation}
                </div>
                {hoveredExpectedMove.targetDestinationPrice && (
                  <div className="mt-2 p-1.5 rounded bg-white/5 border border-white/10 flex items-center justify-between text-[10.5px]">
                    <span className="text-amber-300 font-bold flex items-center gap-1">
                      <span>🎯 Continues To:</span>
                      <span className="text-white font-mono">{hoveredExpectedMove.targetDestinationPrice.toFixed(digits)}</span>
                    </span>
                    <span className="text-slate-400 font-mono text-[9.5px]">
                      {hoveredExpectedMove.targetDestinationLabel}
                    </span>
                  </div>
                )}
                <div className="mt-1.5 pt-1 border-t border-white/5 flex justify-between items-center text-[10px] text-slate-400">
                  <span>Microstructure Rule:</span>
                  <span className="text-cyan-300 font-semibold">{hoveredExpectedMove.badgeDetail}</span>
                </div>
              </div>
            )}

            {/* Active Level Indicators Legend Bar */}
            {showExpectedMoves && (
              <div className="absolute top-2 right-3 z-10 hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#070312]/92 border border-[#2a1b42] text-[10px] font-mono shadow-md backdrop-blur-xs">
                <div className="flex items-center gap-1.5 pr-2.5 border-r border-emerald-500/30">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-emerald-400 font-bold uppercase tracking-wider">
                    LIVE 5M BAR ({columns[columns.length - 1]?.timeStr || 'IN-PLAY'})
                  </span>
                </div>
                <span className="text-slate-400 font-bold uppercase tracking-wider">Active In-Play:</span>
                <span className="flex items-center gap-1 text-purple-300 font-semibold">
                  <span>🧲</span>
                  <span>Magnet</span>
                </span>
                <span className="flex items-center gap-1 text-red-300 font-semibold">
                  <span>↩️</span>
                  <span>Reversal</span>
                </span>
                <span className="flex items-center gap-1 text-amber-300 font-semibold">
                  <span>⏩</span>
                  <span>Thin Void</span>
                </span>
                <span className="flex items-center gap-1 text-cyan-300 font-semibold">
                  <span>↗️/↘️</span>
                  <span>Breakout</span>
                </span>
              </div>
            )}

            {/* Color Scale Legend */}
            <div className="absolute bottom-2 left-3 z-10 flex items-center gap-2 px-2.5 py-1 rounded bg-[#070312]/90 border border-[#1e1333] text-[10px] font-mono">
              <span className="text-slate-400">Magnitude:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-blue-400 font-semibold">Low</span>
                <div 
                  className="w-24 h-2.5 rounded-xs shadow-inner" 
                  style={{ background: PALETTES[settings.palette].getCssGradient() }} 
                />
                <span className="text-red-400 font-bold">Highest Value</span>
              </div>
            </div>
          </div>
        </div>

    </div>
  );
};
