import React from 'react';
import { Play, Heart, Bookmark, Repeat, SkipForward, AlertTriangle, Trash2, Eye, ExternalLink } from 'lucide-react';
import { isClickbaitTrap } from '../services/recommendationEngine';

export function ReelFeedViewer({
  reels,
  onUpdateReel,
  onDeleteReel,
  isCustomMode
}) {
  return (
    <div className="bg-[#111827]/80 border border-slate-800/80 rounded-2xl p-4 shadow-lg backdrop-blur-sm flex flex-col h-full">
      {/* Feed Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-pink-500/10 border border-pink-500/30 flex items-center justify-center">
            <Play className="w-3 h-3 text-pink-400 fill-pink-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              Student Interaction Stream
            </h3>
            <span className="text-[11px] text-slate-400">
              Raw telemetry inputs & behavioral engagement signals
            </span>
          </div>
        </div>

        <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
          {reels.length} {reels.length === 1 ? 'Reel' : 'Reels'}
        </span>
      </div>

      {/* Reel List */}
      <div className="space-y-3 overflow-y-auto pr-1 flex-1 max-h-[750px]">
        {reels.map((reel, index) => {
          const isTrap = isClickbaitTrap(reel.title, reel.tags);
          const letter = String.fromCharCode(65 + index);

          // Watch percentage color
          let progressColor = "bg-emerald-500";
          let progressText = "text-emerald-400";
          if (reel.watchPercentage < 50) {
            progressColor = "bg-rose-500";
            progressText = "text-rose-400";
          } else if (reel.watchPercentage < 85) {
            progressColor = "bg-amber-500";
            progressText = "text-amber-400";
          }

          const engagementScore = Math.min(100, Math.max(0, Math.round(
            reel.watchPercentage * 0.4 +
            (reel.liked ? 20 : 0) +
            (reel.saved ? 25 : 0) +
            (reel.replayed ? 15 : 0) -
            (reel.skipped ? 30 : 0)
          )));
          const scoreColor = engagementScore >= 70 ? 'text-emerald-400 bg-emerald-500' : engagementScore >= 40 ? 'text-amber-400 bg-amber-500' : 'text-rose-400 bg-rose-500';
          const scoreLabel = engagementScore >= 70 ? 'High' : engagementScore >= 40 ? 'Medium' : 'Low';

          return (
            <div
              key={reel.id || index}
              className={`p-3.5 rounded-xl border transition-all ${
                isTrap
                  ? 'bg-rose-950/20 border-rose-800/40'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700/80'
              }`}
            >
              {/* Top Row: Index Badge, Title & Delete */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-start gap-2">
                  <span className="shrink-0 w-5 h-5 rounded-md bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[11px] font-mono font-bold flex items-center justify-center mt-0.5">
                    {letter}
                  </span>
                  <div>
                    <h4 className="text-xs font-medium text-slate-100 leading-snug">
                      "{reel.title}"
                    </h4>
                    {reel.reelUrl && (
                      <a
                        href={reel.reelUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-1 text-[10px] text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md font-mono transition-colors"
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                        <span>Watch Reel Source</span>
                      </a>
                    )}
                    {isTrap && (
                      <div className="inline-flex items-center gap-1 mt-1 text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md font-medium">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Hype/Clickbait Trap (Filtered by Quality Gate)</span>
                      </div>
                    )}
                  </div>
                </div>

                {isCustomMode && (
                  <button
                    onClick={() => onDeleteReel(reel.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                    title="Remove Reel"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mb-2.5 ml-7">
                {reel.tags.map((tag, tIdx) => (
                  <span
                    key={tIdx}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-800/90 text-slate-400 font-mono border border-slate-700/50"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Watch % Slider / Indicator */}
              <div className="ml-7 mb-2.5">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Eye className="w-3 h-3 text-slate-400" />
                    Watch Completion:
                  </span>
                  <span className={`font-mono font-bold ${progressText}`}>
                    {reel.watchPercentage}%
                  </span>
                </div>

                {isCustomMode ? (
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={reel.watchPercentage}
                    onChange={(e) =>
                      onUpdateReel(reel.id, { watchPercentage: Number(e.target.value) })
                    }
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                ) : (
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${progressColor} transition-all duration-500 rounded-full`}
                      style={{ width: `${reel.watchPercentage}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Behavioral Engagement Toggles */}
              <div className="ml-7 flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/60">
                {/* Liked */}
                <button
                  onClick={() => onUpdateReel(reel.id, { liked: !reel.liked })}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                    reel.liked
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-500/20'
                      : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:bg-slate-800'
                  }`}
                  title="Toggle Liked"
                >
                  <Heart className={`w-3 h-3 ${reel.liked ? 'fill-rose-400 text-rose-400' : ''}`} />
                  <span>Liked</span>
                </button>

                {/* Saved */}
                <button
                  onClick={() => onUpdateReel(reel.id, { saved: !reel.saved })}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                    reel.saved
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-sm shadow-indigo-500/20'
                      : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:bg-slate-800'
                  }`}
                  title="Toggle Saved"
                >
                  <Bookmark className={`w-3 h-3 ${reel.saved ? 'fill-indigo-400 text-indigo-400' : ''}`} />
                  <span>Saved</span>
                </button>

                {/* Replayed */}
                <button
                  onClick={() => onUpdateReel(reel.id, { replayed: !reel.replayed })}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                    reel.replayed
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                      : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:bg-slate-800'
                  }`}
                  title="Toggle Replayed"
                >
                  <Repeat className="w-3 h-3" />
                  <span>Replayed</span>
                </button>

                {/* Skipped */}
                <button
                  onClick={() => onUpdateReel(reel.id, { skipped: !reel.skipped })}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                    reel.skipped
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/20'
                      : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:bg-slate-800'
                  }`}
                  title="Toggle Skipped"
                >
                  <SkipForward className="w-3 h-3" />
                  <span>Skipped</span>
                </button>
              </div>

              {/* Engagement Score Bar */}
              <div className="ml-7 mt-2 flex items-center gap-2">
                <span className="text-[10px] text-slate-500 shrink-0">Engagement:</span>
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${scoreColor.split(' ')[1]} transition-all duration-500 rounded-full`}
                    style={{ width: `${engagementScore}%` }}
                  />
                </div>
                <span className={`text-[10px] font-bold font-mono ${scoreColor.split(' ')[0]}`}>
                  {engagementScore}
                </span>
                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${scoreColor.split(' ')[0]} bg-opacity-10 border border-current/20`}>
                  {scoreLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
