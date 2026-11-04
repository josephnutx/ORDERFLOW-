import { INSTRUMENTS, InstrumentConfig } from './mockDataGenerator';

export type MarketSessionState = 
  | 'OPEN' 
  | 'CLOSED_WEEKEND' 
  | 'DAILY_ROLLOVER_BREAK' 
  | 'OFF_HOURS_CLOSED' 
  | 'DEAD_ZONE_LOW_LIQUIDITY';

export interface DaylightSavingTimeInfo {
  isDST: boolean; // true during Daylight Saving Time (EDT, UTC-4), false during Standard Time (EST, UTC-5)
  tzAbbreviation: 'EST' | 'EDT';
  utcOffsetHours: number; // -5 in EST (winter), -4 in EDT (summer)
  utcOffsetLabel: string; // 'UTC-5' or 'UTC-4'
  forexFridayCloseUtc: string; // '22:00 UTC (5:00 PM EST)' in winter, '21:00 UTC (5:00 PM EDT)' in summer
  forexSundayOpenUtc: string; // '22:00 UTC (5:00 PM EST)' in winter, '21:00 UTC (5:00 PM EDT)' in summer
  cmeGoldSundayOpenUtc: string; // '23:00 UTC (6:00 PM EST)' in winter, '22:00 UTC (6:00 PM EDT)' in summer
  cmeDailyRollBreakUtc: string; // '22:00 - 23:00 UTC' in winter, '21:00 - 22:00 UTC' in summer
  usCashSessionUtc: string; // '14:30 - 21:00 UTC' in winter, '13:30 - 20:00 UTC' in summer
  activePolicyNote: string;
}

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
  dstInfo: DaylightSavingTimeInfo;
}

/**
 * Robust Daylight Saving Time (DST) detector for America/New_York
 * In Winter (Standard Time / EST): UTC-5 (Markets close Friday 22:00 UTC / 5:00 PM EST)
 * In Summer (Daylight Time / EDT): UTC-4 (Markets close Friday 21:00 UTC / 5:00 PM EDT)
 */
export function getDstInfo(referenceDate: Date = new Date()): DaylightSavingTimeInfo {
  let isDST = false;
  let tzAbbr: 'EST' | 'EDT' = 'EST';
  let offsetHours = -5;

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      timeZoneName: 'short',
    }).formatToParts(referenceDate);

    const tzPart = parts.find((p) => p.type === 'timeZoneName');
    if (tzPart) {
      if (tzPart.value.includes('EDT') || tzPart.value.includes('Daylight')) {
        isDST = true;
        tzAbbr = 'EDT';
        offsetHours = -4;
      } else {
        isDST = false;
        tzAbbr = 'EST';
        offsetHours = -5;
      }
    } else {
      // Fallback: US DST ends first Sunday in November, resumes second Sunday in March
      const month = referenceDate.getUTCMonth(); // 0 = Jan, 10 = Nov
      isDST = month >= 2 && month < 10;
      tzAbbr = isDST ? 'EDT' : 'EST';
      offsetHours = isDST ? -4 : -5;
    }
  } catch {
    const month = referenceDate.getUTCMonth();
    isDST = month >= 2 && month < 10;
    tzAbbr = isDST ? 'EDT' : 'EST';
    offsetHours = isDST ? -4 : -5;
  }

  const offsetLabel = `UTC${offsetHours >= 0 ? `+${offsetHours}` : offsetHours}`;
  const forexCloseUtc = isDST ? '21:00 UTC (5:00 PM EDT)' : '22:00 UTC (5:00 PM EST)';
  const forexOpenUtc = isDST ? '21:00 UTC (5:00 PM EDT)' : '22:00 UTC (5:00 PM EST)';
  const cmeOpenUtc = isDST ? '22:00 UTC (6:00 PM EDT)' : '23:00 UTC (6:00 PM EST)';
  const cmeRollUtc = isDST ? '21:00–22:00 UTC' : '22:00–23:00 UTC';
  const usCashUtc = isDST ? '13:30–20:00 UTC' : '14:30–21:00 UTC';

  return {
    isDST,
    tzAbbreviation: tzAbbr,
    utcOffsetHours: offsetHours,
    utcOffsetLabel: offsetLabel,
    forexFridayCloseUtc: forexCloseUtc,
    forexSundayOpenUtc: forexOpenUtc,
    cmeGoldSundayOpenUtc: cmeOpenUtc,
    cmeDailyRollBreakUtc: cmeRollUtc,
    usCashSessionUtc: usCashUtc,
    activePolicyNote: isDST
      ? 'Daylight Saving Time (EDT, UTC-4) active · Markets close Friday 5:00 PM EDT (21:00 UTC)'
      : 'Standard Time (EST, UTC-5) active · Markets close Friday 5:00 PM EST (22:00 UTC)',
  };
}

/**
 * Extracts wall-clock time in America/New_York timezone
 */
export function getNewYorkTime(referenceDate: Date = new Date()): {
  day: number; // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
  hour: number; // 0 - 23
  minute: number; // 0 - 59
  timeInMinutes: number; // total minutes from midnight
  formattedET: string;
} {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(referenceDate);
    const weekdayStr = parts.find((p) => p.type === 'weekday')?.value || 'Mon';
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);

    const dayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    const day = dayMap[weekdayStr] ?? referenceDate.getUTCDay();
    const timeInMinutes = hour * 60 + minute;
    const formattedET = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ET`;

    return { day, hour, minute, timeInMinutes, formattedET };
  } catch {
    // Fallback using UTC - 5
    const utcHours = referenceDate.getUTCHours();
    const estHours = (utcHours - 5 + 24) % 24;
    const estDay = utcHours < 5 ? (referenceDate.getUTCDay() - 1 + 7) % 7 : referenceDate.getUTCDay();
    const minute = referenceDate.getUTCMinutes();
    return {
      day: estDay,
      hour: estHours,
      minute,
      timeInMinutes: estHours * 60 + minute,
      formattedET: `${String(estHours).padStart(2, '0')}:${String(minute).padStart(2, '0')} ET`,
    };
  }
}

/**
 * Calculates current real-world global market status for any instrument
 * Based on interbank Forex, CME Metals & Futures, European Exchanges, and 24/7 Crypto schedules.
 * Dynamically calibrated for Daylight Saving Time (DST) shifts!
 */
export function getMarketScheduleStatus(symbol: string, referenceDate: Date = new Date()): MarketScheduleStatus {
  const inst: InstrumentConfig = INSTRUMENTS[symbol] || INSTRUMENTS.XAUUSD;
  const assetType = inst.type;
  const dstInfo = getDstInfo(referenceDate);

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
      dstInfo,
    };
  }

  // Get current New York local day and time
  // Interbank forex, CME metals, and US equity futures all officially anchor to New York closing time!
  const ny = getNewYorkTime(referenceDate);
  const { day, hour, minute, timeInMinutes } = ny;

  // 2. FOREX (EURUSD, GBPUSD, USDJPY, AUDUSD, USDCAD, USDCHF)
  // Opens: Sunday 5:00 PM New York Time (17:00 ET)
  //   - In Winter (EST / UTC-5): 22:00 UTC
  //   - In Summer (EDT / UTC-4): 21:00 UTC
  // Closes: Friday 5:00 PM New York Time (17:00 ET)
  //   - In Winter (EST / UTC-5): 22:00 UTC
  //   - In Summer (EDT / UTC-4): 21:00 UTC
  // Daily rollover break: Mon - Thu 5:00 PM - 5:15 PM ET (17:00 - 17:15 ET)
  if (assetType === 'forex') {
    // Weekend closure: Friday after 5:00 PM ET, all Saturday, Sunday before 5:00 PM ET
    const isFridayPostClose = day === 5 && timeInMinutes >= 17 * 60;
    const isSaturday = day === 6;
    const isSundayPreOpen = day === 0 && timeInMinutes < 17 * 60;

    if (isFridayPostClose || isSaturday || isSundayPreOpen) {
      // Next open: Sunday at 17:00 New York Time
      const nextOpen = getNextNewYorkTime(referenceDate, 0, 17, 0, dstInfo.utcOffsetHours);
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
        reason: `Global interbank forex is closed for the weekend. Reopens Sunday at 5:00 PM ${dstInfo.tzAbbreviation} (${dstInfo.forexSundayOpenUtc.split(' ')[0]} UTC).`,
        timeUntilOpenFormatted: formatDuration(diffMs),
        nextOpenDate: nextOpen,
        shouldPauseModel: true,
        liquidityTier: 'ZERO_CLOSED',
        dstInfo,
      };
    }

    // Daily rollover break: Monday through Thursday between 5:00 PM and 5:15 PM ET
    if (day >= 1 && day <= 4 && timeInMinutes >= 17 * 60 && timeInMinutes < 17 * 60 + 15) {
      const nextOpen = new Date(referenceDate.getTime() + (17 * 60 + 15 - timeInMinutes) * 60000);
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
        reason: `Daily bank settlement rollover (5:00–5:15 PM ${dstInfo.tzAbbreviation}). Wide spreads and thin liquidity. Algorithmic entries paused.`,
        timeUntilOpenFormatted: formatDuration(diffMs),
        nextOpenDate: nextOpen,
        shouldPauseModel: true,
        liquidityTier: 'THIN_OFF_HOURS',
        dstInfo,
      };
    }

    // Active Forex Sessions
    const utcHour = referenceDate.getUTCHours();
    const session = getForexSessionName(utcHour, dstInfo.isDST);
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
      dstInfo,
    };
  }

  // 3. METALS (XAUUSD / Gold)
  // CME / COMEX Gold Schedule:
  // Opens: Sunday 6:00 PM New York Time (18:00 ET)
  //   - In Winter (EST / UTC-5): 23:00 UTC
  //   - In Summer (EDT / UTC-4): 22:00 UTC
  // Closes: Friday 5:00 PM New York Time (17:00 ET)
  //   - In Winter (EST / UTC-5): 22:00 UTC
  //   - In Summer (EDT / UTC-4): 21:00 UTC
  // Daily maintenance halt: Monday - Thursday 5:00 PM - 6:00 PM ET (17:00 - 18:00 ET)
  //   - In Winter (EST / UTC-5): 22:00 - 23:00 UTC
  //   - In Summer (EDT / UTC-4): 21:00 - 22:00 UTC
  if (assetType === 'metals') {
    const isFridayPostClose = day === 5 && timeInMinutes >= 17 * 60;
    const isSaturday = day === 6;
    const isSundayPreOpen = day === 0 && timeInMinutes < 18 * 60;

    if (isFridayPostClose || isSaturday || isSundayPreOpen) {
      const nextOpen = getNextNewYorkTime(referenceDate, 0, 18, 0, dstInfo.utcOffsetHours);
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
        reason: `Bullion desks and CME metals trading closed for the weekend. Reopens Sunday at 6:00 PM ${dstInfo.tzAbbreviation} (${dstInfo.cmeGoldSundayOpenUtc.split(' ')[0]} UTC).`,
        timeUntilOpenFormatted: formatDuration(diffMs),
        nextOpenDate: nextOpen,
        shouldPauseModel: true,
        liquidityTier: 'ZERO_CLOSED',
        dstInfo,
      };
    }

    // Daily CME 60-minute maintenance halt: 5:00 PM - 6:00 PM ET (Mon - Thu)
    if (day >= 1 && day <= 4 && timeInMinutes >= 17 * 60 && timeInMinutes < 18 * 60) {
      const nextOpen = new Date(referenceDate.getTime() + (18 * 60 - timeInMinutes) * 60000);
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
        reason: `CME 60-minute daily maintenance roll halt (5:00–6:00 PM ${dstInfo.tzAbbreviation} / ${dstInfo.cmeDailyRollBreakUtc}). Spot/futures clearing. Execution paused.`,
        timeUntilOpenFormatted: formatDuration(diffMs),
        nextOpenDate: nextOpen,
        shouldPauseModel: true,
        liquidityTier: 'ZERO_CLOSED',
        dstInfo,
      };
    }

    const utcHour = referenceDate.getUTCHours();
    const session = getForexSessionName(utcHour, dstInfo.isDST);
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
      dstInfo,
    };
  }

  // 4. INDICES (NAS100, US500, US30, GER40, UK100)
  const isEuropean = symbol === 'GER40' || symbol === 'UK100';

  if (isEuropean) {
    // European cash exchange hours: 08:00 - 17:30 / 20:00 Central European Time (CET/CEST)
    // Frankfurt / London cash bourse hours
    const isWeekend = day === 0 || day === 6;
    const utcHour = referenceDate.getUTCHours();
    const isOutOfCashHours = utcHour < 7 || utcHour >= 20;

    if (isWeekend || isOutOfCashHours) {
      const nextOpen = isWeekend 
        ? getNextDayTime(referenceDate, 1, 7, 0) 
        : (utcHour >= 20 ? getNextDayTime(referenceDate, (referenceDate.getUTCDay() + 1) % 7, 7, 0) : new Date(referenceDate));
      if (!isWeekend && utcHour < 7) {
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
        dstInfo,
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
      dstInfo,
    };
  } else {
    // US Indices (NAS100, US500, US30)
    // CME E-mini Futures:
    // Sunday 6:00 PM ET to Friday 5:00 PM ET, daily 5:00 - 6:00 PM ET maintenance
    const isFridayPostClose = day === 5 && timeInMinutes >= 17 * 60;
    const isSaturday = day === 6;
    const isSundayPreOpen = day === 0 && timeInMinutes < 18 * 60;

    if (isFridayPostClose || isSaturday || isSundayPreOpen) {
      const nextOpen = getNextNewYorkTime(referenceDate, 0, 18, 0, dstInfo.utcOffsetHours);
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
        reason: `US index futures and cash markets closed for the weekend. Reopens Sunday at 6:00 PM ${dstInfo.tzAbbreviation} (${dstInfo.cmeGoldSundayOpenUtc.split(' ')[0]} UTC).`,
        timeUntilOpenFormatted: formatDuration(diffMs),
        nextOpenDate: nextOpen,
        shouldPauseModel: true,
        liquidityTier: 'ZERO_CLOSED',
        dstInfo,
      };
    }

    // Daily 60-minute CME break: 5:00 PM - 6:00 PM ET
    if (day >= 1 && day <= 4 && timeInMinutes >= 17 * 60 && timeInMinutes < 18 * 60) {
      const nextOpen = new Date(referenceDate.getTime() + (18 * 60 - timeInMinutes) * 60000);
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
        reason: `CME 60-minute daily settlement halt (5:00–6:00 PM ${dstInfo.tzAbbreviation}). Model execution paused.`,
        timeUntilOpenFormatted: formatDuration(diffMs),
        nextOpenDate: nextOpen,
        shouldPauseModel: true,
        liquidityTier: 'ZERO_CLOSED',
        dstInfo,
      };
    }

    // US Cash Core session: 9:30 AM - 4:00 PM New York Time (NYSE / NASDAQ cash bell)
    const isUSCashHours = timeInMinutes >= (9 * 60 + 30) && timeInMinutes < (16 * 60);
    return {
      symbol,
      name: inst.name,
      assetType: 'indices',
      isOpen: true,
      isPaused: false,
      status: 'OPEN',
      statusBadge: isUSCashHours ? 'OPEN · US CASH CORE' : 'OPEN · CME GLOBEX',
      statusColor: 'emerald',
      sessionName: isUSCashHours ? `US Cash Equity Session (NYSE/NASDAQ · ${dstInfo.usCashSessionUtc})` : 'CME Globex Futures Session',
      reason: isUSCashHours ? 'Core Wall Street cash trading hours with peak institutional volume.' : 'CME Globex overnight / extended futures trading.',
      shouldPauseModel: false,
      liquidityTier: isUSCashHours ? 'HIGH' : 'NORMAL',
      dstInfo,
    };
  }
}

/**
 * Returns active forex session and liquidity tier based on UTC hour and active DST
 */
function getForexSessionName(utcHour: number, isDST: boolean): { short: string; full: string; desc: string; tier: 'HIGH' | 'NORMAL' | 'THIN_OFF_HOURS' } {
  // Overlap window shifts by 1 hour when US is in Standard Time (EST) vs Daylight Time (EDT)
  const overlapStart = isDST ? 12 : 13;
  const overlapEnd = isDST ? 16 : 17;
  const nyClose = isDST ? 21 : 22;

  if (utcHour >= overlapStart && utcHour < overlapEnd) {
    return {
      short: 'LONDON / NY OVERLAP',
      full: 'London & New York Overlap (Peak Volatility)',
      desc: 'Highest global liquidity window of the 24-hour cycle. Both London and New York institutional order books active.',
      tier: 'HIGH',
    };
  }
  if (utcHour >= 7 && utcHour < overlapStart) {
    return {
      short: 'LONDON CORE',
      full: 'London European Session',
      desc: 'Heavy institutional volume driven by European banking centers.',
      tier: 'HIGH',
    };
  }
  if (utcHour >= overlapEnd && utcHour < nyClose) {
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
 * Calculates next date for target day of week (0-6) and NY local hour/min
 */
function getNextNewYorkTime(
  fromDate: Date,
  targetDay: number,
  targetHourET: number,
  targetMinET: number,
  nyUtcOffsetHours: number
): Date {
  const ny = getNewYorkTime(fromDate);
  let daysToAdd = (targetDay - ny.day + 7) % 7;
  if (daysToAdd === 0) {
    const currentMin = ny.timeInMinutes;
    const targetMinTotal = targetHourET * 60 + targetMinET;
    if (currentMin >= targetMinTotal) {
      daysToAdd = 7;
    }
  }

  // Convert target New York time to UTC
  // targetHourET - nyUtcOffsetHours (e.g., 17 ET - (-5) = 22 UTC in EST)
  const targetUtcHour = (targetHourET - nyUtcOffsetHours + 24) % 24;
  const dayShift = targetHourET - nyUtcOffsetHours >= 24 ? 1 : 0;

  const result = new Date(fromDate);
  result.setUTCDate(result.getUTCDate() + daysToAdd + dayShift);
  result.setUTCHours(targetUtcHour, targetMinET, 0, 0);
  return result;
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
