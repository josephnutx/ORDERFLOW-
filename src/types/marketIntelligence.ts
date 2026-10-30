import { Candle, FootprintBubble, OrderBookSnapshot } from './orderbook';

export type DataQualityTier = 'REAL' | 'ESTIMATED' | 'PROXY';

// -------------------------------------------------------------
// 1. Liquidity & Spoofing Intelligence
// -------------------------------------------------------------
export interface LiquidityIntelligence {
  bidLiquidityScore: number; // 0 - 100
  askLiquidityScore: number; // 0 - 100
  liquidityImbalance: number; // -100 (ask heavy) to +100 (bid heavy)
  largeRestingOrders: Array<{
    price: number;
    volume: number;
    side: 'bid' | 'ask';
    distancePips: number;
    persistenceScore: number; // 0 - 100
    stability: 'GENUINE_WALL' | 'SUSPICIOUS_UNSTABLE' | 'DYNAMIC_RELOAD';
  }>;
  orderPersistence: number; // 0 - 100
  cancellationRate: number; // 0 - 100%
  replenishmentBehavior: 'ACTIVE_ICEBERG_REFILL' | 'PASSIVE_THINNING' | 'NORMAL';
  liquidityConsumptionRate: number; // lots/second or per candle
  liquidityAbsorptionScore: number; // 0 - 100
  liquidityDisappearanceRisk: number; // 0 - 100
  priceImpactPerLotPips: number;
  distanceToMajorLiquidity: {
    abovePips: number;
    abovePrice: number;
    belowPips: number;
    belowPrice: number;
  };
  // Probabilistic Spoofing Detection (§3)
  spoofDetector: {
    spoofProbability: number; // 0.00 - 1.00
    classification: 'STABLE_DEPTH' | 'LOW_INSTABILITY' | 'POSSIBLE_SPOOF_UNSTABLE' | 'HIGH_SPOOF_HAZARD';
    headline: string;
    orderLifetimeMs: number;
    pullOnApproachRate: number; // % of orders pulled as price approaches within 3 ticks
    evidence: string[];
    isUnstableLiquidity: boolean;
  };
  dataQuality: {
    tier: DataQualityTier;
    notice: string;
  };
}

// -------------------------------------------------------------
// 2. Absorption Intelligence
// -------------------------------------------------------------
export interface AbsorptionIntelligence {
  absorptionScore: number; // 0 - 100
  absorptionDirection: 'SELL_SIDE_ABSORPTION' | 'BUY_SIDE_ABSORPTION' | 'BALANCED_NONE';
  absorptionConfidence: number; // 0 - 100
  absorptionPriceLevel: number;
  aggressiveDeltaVsPriceProgress: {
    deltaZScore: number;
    priceProgressionPips: number;
    isEffortWithoutResult: boolean;
    description: string;
  };
  absorbedVolume: number;
  icebergReloadDetected?: boolean;
  summary: string;
}

// -------------------------------------------------------------
// 3. Volume Profile & LVN/HVN Intelligence
// -------------------------------------------------------------
export interface VolumeProfileIntelligence {
  poc: number;
  vah: number;
  val: number;
  valueAreaWidthPips: number;
  hvnNodes: Array<{ price: number; volume: number; label: string; acceptanceScore: number }>;
  lvnNodes: Array<{ 
    price: number; 
    volume: number; 
    lowBound: number; 
    highBound: number; 
    transitStatus: 'CLEAR_FAST_TRANSIT' | 'CONGESTION_ABSORPTION' | 'UNTEMPERED';
    fastTransitProbability: number; // 0 - 100
  }>;
  distanceFromPocPips: number;
  distanceFromFairValuePips: number;
  lvnState: {
    isInsideLvn: boolean;
    currentLvnPrice?: number;
    transitProbability: number; // 0 - 100
    behaviorInterpretation: string;
  };
  hvnAcceptance: {
    currentStatus: 'ACCEPTING_HVN' | 'ROTATING_BETWEEN_NODES' | 'REJECTING_EXTREME';
    dominantNodePrice: number;
  };
}

// -------------------------------------------------------------
// 4. Auction State & Failed Auction Intelligence
// -------------------------------------------------------------
export interface AuctionIntelligence {
  auctionState: 
    | 'ACCEPTING_LEVEL' 
    | 'REJECTING_LEVEL' 
    | 'TESTING_LIQUIDITY' 
    | 'BREAKOUT_EXPLORATION' 
    | 'FAILED_BREAKOUT' 
    | 'RETURNING_INTO_VALUE' 
    | 'LVN_TRANSIT' 
    | 'FAILED_AUCTION';
  auctionStateDescription: string;
  failedAuction: {
    failedAuctionScore: number; // 0 - 100
    failedAuctionDirection: 'FAILED_AUCTION_HIGH' | 'FAILED_AUCTION_LOW' | 'NONE';
    failedAuctionConfidence: number; // 0 - 100
    failedLevel: number;
    rejectionSpeedMs: number;
    supportingEvidence: string[];
    isConfirmedFailedAuction: boolean;
  };
}

// -------------------------------------------------------------
// 5. Delta & Cumulative Volume Delta (CVD) Intelligence
// -------------------------------------------------------------
export interface OrderFlowIntelligence {
  delta: number;
  deltaRate: number; // delta / second
  deltaAcceleration: 'ACCELERATING_BUY' | 'ACCELERATING_SELL' | 'STEADY' | 'EXHAUSTING';
  deltaImbalanceRatio: number; // aggressive buy / aggressive sell
  cvd: number;
  cvdSlope: 'RISING' | 'FALLING' | 'FLAT';
  cvdTrend: 'STRONG_BULLISH' | 'WEAK_BULLISH' | 'NEUTRAL' | 'WEAK_BEARISH' | 'STRONG_BEARISH';
  cvdDivergence: {
    type: 'BULLISH_DIVERGENCE' | 'BEARISH_DIVERGENCE' | 'CONFIRMING' | 'NONE';
    strengthScore: number; // 0 - 100
    detail: string;
  };
  cvdPriceDisagreement: {
    hasDisagreement: boolean;
    interpretation: string;
  };
}

// -------------------------------------------------------------
// 6. Participant & Trapped Position Intelligence
// -------------------------------------------------------------
export interface ParticipantIntelligence {
  trappedBuyersPct: number;
  trappedSellersPct: number;
  longTrapProbability: number; // 0.00 - 1.00
  shortTrapProbability: number; // 0.00 - 1.00
  forcedBuyingProbability: number; // 0.00 - 1.00 (short covering risk)
  forcedSellingProbability: number; // 0.00 - 1.00 (long liquidation risk)
  potentialStopDrivenFlow: 'HIGH_BUY_STOPS' | 'HIGH_SELL_STOPS' | 'BALANCED_STOPS';
  stopClusters: Array<{
    price: number;
    side: 'buy_stops' | 'sell_stops';
    estimatedVolumeLots: number;
    distancePips: number;
  }>;
  crowdPsychologyStatus: string;
}

// -------------------------------------------------------------
// 7. Squeeze Engine
// -------------------------------------------------------------
export interface SqueezeIntelligence {
  shortSqueezeScore: number; // 0 - 100
  longSqueezeScore: number; // 0 - 100
  activeSqueeze: 'SHORT_SQUEEZE_DEVELOPING' | 'LONG_SQUEEZE_DEVELOPING' | 'NONE';
  squeezeReadiness: number; // 0 - 100%
  catalysts: string[];
  warningAdvice: string;
}

// -------------------------------------------------------------
// 8. Shakeout Engine
// -------------------------------------------------------------
export interface ShakeoutIntelligence {
  shakeoutScore: number; // 0 - 100
  shakeoutDirection: 'BULLISH_SHAKEOUT' | 'BEARISH_SHAKEOUT' | 'NONE';
  shakeoutConfidence: number; // 0 - 100
  violatedLevel: number;
  reclaimPrice: number;
  isConfirmedShakeout: boolean;
  explanation: string;
}

// -------------------------------------------------------------
// 9. Mean-Reversion Engine
// -------------------------------------------------------------
export interface MeanReversionIntelligence {
  vwap: number;
  rollingMean: number;
  standardDeviationPips: number;
  distanceFromFairValuePips: number;
  normalizedDeviationZScore: number; // e.g. +2.4 sigma
  meanReversionProbability: number; // 0 - 100
  marketCondition: 'EXTREME_WEAKENING_REVERT' | 'EXTREME_ACCELERATING_CONTINUATION' | 'FAIR_VALUE_EQUILIBRIUM';
  reversionTargetPrice: number;
  rationale: string;
}

// -------------------------------------------------------------
// 9B. Climactic Buy / Sell Exhaustion Engine
// -------------------------------------------------------------
export interface ClimacticIntelligence {
  isClimactic: boolean;
  climacticDirection: 'CLIMACTIC_BUY_EXHAUSTION' | 'CLIMACTIC_SELL_EXHAUSTION' | 'NONE';
  climaxScore: number; // 0 - 100
  volumeZScore: number; // e.g. 2.8x session average
  deltaZScore: number; // e.g. +3.1 sigma
  wickRejectionRatio: number; // 0.00 - 1.00
  stalledProgressPips: number;
  climaxPriceLevel: number;
  summary: string;
}

// -------------------------------------------------------------
// 9C. Compression & Tape Coiling Engine
// -------------------------------------------------------------
export interface CompressionIntelligence {
  isCompressed: boolean;
  compressionScore: number; // 0 - 100
  compressionState: 'TIGHT_COILING_READY' | 'BUILDING_COMPRESSION' | 'EXPANDING_RELEASE' | 'NORMAL_ROTATION';
  atrContractionRatio: number; // e.g. 0.42 (recent 4-bar range vs 20-bar ATR)
  valueAreaCompressionPct: number; // % contraction
  coiledOrderVolumeLots: number;
  breakoutReadiness: number; // 0 - 100%
  expectedBreakoutBias: 'BULLISH_RELEASE' | 'BEARISH_RELEASE' | 'NEUTRAL_COIL';
  summary: string;
}

// -------------------------------------------------------------
// 10. Dynamic Market Regime Engine
// -------------------------------------------------------------
export type MarketRegimeType = 
  | 'BALANCE'
  | 'TREND'
  | 'TREND_ACCELERATION'
  | 'TREND_EXHAUSTION'
  | 'BREAKOUT'
  | 'FAILED_BREAKOUT'
  | 'REVERSAL'
  | 'MEAN_REVERSION'
  | 'LIQUIDITY_HUNT'
  | 'NEWS_SHOCK'
  | 'POST_NEWS'
  | 'LOW_VOLATILITY'
  | 'HIGH_VOLATILITY';

export interface RegimeIntelligence {
  primaryRegime: MarketRegimeType;
  regimeLabel: string;
  regimeDescription: string;
  probabilities: {
    trendProbability: number; // 0 - 100
    balanceProbability: number; // 0 - 100
    breakoutProbability: number; // 0 - 100
    reversalProbability: number; // 0 - 100
    meanReversionProbability: number; // 0 - 100
    newsShockProbability: number; // 0 - 100
  };
  volatilityState: 'COMPRESSED' | 'NORMAL' | 'EXPANDING' | 'CLIMACTIC';
}

// -------------------------------------------------------------
// 11. Forex Macro / Economic Calendar & News Reaction
// -------------------------------------------------------------
export interface EconomicCalendarEvent {
  id: string;
  source?: string;
  currency: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW' | 'HOLIDAY';
  eventTitle: string;
  actual?: string | number | null;
  forecast?: string | number | null;
  previous?: string | number | null;
  eventTime: number; // timestamp
  dateFormatted?: string;
  timeFormatted: string;
  dateTimeFormatted?: string;
  timeUntilMinutes: number; // negative if past
  isHighImpact: boolean;
  surpriseValue?: number | null;
}

export interface MacroNewsIntelligence {
  upcomingEvents: EconomicCalendarEvent[];
  recentEvents: EconomicCalendarEvent[];
  eventRisk: 'EXTREME_RISK_STAND_DOWN' | 'HIGH_RISK_APPROACHING' | 'MODERATE' | 'LOW_CLEAR';
  economicSurprise: number; // actual - forecast normalized
  currencyRelevance: string; // e.g. "USD / EUR Relevant"
  preNewsRisk: boolean;
  postNewsReaction: {
    reactionStrength: 'VIOLENT_EXPLOSION' | 'MODERATE_ACCEPTANCE' | 'MUTED_NO_REACTION' | 'IMMEDIATE_FADE';
    reactionDirection: 'DOLLAR_STRENGTH' | 'DOLLAR_WEAKNESS' | 'CHOP';
    expectationAlignment: 'ALIGNED_WITH_SURPRISE' | 'DIVERGENT_SURPRISE_REJECTED' | 'NEUTRAL';
    newsFailureScore: number; // 0 - 100 (e.g. bullish USD news but pair rallies)
    explanation: string;
  };
}

// -------------------------------------------------------------
// 12. Trade Impact Bubbles (§16)
// -------------------------------------------------------------
export type TradeImpactClass = 'SMALL' | 'MEDIUM' | 'LARGE' | 'MARKET_MOVING';

export interface IntelligentFootprintBubble extends FootprintBubble {
  tradeImpactScore: number; // 0 - 100
  impactClassification: TradeImpactClass;
  relativeSizePercentile: number; // 0 - 100
  priceImpactPips: number;
  liquidityConsumedRatio: number;
  isMarketMoving: boolean;
}

// -------------------------------------------------------------
// 13. High-Precision Entry & No-Trade Intelligence (§17 & §18)
// -------------------------------------------------------------
export interface HighPrecisionEntry {
  direction: 'LONG' | 'SHORT' | 'NO_TRADE';
  entryZone: {
    low: number;
    high: number;
  };
  invalidationLevel: number;
  targetZones: Array<{
    id: string;
    label: string;
    price: number;
    potentialPips: number;
    rrRatio: number;
    type: 'POC_FAIR_VALUE' | 'OPPOSITE_EDGE' | 'MACRO_LIQUIDITY_RUN';
  }>;
  confidence: number; // 0 - 100
  setupType: 
    | 'LVN_CONTINUATION'
    | 'ABSORPTION_REVERSAL'
    | 'SQUEEZE_EXPANSION'
    | 'SHAKEOUT_RECLAIM'
    | 'VALUE_ROTATION'
    | 'MEAN_REVERSION_FADE'
    | 'CLIMACTIC_EXHAUSTION_REVERSAL'
    | 'COMPRESSION_COIL_BREAKOUT'
    | 'NO_EDGE_STAND_DOWN';
  marketState: string;
  reasons: string[];
  riskConditions: string[];
  warnings: string[];
}

// -------------------------------------------------------------
// 14. "Why is Price Moving?" Explanation Engine (§19 & §24)
// -------------------------------------------------------------
export interface WhyPriceIsMovingExplanation {
  movementStatus: 'MOVING_FAST' | 'MOVING_SLOW' | 'STALLED_ABSORPTION' | 'PRICE_REVERSED' | 'EQUILIBRIUM_CHOP';
  headline: string;
  primaryReason: string;
  secondaryReason: string;
  actionGuidance: string;
  marketControl: {
    buyersPct: number;
    sellersPct: number;
    uncertainPct: number;
    dominantController: 'BUYERS' | 'SELLERS' | 'UNCERTAIN';
    confidence: number;
  };
  whyBullets: string[];
  whyLevelRevisited?: string;
  expectedInitialSweep?: string;
  invalidationConditions?: string;
  whatStopsTheMove?: string;
  noTradeAdvisory?: {
    isNoTrade: boolean;
    reasons: string[];
  };
}

// -------------------------------------------------------------
// 15. Dynamic Contribution Weights Model (§21)
// -------------------------------------------------------------
export interface DynamicContributionWeights {
  contextWeight: number; // %
  liquidityWeight: number; // %
  auctionWeight: number; // %
  orderFlowWeight: number; // %
  participantWeight: number; // %
  volumeProfileWeight: number; // %
  macroNewsWeight: number; // %
  activeRegimeReason: string;
}

// -------------------------------------------------------------
// Master Market Intelligence Bundle
// -------------------------------------------------------------
export interface MarketIntelligenceOutput {
  symbol: string;
  timestamp: number;
  liquidity: LiquidityIntelligence;
  absorption: AbsorptionIntelligence;
  volumeProfile: VolumeProfileIntelligence;
  auction: AuctionIntelligence;
  orderFlow: OrderFlowIntelligence;
  participant: ParticipantIntelligence;
  squeeze: SqueezeIntelligence;
  shakeout: ShakeoutIntelligence;
  meanReversion: MeanReversionIntelligence;
  climactic: ClimacticIntelligence;
  compression: CompressionIntelligence;
  regime: RegimeIntelligence;
  macroNews: MacroNewsIntelligence;
  intelligentBubbles: IntelligentFootprintBubble[];
  entryEngine: HighPrecisionEntry;
  whyPriceIsMoving: WhyPriceIsMovingExplanation;
  weights: DynamicContributionWeights;
  dataQualityDisclosures: {
    overallTier: DataQualityTier;
    spotFxNotice: string;
    featuresQuality: Record<string, DataQualityTier>;
  };
}
