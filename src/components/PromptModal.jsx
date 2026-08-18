import React, { useState } from 'react';
import { X, Copy, Check, Terminal, ShieldAlert } from 'lucide-react';
import { SYSTEM_PROMPT_TEXT } from '../services/recommendationEngine';

export function PromptModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(SYSTEM_PROMPT_TEXT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0E1524] border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Agent System Prompt & Analysis Rules
              </h3>
              <p className="text-xs text-slate-400">
                Core instructions governing behavioral inference, trap avoidance & calibration
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Prompt</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Prompt Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 font-mono text-xs text-slate-300 leading-relaxed space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-indigo-300">
            <strong>AGENT IDENTITY:</strong> AI-powered Reels Recommendation Agent for students. Behavioral signal analyzer & high-quality tech mentor.
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              5 Inviolable Analysis Rules:
            </div>
            <div className="space-y-2 text-slate-300">
              <p>
                <span className="text-indigo-400 font-semibold">1. INFER DEEP INTEREST:</span> Never match keywords. Group behavior patterns to discover the student's emotional relationship with tech content.
              </p>
              <p>
                <span className="text-cyan-400 font-semibold">2. CLUSTER SIGNALS:</span> Group Reels by intent and emotional state (aspiring, curious, frustrated, exam panic).
              </p>
              <p>
                <span className="text-rose-400 font-semibold">3. TRAP AVOIDANCE (CRITICAL):</span> Never recommend hype listicles, clickbait career advice, or zero-skill content.
              </p>
              <p>
                <span className="text-amber-400 font-semibold">4. DIFFICULTY CALIBRATION:</span> Calibrate level from signals (Memes = Beginner, Code/DSA = Intermediate, System Design = Advanced).
              </p>
              <p>
                <span className="text-emerald-400 font-semibold">5. CONFIDENCE SCORING:</span> Honest scoring based on signal density (3+ = High, 2 = Medium, 1 = Low).
              </p>
            </div>
          </div>

          <pre className="p-4 rounded-xl bg-black/60 border border-slate-800/80 text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap">
            {SYSTEM_PROMPT_TEXT}
          </pre>
        </div>
      </div>
    </div>
  );
}
