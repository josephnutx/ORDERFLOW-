import { MarketIntelligenceOutput } from './marketIntelligence';
import type { MarketScheduleStatus } from '../services/marketHoursService';

export type ModelRegime = 'TREND' | 'MEAN_REVERT' | 'STAND_DOWN';
export type ModelBias = 'LONG' | 'SHORT' | 'NONE';
export type AuctionState = 'balance' | 'imbalance' | 'transition';
export type PlayId = 'PLAY_A' | 'PLAY_B' | 'PLAY_C' | 'PLAY_D' | 'PLAY_E' | 'PLAY_F' | 'PLAY_G';
export type ModelGrade = 'A+' | 'A' | 'B' | 'NO_TRADE';

export interface ExhaustionState {
  exhaustedSide: 'BUYERS' | 'SELLERS' | 'BALANCED';
  exhaustionScore: number; // 0 - 100%
  powerRemaining: number; // 0 - 100% (attacking side remaining momentum)
  buyerPower: number; // 0 - 100%
  sellerPower: number; // 0 - 100%
  status: 'AGGRESSIVE_SELLERS_EXHAUSTED' | 'AGGRESSIVE_BUYERS_EXHAUSTED' | 'WANING_MOMENTUM' | 'BALANCED_PRESSURE';
  headline: string;
  mechanismDetail: string;
  divergence: 'BULLISH_DELTA_DIVERGENCE' | 'BEARISH_DELTA_DIVERGENCE' | 'NONE';
  absorptionVolume: number;
  trappedVolume: number;
  trappedCrowdLabel: string;
  exhaustionCandleIndex?: number;
  exhaustionPrice?: number;
}

export type SniperSignalStatus = 
  | 'EDGE_CONFIRMED_TRIGGERED'
  | 'APPROACHING_EDGE'
  | 'TP1_ACHIEVED_RUNNER_ACTIVE'
  | 'TP2_ACHIEVED_RUNNER_ACTIVE'
  | 'ALL_TARGETS_COMPLETED'
  | 'WAITING_FOR_NEXT_SETUP'
  | 'STOP_INVALIDATED'
  | 'CHOP_NO_EDGE';

export interface TargetHitsProgress {
  tp1Hit: boolean;
  tp2Hit: boolean;
  tp3Hit: boolean;
  allCompleted: boolean;
  tp1Pips?: number;
  tp2Pips?: number;
  tp3Pips?: number;
  totalPipsSecured: number;
  activeTarget: 'TP1' | 'TP2' | 'TP3' | 'ALL_COMPLETED';
}

export interface SymbolTargetLifecycle {
  symbol: string;
  signalId: string;
  triggerAction: 'SNIPER_BUY' | 'SNIPER_SELL' | 'WAIT_FOR_EDGE';
  optimalEntry: number;
  hardStopLoss: number;
  targetTP1: number;
  targetTP2: number;
  targetTP3: number;
  tp1Hit: boolean;
  tp2Hit: boolean;
  tp3Hit: boolean;
  allTargetsCompleted: boolean;
  waitingForNextSetup: boolean;
  tp1Pips: number;
  tp2Pips: number;
  tp3Pips: number;
  totalPipsSecured: number;
  lastHitTarget?: 'TP1' | 'TP2' | 'TP3' | 'INVALIDATION' | null;
  lastHitTimestamp?: number;
  completedTimestamp?: number;
  nextSetupCountdown?: number;
  message?: string;
}

export interface LiquiditySweepGateItem {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface LiquiditySweepManipulationAudit {
  allAttractingLiquidityCleared: boolean;
  manipulationCleared: boolean;
  sweptLiquidityPrice: number;
  sweptLiquidityVolumeLots: number;
  unclaimedAttractingPoolPrice?: number;
  opposingTargetPoolPrice: number;
  manipulationPhase: 'COMPLETE_RECLAIMED' | 'ACTIVE_STOP_HUNT_WAIT' | 'ATTRACTING_TO_POOL_WAIT' | 'INSIDE_VALUE_NEUTRAL';
  scannerStageLabel: string;
  fiveGateChecklist: LiquiditySweepGateItem[];
}

export interface OrderFlowScalpSignal {
  setup: 'SHORT_SCALP_HVN_ABSORPTION' | 'LONG_SCALP_HVN_ABSORPTION' | 'SCANNING_HVN_ABSORPTION';
  side: 'SELL' | 'BUY' | 'STAND_BY';
  title: string;
  isTriggered: boolean;
  hvnPrice: number;
  hvnDescription: string;
  imbalance: {
    aggressiveSide: 'BUYERS' | 'SELLERS' | 'BALANCED';
    ratioText: string;
    description: string;
  };
  heavyAbsorption: {
    detected: boolean;
    passiveSide: 'PASSIVE_SELLERS' | 'PASSIVE_BUYERS' | 'NONE';
    absorptionVolume: number;
    description: string;
  };
  domBehavior: {
    restingLiquidityLots: number;
    replenishmentDetected: boolean;
    pullingState: string;
    failureDescription: string;
  };
  entryZone: {
    timing: 'ENTRY_DURING_WICK_FORMATION';
    triggerPrice: number;
    label: string;
  };
  stopLoss: {
    price: number;
    placement: string;
  };
  exitCondition: string;
  executionRules: {
    noScoringChecklist: boolean;
    noWaitingForCandleClosure: boolean;
    entryDuringWickFormation: boolean;
    stopLossBeyondAbsorptionExtreme: boolean;
    exitIfAbsorptionFails: boolean;
    ruleSummary: string[];
  };
  corePrinciple: string;
  accuracyVerification?: {
    accuracyRate: number; // e.g. 98.6
    isConfirmedSafe: boolean;
    safetyGates: {
      id: string;
      label: string;
      verified: boolean;
      detail: string;
    }[];
    reboundRetractionTicks: number; // e.g. +1.5 ticks off wick low
    lossPreventionRule: string;
    maxRiskPips: number;
  };
}

export interface ValueAreaAbsorptionReclaimStrategy {
  name: 'VALUE AREA ABSORPTION & RECLAIM';
  activeSide: 'LONG_BELOW_VAL' | 'SHORT_ABOVE_VAH' | 'INSIDE_VALUE_MONITOR';
  status: 
    | 'ABSORPTION_AND_RECLAIM_TRIGGERED'
    | 'ABSORPTION_IN_PROGRESS'
    | 'ACCEPTANCE_OUTSIDE_VALUE_TRENDING'
    | 'INSIDE_VALUE_EQUILIBRIUM';
  defendedLevel: number;
  defendedLevelLabel: string;
  acceptedValueArea: {
    vah: number;
    poc: number;
    val: number;
    currentPrice: number;
    zoneState: 'BELOW_VAL' | 'ABOVE_VAH' | 'INSIDE_VALUE';
  };
  auctionContext: {
    classification: 'FAILED_AUCTION_REVERSION' | 'GENUINE_PRICE_DISCOVERY' | 'BALANCED_AUCTION';
    isFailedAuctionReversion: boolean; // Low Volume + Absorption + Value Reclaim
    isGenuinePriceDiscovery: boolean;  // Rising Volume + Acceptance Outside Value
    volumeParticipationTrend: 'DECLINING_OUTSIDE_VALUE' | 'RISING_ACCEPTANCE_OUTSIDE' | 'EXPANDING_ON_RECLAIM' | 'BALANCED';
    volumeTrendDescription: string;
    orderFlowEvidence: {
      measurementTier: 'REAL_INTERBANK_DEPTH_AND_TICKS' | 'ESTIMATED_APPROXIMATION';
      aggressiveVolume: number;
      absorbedContracts: number;
      domWallDepthLots: number;
      delta: number;
      deltaDirection: 'AGGRESSIVE_SELLING' | 'AGGRESSIVE_BUYING' | 'NEUTRAL';
      priceProgressPips: number;
      failurePointPrice: number;
      failureExplanation: string;
    };
  };
  signal: {
    action: 'BUY' | 'SELL' | 'NO_ENTRY';
    triggerConditionMet: boolean;
    triggerHeadline: string;
    entryTrigger: string;
    entryPrice: number;
    stopLoss: number;
    invalidationCondition: string;
    targetProgression: {
      stage1: { label: string; price: number; hit: boolean };
      stage2: { label: string; price: number; hit: boolean };
      stage3: { label: string; price: number; hit: boolean };
    };
  };
  bubbleAnnotation?: {
    type: 'SELL_ABSORPTION' | 'BUY_ABSORPTION' | 'NONE';
    price: number;
    volume: number;
    label: string;
  };
}

export interface SniperEdgeEntry {
  isEdgeQualified: boolean;
  edgeType: 'VALUE_AREA_LOW' | 'VALUE_AREA_HIGH' | 'CONSOLIDATION_BID_SHELF' | 'OVERHEAD_ASK_WALL' | 'NO_EDGE_INSIDE_CHOP';
  edgePrice: number;
  edgeLabel: string;
  triggerAction: 'SNIPER_BUY' | 'SNIPER_SELL' | 'WAIT_FOR_EDGE';
  actionBadge: 
    | 'SNIPER BUY READY' 
    | 'SNIPER SELL READY' 
    | 'TP1 HIT · RUNNER TARGETING TP2' 
    | 'TP2 HIT · RUNNER TARGETING TP3' 
    | 'ALL TARGETS COMPLETED (RETIRED)' 
    | 'WAITING FOR NEXT SETUP'
    | 'WAITING FOR EDGE';
  status: SniperSignalStatus;
  isAchieved?: boolean;
  achievedTarget?: 'TP1' | 'TP2' | 'TP3' | 'ALL_COMPLETE' | 'MANUAL_DISMISSED';
  achievedPips?: number;
  achievedTimestamp?: number;
  progress?: TargetHitsProgress;
  waitingForNextSetup?: boolean;
  nextSetupCountdown?: number;
  optimalEntry: number;
  entryZoneMin: number;
  entryZoneMax: number;
  hardStopLoss: number;
  targetTP1: number; // Fair Value Center (POC)
  targetTP2: number; // Opposite Value Edge
  targetTP3: number; // Macro Liquidity Wall
  riskRewardRatio: number;
  potentialPipsRisk: number;
  potentialPipsReward: number;
  confidenceScore: number;
  playbookTrigger: string;
  reasons: string[];
  liquiditySweepAudit?: LiquiditySweepManipulationAudit;
  orderFlowScalp?: OrderFlowScalpSignal;
  valueAreaAbsorptionReclaim?: ValueAreaAbsorptionReclaimStrategy;
}

export interface SniperModelOutput {
  // Level 1: Current Model State
  state: {
    badge: 'BULLISH' | 'BEARISH' | 'BALANCED' | 'TRANSITION' | 'STAND DOWN' | 'WAITING FOR CONFIRMATION';
    color: 'green' | 'red' | 'yellow' | 'orange' | 'white' | 'blue';
    headline: string;
    subheadline: string;
    isNoTrade: boolean;
    noTradeReason?: string;
  };

  // Level 2: Current Price & Location
  location: {
    currentPrice: number;
    relationToValue: 'INSIDE VALUE' | 'AT VALUE HIGH' | 'AT VALUE LOW' | 'ABOVE VALUE' | 'BELOW VALUE';
    poiType: 'Order Block' | 'Breaker' | 'Lowest-Volume Node' | 'Value Area Edge' | 'Fair Value Gap';
    poiPrice: number;
    isDiscount: boolean; // discount for long, premium for short
    isDefended: boolean;
  };

  // Level 3: Value Structure
  valueStructure: {
    vah: number; // Value Area High
    val: number; // Value Area Low
    poc: number; // Point of Control (Fair Value Center)
    hvn: number[]; // High Volume Nodes
    lvn: number[]; // Low Volume Nodes
    priorVah: number;
    priorVal: number;
    dayProfileShape: 'Normal / Bell' | 'Trend (P-Shape)' | 'Trend (b-Shape)' | 'Compressed';
    valueMigration: 'Higher' | 'Lower' | 'Flat';
  };

  // Level 4: Liquidity
  liquidity: {
    plr: 'UP' | 'DOWN'; // Path of Least Resistance
    plrReason: string;
    restingWallBelow: { price: number; volume: number; label: string };
    restingWallAbove: { price: number; volume: number; label: string };
    sweepDetected: boolean;
    sweepLevel?: number;
    liquidityConfirmation: boolean;
    reloadPresent: boolean;
    bookFlipConfirmed: boolean;
  };

  // Level 5: Order Flow & Effort vs Result
  orderFlow: {
    delta: number;
    deltaTrend: 'POSITIVE' | 'NEGATIVE' | 'DIVERGENT';
    cvd: number;
    cvdSlope: 'RISING' | 'FALLING' | 'FLAT';
    absorption: boolean;
    absorptionPrice?: number;
    stackedImbalances: boolean;
    imbalanceDirection?: 'BUY' | 'SELL';
    effortScore: number; // 0 to 1 float
    effortVsResult: 'AGGRESSION ABSORBED (FADE)' | 'EFFORT REWARDED (RIDE)' | 'CONFLICT (STAND DOWN)';
    effortMismatchExplanation: string;
  };

  // Level 6: Model Signal / Expectation & Active Play
  signal: {
    activePlay: PlayId;
    playName: string;
    action: 'BUY' | 'SELL' | 'STAND DOWN';
    entryPrice: number;
    stopLoss: number;
    targetTP1: number;
    targetTP2: number;
    targetTP3: number;
    riskRewardRatio: number;
    expectedPath: {
      trajectory: 'EXPANSION_UP' | 'ROTATION_DOWN' | 'RETURN_TO_VALUE' | 'SIDEWAYS_CHOP';
      description: string;
    };
  };

  // Level 7: Invalidation
  invalidation: {
    price: number;
    label: string;
    condition: string;
  };

  // Level 8: Scorecard & Validation
  scorecard: {
    grade: ModelGrade;
    totalScore: number;
    hardGates: {
      id: string;
      title: string;
      passed: boolean;
      detail: string;
    }[];
    confirmations: {
      id: string;
      title: string;
      weight: number;
      passed: boolean;
    }[];
    risk: {
      riskPercent: number;
      riskCash: number;
      positionUnits: number;
      dailyLossRemaining: number;
    };
  };

  // 9 Core Questions Visual Answers (1-3 second visual digest)
  nineQuestions: {
    whereIsMarket: string;
    whatIsDoing: string;
    whereIsValue: string;
    whoIsInControl: string;
    whereIsLiquidity: string;
    whatIsModelSeeing: string;
    whatIsModelExpecting: string;
    whatWouldInvalidate: string;
    tradeOrNoTrade: string;
  };

  // Exhaustion Engine (Buyer vs Seller Fuel & Power Depletion)
  exhaustion: ExhaustionState;

  // Sniper Edge Execution (Precise Limit Entry, Invalidation & Targets at Auction Edges)
  sniperEdge: SniperEdgeEntry;

  // Market Intelligence Layer (Liquidity, Spoofing, Auction, Delta/CVD, Trapped Participants, Squeeze, Shakeout, Regime, Macro News)
  marketIntelligence?: MarketIntelligenceOutput;

  // Dedicated Real-Time Order Flow Scalping Signal (HVN, Aggressive Imbalance, Heavy Absorption, DOM Replenishment & Wick Formation)
  orderFlowScalp?: OrderFlowScalpSignal;

  // Additional Complementary Bidirectional Intelligence Layer: VALUE AREA ABSORPTION & RECLAIM
  valueAreaAbsorptionReclaim?: ValueAreaAbsorptionReclaimStrategy;

  // Real-World Market Schedule & Operating Hours Awareness (Weekend Closures, Daily Roll Breaks)
  marketSchedule?: MarketScheduleStatus;
}
