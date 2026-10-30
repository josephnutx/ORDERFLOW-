import { INSTRUMENTS, InstrumentConfig } from './mockDataGenerator';

export type MarketSessionState = 
  | 'OPEN' 
  | 'CLOSED_WEEKEND' 
  | 'DAILY_ROLLOVER_BREAK' 
  | 'OFF_HOURS_CLOSED' 
  | 'DEAD_ZONE_LOW_LIQUIDITY';

export interface MarketScheduleStatus {
  symbol: string;
  name: string;
  assetType: 'metals' | 'indices' | 'forex' | 'crypto';
  isOpen: boolean;
  isPaused: boolean;
  status: MarketSessionState;
  statusBadge: string;
  statusColor: 'emerald' | 'amber' | 'rose' | 'slate';
  sessionName: string;
  reason: string;
  timeUntilOpenFormatted?: string;
  nextOpenDate?: Date;
  shouldPauseModel: boolean;
  liquidityTier: 'HIGH' | 'NORMAL' | 'THIN_OFF_HOURS' | 'ZERO_CLOSED';
}

/**
 * Calculates current real-world global market status for any instrument
 * Based on interbank Forex, CME Metals & Futures, European Exchanges, and 24/7 Crypto schedules.
 */
export function getMarketScheduleStatus(symbol: string, referenceDate: Date = new Date()): MarketScheduleStatus {
  const inst: InstrumentConfig = INSTRUMENTS[symbol] || INSTRUMENTS.XAUUSD;
  const assetType = inst.type;

  // 1. CRYPTO: 24 hours a day, 7 days a week, 365 days a year
  if (assetType === 'crypto') {
    return {
      symbol,
      name: inst.name,
      assetType: 'crypto',
      isOpen: true,
      isPaused: false,
      status: 'OPEN',
      statusBadge: '24/7 CRYPTO OPEN',
      statusColor: 'emerald',
      sessionName: '24/7 Global Crypto Session',
      reason: 'Cryptocurrency trading runs 24/7 without weekend closures or exchange roll halts.',
      shouldPauseModel: false,
      liquidityTier: 'HIGH',
    };
  }

  // Get current UTC day and time
  const day = referenceDate.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday
  const hour = referenceDate.getUTCHours();
  const minute = referenceDate.getUTCMinutes();
  const timeInMinutes = hour * 60 + minute;

  // 2. FOREX (EURUSD, GBPUSD, USDJPY, AUDUSD, USDCAD, USDCHF)
  // Opens: Sunday 21:00 UTC (5:00 PM EST)
  // Closes: Friday 21:00 UTC (5:00 PM EST)
  // Daily rollover break: 21:00 - 21:15 UTC (Mon - Thu)
  if (assetType === 'forex') {
    // Weekend closure: Friday after 21:00 UTC, all Saturday, Sunday before 21:00 UTC
    const isFridayPostClose = day === 5 && timeInMinutes >= 21 * 60;
    const isSaturday = day === 6;
    const isSundayPreOpen = day === 0 && timeInMinutes < 21 * 60;

    if (isFridayPostClose || isSaturday || isSundayPreOpen) {
      // Calculate next open: Sunday at 21:00 UTC
      const nextOpen = getNextDayTime(referenceDate, 0, 21, 0);
      const diffMs = Math.max(0, nextOpen.getTime() - referenceDate.getTime());
      return {
        symbol,
        name: inst.name,
        assetType: 'forex',
        isOpen: false,
        isPaused: true,
        status: 'CLOSED_WEEKEND',
        statusBadge: 'MARKET CLOSED (WEEKEND)',
        statusColor: 'rose',
        sessionName: 'Weekend Interbank Closure',
        reason: 'Global interbank forex is closed for the weekend. Reopens Sunday at 5:00 PM EST (21:00 UTC).',
        timeUntilOpenFormatted: formatDuration(diffMs),
        nextOpenDate: nextOpen,
        shouldPauseModel: true,
        liquidityTier: 'ZERO_CLOSED',
      };
    }

    // Daily rollover break: Monday through Thursday between 21:00 and 21:15 UTC
    if (day >= 1 && day <= 4 && timeInMinutes >= 21 * 60 && timeInMinutes < 21 * 60 + 15) {
      const nextOpen = new Date(referenceDate);
      nextOpen.setUTCHours(21, 15, 0, 0);
      const diffMs = Math.max(0, nextOpen.getTime() - referenceDate.getTime());
      return {
        symbol,
        name: inst.name,
        assetType: 'forex',
        isOpen: false,
        isPaused: true,
        status: 'DAILY_ROLLOVER_BREAK',
        statusBadge: 'DAILY ROLLOVER PAUSE',
        statusColor: 'amber',
        sessionName: 'New York Bank Settlement Rollover',
        reason: 'Daily bank settlement rollover (5:00–5:15 PM EST). Wide spreads and thin liquidity. Algorithmic entries paused.',
        timeUntilOpenFormatted: formatDuration(diffMs),
        nextOpenDate: nextOpen,
        shouldPauseModel: true,
        liquidityTier: 'THIN_OFF_HOURS',
      };
    }

    // Active Forex Sessions
    const session = getForexSessionName(hour);
    return {
      symbol,
      name: inst.name,
      assetType: 'forex',
      isOpen: true,
      isPaused: false,
      status: 'OPEN',
      statusBadge: `OPEN · ${session.short}`,
      statusColor: 'emerald',
      sessionName: session.full,
      reason: session.desc,
      shouldPauseModel: false,
      liquidityTier: session.tier,
    };
  }

  // 3. METALS (XAUUSD / Gold)
  // CME / COMEX Gold Schedule:
  // Opens: Sunday 22:00 UTC (6:00 PM EST)
  // Closes: Friday 21:00 UTC (5:00 PM EST)
  // Daily maintenance halt: Monday - Thursday 21:00 - 22:00 UTC (5:00 PM - 6:00 PM EST)
  if (assetType === 'metals') {
    const isFridayPostClose = day === 5 && timeInMinutes >= 21 * 60;
    const isSaturday = day === 6;
    const isSundayPreOpen = day === 0 && timeInMinutes < 22 * 60;

    if (isFridayPostClose || isSaturday || isSundayPreOpen) {
      const nextOpen = getNextDayTime(referenceDate, 0, 22, 0);
      const diffMs = Math.max(0, nextOpen.getTime() - referenceDate.getTime());
      return {
        symbol,
        name: inst.name,
        assetType: 'metals',
        isOpen: false,
        isPaused: true,
        status: 'CLOSED_WEEKEND',
        statusBadge: 'MARKET CLOSED (WEEKEND)',
        statusColor: 'rose',
        sessionName: 'Weekend CME / Bullion Closure',
        reason: 'Bullion desks and CME metals trading are closed for the weekend. Reopens Sunday at 6:00 PM EST (22:00 UTC).',
        timeUntilOpenFormatted: formatDuration(diffMs),
        nextOpenDate: nextOpen,
        shouldPauseModel: true,
        liquidityTier: 'ZERO_CLOSED',
      };
    }

    // Daily CME 60-minute maintenance halt: 21:00 - 22:00 UTC (Mon - Thu)
    if (day >= 1 && day <= 4 && timeInMinutes >= 21 * 60 && timeInMinutes < 22 * 60) {
      const nextOpen = new Date(referenceDate);
      nextOpen.setUTCHours(22, 0, 0, 0);
      const diffMs = Math.max(0, nextOpen.getTime() - referenceDate.getTime());
      return {
        symbol,
        name: inst.name,
        assetType: 'metals',
        isOpen: false,
        isPaused: true,
        status: 'DAILY_ROLLOVER_BREAK',
        statusBadge: 'DAILY CME HALT (PAUSED)',
        statusColor: 'amber',
        sessionName: 'CME Gold Daily Settlement Halt',
        reason: 'CME 60-minute daily maintenance roll halt (5:00–6:00 PM EST). Spot/futures clearing. Execution paused.',
        timeUntilOpenFormatted: formatDuration(diffMs),
        nextOpenDate: nextOpen,
        shouldPauseModel: true,
        liquidityTier: 'ZERO_CLOSED',
      };
    }

    const session = getForexSessionName(hour);
    return {
      symbol,
      name: inst.name,
      assetType: 'metals',
      isOpen: true,
      isPaused: false,
      status: 'OPEN',
      statusBadge: `OPEN · ${session.short}`,
      statusColor: 'emerald',
      sessionName: `${session.full} (Gold Active)`,
      reason: 'Gold institutional liquidity is active across global bullion dealers.',
      shouldPauseModel: false,
      liquidityTier: session.tier,
    };
  }

  // 4. INDICES (NAS100, US500, US30, GER40, UK100)
  // US Indices (CME E-mini Futures):
  // Sunday 22:00 UTC to Friday 21:00 UTC, daily 21:00 - 22:00 UTC maintenance
  // European Indices (GER40 / DAX, UK100 / FTSE):
  // Cash hours: Mon - Fri 07:00 - 20:00 UTC
  const isEuropean = symbol === 'GER40' || symbol === 'UK100';

  if (isEuropean) {
    const isWeekend = day === 0 || day === 6;
    const isOutOfCashHours = hour < 7 || hour >= 20;

    if (isWeekend || isOutOfCashHours) {
      const nextOpen = isWeekend ? getNextDayTime(referenceDate, 1, 7, 0) : (hour >= 20 ? getNextDayTime(referenceDate, (day + 1) % 7, 7, 0) : new Date(referenceDate));
      if (!isWeekend && hour < 7) {
        nextOpen.setUTCHours(7, 0, 0, 0);
      }
      const diffMs = Math.max(0, nextOpen.getTime() - referenceDate.getTime());
      return {
        symbol,
        name: inst.name,
        assetType: 'indices',
        isOpen: false,
        isPaused: true,
        status: isWeekend ? 'CLOSED_WEEKEND' : 'OFF_HOURS_CLOSED',
        statusBadge: isWeekend ? 'EXCHANGE CLOSED (WEEKEND)' : 'OFF-HOURS CLOSED',
        statusColor: isWeekend ? 'rose' : 'slate',
        sessionName: isWeekend ? 'European Bourse Weekend' : 'European Cash Session Closed',
        reason: `${symbol} cash exchange (Frankfurt/London) is closed. Regular hours: Mon–Fri 08:00–21:00 CET.`,
        timeUntilOpenFormatted: formatDuration(diffMs),
        nextOpenDate: nextOpen,
        shouldPauseModel: true,
        liquidityTier: 'ZERO_CLOSED',
      };
    }

    return {
      symbol,
      name: inst.name,
      assetType: 'indices',
      isOpen: true,
      isPaused: false,
      status: 'OPEN',
      statusBadge: 'OPEN · EUROPE CASH',
      statusColor: 'emerald',
      sessionName: 'European Cash Bourse Session',
      reason: 'DAX / FTSE cash auctions active with high institutional depth.',
      shouldPauseModel: false,
      liquidityTier: 'HIGH',
    };
  } else {
    // US Indices (NAS100, US500, US30)
    const isFridayPostClose = day === 5 && timeInMinutes >= 21 * 60;
    const isSaturday = day === 6;
    const isSundayPreOpen = day === 0 && timeInMinutes < 22 * 60;

    if (isFridayPostClose || isSaturday || isSundayPreOpen) {
      const nextOpen = getNextDayTime(referenceDate, 0, 22, 0);
      const diffMs = Math.max(0, nextOpen.getTime() - referenceDate.getTime());
      return {
        symbol,
        name: inst.name,
        assetType: 'indices',
        isOpen: false,
        isPaused: true,
        status: 'CLOSED_WEEKEND',
        statusBadge: 'MARKET CLOSED (WEEKEND)',
        statusColor: 'rose',
        sessionName: 'CME Futures Weekend Closure',
        reason: 'US index futures and cash markets closed for the weekend. Reopens Sunday at 6:00 PM EST (22:00 UTC).',
        timeUntilOpenFormatted: formatDuration(diffMs),
        nextOpenDate: nextOpen,
        shouldPauseModel: true,
        liquidityTier: 'ZERO_CLOSED',
      };
    }

    // Daily 60-minute CME break: 21:00 - 22:00 UTC
    if (day >= 1 && day <= 4 && timeInMinutes >= 21 * 60 && timeInMinutes < 22 * 60) {
      const nextOpen = new Date(referenceDate);
      nextOpen.setUTCHours(22, 0, 0, 0);
      const diffMs = Math.max(0, nextOpen.getTime() - referenceDate.getTime());
      return {
        symbol,
        name: inst.name,
        assetType: 'indices',
        isOpen: false,
        isPaused: true,
        status: 'DAILY_ROLLOVER_BREAK',
        statusBadge: 'CME ROLL BREAK (PAUSED)',
        statusColor: 'amber',
        sessionName: 'CME Index Futures Maintenance Halt',
        reason: 'CME 60-minute daily settlement halt (5:00–6:00 PM EST). Model execution paused.',
        timeUntilOpenFormatted: formatDuration(diffMs),
        nextOpenDate: nextOpen,
        shouldPauseModel: true,
        liquidityTier: 'ZERO_CLOSED',
      };
    }

    const isUSCashHours = (hour >= 13 && hour < 20) || (hour === 13 && minute >= 30);
    return {
      symbol,
      name: inst.name,
      assetType: 'indices',
      isOpen: true,
      isPaused: false,
      status: 'OPEN',
      statusBadge: isUSCashHours ? 'OPEN · US CASH CORE' : 'OPEN · CME GLOBEX',
      statusColor: 'emerald',
      sessionName: isUSCashHours ? 'US Cash Equity Session (NYSE/NASDAQ)' : 'CME Globex Futures Session',
      reason: isUSCashHours ? 'Core Wall Street cash trading hours with peak institutional volume.' : 'CME Globex overnight / extended futures trading.',
      shouldPauseModel: false,
      liquidityTier: isUSCashHours ? 'HIGH' : 'NORMAL',
    };
  }
}

/**
 * Returns active forex session and liquidity tier based on UTC hour
 */
function getForexSessionName(utcHour: number): { short: string; full: string; desc: string; tier: 'HIGH' | 'NORMAL' | 'THIN_OFF_HOURS' } {
  if (utcHour >= 12 && utcHour < 16) {
    return {
      short: 'LONDON / NY OVERLAP',
      full: 'London & New York Overlap (Peak Volatility)',
      desc: 'Highest global liquidity window of the 24-hour cycle. Both London and New York institutional order books active.',
      tier: 'HIGH',
    };
  }
  if (utcHour >= 7 && utcHour < 12) {
    return {
      short: 'LONDON CORE',
      full: 'London European Session',
      desc: 'Heavy institutional volume driven by European banking centers.',
      tier: 'HIGH',
    };
  }
  if (utcHour >= 16 && utcHour < 21) {
    return {
      short: 'NEW YORK AFTERNOON',
      full: 'New York Afternoon Session',
      desc: 'US session continuation. Institutional positioning heading into the NY cash close.',
      tier: 'NORMAL',
    };
  }
  if (utcHour >= 0 && utcHour < 7) {
    return {
      short: 'TOKYO / ASIAN',
      full: 'Asian Session (Tokyo / Singapore / Sydney)',
      desc: 'Moderate liquidity with focus on JPY and AUD pairs. Tighter ranges and mean-reverting auctions.',
      tier: 'NORMAL',
    };
  }
  return {
    short: 'DEAD ZONE',
    full: 'Overnight Dead Zone / Post-Roll',
    desc: 'Low liquidity transition between New York close and Asian open.',
    tier: 'THIN_OFF_HOURS',
  };
}

/**
 * Calculates next date for target day of week (0-6) and UTC hour/min
 */
function getNextDayTime(fromDate: Date, targetDay: number, targetHour: number, targetMin: number): Date {
  const result = new Date(fromDate);
  const currentDay = fromDate.getUTCDay();
  let daysToAdd = (targetDay - currentDay + 7) % 7;
  if (daysToAdd === 0) {
    const currentMin = fromDate.getUTCHours() * 60 + fromDate.getUTCMinutes();
    const targetMinTotal = targetHour * 60 + targetMin;
    if (currentMin >= targetMinTotal) {
      daysToAdd = 7;
    }
  }
  result.setUTCDate(result.getUTCDate() + daysToAdd);
  result.setUTCHours(targetHour, targetMin, 0, 0);
  return result;
}

/**
 * Formats duration milliseconds into readable "Xd Xh Xm"
 */
function formatDuration(ms: number): string {
  if (ms <= 0) return '0m';
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
