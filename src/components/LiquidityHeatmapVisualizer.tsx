import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { 
  Candle, 
  HeatmapSettings, 
  HeatmapPalette, 
  LiquidityPoolNode, 
  LiquiditySweepZone 
} from '../types/orderbook';
import { SniperModelOutput } from '../types/sniperModel';
import { InstrumentConfig, INSTRUMENTS, generateHeatmapMatrix } from '../services/mockDataGenerator';
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
  Grid3X3,
  BarChart2,
  TrendingUp,
  Clock,
  Activity,
  CheckCircle2,
  HelpCircle,
  BookOpen,
  Zap,
  Compass,
  Radio
} from 'lucide-react';
import { LiquidityMasterclassModal } from './LiquidityMasterclassModal';

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
    name: 'Bookmap Classic (Viridis)',
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
  blue_yellow_red: {
    name: 'Blue → Yellow → Red (Spectrum)',
    description: 'Light Blue (Low) → Cyan → Greenish Yellow → Bright Yellow → Crimson Red (Highest)',
    getColor: (t: number): [number, number, number] => {
      const clamped = Math.max(0, Math.min(1, t));
      if (clamped < 0.28) {
        // Light sky blue to cyan (#0284c7 to #06b6d4)
        const f = clamped / 0.28;
        return [
          Math.round(2 + f * 4),
          Math.round(132 + f * 50),
          Math.round(199 + f * 13),
        ];
      } else if (clamped < 0.55) {
        // Cyan to bright lime-yellow (#06b6d4 to #eab308)
        const f = (clamped - 0.28) / 0.27;
        return [
          Math.round(6 + f * 228),
          Math.round(182 - f * 3),
          Math.round(212 - f * 204),
        ];
      } else if (clamped < 0.80) {
        // Bright yellow to intense orange (#eab308 to #f97316)
        const f = (clamped - 0.55) / 0.25;
        return [
          Math.round(234 + f * 15),
          Math.round(179 - f * 64),
          Math.round(8 + f * 14),
        ];
      } else {
        // Intense orange to deep crimson red (#f97316 to #dc2626)
        const f = (clamped - 0.80) / 0.20;
        return [
          Math.round(249 - f * 29),
          Math.round(115 - f * 77),
          Math.round(22 + f * 16),
        ];
      }
    },
    getCssGradient: () => 'linear-gradient(to right, #0284c7, #06b6d4, #eab308, #f97316, #dc2626)',
  },
  inferno: {
    name: 'Inferno / Fire',
    description: 'Black/Dark Violet → Burgundy → Hot Amber → White Yellow',
    getColor: (t: number): [number, number, number] => {
      const clamped = Math.max(0, Math.min(1, t));
      if (clamped < 0.25) {
        const f = clamped / 0.25;
        return [Math.round(10 + f * 40), 5, Math.round(20 + f * 50)];
      } else if (clamped < 0.55) {
        const f = (clamped - 0.25) / 0.3;
        return [Math.round(50 + f * 150), Math.round(5 + f * 20), Math.round(70 - f * 40)];
      } else if (clamped < 0.85) {
        const f = (clamped - 0.55) / 0.3;
        return [Math.round(200 + f * 45), Math.round(25 + f * 135), 20];
      } else {
        const f = (clamped - 0.85) / 0.15;
        return [Math.round(245 + f * 10), Math.round(160 + f * 85), Math.round(20 + f * 180)];
      }
    },
    getCssGradient: () => 'linear-gradient(to right, #0a0514, #320546, #c81946, #f5a014, #fff080)',
  },
  cyber_neon: {
    name: 'Cyber Neon',
    description: 'Deep Midnight → Cobalt → Electric Cyan → Magenta Pink',
    getColor: (t: number): [number, number, number] => {
      const clamped = Math.max(0, Math.min(1, t));
      if (clamped < 0.3) {
        const f = clamped / 0.3;
        return [Math.round(8 + f * 5), Math.round(12 + f * 25), Math.round(28 + f * 90)];
      } else if (clamped < 0.65) {
        const f = (clamped - 0.3) / 0.35;
        return [Math.round(13 - f * 7), Math.round(37 + f * 160), Math.round(118 + f * 120)];
      } else {
        const f = (clamped - 0.65) / 0.35;
        return [Math.round(6 + f * 240), Math.round(197 - f * 110), Math.round(238 - f * 100)];
      }
    },
    getCssGradient: () => 'linear-gradient(to right, #080c1c, #0d2576, #06c5ee, #f6578a)',
  },
  thermal_magma: {
    name: 'Thermal Magma',
    description: 'Dark Indigo → Purple → Red Orange → Bright Gold',
    getColor: (t: number): [number, number, number] => {
      const clamped = Math.max(0, Math.min(1, t));
      if (clamped < 0.3) {
        const f = clamped / 0.3;
        return [Math.round(12 + f * 30), Math.round(8 + f * 12), Math.round(28 + f * 50)];
      } else if (clamped < 0.7) {
        const f = (clamped - 0.3) / 0.4;
        return [Math.round(42 + f * 160), Math.round(20 + f * 40), Math.round(78 + f * 40)];
      } else {
        const f = (clamped - 0.7) / 0.3;
        return [Math.round(202 + f * 50), Math.round(60 + f * 150), Math.round(118 + f * 40)];
      }
    },
    getCssGradient: () => 'linear-gradient(to right, #0c081c, #2a144e, #ca3c4e, #fca028)',
  },
  deep_tone: {
    name: 'Deep Tone (NASDAQ Scalper Pro)',
    description: 'Ultra-Dark Charcoal (Zero Visual Noise) → Steel Teal → Amber Gold → Electric Crimson (Peak Institutional Wall)',
    getColor: (t: number): [number, number, number] => {
      const clamped = Math.max(0, Math.min(1, t));
      if (clamped < 0.25) {
        // Deep muted slate charcoal to eliminate visual noise during intense scalping
        const f = clamped / 0.25;
        return [Math.round(8 + f * 10), Math.round(11 + f * 18), Math.round(18 + f * 26)];
      } else if (clamped < 0.55) {
        // Steel cyan-teal
        const f = (clamped - 0.25) / 0.30;
        return [Math.round(18 + f * 10), Math.round(29 + f * 95), Math.round(44 + f * 110)];
      } else if (clamped < 0.82) {
        // Vibrant amber-gold
        const f = (clamped - 0.55) / 0.27;
        return [Math.round(28 + f * 212), Math.round(124 + f * 76), Math.round(154 - f * 128)];
      } else {
        // Electric crimson peak institutional wall / iceberg
        const f = (clamped - 0.82) / 0.18;
        return [Math.round(240 + f * 15), Math.round(200 - f * 120), Math.round(26 + f * 90)];
      }
    },
    getCssGradient: () => 'linear-gradient(to right, #080b12, #122138, #1c7c9a, #f59e0b, #f43f5e)',
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

  // Active Sub-Mode:
  // 'temporal': Continuous Bookmap Liquidity Stream (Price on Y vs Time on X)
  // 'matrix_2d': Discrete 2D Matrix Heatmap across all Forex & Indices (Assets on Y vs Sessions/Variables on X)
  const [subMode, setSubMode] = useState<'temporal' | 'matrix_2d'>('temporal');

  // Matrix X-Axis Dimension Mode
  const [matrixXDim, setMatrixXDim] = useState<'sessions' | 'liquidity_tiers' | 'flow_metrics'>('sessions');

  // Heatmap View Configuration
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

  const [hoverMatrixCell, setHoverMatrixCell] = useState<{
    sym: string;
    dimLabel: string;
    value: number;
    intensity: number;
    description: string;
  } | null>(null);

  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [showTheoryModal, setShowTheoryModal] = useState<boolean>(false);
  const [showMasterclassModal, setShowMasterclassModal] = useState<boolean>(false);
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

    // 1. REVERSAL (↩️): Strictly ONLY when price is actively testing a defended edge / wall
    if (vaar && vaar.status !== 'INSIDE_VALUE_EQUILIBRIUM') {
      const isShortAbove = vaar.activeSide === 'SHORT_ABOVE_VAH';
      const isLongBelow = vaar.activeSide === 'LONG_BELOW_VAL';
      const distToDefended = Math.abs((current - vaar.defendedLevel) * pipMult);

      if ((isShortAbove || isLongBelow) && distToDefended <= 12 && !dismissedMoveIds['active-defended-reversal']) {
        list.push({
          id: 'active-defended-reversal',
          price: vaar.defendedLevel,
          symbol: '↩️',
          moveType: 'REVERSAL',
          badgeTitle: '↩️ REVERSAL',
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
    if (subMode !== 'temporal') return;
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
  }, [subMode, columns, priceLevels, settings, paddingLeft, paddingRight, paddingTop, paddingBottom, candleCount]);

  // Handle Canvas Resize
  useEffect(() => {
    if (subMode !== 'temporal') return;
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      canvasRef.current.width = rect.width;
      canvasRef.current.height = rect.height;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [subMode]);

  // Mouse hover detection (Temporal Mode)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (subMode !== 'temporal' || !containerRef.current) return;
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

  // --------------------------------------------------------------------------
  // 2D MATRIX HEATMAP DATA COMPUTATION
  // Y-axis = Instruments (Forex, Indices, Metals/Crypto)
  // X-axis = Configurable variable columns
  // --------------------------------------------------------------------------
  const allSymbols = Object.keys(INSTRUMENTS);

  const matrixColumns = useMemo(() => {
    if (matrixXDim === 'sessions') {
      return [
        { id: 'asia_open', label: 'Asia Open (00-03 UTC)', desc: 'Tokyo & Sydney opening liquidity build' },
        { id: 'asia_close', label: 'Tokyo Fix (03-06 UTC)', desc: 'Asian session settlement & fixing flows' },
        { id: 'london_pre', label: 'Frankfurt Open (06-08 UTC)', desc: 'European pre-market positioning' },
        { id: 'london_open', label: 'London Open (08-11 UTC)', desc: 'High initiative European institutional volume' },
        { id: 'ny_overlap', label: 'London/NY Overlap (12-16 UTC)', desc: 'Peak global session liquidity & high volatility' },
        { id: 'ny_afternoon', label: 'NY Afternoon (16-19 UTC)', desc: 'London fix completion & US rotation' },
        { id: 'ny_close', label: 'NY Close (19-22 UTC)', desc: 'US market cash settlement & rollover' },
      ];
    } else if (matrixXDim === 'liquidity_tiers') {
      return [
        { id: 'deep_support', label: 'Deep Support Bids (-40p)', desc: 'Resting institutional buy limit mattresses' },
        { id: 'defended_bed', label: 'Defended Shelf (-15p)', desc: 'Active absorption support layer' },
        { id: 'fair_value', label: 'Fair Value Center (POC)', desc: 'Auction equilibrium & highest volume node' },
        { id: 'near_resistance', label: 'Near Resistance (+15p)', desc: 'Active resting sell limits capping advance' },
        { id: 'overhead_wall', label: 'Overhead Wall (+40p)', desc: 'Macro swing stop loss cluster & sell wall' },
      ];
    } else {
      return [
        { id: 'volume_density', label: 'Resting Depth Volume', desc: 'Normalized resting limit book size' },
        { id: 'trapped_ratio', label: 'Retail Trapped Ratio', desc: 'Percentage of counter-trend trapped crowd' },
        { id: 'absorption_score', label: 'Passive Absorption', desc: 'Effort vs result passive absorption strength' },
        { id: 'plr_strength', label: 'PLR Directional Bias', desc: 'Path of Least Resistance conviction score' },
        { id: 'volatility_atr', label: 'Realized Volatility', desc: 'ATR percentile range expansion speed' },
      ];
    }
  }, [matrixXDim]);

  // Compute 2D matrix values (0 to 1 intensity)
  const matrixGrid = useMemo(() => {
    return allSymbols.map((sym, sIdx) => {
      const inst = INSTRUMENTS[sym];
      const rowValues = matrixColumns.map((col, cIdx) => {
        // Deterministic pseudo-realistic multi-variable correlation
        // Forex pairs peak during London/NY Overlap
        // Indices peak during NY cash session
        // Crypto & Gold maintain sustained multi-session flow
        let base = 0.35;
        const symType = inst.type;

        if (matrixXDim === 'sessions') {
          if (col.id === 'ny_overlap') {
            base = symType === 'indices' ? 0.94 : symType === 'forex' ? 0.91 : 0.88;
          } else if (col.id === 'london_open') {
            base = symType === 'forex' ? 0.86 : symType === 'indices' ? 0.72 : 0.65;
          } else if (col.id === 'asia_open') {
            base = sym === 'USDJPY' || sym === 'AUDUSD' ? 0.82 : 0.22;
          } else if (col.id === 'ny_close') {
            base = symType === 'indices' ? 0.78 : 0.38;
          } else {
            base = 0.45;
          }
        } else if (matrixXDim === 'liquidity_tiers') {
          if (col.id === 'defended_bed') {
            base = 0.88;
          } else if (col.id === 'fair_value') {
            base = 0.96;
          } else if (col.id === 'overhead_wall') {
            base = 0.79;
          } else {
            base = 0.42;
          }
        } else {
          // Flow metrics
          const hash = (sym.charCodeAt(0) + sIdx * 17 + cIdx * 31) % 100;
          base = 0.35 + (hash / 100) * 0.55;
        }

        // Add subtle harmonic variance
        const noise = Math.sin(sIdx * 2.3 + cIdx * 1.9) * 0.08;
        const finalIntensity = Math.max(0.05, Math.min(0.98, base + noise));
        const rawValue = Math.round(finalIntensity * 100);

        return {
          sym,
          colId: col.id,
          colLabel: col.label,
          intensity: finalIntensity,
          value: rawValue,
          description: `${inst.name} exhibiting ${rawValue}% relative intensity during ${col.label}`,
        };
      });

      return {
        sym,
        instrument: inst,
        cells: rowValues,
      };
    });
  }, [allSymbols, matrixColumns, matrixXDim]);

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* 1. Heatmap Toolbar & Mode Switcher */}
      <div className="bg-[#0b0e17] border border-[#1a2337] rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
        {/* Left: Title & Sub-Mode Switcher */}
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

        {/* Center: Mode Switcher Tabs (Temporal Stream vs 2D Matrix) */}
        <div className="flex items-center gap-1 bg-[#121826] p-1 rounded-md border border-[#1e273a] overflow-x-auto scrollbar-none whitespace-nowrap touch-pan-x max-w-full">
          <button
            onClick={() => setSubMode('temporal')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded transition-colors shrink-0 ${
              subMode === 'temporal'
                ? 'bg-[#1c2438] text-amber-300 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Temporal Order Flow Stream</span>
          </button>

          <button
            onClick={() => setSubMode('matrix_2d')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded transition-colors shrink-0 ${
              subMode === 'matrix_2d'
                ? 'bg-[#1c2438] text-cyan-300 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Cross-Asset 2D Matrix (Forex & Indices)</span>
          </button>
        </div>

        {/* Right: Palette & Theory Guide Controls */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          {/* Palette Selector */}
          <div className="flex items-center gap-1.5 bg-[#121827] px-2.5 py-1 rounded border border-[#1e273a]">
            <span className="text-[11px] text-slate-400">Palette:</span>
            <select
              value={settings.palette}
              onChange={(e) => setSettings((s) => ({ ...s, palette: e.target.value as HeatmapPalette }))}
              className="bg-transparent text-xs text-cyan-300 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="deep_tone" className="bg-[#0f1422] text-amber-300 font-bold">Deep Tone (NASDAQ Scalper Pro)</option>
              <option value="bookmap_classic" className="bg-[#0f1422] text-white">Bookmap (Viridis)</option>
              <option value="blue_yellow_red" className="bg-[#0f1422] text-white">Blue → Yellow → Red (Spectrum)</option>
              <option value="inferno" className="bg-[#0f1422] text-white">Inferno / Fire</option>
              <option value="cyber_neon" className="bg-[#0f1422] text-white">Cyber Neon</option>
              <option value="thermal_magma" className="bg-[#0f1422] text-white">Thermal Magma</option>
            </select>
          </div>

          {/* Practical Liquidity Masterclass Guide Button */}
          <button
            onClick={() => setShowMasterclassModal(true)}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded bg-gradient-to-r from-amber-500 via-orange-500 to-cyan-500 hover:brightness-110 text-black shadow-sm cursor-pointer transition-all"
            title="Open Practical Guide on Market Liquidity, Heat Maps & Order Flow Analysis"
          >
            <BookOpen className="w-3.5 h-3.5 fill-black/20" />
            <span>Liquidity Masterclass</span>
          </button>

          {/* Theory & Fundamentals Guide Modal Button */}
          <button
            onClick={() => setShowTheoryModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-[#131b2e] text-amber-300 hover:text-amber-200 border border-amber-500/40 hover:bg-[#1a2540] transition-colors"
            title="Read 2-Dimensional Heat Map Principles & Theory"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Heat Map Theory</span>
          </button>
        </div>
      </div>

      {/* VIEW SUB-MODE 1: TEMPORAL DEPTH STREAM (Bookmap Style) */}
      {subMode === 'temporal' && (
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
                <button
                  onClick={() => setShowMasterclassModal(true)}
                  className="text-[10px] text-amber-300 hover:text-white underline underline-offset-2 cursor-pointer font-bold ml-1 flex items-center gap-1"
                >
                  <BookOpen className="w-3 h-3 text-amber-400" />
                  <span>Practical Guide →</span>
                </button>
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
                className={`px-2 py-0.5 text-xs font-semibold rounded border transition-colors flex items-center gap-1 cursor-pointer ${
                  showExpectedMoves
                    ? 'bg-amber-950/70 text-amber-300 border-amber-500/50 shadow-xs'
                    : 'bg-[#121827] text-slate-400 border-[#1e273a]'
                }`}
                title="Mark active confirmed moves on heat map levels (↩️ Reversal at Defended Wall, ⏩ Thin Void Transit)"
              >
                <span>Active Moves</span>
                <span className="text-[10px] font-mono font-bold text-amber-400">{showExpectedMoves ? 'ON (↩️ ⏩)' : 'OFF'}</span>
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
                  const badgeWidth = hasTarget ? 268 : 180;
                  const yDest = hasTarget ? priceToY(lvl.targetDestinationPrice!, 560) : null;
                  const isUpward = lvl.direction === 'UP';

                  return (
                    <g 
                      key={`exp-move-${lvl.id}`} 
                      className="cursor-pointer transition-all"
                      onMouseEnter={() => setHoveredExpectedMove(lvl)}
                      onMouseLeave={() => setHoveredExpectedMove(null)}
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
                        <g className="transition-all" opacity={isHovered ? 1 : 0.88}>
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

                          {/* Destination Target Badge */}
                          <g transform={`translate(${paddingLeft + badgeWidth + 72}, ${yDest - 9})`}>
                            <rect
                              x={0}
                              y={0}
                              width={lvl.isReached ? 164 : 154}
                              height={18}
                              fill={lvl.isReached ? '#05291b' : lvl.bgColor}
                              fillOpacity={0.96}
                              stroke={lvl.isReached ? '#10b981' : lvl.borderColor}
                              strokeWidth={lvl.isReached ? 1.6 : (isHovered ? 1.4 : 1.0)}
                              rx={3}
                            />
                            <circle cx={9} cy={9} r={3} fill={lvl.isReached ? '#10b981' : lvl.color} />
                            <text
                              x={16}
                              y={12.5}
                              fill={lvl.isReached ? '#6ee7b7' : '#ffffff'}
                              fontSize="8"
                              fontFamily="JetBrains Mono"
                              fontWeight="bold"
                            >
                              {lvl.isReached ? `✓ REACHED: ${lvl.targetDestinationPrice!.toFixed(digits)}` : `TARGET: ${lvl.targetDestinationPrice!.toFixed(digits)}`}
                            </text>
                            <text
                              x={lvl.isReached ? 158 : 148}
                              y={12.5}
                              fill={lvl.isReached ? '#a7f3d0' : lvl.color}
                              fontSize="7.5"
                              fontFamily="JetBrains Mono"
                              textAnchor="end"
                              fontWeight="bold"
                            >
                              {lvl.isReached ? 'STALLED' : (isUpward ? '▲ HVN' : '▼ HVN')}
                            </text>
                          </g>

                          {/* Subtle Destination Projection Ray across Heatmap */}
                          <line
                            x1={paddingLeft + badgeWidth + 232}
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

                      {/* Expected Move Badge Pill */}
                      <rect
                        x={paddingLeft + 6}
                        y={y - 9}
                        width={badgeWidth}
                        height={18}
                        fill={lvl.bgColor}
                        fillOpacity={0.94}
                        stroke={lvl.borderColor}
                        strokeWidth={isHovered ? 1.5 : 1.0}
                        rx={3}
                      />

                      {/* Left accent marker */}
                      <rect
                        x={paddingLeft + 6}
                        y={y - 9}
                        width={3}
                        height={18}
                        fill={lvl.color}
                        rx={1}
                      />

                      {/* Symbol & Title */}
                      <text
                        x={paddingLeft + 14}
                        y={y + 3.5}
                        fill="#ffffff"
                        fontSize="8.4"
                        fontFamily="JetBrains Mono"
                        fontWeight="bold"
                        pointerEvents="none"
                      >
                        {lvl.badgeTitle}
                      </text>

                      {/* Price & Tag */}
                      <text
                        x={paddingLeft + badgeWidth - 20}
                        y={y + 3.5}
                        fill={lvl.color}
                        fontSize="8.2"
                        fontFamily="JetBrains Mono"
                        fontWeight="bold"
                        textAnchor="end"
                        pointerEvents="none"
                      >
                        {lvl.price.toFixed(digits)}
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
              <div className="absolute top-2 right-3 z-10 hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[#070312]/92 border border-[#2a1b42] text-[10px] font-mono shadow-md backdrop-blur-xs">
                <span className="text-slate-400 font-bold uppercase tracking-wider">Active Moves:</span>
                <span className="flex items-center gap-1 text-purple-300 font-semibold">
                  <span>🧲</span>
                  <span>Attracting Magnet</span>
                </span>
                <span className="flex items-center gap-1 text-red-300 font-semibold">
                  <span>↩️</span>
                  <span>Defended Reversal</span>
                </span>
                <span className="flex items-center gap-1 text-amber-300 font-semibold">
                  <span>⏩</span>
                  <span>Thin Void ➔ Next HVN</span>
                </span>
                <span className="flex items-center gap-1 text-cyan-300 font-semibold">
                  <span>↗️/↘️</span>
                  <span>Breakout ➔ Target TP2</span>
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
      )}

      {/* VIEW SUB-MODE 2: 2D MATRIX HEATMAP (All Forex & Indices vs Variables) */}
      {subMode === 'matrix_2d' && (
        <div className="flex flex-col gap-3">
          {/* X-Axis Dimension Selector */}
          <div className="bg-[#0c111d] border border-[#1a253a] rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-cyan-400" />
                <span>2D Cross-Axis Variable Selector (X-Axis):</span>
              </span>
              <div className="flex items-center gap-1 bg-[#121826] p-0.5 rounded border border-[#1e273a]">
                <button
                  onClick={() => setMatrixXDim('sessions')}
                  className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                    matrixXDim === 'sessions' ? 'bg-[#1e273a] text-cyan-300 shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Trading Sessions & Hours
                </button>
                <button
                  onClick={() => setMatrixXDim('liquidity_tiers')}
                  className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                    matrixXDim === 'liquidity_tiers' ? 'bg-[#1e273a] text-cyan-300 shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Order Book Liquidity Tiers
                </button>
                <button
                  onClick={() => setMatrixXDim('flow_metrics')}
                  className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                    matrixXDim === 'flow_metrics' ? 'bg-[#1e273a] text-cyan-300 shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Order Flow Dynamics
                </button>
              </div>
            </div>

            {/* Explanatory banner */}
            <div className="text-[11px] text-slate-400 flex items-center gap-2">
              <span>Y-Axis: <strong>13 Instruments</strong></span>
              <span className="text-slate-600">·</span>
              <span>X-Axis: <strong>{matrixColumns.length} Variables</strong></span>
              <span className="text-slate-600">·</span>
              <span className="text-amber-400 font-semibold">Click any row to switch active symbol</span>
            </div>
          </div>

          {/* 2D Matrix Table */}
          <div className="bg-[#080d17] border border-[#192338] rounded-lg overflow-x-auto shadow-xl">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="border-b border-[#1b263d] bg-[#0c1322] text-xs font-mono">
                  <th className="py-2.5 px-3 font-bold text-slate-300 w-44">
                    Y-AXIS (INSTRUMENT)
                  </th>
                  {matrixColumns.map((col) => (
                    <th key={col.id} className="py-2.5 px-2 text-center text-slate-300 font-medium text-[11px]">
                      <div>{col.label}</div>
                      <div className="text-[9px] text-slate-500 font-normal font-sans truncate max-w-[130px] mx-auto">
                        {col.desc}
                      </div>
                    </th>
                  ))}
                  <th className="py-2.5 px-2 text-center text-slate-400 font-medium text-[11px] w-20">
                    AVG HEAT
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#131d31] text-xs font-mono">
                {matrixGrid.map((row) => {
                  const isSelected = row.sym === instrument.symbol;
                  const avgVal = Math.round(row.cells.reduce((acc, c) => acc + c.value, 0) / row.cells.length);

                  return (
                    <tr
                      key={row.sym}
                      onClick={() => onSelectSymbol && onSelectSymbol(row.sym)}
                      className={`transition-colors cursor-pointer ${
                        isSelected ? 'bg-[#152035] hover:bg-[#1a2740]' : 'hover:bg-[#0e1626]'
                      }`}
                    >
                      {/* Y-Axis Label Cell */}
                      <td className="py-2 px-3 font-semibold text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`} />
                          <span className="text-cyan-300">{row.sym}</span>
                          <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
                            {row.instrument.type}
                          </span>
                        </div>
                        {isSelected && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-900 text-cyan-200 uppercase font-bold">
                            Active
                          </span>
                        )}
                      </td>

                      {/* 2D Heatmap Colored Data Cells */}
                      {row.cells.map((cell) => {
                        const [r, g, b] = PALETTES[settings.palette].getColor(cell.intensity);
                        const isHot = cell.intensity > 0.75;
                        const isCold = cell.intensity < 0.35;

                        return (
                          <td
                            key={cell.colId}
                            onMouseEnter={() => setHoverMatrixCell({
                              sym: cell.sym,
                              dimLabel: cell.colLabel,
                              value: cell.value,
                              intensity: cell.intensity,
                              description: cell.description,
                            })}
                            onMouseLeave={() => setHoverMatrixCell(null)}
                            className="p-1 text-center"
                          >
                            <div
                              className="py-1.5 px-2 rounded font-bold transition-transform hover:scale-105 shadow-inner"
                              style={{
                                backgroundColor: `rgba(${r}, ${g}, ${b}, ${Math.max(0.25, cell.intensity)})`,
                                color: isHot ? '#ffffff' : isCold ? '#93c5fd' : '#fef08a',
                                border: isHot ? '1px solid rgba(255, 255, 255, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                              }}
                            >
                              {cell.value}%
                            </div>
                          </td>
                        );
                      })}

                      {/* Row Average Summary */}
                      <td className="py-2 px-2 text-center text-slate-300 font-bold">
                        <span className="px-1.5 py-0.5 rounded bg-[#131b2c] border border-[#1e2a42]">
                          {avgVal}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Matrix Inspector HUD & Color Gradient Scale Bar */}
          <div className="bg-[#0b0f1a] border border-[#182338] rounded-lg p-3 flex flex-wrap items-center justify-between gap-4">
            {/* Live Hover Info */}
            <div className="flex-1 min-w-[280px]">
              {hoverMatrixCell ? (
                <div className="flex items-center gap-3 text-xs font-mono">
                  <div className="p-1.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-bold">
                    {hoverMatrixCell.sym} × {hoverMatrixCell.dimLabel}
                  </div>
                  <div className="text-slate-300">
                    Value: <strong className="text-amber-300">{hoverMatrixCell.value}%</strong> (Intensity {(hoverMatrixCell.intensity).toFixed(2)})
                  </div>
                  <div className="text-slate-400 text-[11px] hidden lg:inline">
                    {hoverMatrixCell.description}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span>Hover over any cell in the 2D grid to inspect cross-axis relationship values</span>
                </div>
              )}
            </div>

            {/* Continuous Color Scale Legend */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400">Scale:</span>
              <span className="text-blue-400 font-semibold">0% (Low)</span>
              <div 
                className="w-32 h-3.5 rounded shadow-inner" 
                style={{ background: PALETTES[settings.palette].getCssGradient() }} 
              />
              <span className="text-red-400 font-bold">100% (High)</span>
            </div>
          </div>
        </div>
      )}

      {/* 2-DIMENSIONAL HEAT MAP PRINCIPLES & THEORY MODAL */}
      {showTheoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
          <div className="bg-[#0b0e17] border border-[#1e273c] rounded-xl max-w-2xl w-full p-6 text-sm text-slate-300 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#1c2438] pb-3">
              <div className="flex items-center gap-2.5 font-bold text-white text-base">
                <Flame className="w-5 h-5 text-amber-400" />
                <span>The Architecture of a Two-Dimensional Heat Map</span>
              </div>
              <button
                onClick={() => setShowTheoryModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2.5 py-1 rounded bg-[#161f31]"
              >
                Close
              </button>
            </div>

            {/* Educational Content directly matching user prompt */}
            <div className="space-y-4 text-xs leading-relaxed">
              <div className="p-3 rounded-lg bg-[#121927] border border-[#1d293f]">
                <h4 className="font-bold text-cyan-300 text-sm mb-1 flex items-center gap-1.5">
                  <Grid3X3 className="w-4 h-4 text-cyan-400" />
                  <span>1. What is a Heat Map?</span>
                </h4>
                <p className="text-slate-300">
                  A heat map is a <strong>two-dimensional representation of data</strong> in which various values are represented by colors. A simple heat map provides an immediate visual summary of information across two axes (X and Y), allowing users to quickly grasp the most important or relevant data points without reading raw tables of thousands of numbers.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#121927] border border-[#1d293f]">
                <h4 className="font-bold text-amber-300 text-sm mb-1 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <span>2. Color Gradation & Variable Relationships</span>
                </h4>
                <p className="text-slate-300 mb-2">
                  All heat maps share one thing in common: they use <strong>different colors or different shades of the same color</strong> to represent different values and to communicate the relationships that may exist between the variables plotted on the X-axis and Y-axis.
                </p>
                <div className="p-2.5 rounded bg-[#090d15] border border-[#192338] text-[11px] font-mono space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-xs bg-blue-500" />
                    <span><strong>Lightest Color (e.g. Blue):</strong> Represents the lowest values or lower range (e.g., lower volume, low rainfall, thin liquidity).</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-xs bg-yellow-400" />
                    <span><strong>Intermediate Color (e.g. Yellow):</strong> Represents increasing values or moderate concentrations.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-xs bg-red-500" />
                    <span><strong>Darkest / Warmest Color (e.g. Red):</strong> Indicates the highest or greatest quantity of the value being represented (e.g., maximum resting orders, peak volatility, highest rainfall).</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#121927] border border-[#1d293f]">
                <h4 className="font-bold text-emerald-300 text-sm mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>3. Revealing Patterns Across Two Axes</span>
                </h4>
                <p className="text-slate-300">
                  The changing colors across the two axes reveal patterns in one or both variables and whether there are relationships between them:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-300">
                  <li>
                    <strong>Temporal Depth Stream (Mode 1):</strong> X-axis represents Time (5m bars), Y-axis represents Discrete Price Levels. Persistent horizontal stripes of bright yellow reveal institutional limit order walls anchoring market rotations.
                  </li>
                  <li>
                    <strong>Cross-Asset Matrix (Mode 2):</strong> Y-axis represents 13 Forex Pairs & Global Indices, X-axis represents Trading Sessions or Liquidity Tiers. Shifting blues, yellows, and reds immediately tell you which market receives the highest liquidity during each global trading window!
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-3 border-t border-[#1c2438] flex items-center justify-between">
              <span className="text-slate-500 text-[11px] font-mono">
                OrderBook Pro & Sniper-Edge Heat Map Engine
              </span>
              <button
                onClick={() => setShowTheoryModal(false)}
                className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded transition-colors"
              >
                Close & Return to Heat Map
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NASDAQ SCALPER LIQUIDITY & ORDER FLOW MASTERCLASS PRACTICAL GUIDE MODAL */}
      <LiquidityMasterclassModal
        isOpen={showMasterclassModal}
        onClose={() => setShowMasterclassModal(false)}
        onApplyDeepTone={() => setSettings((s) => ({ ...s, palette: 'deep_tone' }))}
      />
    </div>
  );
};
