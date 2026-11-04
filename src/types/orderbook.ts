export type QuadrantType = 
  | 'sell_limit' 
  | 'buy_stop' 
  | 'sell_stop' 
  | 'buy_limit' 
  | 'profit_sellers' 
  | 'loss_buyers' 
  | 'loss_sellers' 
  | 'profit_buyers';

export interface OrderBookLevel {
  price: number;
  formattedPrice: string;
  // Left side: Pending orders
  sellLimit: number;
  buyStop: number;
  sellStop: number;
  buyLimit: number;
  // Right side: Open positions
  profitSellers: number;
  lossBuyers: number;
  lossSellers: number;
  profitBuyers: number;
  // Net metrics
  netOrders: number; // buy pending - sell pending
  netPositions: number; // long open - short open
  isCurrentPrice?: boolean;
  hasAbnormalCluster?: boolean;
  clusterType?: 'sl_hunt' | 'support_wall' | 'resistance_wall' | 'trapped_pool';
}

export interface OrderBookSnapshot {
  id: string;
  timestamp: number;
  formattedTime: string;
  instrument: string;
  currentPrice: number;
  levels: OrderBookLevel[];
  // Aggregated Quadrant Percentages
  leftBook: {
    sellLimitPct: number;
    buyStopPct: number;
    sellStopPct: number;
    buyLimitPct: number;
    totalOrders: number;
  };
  rightBook: {
    profitSellersPct: number;
    lossBuyersPct: number;
    lossSellersPct: number;
    profitBuyersPct: number;
    totalPositions: number;
  };
  sentiment: {
    buyRatio: number;
    sellRatio: number;
    bias: 'Bullish' | 'Bearish' | 'Neutral';
    crowdTrappedState: string;
  };
}

export type OrderBookLayout = 
  | 'classic_two_sided' 
  | 'classic_one_sided' 
  | 'simplified_two_sided' 
  | 'simplified_one_sided';

export type FilterMode = 'ALL' | 'NET';

export type ColorTheme = 'fxssi_classic' | 'cyber_dark' | 'matrix_neon' | 'high_contrast';

export interface OrderBookSettings {
  depth: number; // e.g. 20, 30, 45, 60 levels
  layout: OrderBookLayout;
  filterMode: FilterMode;
  showLeftOrders: boolean;
  showRightPositions: boolean;
  offsetRight: number;
  distanceBetweenBooks: number;
  historyNavigationEnabled: boolean;
  fastRewindSpeed: number; // snapshots step
  showScaleOnChart: boolean;
  valueWidth: number;
  colorScheme: ColorTheme;
  showCandleCrossMark: boolean;
  showFootprintBubbles: boolean;
}

export type FootprintPatternType =
  | 'ABSORPTION_CONTINUATION'
  | 'ACCEPTANCE'
  | 'ABSORPTION_CONTRARIAN'
  | 'REJECTION';

export interface FootprintBubble {
  id: string;
  candleIndex: number;
  timestamp: number;
  price: number;
  volume: number; // lots/contracts
  side: 'buy' | 'sell';
  delta: number;
  isAbsorption: boolean;
  isStacked: boolean;
  tradeImpactScore?: number;
  impactClassification?: 'SMALL' | 'MEDIUM' | 'LARGE' | 'MARKET_MOVING';
  priceImpactPips?: number;
  relativeSizePercentile?: number;
  patternType?: FootprintPatternType;
  patternLabel?: string;
  patternPlacement?: 'UPPER_WICK' | 'LOWER_WICK' | 'BODY';
  patternExplanation?: string;
}

export interface Candle {
  timestamp: number;
  timeStr: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  delta: number;
  vwap: number;
}

export type HeatmapPalette = 'bookmap_classic';

export interface HeatmapCell {
  price: number;
  volume: number;
  intensity: number; // 0.0 to 1.0 normalized
  side: 'ask' | 'bid';
  isWall?: boolean;
  isSwept?: boolean;
}

export interface HeatmapTimeColumn {
  candleIndex: number;
  timestamp: number;
  timeStr: string;
  candle: Candle;
  levels: HeatmapCell[];
}

export interface LiquidityPoolNode {
  price: number;
  volume: number;
  side: 'ask' | 'bid';
  intensity: number;
  distancePips: number;
  label: string;
  isSwept?: boolean;
}

export interface LiquiditySweepZone {
  startCandleIndex: number;
  endCandleIndex: number;
  lowPrice: number;
  highPrice: number;
  volumeSwept: number;
  label: string;
  type: 'support_consolidation_sweep' | 'resistance_liquidity_grab';
}

export interface HeatmapSettings {
  palette: HeatmapPalette;
  intensityMultiplier: number;
  showCandles: boolean;
  showSweptZones: boolean;
  showPoolBadges: boolean;
  filterHighDensity: boolean;
  resolution: 'detailed' | 'balanced' | 'coarse';
}

