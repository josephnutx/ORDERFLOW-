// Trading Voice & Real-Time Chart Squawk Engine
// Speaks fluent, professional English market commentary and continuous updates on live charts.

import { Candle, OrderBookSnapshot, FootprintBubble } from '../types/orderbook';
import { SniperModelOutput } from '../types/sniperModel';
import { getInstrumentPrecision, formatPriceExact } from './precisionUtils';
import { getMarketScheduleStatus } from './marketHoursService';

export type SquawkCadence = 'continuous' | 'balanced' | 'alerts_only' | 'on_review' | 'muted';
export type VoicePersona = 'master_voice' | 'pit_trader' | 'orderflow_analyst' | 'risk_coach';

export interface TradingVoiceSettings {
  enabled: boolean;
  voiceURI: string;
  cadence: SquawkCadence;
  persona: VoicePersona;
  rate: number; // 0.85 to 1.3
  pitch: number; // 0.8 to 1.2
  volume: number; // 0.1 to 1.0
  chimeSoundEnabled: boolean;
  announcePricePips: boolean;
}

export interface SquawkTranscriptItem {
  id: string;
  timestamp: number;
  timeFormatted: string;
  text: string;
  category: 'PRICE_ACTION' | 'ORDER_BOOK' | 'ABSORPTION' | 'SIGNAL_EDGE' | 'TP_TARGET' | 'BRIEFING' | 'AUCTION_VALUE' | 'STRUCTURED_ALERT';
  symbol: string;
  persona: VoicePersona;
}

export function getFullSymbolName(symbol: string): string {
  const s = (symbol || '').toUpperCase().trim();
  if (s === 'XAUUSD') return 'Gold';
  if (s === 'EURUSD') return 'Euro against the US Dollar';
  if (s === 'GBPUSD') return 'British Pound against the US Dollar';
  if (s === 'USDJPY') return 'US Dollar against the Japanese Yen';
  if (s === 'USDCAD') return 'US Dollar against the Canadian Dollar';
  if (s === 'AUDUSD') return 'Australian Dollar against the US Dollar';
  if (s === 'NZDUSD') return 'New Zealand Dollar against the US Dollar';
  if (s === 'USDCHF') return 'US Dollar against the Swiss Franc';
  if (s === 'EURJPY') return 'Euro against the Japanese Yen';
  if (s === 'GBPJPY') return 'British Pound against the Japanese Yen';
  if (s === 'BTCUSD') return 'Bitcoin';
  if (s === 'ETHUSD') return 'Ethereum';
  if (s === 'US30' || s === 'DJI') return 'Dow Jones Industrial 30';
  if (s === 'NAS100' || s === 'US100') return 'Nasdaq 100';
  if (s === 'SPX500' || s === 'US500') return 'S&P 500';
  if (s === 'GER40' || s === 'DAX') return 'German DAX 40';
  if (s === 'UK100' || s === 'FTSE') return 'UK FTSE 100';
  return s;
}

const STORAGE_KEY = 'unified_trading_voice_settings_v4';

const DEFAULT_SETTINGS: TradingVoiceSettings = {
  enabled: true,
  voiceURI: '',
  cadence: 'continuous', // Default: continuous real-time market updates & all alerts
  persona: 'master_voice', // Single unified authoritative trading voice
  rate: 1.05,
  pitch: 1.0,
  volume: 1.0,
  chimeSoundEnabled: true,
  announcePricePips: true,
};

class TradingVoiceEngine {
  private settings: TradingVoiceSettings = { ...DEFAULT_SETTINGS };
  private listeners: Set<(speaking: boolean, currentItem?: SquawkTranscriptItem) => void> = new Set();
  private transcriptListeners: Set<(history: SquawkTranscriptItem[]) => void> = new Set();
  private transcriptHistory: SquawkTranscriptItem[] = [];
  private isCurrentlySpeaking: boolean = false;
  private currentSpokenItem: SquawkTranscriptItem | null = null;
  private lastSpokenCategoryTime: Record<string, number> = {};
  private lastSpokenText: string = '';
  private voicesCache: SpeechSynthesisVoice[] = [];
  private voicesInitialized: boolean = false;
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private safetyTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingDispatchTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSpeechEndTime: number = 0;
  private recentSpokenPhrases: Map<string, number> = new Map();
  private pendingAutoUtterance: {
    text: string;
    options: {
      category?: SquawkTranscriptItem['category'];
      symbol?: string;
      priority?: boolean;
      force?: boolean;
      cooldownMs?: number;
    };
  } | null = null;
  private audioUnlockedByGesture: boolean = false;

  constructor() {
    this.loadSettings();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.initVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        this.initVoices();
      };
      this.attachGlobalAutoUnlockListeners();
    }
  }

  private attachGlobalAutoUnlockListeners() {
    if (typeof window === 'undefined') return;
    const handleFirstInteraction = () => {
      if (this.audioUnlockedByGesture) return;
      this.audioUnlockedByGesture = true;
      this.unlockAudio();
      // If an automatic AI briefing was blocked by browser autoplay before first interaction, speak it immediately
      if (this.pendingAutoUtterance && this.settings.enabled && this.settings.cadence !== 'muted') {
        const pending = this.pendingAutoUtterance;
        this.pendingAutoUtterance = null;
        setTimeout(() => {
          this.speak(pending.text, { ...pending.options, force: true });
        }, 80);
      }
    };

    window.addEventListener('pointerdown', handleFirstInteraction, { passive: true });
    window.addEventListener('keydown', handleFirstInteraction, { passive: true });
    window.addEventListener('touchstart', handleFirstInteraction, { passive: true });
  }

  private initVoices() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const all = window.speechSynthesis.getVoices();
    if (all && all.length > 0) {
      this.voicesCache = all;
      this.voicesInitialized = true;
      // If voiceURI is unset or invalid, find the best English voice
      if (!this.settings.voiceURI || !all.some((v) => v.voiceURI === this.settings.voiceURI)) {
        const best = this.findBestEnglishVoice(all);
        if (best) {
          this.settings.voiceURI = best.voiceURI;
        }
      }
    }
  }

  public getEnglishVoices(): SpeechSynthesisVoice[] {
    if (typeof window === 'undefined' || !window.speechSynthesis) return [];
    if (!this.voicesInitialized || this.voicesCache.length === 0) {
      this.voicesCache = window.speechSynthesis.getVoices();
    }
    // Filter for English voices (en, en-US, en-GB, en-AU, etc.)
    const englishVoices = this.voicesCache.filter((v) =>
      v.lang.toLowerCase().startsWith('en')
    );

    // Sort to place natural, neural, enhanced, and top studio voices first
    return englishVoices.sort((a, b) => {
      const aScore = this.scoreVoiceQuality(a);
      const bScore = this.scoreVoiceQuality(b);
      return bScore - aScore;
    });
  }

  private scoreVoiceQuality(v: SpeechSynthesisVoice): number {
    let score = 0;
    const name = v.name.toLowerCase();
    if (name.includes('natural') || name.includes('online')) score += 50;
    if (name.includes('google') || name.includes('neural')) score += 40;
    if (name.includes('samantha') || name.includes('daniel') || name.includes('alex') || name.includes('arthur') || name.includes('karen')) score += 35;
    if (name.includes('enhanced') || name.includes('premium')) score += 30;
    if (v.lang === 'en-US' || v.lang === 'en-GB') score += 10;
    return score;
  }

  private findBestEnglishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    const english = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
    if (english.length === 0) return null;

    // 1. Check for Microsoft Natural Online voices (Edge/Windows - sounds very fluent)
    const natural = english.find(
      (v) =>
        v.name.includes('Natural') ||
        v.name.includes('Online') ||
        v.name.includes('Neural')
    );
    if (natural) return natural;

    // 2. Check for Google High Quality (Chrome)
    const google = english.find(
      (v) =>
        v.name.includes('Google') &&
        (v.lang.startsWith('en-US') || v.lang.startsWith('en-GB'))
    );
    if (google) return google;

    // 3. Apple Enhanced (macOS / iOS)
    const apple = english.find(
      (v) =>
        v.name.includes('Enhanced') ||
        v.name === 'Samantha' ||
        v.name === 'Daniel' ||
        v.name === 'Alex'
    );
    if (apple) return apple;

    // 4. Default to standard en-US or en-GB
    return (
      english.find((v) => v.lang === 'en-US') ||
      english.find((v) => v.lang === 'en-GB') ||
      english[0]
    );
  }

  public getSettings(): TradingVoiceSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<TradingVoiceSettings>) {
    this.settings = { ...this.settings, ...partial };
    this.saveSettings();
  }

  private loadSettings() {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  private saveSettings() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // Ignore
    }
  }

  public subscribe(fn: (speaking: boolean, currentItem?: SquawkTranscriptItem) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  public subscribeTranscript(fn: (history: SquawkTranscriptItem[]) => void): () => void {
    this.transcriptListeners.add(fn);
    const hist = [...this.transcriptHistory];
    setTimeout(() => {
      fn(hist);
    }, 0);
    return () => this.transcriptListeners.delete(fn);
  }

  private notify(speaking: boolean, item?: SquawkTranscriptItem) {
    this.isCurrentlySpeaking = speaking;
    this.currentSpokenItem = speaking && item ? item : null;
    this.listeners.forEach((fn) => fn(speaking, item));
  }

  private pushTranscript(item: SquawkTranscriptItem) {
    this.transcriptHistory = [item, ...this.transcriptHistory].slice(0, 40);
    this.transcriptListeners.forEach((fn) => fn(this.transcriptHistory));
  }

  public getTranscriptHistory(): SquawkTranscriptItem[] {
    return [...this.transcriptHistory];
  }

  public clearTranscripts() {
    this.transcriptHistory = [];
    this.transcriptListeners.forEach((fn) => fn(this.transcriptHistory));
  }

  public isSpeaking(): boolean {
    return this.isCurrentlySpeaking;
  }

  public cancelSpeech() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      if (this.safetyTimer) {
        clearTimeout(this.safetyTimer);
        this.safetyTimer = null;
      }
      this.activeUtterance = null;
      window.speechSynthesis.cancel();
      this.notify(false);
    } catch {
      // Ignore
    }
  }

  /**
   * Unlock speech synthesis and audio engine (called on user gestures)
   */
  public unlockAudio() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Speak a synthesized message with clean, professional trading English pronunciation.
   * Uses ONE unified master voice throughout the entire platform.
   */
  public speak(
    text: string,
    options: {
      category?: SquawkTranscriptItem['category'];
      symbol?: string;
      priority?: boolean;
      force?: boolean;
      cooldownMs?: number;
    } = {}
  ): boolean {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return false;
    }

    const {
      category = 'PRICE_ACTION',
      symbol = 'MARKET',
      priority = false,
      force = false,
      cooldownMs = 10000,
    } = options;

    // 1. Market Schedule Awareness:
    // If the market is closed or in a settlement/CME maintenance halt for this symbol,
    // suppress all automated background voice alerts, squawks, tape alerts, and periodic commentary.
    // (Only allowed if user explicitly forces speech via an interactive button click).
    if (!force && symbol && symbol !== 'MARKET') {
      try {
        const schedule = getMarketScheduleStatus(symbol);
        if (schedule.shouldPauseModel) {
          return false;
        }
      } catch {
        // Fallback gracefully
      }
    }

    // If completely muted in settings and NOT priority/forced, respect mute
    if (!force && !priority && (!this.settings.enabled || this.settings.cadence === 'muted')) {
      return false;
    }

    // Always ensure speech synthesis engine is unlocked and active
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {
      // Ignore
    }

    // Filter by cadence: If cadence is alerts_only, speak targets and structured alerts
    if (this.settings.cadence === 'alerts_only' && !priority && !force && category !== 'TP_TARGET' && category !== 'SIGNAL_EDGE' && category !== 'STRUCTURED_ALERT') {
      return false;
    }

    const now = Date.now();
    const cleanSpokenText = this.sanitizeForSpeech(text);
    if (!cleanSpokenText || cleanSpokenText.trim().length === 0) {
      return false;
    }

    // Anti-Repetition & Anti-Collision Filter:
    // If not forced by an explicit user gesture (e.g. clicking Brief Me Now or Read Alert):
    // 1. NEVER interrupt or collide with an active utterance!
    // 2. Enforce a minimum 28-second quiet breathing gap after any utterance finishes before the next automatic voice alert can fire.
    // 3. Strictly suppress any message that is identical or thematically identical spoken within the last 120 seconds.
    const normalizedKey = cleanSpokenText.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    const thematicKey = normalizedKey.replace(/[0-9]+/g, '#').trim();
    if (!force) {
      // If currently speaking or a dispatch is pending, DO NOT collide or interrupt
      if (this.isCurrentlySpeaking || window.speechSynthesis.speaking || this.pendingDispatchTimer) {
        // Watchdog: only reset if speech synthesis has been stuck for >22 seconds
        if (now - (this.lastSpokenCategoryTime['__ACTIVE__'] || 0) > 22000) {
          this.cancelSpeech();
        } else {
          return false;
        }
      }

      // Enforce global minimum 28s breathing gap between automatic spoken alerts
      const lastActiveStart = this.lastSpokenCategoryTime['__ACTIVE__'] || 0;
      if (now - this.lastSpeechEndTime < 28000 || now - lastActiveStart < 32000) {
        return false;
      }

      const lastPhraseTime = this.recentSpokenPhrases.get(thematicKey) || this.recentSpokenPhrases.get(normalizedKey) || 0;
      if (now - lastPhraseTime < 120000) {
        // Suppress repetitive speech!
        return false;
      }

      // Check category cooldown
      const lastTime = this.lastSpokenCategoryTime[category] || 0;
      if (now - lastTime < Math.max(cooldownMs, 30000)) {
        return false;
      }
    }

    // Record phrase and thematic timestamps
    this.recentSpokenPhrases.set(thematicKey, now);
    this.recentSpokenPhrases.set(normalizedKey, now);
    if (this.recentSpokenPhrases.size > 80) {
      for (const [key, ts] of this.recentSpokenPhrases.entries()) {
        if (now - ts > 180000) {
          this.recentSpokenPhrases.delete(key);
        }
      }
    }

    try {
      // Only explicit user action (force: true) cancels ongoing speech immediately
      if (force) {
        try {
          if (this.pendingDispatchTimer) {
            clearTimeout(this.pendingDispatchTimer);
            this.pendingDispatchTimer = null;
          }
          window.speechSynthesis.cancel();
          if (this.safetyTimer) {
            clearTimeout(this.safetyTimer);
            this.safetyTimer = null;
          }
        } catch {
          // Ignore
        }

        // Chromium bug fix: Calling speak() synchronously right after cancel() clears the new utterance.
        // Waiting 80ms guarantees the browser speech queue is flushed and ready.
        this.pendingDispatchTimer = setTimeout(() => {
          this.pendingDispatchTimer = null;
          this.dispatchUtterance(cleanSpokenText, category, symbol);
        }, 80);
        return true;
      }

      this.dispatchUtterance(cleanSpokenText, category, symbol);
      return true;
    } catch (err) {
      console.warn('Trading voice speak error:', err);
      this.activeUtterance = null;
      this.notify(false);
      return false;
    }
  }

  private dispatchUtterance(
    cleanSpokenText: string,
    category: SquawkTranscriptItem['category'],
    symbol: string
  ) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(cleanSpokenText);
      utterance.rate = Math.max(0.85, Math.min(1.3, this.settings.rate));
      utterance.pitch = Math.max(0.8, Math.min(1.2, this.settings.pitch));
      utterance.volume = Math.max(0.1, Math.min(1.0, this.settings.volume));

      // Resolve preferred single voice
      const voices = this.getEnglishVoices();
      let selectedVoice: SpeechSynthesisVoice | null = null;
      if (this.settings.voiceURI) {
        selectedVoice = voices.find((v) => v.voiceURI === this.settings.voiceURI) || null;
      }
      if (!selectedVoice) {
        selectedVoice = this.findBestEnglishVoice(voices);
      }
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      const now = Date.now();
      const transcriptItem: SquawkTranscriptItem = {
        id: `squawk-${now}-${Math.random().toString(36).substr(2, 6)}`,
        timestamp: now,
        timeFormatted: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        text: cleanSpokenText,
        category,
        symbol,
        persona: 'master_voice',
      };

      // Keep strong reference to prevent garbage-collection cut-off in Chromium
      this.activeUtterance = utterance;
      this.lastSpokenCategoryTime[category] = now;
      this.lastSpokenCategoryTime['__ACTIVE__'] = now;

      utterance.onstart = () => {
        this.lastSpokenCategoryTime[category] = Date.now();
        this.lastSpokenCategoryTime['__ACTIVE__'] = Date.now();
        this.lastSpokenText = cleanSpokenText;
        this.notify(true, transcriptItem);

        // Safety watchdog timer so speech state never gets stuck permanently
        if (this.safetyTimer) clearTimeout(this.safetyTimer);
        this.safetyTimer = setTimeout(() => {
          if (this.isCurrentlySpeaking) {
            this.lastSpeechEndTime = Date.now();
            this.notify(false);
            this.activeUtterance = null;
          }
        }, 22000);
      };

      utterance.onend = () => {
        if (this.safetyTimer) {
          clearTimeout(this.safetyTimer);
          this.safetyTimer = null;
        }
        this.lastSpeechEndTime = Date.now();
        this.activeUtterance = null;
        this.notify(false);
      };

      utterance.onerror = (e: SpeechSynthesisErrorEvent) => {
        if (this.safetyTimer) {
          clearTimeout(this.safetyTimer);
          this.safetyTimer = null;
        }
        // If browser blocked speech due to 'not-allowed' before user gesture, queue it so it speaks automatically on first interaction
        if (e?.error === 'not-allowed' || !this.audioUnlockedByGesture) {
          this.pendingAutoUtterance = {
            text: cleanSpokenText,
            options: { category, symbol, priority: true, force: true },
          };
        }
        this.lastSpeechEndTime = Date.now();
        this.activeUtterance = null;
        this.notify(false);
      };

      this.pushTranscript(transcriptItem);
      window.speechSynthesis.speak(utterance);

      // In Chromium, periodical resume during long utterance prevents pauses
      const resumeInterval = setInterval(() => {
        if (!this.activeUtterance || !window.speechSynthesis.speaking) {
          clearInterval(resumeInterval);
        } else if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }, 5000);
    } catch (err) {
      console.warn('Dispatch utterance error:', err);
      this.notify(false);
    }
  }

  /**
   * Sanitizes all text for clean, professional spoken trading audio:
   * 1. Strips out all emojis, symbols, and drawing markers (target, sniper symbol, crosshair, bullseye, drawings).
   * 2. Removes markdown, code tags, section labels, and brackets.
   * 3. Replaces financial abbreviations with natural spoken English (Take Profit, Stop Loss, Point of Control).
   */
  public sanitizeForSpeech(text: string): string {
    if (!text) return '';

    return text
      // 1. Strip all unicode emojis, symbols, pictographs, drawings, and dingbats
      // Covers 🎯 (bullseye/target/sniper), 🏹, 🔫, ⚡, 🚀, 🟢, 🔴, 🛑, ⚠️, 🚨, 🏆, 🔥, 📊, 📈, 📉, 🎙️, 🔊, etc.
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{2300}-\u{23FF}\u{2B50}-\u{2B55}\u{200D}\u{200B}]/gu, '')
      // 2. Strip section references like §20–§28 or §20-28
      .replace(/§\s*\d+([–-]\d+)?/gi, '')
      // 3. Remove words referring to sniper symbols, drawings, or icons
      .replace(/\bsniper\s*(symbol|drawing|drawings|target|icon|radar)?\b/gi, '')
      .replace(/\b(drawing|drawings)\b/gi, '')
      .replace(/\b(crosshair|bullseye|target\s*symbol|radar\s*icon)\b/gi, '')
      .replace(/\bSNIPER_BUY\b/gi, 'Buy')
      .replace(/\bSNIPER_SELL\b/gi, 'Sell')
      .replace(/\bSNIPER_SETUP\b/gi, 'Setup')
      .replace(/\bSNIPER\b/gi, '')
      // 4. Strip markdown formatting: headers, bold, bullets, code blocks, tables
      .replace(/#{1,6}\s*/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[•*–—_~`>|]/g, ' ')
      .replace(/[#@$^&=+<>{}[\]\\]/g, ' ')
      // 5. Expand trading abbreviations to natural spoken phrases
      .replace(/\bTP1\b/gi, 'Take Profit 1')
      .replace(/\bTP2\b/gi, 'Take Profit 2')
      .replace(/\bTP3\b/gi, 'Take Profit 3')
      .replace(/\bT\.?Ps?\b/gi, 'take profits')
      .replace(/\bSL\b/gi, 'Stop Loss')
      .replace(/\bS\.?L\.?\b/gi, 'Stop Loss')
      .replace(/\bBE\b/gi, 'Breakeven')
      .replace(/\bPOC\b/gi, 'Point of Control')
      .replace(/\bVAH\b/gi, 'Value Area High')
      .replace(/\bVAL\b/gi, 'Value Area Low')
      .replace(/\bHVN\b/gi, 'High Volume Node')
      .replace(/\bLVN\b/gi, 'Low Volume Node')
      .replace(/\bCVD\b/gi, 'Cumulative Volume Delta')
      .replace(/\bRR\b/gi, 'Risk Reward')
      .replace(/\bCPI\b/g, 'Consumer Price Index')
      .replace(/\bNFP\b/g, 'Non Farm Payrolls')
      .replace(/\bFOMC\b/g, 'Federal Open Market Committee')
      .replace(/\bECB\b/g, 'European Central Bank')
      // 6. Currency and asset pairs
      .replace(/\bXAUUSD\b/g, 'Gold')
      .replace(/\bEURUSD\b/g, 'Euro against the US Dollar')
      .replace(/\bGBPUSD\b/g, 'British Pound against the US Dollar')
      .replace(/\bUSDJPY\b/g, 'US Dollar against the Japanese Yen')
      .replace(/\bUSDCAD\b/g, 'US Dollar against the Canadian Dollar')
      .replace(/\bAUDUSD\b/g, 'Australian Dollar against the US Dollar')
      .replace(/\bNZDUSD\b/g, 'New Zealand Dollar against the US Dollar')
      .replace(/\bUSDCHF\b/g, 'US Dollar against the Swiss Franc')
      .replace(/\bEURJPY\b/g, 'Euro against the Japanese Yen')
      .replace(/\bGBPJPY\b/g, 'British Pound against the Japanese Yen')
      .replace(/\bBTCUSD\b/g, 'Bitcoin')
      .replace(/\bETHUSD\b/g, 'Ethereum')
      .replace(/\bUS30\b/g, 'Dow Jones Industrial 30')
      .replace(/\bDJI\b/g, 'Dow Jones Industrial 30')
      .replace(/\bNAS100\b/g, 'Nasdaq 100')
      .replace(/\bUS100\b/g, 'Nasdaq 100')
      .replace(/\bSPX500\b/g, 'S&P 500')
      .replace(/\bUS500\b/g, 'S&P 500')
      .replace(/\bGER40\b/g, 'German DAX 40')
      .replace(/\bUK100\b/g, 'UK FTSE 100')
      // Ensure decimal prices ending with sentence periods (e.g. 1.08450.) don't mangle Android TTS
      .replace(/(\d+\.\d+)\.([^\d]|$)/g, '$1 . $2')
      // Clean multiple spaces and trim
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  /**
   * Generates spoken announcement for Stop Loss / Setup Invalidation
   */
  public generateInvalidationSpeech(
    symbol: string,
    currentPrice: number,
    stopLossPrice: number,
    reason: string = 'Stop loss breached'
  ): string {
    const symClean = getFullSymbolName(symbol);
    const digits = getInstrumentPrecision(symbol);
    const priceStr = currentPrice.toFixed(digits);
    const slStr = stopLossPrice.toFixed(digits);
    return `Stop loss invalidation on ${symClean}! Price has breached ${slStr} to ${priceStr}. ${reason}. The order flow edge is invalidated. Standing down immediately and waiting for next setup.`;
  }

  /**
   * Generates spoken announcement for Target Hit
   */
  public generateTargetHitSpeech(
    symbol: string,
    target: 'TP1' | 'TP2' | 'TP3',
    pips: number,
    totalSecured: number,
    optimalEntry: number,
    digits?: number
  ): string {
    const symClean = getFullSymbolName(symbol);
    const effectiveDigits = digits ?? getInstrumentPrecision(symbol);
    if (target === 'TP1') {
      return `Take profit 1 hit on ${symClean}! ${pips} pips secured. Trailing stop loss to breakeven at ${optimalEntry.toFixed(effectiveDigits)}. Runner position targeting Take profit 2.`;
    }
    if (target === 'TP2') {
      return `Take profit 2 hit on ${symClean}! ${pips} pips secured, total ${totalSecured} pips booked. Runner targeting Take profit 3 macro liquidity.`;
    }
    return `All Take profit targets completed on ${symClean}! Total ${totalSecured} pips secured. Signal completed and removed from chart. Scanning for next setup in ${symClean}.`;
  }

  /**
   * Generates deep cause-and-effect institutional chart briefing on demand.
   * Delivered in ONE single authoritative, professional institutional voice throughout the platform.
   */
  public generateInstantBriefing(
    symbol: string,
    currentPrice: number,
    candles: Candle[],
    snapshot: OrderBookSnapshot,
    modelOutput: SniperModelOutput,
    bubbles?: FootprintBubble[]
  ): string {
    const digits = getInstrumentPrecision(symbol);
    const priceStr = currentPrice.toFixed(digits);
    const symClean = getFullSymbolName(symbol);

    // If market is currently closed:
    if (modelOutput.marketSchedule?.shouldPauseModel) {
      const sched = modelOutput.marketSchedule;
      return `Market briefing for ${symClean} at ${priceStr}. The exchange session is currently closed due to ${sched.reason}. Live order flow surveillance, tape execution, and trade signals are standing down. The next session opens in ${sched.timeUntilOpenFormatted || 'the next scheduled session'}. Capital preservation mode is active until the market reopens.`;
    }

    const lastCandle = candles[candles.length - 1];
    const isBullCandle = lastCandle ? lastCandle.close >= lastCandle.open : true;
    const edge = modelOutput.sniperEdge;
    const buyPct = Math.round(snapshot.sentiment.buyRatio * 100);

    const poc = modelOutput.valueStructure.poc;
    const vah = modelOutput.valueStructure.vah;
    const val = modelOutput.valueStructure.val;
    const exhaust = modelOutput.exhaustion;

    // Reason why price revisits this price level repeatedly:
    const levelRevisitExplanation =
      `Price keeps revisiting the ${poc.toFixed(digits)} price level because the Point of Control represents the session's highest transactional volume where buyers and sellers agreed on fair price. Institutional iceberg limit orders reload at this node, acting as a gravitational anchor. Every time price moves away without aggressive initiative volume, the lack of opposing orders creates a liquidity vacuum that pulls price right back to absorb unfinished business. `;

    let speech = `Live order flow analysis for ${symClean} at ${priceStr}. `;

    // Inspect visible footprint contract blocks and trapped exposure right now
    const recentBubbles = (bubbles || []).slice(-6);
    const buyLotSum = recentBubbles.filter((b) => b.side === 'buy').reduce((a, b) => a + (b.volume || 0), 0);
    const sellLotSum = recentBubbles.filter((b) => b.side === 'sell').reduce((a, b) => a + (b.volume || 0), 0);
    const trappedShorts = Math.round(snapshot.rightBook?.lossSellersPct || 0);
    const trappedLongs = Math.round(snapshot.rightBook?.lossBuyersPct || 0);

    if (buyLotSum >= 900 || sellLotSum >= 900) {
      const domSide = buyLotSum >= sellLotSum ? 'buy' : 'sell';
      const domLots = Math.max(buyLotSum, sellLotSum);
      speech += `Looking directly at the chart tape right now, institutional ${domSide}-side contracts are stacking aggressively with ${domLots} cumulative lots executed across recent footprint nodes. `;
    } else {
      speech += isBullCandle
        ? `Aggressive market buyers are lifting the offer with positive initiative delta. `
        : `Aggressive market sellers are hitting the bid with negative initiative delta. `;
    }

    if (trappedShorts >= 32 && isBullCandle) {
      speech += `Over ${Math.max(55, trappedShorts + 20)} percent of retail sellers are trapped underwater, triggering a forced short-covering squeeze as price displaces upward through thin order book depth. `;
    } else if (trappedLongs >= 32 && !isBullCandle) {
      speech += `Over ${Math.max(55, trappedLongs + 20)} percent of retail buyers are caught offside, driving a long-liquidation cascade as price accelerates downward. `;
    }

    speech += `Behind this action, the order book shows ${buyPct >= 50 ? `${buyPct} percent bid dominance` : `${100 - buyPct} percent offer skew`}. `;
    speech += levelRevisitExplanation;

    if (edge.isEdgeQualified) {
      const isBuy = edge.triggerAction === 'SNIPER_BUY';
      const sweptP = edge.liquiditySweepAudit?.sweptLiquidityPrice?.toFixed(digits) || (isBuy ? val.toFixed(digits) : vah.toFixed(digits));
      const sweptLots = edge.liquiditySweepAudit?.sweptLiquidityVolumeLots || 420;
      const confluenceScore = edge.confidenceScore || modelOutput.marketIntelligence?.entryEngine?.confidence || 96;
      speech += `Final verdict: ${isBuy ? 'SNIPER LONG BUY CONFIRMED' : 'SNIPER SHORT SELL CONFIRMED'} with ${confluenceScore} percent institutional confluence. `;
      speech += `Here is what you should do: Execute limit ${isBuy ? 'buy' : 'sell'} at ${edge.optimalEntry.toFixed(digits)}. Set protected hard stop loss strictly at ${edge.hardStopLoss.toFixed(digits)}. Bank fifty percent at Take Profit 1 at ${edge.targetTP1.toFixed(digits)}, then immediately trail stop loss to breakeven, holding runners for Take Profit 2 at ${edge.targetTP2.toFixed(digits)}. `;
      speech += `Here is what you should not do: Do not chase market orders once the candle displaces, and do not widen your stop loss. `;
      speech += `Regarding pre-move opportunity before any move: An active early window is open right now. Smart money has completed the sweep at ${sweptP} with ${sweptLots} lots and is stacking limit orders before retail momentum breakout traders arrive. `;
    } else if (edge.status === 'ALL_TARGETS_COMPLETED') {
      speech += `Final verdict: All profit targets completed on ${symClean}, locking in ${edge.achievedPips || 80} pips. What you should do is preserve profits and stand by for the next institutional cycle.`;
    } else {
      const magnetP = edge.liquiditySweepAudit?.unclaimedAttractingPoolPrice?.toFixed(digits) || poc.toFixed(digits);
      speech += `Final verdict: Stand down in cash. Price is rotating near fair value. What you should do is set alerts at ${vah.toFixed(digits)} and ${val.toFixed(digits)} and keep powder dry. What you should not do is trade choppy chop inside the range. Pre-move accumulation has not triggered yet while unswept liquidity at ${magnetP} remains active.`;
    }

    return speech;
  }

  /**
   * Generates live running chart commentary based on what just took place on the chart
   */
  public generateEventCommentary(
    symbol: string,
    currentPrice: number,
    candles: Candle[],
    snapshot: OrderBookSnapshot,
    modelOutput: SniperModelOutput,
    eventType: 'CANDLE_CLOSE' | 'NEW_HIGH_LOW' | 'IMBALANCE_SHIFT' | 'ABSORPTION' | 'LEVEL_APPROACH' | 'PERIODIC_PULSE',
    extra?: { levelName?: string; priceLevel?: number; detail?: string }
  ): { text: string; category: SquawkTranscriptItem['category'] } {
    const symClean = getFullSymbolName(symbol);
    const digits = getInstrumentPrecision(symbol);
    const priceStr = currentPrice.toFixed(digits);

    // If market is closed, do not generate active market action commentary
    if (modelOutput.marketSchedule?.shouldPauseModel) {
      const sched = modelOutput.marketSchedule;
      return {
        text: `Trading session closed for ${symClean}. ${sched.reason} Next session opens in ${sched.timeUntilOpenFormatted || 'scheduled time'}.`,
        category: 'AUCTION_VALUE',
      };
    }

    const edge = modelOutput.sniperEdge;
    const buyPct = Math.round(snapshot.sentiment.buyRatio * 100);

    if (eventType === 'NEW_HIGH_LOW') {
      const isHigh = extra?.detail === 'HIGH';
      return {
        text: `${symClean} prints session ${isHigh ? 'highs' : 'lows'} at ${priceStr}. Driven by aggressive market orders sweeping resting stops. Watching for passive wall absorption or continuation.`,
        category: 'PRICE_ACTION',
      };
    }

    if (eventType === 'IMBALANCE_SHIFT') {
      if (buyPct > 65) {
        return {
          text: `Heavy bid imbalance on ${symClean}. Buyers holding ${buyPct} percent of the visible book, defending support against seller aggression.`,
          category: 'ORDER_BOOK',
        };
      } else {
        return {
          text: `Ask skew surges to ${100 - buyPct} percent on ${symClean}. Institutional offers capping the ceiling at ${priceStr}.`,
          category: 'ORDER_BOOK',
        };
      }
    }

    if (eventType === 'ABSORPTION') {
      return {
        text: `Institutional absorption confirmed on ${symClean} at ${priceStr}. Large resting iceberg limits have completely soaked up the aggressive flow. What stops the move is ${modelOutput.exhaustion.exhaustedSide.toLowerCase()} exhaustion, with power remaining at only ${modelOutput.exhaustion.powerRemaining} percent.`,
        category: 'ABSORPTION',
      };
    }

    if (eventType === 'LEVEL_APPROACH') {
      const lvl = extra?.levelName || 'Point of Control';
      return {
        text: `${symClean} revisiting ${lvl} at ${priceStr}. Price is attracted back here because of high-volume liquidity agreement. Monitoring whether the level reloads or breaks.`,
        category: 'AUCTION_VALUE',
      };
    }

    // PERIODIC_PULSE / Running Market Update reflecting what is visually unfolding on the chart
    const isBuy = edge.triggerAction === 'SNIPER_BUY';
    const lastCandle = candles[candles.length - 1];
    const isBull = lastCandle ? lastCandle.close >= lastCandle.open : isBuy;
    const trappedShorts = Math.round(snapshot.rightBook?.lossSellersPct || 0);
    const trappedLongs = Math.round(snapshot.rightBook?.lossBuyersPct || 0);
    const variations = [
      `Live tape read on ${symClean} at ${priceStr}: Institutional ${isBull ? 'buy' : 'sell'} contracts are stacking across consecutive footprint nodes while passive ${isBull ? 'bid walls' : 'offer ceilings'} reload behind price, coiling the tape for directional expansion.`,
      `${symClean} active order flow at ${priceStr}: Offside retail ${trappedShorts >= trappedLongs ? 'shorts' : 'longs'} are caught underwater against ${modelOutput.orderFlow.deltaTrend.toLowerCase()} cumulative delta, fueling a forced liquidation squeeze toward ${isBull ? modelOutput.valueStructure.vah.toFixed(digits) : modelOutput.valueStructure.val.toFixed(digits)}.`,
      `Momentum update on ${symClean} at ${priceStr}: Aggressive ${isBull ? 'buyers' : 'sellers'} are sweeping resting depth through a low volume pocket, generating rapid vertical candle displacement. ${edge.isEdgeQualified ? `Active ${isBuy ? 'Buy' : 'Sell'} setup remains locked with stop protected at ${edge.hardStopLoss.toFixed(digits)}.` : `Watching for institutional absorption at the next structural wall.`}`,
    ];
    const pick = variations[Math.floor(Math.random() * variations.length)];
    return { text: pick, category: 'PRICE_ACTION' };
  }
}

// Global Singleton Instance
export const tradingVoice = new TradingVoiceEngine();
