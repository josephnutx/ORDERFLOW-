// Synthesized audio alerts and voice speech synthesis for target hits, stop loss invalidation & market alerts

import { tradingVoice } from './tradingVoiceService';

let audioCtx: AudioContext | null = null;
let lastSoundPlayedAt = 0;

export function unlockAudio() {
  if (typeof window === 'undefined') return;
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    if ('speechSynthesis' in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  } catch {
    // Ignore
  }
}

// Auto-unlock on first user interaction in browser
if (typeof window !== 'undefined') {
  const handleFirstInteraction = () => {
    unlockAudio();
    window.removeEventListener('click', handleFirstInteraction);
    window.removeEventListener('keydown', handleFirstInteraction);
    window.removeEventListener('touchstart', handleFirstInteraction);
  };
  window.addEventListener('click', handleFirstInteraction, { passive: true });
  window.addEventListener('keydown', handleFirstInteraction, { passive: true });
  window.addEventListener('touchstart', handleFirstInteraction, { passive: true });
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export function playTargetHitSound(target: 'TP1' | 'TP2' | 'TP3' | 'ALL_COMPLETE' | 'NEW_SIGNAL' | 'INVALIDATION' | 'ALERT') {
  try {
    const nowMs = Date.now();
    // Prevent audio chimes from colliding or spamming (at least 8 seconds between chimes)
    if (nowMs - lastSoundPlayedAt < 8000) {
      return;
    }
    lastSoundPlayedAt = nowMs;

    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (target === 'TP1') {
      // Crisp pleasant double-chime
      playTone(ctx, 587.33, now, 0.14, 'sine'); // D5
      playTone(ctx, 880.00, now + 0.12, 0.28, 'sine'); // A5
    } else if (target === 'TP2') {
      // Energetic triple-chime
      playTone(ctx, 523.25, now, 0.12, 'sine'); // C5
      playTone(ctx, 659.25, now + 0.10, 0.12, 'sine'); // E5
      playTone(ctx, 1046.50, now + 0.20, 0.35, 'sine'); // C6
    } else if (target === 'TP3' || target === 'ALL_COMPLETE') {
      // Grand celebratory fanfare chord
      playTone(ctx, 523.25, now, 0.15, 'sine'); // C5
      playTone(ctx, 659.25, now + 0.08, 0.15, 'sine'); // E5
      playTone(ctx, 783.99, now + 0.16, 0.18, 'sine'); // G5
      playTone(ctx, 1046.50, now + 0.24, 0.55, 'triangle'); // C6
    } else if (target === 'NEW_SIGNAL') {
      // Radar alert sonar ping
      playTone(ctx, 440.00, now, 0.08, 'sine');
      playTone(ctx, 880.00, now + 0.07, 0.22, 'sine');
    } else if (target === 'INVALIDATION') {
      // Serious descending warning tone
      playTone(ctx, 440.00, now, 0.14, 'sawtooth'); // A4
      playTone(ctx, 311.13, now + 0.12, 0.32, 'sawtooth'); // Eb4
    } else if (target === 'ALERT') {
      // Subtle double attention pip
      playTone(ctx, 659.25, now, 0.08, 'sine'); // E5
      playTone(ctx, 880.00, now + 0.07, 0.16, 'sine'); // A5
    }
  } catch {
    // Non-blocking if audio permissions restricted
  }
}

function playTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  type: OscillatorType = 'sine'
) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.25, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  } catch {
    // Ignore errors
  }
}

// Voice Speech Synthesis (Non-colliding: waits or skips if already speaking rather than cutting off mid-sentence)
export function speakAnnouncement(text: string, enabled: boolean = true) {
  if (!enabled) return;
  unlockAudio();
  tradingVoice.speak(text, { priority: false, category: 'TP_TARGET', cooldownMs: 30000 });
}
