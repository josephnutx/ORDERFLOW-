import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { OrderBookIndicator } from './components/OrderBookIndicator';
import { CandleChartWithBubbles } from './components/CandleChartWithBubbles';
import { InfographicEngine } from './components/InfographicEngine';
import { LiquidityHeatmapVisualizer } from './components/LiquidityHeatmapVisualizer';
import { SniperEdgeRadar } from './components/SniperEdgeRadar';
import { MarketIntelligenceDashboard } from './components/MarketIntelligenceDashboard';
import { ConfluenceScorecardModal } from './components/ConfluenceScorecardModal';
import { OrderBookSettingsModal } from './components/OrderBookSettingsModal';
import { CrowdBehaviorGuide } from './components/CrowdBehaviorGuide';
import { TradingVoiceModal } from './components/TradingVoiceModal';
import { LiveSquawkBar } from './components/LiveSquawkBar';
import { tradingVoice } from './services/tradingVoiceService';
import { 
  generateSnapshotsHistory, 
  computeSniperModel, 
  INSTRUMENTS 
} from './services/mockDataGenerator';
import { getMarketScheduleStatus, MarketScheduleStatus } from './services/marketHoursService';
import { 
  fetchLiveMarket, 
  fetchDukascopyTicks, 
  fetchSystemStatus, 
  transformTicksToFootprintBubbles, 
  buildRealOrderBookSnapshot, 
  DukascopyTick, 
  SystemStatus 
} from './services/marketDataService';
import { playTargetHitSound, speakAnnouncement } from './services/soundService';
import { LiveDataInspectorModal } from './components/LiveDataInspectorModal';
import { FullModelAnalysisModal } from './components/FullModelAnalysisModal';
import { generateDynamicMarketPulse } from './services/fullModelAnalysisService';
import { buildStructuredAlert, detectDynamicVisualTapeAlert, StructuredLiveAlert, AlertType } from './services/structuredAlertService';
import { OrderBookSettings, OrderBookSnapshot, Candle, FootprintBubble } from './types/orderbook';
import { SymbolTargetLifecycle } from './types/sniperModel';
import { 
  BarChart3, 
  Eye, 
  Layers, 
  ShieldCheck, 
  Info, 
  ExternalLink,
  Sliders,
  BookOpen,
  ArrowRight,
  Zap,
  TrendingUp,
  Target,
  Crosshair,
  BatteryWarning,
  CheckCircle2,
  RotateCcw,
  Clock,
  Sparkles,
  Check,
  Volume2,
  VolumeX,
  Pause
} from 'lucide-react';

export interface AchievedSignalRecord {
  symbol: string;
  triggerAction: 'SNIPER_BUY' | 'SNIPER_SELL' | 'WAIT_FOR_EDGE';
  achievedTarget: 'TP1' | 'TP2' | 'TP3' | 'ALL_COMPLETE' | 'MANUAL_DISMISSED';
  achievedPips: number;
  entryPrice: number;
  exitPrice: number;
  achievedTimestamp: number;
  reason: string;
}

const EMPTY_TICKS: DukascopyTick[] = [];

export default function App() {
  const [currentSymbol, setCurrentSymbol] = useState<string>('XAUUSD');
  const [snapshotIndex, setSnapshotIndex] = useState<number>(23); // Default to latest live snapshot
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<'combined' | 'sniper' | 'heatmap' | 'infographic' | 'orderbook' | 'pipeline' | 'intelligence'>('combined');
  const [isVoiceAlertsEnabled, setIsVoiceAlertsEnabled] = useState<boolean>(true);
  const [liveStructuredAlerts, setLiveStructuredAlerts] = useState<StructuredLiveAlert[]>([]);
  const [currentTimeframe, setCurrentTimeframe] = useState<'M1' | 'M5' | 'M15' | 'H1' | 'H4'>('M5');

  const currentInst = INSTRUMENTS[currentSymbol] || INSTRUMENTS.XAUUSD;

  // Modal dialog states
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isScorecardOpen, setIsScorecardOpen] = useState<boolean>(false);
  const [isCrowdGuideOpen, setIsCrowdGuideOpen] = useState<boolean>(false);
  const [isLiveInspectorOpen, setIsLiveInspectorOpen] = useState<boolean>(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [isModelAnalysisOpen, setIsModelAnalysisOpen] = useState<boolean>(false);
  const [isVoiceSpeaking, setIsVoiceSpeaking] = useState<boolean>(false);

  // Live Data State mapped strictly by symbol to prevent cross-pair contamination
  interface SymbolMarketData {
    candles: Candle[];
    price: number;
    ticks: DukascopyTick[];
  }
  const [liveMarketMap, setLiveMarketMap] = useState<Record<string, SymbolMarketData>>({});
  const [totalTicksCached, setTotalTicksCached] = useState<number>(0);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(true);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isRefreshingTicks, setIsRefreshingTicks] = useState<boolean>(false);

  // Multi-Target Signal Lifecycle State (TP1 -> TP2 -> TP3 -> Remove Signal & Wait for Next Setup)
  const [targetLifecycles, setTargetLifecycles] = useState<Record<string, SymbolTargetLifecycle>>({
    USDCAD: {
      symbol: 'USDCAD',
      signalId: 'USDCAD-init-completed',
      triggerAction: 'SNIPER_SELL',
      optimalEntry: 1.3595,
      hardStopLoss: 1.3615,
      targetTP1: 1.3567,
      targetTP2: 1.3540,
      targetTP3: 1.3515,
      tp1Hit: true,
      tp2Hit: true,
      tp3Hit: true,
      allTargetsCompleted: true,
      waitingForNextSetup: true,
      nextSetupCountdown: 14,
      tp1Pips: 28,
      tp2Pips: 27,
      tp3Pips: 25,
      totalPipsSecured: 80,
      lastHitTarget: 'TP3',
      lastHitTimestamp: Date.now() - 120000,
      completedTimestamp: Date.now() - 120000,
      message: 'All 3 targets completed. Signal removed, scanning next setup.',
    },
  });

  const [achievedSignals, setAchievedSignals] = useState<Record<string, AchievedSignalRecord>>({
    USDCAD: {
      symbol: 'USDCAD',
      triggerAction: 'SNIPER_SELL',
      achievedTarget: 'ALL_COMPLETE',
      achievedPips: 80,
      entryPrice: 1.3595,
      exitPrice: 1.3515,
      achievedTimestamp: Date.now() - 120000,
      reason: 'All targets TP1, TP2, TP3 completed! Signal retired (+80 pips). Waiting for next setup.',
    },
  });
  const [dismissedSignals, setDismissedSignals] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<{ id: string; title: string; subtitle: string; pips?: number } | null>(null);

  // Fetch real market data on symbol or timeframe change
  const loadRealMarketData = useCallback(async (sym: string, tf: string = 'M5') => {
    const mapKey = `${sym}_${tf}`;
    try {
      // 1. Fetch live TradingView candles and price for the selected timeframe
      const liveRes = await fetchLiveMarket(sym, tf);
      if (liveRes && liveRes.candles && liveRes.candles.length > 0) {
        const livePrice = liveRes.livePrice > 0
          ? liveRes.livePrice
          : liveRes.candles[liveRes.candles.length - 1].close;

        setLiveMarketMap((prev) => ({
          ...prev,
          [mapKey]: {
            candles: liveRes.candles,
            price: livePrice,
            ticks: prev[mapKey]?.ticks || prev[`${sym}_M5`]?.ticks || [],
          },
        }));
        setIsLiveConnected(true);
      }

      // 2. Fetch real Dukascopy ticks
      const dukaRes = await fetchDukascopyTicks(sym, 120);
      if (dukaRes && dukaRes.ticks && dukaRes.ticks.length > 0) {
        setLiveMarketMap((prev) => {
          const existing = prev[mapKey];
          return {
            ...prev,
            [mapKey]: {
              candles: existing?.candles || [],
              price: existing?.price || (INSTRUMENTS[sym]?.basePrice ?? 1),
              ticks: dukaRes.ticks,
            },
          };
        });
        setTotalTicksCached(dukaRes.totalTicksCached || dukaRes.ticks.length);
      }

      // 3. Fetch system status
      const statusRes = await fetchSystemStatus();
      if (statusRes) {
        setSystemStatus(statusRes);
      }
    } catch (err) {
      console.warn('Real data initial load notice:', err);
    }
  }, []);

  const handleRefreshTicks = useCallback(async () => {
    setIsRefreshingTicks(true);
    const mapKey = `${currentSymbol}_${currentTimeframe}`;
    try {
      const dukaRes = await fetchDukascopyTicks(currentSymbol, 150);
      if (dukaRes && dukaRes.ticks) {
        setLiveMarketMap((prev) => {
          const existing = prev[mapKey];
          return {
            ...prev,
            [mapKey]: {
              candles: existing?.candles || [],
              price: existing?.price || (INSTRUMENTS[currentSymbol]?.basePrice ?? 1),
              ticks: dukaRes.ticks,
            },
          };
        });
        setTotalTicksCached(dukaRes.totalTicksCached || dukaRes.ticks.length);
      }
      const status = await fetchSystemStatus();
      if (status) setSystemStatus(status);
    } finally {
      setIsRefreshingTicks(false);
    }
  }, [currentSymbol, currentTimeframe]);

  useEffect(() => {
    loadRealMarketData(currentSymbol, currentTimeframe);

    // High-frequency background market data & tick refresh (every 8s) to ensure model never starves or delays
    const autoRefreshTimer = setInterval(() => {
      loadRealMarketData(currentSymbol, currentTimeframe);
    }, 8000);

    // Instant refresh when user returns to app on mobile Android or switches browser tabs
    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadRealMarketData(currentSymbol, currentTimeframe);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    // Subscribe to SSE Live Price Updates from TradingView for currentSymbol + currentTimeframe
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/market/stream?symbol=${encodeURIComponent(currentSymbol)}&timeframe=${encodeURIComponent(currentTimeframe)}`);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'price_update' && typeof data.price === 'number') {
            const sym = data.symbol || currentSymbol;
            const tf = data.timeframe || currentTimeframe;
            if (sym !== currentSymbol || tf !== currentTimeframe) return;

            const mapKey = `${sym}_${tf}`;
            setIsLiveConnected(true);

            setLiveMarketMap((prev) => {
              const existing = prev[mapKey];
              const existingCandles = existing?.candles || [];
              let updatedCandles = [...existingCandles];

              if (data.latestCandle) {
                if (updatedCandles.length === 0) {
                  updatedCandles = [data.latestCandle];
                } else {
                  const last = updatedCandles[updatedCandles.length - 1];
                  if (last && Math.abs(last.timestamp - data.latestCandle.timestamp) < 60000) {
                    updatedCandles[updatedCandles.length - 1] = data.latestCandle;
                  } else {
                    updatedCandles.push(data.latestCandle);
                    if (updatedCandles.length > 50) updatedCandles.shift();
                  }
                }
              }

              return {
                ...prev,
                [mapKey]: {
                  candles: updatedCandles,
                  price: data.price,
                  ticks: existing?.ticks || [],
                },
              };
            });
          }
        } catch {
          // Ignore parse errors on heartbeats
        }
      };

      eventSource.onerror = () => {
        // SSE handles reconnection automatically
      };
    } catch (err) {
      console.warn('SSE stream init warning:', err);
    }

    return () => {
      clearInterval(autoRefreshTimer);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [currentSymbol, currentTimeframe, loadRealMarketData]);

  // Settings
  const [settings, setSettings] = useState<OrderBookSettings>({
    depth: 20,
    layout: 'classic_one_sided',
    filterMode: 'ALL',
    showLeftOrders: true,
    showRightPositions: true,
    offsetRight: 0,
    distanceBetweenBooks: 2,
    historyNavigationEnabled: true,
    fastRewindSpeed: 2,
    showScaleOnChart: true,
    valueWidth: 120,
    colorScheme: 'fxssi_classic',
    showCandleCrossMark: true,
    showFootprintBubbles: true,
  });

  const handleUpdateSettings = useCallback((newSettings: Partial<OrderBookSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  // Generate data history on symbol or timeframe change
  const marketData = useMemo(() => {
    return generateSnapshotsHistory(currentSymbol, 24, currentTimeframe);
  }, [currentSymbol, currentTimeframe]);

  // Keep snapshot index bounded
  const totalSnapshots = marketData.snapshots.length;
  const currentSnapshot: OrderBookSnapshot = marketData.snapshots[Math.min(snapshotIndex, totalSnapshots - 1)] || marketData.snapshots[totalSnapshots - 1];

  // Active live data scoped strictly to currentSymbol + currentTimeframe
  const currentLiveData = liveMarketMap[`${currentSymbol}_${currentTimeframe}`];

  // Active candles: real TradingView WebSocket candles for this symbol + timeframe if available, else fresh simulated candles for this symbol + timeframe
  const effectiveCandles: Candle[] = useMemo(() => {
    if (currentLiveData?.candles && currentLiveData.candles.length > 0) {
      return currentLiveData.candles;
    }
    return marketData.candles;
  }, [currentLiveData?.candles, marketData.candles]);

  const effectiveTicks: DukascopyTick[] = currentLiveData?.ticks && currentLiveData.ticks.length > 0 ? currentLiveData.ticks : EMPTY_TICKS;

  // Active bubbles: real Dukascopy tick volume absorption clusters if available, else simulated bubbles
  const effectiveBubbles: FootprintBubble[] = useMemo(() => {
    if (effectiveTicks && effectiveTicks.length > 0) {
      const realBubbles = transformTicksToFootprintBubbles(
        effectiveTicks,
        effectiveCandles,
        currentInst.digits,
        currentInst.tickSize,
        currentTimeframe
      );
      if (realBubbles.length > 0) return realBubbles;
    }
    return marketData.bubbles;
  }, [effectiveTicks, effectiveCandles, currentInst, marketData.bubbles, currentTimeframe]);

  // Current effective price strictly scoped to currentSymbol
  const effectivePrice: number = currentLiveData?.price ?? currentSnapshot.currentPrice;

  // Real OrderBook snapshot aligned to live price and Dukascopy tick sentiment
  const effectiveSnapshot: OrderBookSnapshot = useMemo(() => {
    if (effectivePrice > 0) {
      return buildRealOrderBookSnapshot(currentSymbol, effectivePrice, effectiveTicks, settings.depth);
    }
    return currentSnapshot;
  }, [currentSymbol, effectivePrice, effectiveTicks, settings.depth, currentSnapshot]);

  // Raw sniper model output calibrated to currentTimeframe & market schedule awareness
  const rawModelOutput = useMemo(() => {
    return computeSniperModel(effectiveSnapshot, effectiveCandles, currentTimeframe);
  }, [effectiveSnapshot, effectiveCandles, currentTimeframe]);

  // Active lifecycle for current symbol
  const currentLifecycle = targetLifecycles[currentSymbol];

  // Model output with signal lifecycle applied (Target Progression, All Completed, Waiting for Next Setup)
  const modelOutput = useMemo(() => {
    const lc = targetLifecycles[currentSymbol];
    const isAchieved = !!lc?.allTargetsCompleted || !!achievedSignals[currentSymbol] || !!dismissedSignals[currentSymbol];

    const cloned = { ...rawModelOutput };

    if (lc) {
      cloned.sniperEdge = {
        ...cloned.sniperEdge,
        progress: {
          tp1Hit: lc.tp1Hit,
          tp2Hit: lc.tp2Hit,
          tp3Hit: lc.tp3Hit,
          allCompleted: lc.allTargetsCompleted,
          tp1Pips: lc.tp1Pips,
          tp2Pips: lc.tp2Pips,
          tp3Pips: lc.tp3Pips,
          totalPipsSecured: lc.totalPipsSecured,
          activeTarget: lc.allTargetsCompleted ? 'ALL_COMPLETED' : lc.tp2Hit ? 'TP3' : lc.tp1Hit ? 'TP2' : 'TP1',
        },
        waitingForNextSetup: lc.waitingForNextSetup,
        nextSetupCountdown: lc.nextSetupCountdown,
      };
    }

    if (!isAchieved) {
      if (lc?.tp2Hit) {
        cloned.sniperEdge.actionBadge = 'TP2 HIT · RUNNER TARGETING TP3';
        cloned.sniperEdge.status = 'TP2_ACHIEVED_RUNNER_ACTIVE';
      } else if (lc?.tp1Hit) {
        cloned.sniperEdge.actionBadge = 'TP1 HIT · RUNNER TARGETING TP2';
        cloned.sniperEdge.status = 'TP1_ACHIEVED_RUNNER_ACTIVE';
      }
      return cloned;
    }

    const pips = lc?.totalPipsSecured ?? achievedSignals[currentSymbol]?.achievedPips ?? 28;

    cloned.sniperEdge = {
      ...cloned.sniperEdge,
      isAchieved: true,
      actionBadge: 'ALL TARGETS COMPLETED (RETIRED)',
      status: 'ALL_TARGETS_COMPLETED',
      achievedTarget: 'ALL_COMPLETE',
      achievedPips: pips,
      achievedTimestamp: lc?.completedTimestamp ?? Date.now(),
      playbookTrigger: `ALL TARGETS ACHIEVED (+${pips} pips total secured). Active Signal Removed. Waiting for Next Setup in ${currentSymbol}.`,
    };

    return cloned;
  }, [rawModelOutput, targetLifecycles, achievedSignals, dismissedSignals, currentSymbol]);

  // Handle triggering next setup in the same symbol or pair
  const handleTriggerNextSetup = useCallback((symbol: string) => {
    setTargetLifecycles((prev) => {
      const copy = { ...prev };
      delete copy[symbol];
      return copy;
    });
    setAchievedSignals((prev) => {
      const copy = { ...prev };
      delete copy[symbol];
      return copy;
    });
    setDismissedSignals((prev) => {
      const copy = { ...prev };
      delete copy[symbol];
      return copy;
    });

    // Advance snapshot slightly to generate fresh order flow dynamics
    setSnapshotIndex((prev) => (prev > 5 ? prev - 2 : 18));

    // Audio & Voice announcement
    playTargetHitSound('NEW_SIGNAL');
    speakAnnouncement(`New order flow edge setup detected on ${symbol}! All take profit targets armed.`, isVoiceAlertsEnabled);

    setToastMessage({
      id: String(Date.now()),
      title: `New Setup Detected on ${symbol}!`,
      subtitle: `Order book edge confirmed. Active signal armed with Take Profit 1, Take Profit 2, and Take Profit 3 targets.`,
    });
  }, [isVoiceAlertsEnabled]);

  // Handle Stop Loss Invalidation
  const handleInvalidateSignal = useCallback((symbol: string, reason: string = 'Hard stop loss breached') => {
    const symModel = computeSniperModel(effectiveSnapshot, effectiveCandles, currentTimeframe);
    const edge = symModel.sniperEdge;
    const inst = INSTRUMENTS[symbol] || currentInst;
    const isTrailedToBE = !!targetLifecycles[symbol]?.tp1Hit;
    const stopPrice = isTrailedToBE ? edge.optimalEntry : edge.hardStopLoss;

    setTargetLifecycles((prev) => ({
      ...prev,
      [symbol]: {
        symbol,
        signalId: prev[symbol]?.signalId || `${symbol}-${Date.now()}`,
        triggerAction: edge.triggerAction,
        optimalEntry: edge.optimalEntry,
        hardStopLoss: edge.hardStopLoss,
        targetTP1: edge.targetTP1,
        targetTP2: edge.targetTP2,
        targetTP3: edge.targetTP3,
        tp1Hit: prev[symbol]?.tp1Hit || false,
        tp2Hit: prev[symbol]?.tp2Hit || false,
        tp3Hit: false,
        allTargetsCompleted: false,
        waitingForNextSetup: true,
        nextSetupCountdown: 15,
        tp1Pips: prev[symbol]?.tp1Pips || 12,
        tp2Pips: prev[symbol]?.tp2Pips || 20,
        tp3Pips: prev[symbol]?.tp3Pips || 35,
        totalPipsSecured: isTrailedToBE ? (prev[symbol]?.totalPipsSecured || 0) : 0,
        lastHitTarget: 'INVALIDATION',
        lastHitTimestamp: Date.now(),
        message: `Stop Loss Invalidation! Price breached ${isTrailedToBE ? 'Breakeven SL' : 'Stop Loss'} at ${stopPrice.toFixed(inst.digits)}. Signal invalidated, standing down.`,
      },
    }));

    setAchievedSignals((prev) => ({
      ...prev,
      [symbol]: {
        symbol,
        triggerAction: edge.triggerAction,
        achievedTarget: 'ALL_COMPLETE',
        achievedPips: 0,
        entryPrice: edge.optimalEntry,
        exitPrice: stopPrice,
        achievedTimestamp: Date.now(),
        reason: `Stop loss invalidation: ${reason}. Signal removed, scanning next setup.`,
      },
    }));

    // Play warning tone
    playTargetHitSound('INVALIDATION');

    // Spoken unified voice alert
    const speech = tradingVoice.generateInvalidationSpeech(symbol, effectivePrice, stopPrice, reason);
    speakAnnouncement(speech, isVoiceAlertsEnabled);

    // Build structured alert
    const invAlert = buildStructuredAlert(
      'INVALIDATION',
      symbol,
      effectivePrice,
      modelOutput,
      modelOutput.marketIntelligence,
      { invalidationReason: reason }
    );
    setLiveStructuredAlerts((prev) => [invAlert, ...prev.filter((a) => a.id !== invAlert.id)].slice(0, 30));

    // Toast
    setToastMessage({
      id: String(Date.now()),
      title: `Stop Loss Invalidation on ${symbol}!`,
      subtitle: `Price breached ${stopPrice.toFixed(inst.digits)}. Limit wall failed. Standing down and scanning next setup.`,
    });
  }, [effectiveSnapshot, effectiveCandles, currentInst, targetLifecycles, effectivePrice, isVoiceAlertsEnabled, modelOutput]);

  // Handle hitting individual targets (TP1 -> TP2 -> TP3)
  const handleHitTarget = useCallback((symbol: string, target: 'TP1' | 'TP2' | 'TP3' = 'TP1') => {
    const symModel = computeSniperModel(effectiveSnapshot, effectiveCandles, currentTimeframe);
    const edge = symModel.sniperEdge;
    const inst = INSTRUMENTS[symbol] || currentInst;

    const tp1Pips = Math.max(12, Math.round(Math.abs(edge.optimalEntry - edge.targetTP1) * inst.pipMultiplier));
    const tp2Pips = Math.max(20, Math.round(Math.abs(edge.optimalEntry - edge.targetTP2) * inst.pipMultiplier));
    const tp3Pips = Math.max(35, Math.round(Math.abs(edge.optimalEntry - edge.targetTP3) * inst.pipMultiplier));

    if (target === 'TP1') {
      const pips = tp1Pips;
      setTargetLifecycles((prev) => {
        const existing = prev[symbol];
        return {
          ...prev,
          [symbol]: {
            symbol,
            signalId: existing?.signalId || `${symbol}-${Date.now()}`,
            triggerAction: edge.triggerAction,
            optimalEntry: edge.optimalEntry,
            hardStopLoss: edge.optimalEntry, // trailed to breakeven!
            targetTP1: edge.targetTP1,
            targetTP2: edge.targetTP2,
            targetTP3: edge.targetTP3,
            tp1Hit: true,
            tp2Hit: existing?.tp2Hit || false,
            tp3Hit: existing?.tp3Hit || false,
            allTargetsCompleted: false,
            waitingForNextSetup: false,
            tp1Pips,
            tp2Pips,
            tp3Pips,
            totalPipsSecured: pips,
            lastHitTarget: 'TP1',
            lastHitTimestamp: Date.now(),
            message: `TP1 achieved (+${pips} pips). Stop trailed to breakeven. Runner targeting TP2.`,
          },
        };
      });

      playTargetHitSound('TP1');
      speakAnnouncement(`Take Profit 1 hit on ${symbol}! ${pips} pips secured. Trailing stop to breakeven, runner targeting Take Profit 2.`, isVoiceAlertsEnabled);

      // Add structured alert
      const tp1Alert = buildStructuredAlert(
        'TAKE_PROFIT_CONTINUATION',
        symbol,
        effectivePrice,
        modelOutput,
        modelOutput.marketIntelligence,
        { targetName: 'TP1' }
      );
      setLiveStructuredAlerts((prev) => [tp1Alert, ...prev.filter((a) => a.id !== tp1Alert.id)].slice(0, 30));

      setToastMessage({
        id: String(Date.now()),
        title: `TP1 HIT on ${symbol}! (+${pips} Pips Secured)`,
        subtitle: `Stop loss trailed to Breakeven (${edge.optimalEntry.toFixed(inst.digits)}). Runner position targeting TP2 & TP3.`,
        pips,
      });
    } else if (target === 'TP2') {
      const pips = tp2Pips;
      const totalSecured = tp1Pips + tp2Pips;

      setTargetLifecycles((prev) => {
        const existing = prev[symbol];
        return {
          ...prev,
          [symbol]: {
            symbol,
            signalId: existing?.signalId || `${symbol}-${Date.now()}`,
            triggerAction: edge.triggerAction,
            optimalEntry: edge.optimalEntry,
            hardStopLoss: edge.optimalEntry,
            targetTP1: edge.targetTP1,
            targetTP2: edge.targetTP2,
            targetTP3: edge.targetTP3,
            tp1Hit: true,
            tp2Hit: true,
            tp3Hit: existing?.tp3Hit || false,
            allTargetsCompleted: false,
            waitingForNextSetup: false,
            tp1Pips,
            tp2Pips,
            tp3Pips,
            totalPipsSecured: totalSecured,
            lastHitTarget: 'TP2',
            lastHitTimestamp: Date.now(),
            message: `TP2 achieved (+${pips} pips). Runner targeting TP3 Macro Liquidity.`,
          },
        };
      });

      playTargetHitSound('TP2');
      speakAnnouncement(`Take Profit 2 hit on ${symbol}! ${pips} pips secured. Runner targeting Take Profit 3 macro liquidity.`, isVoiceAlertsEnabled);

      // Add structured alert
      const tp2Alert = buildStructuredAlert(
        'TAKE_PROFIT_CONTINUATION',
        symbol,
        effectivePrice,
        modelOutput,
        modelOutput.marketIntelligence,
        { targetName: 'TP2' }
      );
      setLiveStructuredAlerts((prev) => [tp2Alert, ...prev.filter((a) => a.id !== tp2Alert.id)].slice(0, 30));

      setToastMessage({
        id: String(Date.now()),
        title: `TP2 HIT on ${symbol}! (+${pips} Pips Secured)`,
        subtitle: `Value boundary reached! Total +${totalSecured} pips booked. Runner targeting TP3 Macro Wall.`,
        pips,
      });
    } else if (target === 'TP3') {
      // ALL TARGETS COMPLETED! REMOVE SIGNAL AND WAIT FOR NEXT SETUP
      const totalSecured = tp1Pips + tp2Pips + tp3Pips;

      setTargetLifecycles((prev) => ({
        ...prev,
        [symbol]: {
          symbol,
          signalId: prev[symbol]?.signalId || `${symbol}-${Date.now()}`,
          triggerAction: edge.triggerAction,
          optimalEntry: edge.optimalEntry,
          hardStopLoss: edge.optimalEntry,
          targetTP1: edge.targetTP1,
          targetTP2: edge.targetTP2,
          targetTP3: edge.targetTP3,
          tp1Hit: true,
          tp2Hit: true,
          tp3Hit: true,
          allTargetsCompleted: true,
          waitingForNextSetup: true,
          nextSetupCountdown: 12,
          tp1Pips,
          tp2Pips,
          tp3Pips,
          totalPipsSecured: totalSecured,
          lastHitTarget: 'TP3',
          lastHitTimestamp: Date.now(),
          completedTimestamp: Date.now(),
          message: `All targets completed! Total +${totalSecured} pips secured. Signal removed, waiting for next setup.`,
        },
      }));

      setAchievedSignals((prev) => ({
        ...prev,
        [symbol]: {
          symbol,
          triggerAction: edge.triggerAction,
          achievedTarget: 'ALL_COMPLETE',
          achievedPips: totalSecured,
          entryPrice: edge.optimalEntry,
          exitPrice: edge.targetTP3,
          achievedTimestamp: Date.now(),
          reason: `All targets TP1, TP2, TP3 achieved (+${totalSecured} pips). Active signal removed, scanning next setup.`,
        },
      }));

      playTargetHitSound('ALL_COMPLETE');
      speakAnnouncement(`All Take Profit targets completed on ${symbol}! Total ${totalSecured} pips secured. Signal removed, waiting for next setup in ${symbol}.`, isVoiceAlertsEnabled);

      // Add structured alert
      const tp3Alert = buildStructuredAlert(
        'TAKE_PROFIT_CONTINUATION',
        symbol,
        effectivePrice,
        modelOutput,
        modelOutput.marketIntelligence,
        { targetName: 'TP3' }
      );
      setLiveStructuredAlerts((prev) => [tp3Alert, ...prev.filter((a) => a.id !== tp3Alert.id)].slice(0, 30));

      setToastMessage({
        id: String(Date.now()),
        title: `ALL TARGETS COMPLETED on ${symbol}! (+${totalSecured} Pips Total)`,
        subtitle: `Active signal removed from chart. Order flow radar is scanning for next edge setup in ${symbol}...`,
        pips: totalSecured,
      });
    }
  }, [effectiveSnapshot, effectiveCandles, currentInst, isVoiceAlertsEnabled, effectivePrice, modelOutput]);

  // Complete all targets immediately (manual override or take full profit)
  const handleCompleteAllTargets = useCallback((symbol: string) => {
    handleHitTarget(symbol, 'TP3');
  }, [handleHitTarget]);

  // Legacy compatibility for dismiss / mark achieved
  const handleMarkTargetAchieved = useCallback((symbol: string, target: 'TP1' | 'TP2' | 'TP3' = 'TP1') => {
    handleHitTarget(symbol, target);
  }, [handleHitTarget]);

  const handleDismissSignal = useCallback((symbol: string) => {
    handleCompleteAllTargets(symbol);
  }, [handleCompleteAllTargets]);

  const handleResetSignal = useCallback((symbol: string) => {
    handleTriggerNextSetup(symbol);
  }, [handleTriggerNextSetup]);

  // Jump to next ready setup across the 13 pairs
  const handleJumpToNextSetup = useCallback(() => {
    const symbols = Object.keys(INSTRUMENTS);
    const nextSym = symbols.find((s) => s !== currentSymbol && !targetLifecycles[s]?.allTargetsCompleted && !targetLifecycles[s]?.waitingForNextSetup && !achievedSignals[s] && !dismissedSignals[s]);
    if (nextSym) {
      setCurrentSymbol(nextSym);
      setSnapshotIndex(23);
      setToastMessage(null);
    } else {
      setCurrentSymbol('XAUUSD');
      setSnapshotIndex(23);
      setToastMessage(null);
    }
  }, [currentSymbol, targetLifecycles, achievedSignals, dismissedSignals]);

  // Track symbol transitions & global alert rate-limiting to prevent overlapping or colliding alerts
  const lastActiveSymbolRef = useRef<string>(currentSymbol);
  const symbolChangeTimeRef = useRef<number>(Date.now());
  const lastGlobalAlertTimeRef = useRef<number>(0);

  // Auto-dismiss toast notifications after 5.5 seconds so they never linger or stack on screen
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 5500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Automated Sequential Target Hit & Stop Loss Invalidation Detection:
  // If price breaches Stop Loss -> invalidate signal, voice alert & stand down
  // If price reaches TP1 -> hit TP1 (tell user, leave signal active)
  // If price reaches TP2 -> hit TP2 (tell user, leave signal active)
  // If price reaches TP3 -> hit TP3 (tell user, remove signal and wait for next)
  useEffect(() => {
    // 1. Guard: When switching symbols, wait for the new symbol's data to stabilize
    if (lastActiveSymbolRef.current !== currentSymbol) {
      lastActiveSymbolRef.current = currentSymbol;
      symbolChangeTimeRef.current = Date.now();
      return;
    }
    // Allow 2.5s stabilization window after symbol switch before live price check
    if (Date.now() - symbolChangeTimeRef.current < 2500) {
      return;
    }

    if (!rawModelOutput.sniperEdge.isEdgeQualified) return;
    const lc = targetLifecycles[currentSymbol];
    if (lc?.allTargetsCompleted || lc?.waitingForNextSetup || achievedSignals[currentSymbol] || dismissedSignals[currentSymbol]) return;

    // Prevent back-to-back lifecycle alerts from colliding within 25 seconds
    if (lc?.lastHitTimestamp && Date.now() - lc.lastHitTimestamp < 25000) {
      return;
    }

    const edge = rawModelOutput.sniperEdge;

    // 2. Sanity check: Ensure effectivePrice actually corresponds to currentSymbol
    // (Prevents stale cross-symbol ticks like Gold 2700 being evaluated against EURUSD 1.08)
    if (edge.optimalEntry > 0 && effectivePrice > 0) {
      const priceDiffRatio = Math.abs(effectivePrice - edge.optimalEntry) / edge.optimalEntry;
      if (priceDiffRatio > 0.20) {
        return; // Cross-symbol mismatch detected, ignore until ticks synchronize
      }
    }

    const isTrailedToBE = !!lc?.tp1Hit;
    const currentStop = isTrailedToBE ? edge.optimalEntry : edge.hardStopLoss;

    if (edge.triggerAction === 'SNIPER_BUY') {
      // 1. Check Stop Loss / Invalidation (requires price to clearly breach below stop loss)
      if (effectivePrice < currentStop - currentInst.tickSize * 0.5 && effectivePrice > 0 && currentStop > 0) {
        lastGlobalAlertTimeRef.current = Date.now();
        handleInvalidateSignal(currentSymbol, isTrailedToBE ? 'Breakeven stop loss breached' : 'Hard stop loss breached');
        return;
      }
      // 2. Check Targets sequentially (one target per cooldown window so TP1, TP2, TP3 never fire all at once)
      if (effectivePrice >= edge.targetTP1 && effectivePrice > 0 && !lc?.tp1Hit) {
        lastGlobalAlertTimeRef.current = Date.now();
        handleHitTarget(currentSymbol, 'TP1');
      } else if (effectivePrice >= edge.targetTP2 && effectivePrice > 0 && lc?.tp1Hit && !lc?.tp2Hit) {
        lastGlobalAlertTimeRef.current = Date.now();
        handleHitTarget(currentSymbol, 'TP2');
      } else if (effectivePrice >= edge.targetTP3 && effectivePrice > 0 && lc?.tp2Hit && !lc?.tp3Hit) {
        lastGlobalAlertTimeRef.current = Date.now();
        handleHitTarget(currentSymbol, 'TP3');
      }
    } else if (edge.triggerAction === 'SNIPER_SELL') {
      // 1. Check Stop Loss / Invalidation (requires price to clearly breach above stop loss)
      if (effectivePrice > currentStop + currentInst.tickSize * 0.5 && effectivePrice > 0 && currentStop > 0) {
        lastGlobalAlertTimeRef.current = Date.now();
        handleInvalidateSignal(currentSymbol, isTrailedToBE ? 'Breakeven stop loss breached' : 'Hard stop loss breached');
        return;
      }
      // 2. Check Targets sequentially (one target per cooldown window so TP1, TP2, TP3 never fire all at once)
      if (effectivePrice <= edge.targetTP1 && effectivePrice > 0 && !lc?.tp1Hit) {
        lastGlobalAlertTimeRef.current = Date.now();
        handleHitTarget(currentSymbol, 'TP1');
      } else if (effectivePrice <= edge.targetTP2 && effectivePrice > 0 && lc?.tp1Hit && !lc?.tp2Hit) {
        lastGlobalAlertTimeRef.current = Date.now();
        handleHitTarget(currentSymbol, 'TP2');
      } else if (effectivePrice <= edge.targetTP3 && effectivePrice > 0 && lc?.tp2Hit && !lc?.tp3Hit) {
        lastGlobalAlertTimeRef.current = Date.now();
        handleHitTarget(currentSymbol, 'TP3');
      }
    }
  }, [
    effectivePrice, 
    rawModelOutput.sniperEdge, 
    currentSymbol, 
    targetLifecycles, 
    achievedSignals, 
    dismissedSignals, 
    handleHitTarget, 
    handleInvalidateSignal,
    currentInst.tickSize
  ]);

  // Background ticker for Next Setup Waiting Countdown (quietly resets countdown without firing colliding voice/sound)
  useEffect(() => {
    const timer = setInterval(() => {
      setTargetLifecycles((prev) => {
        let changed = false;
        const updated = { ...prev };

        Object.keys(updated).forEach((sym) => {
          const item = updated[sym];
          if (item && item.waitingForNextSetup) {
            const nextCount = (item.nextSetupCountdown ?? 30) - 1;
            if (nextCount <= 0) {
              // Keep completed state quiet until user manually clicks Scan Next Setup or switches pair
              updated[sym] = {
                ...item,
                waitingForNextSetup: false,
                nextSetupCountdown: 0,
              };
              changed = true;
            } else {
              updated[sym] = {
                ...item,
                nextSetupCountdown: nextCount,
              };
              changed = true;
            }
          }
        });

        return changed ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Live simulation tick interval (market schedule aware — pauses automatically on closed pairs)
  useEffect(() => {
    if (!isStreaming) return;

    // Real-world market schedule check: do not artificially advance ticks when interbank exchanges are closed
    const schedule = getMarketScheduleStatus(currentSymbol);
    if (schedule.shouldPauseModel) {
      return;
    }

    const interval = setInterval(() => {
      setSnapshotIndex((prev) => {
        if (prev < totalSnapshots - 1) {
          return prev + 1;
        }
        return totalSnapshots - 1;
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [isStreaming, totalSnapshots, currentSymbol]);

  // Continuous Structured Live Market Alerts Engine (§20–§28)
  const lastAlertedSymbolRef = useRef<string>('');
  const lastLevelTapTimeRef = useRef<number>(0);

  const handleGenerateManualAlert = useCallback((type: AlertType) => {
    const alert = buildStructuredAlert(
      type,
      currentSymbol,
      effectivePrice,
      modelOutput,
      modelOutput.marketIntelligence
    );
    setLiveStructuredAlerts((prev) => [
      alert,
      ...prev.filter((a) => !(a.symbol === alert.symbol && a.type === alert.type)),
    ].slice(0, 25));
    lastGlobalAlertTimeRef.current = Date.now();
    playTargetHitSound('ALERT');
    tradingVoice.speak(alert.spokenText || `${alert.headline}. ${alert.summary}`, {
      priority: true,
      force: true,
      category: 'STRUCTURED_ALERT',
      symbol: currentSymbol,
    });
  }, [currentSymbol, effectivePrice, modelOutput]);

  useEffect(() => {
    // Generate ONE primary structured alert card for the selected pair when switching or starting
    // (Prevents dumping 3 alerts at once and colliding with the initial voice briefing)
    if (lastAlertedSymbolRef.current !== currentSymbol && effectivePrice > 0) {
      lastAlertedSymbolRef.current = currentSymbol;
      if (modelOutput.marketSchedule?.shouldPauseModel) {
        return;
      }
      const primaryAlert = buildStructuredAlert(
        modelOutput.sniperEdge.isEdgeQualified
          ? modelOutput.sniperEdge.triggerAction === 'SNIPER_BUY'
            ? 'BUY_SETUP'
            : 'SELL_SETUP'
          : 'CAUTION',
        currentSymbol,
        effectivePrice,
        modelOutput,
        modelOutput.marketIntelligence
      );

      setLiveStructuredAlerts((prev) => [
        primaryAlert,
        ...prev.filter((a) => !(a.symbol === primaryAlert.symbol && a.type === primaryAlert.type)),
      ].slice(0, 25));
    }
  }, [currentSymbol, effectivePrice, modelOutput]);

  // Auction Level Refusal & Acceptance State Machine
  // Intelligently analyzes whether price tested and REFUSED (rejected) or ACCEPTED a key level (POC, VAH, VAL)
  // Keyed strictly by symbol + levelType (not floating price digits) so tick jitter never causes duplicate alerts!
  interface LevelAuctionState {
    status: 'TESTING' | 'REFUSED' | 'ACCEPTED';
    timestamp: number;
    levelPrice: number;
    levelType: 'POC' | 'VAH' | 'VAL';
  }
  const levelAuctionStatesRef = useRef<Record<string, LevelAuctionState>>({});

  useEffect(() => {
    const poc = modelOutput.valueStructure.poc;
    const vah = modelOutput.valueStructure.vah;
    const val = modelOutput.valueStructure.val;
    if (effectivePrice <= 0 || poc <= 0) return;

    const now = Date.now();
    // Respect global alert cooldown (at least 45s since any other alert) and level tap cooldown (90s)
    if (now - lastGlobalAlertTimeRef.current < 45000 || now - lastLevelTapTimeRef.current < 90000) {
      return;
    }

    const levels: { type: 'POC' | 'VAH' | 'VAL'; name: string; price: number }[] = [
      { type: 'POC', name: 'Point of Control', price: poc },
      { type: 'VAH', name: 'Value Area High', price: vah },
      { type: 'VAL', name: 'Value Area Low', price: val },
    ];

    for (const lvl of levels) {
      const distPct = Math.abs(effectivePrice - lvl.price) / lvl.price;
      // Key by symbol + level type only so minor 1-tick POC/VAH shifts never spawn duplicate alerts
      const key = `${currentSymbol}_${lvl.type}`;
      const existing = levelAuctionStatesRef.current[key];

      // If price is within 0.08% of the key level
      if (distPct < 0.0008) {
        if (!existing) {
          // New interaction: register TESTING state
          levelAuctionStatesRef.current[key] = {
            status: 'TESTING',
            timestamp: now,
            levelPrice: lvl.price,
            levelType: lvl.type,
          };
        } else if (existing.status === 'TESTING' && now - existing.timestamp > 12000) {
          const isPushedBack =
            lvl.type === 'VAH' ? effectivePrice < lvl.price :
            lvl.type === 'VAL' ? effectivePrice > lvl.price :
            Math.abs(effectivePrice - lvl.price) / lvl.price > 0.0003;

          const isRefused = isPushedBack || modelOutput.exhaustion.exhaustionScore >= 68;

          lastLevelTapTimeRef.current = now;
          lastGlobalAlertTimeRef.current = now;

          if (isRefused) {
            existing.status = 'REFUSED';
            existing.timestamp = now;

            const refusalAlert = buildStructuredAlert(
              'AUCTION_REFUSAL',
              currentSymbol,
              effectivePrice,
              modelOutput,
              modelOutput.marketIntelligence,
              {
                refusedLevel: lvl.name,
                refusedPrice: lvl.price,
                rejectionSide: lvl.type === 'VAH' || effectivePrice <= lvl.price ? 'SELLERS' : 'BUYERS',
                refusalReason: `Aggressive test into ${lvl.name} met heavy passive absorption and delta exhaustion`,
              }
            );

            setLiveStructuredAlerts((prev) => [
              refusalAlert,
              ...prev.filter((a) => !(a.symbol === refusalAlert.symbol && a.type === refusalAlert.type)),
            ].slice(0, 25));
            playTargetHitSound('ALERT');
            speakAnnouncement(refusalAlert.spokenText, isVoiceAlertsEnabled);
            break;
          } else {
            existing.status = 'ACCEPTED';
            existing.timestamp = now;

            const acceptAlert = buildStructuredAlert(
              'AUCTION_ACCEPTANCE',
              currentSymbol,
              effectivePrice,
              modelOutput,
              modelOutput.marketIntelligence,
              {
                refusedLevel: lvl.name,
                refusedPrice: lvl.price,
                rejectionSide: lvl.type === 'VAH' ? 'BUYERS' : 'SELLERS',
              }
            );

            setLiveStructuredAlerts((prev) => [
              acceptAlert,
              ...prev.filter((a) => !(a.symbol === acceptAlert.symbol && a.type === acceptAlert.type)),
            ].slice(0, 25));
            playTargetHitSound('ALERT');
            break;
          }
        }
        // If existing status is already 'REFUSED' or 'ACCEPTED', SILENCE completely!
      } else if (distPct > 0.0045 && existing) {
        // Price has departed the level by >0.45%: reset state for future auctions
        delete levelAuctionStatesRef.current[key];
      }
    }
  }, [effectivePrice, modelOutput, currentSymbol, isVoiceAlertsEnabled]);

  // Subscribe to trading voice engine speaking state
  useEffect(() => {
    const unsub = tradingVoice.subscribe((speaking) => {
      setIsVoiceSpeaking(speaking);
    });
    return unsub;
  }, []);

  const handleToggleVoiceAlerts = useCallback(() => {
    const nextState = !isVoiceAlertsEnabled;
    setIsVoiceAlertsEnabled(nextState);
    tradingVoice.unlockAudio();
    tradingVoice.updateSettings({
      enabled: nextState,
      cadence: nextState ? 'continuous' : 'muted',
    });
    if (!nextState) {
      tradingVoice.cancelSpeech();
    } else {
      lastGlobalAlertTimeRef.current = Date.now();
      tradingVoice.speak(`Trading voice squawk active. Continuous market surveillance armed.`, {
        priority: true,
        force: true,
        category: 'BRIEFING',
        symbol: currentSymbol,
      });
    }
  }, [isVoiceAlertsEnabled, currentSymbol]);

  const handleInstantBriefing = useCallback(() => {
    lastGlobalAlertTimeRef.current = Date.now();
    const text = tradingVoice.generateInstantBriefing(
      currentSymbol,
      effectivePrice,
      effectiveCandles,
      effectiveSnapshot,
      modelOutput,
      effectiveBubbles
    );
    // Spoken English chart brief once (pure audio - no written briefing popup)
    tradingVoice.speak(text, { priority: true, force: true, category: 'BRIEFING', symbol: currentSymbol });
  }, [currentSymbol, effectivePrice, effectiveCandles, effectiveSnapshot, modelOutput, effectiveBubbles]);

  // Unified Non-Colliding Live Chart Squawk & Alert Coordinator
  const lastSpokenPriceRef = useRef<number>(effectivePrice);
  const lastSymbolRef = useRef<string>('');
  const maxSessionPriceRef = useRef<number>(effectivePrice);
  const minSessionPriceRef = useRef<number>(effectivePrice);
  const lastSpokenSetupKeyRef = useRef<string>('');
  const lastSpokenReversalKeyRef = useRef<string>('');
  const lastImbalanceSpokenTimeRef = useRef<number>(Date.now());
  const lastAutoPulseTimeRef = useRef<number>(Date.now());
  const lastSpokenBubbleIdRef = useRef<string>('');

  useEffect(() => {
    if (lastSymbolRef.current !== currentSymbol && effectivePrice > 0) {
      const now = Date.now();
      lastSymbolRef.current = currentSymbol;
      lastSpokenPriceRef.current = effectivePrice;
      maxSessionPriceRef.current = effectivePrice;
      minSessionPriceRef.current = effectivePrice;
      // Pre-record the current setup direction so the background scanner doesn't immediately re-announce it on top of the initial briefing!
      lastSpokenSetupKeyRef.current = `${currentSymbol}_${modelOutput.sniperEdge.triggerAction}`;
      lastImbalanceSpokenTimeRef.current = now;
      lastAutoPulseTimeRef.current = now;
      lastGlobalAlertTimeRef.current = now;

      // When switching to a closed instrument, immediately silence any active speech
      if (modelOutput.marketSchedule?.shouldPauseModel) {
        tradingVoice.cancelSpeech();
        return;
      }

      // Speak ONE unified trading brief when loading or switching charts (300ms debounce allows live tick data to settle)
      const settings = tradingVoice.getSettings();
      if (isVoiceAlertsEnabled && settings.enabled && settings.cadence !== 'muted') {
        const timer = setTimeout(() => {
          const livePrice = liveMarketMap[`${currentSymbol}_${currentTimeframe}`]?.price ?? effectivePrice;
          const text = tradingVoice.generateInstantBriefing(
            currentSymbol,
            livePrice,
            effectiveCandles,
            effectiveSnapshot,
            modelOutput,
            effectiveBubbles
          );
          tradingVoice.speak(text, { priority: true, force: true, category: 'BRIEFING', symbol: currentSymbol });
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [currentSymbol, effectivePrice, isVoiceAlertsEnabled, effectiveCandles, effectiveSnapshot, modelOutput, effectiveBubbles, currentTimeframe, liveMarketMap]);

  // Continuous Proactive AI Voice Surveillance: Strictly paced (minimum 42s between any two automatic alerts, never interrupts active speech)
  useEffect(() => {
    if (!isVoiceAlertsEnabled || !isStreaming) return;

    // Market Schedule Awareness: Completely pause continuous voice alerts when the market is closed or halted
    if (modelOutput.marketSchedule?.shouldPauseModel) {
      return;
    }

    const settings = tradingVoice.getSettings();
    if (!settings.enabled || settings.cadence === 'muted') return;

    const now = Date.now();

    // Global anti-collision gate: Never fire any automatic background alert if voice is currently speaking
    // or if ANY alert/briefing fired within the last 42 seconds!
    if (tradingVoice.isSpeaking() || now - lastGlobalAlertTimeRef.current < 42000) {
      return;
    }

    // 0. Confirmed Reversal Surveillance:
    // If an institutional absorption reversal is triggered at the defended level, immediately fire a high-priority voice announcement!
    const vaar = modelOutput.valueAreaAbsorptionReclaim;
    if (vaar && vaar.status === 'ABSORPTION_AND_RECLAIM_TRIGGERED' && vaar.signal?.triggerConditionMet) {
      const isBull = vaar.activeSide === 'LONG_BELOW_VAL' || vaar.signal.action === 'BUY';
      const reversalSide: 'BULLISH' | 'BEARISH' = isBull ? 'BULLISH' : 'BEARISH';
      const reversalKey = `${currentSymbol}_REV_${reversalSide}_${Math.round(vaar.defendedLevel * 100)}`;
      
      if (lastSpokenReversalKeyRef.current !== reversalKey) {
        lastSpokenReversalKeyRef.current = reversalKey;
        lastAutoPulseTimeRef.current = now;
        lastGlobalAlertTimeRef.current = now;

        const revAlert = buildStructuredAlert(
          'CONFIRMED_REVERSAL',
          currentSymbol,
          effectivePrice,
          modelOutput,
          modelOutput.marketIntelligence,
          {
            reversalSide,
            reversalLevelName: vaar.defendedLevelLabel,
            defendedPrice: vaar.defendedLevel,
            targetPrice: modelOutput.valueStructure.poc,
            exhaustionPct: Math.max(88, modelOutput.exhaustion.exhaustionScore || 90),
          }
        );

        setLiveStructuredAlerts((prev) => [
          revAlert,
          ...prev.filter((a) => !(a.symbol === revAlert.symbol && a.type === revAlert.type)),
        ].slice(0, 25));

        setToastMessage({
          id: revAlert.id,
          title: `↩️ REVERSAL CONFIRMED on ${currentSymbol}!`,
          subtitle: `${reversalSide} reversal active at ${vaar.defendedLevel.toFixed(currentInst.digits)}. Target: POC (${modelOutput.valueStructure.poc.toFixed(currentInst.digits)})`,
        });

        playTargetHitSound('ALERT');
        tradingVoice.speak(revAlert.spokenText, {
          priority: true,
          force: true,
          category: 'STRUCTURED_ALERT',
          symbol: currentSymbol,
          cooldownMs: 25000,
        });
        return;
      }
    }

    // 1. Armed setup direction change announcement: Only fires when the pair's directional triggerAction actually flips
    // (Keyed by symbol + triggerAction only, NOT floating optimalEntry digits, so tick updates never spam setup alerts)
    if (modelOutput.sniperEdge.isEdgeQualified) {
      const setupKey = `${currentSymbol}_${modelOutput.sniperEdge.triggerAction}`;
      if (lastSpokenSetupKeyRef.current !== setupKey) {
        lastSpokenSetupKeyRef.current = setupKey;
        lastAutoPulseTimeRef.current = now;
        lastGlobalAlertTimeRef.current = now;
        const alertType = modelOutput.sniperEdge.triggerAction === 'SNIPER_BUY' ? 'BUY_SETUP' : 'SELL_SETUP';
        const alert = buildStructuredAlert(
          alertType,
          currentSymbol,
          effectivePrice,
          modelOutput,
          modelOutput.marketIntelligence
        );
        setLiveStructuredAlerts((prev) => [
          alert,
          ...prev.filter((a) => !(a.symbol === alert.symbol && a.type === alert.type)),
        ].slice(0, 25));
        tradingVoice.speak(alert.spokenText, {
          priority: false,
          category: 'STRUCTURED_ALERT',
          symbol: currentSymbol,
          cooldownMs: 45000,
        });
        return;
      }
    }

    // 2. Live Visual Tape Alert Scanner: Fires at most once every 55 seconds when high-conviction Contract Stacking, Liquidation Squeeze, or Velocity Ignition unfolds
    if (now - lastImbalanceSpokenTimeRef.current > 55000) {
      const liveTapeAlert = detectDynamicVisualTapeAlert(
        currentSymbol,
        effectivePrice,
        effectiveCandles,
        effectiveSnapshot,
        modelOutput,
        effectiveBubbles
      );
      if (liveTapeAlert) {
        const tapeAlertKey = `${currentSymbol}_${liveTapeAlert.type}`;
        if (lastSpokenBubbleIdRef.current !== tapeAlertKey || now - lastImbalanceSpokenTimeRef.current > 110000) {
          lastSpokenBubbleIdRef.current = tapeAlertKey;
          lastImbalanceSpokenTimeRef.current = now;
          lastAutoPulseTimeRef.current = now;
          lastGlobalAlertTimeRef.current = now;

          setLiveStructuredAlerts((prev) => [
            liveTapeAlert,
            ...prev.filter((a) => !(a.symbol === liveTapeAlert.symbol && a.type === liveTapeAlert.type)),
          ].slice(0, 25));

          setToastMessage({
            id: liveTapeAlert.id,
            title: liveTapeAlert.headline,
            subtitle: liveTapeAlert.summary,
          });

          playTargetHitSound('ALERT');
          tradingVoice.speak(liveTapeAlert.spokenText, {
            priority: false,
            category: 'STRUCTURED_ALERT',
            symbol: currentSymbol,
            cooldownMs: 45000,
          });
          return;
        }
      }
    }

    // 3. Automatic Periodic Desk Voice Update (every 75s of quiet in continuous mode so user gets steady updates without spam)
    if (settings.cadence === 'continuous' && now - lastAutoPulseTimeRef.current > 75000 && !tradingVoice.isSpeaking()) {
      lastAutoPulseTimeRef.current = now;
      lastGlobalAlertTimeRef.current = now;
      const evt = tradingVoice.generateEventCommentary(
        currentSymbol,
        effectivePrice,
        effectiveCandles,
        effectiveSnapshot,
        modelOutput,
        'PERIODIC_PULSE'
      );
      tradingVoice.speak(evt.text, {
        priority: false,
        category: evt.category,
        symbol: currentSymbol,
        cooldownMs: 60000,
      });
    }
  }, [
    isVoiceAlertsEnabled,
    isStreaming,
    currentSymbol,
    effectivePrice,
    effectiveCandles,
    effectiveSnapshot,
    effectiveBubbles,
    modelOutput,
  ]);

  return (
    <div className="min-h-screen bg-[#070a10] text-[#e2e8f0] flex flex-col font-sans">
      {/* 1. Header (Follows Top Bar Contract) */}
      <Header
        currentSymbol={currentSymbol}
        onSelectSymbol={(sym) => {
          setCurrentSymbol(sym);
          setSnapshotIndex(23);
        }}
        activeView={activeView}
        setActiveView={setActiveView}
        isStreaming={isStreaming}
        onToggleStreaming={() => setIsStreaming(!isStreaming)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenScorecard={() => setIsScorecardOpen(true)}
        onOpenCrowdGuide={() => setIsCrowdGuideOpen(true)}
        onOpenLiveInspector={() => setIsLiveInspectorOpen(true)}
        modelOutput={modelOutput}
        isLiveConnected={isLiveConnected}
        tickCount={totalTicksCached}
        isSignalAchieved={!!currentLifecycle?.allTargetsCompleted || !!achievedSignals[currentSymbol] || !!dismissedSignals[currentSymbol] || !!currentLifecycle?.waitingForNextSetup}
        achievedPips={currentLifecycle?.totalPipsSecured ?? achievedSignals[currentSymbol]?.achievedPips ?? 28}
        isVoiceAlertsEnabled={isVoiceAlertsEnabled}
        onToggleVoiceAlerts={handleToggleVoiceAlerts}
        onOpenVoiceSettings={() => setIsVoiceModalOpen(true)}
        onInstantBriefing={handleInstantBriefing}
        isVoiceSpeaking={isVoiceSpeaking}
        lifecycle={currentLifecycle}
        currentTimeframe={currentTimeframe}
        onOpenModelAnalysis={() => setIsModelAnalysisOpen(true)}
        onSelectTimeframe={(tf) => {
          setCurrentTimeframe(tf);
          tradingVoice.speak(`Timeframe changed to ${tf}. Reassessing market structure and order flow for ${currentSymbol === 'XAUUSD' ? 'Gold' : currentSymbol}.`, { priority: true, category: 'BRIEFING', symbol: currentSymbol });
          // Advance snapshot index slightly to refresh technical calculations for new timeframe
          setSnapshotIndex((prev) => (prev > 5 ? prev - 1 : 19));
        }}
      />

      {/* Real-Time Unified Live Intelligence, Voice Squawk & Alerts Hub */}
      <LiveSquawkBar
        currentSymbol={currentSymbol}
        currentPrice={effectivePrice}
        candles={effectiveCandles}
        snapshot={effectiveSnapshot}
        modelOutput={modelOutput}
        onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
        onInstantBriefing={handleInstantBriefing}
        onOpenModelAnalysis={() => setIsModelAnalysisOpen(true)}
        liveAlerts={liveStructuredAlerts}
        onGenerateAlertNow={handleGenerateManualAlert}
      />

      {/* 2. Main Workspace */}
      <main className="flex-1 flex flex-col p-2 sm:p-3 md:p-4 gap-3 sm:gap-4 max-w-[1720px] w-full mx-auto overflow-x-hidden safe-pb">
        {/* Real-World Market Schedule Status Banner (Auto-hidden whenever market is open) */}
        {(() => {
          const schedule = modelOutput.marketSchedule || getMarketScheduleStatus(currentSymbol);
          // When market is open, remove this banner completely
          if (!schedule.shouldPauseModel || schedule.isOpen) return null;

          return (
            <div
              className="px-3 py-2.5 rounded-lg border shadow-md flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono transition-all bg-[#180a10] border-rose-500/50 text-rose-200"
            >
              <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                <span
                  className="px-2 py-0.5 font-bold rounded flex items-center gap-1.5 shrink-0 bg-rose-500 text-white"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>{schedule.statusBadge}</span>
                </span>
                <span className="font-sans font-medium text-slate-200">
                  {currentSymbol} market is paused: {schedule.reason}
                </span>
                {schedule.timeUntilOpenFormatted && (
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-black/60 border border-slate-700/60 text-slate-300 shrink-0">
                    Next open in {schedule.timeUntilOpenFormatted}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0 text-slate-400 font-sans text-[11px]">
                <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>Surveillance paused until market open</span>
              </div>
            </div>
          );
        })()}

        {/* VIEW 1: COMBINED SPLIT TERMINAL (Chart + OrderBook side-by-side + Infographic Engine below) */}
        {activeView === 'combined' && (
          <div className="flex flex-col gap-3">
            {/* Top Quick Trade Execution & Target Milestone Strip (Only shown when a setup is active or completed) */}
            {(() => {
              const isAchieved = !!currentLifecycle?.allTargetsCompleted || !!achievedSignals[currentSymbol] || !!dismissedSignals[currentSymbol] || !!currentLifecycle?.waitingForNextSetup;
              const pips = currentLifecycle?.totalPipsSecured ?? achievedSignals[currentSymbol]?.achievedPips ?? 28;
              const countdown = currentLifecycle?.nextSetupCountdown ?? 18;

              if (isAchieved) {
                return (
                  <div className="px-3 py-2 rounded-lg border bg-[#051510] border-emerald-500/50 shadow-md flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 font-bold rounded bg-emerald-500 text-black flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>TARGETS COMPLETED</span>
                      </span>
                      <span className="text-emerald-300 font-bold">+{pips} Pips Secured</span>
                      <span className="text-slate-500">·</span>
                      <span className="text-slate-300 font-sans">Next setup scanning (~{countdown}s)</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleTriggerNextSetup(currentSymbol)}
                        className="px-2.5 py-1 text-xs font-bold rounded bg-cyan-500 hover:bg-cyan-400 text-black cursor-pointer transition-colors"
                      >
                        Scan Next Setup
                      </button>
                      <button
                        onClick={() => handleResetSignal(currentSymbol)}
                        className="px-2 py-1 text-xs rounded bg-[#101726] hover:bg-[#1a253c] text-slate-300 border border-[#22304c] cursor-pointer"
                      >
                        Re-Arm
                      </button>
                    </div>
                  </div>
                );
              }

              if (modelOutput.sniperEdge.isEdgeQualified) {
                const isBuy = modelOutput.sniperEdge.triggerAction === 'SNIPER_BUY';
                const tp1Hit = !!currentLifecycle?.tp1Hit;
                const tp2Hit = !!currentLifecycle?.tp2Hit;
                const tp1Pips = currentLifecycle?.tp1Pips ?? Math.max(12, Math.round(Math.abs(modelOutput.sniperEdge.optimalEntry - modelOutput.sniperEdge.targetTP1) * currentInst.pipMultiplier));
                const tp2Pips = currentLifecycle?.tp2Pips ?? Math.max(20, Math.round(Math.abs(modelOutput.sniperEdge.optimalEntry - modelOutput.sniperEdge.targetTP2) * currentInst.pipMultiplier));

                return (
                  <div className={`px-3 py-2 rounded-lg border flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono shadow-md ${
                    tp2Hit
                      ? 'bg-[#041a13] border-emerald-500/60'
                      : tp1Hit
                      ? 'bg-[#041716] border-emerald-500/50'
                      : isBuy
                      ? 'bg-[#051515] border-emerald-600/40'
                      : 'bg-[#18080a] border-red-600/40'
                  }`}>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 ${
                        tp2Hit
                          ? 'bg-emerald-400 text-black'
                          : tp1Hit
                          ? 'bg-emerald-500 text-black'
                          : isBuy
                          ? 'bg-emerald-500 text-black'
                          : 'bg-red-500 text-white'
                      }`}>
                        {tp2Hit ? 'TP1 & TP2 HIT (+RUNNER TP3)' : tp1Hit ? 'TP1 HIT (SL BREAKEVEN)' : isBuy ? 'BUY SETUP' : 'SELL SETUP'}
                      </span>

                      <div className="flex items-center gap-2 text-[11px] text-slate-300">
                        <span>Entry: <strong className="text-white">{modelOutput.sniperEdge.optimalEntry.toFixed(currentInst.digits)}</strong></span>
                        <span className="text-slate-600">|</span>
                        <span className={tp1Hit ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                          {tp1Hit ? 'SL: Breakeven' : `SL: ${modelOutput.sniperEdge.hardStopLoss.toFixed(currentInst.digits)}`}
                        </span>
                        <span className="text-slate-600">|</span>
                        <span className={tp1Hit ? 'text-emerald-400 font-bold' : 'text-emerald-300'}>
                          TP1: {tp1Hit ? '✓ Hit' : modelOutput.sniperEdge.targetTP1.toFixed(currentInst.digits)}
                        </span>
                        <span className="text-slate-600">|</span>
                        <span className={tp2Hit ? 'text-emerald-400 font-bold' : 'text-emerald-300'}>
                          TP2: {tp2Hit ? '✓ Hit' : modelOutput.sniperEdge.targetTP2.toFixed(currentInst.digits)}
                        </span>
                        <span className="text-slate-600">|</span>
                        <span className="text-emerald-400">
                          TP3: {modelOutput.sniperEdge.targetTP3.toFixed(currentInst.digits)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!tp1Hit && (
                        <button
                          onClick={() => handleHitTarget(currentSymbol, 'TP1')}
                          className="px-2.5 py-1 text-xs font-bold rounded bg-emerald-500 hover:bg-emerald-400 text-black cursor-pointer shadow-xs transition-colors"
                          title="Simulate hitting TP1 (Locks profit, trails SL to Breakeven, keeps runner targeting TP2)"
                        >
                          Hit TP1 (+{tp1Pips}p)
                        </button>
                      )}

                      {tp1Hit && !tp2Hit && (
                        <button
                          onClick={() => handleHitTarget(currentSymbol, 'TP2')}
                          className="px-2.5 py-1 text-xs font-bold rounded bg-emerald-500 hover:bg-emerald-400 text-black cursor-pointer shadow-xs transition-colors"
                          title="Simulate hitting TP2 (Locks runner profit, targets TP3)"
                        >
                          Hit TP2 (+{tp2Pips}p)
                        </button>
                      )}

                      {tp2Hit && (
                        <button
                          onClick={() => handleHitTarget(currentSymbol, 'TP3')}
                          className="px-2.5 py-1 text-xs font-bold rounded bg-emerald-500 hover:bg-emerald-400 text-black cursor-pointer shadow-xs transition-colors"
                          title="Hit TP3: Completes all targets, removes signal from chart, starts waiting for next setup"
                        >
                          Hit TP3 (Complete All)
                        </button>
                      )}

                      <button
                        onClick={() => handleCompleteAllTargets(currentSymbol)}
                        className="px-2 py-1 text-xs rounded bg-[#101726] hover:bg-emerald-950 text-slate-300 hover:text-emerald-300 border border-slate-700 cursor-pointer transition-colors"
                        title="Complete all targets now and scan next setup"
                      >
                        Complete All
                      </button>
                    </div>
                  </div>
                );
              }

              // When auction is balanced, render nothing to keep the chart clean and uncluttered!
              return null;
            })()}

            {/* Top Row: Candlestick Chart (with Footprint Bubbles and Red Snapshot Cross Mark) + Two-Sided OrderBook */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 bg-[#0a0e17] rounded-lg border border-[#162136] overflow-hidden shadow-lg">
              {/* Left/Center: Candlestick & Footprint Chart (7-8 cols) */}
              <div className="lg:col-span-8 p-1 sm:p-2 flex flex-col">
                <CandleChartWithBubbles
                  candles={effectiveCandles}
                  bubbles={effectiveBubbles}
                  snapshot={effectiveSnapshot}
                  snapshotIndex={snapshotIndex}
                  totalSnapshots={totalSnapshots}
                  onSelectSnapshotIndex={setSnapshotIndex}
                  modelOutput={modelOutput}
                  showBubbles={settings.showFootprintBubbles}
                  onDismissSignal={handleDismissSignal}
                  isSignalDismissed={!!currentLifecycle?.allTargetsCompleted || !!achievedSignals[currentSymbol] || !!dismissedSignals[currentSymbol] || !!currentLifecycle?.waitingForNextSetup}
                  lifecycle={currentLifecycle}
                  onHitTarget={handleHitTarget}
                  onCompleteAllTargets={handleCompleteAllTargets}
                  onTriggerNextSetup={handleTriggerNextSetup}
                  onInstantBriefing={handleInstantBriefing}
                  onOpenVoiceSettings={() => setIsVoiceModalOpen(true)}
                />
              </div>

              {/* Right: Two-Sided OrderBook Indicator (4 cols, matching indctr.PNG) */}
              <div className="lg:col-span-4 min-h-[460px] lg:min-h-[520px] flex flex-col">
                <OrderBookIndicator
                  snapshot={effectiveSnapshot}
                  snapshotIndex={snapshotIndex}
                  totalSnapshots={totalSnapshots}
                  onSelectSnapshotIndex={setSnapshotIndex}
                  settings={settings}
                  onUpdateSettings={handleUpdateSettings}
                  isStreaming={isStreaming}
                  onToggleStreaming={() => setIsStreaming(!isStreaming)}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  marketIntelligence={modelOutput.marketIntelligence}
                />
              </div>
            </div>

            {/* Unified Non-Repeating Section 2: Exhaustion Gauges, 5-Gate Pre-Signal Liquidity Scanner & 13-Pair Radar */}
            <div className="w-full">
              <SniperEdgeRadar
                currentSymbol={currentSymbol}
                instrument={currentInst}
                modelOutput={modelOutput}
                currentPrice={effectivePrice}
                onSelectSymbol={(sym) => {
                  setCurrentSymbol(sym);
                  setSnapshotIndex(23);
                }}
                onOpenScorecard={() => setIsScorecardOpen(true)}
                onDismissSignal={handleDismissSignal}
                onMarkAchieved={handleHitTarget}
                onResetSignal={handleResetSignal}
                onJumpToNextSetup={handleJumpToNextSetup}
                onTriggerNextSetup={handleTriggerNextSetup}
                isSignalDismissed={!!currentLifecycle?.allTargetsCompleted || !!achievedSignals[currentSymbol] || !!dismissedSignals[currentSymbol] || !!currentLifecycle?.waitingForNextSetup}
                lifecycle={currentLifecycle}
                achievedSignalsRecord={achievedSignals}
                targetLifecyclesRecord={targetLifecycles}
                embeddedMode={true}
                currentTimeframe={currentTimeframe}
              />
            </div>

            {/* Unified Non-Repeating Section 3: Live Infographic, G0–G6 Pipeline, Market Auction & Macro News Engine */}
            <div className="w-full bg-[#0a0e17] rounded-lg border border-[#162136] p-3 shadow-lg">
              <InfographicEngine
                modelOutput={modelOutput}
                onOpenScorecard={() => setIsScorecardOpen(true)}
                digits={currentInst.digits}
                currentSymbol={currentSymbol}
              />
            </div>

            {/* Unified Non-Repeating Section 4: Bookmap Liquidity Depth Visualizer */}
            <div className="w-full">
              <LiquidityHeatmapVisualizer
                candles={effectiveCandles}
                instrument={currentInst}
                modelOutput={modelOutput}
                currentPrice={effectivePrice}
                onSelectSymbol={(sym) => {
                  setCurrentSymbol(sym);
                  setSnapshotIndex(23);
                }}
              />
            </div>
          </div>
        )}
      </main>

      {/* 3. Footer - SMARTFX AUTOMATION Brand */}
      <footer className="border-t border-[#161d2e] bg-[#090d16] px-5 py-3.5 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 shadow-lg">
        <div className="flex items-center gap-3 font-mono text-[11px] flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
            <span className="text-white font-extrabold tracking-wider text-xs bg-gradient-to-r from-amber-400 via-orange-400 to-cyan-400 bg-clip-text text-transparent">
              SMARTFX AUTOMATION
            </span>
          </div>
          <span className="text-slate-600">·</span>
          <span className="text-slate-300 font-medium">Institutional Order Flow & Algorithmic Execution Platform</span>
          <span className="text-slate-600">·</span>
          <span className="text-amber-400/90 font-semibold">Proprietary Liquidity Engine</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-slate-500 font-mono">
          <span className="text-slate-400">Institutional Execution Architecture</span>
          <span className="text-slate-700">|</span>
          <span>© {new Date().getFullYear()} SMARTFX AUTOMATION. All Rights Reserved.</span>
        </div>
      </footer>

      {/* Modals */}
      <LiveDataInspectorModal
        isOpen={isLiveInspectorOpen}
        onClose={() => setIsLiveInspectorOpen(false)}
        currentSymbol={currentSymbol}
        livePrice={effectivePrice}
        digits={currentInst.digits}
        candles={effectiveCandles}
        ticks={effectiveTicks}
        totalTicksCount={totalTicksCached}
        systemStatus={systemStatus}
        isStreaming={isStreaming}
        onRefreshTicks={handleRefreshTicks}
        isRefreshing={isRefreshingTicks}
        sourceTradingView={currentInst.tvMarket}
        sourceDukascopy={currentInst.dukaInstrument}
      />

      <ConfluenceScorecardModal
        isOpen={isScorecardOpen}
        onClose={() => setIsScorecardOpen(false)}
        modelOutput={modelOutput}
      />

      <OrderBookSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />

      <CrowdBehaviorGuide
        isOpen={isCrowdGuideOpen}
        onClose={() => setIsCrowdGuideOpen(false)}
      />

      <TradingVoiceModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        currentSymbol={currentSymbol}
        onInstantBriefing={handleInstantBriefing}
        liveAlerts={liveStructuredAlerts}
      />

      <FullModelAnalysisModal
        isOpen={isModelAnalysisOpen}
        onClose={() => setIsModelAnalysisOpen(false)}
        currentSymbol={currentSymbol}
        currentPrice={effectivePrice}
        candles={effectiveCandles}
        snapshot={effectiveSnapshot}
        modelOutput={modelOutput}
      />

      {/* Target Achieved Celebratory Floating Toast */}
      {toastMessage && (
        <div className="fixed bottom-3 sm:bottom-6 right-3 sm:right-6 left-3 sm:left-auto z-50 max-w-md bg-[#041a13] border-2 border-emerald-500 text-white p-3 sm:p-4 rounded-xl shadow-2xl shadow-emerald-950/80 flex items-start gap-3 backdrop-blur-md">
          <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-emerald-300">{toastMessage.title}</h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">{toastMessage.subtitle}</p>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleJumpToNextSetup}
                className="px-3 py-1 text-xs font-bold rounded bg-emerald-500 text-black hover:bg-emerald-400 transition-colors flex items-center gap-1 shadow-xs"
              >
                <Target className="w-3.5 h-3.5" />
                <span>Find Next Setup</span>
              </button>
              <button
                onClick={() => setToastMessage(null)}
                className="px-2.5 py-1 text-xs text-slate-400 hover:text-white"
              >
                Dismiss
              </button>
            </div>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white text-xs p-1"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
