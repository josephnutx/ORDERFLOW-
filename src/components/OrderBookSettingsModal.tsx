import React from 'react';
import { X, Sliders, Palette, Eye, BarChart, Clock, Layers } from 'lucide-react';
import { OrderBookSettings, OrderBookLayout, FilterMode, ColorTheme } from '../types/orderbook';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: OrderBookSettings;
  onUpdateSettings: (newSettings: Partial<OrderBookSettings>) => void;
}

export const OrderBookSettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0c121e] border border-[#1e2a44] rounded-lg shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[#1b253b] bg-[#0e1626]">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
              OrderBook Indicator Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-[#1b253b] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-3 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 text-xs">
          {/* 1. Layout Mode */}
          <div>
            <label className="font-bold text-slate-300 block mb-2 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>OrderBook Layout</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { id: 'classic_two_sided', label: 'Classic Two-Sided', desc: 'Orders & Positions dual histogram on chart' },
                { id: 'classic_one_sided', label: 'Classic One-Sided', desc: 'Single panel with quick toggle tab' },
                { id: 'simplified_two_sided', label: 'Simplified Two-Sided', desc: 'Streamlined bars with minimal labels' },
                { id: 'simplified_one_sided', label: 'Simplified One-Sided', desc: 'Compact single book view' },
              ].map((layout) => (
                <button
                  key={layout.id}
                  onClick={() => onUpdateSettings({ layout: layout.id as OrderBookLayout })}
                  className={`p-3 rounded border text-left transition-colors ${
                    settings.layout === layout.id
                      ? 'bg-cyan-950/40 border-cyan-500/60 text-white shadow-xs'
                      : 'bg-[#0f1626] border-[#182338] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold text-xs text-white">{layout.label}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{layout.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. OrderBook Depth & Visual Scale */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 rounded bg-[#0f1626] border border-[#182338]">
              <label className="font-bold text-slate-300 block mb-1">
                OrderBook Depth ({settings.depth} levels)
              </label>
              <p className="text-[11px] text-slate-400 mb-2">
                Sets the number of horizontal price bars rendered above and below market price.
              </p>
              <input
                type="range"
                min="20"
                max="60"
                step="4"
                value={settings.depth}
                onChange={(e) => onUpdateSettings({ depth: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>20 levels</span>
                <span>36 levels</span>
                <span>60 levels</span>
              </div>
            </div>

            <div className="p-3.5 rounded bg-[#0f1626] border border-[#182338]">
              <label className="font-bold text-slate-300 block mb-1">
                Fast Rewind Speed ({settings.fastRewindSpeed} snapshots/step)
              </label>
              <p className="text-[11px] text-slate-400 mb-2">
                Speed step when stepping through the historical snapshots timeline.
              </p>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={settings.fastRewindSpeed}
                onChange={(e) => onUpdateSettings({ fastRewindSpeed: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>1 snap</span>
                <span>3 snaps</span>
                <span>5 snaps</span>
              </div>
            </div>
          </div>

          {/* 3. Filter Default & Overlays */}
          <div>
            <label className="font-bold text-slate-300 block mb-2 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-cyan-400" />
              <span>Display Filters & Chart Overlays</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded bg-[#0f1626] border border-[#182338] flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">Default Filter Mode</div>
                  <div className="text-[11px] text-slate-400">Cumulative (ALL) vs Net Difference (NET)</div>
                </div>
                <div className="flex items-center gap-1 bg-[#090d16] p-0.5 rounded border border-[#1e2a44]">
                  <button
                    onClick={() => onUpdateSettings({ filterMode: 'ALL' })}
                    className={`px-2.5 py-1 rounded text-xs font-bold ${
                      settings.filterMode === 'ALL' ? 'bg-[#1e2a44] text-emerald-400' : 'text-slate-400'
                    }`}
                  >
                    ALL
                  </button>
                  <button
                    onClick={() => onUpdateSettings({ filterMode: 'NET' })}
                    className={`px-2.5 py-1 rounded text-xs font-bold ${
                      settings.filterMode === 'NET' ? 'bg-[#1e2a44] text-cyan-300' : 'text-slate-400'
                    }`}
                  >
                    NET
                  </button>
                </div>
              </div>

              <div className="p-3 rounded bg-[#0f1626] border border-[#182338] flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">Footprint Executed Bubbles</div>
                  <div className="text-[11px] text-slate-400">Show large executed order bubbles on chart (fab.png)</div>
                </div>
                <button
                  onClick={() => onUpdateSettings({ showFootprintBubbles: !settings.showFootprintBubbles })}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                    settings.showFootprintBubbles ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      settings.showFootprintBubbles ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="p-3 rounded bg-[#0f1626] border border-[#182338] flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">Red Snapshot Cross Mark</div>
                  <div className="text-[11px] text-slate-400">Cross mark indicates snapshot price & candle on chart</div>
                </div>
                <button
                  onClick={() => onUpdateSettings({ showCandleCrossMark: !settings.showCandleCrossMark })}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                    settings.showCandleCrossMark ? 'bg-red-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      settings.showCandleCrossMark ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="p-3 rounded bg-[#0f1626] border border-[#182338] flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">Scale on Chart</div>
                  <div className="text-[11px] text-slate-400">Displays vertical volume ruler markers</div>
                </div>
                <button
                  onClick={() => onUpdateSettings({ showScaleOnChart: !settings.showScaleOnChart })}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                    settings.showScaleOnChart ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      settings.showScaleOnChart ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* 4. Color Scheme */}
          <div>
            <label className="font-bold text-slate-300 block mb-2 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-cyan-400" />
              <span>Color Scheme</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { id: 'fxssi_classic', name: 'FXSSI Navy/Amber' },
                { id: 'cyber_dark', name: 'Cyber Charcoal' },
                { id: 'matrix_neon', name: 'Matrix Terminal' },
                { id: 'high_contrast', name: 'High Contrast' },
              ].map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => onUpdateSettings({ colorScheme: theme.id as ColorTheme })}
                  className={`p-2.5 rounded border text-center font-medium ${
                    settings.colorScheme === theme.id
                      ? 'bg-cyan-950/40 border-cyan-500 text-cyan-300 font-bold'
                      : 'bg-[#0f1626] border-[#182338] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {theme.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#1b253b] bg-[#0e1626] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-cyan-600 text-white font-medium hover:bg-cyan-500 transition-colors"
          >
            Apply & Save
          </button>
        </div>
      </div>
    </div>
  );
};
