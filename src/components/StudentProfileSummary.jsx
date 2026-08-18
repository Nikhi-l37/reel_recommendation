import React from 'react';
import { User, Compass, AlertOctagon, ListOrdered, CheckCircle, ArrowRight } from 'lucide-react';

export function StudentProfileSummary({ summary, profileName, aiPowered = false }) {
  if (!summary) return null;

  return (
    <div className="bg-gradient-to-br from-[#131B2E] via-[#101726] to-[#0D131F] border border-indigo-500/40 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-800 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 p-[1px] flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-[#0E1526] rounded-[11px] flex items-center justify-center">
              <User className="w-5 h-5 text-indigo-300" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                STUDENT PROFILE SUMMARY
              </h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Synthesis
              </span>
              {aiPowered && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                  ✦ AI-Powered
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Aggregated behavioral intent across all interactions
            </p>
          </div>
        </div>

        {/* Skill Level Badge */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-3.5 py-2 rounded-xl">
          <span className="text-xs text-slate-400">Skill Level:</span>
          <span className="text-xs font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-0.5 rounded-lg">
            {summary.skillLevel}
          </span>
        </div>
      </div>

      {/* Top 2 Synthesis Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5 relative z-10">
        {/* Core Interest Cluster */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Compass className="w-4 h-4" />
            <span>Core Interest Cluster</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-medium">
            {summary.coreCluster}
          </p>
        </div>

        {/* Content Blind Spots */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-amber-900/30 hover:border-amber-700/50 transition-all">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <AlertOctagon className="w-4 h-4" />
            <span>Content Blind Spots (Unexplored Essentials)</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {summary.blindSpots}
          </p>
        </div>
      </div>

      {/* Priority Watchlist Deck */}
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <ListOrdered className="w-4 h-4 text-emerald-400" />
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Next 3 Reels to Watch (Priority Order)
          </h4>
        </div>

        <div className="space-y-2.5">
          {summary.priorityReels.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
            >
              <div className="flex items-start sm:items-center gap-3">
                <span className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold font-mono flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <div>
                  <h5 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                    {item.reel}
                  </h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {item.reason}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium shrink-0 self-end sm:self-center">
                <span>High Leverage</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
