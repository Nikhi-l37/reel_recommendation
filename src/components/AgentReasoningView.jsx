import React from 'react';
import { Activity, Layers, ShieldAlert, Gauge, Sparkles, Brain, Zap } from 'lucide-react';

const PIPELINE_STEPS = [
  {
    icon: Activity,
    label: "Telemetry Ingestion",
    step: "01",
    description: "Parsing watch %, likes, saves, replays, and skip signals",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10 border-cyan-500/20",
    activeGlow: "shadow-cyan-500/30 border-cyan-400/60 bg-cyan-500/15"
  },
  {
    icon: Layers,
    label: "Deep Intent Clustering",
    step: "02",
    description: "Grouping reels by theme and emotional relationship",
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/10 border-indigo-500/20",
    activeGlow: "shadow-indigo-500/30 border-indigo-400/60 bg-indigo-500/15"
  },
  {
    icon: ShieldAlert,
    label: "Trap Filter Quality Gate",
    step: "03",
    description: "Detecting clickbait, hype content, and shallow listicles",
    color: "text-rose-400",
    bgColor: "bg-rose-500/10 border-rose-500/20",
    activeGlow: "shadow-rose-500/30 border-rose-400/60 bg-rose-500/15"
  },
  {
    icon: Gauge,
    label: "Calibration & Confidence",
    step: "04",
    description: "Scoring difficulty level and inference confidence",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10 border-amber-500/20",
    activeGlow: "shadow-amber-500/30 border-amber-400/60 bg-amber-500/15"
  },
  {
    icon: Sparkles,
    label: "Targeted Recommendation",
    step: "05",
    description: "Matching deep interests to curated tech reel pool",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10 border-emerald-500/20",
    activeGlow: "shadow-emerald-500/30 border-emerald-400/60 bg-emerald-500/15"
  }
];

export function AgentReasoningView({ isAnalyzing, pipelineStep = -1, useAI = false }) {
  return (
    <div className="bg-[#111827]/60 border border-slate-800/80 rounded-2xl p-4 shadow-lg backdrop-blur-sm">
      {/* Pipeline Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {useAI ? (
            <Brain className="w-4 h-4 text-emerald-400" />
          ) : (
            <Zap className="w-4 h-4 text-amber-400" />
          )}
          <h3 className="text-sm font-semibold text-white">
            Agent Reasoning Pipeline
          </h3>
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
            useAI
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
          }`}>
            {useAI ? '✦ Gemini AI Engine' : '⚡ Heuristic Engine'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isAnalyzing && (
            <span className="text-[10px] text-indigo-300 font-mono animate-pulse">
              Processing...
            </span>
          )}
          <span className="text-[10px] text-slate-500 font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
            5-Stage Behavioral Engine
          </span>
        </div>
      </div>

      {/* Pipeline Steps */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
        {PIPELINE_STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isActive = pipelineStep === idx;
          const isComplete = pipelineStep > idx;
          const isPending = pipelineStep < idx;

          let cardClass = `p-3 rounded-xl border transition-all duration-500 `;
          if (isActive && isAnalyzing) {
            cardClass += `${step.activeGlow} shadow-lg scale-[1.02] ring-1 ring-white/10`;
          } else if (isComplete) {
            cardClass += `${step.bgColor} opacity-100`;
          } else if (isPending && isAnalyzing) {
            cardClass += `bg-slate-900/40 border-slate-800/50 opacity-40`;
          } else {
            cardClass += `${step.bgColor} opacity-80 hover:opacity-100`;
          }

          return (
            <div key={idx} className={cardClass}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="relative">
                  <Icon className={`w-4 h-4 ${step.color} ${isActive && isAnalyzing ? 'animate-pulse' : ''}`} />
                  {isActive && isAnalyzing && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-white animate-ping" />
                  )}
                  {isComplete && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400" />
                  )}
                </div>
                <span className="text-[10px] font-mono text-slate-500">{step.step}</span>
              </div>
              <h4 className={`text-[11px] font-semibold leading-tight ${isActive || isComplete ? 'text-white' : 'text-slate-300'}`}>
                {step.label}
              </h4>
              <p className="text-[9px] text-slate-500 mt-1 leading-snug hidden sm:block">
                {step.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
