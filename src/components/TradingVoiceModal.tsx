import React, { useState, useEffect } from 'react';
import {
  tradingVoice,
  TradingVoiceSettings,
  SquawkTranscriptItem,
} from '../services/tradingVoiceService';
import {
  Volume2,
  VolumeX,
  Mic,
  Radio,
  Play,
  Square,
  Check,
  X,
  FileText,
  Copy,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Flame,
  Activity,
  AlertTriangle,
  ShieldAlert,
  Zap,
  Target
} from 'lucide-react';
import { StructuredLiveAlert, AlertType } from '../services/structuredAlertService';

interface TradingVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSymbol: string;
  onInstantBriefing: () => void;
  liveAlerts?: StructuredLiveAlert[];
}

export const TradingVoiceModal: React.FC<TradingVoiceModalProps> = ({
  isOpen,
  onClose,
  currentSymbol,
  onInstantBriefing,
  liveAlerts = [],
}) => {
  const [settings, setSettings] = useState<TradingVoiceSettings>(tradingVoice.getSettings());
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(tradingVoice.isSpeaking());
  const [currentSpokenItem, setCurrentSpokenItem] = useState<SquawkTranscriptItem | null>(null);
  const [copiedAlertId, setCopiedAlertId] = useState<string | null>(null);
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);

  // Load available English voices
  useEffect(() => {
    const updateVoices = () => {
      const v = tradingVoice.getEnglishVoices();
      setAvailableVoices(v);
    };

    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Listen to engine speaking events
  useEffect(() => {
    const unsubVoice = tradingVoice.subscribe((speaking, item) => {
      setIsSpeaking(speaking);
      if (item) setCurrentSpokenItem(item);
    });

    return () => {
      unsubVoice();
    };
  }, []);

  if (!isOpen) return null;

  const handleUpdate = (partial: Partial<TradingVoiceSettings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    tradingVoice.updateSettings(partial);
  };

  const handleToggleMasterVoice = () => {
    const nextEnabled = !settings.enabled || settings.cadence === 'muted';
    handleUpdate({
      enabled: nextEnabled,
      cadence: nextEnabled ? 'continuous' : 'muted',
    });
    tradingVoice.unlockAudio();
    if (nextEnabled) {
      const symClean = currentSymbol === 'XAUUSD' ? 'Gold' : currentSymbol;
      tradingVoice.speak(`Master voice active. Leading continuous market commentary for ${symClean}.`, {
        priority: true,
        category: 'BRIEFING',
        symbol: currentSymbol,
      });
    } else {
      tradingVoice.cancelSpeech();
    }
  };

  const handleSpeakAlert = (alert: StructuredLiveAlert, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    tradingVoice.unlockAudio();
    const spokenMessage = alert.spokenText || `${alert.headline}. ${alert.summary}`;
    tradingVoice.speak(spokenMessage, {
      priority: true,
      category: 'STRUCTURED_ALERT',
      symbol: alert.symbol,
    });
  };

  const handleReadLatestAlert = () => {
    if (liveAlerts.length > 0) {
      handleSpeakAlert(liveAlerts[0]);
    } else {
      onInstantBriefing();
    }
  };

  const getAlertIcon = (type?: AlertType) => {
    switch (type) {
      case 'BUY_SETUP':
        return <span className="text-emerald-400 font-bold">🟢</span>;
      case 'SELL_SETUP':
        return <span className="text-red-400 font-bold">🔴</span>;
      case 'KEY_LEVEL_TAP':
        return <Target className="w-3.5 h-3.5 text-amber-400" />;
      case 'LARGE_TRADE':
        return <Flame className="w-3.5 h-3.5 text-orange-400" />;
      case 'ORDER_FLOW':
        return <Activity className="w-3.5 h-3.5 text-cyan-400" />;
      case 'NEWS':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />;
      case 'TRADE_UNDER_PRESSURE':
        return <ShieldAlert className="w-3.5 h-3.5 text-red-400 animate-pulse" />;
      case 'TAKE_PROFIT_CONTINUATION':
        return <Zap className="w-3.5 h-3.5 text-purple-400" />;
      case 'INVALIDATION':
        return <ShieldAlert className="w-3.5 h-3.5 text-red-500" />;
      case 'CAUTION':
      default:
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-xl bg-[#0b101b] border border-cyan-500/40 shadow-2xl shadow-cyan-950/50 text-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: One Master Voice Leader */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1b253b] bg-linear-to-r from-[#0a1324] via-[#0b101b] to-[#101b30] shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border ${
              isSpeaking 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 animate-pulse ring-1 ring-emerald-400/40' 
                : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
            }`}>
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  Master Voice · Market Audio Leader
                </h2>
                {isSpeaking ? (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/50 rounded-full animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    SPEAKING LIVE
                  </span>
                ) : settings.enabled && settings.cadence !== 'muted' ? (
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-600/40 rounded-full">
                    VOICE ACTIVE
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300 bg-amber-950/60 border border-amber-600/40 rounded-full">
                    MUTED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Single authoritative voice reading and addressing live continuous model alerts
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Speaking Broadcast Strip (if active) */}
        {isSpeaking && currentSpokenItem && (
          <div className="px-5 py-2.5 bg-emerald-950/70 border-b border-emerald-800/50 flex items-center justify-between gap-3 text-xs shrink-0 animate-fadeIn">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex items-center gap-0.5 text-emerald-400 shrink-0">
                <span className="inline-block w-1 h-3 bg-emerald-400 animate-pulse" />
                <span className="inline-block w-1 h-4 bg-emerald-400 animate-pulse delay-75" />
                <span className="inline-block w-1 h-2 bg-emerald-400 animate-pulse delay-150" />
                <span className="inline-block w-1 h-5 bg-emerald-400 animate-pulse delay-100" />
              </div>
              <p className="text-emerald-200 font-medium truncate italic text-xs">
                "{currentSpokenItem.text}"
              </p>
            </div>
            <button
              onClick={() => tradingVoice.cancelSpeech()}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-rose-300 bg-rose-950/70 border border-rose-600/50 rounded hover:bg-rose-900/90 transition-colors shrink-0 cursor-pointer"
            >
              <Square className="w-3 h-3 fill-rose-300" />
              Silence
            </button>
          </div>
        )}

        {/* Top Control Bar: Master Voice Toggle, Briefing & Voice Accent */}
        <div className="p-4 bg-[#0c1220] border-b border-[#1b253b] space-y-3 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={handleToggleMasterVoice}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer shadow-xs ${
                  settings.enabled && settings.cadence !== 'muted'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-black border border-emerald-400'
                    : 'bg-amber-600 hover:bg-amber-500 text-black border border-amber-500'
                }`}
              >
                {settings.enabled && settings.cadence !== 'muted' ? (
                  <>
                    <Volume2 className="w-4 h-4 fill-current" />
                    <span>Voice Squawk Active</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-4 h-4" />
                    <span>Unmute Master Voice</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  tradingVoice.unlockAudio();
                  onInstantBriefing();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-lg border border-emerald-500/40 shadow-xs transition-all cursor-pointer"
                title="Instant spoken English chart analysis"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Brief Current Chart</span>
              </button>
            </div>

            {/* Natural Voice Selector Dropdown */}
            {availableVoices.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400 font-mono text-[11px] hidden sm:inline">Voice Accent:</span>
                <select
                  value={settings.voiceURI}
                  onChange={(e) => handleUpdate({ voiceURI: e.target.value })}
                  className="bg-[#070b14] border border-[#1b253b] text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:border-cyan-400 outline-none cursor-pointer max-w-[220px] truncate"
                >
                  {availableVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Main Section: Continuous Model Agent Alerts (§20–§28) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between text-xs pb-1">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              Continuous Model Agent Alerts (§20–§28)
            </span>
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
              {liveAlerts.length} Active Alerts
            </span>
          </div>

          {liveAlerts.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-[#1b253b] rounded-xl text-slate-400 text-xs font-mono space-y-2">
              <p>Scanning the tape and order book in real-time.</p>
              <p className="text-[11px] text-slate-500">Continuous model alerts trigger automatically as order flow changes.</p>
            </div>
          ) : (
            liveAlerts.map((alert) => {
              const isExpanded = expandedAlertId === alert.id;
              const isCopied = copiedAlertId === alert.id;

              return (
                <div
                  key={alert.id}
                  className="p-3.5 rounded-xl border border-[#1b263d] bg-[#090f1d] hover:border-cyan-500/50 transition-all text-xs space-y-2.5 shadow-md"
                >
                  {/* Alert Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {getAlertIcon(alert.type)}
                      <span className="font-bold text-white uppercase tracking-wider text-[12px] truncate">
                        {alert.headline}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 shrink-0">
                        {alert.timeFormatted}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={(e) => handleSpeakAlert(alert, e)}
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-black bg-cyan-400 hover:bg-cyan-300 rounded shadow-xs cursor-pointer transition-all"
                        title="Master Voice reads and addresses this alert in clean spoken English"
                      >
                        <Volume2 className="w-3 h-3 fill-black" />
                        <span>Read & Address</span>
                      </button>

                      <button
                        onClick={() => {
                          if (navigator?.clipboard?.writeText) {
                            navigator.clipboard.writeText(alert.formattedText);
                            setCopiedAlertId(alert.id);
                            setTimeout(() => setCopiedAlertId(null), 1800);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-[#121d30] rounded border border-transparent hover:border-[#1a2942] cursor-pointer"
                        title="Copy alert markdown"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => setExpandedAlertId(isExpanded ? null : alert.id)}
                        className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
                        title="Toggle full details"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Clean Master Voice Spoken Briefing (Stripped of drawings & symbols) */}
                  <div className="p-2.5 rounded-lg bg-[#060a14] border border-[#162238] text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-cyan-400">
                      <Mic className="w-3 h-3" />
                      <span>MASTER VOICE SPOKEN BRIEFING:</span>
                    </div>
                    <p className="text-slate-200 leading-relaxed font-sans text-xs">
                      {alert.spokenText}
                    </p>
                  </div>

                  {/* Expandable Order Flow Markdown */}
                  {isExpanded && (
                    <div className="pt-2 border-t border-[#141d2e] animate-fadeIn">
                      <pre className="whitespace-pre-wrap text-slate-300 leading-relaxed text-[11px] font-mono max-h-[220px] overflow-y-auto scrollbar-thin select-text bg-[#050810] p-3 rounded-lg border border-[#141f32]">
                        {alert.formattedText}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#1b253b] bg-[#0a0f1d] shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Master Institutional Voice · One Authoritative Voice Throughout Model</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
