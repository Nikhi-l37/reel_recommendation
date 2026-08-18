import React from 'react';
import { UserCheck, SlidersHorizontal, PlusCircle } from 'lucide-react';

export function ProfileSelector({
  profiles,
  activeProfileId,
  onSelectProfile,
  isCustomMode,
  onToggleCustomMode,
  onOpenAddReel
}) {
  return (
    <div className="bg-[#111827]/80 border border-slate-800/80 rounded-2xl p-4 shadow-lg backdrop-blur-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Select Student Persona
            </h2>
            <span className="text-xs text-slate-400">
              (6 Preset Test Scenarios + Sandbox)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Switch between real-world student watch histories to test behavioral inference vs keyword matching.
          </p>
        </div>

        {/* Custom Actions */}
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <button
            onClick={onToggleCustomMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              isCustomMode
                ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 shadow-md shadow-indigo-500/20'
                : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{isCustomMode ? 'Custom Sandbox (Active)' : 'Custom Sandbox'}</span>
          </button>

          {isCustomMode && (
            <button
              onClick={onOpenAddReel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30 transition-all shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Reel</span>
            </button>
          )}
        </div>
      </div>

      {/* Profile Pills Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {profiles.map((p) => {
          const isSelected = !isCustomMode && activeProfileId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelectProfile(p.id)}
              className={`flex flex-col items-start text-left p-2.5 rounded-xl border transition-all relative overflow-hidden group ${
                isSelected
                  ? 'bg-gradient-to-b from-indigo-950/70 to-slate-900 border-indigo-500/80 shadow-md shadow-indigo-500/20 ring-1 ring-indigo-500/50'
                  : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-xl">{p.avatar}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                  isSelected ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-400'
                }`}>
                  {p.reels.length} Reels
                </span>
              </div>
              <span className={`text-xs font-medium line-clamp-1 ${
                isSelected ? 'text-white font-semibold' : 'text-slate-200'
              }`}>
                {p.name}
              </span>
              <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                {p.tagline}
              </span>
              {isSelected && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-cyan-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
