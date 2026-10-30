import React from 'react';
import { X, BookOpen, ArrowUpRight, ArrowDownRight, Users, ShieldAlert, Sparkles } from 'lucide-react';

interface CrowdBehaviorGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CrowdBehaviorGuide: React.FC<CrowdBehaviorGuideProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#0c121e] border border-[#1e2a44] rounded-lg shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[#1b253b] bg-[#0e1626]">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-amber-400 shrink-0" />
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
              OrderBook Indicator Analysis Guide & Crowd Psychology
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-[#1b253b] transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 text-xs text-slate-300">
          {/* Core Philosophy */}
          <div className="p-4 rounded-lg bg-[#0f1728] border border-[#1d2b45]">
            <h3 className="font-bold text-white text-sm mb-1 flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>What Kind of Data Does the Indicator Show?</span>
            </h3>
            <p className="text-slate-300 leading-relaxed">
              The OrderBook is the visual representation of retail trading activity: open trades, pending orders, and Stop orders.
              At each price level, trades are summed up into a two-sided histogram. Market analysis comes down to searching for abnormal clusters and understanding <strong>who is trapped and who might be manipulating whom</strong>.
            </p>
          </div>

          {/* Quadrants Structure */}
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-3">
              The Two-Sided OrderBook Quadrants
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Book: Pending Orders */}
              <div className="p-3.5 rounded bg-[#0b101c] border border-cyan-500/30">
                <div className="font-bold text-cyan-400 text-xs mb-2">
                  LEFT-SIDE ORDER BOOK: PENDING ORDERS
                </div>
                <div className="space-y-2">
                  <div className="p-2 rounded bg-[#131b2c] border-l-2 border-amber-500">
                    <strong className="text-amber-400">Upper Left: Sell Limit</strong>
                    <p className="text-[11px] text-slate-400">Take profits of buyers & entry limit orders of sellers.</p>
                  </div>
                  <div className="p-2 rounded bg-[#131b2c] border-l-2 border-cyan-400">
                    <strong className="text-cyan-400">Upper Right: Buy Stop</strong>
                    <p className="text-[11px] text-slate-400">Stop losses of sellers & breakout orders of buyers. Acts as an upside price magnet.</p>
                  </div>
                  <div className="p-2 rounded bg-[#131b2c] border-l-2 border-cyan-400">
                    <strong className="text-cyan-400">Lower Left: Sell Stop</strong>
                    <p className="text-[11px] text-slate-400">Stop losses of buyers & breakdown orders of sellers. Acts as a downside price magnet.</p>
                  </div>
                  <div className="p-2 rounded bg-[#131b2c] border-l-2 border-amber-500">
                    <strong className="text-amber-400">Lower Right: Buy Limit</strong>
                    <p className="text-[11px] text-slate-400">Take profits of sellers & entry limit orders of buyers. Acts as natural support wall.</p>
                  </div>
                </div>
              </div>

              {/* Right Book: Open Positions */}
              <div className="p-3.5 rounded bg-[#0b101c] border border-amber-500/30">
                <div className="font-bold text-amber-400 text-xs mb-2">
                  RIGHT-SIDE ORDER BOOK: OPEN TRADES
                </div>
                <div className="space-y-2">
                  <div className="p-2 rounded bg-[#131b2c] border-l-2 border-amber-500">
                    <strong className="text-amber-400">Upper Left: Profit Sellers</strong>
                    <p className="text-[11px] text-slate-400">Traders who shorted higher and are currently in profit.</p>
                  </div>
                  <div className="p-2 rounded bg-[#131b2c] border-l-2 border-cyan-400">
                    <strong className="text-cyan-400">Upper Right: Loss Buyers (Trapped)</strong>
                    <p className="text-[11px] text-slate-400">Retail buyers who bought at high prices and are suffering loss. Their pain pushes price down.</p>
                  </div>
                  <div className="p-2 rounded bg-[#131b2c] border-l-2 border-cyan-400">
                    <strong className="text-cyan-400">Lower Left: Loss Sellers (Trapped)</strong>
                    <p className="text-[11px] text-slate-400">Retail sellers who shorted the bottom and are trapped. When squeezed, they fuel violent upward rallies.</p>
                  </div>
                  <div className="p-2 rounded bg-[#131b2c] border-l-2 border-amber-500">
                    <strong className="text-amber-400">Lower Right: Profit Buyers</strong>
                    <p className="text-[11px] text-slate-400">Traders who bought lower and are sitting on unrealized profit.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trading Rules: Buy vs Sell */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-500/40">
              <div className="flex items-center gap-2 text-emerald-400 font-bold mb-2 text-xs">
                <ArrowUpRight className="w-4 h-4" />
                <span>FOR BUY TRADES (LONG SCENARIOS)</span>
              </div>
              <ul className="space-y-2 list-disc pl-4 text-[11px] text-slate-300">
                <li><strong>Clusters of buyers' Stop Losses attract price:</strong> Market seeks pool of liquidity before reversing upwards.</li>
                <li><strong>Dominant winning sellers pull price up:</strong> Winning shorts begin closing and banking profit, generating buy pressure.</li>
                <li><strong>Clusters of Buy Limit orders act as support:</strong> Passive bids absorb downward aggressive selling.</li>
                <li><strong>Dominant losing sellers push price up:</strong> Trapped shorts get liquidated or panic buy to exit.</li>
              </ul>
            </div>

            <div className="p-4 rounded-lg bg-red-950/20 border border-red-500/40">
              <div className="flex items-center gap-2 text-red-400 font-bold mb-2 text-xs">
                <ArrowDownRight className="w-4 h-4" />
                <span>FOR SELL TRADES (SHORT SCENARIOS)</span>
              </div>
              <ul className="space-y-2 list-disc pl-4 text-[11px] text-slate-300">
                <li><strong>Clusters of sellers' Stop Losses attract price:</strong> Price spikes upwards into Buy Stops to fill institutional short orders.</li>
                <li><strong>Dominant winning buyers pull price down:</strong> Winning longs begin taking profit, generating selling pressure.</li>
                <li><strong>Clusters of Sell Limit orders act as resistance:</strong> Passive asks cap upside expansion.</li>
                <li><strong>Dominant losing buyers push price down:</strong> Trapped longs hold losing positions until forced margin liquidation cascades lower.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#1b253b] bg-[#0e1626] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#1e2a44] text-white hover:bg-[#28385a] transition-colors font-medium"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
