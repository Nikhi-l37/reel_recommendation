import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Brain, ShieldAlert, Target, Layers, Gauge, Sparkles, Filter, Weight, Copy, Check, ArrowLeft } from 'lucide-react';
import { SYSTEM_PROMPT_TEXT } from '../services/recommendationEngine';

export function PromptPage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(SYSTEM_PROMPT_TEXT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const rules = [
    {
      id: 1,
      title: "Deep Interest Inference",
      description: "Do NOT match keywords. A student watching a Java meme + coding interview joke + software engineer lifestyle Reel is NOT interested in \"Java.\" They are interested in \"software engineering as a career path.\" Think one level deeper always.",
      icon: <Brain className="w-6 h-6 text-indigo-400" />,
      color: "bg-indigo-500/10 border-indigo-500/30",
      titleColor: "text-indigo-400"
    },
    {
      id: 2,
      title: "Cluster Signals by Theme",
      description: "Group Reels by theme, not topic. Ask: what is the student's emotional relationship with this content? (aspiring? curious? frustrated? entertained?)",
      icon: <Layers className="w-6 h-6 text-cyan-400" />,
      color: "bg-cyan-500/10 border-cyan-500/30",
      titleColor: "text-cyan-400"
    },
    {
      id: 3,
      title: "Trap Avoidance (CRITICAL)",
      description: "Never recommend hype listicles, clickbait career advice, or zero-skill content. If a recommendation feels like a YouTube thumbnail bait, reject it and pick something better.",
      icon: <ShieldAlert className="w-6 h-6 text-rose-400" />,
      color: "bg-rose-500/10 border-rose-500/30",
      titleColor: "text-rose-400"
    },
    {
      id: 4,
      title: "Difficulty Calibration",
      description: "Infer the student's level from what they engage with. Memes + lifestyle = beginner/aspiring. Actual coding Reels + DSA = intermediate. Architecture/system design = advanced.",
      icon: <Gauge className="w-6 h-6 text-amber-400" />,
      color: "bg-amber-500/10 border-amber-500/30",
      titleColor: "text-amber-400"
    },
    {
      id: 5,
      title: "Confidence Scoring",
      description: "Be honest. If you only have 1-2 weak signals, say Low confidence. Don't fake certainty.",
      icon: <Target className="w-6 h-6 text-emerald-400" />,
      color: "bg-emerald-500/10 border-emerald-500/30",
      titleColor: "text-emerald-400"
    },
    {
      id: 6,
      title: "Cross-Reel Clustering",
      description: "Look at ALL reels together. Find the underlying pattern across the full watch history. A student who watches gaming setup + GTA gameplay + lag fix reels is interested in \"systems/hardware engineering,\" not just \"gaming.\"",
      icon: <Sparkles className="w-6 h-6 text-fuchsia-400" />,
      color: "bg-fuchsia-500/10 border-fuchsia-500/30",
      titleColor: "text-fuchsia-400"
    },
    {
      id: 7,
      title: "Entertainment Filtering",
      description: "If a student watches non-tech entertainment content (cooking, pets, fitness), do NOT infer tech interest from it. Only infer from tech-adjacent or tech content. The entertainment reels just add noise — filter them out.",
      icon: <Filter className="w-6 h-6 text-blue-400" />,
      color: "bg-blue-500/10 border-blue-500/30",
      titleColor: "text-blue-400"
    },
    {
      id: 8,
      title: "Engagement Weight",
      description: "Saved + Replayed reels are the strongest signals (active effort). Liked = moderate signal. High watch % = passive interest. Skipped + low watch % = disinterest or rejection.",
      icon: <Weight className="w-6 h-6 text-violet-400" />,
      color: "bg-violet-500/10 border-violet-500/30",
      titleColor: "text-violet-400"
    }
  ];

  return (
    <div className="min-h-screen bg-[#0A0E17] text-slate-200 p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Navigation */}
        <div>
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>

        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight flex items-center gap-3">
            <Brain className="w-10 h-10 text-indigo-500" />
            Agent Brain — System Prompt & Reasoning Rules
          </h1>
          <p className="text-slate-400 text-lg max-w-3xl">
            This page outlines the core intelligence powering the recommendation engine. 
            These rules dictate how the AI infers deep behavioral signals rather than relying on superficial keyword matching.
          </p>
        </div>

        {/* Rules Grid */}
        <div className="space-y-5">
          <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-slate-400" />
            The 8 Analysis Rules
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {rules.map((rule) => (
              <div 
                key={rule.id} 
                className={`p-5 rounded-xl border flex flex-col gap-3 transition-transform hover:-translate-y-1 ${rule.color}`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-black/20">
                    {rule.icon}
                  </div>
                  <h3 className={`font-bold text-sm uppercase tracking-wide ${rule.titleColor}`}>
                    Rule {rule.id}: {rule.title}
                  </h3>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed flex-1">
                  {rule.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Full Prompt Code Block */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-slate-400" />
              Raw System Prompt
            </h2>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-colors shadow-lg shadow-indigo-500/20"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Full Prompt</span>
                </>
              )}
            </button>
          </div>
          
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl blur-xl opacity-50"></div>
            <pre className="relative p-6 rounded-xl bg-black/60 border border-slate-700/80 text-sm text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-2xl">
              <code className="font-mono">
                {SYSTEM_PROMPT_TEXT || `You are an AI-powered Reels Recommendation Agent designed for students. Your job is to analyze a student's Reel interaction history, infer their genuine underlying interests using behavioral signals (not just keywords), and recommend high-quality, educational tech Reels.

YOUR ANALYSIS RULES:

1. INFER DEEP INTEREST — Do NOT match keywords. A student watching a Java meme + coding interview joke + software engineer lifestyle Reel is NOT interested in "Java." They are interested in "software engineering as a career path." Think one level deeper always.

2. CLUSTER SIGNALS — Group Reels by theme, not topic. Ask: what is the student's emotional relationship with this content? (aspiring? curious? frustrated? entertained?)

3. TRAP AVOIDANCE (CRITICAL) — You must NEVER recommend:
   - "10 AI tools that will get you a job" style hype content
   - Viral tech listicles with no depth
   - Clickbait career advice Reels
   - Content a student watches for entertainment that has zero skill-building value
   If a recommendation feels like a YouTube thumbnail bait, reject it and pick something better.

4. DIFFICULTY CALIBRATION — Infer the student's level from what they engage with. Memes + lifestyle = beginner/aspiring. Actual coding Reels + DSA = intermediate. Architecture/system design = advanced.

5. CONFIDENCE SCORING — Be honest. If you only have 1-2 weak signals, say Low confidence. Don't fake certainty.

6. CROSS-REEL CLUSTERING — Look at ALL reels together. Find the underlying pattern across the full watch history. A student who watches gaming setup + GTA gameplay + lag fix reels is interested in "systems/hardware engineering," not just "gaming."

7. ENTERTAINMENT FILTERING — If a student watches non-tech entertainment content (cooking, pets, fitness), do NOT infer tech interest from it. Only infer from tech-adjacent or tech content. The entertainment reels just add noise — filter them out.

8. ENGAGEMENT WEIGHT — Saved + Replayed reels are the strongest signals (active effort). Liked = moderate signal. High watch % = passive interest. Skipped + low watch % = disinterest or rejection.`}
              </code>
            </pre>
          </div>
        </div>

      </div>
    </div>
  );
}
