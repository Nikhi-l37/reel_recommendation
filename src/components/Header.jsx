import React, { useState } from 'react';
import { Sparkles, Terminal, BookOpen, ShieldCheck, Cpu, RefreshCw, Zap, Brain, Key, Eye, EyeOff } from 'lucide-react';

export function Header({ onOpenPrompt, onOpenLibrary, onTriggerAnalysis, isAnalyzing, useAI, onToggleAI, apiKey, onApiKeyChange }) {
  const [showKey, setShowKey] = useState(false);
  const [keyInputOpen, setKeyInputOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#0B0F17]/90 backdrop-blur-md px-4 sm:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: Brand & Status */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1.5px] flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <div className="w-full h-full bg-[#0D1322] rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
                  Reels<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Agent</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-medium">
                    AI v2.0
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 font-normal">
                Behavioral Interest Inference & Anti-Clickbait Recommendation Engine
              </p>
            </div>
          </div>

          {/* Mobile badges */}
          <div className="flex md:hidden items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Trap Filter Active</span>
          </div>
        </div>

        {/* Right: Badges & Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end w-full md:w-auto">
          {/* AI Mode Toggle */}
          <button
            onClick={onToggleAI}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              useAI
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:border-slate-600'
            }`}
            title={useAI ? "Switch to Heuristic Mode" : "Switch to Gemini AI Mode"}
          >
            {useAI ? <Brain className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
            <span>{useAI ? '✦ AI Mode' : 'Heuristic'}</span>
          </button>

          {/* API Key Input */}
          {useAI && (
            <div className="relative flex items-center gap-1.5">
              <button
                onClick={() => setKeyInputOpen(!keyInputOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  apiKey
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/30 animate-pulse'
                }`}
                title="Configure API Key"
              >
                <Key className="w-3 h-3" />
                <span>{apiKey ? 'Key Set' : 'Set Key'}</span>
              </button>

              {keyInputOpen && (
                <div className="absolute top-full right-0 mt-2 p-3 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl z-50 w-72">
                  <label className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5 block">
                    Gemini API Key
                  </label>
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <input
                        type={showKey ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => onApiKeyChange(e.target.value)}
                        placeholder="AIza..."
                        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono pr-8"
                      />
                      <button
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      >
                        {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <button
                      onClick={() => setKeyInputOpen(false)}
                      className="px-2.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
                    >
                      Save
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">
                    Free from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline">aistudio.google.com</a> • Stored in localStorage
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Desktop active pills */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="font-medium">Anti-Clickbait Filter Active</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-lg">
            <Cpu className="w-3.5 h-3.5" />
            <span className="font-medium">Behavioral Clustering</span>
          </div>

          {/* Library Modal Trigger */}
          <button
            onClick={onOpenLibrary}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all hover:border-slate-600 shadow-sm"
            title="Inspect Recommendation Library"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <span>Reel Pool</span>
          </button>

          {/* Prompt Modal Trigger */}
          <button
            onClick={onOpenPrompt}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all hover:border-indigo-500/40 shadow-sm"
            title="View Agent System Prompt & Rules"
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span>Agent Prompt</span>
          </button>

          {/* Re-analyze Button */}
          <button
            onClick={onTriggerAnalysis}
            disabled={isAnalyzing}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all ${
              isAnalyzing
                ? 'bg-indigo-700 text-indigo-200 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-indigo-500/25 hover:shadow-indigo-500/40 active:scale-95'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'Analyzing...' : useAI ? '✦ Run AI Agent' : 'Run Agent'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
