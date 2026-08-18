import React, { useState } from 'react';
import { Target, ArrowRight, Award, ShieldAlert, Sparkles, CheckCircle2, Copy, Check, PlusCircle } from 'lucide-react';

export function RecommendationCard({ analysis, index, onAccept }) {
  const letter = String.fromCharCode(65 + index);
  const [copied, setCopied] = useState(false);

  // Category badge colors
  const categoryColors = {
    DSA: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    AI: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
    HLD: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    Cybersecurity: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    Cloud: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    Hardware: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    Career: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    Other: "bg-teal-500/15 text-teal-300 border-teal-500/30"
  };

  // Difficulty badge colors
  const difficultyColors = {
    Beginner: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    Intermediate: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    Advanced: "bg-rose-500/10 text-rose-400 border-rose-500/30"
  };

  // Confidence badge colors
  const confidenceColors = {
    High: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
    Medium: "bg-amber-500/15 text-amber-300 border-amber-500/40",
    Low: "bg-slate-700 text-slate-300 border-slate-600"
  };

  // Copy structured output to clipboard
  const handleCopy = async () => {
    const output = `CURRENT REEL: ${analysis.currentReel}
INTEREST DETECTED: ${analysis.interestDetected}
WHY: ${analysis.why}
RECOMMENDED TECH REEL: ${analysis.recommendedReel}
CATEGORY: ${analysis.category}
WHY THIS RECOMMENDATION: ${analysis.whyThisRecommendation}
DIFFICULTY: ${analysis.difficulty}
CONFIDENCE: ${analysis.confidence}${analysis.trapDetected ? '\nTRAP DETECTED: Yes — Clickbait/hype content filtered' : ''}`;

    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Copy failed:", e);
    }
  };

  return (
    <div className="bg-[#111827]/90 border border-slate-800 hover:border-slate-700/90 rounded-2xl p-5 shadow-xl transition-all relative overflow-hidden group">
      {/* Top Bar: Input Reel Reference & Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-bold flex items-center justify-center">
            {letter}
          </span>
          <span className="text-xs font-semibold text-slate-300">
            CURRENT REEL:
          </span>
          <span className="text-xs text-white font-medium italic">
            "{analysis.currentReel}"
          </span>
        </div>

        {/* Badges: Category, Difficulty, Confidence, Copy */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
            categoryColors[analysis.category] || categoryColors.Other
          }`}>
            {analysis.category}
          </span>

          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
            difficultyColors[analysis.difficulty] || difficultyColors.Beginner
          }`}>
            {analysis.difficulty}
          </span>

          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${
            confidenceColors[analysis.confidence] || confidenceColors.Medium
          }`}>
            <Award className="w-3 h-3" />
            <span>Confidence: {analysis.confidence}</span>
          </span>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className={`text-[11px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 transition-all ${
              copied
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-700/50 text-slate-400 border-slate-600 hover:text-white hover:border-slate-500'
            }`}
            title="Copy structured output to clipboard"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Trap Detected Banner if applicable */}
      {analysis.trapDetected && (
        <div className="mb-4 p-2.5 rounded-xl bg-rose-950/30 border border-rose-800/50 flex items-center gap-2 text-xs text-rose-300">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span>
            <strong>Trap Avoidance Active:</strong> Clickbait / shallow hype detected in input. Recommendation replaces viral bait with substantive core concepts.
          </span>
        </div>
      )}

      {/* Grid: Inferred Interest & Behavioral Evidence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Box 1: Inferred Real Interest */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/90">
          <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
            <Target className="w-3.5 h-3.5" />
            <span>Interest Detected (Deep Intent)</span>
          </div>
          <p className="text-xs font-medium text-slate-100 leading-relaxed">
            {analysis.interestDetected}
          </p>
        </div>

        {/* Box 2: Behavioral Evidence */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/90">
          <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Behavioral Evidence (Why)</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {analysis.why}
          </p>
        </div>
      </div>

      {/* Recommendation Highlight Box */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/50 via-slate-900/80 to-slate-900 border border-indigo-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider">
                Recommended Tech Reel
              </span>
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                {analysis.recommendedReel}
              </h4>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-indigo-950/80 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-300">
            <span className="font-semibold text-slate-200">Why this recommendation: </span>
            <span className="text-slate-300">{analysis.whyThisRecommendation}</span>
          </div>
          {onAccept && (
            <button
              onClick={() => onAccept(analysis)}
              className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition-all hover:border-emerald-400/50"
              title="Add this reel to watch history and re-analyze"
            >
              <PlusCircle className="w-3 h-3" />
              <span>Add to Feed</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
