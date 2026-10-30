// Unified Precision and Price Formatting Engine
// Ensures 100% collaboration between visual charts, UI modals, intelligence synthesis, and spoken audio.

import { INSTRUMENTS } from './mockDataGenerator';

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
 * Phonetically formats a price for Text-to-Speech synthesis engines (especially on Android / Chrome)
 * to prevent TTS engines from eating leading decimal zeroes (e.g. 1.08450 -> "one point eight"),
 * misinterpreting decimals as software version numbers or dates, or truncating significant digits.
 */
export function formatPriceForAudio(price: number, symbol: string): string {
  if (typeof price !== 'number' || isNaN(price)) return '0.00';
  const digits = getInstrumentPrecision(symbol);
  const formatted = price.toFixed(digits);
  
  // For forex pairs with 4 or 5 decimal digits (EURUSD, GBPUSD, etc.), spell out digits after the decimal point
  // so Android TTS crystal-clearly announces each digit without omitting zeroes or rounding.
  if (digits >= 4) {
    const [whole, decimal] = formatted.split('.');
    if (decimal) {
      // Space out decimal digits: "0 8 5 4 2"
      const spacedDecimal = decimal.split('').join(' ');
      return `${whole} point ${spacedDecimal}`;
    }
  }

  // For 2 or 3 digits (Gold, JPY, Indices), standard decimal format is spoken reliably
  return formatted;
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

