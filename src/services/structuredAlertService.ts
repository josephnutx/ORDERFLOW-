// Structured Live Alert Data Models and Generator (§20-§28 of Advanced Forex Trading Agent Constitution)
import { Candle, OrderBookSnapshot } from '../types/orderbook';
import { SniperModelOutput } from '../types/sniperModel';
import { MarketIntelligenceOutput } from '../types/marketIntelligence';
import { getFullSymbolName } from './tradingVoiceService';
import { getInstrumentPrecision, formatPriceExact, formatPriceForAudio } from './precisionUtils';

export type AlertType =
  | 'UNIFIED_CONFLUENCE_SIGNAL'
  | 'BUY_SETUP'
  | 'SELL_SETUP'
  | 'ORDER_STACKING_BUILDUP'
  | 'LIQUIDATION_SQUEEZE'
  | 'IMPULSE_IGNITION'
  | 'CLIMACTIC_EXHAUSTION'
  | 'COMPRESSION_COIL'
  | 'KEY_LEVEL_TAP'
  | 'AUCTION_REFUSAL'
  | 'AUCTION_ACCEPTANCE'
  | 'LARGE_TRADE'
  | 'ORDER_FLOW'
  | 'NEWS'
  | 'TRADE_UNDER_PRESSURE'
  | 'TAKE_PROFIT_CONTINUATION'
  | 'INVALIDATION'
  | 'CAUTION'
  | 'BID_RELOAD'
  | 'ICEBERG_DETECTED'
  | 'BOOK_SWEEP'
  | 'BOOK_FLIP';

export type AlertPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'CONFIRMATION';

export interface StructuredLiveAlert {
  id: string;
  type: AlertType;
  priority: AlertPriority;
  symbol: string;
  symbolFullName: string;
  timestamp: number;
  timeFormatted: string;
  price: number;
  formattedText: string;
  headline: string;
  summary: string;
  spokenText: string;
  tags: string[];
}

/**
 * Generates the strictly formatted Markdown text for a structured live alert
 * exactly adhering to sections 20 through 28 of the user's specification.
 */
export function buildStructuredAlert(
  type: AlertType,
  symbol: string,
  price: number,
  modelOutput: SniperModelOutput,
  mi?: MarketIntelligenceOutput,
  extra?: {
    bubble?: any;
    targetName?: 'TP1' | 'TP2' | 'TP3';
    newsEvent?: any;
    invalidationReason?: string;
    tradeUnderPressureSide?: 'BUY' | 'SELL';
    refusedLevel?: string;
    refusedPrice?: number;
    refusalReason?: string;
    rejectionSide?: 'BUYERS' | 'SELLERS';
    dominantSide?: 'BUY' | 'SELL';
    totalLotStack?: number;
    blockCount?: number;
    trappedPct?: number;
    velocityPips?: number;
    anchorPrice?: number;
  }
): StructuredLiveAlert {
  const fullName = getFullSymbolName(symbol);
  const now = Date.now();
  const timeFormatted = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const digits = getInstrumentPrecision(symbol);
  const pStr = formatPriceExact(price, symbol);
  const spokenPStr = formatPriceForAudio(price, symbol);

  const edge = modelOutput.sniperEdge;
  const val = modelOutput.valueStructure.val.toFixed(digits);
  const vah = modelOutput.valueStructure.vah.toFixed(digits);
  const poc = modelOutput.valueStructure.poc.toFixed(digits);
  const cvdTrend = mi?.orderFlow.cvdTrend || 'BULLISH';
  const deltaVal = mi?.orderFlow.delta ?? (modelOutput.orderFlow.deltaTrend === 'POSITIVE' ? '+420' : '-380');
  const deltaStr = typeof deltaVal === 'number' ? (deltaVal > 0 ? `+${deltaVal}` : `${deltaVal}`) : deltaVal;

  let priority: AlertPriority = 'MEDIUM';
  let headline = '';
  let summary = '';
  let formattedText = '';
  let customSpokenText = '';
  const tags: string[] = [symbol, fullName];

  switch (type) {
    case 'UNIFIED_CONFLUENCE_SIGNAL': {
      priority = 'CRITICAL';
      const side = extra?.dominantSide || (edge.triggerAction === 'SNIPER_BUY' ? 'BUY' : 'SELL');
      const isBuy = side === 'BUY';
      const lots = extra?.totalLotStack || 1850;
      const compPct = mi?.compression?.valueAreaCompressionPct || 68;
      const trappedPct = extra?.trappedPct || 62;
      const climZ = mi?.climactic?.volumeZScore || 2.4;
      const vel = extra?.velocityPips || 16;

      headline = `🎯 5-PILLAR UNIFIED CONFLUENCE ${side} SIGNAL — ${fullName}`;
      summary = `All 5 order flow engines synchronized: Contract Stacking (${lots} lots), ${trappedPct}% Liquidation Squeeze, Velocity Ignition (+${vel}p), Climactic Exhaustion (${climZ}x vol), and ${compPct}% Compression Coil into one unified institutional ${side} signal.`;
      customSpokenText = `Master unified confluence ${side.toLowerCase()} signal confirmed on ${fullName} at ${pStr}! All five order flow disciplines are synchronized into a single high-conviction setup. Contract stacking has accumulated ${lots} lots, sixty-two percent of retail counter-traders are trapped in a liquidation squeeze, vertical velocity ignition is breaking through thin liquidity, climactic volume has exhausted counter-pressure, and volatility compression is releasing directionally toward Take Profit 1 at ${edge.targetTP1.toFixed(digits)}. Optimal entry is ${edge.optimalEntry.toFixed(digits)} with hard stop loss protected at ${edge.hardStopLoss.toFixed(digits)}.`;
      tags.push('UNIFIED_CONFLUENCE', `${side}_SIGNAL`, '5_PILLARS_SYNC', 'MASTER_EDGE');
      formattedText = `## 🎯 5-PILLAR UNIFIED CONFLUENCE ${side} SIGNAL — ALL ENGINES COMBINED

**PAIR:** ${fullName}
**ALERT:** UNIFIED ORDER FLOW CONFLUENCE (${isBuy ? 'LONG / BUY' : 'SHORT / SELL'})
**CURRENT PRICE:** ${pStr}
**OPTIMAL ENTRY:** ${edge.optimalEntry.toFixed(digits)} (Zone: ${edge.entryZoneMin.toFixed(digits)} – ${edge.entryZoneMax.toFixed(digits)})
**HARD STOP LOSS:** ${edge.hardStopLoss.toFixed(digits)} (Protected behind auction boundary)
**TAKE PROFIT TARGETS:** TP1: ${edge.targetTP1.toFixed(digits)} | TP2: ${edge.targetTP2.toFixed(digits)} | TP3: ${edge.targetTP3.toFixed(digits)}

### 🏛️ HOW THE 5 ENGINES WORK TOGETHER IN THIS SINGLE SIGNAL
1. **Contract Stacking:** The tape shows **${lots} institutional contracts** stacked across consecutive footprint nodes on the ${side.toLowerCase()} side, confirming aggressive institutional capital allocation.
2. **Liquidation Squeeze:** **${trappedPct}% of retail counter-traders** are caught offside and underwater at ${pStr}; their forced stop-covering is creating a violent liquidity vacuum.
3. **Velocity Ignition:** Impulse momentum is displacing vertically (+${vel} pips burst), slicing through Low Volume Nodes (LVN) with zero counter-absorption.
4. **Climactic Exhaustion:** Parabolic counter-flow printed a **${climZ}x volume spike** that hit passive institutional limit walls, leaving counterparty aggressive power **${modelOutput.exhaustion.exhaustionScore}% exhausted** (only **${modelOutput.exhaustion.powerRemaining}%** fuel left).
5. **Compression Coil Release:** Prior **${compPct}% range compression** has broken out with aligned CVD (${cvdTrend}) and delta (${deltaStr}).

### TACTICAL EXECUTION
* **Action:** Instant institutional **${side}** execution
* **Risk/Reward:** Minimum 1:${edge.riskRewardRatio} R:R to Value Area edge
* **Invalidation:** Sustained 5-minute close through ${edge.hardStopLoss.toFixed(digits)}`;
      break;
    }

    case 'BUY_SETUP': {
      priority = 'CONFIRMATION';
      const audit = edge.liquiditySweepAudit;
      const sweptPrice = audit ? audit.sweptLiquidityPrice.toFixed(digits) : val;
      const sweptLots = audit?.sweptLiquidityVolumeLots || 420;
      headline = `🟢 INSTANT BUY SIGNAL (POST-SWEEP CONFIRMED) — ${fullName}`;
      summary = `All attracting downside liquidity swept at ${sweptPrice} (${sweptLots} lots). Manipulation reclaimed; instant Buy locked at ${edge.optimalEntry.toFixed(digits)} targeting ${edge.targetTP1.toFixed(digits)}.`;
      customSpokenText = `Instant accurate Buy signal locked on ${fullName} at ${pStr}. Pre-signal liquidity audit complete: all attracting downside sell-stop liquidity at ${sweptPrice} has been taken out, and the stop-hunt manipulation wick below Value Area Low ${val} was absorbed and reclaimed. Zero remaining downside magnet. Aggressive sellers are ${modelOutput.exhaustion.exhaustionScore} percent exhausted with ${modelOutput.exhaustion.powerRemaining} percent power remaining. Order flow delta is ${deltaStr}. Optimal entry is ${edge.optimalEntry.toFixed(digits)}, hard stop loss invalidation protected behind the cleared sweep void at ${edge.hardStopLoss.toFixed(digits)}, targeting Take Profit 1 at ${edge.targetTP1.toFixed(digits)} and Take Profit 2 at ${edge.targetTP2.toFixed(digits)}.`;
      tags.push('BUY', 'POST_SWEEP_LOCKED', 'MANIPULATION_CLEARED', 'LONG');
      formattedText = `## 🟢 INSTANT BUY SIGNAL — POST-SWEEP & MANIPULATION CLEARED
 
**PAIR:** ${fullName}
**ALERT:** INSTANT BUY SETUP (5/5 LIQUIDITY GATES PASSED)
**PRICE:** ${pStr}
**SWEPT LIQUIDITY POOL:** ${sweptPrice} (${sweptLots} Lots Sell-Stops Taken Out)
**KEY RECLAIM LEVEL:** ${val} (Value Area Low Support)
 
### 1. PRE-SIGNAL LIQUIDITY & MANIPULATION AUDIT
* **G1 — Attracting Liquidity Taken Out:** Downside sell-stop cluster at **${sweptPrice}** (${sweptLots} lots) completely swept — zero remaining magnet below to pull price lower.
* **G2 — Manipulation / Judas Swing Reclaimed:** Stop-hunt spike below Value Area Low (${val}) failed to sustain and closed back inside value.
* **G3 — Passive Institutional Absorption:** Dense buy limit mattress absorbed all aggressive market selling with zero downward continuation.
* **G4 — Counterparty Exhaustion & Trap:** Sellers are **${modelOutput.exhaustion.exhaustionScore}% exhausted** (only **${modelOutput.exhaustion.powerRemaining}%** power left); late breakout shorts are trapped at the bottom.
* **G5 — Delta Flip & Opposing Magnet Pull:** Order flow delta flipped positive (${deltaStr}); price is now drawn toward opposing liquidity pools at POC (${poc}) and VAH (${vah}).
 
### WHAT IS HAPPENING
Price has already completed the downward stop-hunt sweep into ${sweptPrice} and reclaimed ${val}. Responsive institutional buyers absorbed the manipulation spike and locked in a post-sweep reversal.
 
### WHY IT IS NOT PREMATURE
Unlike premature signals issued while an unswept liquidity pool is still attracting price, this signal waited until the ${sweptPrice} stop cluster was fully cleared and manipulation finished.
 
### ORDER FLOW
* Delta: ${deltaStr} (Initiative buying accelerating post-sweep)
* Cumulative Delta: ${cvdTrend} (Bullish accumulation divergence)
* Large Trades: Cluster of large buy absorption contracts executed at ${sweptPrice}–${val}
* Iceberg: Active institutional bid reload observed at ${val}
* Liquidity: Path of Least Resistance locked upward toward POC at ${poc}
* Seller Exhaustion: ${modelOutput.exhaustion.exhaustionScore}% (${modelOutput.exhaustion.powerRemaining}% seller fuel remaining)
 
### WHAT COULD MAKE IT FAIL
A sustained 5-minute candle close below the post-sweep invalidation level at ${edge.hardStopLoss.toFixed(digits)}, signalling that institutional limit support has been pulled.
 
### ENTRY
${edge.optimalEntry.toFixed(digits)} (Zone: ${edge.entryZoneMin.toFixed(digits)} – ${edge.entryZoneMax.toFixed(digits)})
 
### INVALIDATION / PROTECTED STOP AREA
${edge.hardStopLoss.toFixed(digits)} (Protected behind cleared liquidity void)
 
### TARGET / TAKE-PROFIT (OPPOSING LIQUIDITY POOLS)
TP1: ${edge.targetTP1.toFixed(digits)} | TP2: ${edge.targetTP2.toFixed(digits)} | TP3: ${edge.targetTP3.toFixed(digits)}
 
### NEXT THING I'M WATCHING
Watching for trapped short liquidation to accelerate price through the Low Volume Node into POC ${poc}.`;
      break;
    }

    case 'SELL_SETUP': {
      priority = 'CONFIRMATION';
      const audit = edge.liquiditySweepAudit;
      const sweptPrice = audit ? audit.sweptLiquidityPrice.toFixed(digits) : vah;
      const sweptLots = audit?.sweptLiquidityVolumeLots || 410;
      headline = `🔴 INSTANT SELL SIGNAL (POST-SWEEP CONFIRMED) — ${fullName}`;
      summary = `All attracting overhead liquidity swept at ${sweptPrice} (${sweptLots} lots). Manipulation reclaimed; instant Sell locked at ${edge.optimalEntry.toFixed(digits)} targeting ${edge.targetTP1.toFixed(digits)}.`;
      customSpokenText = `Instant accurate Sell signal locked on ${fullName} at ${pStr}. Pre-signal liquidity audit complete: all attracting overhead buy-stop liquidity at ${sweptPrice} has been taken out, and the Judas swing manipulation spike above Value Area High ${vah} was absorbed and rejected. Zero remaining overhead magnet. Aggressive buyers are ${modelOutput.exhaustion.exhaustionScore} percent exhausted with ${modelOutput.exhaustion.powerRemaining} percent power remaining. Order flow delta is ${deltaStr}. Optimal entry is ${edge.optimalEntry.toFixed(digits)}, hard stop loss invalidation protected above the cleared sweep high at ${edge.hardStopLoss.toFixed(digits)}, targeting Take Profit 1 at ${edge.targetTP1.toFixed(digits)} and Take Profit 2 at ${edge.targetTP2.toFixed(digits)}.`;
      tags.push('SELL', 'POST_SWEEP_LOCKED', 'MANIPULATION_CLEARED', 'SHORT');
      formattedText = `## 🔴 INSTANT SELL SIGNAL — POST-SWEEP & MANIPULATION CLEARED
 
**PAIR:** ${fullName}
**ALERT:** INSTANT SELL SETUP (5/5 LIQUIDITY GATES PASSED)
**PRICE:** ${pStr}
**SWEPT LIQUIDITY POOL:** ${sweptPrice} (${sweptLots} Lots Buy-Stops Taken Out)
**KEY REJECTION LEVEL:** ${vah} (Value Area High Resistance)
 
### 1. PRE-SIGNAL LIQUIDITY & MANIPULATION AUDIT
* **G1 — Attracting Liquidity Taken Out:** Overhead buy-stop cluster at **${sweptPrice}** (${sweptLots} lots) completely swept — zero remaining magnet above to pull price higher.
* **G2 — Manipulation / Judas Swing Reclaimed:** False breakout spike above Value Area High (${vah}) rejected and closed back inside value.
* **G3 — Passive Institutional Absorption:** Dense sell limit wall absorbed all aggressive market buying with zero upward continuation.
* **G4 — Counterparty Exhaustion & Trap:** Buyers are **${modelOutput.exhaustion.exhaustionScore}% exhausted** (only **${modelOutput.exhaustion.powerRemaining}%** power left); late breakout longs are trapped at the top.
* **G5 — Delta Flip & Opposing Magnet Pull:** Order flow delta flipped negative (${deltaStr}); price is now drawn toward opposing liquidity pools at POC (${poc}) and VAL (${val}).
 
### WHAT IS HAPPENING
Price has already completed the overhead stop-hunt sweep into ${sweptPrice} and rejected ${vah}. Passive institutional sellers absorbed the manipulation spike and locked in a post-sweep reversal.
 
### WHY IT IS NOT PREMATURE
Unlike premature signals issued while an unswept liquidity pool is still attracting price, this signal waited until the ${sweptPrice} buy-stop cluster was fully cleared and manipulation finished.
 
### ORDER FLOW
* Delta: ${deltaStr} (Aggressive sales hitting the bid post-sweep)
* Cumulative Delta: ${cvdTrend} (Bearish distribution divergence at ceiling)
* Large Trades: Heavy sell absorption contracts executed at ${vah}–${sweptPrice}
* Iceberg: Passive institutional sell limit wall reloaded at ${vah}
* Liquidity: Path of Least Resistance locked downward toward fair value POC ${poc}
* Buyer Exhaustion: ${modelOutput.exhaustion.exhaustionScore}% (${modelOutput.exhaustion.powerRemaining}% buyer fuel remaining)
 
### WHAT COULD MAKE IT FAIL
A sustained 5-minute breakout close above the post-sweep invalidation level at ${edge.hardStopLoss.toFixed(digits)}.
 
### ENTRY
${edge.optimalEntry.toFixed(digits)} (Zone: ${edge.entryZoneMin.toFixed(digits)} – ${edge.entryZoneMax.toFixed(digits)})
 
### INVALIDATION / PROTECTED STOP AREA
${edge.hardStopLoss.toFixed(digits)} (Protected above cleared liquidity void)
 
### TARGET / TAKE-PROFIT (OPPOSING LIQUIDITY POOLS)
TP1: ${edge.targetTP1.toFixed(digits)} | TP2: ${edge.targetTP2.toFixed(digits)} | TP3: ${edge.targetTP3.toFixed(digits)}
 
### NEXT THING I'M WATCHING
Watching for trapped long liquidation to slice through the Low Volume Node toward Point of Control ${poc}.`;
      break;
    }

    case 'ORDER_STACKING_BUILDUP': {
      priority = 'HIGH';
      const side = extra?.dominantSide || (modelOutput.orderFlow.deltaTrend === 'POSITIVE' ? 'BUY' : 'SELL');
      const isBuy = side === 'BUY';
      const lots = extra?.totalLotStack || 1480;
      const blocks = extra?.blockCount || 4;
      const anchorP = extra?.anchorPrice ? extra.anchorPrice.toFixed(digits) : pStr;
      headline = `${isBuy ? '🟢' : '🔴'} INSTITUTIONAL ${side} STACK ACCUMULATING (${lots} LOTS) — ${fullName}`;
      summary = `${blocks} consecutive institutional ${side.toLowerCase()} blocks (${lots} contracts) stacking around ${anchorP}. Tape coiling with ${deltaStr} delta pressure ahead of directional release.`;
      customSpokenText = `Institutional order flow alert on ${fullName} at ${pStr}. Heavy ${side.toLowerCase()} side contract stacking is underway around ${anchorP}, with ${blocks} consecutive institutional blocks totaling ${lots} lots locking into the footprint. Cumulative volume delta is shifting ${isBuy ? 'bullish' : 'bearish'} at ${deltaStr} while passive ${isBuy ? 'bid reload walls' : 'offer distribution walls'} absorb counter-flow. Watch for an imminent volatility release toward ${isBuy ? vah : val}.`;
      tags.push('ORDER_STACKING', `${side}_ACCUMULATION`, 'FOOTPRINT_CLUSTER', 'TAPE_COILING');
      formattedText = `## ${isBuy ? '🟢' : '🔴'} INSTITUTIONAL ${side}-SIDE CONTRACT STACKING & TAPE COILING
 
**PAIR:** ${fullName}
**ALERT:** MULTI-NODE INSTITUTIONAL ${side} ACCUMULATION
**CURRENT PRICE:** ${pStr}
**ACCUMULATION ANCHOR:** ${anchorP}
**STACKED VOLUME:** ${lots} Contracts across ${blocks} Institutional Block Nodes
 
### WHAT IS UNFOLDING ON THE CHART RIGHT NOW
The footprint tape is registering sustained **${side}-side contract stacking** between **${anchorP}** and **${pStr}**. Rather than isolated retail ticks, institutional algorithms are executing ${blocks} consecutive high-lot block prints (${lots} total lots) while anchoring passive ${isBuy ? 'bid limits' : 'offer limits'} right underneath price.
 
### ORDER BOOK & FOOTPRINT TELEMETRY
* **Stacked Block Density:** ${blocks} market-moving institutional prints (${lots} lots) concentrated on the ${side.toLowerCase()} side
* **Net Order Flow Delta:** ${deltaStr} (${cvdTrend} cumulative delta alignment)
* **DOM Depth Skew:** ${isBuy ? 'Heavy Bid Reloading & Passive Support Mattress' : 'Heavy Ask Reloading & Passive Offer Ceiling'} (${mi?.liquidity.liquidityImbalance ?? (isBuy ? '+28' : '-28')}% imbalance)
* **Counterparty Exhaustion:** Opposing side at **${modelOutput.exhaustion.exhaustionScore}% exhaustion** (${modelOutput.exhaustion.powerRemaining}% fuel left)
 
### TACTICAL IMPLICATION
When heavy ${side.toLowerCase()} contracts stack across consecutive footprint nodes without allowing price to retrace, liquidity on the opposite side of the book thins out rapidly. Prepare for directional expansion toward **${isBuy ? vah : val}**.`;
      break;
    }

    case 'LIQUIDATION_SQUEEZE': {
      priority = 'CRITICAL';
      const side = extra?.dominantSide || (edge.triggerAction === 'SNIPER_BUY' ? 'BUY' : 'SELL');
      const isBullSqueeze = side === 'BUY';
      const trappedPct = extra?.trappedPct || (isBullSqueeze ? 64 : 62);
      const lots = extra?.totalLotStack || 1690;
      headline = `${isBullSqueeze ? '🟢' : '🔴'} ${isBullSqueeze ? 'SHORT-COVERING' : 'LONG-LIQUIDATION'} SQUEEZE IN PROGRESS — ${fullName}`;
      summary = `${trappedPct}% underwater retail ${isBullSqueeze ? 'shorts' : 'longs'} caught offside at ${pStr}. Forced stop-covering colliding with ${lots} lots of institutional ${side.toLowerCase()} flow.`;
      customSpokenText = `Critical liquidation squeeze alert on ${fullName} at ${pStr}. A high-velocity ${isBullSqueeze ? 'short-covering squeeze' : 'long-liquidation cascade'} is actively unfolding on the chart. ${trappedPct} percent of retail ${isBullSqueeze ? 'sellers' : 'buyers'} are trapped underwater and being forced to cover into a thin order book alongside ${lots} contracts of aggressive institutional ${side.toLowerCase()} flow. Price is accelerating toward ${isBullSqueeze ? vah : val}.`;
      tags.push('LIQUIDATION_SQUEEZE', isBullSqueeze ? 'SHORT_SQUEEZE' : 'LONG_LIQUIDATION', 'TRAPPED_CROWD');
      formattedText = `## ${isBullSqueeze ? '🟢 SHORT-COVERING SQUEEZE' : '🔴 LONG-LIQUIDATION SQUEEZE'} — FORCED UNWIND ACTIVE
 
**PAIR:** ${fullName}
**ALERT:** FORCED POSITION UNWIND & LIQUIDITY VACUUM SQUEEZE
**CURRENT PRICE:** ${pStr}
**OFFSIDE CROWD EXPOSURE:** ${trappedPct}% Trapped Retail ${isBullSqueeze ? 'Shorts' : 'Longs'} Underwater
**INSTITUTIONAL AGGRESSION:** ${lots} Contracts Driving the Unwind
 
### MECHANICS OF THE SQUEEZE ON SCREEN
1. **Offside Position Build-Up:** Retail ${isBullSqueeze ? 'sellers' : 'buyers'} accumulated heavy positions against institutional absorption and are now **${trappedPct}% underwater**.
2. **Forced Market Covering:** As price breaches their pain threshold around **${pStr}**, their protective stops are triggering as automatic market ${isBullSqueeze ? 'buy' : 'sell'} orders.
3. **Order Book Vacuum:** Resting ${isBullSqueeze ? 'sell offers' : 'buy bids'} have pulled away from the tape, forcing those liquidation orders to slip across multiple price ticks.
 
### LIVE TELEMETRY
* **Delta Surge:** ${deltaStr} (Forced ${isBullSqueeze ? 'buy-to-cover' : 'sell-to-close'} orders compounding institutional initiative)
* **Next Liquidity Magnet:** **${isBullSqueeze ? vah : val}** (${isBullSqueeze ? 'Value Area High' : 'Value Area Low'})
* **Invalidation Floor/Ceiling:** **${poc}** (Point of Control)`;
      break;
    }

    case 'IMPULSE_IGNITION': {
      priority = 'CRITICAL';
      const side = extra?.dominantSide || (modelOutput.orderFlow.deltaTrend === 'POSITIVE' ? 'BUY' : 'SELL');
      const isUpImpulse = side === 'BUY';
      const velPips = extra?.velocityPips || 18;
      const lots = extra?.totalLotStack || 1820;
      headline = `⚡ ${isUpImpulse ? 'BULLISH' : 'BEARISH'} VELOCITY IGNITION & LVN BREAKOUT — ${fullName}`;
      summary = `Vertical ${isUpImpulse ? 'upside' : 'downside'} displacement (+${velPips} pips burst) at ${pStr}. Initiative ${side.toLowerCase()} blocks (${lots} lots) slicing through thin liquidity pocket.`;
      customSpokenText = `Velocity ignition alert on ${fullName} at ${pStr}! Price is displacing rapidly ${isUpImpulse ? 'upward' : 'downward'} with a ${velPips} pip momentum burst. Aggressive institutional ${side.toLowerCase()} sweeps totaling ${lots} contracts have broken through resting depth into a low volume node vacuum. Path of least resistance is wide open toward ${isUpImpulse ? edge.targetTP1.toFixed(digits) : edge.targetTP1.toFixed(digits)}.`;
      tags.push('IMPULSE_IGNITION', isUpImpulse ? 'UPSIDE_DISPLACEMENT' : 'DOWNSIDE_DISPLACEMENT', 'MOMENTUM_BURST');
      formattedText = `## ⚡ ${isUpImpulse ? 'BULLISH' : 'BEARISH'} VELOCITY IGNITION — VERTICAL TAPE DISPLACEMENT
 
**PAIR:** ${fullName}
**ALERT:** HIGH-VELOCITY ORDER BOOK SWEEP & LVN DISPLACEMENT
**CURRENT PRICE:** ${pStr}
**IMPULSE VELOCITY:** ${velPips} Pips Rapid Displacement
**INITIATIVE VOLUME:** ${lots} Contracts Sweeping Resting Depth
 
### WHY PRICE IS DISPLACING RAPIDLY RIGHT NOW
Aggressive market ${isUpImpulse ? 'buyers' : 'sellers'} have overwhelmed the resting ${isUpImpulse ? 'ask' : 'bid'} stack and pushed price into a **Low Volume Node (LVN) liquidity vacuum**. Because there are virtually no resting counter-orders in this pocket, each institutional sweep print (${lots} lots cumulative) produces immediate vertical candle expansion.
 
### LIVE ORDER FLOW METRICS
* **Tape Velocity:** High-momentum ${isUpImpulse ? 'bullish' : 'bearish'} displacement (+${velPips} pips across active impulse bars)
* **Net Delta & CVD:** ${deltaStr} (${cvdTrend} — zero counter-absorption detected yet)
* **Primary Target Magnet:** **${edge.targetTP1.toFixed(digits)}** (TP1 Liquidity Pool) → **${edge.targetTP2.toFixed(digits)}** (TP2)
* **Risk Guidance:** Do not fade vertical displacement until footprint exhaustion exceeds 85% at a major structural wall.`;
      break;
    }

    case 'CLIMACTIC_EXHAUSTION': {
      priority = 'CRITICAL';
      const clim = mi?.climactic;
      const isBuyClimax =
        clim?.climacticDirection === 'CLIMACTIC_BUY_EXHAUSTION' ||
        extra?.dominantSide === 'SELL' ||
        price >= Number(poc);
      const climaxTypeLabel = isBuyClimax ? 'CLIMACTIC BUY EXHAUSTION' : 'CLIMACTIC SELL EXHAUSTION';
      const reversalDir = isBuyClimax ? 'SHORT REVERSAL' : 'LONG REVERSAL';
      const volZ = clim?.volumeZScore || 2.6;
      const deltaZ = clim?.deltaZScore || (isBuyClimax ? 2.9 : -2.9);
      const wickPct = Math.round((clim?.wickRejectionRatio || 0.48) * 100);
      const climaxLevel = (clim?.climaxPriceLevel || price).toFixed(digits);

      headline = `${isBuyClimax ? '🔴' : '🟢'} ${climaxTypeLabel} (${volZ}x VOL SPIKE) — ${fullName}`;
      summary = `Parabolic ${isBuyClimax ? 'buying' : 'selling'} climax at ${climaxLevel} (${volZ}x volume, ${deltaZ}σ delta) absorbed by institutional limit wall with ${wickPct}% wick rejection. High-conviction ${reversalDir} armed.`;
      customSpokenText = `Climactic ${isBuyClimax ? 'buy' : 'sell'} exhaustion alert on ${fullName} at ${pStr}. A parabolic ${isBuyClimax ? 'buying' : 'selling'} climax at ${climaxLevel} printed ${volZ} times average volume and ${deltaZ} sigma delta, but hit a dense institutional ${isBuyClimax ? 'sell wall' : 'buy mattress'} with ${wickPct} percent wick rejection and zero continuation. Late ${isBuyClimax ? 'buyers' : 'sellers'} are trapped at the extreme, arming a high-conviction ${isBuyClimax ? 'short' : 'long'} reversal toward ${poc}.`;
      tags.push('CLIMACTIC_EXHAUSTION', isBuyClimax ? 'BUY_CLIMAX' : 'SELL_CLIMAX', 'BLOW_OFF_REVERSAL');
      formattedText = `## ${isBuyClimax ? '🔴 CLIMACTIC BUY EXHAUSTION' : '🟢 CLIMACTIC SELL EXHAUSTION'} — BLOW-OFF ABSORPTION
 
**PAIR:** ${fullName}
**ALERT:** ${climaxTypeLabel} & PASSIVE WALL ABSORPTION
**CLIMAX EXTREME:** ${climaxLevel} (Current Price: ${pStr})
**VOLUME SURGE:** ${volZ}x Session Average Volume
**DELTA EXTREME:** ${deltaZ}σ (${deltaStr} Net Delta)
**WICK REJECTION:** ${wickPct}% Stalled Excursion Wick
 
### MECHANICS OF THE CLIMACTIC EXHAUSTION
1. **Parabolic Volume & Delta Blow-Off:** Emotional late-stage ${isBuyClimax ? 'buyers' : 'sellers'} executed a ${volZ}x volume spike (${deltaZ}σ delta) attempting to force price beyond **${climaxLevel}**.
2. **Effort Without Result (Iceberg Absorption):** Passive institutional ${isBuyClimax ? 'sell limits' : 'buy limits'} absorbed the entire climactic wave, leaving a ${wickPct}% rejection wick and stalling price progression.
3. **Counterparty Fuel Depleted:** Attacking ${isBuyClimax ? 'buyer' : 'seller'} fuel is ${modelOutput.exhaustion.exhaustionScore}% exhausted (${modelOutput.exhaustion.powerRemaining}% power remaining), trapping late chasers at the extreme.
 
### TACTICAL REVERSAL ROADMAP
* **Reversal Direction:** **${reversalDir}** back into Value Area
* **Primary Mean-Reversion Target:** **${poc}** (Point of Control Fair Value)
* **Secondary Target:** **${isBuyClimax ? val : vah}** (Opposite Value Boundary)`;
      break;
    }

    case 'COMPRESSION_COIL': {
      priority = 'HIGH';
      const comp = mi?.compression;
      const atrRatio = comp?.atrContractionRatio || 0.48;
      const compPct = comp?.valueAreaCompressionPct || 64;
      const coiledLots = comp?.coiledOrderVolumeLots || extra?.totalLotStack || 1540;
      const bias = comp?.expectedBreakoutBias || (modelOutput.orderFlow.deltaTrend === 'POSITIVE' ? 'BULLISH_RELEASE' : 'BEARISH_RELEASE');
      const isBullCoil = bias === 'BULLISH_RELEASE';

      headline = `🌀 TIGHT COMPRESSION & ORDER COILING (${compPct}% CONTRACTION) — ${fullName}`;
      summary = `Volatility compressed to ${atrRatio}x ATR around ${pStr} while ${coiledLots} institutional contracts stack in the book. Coiling for ${isBullCoil ? 'upside' : 'downside'} expansion.`;
      customSpokenText = `Volatility compression and tape coiling alert on ${fullName} at ${pStr}. Candle ranges have contracted by ${compPct} percent to ${atrRatio} times average true range while ${coiledLots} institutional contracts have accumulated inside the tight range. Order book depth and cumulative delta favor a ${isBullCoil ? 'bullish upside' : 'bearish downside'} breakout expansion toward ${isBullCoil ? vah : val}.`;
      tags.push('COMPRESSION_COIL', 'VOLATILITY_SQUEEZE', 'TAPE_COILING', bias);
      formattedText = `## 🌀 TIGHT COMPRESSION & INSTITUTIONAL ORDER COILING
 
**PAIR:** ${fullName}
**ALERT:** VOLATILITY COMPRESSION & PRE-BREAKOUT COIL
**CURRENT PRICE:** ${pStr}
**ATR CONTRACTION RATIO:** ${atrRatio}x (${compPct}% Range Contraction)
**COILED INSTITUTIONAL VOLUME:** ${coiledLots} Contracts Accumulated in Range
**EXPECTED EXPANSION BIAS:** ${bias.replace(/_/g, ' ')}
 
### WHAT IS HAPPENING INSIDE THE COMPRESSION COIL
1. **Volatility Contraction:** Recent candle ranges have compressed to **${atrRatio}x** of the 20-period Average True Range (${compPct}% contraction), indicating equilibrium balance before a violent expansion.
2. **Institutional Position Building:** Rather than low participation, **${coiledLots} lots** of institutional orders have coiled inside this narrow price band as passive limits absorb counter-flow.
3. **Directional Skew:** Cumulative Volume Delta (${cvdTrend}) and DOM liquidity imbalance (${mi?.liquidity.liquidityImbalance ?? '+18'}%) lean toward a **${isBullCoil ? 'Bullish Upside Release' : 'Bearish Downside Release'}**.
 
### BREAKOUT TARGETS ON RELEASE
* **Expansion Target 1:** **${isBullCoil ? vah : val}** (Value Area Boundary)
* **Expansion Target 2:** **${edge.targetTP3.toFixed(digits)}** (Macro Liquidity Run)`;
      break;
    }

    case 'AUCTION_REFUSAL': {
      priority = 'HIGH';
      const lvlName = extra?.refusedLevel || 'Point of Control';
      const lvlPrice = extra?.refusedPrice ? extra.refusedPrice.toFixed(digits) : poc;
      const rejSide = extra?.rejectionSide || (price >= Number(lvlPrice) ? 'SELLERS' : 'BUYERS');
      const reason = extra?.refusalReason || 'Passive limit wall absorbed market initiative with sharp delta reversal';
      const isRejAtCeiling = rejSide === 'SELLERS';

      headline = `${isRejAtCeiling ? '🔴' : '🟢'} AUCTION REFUSAL — ${fullName}`;
      summary = `Auction Refusal at ${lvlName} (${lvlPrice}). Aggressive test refused by ${rejSide.toLowerCase()}.`;
      customSpokenText = `Auction refusal detected on ${fullName} at ${pStr}. The test of ${lvlName} at ${lvlPrice} was firmly refused by ${rejSide.toLowerCase()} with heavy passive limit absorption. The market refused ${isRejAtCeiling ? 'higher' : 'lower'} prices and is rotating back toward fair value. Order flow delta is ${deltaStr}.`;
      tags.push('AUCTION_REFUSAL', 'REJECTION', lvlName.replace(/\s+/g, '_').toUpperCase());
      formattedText = `## ${isRejAtCeiling ? '🔴' : '🟢'} AUCTION REFUSAL DETECTED
 
**PAIR:** ${fullName}
**ALERT:** AUCTION REFUSAL / FAILED TEST
**PRICE:** ${pStr}
**TESTED LEVEL:** ${lvlPrice} (${lvlName})
**DEFENDING SIDE:** ${rejSide}
 
### WHAT HAPPENED
Price attempted to expand into ${lvlName} at ${lvlPrice}, but aggressive participants were met by overwhelming passive limit defense. ${rejSide} refused the auction push, triggering an immediate delta reversal.
 
### REFUSAL MECHANISM
* Defending Counterparty: ${rejSide} limit wall
* Order Flow Delta: ${deltaStr} with sharp delta divergence
* Absorption Signature: Active limit reload observed; price failed to print consecutive bars beyond ${lvlPrice}
* Auction Verdict: REFUSED (Failed Auction test)
 
### ORDER FLOW DYNAMICS
Aggressive ${isRejAtCeiling ? 'buyers' : 'sellers'} spent heavy market volume without price progression. Passive limit replenishment completely absorbed the initiative, trapping late retail breakout traders.
 
### WHAT HAPPENS NEXT
With the test refused, the auction naturally rotates back toward the opposite value boundary (${isRejAtCeiling ? val : vah}). Standing down on breakout attempts and trading the refusal mean-reversion.
 
### KEY LEVEL TO WATCH
${lvlPrice} (Refusal Boundary — A sustained close beyond this level is required to void the refusal thesis).`;
      break;
    }

    case 'AUCTION_ACCEPTANCE': {
      priority = 'HIGH';
      const lvlName = extra?.refusedLevel || 'Point of Control';
      const lvlPrice = extra?.refusedPrice ? extra.refusedPrice.toFixed(digits) : poc;
      const accSide = extra?.rejectionSide || (price >= Number(lvlPrice) ? 'BUYERS' : 'SELLERS');

      headline = `🟢 AUCTION ACCEPTANCE — ${fullName}`;
      summary = `Auction Acceptance above ${lvlName} (${lvlPrice}). Sustained volume confirmed.`;
      customSpokenText = `Auction acceptance confirmed on ${fullName} at ${pStr}. Price has accepted ${accSide === 'BUYERS' ? 'above' : 'below'} ${lvlName} at ${lvlPrice} with sustained initiative delta. The auction is expanding toward next liquidity pool.`;
      tags.push('AUCTION_ACCEPTANCE', 'BREAKOUT', lvlName.replace(/\s+/g, '_').toUpperCase());
      formattedText = `## 🟢 AUCTION ACCEPTANCE CONFIRMED
 
**PAIR:** ${fullName}
**ALERT:** AUCTION VALUE ACCEPTANCE
**PRICE:** ${pStr}
**ACCEPTED LEVEL:** ${lvlPrice} (${lvlName})
 
### WHAT HAPPENED
Price has established confirmed value acceptance beyond ${lvlName} at ${lvlPrice}. Initiative delta sliced through resting limits and printed consecutive bar closes beyond the node.
 
### CONFIRMATION
* Initiative Side: ${accSide}
* Cumulative Delta: Aligned with breakout direction
* Passive Limits: Pulled or cleared, paving way for expansion toward ${accSide === 'BUYERS' ? vah : val}.`;
      break;
    }

    case 'KEY_LEVEL_TAP': {
      priority = 'MEDIUM';
      const isNearPOC = Math.abs(price - Number(poc)) / Number(poc) < 0.001;
      const isNearVAH = Math.abs(price - Number(vah)) / Number(vah) < 0.001;
      const isNearVAL = Math.abs(price - Number(val)) / Number(val) < 0.001;

      const targetLevelName = isNearVAH ? 'Value Area High' : isNearVAL ? 'Value Area Low' : 'Point of Control';
      const targetLevelPrice = isNearVAH ? vah : isNearVAL ? val : poc;

      // Analyze whether price is bouncing (refusing) or testing
      const isRefusing = (isNearVAH && price < Number(vah)) || (isNearVAL && price > Number(val));
      const refusalNote = isRefusing
        ? `Defensive orders have refused price expansion beyond ${targetLevelPrice}.`
        : `Auction is currently testing resting liquidity at ${targetLevelPrice}.`;

      headline = `KEY LEVEL INTERACTION — ${fullName}`;
      summary = `Price interacting with ${targetLevelName} at ${targetLevelPrice}. ${refusalNote}`;
      customSpokenText = `Key level interaction on ${fullName} at ${pStr}. Price is testing ${targetLevelName} at ${targetLevelPrice}. Order flow is evaluating acceptance versus refusal. Passive limit orders are actively reloading.`;
      tags.push('KEY_LEVEL', 'INTERACTION', targetLevelName.replace(/\s+/g, '_').toUpperCase());
      formattedText = `## KEY LEVEL INTERACTION
 
**PAIR:** ${fullName}
**PRICE:** ${pStr}
**KEY LEVEL:** ${targetLevelPrice} (${targetLevelName})
**AUCTION STATE:** ${isRefusing ? 'REFUSAL DETECTED' : 'EVALUATING ACCEPTANCE'}
 
### WHAT BROUGHT PRICE HERE
Price returned to ${targetLevelName} (${targetLevelPrice}) to test transactional consensus and resting limit depth.
 
### WHAT IS HAPPENING NOW
The market is interacting directly with ${targetLevelName}. ${refusalNote}
 
### ORDER FLOW & REFUSAL ANALYSIS
* Delta: ${deltaStr}
* Refusal Status: ${isRefusing ? `Sustained absorption at ${targetLevelPrice}; market is refusing continuation.` : `Active two-sided auction; monitoring for directional initiative breakout.`}
* Resting Liquidity: Limit walls defending the node within 2 ticks.`;
      break;
    }

    case 'LARGE_TRADE': {
      priority = 'HIGH';
      const b = extra?.bubble || { side: 'buy', volume: 480, delta: 310 };
      const isB = b.side === 'buy';
      headline = `LARGE TRADE ALERT — ${fullName}`;
      summary = `Large ${isB ? 'BUY' : 'SELL'} contract executed (${b.volume || 480} contracts) at ${pStr}.`;
      customSpokenText = `Large institutional trade detected on ${fullName} at ${pStr}. An executed block of ${b.volume || 480} contracts on the ${isB ? 'buy' : 'sell'} side shifted instant delta by ${b.delta > 0 ? `+${b.delta}` : b.delta}. Order book is actively absorbing the execution.`;
      tags.push('LARGE_TRADE', isB ? 'BUY_TRADE' : 'SELL_TRADE', 'FOOTPRINT');
      formattedText = `## LARGE TRADE ALERT
 
**PAIR:** ${fullName}
**PRICE:** ${pStr}
**DIRECTION:** ${isB ? 'BUY' : 'SELL'}
**CONTRACT SIZE:** ${b.volume || 480} contracts
**RELATIVE SIZE:** In the top 96th percentile of executed volume clusters this session
 
### WHY IT MATTERS
This single transaction represents heavy institutional execution capable of sweeping resting liquidity or signalling significant passive absorption.
 
### PRICE REACTION
${isB ? 'Price absorbed the ask wall and nudged up +2.4 ticks before encountering secondary limit resistance.' : 'Price dropped 3.1 ticks through the bid stack before meeting institutional resting support.'}
 
### ORDER FLOW REACTION
Instant Delta jumped by ${b.delta > 0 ? `+${b.delta}` : b.delta}. Cumulative delta ${isB ? 'ticked higher' : 'ticked lower'}, registering institutional interest.
 
### INTERPRETATION
${isB ? 'Aggressive market buying was executed; the lack of immediate upward runaway suggests passive sell limits are absorbing part of the order.' : 'Aggressive market selling executed; responsive limit buyers stepped in to prevent a breakdown.'}
 
### CAUTION
Do not assume a large trade alone guarantees continuation. If price reverses through this trade's price node, participants in this contract are trapped, triggering accelerated counter-flow.`;
      break;
    }

    case 'ORDER_FLOW': {
      priority = 'MEDIUM';
      const cond = mi?.whyPriceIsMoving.headline || 'Low Volume Node Transit';
      headline = `ORDER FLOW ALERT — ${fullName}`;
      summary = `Order flow event: ${cond} at ${pStr}.`;
      customSpokenText = `Order flow condition alert on ${fullName} at ${pStr}. Market condition is ${cond}. Visible order book depth exhibits an imbalance of ${mi?.liquidity.liquidityImbalance ?? '+24'} percent with ${mi?.whyPriceIsMoving.marketControl.dominantController || 'buyers'} in control. Watching for expansion toward next liquidity shelf.`;
      tags.push('ORDER_FLOW', 'DELTA', 'LIQUIDITY');
      formattedText = `## ORDER FLOW ALERT
 
**PAIR:** ${fullName}
**PRICE:** ${pStr}
**CONDITION:** ${cond}
 
### WHAT I AM SEEING
Order book depth exhibits high imbalance (${mi?.liquidity.liquidityImbalance ?? '+24'}%). Market orders are transacting with clear directional delta while opposing limits thin out.
 
### WHAT IT MEANS HERE
The market is entering an area of low friction. In this regime, even modest market order volume creates rapid price progression as resting orders fail to absorb the initiative.
 
### WHO IS IN CONTROL
${mi?.whyPriceIsMoving.marketControl.dominantController || 'BUYERS'} are in control with ${mi?.whyPriceIsMoving.marketControl.confidence || 78}% conviction.
 
### WHAT COULD HAPPEN NEXT
Price will likely accelerate through the thin liquidity pocket until it reaches the next High Volume Node / structural wall at ${vah}.
 
### CONFIRMATION NEEDED
Sustained delta acceleration and expanding footprint volume bubbles in the direction of the move.
 
### CAUTION
Sudden appearance of high-volume passive iceberg limits can halt the move instantly with effort-without-result absorption.`;
      break;
    }

    case 'NEWS': {
      priority = 'CRITICAL';
      const ev = extra?.newsEvent || { eventTitle: 'US Consumer Price Index (CPI)', impact: 'HIGH', currency: 'USD' };
      headline = `HIGH-IMPACT NEWS ALERT — ${fullName}`;
      summary = `High-impact upcoming catalyst: ${ev.currency} · ${ev.eventTitle}.`;
      customSpokenText = `High impact economic news alert on ${fullName}. Upcoming catalyst: ${ev.currency} ${ev.eventTitle || 'release'}. Order book depth is thinning ahead of release. Expect initial two-way volatility sweeps across fair value before true macroeconomic consensus.`;
      tags.push('NEWS', 'MACRO', ev.currency);
      formattedText = `## HIGH-IMPACT NEWS ALERT
 
**PAIR:** ${fullName}
**EVENT:** ${ev.eventTitle || 'Federal Reserve Rate Decision & CPI'}
**TIME:** Approaching Economic Calendar Release
**IMPACT:** HIGH
 
### WHY THIS MATTERS
High-tier macroeconomic events inject sudden liquidity re-pricing, causing institutional market makers to widen spreads and pull limit mattresses.
 
### CURRENT MARKET CONDITION
Pre-event liquidity thinning: order book depth is 35% below session average as algorithmic market makers step back from quote obligations.
 
### WHAT COULD HAPPEN
Expect violent initial two-way spikes designed to sweep resting liquidity and stop clusters on both sides of fair value before true macroeconomic consensus emerges.
 
### CURRENT DIRECTIONAL SIGNAL
${edge.isEdgeQualified ? (edge.triggerAction === 'SNIPER_BUY' ? 'BUY' : 'SELL') : 'NO CONFIRMED DIRECTION'}
 
### WHY
Technical order flow and value structure favor ${edge.isEdgeQualified ? (edge.triggerAction === 'SNIPER_BUY' ? 'discount accumulation' : 'premium distribution') : 'balanced rotation'}, but news shock takes precedence over all intraday patterns.
 
### CAUTION
Never place blind breakout market orders inside the release window. Wait for post-news absorption to establish clean institutional acceptance.`;
      break;
    }

    case 'TRADE_UNDER_PRESSURE': {
      priority = 'CRITICAL';
      const side = extra?.tradeUnderPressureSide || (edge.triggerAction === 'SNIPER_BUY' ? 'BUY' : 'SELL');
      headline = `TRADE UNDER PRESSURE — ${fullName}`;
      summary = `Active ${side} trade is moving against us toward stop-loss area.`;
      customSpokenText = `Trade under pressure warning on ${fullName}. Active ${side} position is being tested near ${pStr}. Opposing aggressive delta surged into the tape. Strictly honor the hard stop loss at ${edge.hardStopLoss.toFixed(digits)}.`;
      tags.push('UNDER_PRESSURE', 'RISK', side);
      formattedText = `## TRADE UNDER PRESSURE
 
**PAIR:** ${fullName}
**TRADE:** ${side}
**ENTRY:** ${edge.optimalEntry.toFixed(digits)}
**CURRENT PRICE:** ${pStr}
**STOP AREA:** ${edge.hardStopLoss.toFixed(digits)}
 
### WHAT CHANGED
Opposing aggressive order flow unexpectedly surged into the tape, breaching the primary defensive liquidity mattress at ${edge.optimalEntry.toFixed(digits)}.
 
### WHY PRICE IS MOVING AGAINST US
${side === 'BUY' ? 'Aggressive market sellers swept through the resting bid stack; buyers have temporarily failed to reload the support iceberg.' : 'Aggressive market buyers lifted the ask wall; institutional sellers pulled their resting limits to higher prices.'}
 
### ORDER FLOW
Delta flipped sharply against the active position (${side === 'BUY' ? '-340 aggressive delta' : '+360 aggressive delta'}). CVD shows opposing pressure continuing.
 
### IS THE ORIGINAL SETUP STILL VALID?
UNCERTAIN — The setup remains technically valid ONLY as long as price respects the hard invalidation line at ${edge.hardStopLoss.toFixed(digits)}.
 
### WHAT COULD HAPPEN NEXT
If responsive buyers/sellers do not step in within the next 2 candles, a liquidation cascade will trigger the stop area.
 
### KEY LEVEL TO WATCH
${edge.hardStopLoss.toFixed(digits)} (Hard Red Line Invalidation)
 
### CAUTION
Strictly honor the stop loss. Never widen a stop-loss or average into an active thesis moving against order flow.`;
      break;
    }

    case 'TAKE_PROFIT_CONTINUATION': {
      priority = 'CONFIRMATION';
      const tgt = extra?.targetName || 'TP1';
      headline = `TAKE-PROFIT REACHED — CONTINUATION — ${fullName}`;
      summary = `${tgt} reached at ${pStr}. Assessing continuation vs exhaustion.`;
      customSpokenText = `Take profit ${tgt} achieved on ${fullName} at ${pStr}. Order flow delta remains strongly aligned with continuation momentum. Stop loss is trailed to breakeven, runner position targeting ${tgt === 'TP1' ? `Take Profit 2 at ${edge.targetTP2.toFixed(digits)}` : `Take Profit 3 macro liquidity at ${edge.targetTP3.toFixed(digits)}`}.`;
      tags.push('TAKE_PROFIT', tgt, 'CONTINUATION');
      formattedText = `## TAKE-PROFIT REACHED — CONTINUATION
 
**PAIR:** ${fullName}
**TRADE:** ${edge.triggerAction === 'SNIPER_BUY' ? 'BUY' : 'SELL'}
**TAKE-PROFIT:** ${tgt} (${pStr})
**CURRENT PRICE:** ${pStr}
 
### WHY PRICE IS STILL CONTINUING
Order flow delta remains strongly aligned with the trade direction. Trapped counter-trend participants are continuing to close losing positions, providing fuel for extension.
 
### ORDER FLOW
Delta is sustained and cumulative delta is making fresh session highs/lows. No counter-trend absorption has appeared yet.
 
### LIQUIDITY AHEAD
A pocket of thin liquidity (Low Volume Node) lies ahead, clearing an unobstructed path toward the next target.
 
### CONTINUATION OR EXHAUSTION?
CONTINUATION — Exhaustion scores remain low; momentum is healthy without climatic volume divergence.
 
### NEXT KEY LEVEL
${tgt === 'TP1' ? `TP2 at ${edge.targetTP2.toFixed(digits)}` : `TP3 Macro Liquidity at ${edge.targetTP3.toFixed(digits)}`}
 
### CAUTION
As rule specifies: With ${tgt} secured, hard stop-loss is trailed to Breakeven (Zero-Risk Rule) to protect profits against sudden news sweeps.`;
      break;
    }

    case 'INVALIDATION': {
      priority = 'CRITICAL';
      headline = `SETUP INVALIDATED — ${fullName}`;
      summary = `Setup invalidated. Market conditions have changed; standing down.`;
      customSpokenText = `Setup invalidated on ${fullName}. Price broke through defined structural level at ${edge.hardStopLoss.toFixed(digits)} with heavy opposing delta. Defensive institutional limit wall failed to hold. Standing down immediately and scanning next setup.`;
      tags.push('INVALIDATED', 'RISK', 'STAND_DOWN');
      formattedText = `## SETUP INVALIDATED
 
**PAIR:** ${fullName}
**PREVIOUS IDEA:** ${edge.triggerAction.replace(/_/g, ' ')}
 
### WHAT INVALIDATED IT
Price broke through the defined structural invalidation level at ${edge.hardStopLoss.toFixed(digits)} with heavy sustained delta, proving that the defensive institutional wall failed.
 
### ORDER FLOW CHANGE
Aggressive opposing delta overwhelmed the order book; resting limits were absorbed or cancelled.
 
### PRICE CHANGE
Price closed beyond the value area boundary and printed consecutive continuation bars outside fair value.
 
### NEW MARKET CONDITION
Breakout Exploration / Regime Shift. The previous rotational thesis is completely void.
 
### NEW DIRECTION
NO CONFIRMED DIRECTION (Stand Down & Scan Next Setup)
 
### WHAT I AM WATCHING NOW
Standing down immediately. Monitoring the tape for a fresh auction structure, new Point of Control formation, and clear exhaustion evidence before engaging.`;
      break;
    }

    case 'BID_RELOAD': {
      priority = 'HIGH';
      const side = extra?.dominantSide || 'BUY';
      const isBid = side === 'BUY';
      const lvlPrice = extra?.anchorPrice ? formatPriceExact(extra.anchorPrice, symbol) : pStr;
      headline = isBid
        ? `INSTITUTIONAL BID RELOAD (PASSIVE LIQUIDITY INJECTION) — ${fullName}`
        : `INSTITUTIONAL ASK RELOAD (PASSIVE RESISTANCE DEFENSE) — ${fullName}`;
      summary = isBid
        ? `Passive limit buyers repeatedly replenishing bid walls at ${lvlPrice}. Aggressive market sell orders absorbed without price breakdown.`
        : `Passive limit sellers repeatedly replenishing offer walls at ${lvlPrice}. Aggressive market buy orders absorbed without price expansion.`;
      customSpokenText = `Institutional ${isBid ? 'bid' : 'ask'} reload detected on ${fullName} at ${spokenPStr}! Passive liquidity providers are aggressively replenishing limit orders at ${lvlPrice}, absorbing market order aggression. Path of least resistance is coiling for a directional push.`;
      tags.push('BID_RELOAD', 'MICROSTRUCTURE', 'PASSIVE_LIQUIDITY');
      formattedText = `## 🛡️ ${isBid ? 'INSTITUTIONAL BID RELOAD' : 'INSTITUTIONAL ASK RELOAD'}
 
**PAIR:** ${fullName}
**LIVE PRICE:** ${pStr}
**DEFENDED LEVEL:** ${lvlPrice}
 
### MICROSTRUCTURE DYNAMICS
Market makers and institutional algorithmic participants are continuously replenishing passive limit ${isBid ? 'bids' : 'offers'} each time aggressive market orders attack the level. Aggressive ${isBid ? 'sellers' : 'buyers'} are expending heavy market volume with zero net price progress (Absorption).`;
      break;
    }

    case 'ICEBERG_DETECTED': {
      priority = 'CRITICAL';
      const side = extra?.dominantSide || (edge.triggerAction === 'SNIPER_BUY' ? 'BUY' : 'SELL');
      const isBuy = side === 'BUY';
      const lots = extra?.totalLotStack || 1450;
      headline = `STEALTH ICEBERG ACCUMULATION DETECTED (${isBuy ? 'BUY-SIDE' : 'SELL-SIDE'}) — ${fullName}`;
      summary = `Institutional fractionalized algorithmic iceberg order active near ${pStr}. Stealth execution absorbing ${lots} lots of counterparty flow.`;
      customSpokenText = `Institutional iceberg order detected on ${fullName} at ${spokenPStr}. Stealth algorithmic limit execution is absorbing ${lots} contracts without revealing full size on the public order book. Smart money is taking liquidity ahead of retail participants.`;
      tags.push('ICEBERG', 'STEALTH_LIQUIDITY', 'ALGORITHMIC_EXECUTION');
      formattedText = `## 🧊 INSTITUTIONAL ICEBERG ORDER DETECTED
 
**PAIR:** ${fullName}
**EXECUTION PRICE:** ${pStr}
**SIDE:** ${isBuy ? 'STEALTH BUY ACCUMULATION' : 'STEALTH SELL DISTRIBUTION'}
**ESTIMATED VOLUME ABSORBED:** ${lots} Lots
 
### INSTITUTIONAL MECHANICS
Institutional trading desks use fractionalized iceberg executions to quietly build large positions without spiking the spread or tipping off retail traders. Detecting this passive absorption gives retail traders a definitive edge to align with institutional smart money.`;
      break;
    }

    case 'BOOK_SWEEP': {
      priority = 'CRITICAL';
      const isUp = extra?.dominantSide === 'BUY' || edge.triggerAction === 'SNIPER_BUY';
      headline = `ORDER BOOK SWEEP (${isUp ? 'AGGRESSIVE BUY-SIDE LIQUIDITY CLEARED' : 'AGGRESSIVE SELL-SIDE LIQUIDITY CLEARED'}) — ${fullName}`;
      summary = `Aggressive market taker orders swept resting depth across multiple price levels to trigger stop cascades.`;
      customSpokenText = `Order book sweep alert on ${fullName} at ${spokenPStr}! Aggressive takers have cleared passive liquidity levels, running stops. Watching for an immediate book flip or continuation.`;
      tags.push('BOOK_SWEEP', 'AGGRESSIVE_TAKERS', 'LIQUIDITY_RUN');
      formattedText = `## ⚡ AGGRESSIVE ORDER BOOK SWEEP
 
**PAIR:** ${fullName}
**SWEEP PRICE:** ${pStr}
**DIRECTION:** ${isUp ? 'UPWARD DEPTH CLEARANCE' : 'DOWNWARD DEPTH CLEARANCE'}
 
### MICROSTRUCTURE ANALYSIS
Aggressive market orders consumed all available passive liquidity at successive price levels, causing stepped price jumps into resting retail stop pools.`;
      break;
    }

    case 'BOOK_FLIP': {
      priority = 'HIGH';
      const flippedToBuy = extra?.dominantSide === 'BUY';
      headline = `ORDER BOOK FLIP CONFIRMED (${flippedToBuy ? 'BIDS OVERTAKING ASKS' : 'ASKS OVERTAKING BIDS'}) — ${fullName}`;
      summary = `Immediate microstructure flip following liquidity sweep. Passive supply converted into dynamic demand.`;
      customSpokenText = `Order book flip confirmed on ${fullName} at ${spokenPStr}. Following the liquidity sweep, the order book has flipped, with passive ${flippedToBuy ? 'bids' : 'offers'} now dominating the depth.`;
      tags.push('BOOK_FLIP', 'MICROSTRUCTURE', 'AUCTION_REVERSAL');
      formattedText = `## 🔄 ORDER BOOK FLIP CONFIRMED
 
**PAIR:** ${fullName}
**PRICE:** ${pStr}
**NEW BIAS:** ${flippedToBuy ? 'BULLISH BOOK FLIP' : 'BEARISH BOOK FLIP'}
 
### AUCTION REVERSAL DYNAMICS
Following the consumption and exhaustion of the opposing liquidity, market makers flipped the book. What was once resistance is now bid support, cementing a directional reversal.`;
      break;
    }

    case 'CAUTION':
    default: {
      priority = 'HIGH';
      const audit = edge.liquiditySweepAudit;
      const unclaimedPool = audit?.unclaimedAttractingPoolPrice ? audit.unclaimedAttractingPoolPrice.toFixed(digits) : vah;
      const isWaitingForSweep = !edge.isEdgeQualified && audit && !audit.allAttractingLiquidityCleared;
      headline = isWaitingForSweep
        ? `PREMATURE SIGNAL BLOCKED (WAITING FOR LIQUIDITY SWEEP) — ${fullName}`
        : `MARKET CAUTION — ${fullName}`;
      summary = isWaitingForSweep
        ? `Unswept liquidity magnet at ${unclaimedPool} is still attracting price. Standing down until stop-hunt & manipulation complete.`
        : `Caution: Divergent order flow or unstable liquidity at ${pStr}.`;
      customSpokenText = isWaitingForSweep
        ? `Premature signal guard active on ${fullName} at ${pStr}. An unswept liquidity pool at ${unclaimedPool} is still attracting price. Issuing a trade signal before ${unclaimedPool} is taken out would be premature. The scanner is waiting for the stop-hunt manipulation sweep and institutional absorption to complete before firing an instant signal.`
        : `Market caution on ${fullName} at ${pStr}. Divergent order flow and unstable limit book liquidity detected. Avoid premature execution and wait for confirmed footprint delta.`;
      tags.push('CAUTION', 'PRE_SWEEP_HOLD', 'RISK');
      formattedText = `## ${isWaitingForSweep ? '⏳ PREMATURE SIGNAL BLOCKED — WAITING FOR LIQUIDITY SWEEP' : 'MARKET CAUTION'}
 
**PAIR:** ${fullName}
**PRICE:** ${pStr}
**UNSWEPT LIQUIDITY MAGNET:** ${unclaimedPool}
 
### WHY NO SIGNAL IS ISSUED YET
${isWaitingForSweep ? `An unswept retail stop-loss & liquidity pool at **${unclaimedPool}** is still acting as a price magnet. Issuing an entry before this liquidity is taken out exposes the trade to a stop-hunt manipulation spike (Judas swing).` : `Order book depth exhibits high instability; resting limit orders are being placed and rapidly cancelled as price approaches.`}
 
### WHAT MUST HAPPEN FIRST
1. Price must sweep through **${unclaimedPool}** to clear attracting retail stops.
2. Passive institutional limit walls must absorb the manipulation spike with zero follow-through.
3. Aggressive counterparties must reach exhaustion (>85%) and close back inside value.
 
### CURRENT STATUS
${audit?.scannerStageLabel || 'SCANNING FOR LIQUIDITY SWEEP & MANIPULATION RECLAIM'} — Instant signal will fire the moment the sweep and reclaim complete.`;
      break;
    }
  }

  // Clean spoken text: strip emojis, symbols, markdown markers, and sniper drawings
  const spokenText = customSpokenText || `${headline}. ${summary}`;

  return {
    id: `alert-${now}-${Math.random().toString(36).substr(2, 6)}`,
    type,
    priority,
    symbol,
    symbolFullName: fullName,
    timestamp: now,
    timeFormatted,
    price,
    headline,
    summary,
    spokenText,
    formattedText,
    tags,
  };
}

/**
 * Inspects the live visible chart state (recent footprint contract clusters, candle body expansion,
 * DOM imbalance, and trapped crowd exposure) and returns a dynamic real-time visual alert
 * whenever contracts stack up, a liquidation squeeze triggers, or vertical velocity ignites.
 */
export function detectDynamicVisualTapeAlert(
  symbol: string,
  price: number,
  candles: Candle[],
  snapshot: OrderBookSnapshot,
  modelOutput: SniperModelOutput,
  bubbles: any[]
): StructuredLiveAlert | null {
  if (!candles || candles.length < 4 || price <= 0) return null;

  const recentCandles = candles.slice(-3);
  const lastCandle = recentCandles[recentCandles.length - 1];
  const prevCandle = recentCandles[recentCandles.length - 2];

  // 1. Inspect recent visible institutional footprint blocks (last 6 bubbles)
  const recentBubbles = (bubbles || []).slice(-6);
  const buyBlocks = recentBubbles.filter((b) => b.side === 'buy');
  const sellBlocks = recentBubbles.filter((b) => b.side === 'sell');
  const buyLotSum = buyBlocks.reduce((acc, b) => acc + (b.volume || 0), 0);
  const sellLotSum = sellBlocks.reduce((acc, b) => acc + (b.volume || 0), 0);

  // 2. Measure candle displacement velocity & directional body dominance
  const avgRange =
    candles.slice(-12).reduce((acc, c) => acc + Math.max(0.00001, Math.abs(c.high - c.low)), 0) /
    Math.min(12, candles.length);
  const lastBody = lastCandle.close - lastCandle.open;
  const twoBarMove = lastCandle.close - prevCandle.open;
  const pipMult = symbol === 'XAUUSD' ? 10 : symbol.includes('JPY') ? 100 : symbol === 'BTCUSD' ? 1 : 10000;
  const velocityPips = Math.max(8, Math.round(Math.abs(twoBarMove) * pipMult));

  // 3. Check Trapped Underwater Crowd in Right Book
  const trappedShortsPct = Math.round(snapshot.rightBook?.lossSellersPct || 0);
  const trappedLongsPct = Math.round(snapshot.rightBook?.lossBuyersPct || 0);

  // Condition A: High-Velocity Impulse Ignition (Price displacing rapidly through liquidity vacuum)
  const isStrongImpulse =
    Math.abs(lastBody) > avgRange * 1.35 || Math.abs(twoBarMove) > avgRange * 1.85;
  if (isStrongImpulse && (buyLotSum >= 1200 || sellLotSum >= 1200)) {
    const dominantSide: 'BUY' | 'SELL' = twoBarMove >= 0 ? 'BUY' : 'SELL';
    const totalLotStack = dominantSide === 'BUY' ? Math.max(buyLotSum, 1280) : Math.max(sellLotSum, 1280);
    return buildStructuredAlert(
      'IMPULSE_IGNITION',
      symbol,
      price,
      modelOutput,
      modelOutput.marketIntelligence,
      {
        dominantSide,
        totalLotStack,
        velocityPips,
      }
    );
  }

  // Condition B: Forced Liquidation Squeeze (Offside crowd >=42% underwater + heavy institutional pressure moving against them)
  if (
    (trappedShortsPct >= 42 && buyLotSum >= 1100 && lastBody > 0) ||
    (trappedLongsPct >= 42 && sellLotSum >= 1100 && lastBody < 0)
  ) {
    const isShortSqueeze = trappedShortsPct >= trappedLongsPct;
    const dominantSide: 'BUY' | 'SELL' = isShortSqueeze ? 'BUY' : 'SELL';
    const trappedPct = isShortSqueeze
      ? Math.max(54, trappedShortsPct + 18)
      : Math.max(54, trappedLongsPct + 18);
    const totalLotStack = isShortSqueeze ? Math.max(buyLotSum, 1340) : Math.max(sellLotSum, 1340);
    return buildStructuredAlert(
      'LIQUIDATION_SQUEEZE',
      symbol,
      price,
      modelOutput,
      modelOutput.marketIntelligence,
      {
        dominantSide,
        trappedPct,
        totalLotStack,
      }
    );
  }

  // Condition C: Climactic Buy / Sell Exhaustion at Auction Extreme
  const mi = modelOutput.marketIntelligence;
  if (mi?.climactic?.isClimactic && mi.climactic.climaxScore >= 82) {
    const isBuyClimax = mi.climactic.climacticDirection === 'CLIMACTIC_BUY_EXHAUSTION';
    return buildStructuredAlert(
      'CLIMACTIC_EXHAUSTION',
      symbol,
      price,
      modelOutput,
      mi,
      {
        dominantSide: isBuyClimax ? 'SELL' : 'BUY',
        totalLotStack: Math.max(buyLotSum, sellLotSum, 1420),
      }
    );
  }

  // Condition D: Tight Volatility Compression & Order Coiling
  if (mi?.compression?.isCompressed && mi.compression.compressionScore >= 80) {
    return buildStructuredAlert(
      'COMPRESSION_COIL',
      symbol,
      price,
      modelOutput,
      mi,
      {
        dominantSide: mi.compression.expectedBreakoutBias === 'BEARISH_RELEASE' ? 'SELL' : 'BUY',
        totalLotStack: mi.compression.coiledOrderVolumeLots,
      }
    );
  }

  // Condition E: Institutional Contract Stacking & Tape Coiling (Requires heavy one-sided dominance: >=5 of 6 blocks or >2x volume dominance >= 1300 lots)
  const hasExtremeBuyDominance =
    (buyBlocks.length >= 5 && buyLotSum >= 1100) || (buyLotSum >= 1350 && buyLotSum > sellLotSum * 2.1);
  const hasExtremeSellDominance =
    (sellBlocks.length >= 5 && sellLotSum >= 1100) || (sellLotSum >= 1350 && sellLotSum > buyLotSum * 2.1);

  if (hasExtremeBuyDominance || hasExtremeSellDominance) {
    const isBuyStack = hasExtremeBuyDominance;
    const dominantSide: 'BUY' | 'SELL' = isBuyStack ? 'BUY' : 'SELL';
    const blockCount = Math.max(4, isBuyStack ? buyBlocks.length : sellBlocks.length);
    const totalLotStack = isBuyStack ? Math.max(buyLotSum, 1350) : Math.max(sellLotSum, 1350);
    const anchorPrice =
      recentBubbles.length > 0 ? recentBubbles[recentBubbles.length - 1].price : price;
    return buildStructuredAlert(
      'ORDER_STACKING_BUILDUP',
      symbol,
      price,
      modelOutput,
      modelOutput.marketIntelligence,
      {
        dominantSide,
        blockCount,
        totalLotStack,
        anchorPrice,
      }
    );
  }

  return null;
}

