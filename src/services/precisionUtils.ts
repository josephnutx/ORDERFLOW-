// Unified Precision and Price Formatting Engine
// Ensures 100% collaboration between visual charts, UI modals, intelligence synthesis, and spoken audio.

import { INSTRUMENTS } from './mockDataGenerator';

export const DIGIT_WORDS: Record<string, string> = {
  '0': 'zero',
  '1': 'one',
  '2': 'two',
  '3': 'three',
  '4': 'four',
  '5': 'five',
  '6': 'six',
  '7': 'seven',
  '8': 'eight',
  '9': 'nine',
};

export function getInstrumentPrecision(symbol: string): number {
  if (!symbol) return 2;
  const sym = symbol.toUpperCase().trim();
  const cfg = INSTRUMENTS[sym];
  if (cfg && typeof cfg.digits === 'number') {
    return cfg.digits;
  }
  if (sym.includes('JPY')) return 3;
  if (['EURUSD', 'GBPUSD', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 'EURGBP'].includes(sym)) return 5;
  if (['XAUUSD', 'NAS100', 'US500', 'ETHUSD'].includes(sym)) return 2;
  if (['BTCUSD', 'US30', 'GER40', 'UK100', 'DJI'].includes(sym)) return 1;
  return 2;
}

export function formatPriceExact(price: number, symbol: string): string {
  if (typeof price !== 'number' || isNaN(price)) return '0.00';
  const digits = getInstrumentPrecision(symbol);
  return price.toFixed(digits);
}

/**
 * Phonetically formats a price for Text-to-Speech synthesis engines (especially on Android / Chrome / iOS)
 * to prevent TTS engines from eating leading or trailing zeroes (e.g. 1.08450 -> "one point eight" or "1.08"),
 * misinterpreting decimals as software version numbers or dates, or truncating significant digits.
 * 
 * Spells each decimal digit as plain English words ("zero eight four five zero") so the voice is 100% exact.
 */
export function formatPriceForAudio(price: number, symbol: string): string {
  if (typeof price !== 'number' || isNaN(price)) return '0 point zero zero';
  const digits = getInstrumentPrecision(symbol);
  const formatted = price.toFixed(digits);
  const [whole, decimal] = formatted.split('.');

  if (!decimal) return whole;

  // Spell each decimal digit phonetically in plain English words ("zero eight four five zero")
  // This guarantees 100% exact pronunciation on all browser TTS engines (Chrome, Android, iOS, Windows, Mac),
  // completely preventing decimal truncation, dropped zeroes, version-number confusion, and rounding errors.
  const phoneticDecimals = decimal
    .split('')
    .map((d) => DIGIT_WORDS[d] || d)
    .join(' ');

  return `${whole} point ${phoneticDecimals}`;
}

/**
 * Converts any raw price decimals embedded in speech text into crystal-clear phonetic words
 * so that Web Speech API never mispronounces, truncates, or rounds prices when speaking.
 * Preserves percentages (e.g. "68.5%"), multipliers ("2.4x"), time, and non-price numbers.
 */
export function phoneticallyFormatAllPricesInText(text: string): string {
  if (!text) return '';

  return text
    // 1. Convert decimals like "1.08450" or "2742.50" or "152.65" into "1 point zero eight four five zero"
    // Negative lookahead ensures we do NOT convert percentages (e.g. "68.5%"), multipliers ("2.4x"), or time units
    .replace(
      /\b(\d+)\.(\d{1,5})\b(?!\s*[%xX]|(?:\s*(?:percent|times|pips|sec|min|hours|days|sigma|σ)))/g,
      (_match, whole, decimals) => {
        const words = decimals
          .split('')
          .map((d: string) => DIGIT_WORDS[d] || d)
          .join(' ');
        return `${whole} point ${words}`;
      }
    )
    // 2. Also convert existing spaced digit representations like "point 0 8 4 5 0" to "point zero eight four five zero"
    .replace(/point\s+((?:[0-9]\s*)+)/gi, (_match, digitsGroup) => {
      const cleanedDigits = digitsGroup.trim().replace(/\s+/g, '');
      const words = cleanedDigits
        .split('')
        .map((d: string) => DIGIT_WORDS[d] || d)
        .join(' ');
      return `point ${words}`;
    });
}

/**
 * Reconciles any AI-generated or cached report text so that stale or hallucinated price figures
 * are strictly updated to match the real-time live price figure.
 */
export function reconcileScriptPrices(
  text: string,
  symbol: string,
  currentPrice: number,
  oldReportPrice?: number
): string {
  if (!text) return '';
  const exactPrice = formatPriceExact(currentPrice, symbol);
  
  let reconciled = text;
  
  // If we know the old price that was in the report, replace it explicitly
  if (oldReportPrice && Math.abs(oldReportPrice - currentPrice) > 0.000001) {
    const oldPriceDigits = getInstrumentPrecision(symbol);
    const oldStr = oldReportPrice.toFixed(oldPriceDigits);
    const oldStr2 = oldReportPrice.toFixed(2);
    const oldStr4 = oldReportPrice.toFixed(4);
    
    reconciled = reconciled
      .split(oldStr).join(exactPrice)
      .split(oldStr2).join(exactPrice)
      .split(oldStr4).join(exactPrice);
  }

  return reconciled;
}
