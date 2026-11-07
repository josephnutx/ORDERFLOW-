// Institutional Pair-Specific Macro Impact Engine
// Calculates the precise transmission mechanism, 2-phase sequence, pip range, and directional playbook
// for ANY active instrument (XAUUSD, EURUSD, GBPUSD, USDJPY, USDCAD, AUDUSD, USDCHF, NAS100, US500, US30, GER40, UK100, BTCUSD)

import { SniperModelOutput } from '../types/sniperModel';
import { INSTRUMENTS, InstrumentConfig } from './mockDataGenerator';

export type PairImpactDirection = 
  | 'STRONG_BULLISH' 
  | 'BULLISH' 
  | 'STRONG_BEARISH' 
  | 'BEARISH' 
  | 'SWEEP_AND_REVERSE' 
  | 'RANGE_EXPANSION'
  | 'NEUTRAL_BALANCED';

export interface PairSpecificImpact {
  symbol: string;
  symbolFullName: string;
  assetType: 'metals' | 'forex' | 'indices' | 'crypto';
  currencyRole: 'BASE_CURRENCY' | 'QUOTE_CURRENCY' | 'INDEX_BENCHMARK' | 'HARD_COMMODITY' | 'CRYPTO_ASSET';
  roleExplanation: string;
  
  // Directional Verdict for THIS pair
  directionalBias: PairImpactDirection;
  impactBadge: string;
  badgeColor: 'emerald' | 'rose' | 'amber' | 'cyan' | 'purple';
  confidenceScore: number;
  expectedExcursionDisplay: string; // e.g. "45 - 65 pips" or "$18 - $26"
  
  // Direct transmission mechanism
  transmissionMechanics: string;
  
  // 2-Phase Playbook tailored to this pair's price levels
  phase1KneeJerk: {
    direction: 'BEARISH_KNEE_JERK_SWEEP' | 'BULLISH_KNEE_JERK_SWEEP' | 'TWO_WAY_CHOP';
    duration: string;
    targetPriceStr: string;
    levelName: string;
    expectedAction: string;
    trapWarning: string;
  };
  phase2TrueMacroMove: {
    direction: 'BULLISH_EXPANSION' | 'BEARISH_EXPANSION' | 'RANGE_ROTATION';
    duration: string;
    targetPriceStr: string;
    levelName: string;
    expectedAction: string;
    primaryCatalyst: string;
  };
  rightActualMovePlaybook: {
    verdictSummary: string;
    recommendedExecution: string;
    timingAdvice: string;
  };

  // Scenario matrix for this pair
  scenarioMatrix: {
    hot: { trigger: string; reaction: string; bias: PairImpactDirection };
    inLine: { trigger: string; reaction: string; bias: PairImpactDirection };
    cool: { trigger: string; reaction: string; bias: PairImpactDirection };
  };
}

/**
 * Calculates how an economic release (e.g. US Retail Sales, CPI, PPI, Claims, FOMC)
 * directly impacts the currently selected trading pair.
 */
export function calculatePairSpecificImpact(
  symbol: string,
  eventCurrency: string,
  eventCategory: string,
  modelOutput?: SniperModelOutput,
  digits: number = 2
): PairSpecificImpact {
  const sym = symbol.toUpperCase();
  const inst: InstrumentConfig = INSTRUMENTS[sym] || INSTRUMENTS.XAUUSD;
  const evCurr = eventCurrency.toUpperCase();
  
  const currentPrice = modelOutput?.location?.currentPrice || inst.basePrice;
  const pStr = currentPrice.toFixed(digits);

  const vs = modelOutput?.valueStructure || {
    poc: currentPrice * 0.998,
    vah: currentPrice * 1.004,
    val: currentPrice * 0.992,
  };
  const pocStr = (vs.poc || currentPrice).toFixed(digits);
  const vahStr = (vs.vah || currentPrice * 1.005).toFixed(digits);
  const valStr = (vs.val || currentPrice * 0.995).toFixed(digits);

  // 1. Identify relationship between Event Currency and Trading Pair
  let currencyRole: PairSpecificImpact['currencyRole'] = 'QUOTE_CURRENCY';
  let roleExplanation = '';

  if (inst.type === 'metals') {
    currencyRole = 'HARD_COMMODITY';
    roleExplanation = `${sym} is quoted in USD. Bullion moves inverse to US Real Yields and the Dollar Index (DXY). Safe-haven premium accelerates on dovish inflation prints.`;
  } else if (inst.type === 'crypto') {
    currencyRole = 'CRYPTO_ASSET';
    roleExplanation = `${sym} functions as a digital liquidity gauge. Dovish US economic data enhances M2 fiat expansion, boosting Bitcoin risk appetite.`;
  } else if (inst.type === 'indices') {
    currencyRole = 'INDEX_BENCHMARK';
    roleExplanation = `${sym} equities valuation is inversely sensitive to discount rates. Cooler inflation reduces corporate debt servicing costs and expands valuation multiples.`;
  } else if (sym.startsWith(evCurr)) {
    // Event Currency is the BASE currency (e.g. USD in USDJPY, USD in USDCAD, USD in USDCHF, EUR in EURUSD)
    currencyRole = 'BASE_CURRENCY';
    roleExplanation = `${evCurr} is the BASE Currency in ${sym}. Stronger ${evCurr} moves ${sym} HIGHER; weaker ${evCurr} causes ${sym} to FALL directly.`;
  } else if (sym.endsWith(evCurr)) {
    // Event Currency is the QUOTE currency (e.g. USD in EURUSD, USD in GBPUSD, USD in AUDUSD)
    currencyRole = 'QUOTE_CURRENCY';
    roleExplanation = `${evCurr} is the QUOTE Currency in ${sym}. Dollar weakness causes ${sym} to RALLY (inverted reaction); Dollar strength causes ${sym} to DROP.`;
  } else {
    // Cross currency
    currencyRole = 'QUOTE_CURRENCY';
    roleExplanation = `${sym} reacts via global cross-currency liquidity and risk sentiment transmission.`;
  }

  // 2. Determine Expected Direction for THIS Pair based on Macro Disinflation / Soft Landing Thesis
  // Standard consensus baseline: Disinflation + Solid Growth (Dovish for USD, Bullish for Risk/Equities/Gold)
  let directionalBias: PairImpactDirection = 'BULLISH';
  let impactBadge = 'BULLISH EXPANSION';
  let badgeColor: PairSpecificImpact['badgeColor'] = 'emerald';
  let confidenceScore = 84;
  let excursionDisplay = '45 - 65 pips';
  const cat = eventCategory.toUpperCase();
  const isTier1SuperEvent = cat === 'NFP' || cat === 'FOMC';

  // Calibration per asset class & release category
  if (inst.type === 'metals') {
    directionalBias = 'STRONG_BULLISH';
    impactBadge = isTier1SuperEvent ? (cat === 'NFP' ? 'NFP BULLION LIQUIDITY SQUEEZE' : 'FOMC GOLD EXPANSION') : 'GOLD BULLISH SURGE';
    badgeColor = 'emerald';
    confidenceScore = isTier1SuperEvent ? 90 : 86;
    excursionDisplay = isTier1SuperEvent ? '$28.00 - $45.00' : '$18.00 - $28.00';
  } else if (inst.type === 'crypto') {
    directionalBias = 'BULLISH';
    impactBadge = isTier1SuperEvent ? 'TIER-1 CRYPTO LIQUIDITY INJECTION' : 'CRYPTO LIQUIDITY EXPANSION';
    badgeColor = 'cyan';
    confidenceScore = isTier1SuperEvent ? 85 : 82;
    excursionDisplay = isTier1SuperEvent ? '$2,200 - $4,500' : '$1,200 - $2,400';
  } else if (inst.type === 'indices') {
    if (sym === 'NAS100') {
      directionalBias = 'STRONG_BULLISH';
      impactBadge = isTier1SuperEvent ? 'TECH AGGRESSIVE EXPANSION' : 'TECH MULTIPLE EXPANSION';
      badgeColor = 'emerald';
      confidenceScore = isTier1SuperEvent ? 88 : 85;
      excursionDisplay = isTier1SuperEvent ? '220 - 380 points' : '140 - 220 points';
    } else {
      directionalBias = 'BULLISH';
      impactBadge = isTier1SuperEvent ? 'EQUITY BENCHMARK BREAKOUT' : 'EQUITY BENCHMARK RALLY';
      badgeColor = 'emerald';
      confidenceScore = isTier1SuperEvent ? 87 : 84;
      excursionDisplay = isTier1SuperEvent ? '65 - 120 points' : '40 - 75 points';
    }
  } else if (currencyRole === 'BASE_CURRENCY') {
    // Pairs where USD is the BASE currency: USDJPY, USDCAD, USDCHF!
    directionalBias = 'STRONG_BEARISH';
    impactBadge = isTier1SuperEvent ? `${sym} BEARISH ${cat} FLUSH` : `${sym} BEARISH SQUEEZE`;
    badgeColor = 'rose';
    confidenceScore = isTier1SuperEvent ? 89 : 85;
    excursionDisplay = isTier1SuperEvent 
      ? (sym === 'USDJPY' ? '110 - 180 pips' : '75 - 110 pips')
      : (sym === 'USDJPY' ? '85 - 130 pips' : '55 - 75 pips');
  } else {
    // Pairs where USD is the QUOTE currency: EURUSD, GBPUSD, AUDUSD!
    directionalBias = 'BULLISH';
    impactBadge = isTier1SuperEvent ? `${sym} ${cat} BULLISH BREAKOUT` : `${sym} BULLISH IMPULSE`;
    badgeColor = 'emerald';
    confidenceScore = isTier1SuperEvent ? 88 : 83;
    excursionDisplay = isTier1SuperEvent ? '65 - 105 pips' : '45 - 65 pips';
  }

  // 3. Formulate Pair-Specific Transmission Mechanics
  let transmissionMechanics = '';
  if (sym === 'XAUUSD') {
    if (cat === 'NFP') {
      transmissionMechanics = `Non-Farm Payrolls directly dictate the Federal Reserve's interest rate trajectory. Moderating employment additions combined with steady wage inflation keep rate-cut probabilities elevated, forcing 10-year Treasury yields lower and triggering institutional limit accumulation across spot Gold at ${pStr}.`;
    } else if (cat === 'FOMC') {
      transmissionMechanics = `FOMC rate decision and policy guidance determine the cost of holding non-yielding bullion. Neutral-to-dovish policy reaffirmation sparks immediate real yield contraction, driving capital into Gold toward overhead Value Area High (${vahStr}).`;
    } else {
      transmissionMechanics = `As US inflation moderates, US 10-year Treasury yields decline. Non-yielding Gold benefits from lower holding opportunity cost and a weakening US Dollar index (DXY), triggering aggressive institutional limit bids around ${pStr}.`;
    }
  } else if (sym === 'USDJPY') {
    transmissionMechanics = `USD is the Base Currency. Dollar softening combined with narrowing US-Japan sovereign yield differentials forces USDJPY long carry unwinds. Algorithmic sell programs trigger stop runs below key support toward VAL (${valStr}).`;
  } else if (sym === 'USDCAD') {
    transmissionMechanics = `USD is the Base Currency. Weakening Dollar and steady commodity consumer demand cause USDCAD to slide downward toward Value Area Low as the Canadian Dollar outperforms.`;
  } else if (sym === 'USDCHF') {
    transmissionMechanics = `USD is the Base Currency. Capital rotates out of the greenback and into the safe-haven Swiss Franc, dragging USDCHF lower into discount footprint blocks.`;
  } else if (sym === 'EURUSD') {
    transmissionMechanics = `USD is the Quote Currency. A weaker Dollar naturally elevates EURUSD exchange rate, allowing European responsive buyers to reclaim Value Area boundaries and push toward fair value POC (${pocStr}).`;
  } else if (sym === 'GBPUSD') {
    transmissionMechanics = `USD is the Quote Currency. Sterling capitalizes on Dollar deceleration, squeezing trapped retail shorts as price breaches overhead High Volume Nodes toward VAH (${vahStr}).`;
  } else if (sym === 'AUDUSD') {
    transmissionMechanics = `USD is the Quote Currency. Pro-growth consumer resilience and a softer US Dollar support risk-sensitive high-beta commodity currencies like the Australian Dollar.`;
  } else if (sym === 'NAS100') {
    transmissionMechanics = `Nasdaq 100 constituents carry high forward duration cash flows. Lower real yields decrease discount rates on tech mega-caps, causing aggressive institutional volume accumulation.`;
  } else if (sym === 'US500' || sym === 'US30') {
    transmissionMechanics = `Broad market index constituents benefit from steady retail expenditure without cost-of-capital spikes, providing fuel for value area expansion.`;
  } else if (sym === 'GER40') {
    transmissionMechanics = `European equities benefit from global liquidity easing, although Euro currency appreciation partially moderates export pricing power. Net auction bias remains accumulative.`;
  } else {
    transmissionMechanics = `Macro liquidity relief from easing US monetary conditions triggers cross-asset institutional accumulation across ${sym} around ${pStr}.`;
  }

  // 4. Pair-Specific 2-Phase Sequence (Phase 1 Judas Trap vs Phase 2 True Direction)
  const isPairBearish = directionalBias.includes('BEARISH');

  const phase1KneeJerk = isPairBearish
    ? {
        direction: 'BULLISH_KNEE_JERK_SWEEP' as const,
        duration: 'First 0 - 90 Seconds Post-Print',
        targetPriceStr: vahStr,
        levelName: 'Value Area High (VAH)',
        expectedAction: `Initial high-frequency algo spike pushing ${sym} upward to test overhead liquidity at VAH (${vahStr}). Stop-hunt trap designed to trigger retail buy-stops and liquidate early shorts before the true selloff.`,
        trapWarning: `DO NOT BUY THE INITIAL BREAKOUT. Algos intentionally engineer a fake upward wick into ${vahStr} to trap late retail breakout longs before institutions dump liquidity.`,
      }
    : {
        direction: 'BEARISH_KNEE_JERK_SWEEP' as const,
        duration: 'First 0 - 90 Seconds Post-Print',
        targetPriceStr: valStr,
        levelName: 'Value Area Low (VAL)',
        expectedAction: `Initial algorithmic dump sweeping sell-stops underneath Value Area Low (${valStr}). Stop-hunt trap running protective stops and baiting emotional breakdown sellers into wholesale discount.`,
        trapWarning: `DO NOT SELL THE INITIAL SPIKE. High-frequency market makers sweep sell-stops at ${valStr} to fill massive institutional buy orders at a discount.`,
      };

  const phase2TrueMacroMove = isPairBearish
    ? {
        direction: 'BEARISH_EXPANSION' as const,
        duration: 'Minutes 2 - 35 Sustained Extension',
        targetPriceStr: valStr,
        levelName: 'Value Area Low (VAL)',
        expectedAction: `Passive institutional sell walls absorb the fakeout spike at ${vahStr}. Price aggressively rotates downward through POC (${pocStr}), breaking through thin liquidity pockets toward VAL (${valStr}).`,
        primaryCatalyst: `Fundamental dollar weakness dominates the order book, creating heavy aggressive seller delta on ${sym}.`,
      }
    : {
        direction: 'BULLISH_EXPANSION' as const,
        duration: 'Minutes 2 - 35 Sustained Extension',
        targetPriceStr: vahStr,
        levelName: 'Value Area High (VAH)',
        expectedAction: `Institutional Buy Limit orders absorb all aggressive market selling at ${valStr}. An aggressive short squeeze propels ${sym} through POC (${pocStr}) into a sustained expansion toward VAH (${vahStr}).`,
        primaryCatalyst: `Disinflation and soft-landing narrative re-establishes risk asset accumulation across ${sym}.`,
      };

  const rightActualMovePlaybook = isPairBearish
    ? {
        verdictSummary: `RIGHT ACTUAL MOVE ON ${sym}: WAIT FOR PHASE 1 FAKEOUT SPIKE AT VAH (${vahStr}) -> ENTER SHORT ON VALUE REJECTION FOR PHASE 2 DUMP TO VAL (${valStr})`,
        recommendedExecution: `Allow the first 90-120 seconds to clear liquidity above ${vahStr}. Enter Short once footprint delta flips negative and price closes back inside the Value Area.`,
        timingAdvice: 'Execute at T+2 minutes after the initial headline Judas wick completes.',
      }
    : {
        verdictSummary: `RIGHT ACTUAL MOVE ON ${sym}: WAIT FOR PHASE 1 STOP-HUNT SWEEP AT VAL (${valStr}) -> ENTER LONG ON INSTITUTIONAL RECLAIM FOR PHASE 2 EXPANSION TO VAH (${vahStr})`,
        recommendedExecution: `Allow the first 90-120 seconds to sweep stops around ${valStr}. Enter Long once footprint delta flips positive and passive limit reloading confirms support.`,
        timingAdvice: 'Execute at T+2 minutes after Phase 1 algorithmic noise exhausts.',
      };

  // 5. Dynamic Scenario Matrix for THIS specific pair
  const scenarioMatrix = isPairBearish
    ? {
        hot: {
          trigger: `Hot / Hawkish Print (${evCurr} Spikes)`,
          reaction: `Temporary relief bounce on ${sym} toward ${vahStr}, followed by severe breakdown as macro divergence accelerates.`,
          bias: 'RANGE_EXPANSION' as PairImpactDirection,
        },
        inLine: {
          trigger: `In-Line Print (Consensus Met)`,
          reaction: `Orderly downward drift on ${sym} through POC (${pocStr}) as Dollar liquidity demand normalizes.`,
          bias: 'BEARISH' as PairImpactDirection,
        },
        cool: {
          trigger: `Cool / Soft Print (${evCurr} Plummets)`,
          reaction: `Violent downward liquidation cascade on ${sym}, slicing through resting bids into ${valStr}.`,
          bias: 'STRONG_BEARISH' as PairImpactDirection,
        },
      }
    : {
        hot: {
          trigger: `Hot Print (Higher Inflation / Growth)`,
          reaction: `Initial whipsaw on ${sym} testing VAL (${valStr}), followed by rotational dip-buying as soft landing is affirmed.`,
          bias: 'RANGE_EXPANSION' as PairImpactDirection,
        },
        inLine: {
          trigger: `In-Line Print (Consensus Met)`,
          reaction: `Goldilocks environment. Clean upside trend continuation on ${sym} traversing toward ${vahStr}.`,
          bias: 'BULLISH' as PairImpactDirection,
        },
        cool: {
          trigger: `Cool Print (Disinflation / Soft Growth)`,
          reaction: `Aggressive upside short-squeeze on ${sym}. Explosive breakout past ${vahStr} into unhedged price discovery.`,
          bias: 'STRONG_BULLISH' as PairImpactDirection,
        },
      };

  return {
    symbol: sym,
    symbolFullName: inst.name,
    assetType: inst.type,
    currencyRole,
    roleExplanation,
    directionalBias,
    impactBadge,
    badgeColor,
    confidenceScore,
    expectedExcursionDisplay: excursionDisplay,
    transmissionMechanics,
    phase1KneeJerk,
    phase2TrueMacroMove,
    rightActualMovePlaybook,
    scenarioMatrix,
  };
}
