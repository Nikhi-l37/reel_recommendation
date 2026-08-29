import React, { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Link } from 'react-router-dom';
import {
  Sparkles, Bot, ShieldCheck, ChevronDown, ChevronRight,
  Play, Brain, Zap, Eye, BookOpen, Terminal, ArrowRight, Download, PlusCircle,
  Columns, AlertTriangle, Search
} from 'lucide-react';
import { SAMPLE_PROFILES } from '../data/sampleProfiles';
import { REEL_LIBRARY } from '../data/reelLibrary';
import { analyzeStudentProfile } from '../services/recommendationEngine';
import { analyzeWithGemini, transformGeminiResponse } from '../services/geminiService';
import { ReelFeedViewer } from '../components/ReelFeedViewer';
import { AgentReasoningView } from '../components/AgentReasoningView';
import { RecommendationCard } from '../components/RecommendationCard';
import { StudentProfileSummary } from '../components/StudentProfileSummary';
import { CustomReelModal } from '../components/CustomReelModal';

export function DashboardPage() {
  const [activeProfileId, setActiveProfileId] = useState('profile-swe');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customReels, setCustomReels] = useState(SAMPLE_PROFILES[0].reels);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // AI Mode State
  const [useAI, setUseAI] = useState(true);
  const [apiKey, setApiKey] = useState(() => import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key') || '');
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [pipelineStep, setPipelineStep] = useState(-1);

  // UI State
  const [activeTab, setActiveTab] = useState('input'); // 'input' | 'analysis' | 'compare'
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isAddReelOpen, setIsAddReelOpen] = useState(false);
  const [showPipeline, setShowPipeline] = useState(false);
  const [browseLibraryOpen, setBrowseLibraryOpen] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [trapToast, setTrapToast] = useState(null);

  useEffect(() => {
    if (apiKey) localStorage.setItem('gemini_api_key', apiKey);
  }, [apiKey]);

  // Active Profile
  const currentProfile = useMemo(() => {
    if (isCustomMode) {
      return {
        id: 'profile-custom', name: 'Custom Sandbox Student', avatar: '🛠️',
        tagline: 'Interactive sandbox with custom watch telemetry & signals', reels: customReels
      };
    }
    return SAMPLE_PROFILES.find(p => p.id === activeProfileId) || SAMPLE_PROFILES[0];
  }, [activeProfileId, isCustomMode, customReels]);

  const heuristicResult = useMemo(() => analyzeStudentProfile(currentProfile), [currentProfile]);
  const analysisResult = aiResult && useAI ? aiResult : heuristicResult;

  // Profile switch
  const handleSelectProfile = (profileId) => {
    setIsCustomMode(false);
    setActiveProfileId(profileId);
    setProfileDropdownOpen(false);
    setAiResult(null);
    setAiError(null);
    if (useAI && apiKey) {
      runAIAnalysis(profileId);
    } else {
      triggerCelebration();
    }
  };

  const handleToggleCustomMode = () => {
    if (!isCustomMode) setCustomReels(currentProfile.reels);
    setIsCustomMode(!isCustomMode);
    setProfileDropdownOpen(false);
    setAiResult(null);
    setAiError(null);
  };

  const handleUpdateReel = (reelId, updates) => {
    if (isCustomMode) {
      setCustomReels(prev => prev.map(r => (r.id === reelId ? { ...r, ...updates } : r)));
    } else {
      setIsCustomMode(true);
      setCustomReels(currentProfile.reels.map(r => (r.id === reelId ? { ...r, ...updates } : r)));
    }
    setAiResult(null);
  };

  const handleDeleteReel = (reelId) => { setCustomReels(prev => prev.filter(r => r.id !== reelId)); setAiResult(null); };
  const handleAddReel = (newReel) => { setCustomReels(prev => [newReel, ...prev]); setAiResult(null); };

  // Accept a recommendation → add it to the watch history
  const handleAcceptRecommendation = (analysis) => {
    const newReel = {
      id: `accepted-${Date.now()}`,
      title: analysis.recommendedReelObj?.title || analysis.recommendedReel,
      tags: analysis.recommendedReelObj?.tags || [analysis.category],
      watchPercentage: 85,
      liked: true,
      saved: false,
      replayed: false,
      skipped: false
    };
    if (!isCustomMode) {
      setIsCustomMode(true);
      setCustomReels([...currentProfile.reels, newReel]);
    } else {
      setCustomReels(prev => [...prev, newReel]);
    }
    setAiResult(null);
    setActiveTab('input');
  };

  // Download analysis report
  const downloadReport = () => {
    const lines = [
      `ANALYSIS REPORT — ${currentProfile.name}`,
      `Engine: ${analysisResult.aiPowered ? 'Gemini AI' : 'Heuristic'}`,
      `Date: ${new Date().toLocaleString()}`,
      `${'='.repeat(80)}`,
      '',
      'STUDENT PROFILE SUMMARY',
      `Core Interest Cluster: ${analysisResult.summary.coreCluster}`,
      `Skill Level: ${analysisResult.summary.skillLevel}`,
      `Blind Spots: ${analysisResult.summary.blindSpots}`,
      '',
      `${'='.repeat(80)}`,
      '',
      'CURRENT REEL | INTEREST DETECTED | WHY | RECOMMENDED TECH REEL | CATEGORY | WHY THIS RECOMMENDATION | DIFFICULTY | CONFIDENCE',
      '-'.repeat(120),
    ];
    analysisResult.reelAnalyses.forEach(a => {
      lines.push(
        `${a.currentReel} | ${a.interestDetected} | ${a.why} | ${a.recommendedReel} | ${a.category} | ${a.whyThisRecommendation} | ${a.difficulty} | ${a.confidence}`
      );
    });
    lines.push('', `${'='.repeat(80)}`);
    lines.push('', 'PRIORITY WATCHLIST');
    analysisResult.summary.priorityReels.forEach((p, i) => {
      lines.push(`${i + 1}. ${p.reel} — ${p.reason}`);
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reels-agent-report-${currentProfile.name.replace(/\s+/g, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Pipeline animation
  const runPipelineAnimation = useCallback(() => {
    return new Promise((resolve) => {
      const steps = [0, 1, 2, 3, 4];
      let i = 0;
      setPipelineStep(-1);
      setShowPipeline(true);
      const interval = setInterval(() => {
        if (i < steps.length) { setPipelineStep(steps[i]); i++; }
        else { clearInterval(interval); setPipelineStep(5); resolve(); }
      }, 500);
    });
  }, []);

  // AI Analysis
  const runAIAnalysis = useCallback(async (profileIdOverride) => {
    if (!apiKey) { setAiError("Please enter your Gemini API key first."); return; }
    setIsAnalyzing(true); setAiError(null); setAiResult(null);
    const animationDone = runPipelineAnimation();
    try {
      const targetProfile = profileIdOverride
        ? SAMPLE_PROFILES.find(p => p.id === profileIdOverride) || currentProfile
        : currentProfile;
      const geminiResult = await analyzeWithGemini(targetProfile, REEL_LIBRARY, apiKey);
      const transformed = transformGeminiResponse(geminiResult, targetProfile, REEL_LIBRARY);
      await animationDone;
      setAiResult(transformed);
      setActiveTab('analysis');
      try { confetti({ particleCount: 80, spread: 70, origin: { y: 0.8 }, colors: ['#6366F1', '#06B6D4', '#10B981', '#F59E0B'] }); } catch (e) {}
    } catch (err) {
      await animationDone;
      console.error("Gemini API error:", err);
      setAiError(err.message || "AI analysis failed. Falling back to heuristic engine.");
      setActiveTab('analysis');
    } finally { setIsAnalyzing(false); }
  }, [apiKey, currentProfile, runPipelineAnimation]);

  const triggerAnalysis = useCallback(() => {
    if (useAI && apiKey) { runAIAnalysis(); } else { triggerCelebration(); }
  }, [useAI, apiKey, runAIAnalysis]);

  const triggerCelebration = () => {
    setIsAnalyzing(true); setPipelineStep(-1); setShowPipeline(true);
    const steps = [0, 1, 2, 3, 4]; let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) { setPipelineStep(steps[i]); i++; }
      else {
        clearInterval(interval); setPipelineStep(5); setIsAnalyzing(false);
        setActiveTab('analysis');
        try { confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 }, colors: ['#6366F1', '#06B6D4', '#10B981'] }); } catch (e) {}
      }
    }, 300);
  };

  const handleToggleAI = () => {
    const newVal = !useAI; setUseAI(newVal); setAiResult(null); setAiError(null);
    if (newVal && apiKey) runAIAnalysis();
  };

  const selectedProfileObj = SAMPLE_PROFILES.find(p => p.id === activeProfileId) || SAMPLE_PROFILES[0];

  return (
    <div className="min-h-screen bg-[#0A0E17] text-slate-100 flex flex-col">
      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#0B0F17]/95 backdrop-blur-md px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-400 p-[1px] flex items-center justify-center">
              <div className="w-full h-full bg-[#0D1322] rounded-[7px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
            </div>
            <span className="font-bold text-white text-sm hidden sm:block">
              Reels<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Agent</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <button onClick={handleToggleAI}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                useAI ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' : 'bg-slate-800/80 text-slate-400 border-slate-700'
              }`}>
              {useAI ? <Brain className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
              <span className="hidden sm:inline">{useAI ? '✦ AI Mode' : 'Heuristic'}</span>
            </button>
            <Link to="/library" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all">
              <BookOpen className="w-3 h-3" /><span className="hidden sm:inline">Library</span>
            </Link>
            <Link to="/prompt" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all">
              <Terminal className="w-3 h-3" /><span className="hidden sm:inline">Agent Brain</span>
            </Link>
            <button onClick={triggerAnalysis} disabled={isAnalyzing}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold shadow-md transition-all ${
                isAnalyzing ? 'bg-indigo-700 text-indigo-200 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-indigo-500/25 active:scale-95'
              }`}>
              <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAnalyzing ? 'Analyzing...' : useAI ? '✦ Run AI' : 'Run Agent'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ===== MAIN ===== */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 space-y-4">

        {/* AI Error */}
        {aiError && useAI && (
          <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300 flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span><strong>AI Error:</strong> {aiError} — Heuristic fallback active.</span>
          </div>
        )}

        {/* ===== PROFILE SELECTOR & DEDICATED CUSTOM SANDBOX BUTTON ===== */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#111827] p-3 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0 hidden sm:inline">
              Persona:
            </span>
            <div className="relative flex-1 max-w-md">
              <button onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className={`w-full flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl border transition-all text-left ${
                  !isCustomMode 
                    ? 'bg-slate-900 border-indigo-500/40 text-white shadow-sm'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl shrink-0">{selectedProfileObj.avatar}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{selectedProfileObj.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{selectedProfileObj.tagline}</p>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#111827] border border-slate-700 rounded-xl shadow-2xl z-40 max-h-80 overflow-y-auto">
                  {SAMPLE_PROFILES.map(p => (
                    <button key={p.id} onClick={() => handleSelectProfile(p.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800/60 transition-colors text-left ${
                        activeProfileId === p.id && !isCustomMode ? 'bg-indigo-500/10 border-l-2 border-l-indigo-500' : ''
                      }`}>
                      <span className="text-lg">{p.avatar}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{p.tagline}</p>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">{p.reels.length} reels</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dedicated Custom Sandbox Button & Quick Tools */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleToggleCustomMode}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                isCustomMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 ring-1 ring-amber-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-amber-500/40'
              }`}
            >
              <span className="text-base">🛠️</span>
              <span>{isCustomMode ? 'Custom Sandbox (Active)' : 'Custom Sandbox'}</span>
            </button>

            {isCustomMode && (
              <>
                <button onClick={() => setIsAddReelOpen(true)}
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-500/20">
                  + Add Reel
                </button>
                <button onClick={() => setBrowseLibraryOpen(true)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all">
                  <Search className="w-3.5 h-3.5 inline mr-1" />Library
                </button>
              </>
            )}
          </div>
        </div>

        {/* ===== PIPELINE (collapsible) ===== */}
        {showPipeline && (
          <div className="animate-fade-in">
            <AgentReasoningView isAnalyzing={isAnalyzing} pipelineStep={pipelineStep} useAI={useAI} />
          </div>
        )}

        {/* ===== TABS ===== */}
        <div className="flex items-center gap-1 bg-[#111827] p-1 rounded-xl border border-slate-800 w-fit">
          <button onClick={() => setActiveTab('input')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'input' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}>
            <Play className="w-3 h-3" /> Watch History
          </button>
          <button onClick={() => setActiveTab('analysis')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'analysis' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}>
            <Bot className="w-3 h-3" /> AI Analysis
            {analysisResult.aiPowered && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
          <button onClick={() => setActiveTab('compare')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'compare' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}>
            <Columns className="w-3 h-3" /> Compare
          </button>
        </div>

        {/* ===== TAB CONTENT ===== */}
        {activeTab === 'input' && (
          <div className="animate-fade-in">
            <ReelFeedViewer
              reels={currentProfile.reels}
              onUpdateReel={handleUpdateReel}
              onDeleteReel={handleDeleteReel}
              isCustomMode={isCustomMode}
            />
            {/* CTA to run analysis */}
            <div className="mt-4 flex justify-center">
              <button onClick={triggerAnalysis} disabled={isAnalyzing}
                className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                {isAnalyzing ? 'Analyzing...' : 'Analyze This Student →'}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="space-y-5 animate-fade-in">
            {/* Download Report Button */}
            <div className="flex justify-end">
              <button onClick={downloadReport}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all hover:border-indigo-500/40">
                <Download className="w-3.5 h-3.5" /> Download Report
              </button>
            </div>

            {/* Profile Summary */}
            <StudentProfileSummary
              summary={analysisResult.summary}
              profileName={currentProfile.name}
              aiPowered={analysisResult.aiPowered || false}
            />

            {/* Reel-by-Reel Cards */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Reel-by-Reel Inference
                  </h3>
                  {analysisResult.aiPowered && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ✦ AI-POWERED
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {analysisResult.reelAnalyses.length} Cards
                </span>
              </div>

              {analysisResult.reelAnalyses.map((analysis, idx) => (
                <RecommendationCard key={analysis.reelId || idx} analysis={analysis} index={idx} onAccept={handleAcceptRecommendation} />
              ))}
            </div>
          </div>
        )}
      {/* ===== COMPARE TAB ===== */}
        {activeTab === 'compare' && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-xs text-indigo-300 flex items-center gap-2">
              <Columns className="w-4 h-4 shrink-0" />
              <span>Side-by-side comparison: <strong>Heuristic (keyword-based)</strong> vs <strong>Gemini AI (deep inference)</strong> for the same student.</span>
            </div>

            {/* Compare Summaries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Heuristic Side */}
              <div className="bg-amber-950/15 border border-amber-800/30 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-amber-800/30">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-amber-300">⚡ Heuristic Engine</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">Keyword-Based</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-400/70 font-semibold mb-1">Core Cluster</p>
                    <p className="text-xs text-slate-300">{heuristicResult.summary.coreCluster}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-400/70 font-semibold mb-1">Skill Level</p>
                    <p className="text-xs text-white font-medium">{heuristicResult.summary.skillLevel}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-400/70 font-semibold mb-1">Top 3 Recommendations</p>
                    {heuristicResult.summary.priorityReels.map((r, i) => (
                      <div key={i} className="text-xs text-slate-300 py-1 border-b border-amber-900/20 last:border-0">
                        <span className="text-amber-300 font-semibold">{i + 1}.</span> {r.reel}
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-400/70 font-semibold mb-1">Sample Reel Inference</p>
                    {heuristicResult.reelAnalyses.slice(0, 2).map((a, i) => (
                      <div key={i} className="text-xs text-slate-400 py-1.5 border-b border-amber-900/20 last:border-0">
                        <p className="text-slate-300 font-medium">"{a.currentReel}"</p>
                        <p className="mt-0.5">→ Interest: <span className="text-amber-300">{a.interestDetected}</span></p>
                        <p>→ Recommends: <span className="text-amber-200">{a.recommendedReel}</span></p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI Side */}
              <div className="bg-emerald-950/15 border border-emerald-800/30 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-emerald-800/30">
                  <Brain className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-emerald-300">✦ Gemini AI Engine</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Deep Inference</span>
                </div>
                {aiResult ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold mb-1">Core Cluster</p>
                      <p className="text-xs text-slate-300">{aiResult.summary.coreCluster}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold mb-1">Skill Level</p>
                      <p className="text-xs text-white font-medium">{aiResult.summary.skillLevel}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold mb-1">Top 3 Recommendations</p>
                      {aiResult.summary.priorityReels.map((r, i) => (
                        <div key={i} className="text-xs text-slate-300 py-1 border-b border-emerald-900/20 last:border-0">
                          <span className="text-emerald-300 font-semibold">{i + 1}.</span> {r.reel}
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold mb-1">Sample Reel Inference</p>
                      {aiResult.reelAnalyses.slice(0, 2).map((a, i) => (
                        <div key={i} className="text-xs text-slate-400 py-1.5 border-b border-emerald-900/20 last:border-0">
                          <p className="text-slate-300 font-medium">"{a.currentReel}"</p>
                          <p className="mt-0.5">→ Interest: <span className="text-emerald-300">{a.interestDetected}</span></p>
                          <p>→ Recommends: <span className="text-emerald-200">{a.recommendedReel}</span></p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Brain className="w-8 h-8 text-slate-600 mb-3" />
                    <p className="text-sm text-slate-400 font-medium">No AI results yet</p>
                    <p className="text-xs text-slate-500 mt-1">Click "✦ Run AI" to generate AI analysis for comparison</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ===== TRAP TOAST ===== */}
      {trapToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm p-4 rounded-xl bg-rose-950/90 border border-rose-700/60 shadow-2xl animate-slide-up flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-200">Trap Alert!</p>
            <p className="text-xs text-rose-300/80 mt-1">{trapToast}</p>
          </div>
          <button onClick={() => setTrapToast(null)} className="text-rose-500 hover:text-rose-300 text-xs shrink-0">✕</button>
        </div>
      )}

      {/* ===== BROWSE LIBRARY MODAL ===== */}
      {browseLibraryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0E1524] border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60">
              <h3 className="text-sm font-bold text-white">Browse Reel Library — Click to Add</h3>
              <button onClick={() => setBrowseLibraryOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-3 border-b border-slate-800">
              <input
                type="text" placeholder="Search reels..."
                value={librarySearch} onChange={e => setLibrarySearch(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="overflow-y-auto flex-1 p-3 space-y-2">
              {REEL_LIBRARY.filter(r =>
                !librarySearch || r.title.toLowerCase().includes(librarySearch.toLowerCase()) ||
                r.tags.some(t => t.toLowerCase().includes(librarySearch.toLowerCase()))
              ).map(reel => (
                <button key={reel.id}
                  onClick={() => {
                    handleAddReel({
                      id: `lib-${reel.id}-${Date.now()}`,
                      title: reel.title,
                      tags: reel.tags,
                      watchPercentage: 80,
                      liked: false, saved: false, replayed: false, skipped: false
                    });
                    setBrowseLibraryOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/60 transition-all text-left"
                >
                  <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">{reel.id}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{reel.title}</p>
                    <p className="text-[10px] text-slate-500 truncate">{reel.tags.join(', ')}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 shrink-0">{reel.category}</span>
                  <PlusCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <CustomReelModal isOpen={isAddReelOpen} onClose={() => setIsAddReelOpen(false)} onAddReel={(reel) => {
        handleAddReel(reel);
        // Feature #7: Trap toast
        const trapKeywords = ['hack', 'secret', 'trick', 'you won\'t believe', 'shocking', 'mindblowing', '10 tools', '5 apps', 'get rich'];
        const combined = (reel.title + ' ' + reel.tags.join(' ')).toLowerCase();
        if (trapKeywords.some(k => combined.includes(k))) {
          setTrapToast(`"${reel.title}" looks like clickbait. Consider watching substantive, concept-driven content instead.`);
          setTimeout(() => setTrapToast(null), 5000);
        }
      }} />
    </div>
  );
}



import React, { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Link } from 'react-router-dom';
import {
  Sparkles, Bot, ShieldCheck, ChevronDown, ChevronRight,
  Play, Brain, Zap, Eye, BookOpen, Terminal, ArrowRight, Download, PlusCircle,
  Columns, AlertTriangle, Search
} from 'lucide-react';
import { SAMPLE_PROFILES } from '../data/sampleProfiles';
import { REEL_LIBRARY } from '../data/reelLibrary';
import { analyzeStudentProfile } from '../services/recommendationEngine';
import { analyzeWithGemini, transformGeminiResponse } from '../services/geminiService';
import { ReelFeedViewer } from '../components/ReelFeedViewer';
import { AgentReasoningView } from '../components/AgentReasoningView';
import { RecommendationCard } from '../components/RecommendationCard';
import { StudentProfileSummary } from '../components/StudentProfileSummary';
import { CustomReelModal } from '../components/CustomReelModal';

export function DashboardPage() {
  const [activeProfileId, setActiveProfileId] = useState('profile-swe');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customReels, setCustomReels] = useState(SAMPLE_PROFILES[0].reels);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // AI Mode State
  const [useAI, setUseAI] = useState(true);
  const [apiKey, setApiKey] = useState(() => import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key') || '');
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [pipelineStep, setPipelineStep] = useState(-1);

  // UI State
  const [activeTab, setActiveTab] = useState('input'); // 'input' | 'analysis' | 'compare'
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isAddReelOpen, setIsAddReelOpen] = useState(false);
  const [showPipeline, setShowPipeline] = useState(false);
  const [browseLibraryOpen, setBrowseLibraryOpen] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [trapToast, setTrapToast] = useState(null);

  useEffect(() => {
    if (apiKey) localStorage.setItem('gemini_api_key', apiKey);
  }, [apiKey]);

  // Active Profile
  const currentProfile = useMemo(() => {
    if (isCustomMode) {
      return {
        id: 'profile-custom', name: 'Custom Sandbox Student', avatar: '🛠️',
        tagline: 'Interactive sandbox with custom watch telemetry & signals', reels: customReels
      };
    }
    return SAMPLE_PROFILES.find(p => p.id === activeProfileId) || SAMPLE_PROFILES[0];
  }, [activeProfileId, isCustomMode, customReels]);

  const heuristicResult = useMemo(() => analyzeStudentProfile(currentProfile), [currentProfile]);
  const analysisResult = aiResult && useAI ? aiResult : heuristicResult;

  // Profile switch
  const handleSelectProfile = (profileId) => {
    setIsCustomMode(false);
    setActiveProfileId(profileId);
    setProfileDropdownOpen(false);
    setAiResult(null);
    setAiError(null);
    if (useAI && apiKey) {
      runAIAnalysis(profileId);
    } else {
      triggerCelebration();
    }
  };

  const handleToggleCustomMode = () => {
    if (!isCustomMode) setCustomReels(currentProfile.reels);
    setIsCustomMode(!isCustomMode);
    setProfileDropdownOpen(false);
    setAiResult(null);
    setAiError(null);
  };

  const handleUpdateReel = (reelId, updates) => {
    if (isCustomMode) {
      setCustomReels(prev => prev.map(r => (r.id === reelId ? { ...r, ...updates } : r)));
    } else {
      setIsCustomMode(true);
      setCustomReels(currentProfile.reels.map(r => (r.id === reelId ? { ...r, ...updates } : r)));
    }
    setAiResult(null);
  };

  const handleDeleteReel = (reelId) => { setCustomReels(prev => prev.filter(r => r.id !== reelId)); setAiResult(null); };
  const handleAddReel = (newReel) => { setCustomReels(prev => [newReel, ...prev]); setAiResult(null); };

  // Accept a recommendation → add it to the watch history
  const handleAcceptRecommendation = (analysis) => {
    const newReel = {
      id: `accepted-${Date.now()}`,
      title: analysis.recommendedReelObj?.title || analysis.recommendedReel,
      tags: analysis.recommendedReelObj?.tags || [analysis.category],
      watchPercentage: 85,
      liked: true,
      saved: false,
      replayed: false,
      skipped: false
    };
    if (!isCustomMode) {
      setIsCustomMode(true);
      setCustomReels([...currentProfile.reels, newReel]);
    } else {
      setCustomReels(prev => [...prev, newReel]);
    }
    setAiResult(null);
    setActiveTab('input');
  };

  // Download analysis report
  const downloadReport = () => {
    const lines = [
      `ANALYSIS REPORT — ${currentProfile.name}`,
      `Engine: ${analysisResult.aiPowered ? 'Gemini AI' : 'Heuristic'}`,
      `Date: ${new Date().toLocaleString()}`,
      `${'='.repeat(80)}`,
      '',
      'STUDENT PROFILE SUMMARY',
      `Core Interest Cluster: ${analysisResult.summary.coreCluster}`,
      `Skill Level: ${analysisResult.summary.skillLevel}`,
      `Blind Spots: ${analysisResult.summary.blindSpots}`,
      '',
      `${'='.repeat(80)}`,
      '',
      'CURRENT REEL | INTEREST DETECTED | WHY | RECOMMENDED TECH REEL | CATEGORY | WHY THIS RECOMMENDATION | DIFFICULTY | CONFIDENCE',
      '-'.repeat(120),
    ];
    analysisResult.reelAnalyses.forEach(a => {
      lines.push(
        `${a.currentReel} | ${a.interestDetected} | ${a.why} | ${a.recommendedReel} | ${a.category} | ${a.whyThisRecommendation} | ${a.difficulty} | ${a.confidence}`
      );
    });
    lines.push('', `${'='.repeat(80)}`);
    lines.push('', 'PRIORITY WATCHLIST');
    analysisResult.summary.priorityReels.forEach((p, i) => {
      lines.push(`${i + 1}. ${p.reel} — ${p.reason}`);
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reels-agent-report-${currentProfile.name.replace(/\s+/g, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Pipeline animation
  const runPipelineAnimation = useCallback(() => {
    return new Promise((resolve) => {
      const steps = [0, 1, 2, 3, 4];
      let i = 0;
      setPipelineStep(-1);
      setShowPipeline(true);
      const interval = setInterval(() => {
        if (i < steps.length) { setPipelineStep(steps[i]); i++; }
        else { clearInterval(interval); setPipelineStep(5); resolve(); }
      }, 500);
    });
  }, []);

  // AI Analysis
  const runAIAnalysis = useCallback(async (profileIdOverride) => {
    if (!apiKey) { setAiError("Please enter your Gemini API key first."); return; }
    setIsAnalyzing(true); setAiError(null); setAiResult(null);
    const animationDone = runPipelineAnimation();
    try {
      const targetProfile = profileIdOverride
        ? SAMPLE_PROFILES.find(p => p.id === profileIdOverride) || currentProfile
        : currentProfile;
      const geminiResult = await analyzeWithGemini(targetProfile, REEL_LIBRARY, apiKey);
      const transformed = transformGeminiResponse(geminiResult, targetProfile, REEL_LIBRARY);
      await animationDone;
      setAiResult(transformed);
      setActiveTab('analysis');
      try { confetti({ particleCount: 80, spread: 70, origin: { y: 0.8 }, colors: ['#6366F1', '#06B6D4', '#10B981', '#F59E0B'] }); } catch (e) {}
    } catch (err) {
      await animationDone;
      console.error("Gemini API error:", err);
      setAiError(err.message || "AI analysis failed. Falling back to heuristic engine.");
      setActiveTab('analysis');
    } finally { setIsAnalyzing(false); }
  }, [apiKey, currentProfile, runPipelineAnimation]);

  const triggerAnalysis = useCallback(() => {
    if (useAI && apiKey) { runAIAnalysis(); } else { triggerCelebration(); }
  }, [useAI, apiKey, runAIAnalysis]);

  const triggerCelebration = () => {
    setIsAnalyzing(true); setPipelineStep(-1); setShowPipeline(true);
    const steps = [0, 1, 2, 3, 4]; let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) { setPipelineStep(steps[i]); i++; }
      else {
        clearInterval(interval); setPipelineStep(5); setIsAnalyzing(false);
        setActiveTab('analysis');
        try { confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 }, colors: ['#6366F1', '#06B6D4', '#10B981'] }); } catch (e) {}
      }
    }, 300);
  };

  const handleToggleAI = () => {
    const newVal = !useAI; setUseAI(newVal); setAiResult(null); setAiError(null);
    if (newVal && apiKey) runAIAnalysis();
  };

  const selectedProfileObj = SAMPLE_PROFILES.find(p => p.id === activeProfileId) || SAMPLE_PROFILES[0];

  return (
    <div className="min-h-screen bg-[#0A0E17] text-slate-100 flex flex-col">
      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#0B0F17]/95 backdrop-blur-md px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-400 p-[1px] flex items-center justify-center">
              <div className="w-full h-full bg-[#0D1322] rounded-[7px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
            </div>
            <span className="font-bold text-white text-sm hidden sm:block">
              Reels<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Agent</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <button onClick={handleToggleAI}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                useAI ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' : 'bg-slate-800/80 text-slate-400 border-slate-700'
              }`}>
              {useAI ? <Brain className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
              <span className="hidden sm:inline">{useAI ? '✦ AI Mode' : 'Heuristic'}</span>
            </button>
            <Link to="/library" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all">
              <BookOpen className="w-3 h-3" /><span className="hidden sm:inline">Library</span>
            </Link>
            <Link to="/prompt" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all">
              <Terminal className="w-3 h-3" /><span className="hidden sm:inline">Agent Brain</span>
            </Link>
            <button onClick={triggerAnalysis} disabled={isAnalyzing}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold shadow-md transition-all ${
                isAnalyzing ? 'bg-indigo-700 text-indigo-200 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-indigo-500/25 active:scale-95'
              }`}>
              <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAnalyzing ? 'Analyzing...' : useAI ? '✦ Run AI' : 'Run Agent'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ===== MAIN ===== */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 space-y-4">

        {/* AI Error */}
        {aiError && useAI && (
          <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300 flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span><strong>AI Error:</strong> {aiError} — Heuristic fallback active.</span>
          </div>
        )}

        {/* ===== PROFILE SELECTOR & DEDICATED CUSTOM SANDBOX BUTTON ===== */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#111827] p-3 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0 hidden sm:inline">
              Persona:
            </span>
            <div className="relative flex-1 max-w-md">
              <button onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className={`w-full flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl border transition-all text-left ${
                  !isCustomMode 
                    ? 'bg-slate-900 border-indigo-500/40 text-white shadow-sm'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl shrink-0">{selectedProfileObj.avatar}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{selectedProfileObj.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{selectedProfileObj.tagline}</p>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#111827] border border-slate-700 rounded-xl shadow-2xl z-40 max-h-80 overflow-y-auto">
                  {SAMPLE_PROFILES.map(p => (
                    <button key={p.id} onClick={() => handleSelectProfile(p.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800/60 transition-colors text-left ${
                        activeProfileId === p.id && !isCustomMode ? 'bg-indigo-500/10 border-l-2 border-l-indigo-500' : ''
                      }`}>
                      <span className="text-lg">{p.avatar}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{p.tagline}</p>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">{p.reels.length} reels</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dedicated Custom Sandbox Button & Quick Tools */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleToggleCustomMode}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                isCustomMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 ring-1 ring-amber-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-amber-500/40'
              }`}
            >
              <span className="text-base">🛠️</span>
              <span>{isCustomMode ? 'Custom Sandbox (Active)' : 'Custom Sandbox'}</span>
            </button>

            {isCustomMode && (
              <>
                <button onClick={() => setIsAddReelOpen(true)}
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-500/20">
                  + Add Reel
                </button>
                <button onClick={() => setBrowseLibraryOpen(true)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all">
                  <Search className="w-3.5 h-3.5 inline mr-1" />Library
                </button>
              </>
            )}
          </div>
        </div>

        {/* ===== PIPELINE (collapsible) ===== */}
        {showPipeline && (
          <div className="animate-fade-in">
            <AgentReasoningView isAnalyzing={isAnalyzing} pipelineStep={pipelineStep} useAI={useAI} />
          </div>
        )}

        {/* ===== TABS ===== */}
        <div className="flex items-center gap-1 bg-[#111827] p-1 rounded-xl border border-slate-800 w-fit">
          <button onClick={() => setActiveTab('input')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'input' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}>
            <Play className="w-3 h-3" /> Watch History
          </button>
          <button onClick={() => setActiveTab('analysis')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'analysis' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}>
            <Bot className="w-3 h-3" /> AI Analysis
            {analysisResult.aiPowered && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
          <button onClick={() => setActiveTab('compare')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'compare' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}>
            <Columns className="w-3 h-3" /> Compare
          </button>
        </div>

        {/* ===== TAB CONTENT ===== */}
        {activeTab === 'input' && (
          <div className="animate-fade-in">
            <ReelFeedViewer
              reels={currentProfile.reels}
              onUpdateReel={handleUpdateReel}
              onDeleteReel={handleDeleteReel}
              isCustomMode={isCustomMode}
            />
            {/* CTA to run analysis */}
            <div className="mt-4 flex justify-center">
              <button onClick={triggerAnalysis} disabled={isAnalyzing}
                className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                {isAnalyzing ? 'Analyzing...' : 'Analyze This Student →'}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="space-y-5 animate-fade-in">
            {/* Download Report Button */}
            <div className="flex justify-end">
              <button onClick={downloadReport}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all hover:border-indigo-500/40">
                <Download className="w-3.5 h-3.5" /> Download Report
              </button>
            </div>

            {/* Profile Summary */}
            <StudentProfileSummary
              summary={analysisResult.summary}
              profileName={currentProfile.name}
              aiPowered={analysisResult.aiPowered || false}
            />

            {/* Reel-by-Reel Cards */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Reel-by-Reel Inference
                  </h3>
                  {analysisResult.aiPowered && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ✦ AI-POWERED
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {analysisResult.reelAnalyses.length} Cards
                </span>
              </div>

              {analysisResult.reelAnalyses.map((analysis, idx) => (
                <RecommendationCard key={analysis.reelId || idx} analysis={analysis} index={idx} onAccept={handleAcceptRecommendation} />
              ))}
            </div>
          </div>
        )}
      {/* ===== COMPARE TAB ===== */}
        {activeTab === 'compare' && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-xs text-indigo-300 flex items-center gap-2">
              <Columns className="w-4 h-4 shrink-0" />
              <span>Side-by-side comparison: <strong>Heuristic (keyword-based)</strong> vs <strong>Gemini AI (deep inference)</strong> for the same student.</span>
            </div>

            {/* Compare Summaries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Heuristic Side */}
              <div className="bg-amber-950/15 border border-amber-800/30 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-amber-800/30">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-amber-300">⚡ Heuristic Engine</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">Keyword-Based</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-400/70 font-semibold mb-1">Core Cluster</p>
                    <p className="text-xs text-slate-300">{heuristicResult.summary.coreCluster}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-400/70 font-semibold mb-1">Skill Level</p>
                    <p className="text-xs text-white font-medium">{heuristicResult.summary.skillLevel}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-400/70 font-semibold mb-1">Top 3 Recommendations</p>
                    {heuristicResult.summary.priorityReels.map((r, i) => (
                      <div key={i} className="text-xs text-slate-300 py-1 border-b border-amber-900/20 last:border-0">
                        <span className="text-amber-300 font-semibold">{i + 1}.</span> {r.reel}
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-400/70 font-semibold mb-1">Sample Reel Inference</p>
                    {heuristicResult.reelAnalyses.slice(0, 2).map((a, i) => (
                      <div key={i} className="text-xs text-slate-400 py-1.5 border-b border-amber-900/20 last:border-0">
                        <p className="text-slate-300 font-medium">"{a.currentReel}"</p>
                        <p className="mt-0.5">→ Interest: <span className="text-amber-300">{a.interestDetected}</span></p>
                        <p>→ Recommends: <span className="text-amber-200">{a.recommendedReel}</span></p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI Side */}
              <div className="bg-emerald-950/15 border border-emerald-800/30 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-emerald-800/30">
                  <Brain className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-emerald-300">✦ Gemini AI Engine</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Deep Inference</span>
                </div>
                {aiResult ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold mb-1">Core Cluster</p>
                      <p className="text-xs text-slate-300">{aiResult.summary.coreCluster}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold mb-1">Skill Level</p>
                      <p className="text-xs text-white font-medium">{aiResult.summary.skillLevel}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold mb-1">Top 3 Recommendations</p>
                      {aiResult.summary.priorityReels.map((r, i) => (
                        <div key={i} className="text-xs text-slate-300 py-1 border-b border-emerald-900/20 last:border-0">
                          <span className="text-emerald-300 font-semibold">{i + 1}.</span> {r.reel}
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold mb-1">Sample Reel Inference</p>
                      {aiResult.reelAnalyses.slice(0, 2).map((a, i) => (
                        <div key={i} className="text-xs text-slate-400 py-1.5 border-b border-emerald-900/20 last:border-0">
                          <p className="text-slate-300 font-medium">"{a.currentReel}"</p>
                          <p className="mt-0.5">→ Interest: <span className="text-emerald-300">{a.interestDetected}</span></p>
                          <p>→ Recommends: <span className="text-emerald-200">{a.recommendedReel}</span></p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Brain className="w-8 h-8 text-slate-600 mb-3" />
                    <p className="text-sm text-slate-400 font-medium">No AI results yet</p>
                    <p className="text-xs text-slate-500 mt-1">Click "✦ Run AI" to generate AI analysis for comparison</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ===== TRAP TOAST ===== */}
      {trapToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm p-4 rounded-xl bg-rose-950/90 border border-rose-700/60 shadow-2xl animate-slide-up flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-200">Trap Alert!</p>
            <p className="text-xs text-rose-300/80 mt-1">{trapToast}</p>
          </div>
          <button onClick={() => setTrapToast(null)} className="text-rose-500 hover:text-rose-300 text-xs shrink-0">✕</button>
        </div>
      )}

      {/* ===== BROWSE LIBRARY MODAL ===== */}
      {browseLibraryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0E1524] border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60">
              <h3 className="text-sm font-bold text-white">Browse Reel Library — Click to Add</h3>
              <button onClick={() => setBrowseLibraryOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-3 border-b border-slate-800">
              <input
                type="text" placeholder="Search reels..."
                value={librarySearch} onChange={e => setLibrarySearch(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="overflow-y-auto flex-1 p-3 space-y-2">
              {REEL_LIBRARY.filter(r =>
                !librarySearch || r.title.toLowerCase().includes(librarySearch.toLowerCase()) ||
                r.tags.some(t => t.toLowerCase().includes(librarySearch.toLowerCase()))
              ).map(reel => (
                <button key={reel.id}
                  onClick={() => {
                    handleAddReel({
                      id: `lib-${reel.id}-${Date.now()}`,
                      title: reel.title,
                      tags: reel.tags,
                      watchPercentage: 80,
                      liked: false, saved: false, replayed: false, skipped: false
                    });
                    setBrowseLibraryOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/60 transition-all text-left"
                >
                  <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">{reel.id}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{reel.title}</p>
                    <p className="text-[10px] text-slate-500 truncate">{reel.tags.join(', ')}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 shrink-0">{reel.category}</span>
                  <PlusCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <CustomReelModal isOpen={isAddReelOpen} onClose={() => setIsAddReelOpen(false)} onAddReel={(reel) => {
        handleAddReel(reel);
        // Feature #7: Trap toast
        const trapKeywords = ['hack', 'secret', 'trick', 'you won\'t believe', 'shocking', 'mindblowing', '10 tools', '5 apps', 'get rich'];
        const combined = (reel.title + ' ' + reel.tags.join(' ')).toLowerCase();
        if (trapKeywords.some(k => combined.includes(k))) {
          setTrapToast(`"${reel.title}" looks like clickbait. Consider watching substantive, concept-driven content instead.`);
          setTimeout(() => setTrapToast(null), 5000);
        }
      }} />
    </div>
  );
}

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Link } from 'react-router-dom';
import {
  Sparkles, Bot, ShieldCheck, ChevronDown, ChevronRight,
  Play, Brain, Zap, Eye, BookOpen, Terminal, ArrowRight, Download, PlusCircle,
  Columns, AlertTriangle, Search
} from 'lucide-react';
import { SAMPLE_PROFILES } from '../data/sampleProfiles';
import { REEL_LIBRARY } from '../data/reelLibrary';
import { analyzeStudentProfile } from '../services/recommendationEngine';
import { analyzeWithGemini, transformGeminiResponse } from '../services/geminiService';
import { ReelFeedViewer } from '../components/ReelFeedViewer';
import { AgentReasoningView } from '../components/AgentReasoningView';
import { RecommendationCard } from '../components/RecommendationCard';
import { StudentProfileSummary } from '../components/StudentProfileSummary';
import { CustomReelModal } from '../components/CustomReelModal';

export function DashboardPage() {
  const [activeProfileId, setActiveProfileId] = useState('profile-swe');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customReels, setCustomReels] = useState(SAMPLE_PROFILES[0].reels);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // AI Mode State
  const [useAI, setUseAI] = useState(true);
  const [apiKey, setApiKey] = useState(() => import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key') || '');
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [pipelineStep, setPipelineStep] = useState(-1);

  // UI State
  const [activeTab, setActiveTab] = useState('input'); // 'input' | 'analysis' | 'compare'
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isAddReelOpen, setIsAddReelOpen] = useState(false);
  const [showPipeline, setShowPipeline] = useState(false);
  const [browseLibraryOpen, setBrowseLibraryOpen] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [trapToast, setTrapToast] = useState(null);

  useEffect(() => {
    if (apiKey) localStorage.setItem('gemini_api_key', apiKey);
  }, [apiKey]);

  // Active Profile
  const currentProfile = useMemo(() => {
    if (isCustomMode) {
      return {
        id: 'profile-custom', name: 'Custom Sandbox Student', avatar: '🛠️',
        tagline: 'Interactive sandbox with custom watch telemetry & signals', reels: customReels
      };
    }
    return SAMPLE_PROFILES.find(p => p.id === activeProfileId) || SAMPLE_PROFILES[0];
  }, [activeProfileId, isCustomMode, customReels]);

  const heuristicResult = useMemo(() => analyzeStudentProfile(currentProfile), [currentProfile]);
  const analysisResult = aiResult && useAI ? aiResult : heuristicResult;

  // Profile switch
  const handleSelectProfile = (profileId) => {
    setIsCustomMode(false);
    setActiveProfileId(profileId);
    setProfileDropdownOpen(false);
    setAiResult(null);
    setAiError(null);
    if (useAI && apiKey) {
      runAIAnalysis(profileId);
    } else {
      triggerCelebration();
    }
  };

  const handleToggleCustomMode = () => {
    if (!isCustomMode) setCustomReels(currentProfile.reels);
    setIsCustomMode(!isCustomMode);
    setProfileDropdownOpen(false);
    setAiResult(null);
    setAiError(null);
  };

  const handleUpdateReel = (reelId, updates) => {
    if (isCustomMode) {
      setCustomReels(prev => prev.map(r => (r.id === reelId ? { ...r, ...updates } : r)));
    } else {
      setIsCustomMode(true);
      setCustomReels(currentProfile.reels.map(r => (r.id === reelId ? { ...r, ...updates } : r)));
    }
    setAiResult(null);
  };

  const handleDeleteReel = (reelId) => { setCustomReels(prev => prev.filter(r => r.id !== reelId)); setAiResult(null); };
  const handleAddReel = (newReel) => { setCustomReels(prev => [newReel, ...prev]); setAiResult(null); };

  // Accept a recommendation → add it to the watch history
  const handleAcceptRecommendation = (analysis) => {
    const newReel = {
      id: `accepted-${Date.now()}`,
      title: analysis.recommendedReelObj?.title || analysis.recommendedReel,
      tags: analysis.recommendedReelObj?.tags || [analysis.category],
      watchPercentage: 85,
      liked: true,
      saved: false,
      replayed: false,
      skipped: false
    };
    if (!isCustomMode) {
      setIsCustomMode(true);
      setCustomReels([...currentProfile.reels, newReel]);
    } else {
      setCustomReels(prev => [...prev, newReel]);
    }
    setAiResult(null);
    setActiveTab('input');
  };

  // Download analysis report
  const downloadReport = () => {
    const lines = [
      `ANALYSIS REPORT — ${currentProfile.name}`,
      `Engine: ${analysisResult.aiPowered ? 'Gemini AI' : 'Heuristic'}`,
      `Date: ${new Date().toLocaleString()}`,
      `${'='.repeat(80)}`,
      '',
      'STUDENT PROFILE SUMMARY',
      `Core Interest Cluster: ${analysisResult.summary.coreCluster}`,
      `Skill Level: ${analysisResult.summary.skillLevel}`,
      `Blind Spots: ${analysisResult.summary.blindSpots}`,
      '',
      `${'='.repeat(80)}`,
      '',
      'CURRENT REEL | INTEREST DETECTED | WHY | RECOMMENDED TECH REEL | CATEGORY | WHY THIS RECOMMENDATION | DIFFICULTY | CONFIDENCE',
      '-'.repeat(120),
    ];
    analysisResult.reelAnalyses.forEach(a => {
      lines.push(
        `${a.currentReel} | ${a.interestDetected} | ${a.why} | ${a.recommendedReel} | ${a.category} | ${a.whyThisRecommendation} | ${a.difficulty} | ${a.confidence}`
      );
    });
    lines.push('', `${'='.repeat(80)}`);
    lines.push('', 'PRIORITY WATCHLIST');
    analysisResult.summary.priorityReels.forEach((p, i) => {
      lines.push(`${i + 1}. ${p.reel} — ${p.reason}`);
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reels-agent-report-${currentProfile.name.replace(/\s+/g, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Pipeline animation
  const runPipelineAnimation = useCallback(() => {
    return new Promise((resolve) => {
      const steps = [0, 1, 2, 3, 4];
      let i = 0;
      setPipelineStep(-1);
      setShowPipeline(true);
      const interval = setInterval(() => {
        if (i < steps.length) { setPipelineStep(steps[i]); i++; }
        else { clearInterval(interval); setPipelineStep(5); resolve(); }
      }, 500);
    });
  }, []);

  // AI Analysis
  const runAIAnalysis = useCallback(async (profileIdOverride) => {
    if (!apiKey) { setAiError("Please enter your Gemini API key first."); return; }
    setIsAnalyzing(true); setAiError(null); setAiResult(null);
    const animationDone = runPipelineAnimation();
    try {
      const targetProfile = profileIdOverride
        ? SAMPLE_PROFILES.find(p => p.id === profileIdOverride) || currentProfile
        : currentProfile;
      const geminiResult = await analyzeWithGemini(targetProfile, REEL_LIBRARY, apiKey);
      const transformed = transformGeminiResponse(geminiResult, targetProfile, REEL_LIBRARY);
      await animationDone;
      setAiResult(transformed);
      setActiveTab('analysis');
      try { confetti({ particleCount: 80, spread: 70, origin: { y: 0.8 }, colors: ['#6366F1', '#06B6D4', '#10B981', '#F59E0B'] }); } catch (e) {}
    } catch (err) {
      await animationDone;
      console.error("Gemini API error:", err);
      setAiError(err.message || "AI analysis failed. Falling back to heuristic engine.");
      setActiveTab('analysis');
    } finally { setIsAnalyzing(false); }
  }, [apiKey, currentProfile, runPipelineAnimation]);

  const triggerAnalysis = useCallback(() => {
    if (useAI && apiKey) { runAIAnalysis(); } else { triggerCelebration(); }
  }, [useAI, apiKey, runAIAnalysis]);

  const triggerCelebration = () => {
    setIsAnalyzing(true); setPipelineStep(-1); setShowPipeline(true);
    const steps = [0, 1, 2, 3, 4]; let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) { setPipelineStep(steps[i]); i++; }
      else {
        clearInterval(interval); setPipelineStep(5); setIsAnalyzing(false);
        setActiveTab('analysis');
        try { confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 }, colors: ['#6366F1', '#06B6D4', '#10B981'] }); } catch (e) {}
      }
    }, 300);
  };

  const handleToggleAI = () => {
    const newVal = !useAI; setUseAI(newVal); setAiResult(null); setAiError(null);
    if (newVal && apiKey) runAIAnalysis();
  };

  const selectedProfileObj = SAMPLE_PROFILES.find(p => p.id === activeProfileId) || SAMPLE_PROFILES[0];

  return (
    <div className="min-h-screen bg-[#0A0E17] text-slate-100 flex flex-col">
      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#0B0F17]/95 backdrop-blur-md px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-400 p-[1px] flex items-center justify-center">
              <div className="w-full h-full bg-[#0D1322] rounded-[7px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
            </div>
            <span className="font-bold text-white text-sm hidden sm:block">
              Reels<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Agent</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <button onClick={handleToggleAI}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                useAI ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' : 'bg-slate-800/80 text-slate-400 border-slate-700'
              }`}>
              {useAI ? <Brain className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
              <span className="hidden sm:inline">{useAI ? '✦ AI Mode' : 'Heuristic'}</span>
            </button>
            <Link to="/library" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all">
              <BookOpen className="w-3 h-3" /><span className="hidden sm:inline">Library</span>
            </Link>
            <Link to="/prompt" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all">
              <Terminal className="w-3 h-3" /><span className="hidden sm:inline">Agent Brain</span>
            </Link>
            <button onClick={triggerAnalysis} disabled={isAnalyzing}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold shadow-md transition-all ${
                isAnalyzing ? 'bg-indigo-700 text-indigo-200 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-indigo-500/25 active:scale-95'
              }`}>
              <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAnalyzing ? 'Analyzing...' : useAI ? '✦ Run AI' : 'Run Agent'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ===== MAIN ===== */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 space-y-4">

        {/* AI Error */}
        {aiError && useAI && (
          <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300 flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span><strong>AI Error:</strong> {aiError} — Heuristic fallback active.</span>
          </div>
        )}

        {/* ===== PROFILE SELECTOR & DEDICATED CUSTOM SANDBOX BUTTON ===== */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#111827] p-3 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0 hidden sm:inline">
              Persona:
            </span>
            <div className="relative flex-1 max-w-md">
              <button onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className={`w-full flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl border transition-all text-left ${
                  !isCustomMode 
                    ? 'bg-slate-900 border-indigo-500/40 text-white shadow-sm'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl shrink-0">{selectedProfileObj.avatar}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{selectedProfileObj.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{selectedProfileObj.tagline}</p>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#111827] border border-slate-700 rounded-xl shadow-2xl z-40 max-h-80 overflow-y-auto">
                  {SAMPLE_PROFILES.map(p => (
                    <button key={p.id} onClick={() => handleSelectProfile(p.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800/60 transition-colors text-left ${
                        activeProfileId === p.id && !isCustomMode ? 'bg-indigo-500/10 border-l-2 border-l-indigo-500' : ''
                      }`}>
                      <span className="text-lg">{p.avatar}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{p.tagline}</p>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">{p.reels.length} reels</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dedicated Custom Sandbox Button & Quick Tools */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleToggleCustomMode}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                isCustomMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 ring-1 ring-amber-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-amber-500/40'
              }`}
            >
              <span className="text-base">🛠️</span>
              <span>{isCustomMode ? 'Custom Sandbox (Active)' : 'Custom Sandbox'}</span>
            </button>

            {isCustomMode && (
              <>
                <button onClick={() => setIsAddReelOpen(true)}
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-500/20">
                  + Add Reel
                </button>
                <button onClick={() => setBrowseLibraryOpen(true)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all">
                  <Search className="w-3.5 h-3.5 inline mr-1" />Library
                </button>
              </>
            )}
          </div>
        </div>

        {/* ===== PIPELINE (collapsible) ===== */}
        {showPipeline && (
          <div className="animate-fade-in">
            <AgentReasoningView isAnalyzing={isAnalyzing} pipelineStep={pipelineStep} useAI={useAI} />
          </div>
        )}

        {/* ===== TABS ===== */}
        <div className="flex items-center gap-1 bg-[#111827] p-1 rounded-xl border border-slate-800 w-fit">
          <button onClick={() => setActiveTab('input')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'input' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}>
            <Play className="w-3 h-3" /> Watch History
          </button>
          <button onClick={() => setActiveTab('analysis')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'analysis' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}>
            <Bot className="w-3 h-3" /> AI Analysis
            {analysisResult.aiPowered && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
          <button onClick={() => setActiveTab('compare')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'compare' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}>
            <Columns className="w-3 h-3" /> Compare
          </button>
        </div>

        {/* ===== TAB CONTENT ===== */}
        {activeTab === 'input' && (
          <div className="animate-fade-in">
            <ReelFeedViewer
              reels={currentProfile.reels}
              onUpdateReel={handleUpdateReel}
              onDeleteReel={handleDeleteReel}
              isCustomMode={isCustomMode}
            />
            {/* CTA to run analysis */}
            <div className="mt-4 flex justify-center">
              <button onClick={triggerAnalysis} disabled={isAnalyzing}
                className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                {isAnalyzing ? 'Analyzing...' : 'Analyze This Student →'}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="space-y-5 animate-fade-in">
            {/* Download Report Button */}
            <div className="flex justify-end">
              <button onClick={downloadReport}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all hover:border-indigo-500/40">
                <Download className="w-3.5 h-3.5" /> Download Report
              </button>
            </div>

            {/* Profile Summary */}
            <StudentProfileSummary
              summary={analysisResult.summary}
              profileName={currentProfile.name}
              aiPowered={analysisResult.aiPowered || false}
            />

            {/* Reel-by-Reel Cards */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Reel-by-Reel Inference
                  </h3>
                  {analysisResult.aiPowered && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ✦ AI-POWERED
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {analysisResult.reelAnalyses.length} Cards
                </span>
              </div>

              {analysisResult.reelAnalyses.map((analysis, idx) => (
                <RecommendationCard key={analysis.reelId || idx} analysis={analysis} index={idx} onAccept={handleAcceptRecommendation} />
              ))}
            </div>
          </div>
        )}
      {/* ===== COMPARE TAB ===== */}
        {activeTab === 'compare' && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-xs text-indigo-300 flex items-center gap-2">
              <Columns className="w-4 h-4 shrink-0" />
              <span>Side-by-side comparison: <strong>Heuristic (keyword-based)</strong> vs <strong>Gemini AI (deep inference)</strong> for the same student.</span>
            </div>

            {/* Compare Summaries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Heuristic Side */}
              <div className="bg-amber-950/15 border border-amber-800/30 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-amber-800/30">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-amber-300">⚡ Heuristic Engine</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">Keyword-Based</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-400/70 font-semibold mb-1">Core Cluster</p>
                    <p className="text-xs text-slate-300">{heuristicResult.summary.coreCluster}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-400/70 font-semibold mb-1">Skill Level</p>
                    <p className="text-xs text-white font-medium">{heuristicResult.summary.skillLevel}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-400/70 font-semibold mb-1">Top 3 Recommendations</p>
                    {heuristicResult.summary.priorityReels.map((r, i) => (
                      <div key={i} className="text-xs text-slate-300 py-1 border-b border-amber-900/20 last:border-0">
                        <span className="text-amber-300 font-semibold">{i + 1}.</span> {r.reel}
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-400/70 font-semibold mb-1">Sample Reel Inference</p>
                    {heuristicResult.reelAnalyses.slice(0, 2).map((a, i) => (
                      <div key={i} className="text-xs text-slate-400 py-1.5 border-b border-amber-900/20 last:border-0">
                        <p className="text-slate-300 font-medium">"{a.currentReel}"</p>
                        <p className="mt-0.5">→ Interest: <span className="text-amber-300">{a.interestDetected}</span></p>
                        <p>→ Recommends: <span className="text-amber-200">{a.recommendedReel}</span></p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI Side */}
              <div className="bg-emerald-950/15 border border-emerald-800/30 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-emerald-800/30">
                  <Brain className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-emerald-300">✦ Gemini AI Engine</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Deep Inference</span>
                </div>
                {aiResult ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold mb-1">Core Cluster</p>
                      <p className="text-xs text-slate-300">{aiResult.summary.coreCluster}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold mb-1">Skill Level</p>
                      <p className="text-xs text-white font-medium">{aiResult.summary.skillLevel}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold mb-1">Top 3 Recommendations</p>
                      {aiResult.summary.priorityReels.map((r, i) => (
                        <div key={i} className="text-xs text-slate-300 py-1 border-b border-emerald-900/20 last:border-0">
                          <span className="text-emerald-300 font-semibold">{i + 1}.</span> {r.reel}
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold mb-1">Sample Reel Inference</p>
                      {aiResult.reelAnalyses.slice(0, 2).map((a, i) => (
                        <div key={i} className="text-xs text-slate-400 py-1.5 border-b border-emerald-900/20 last:border-0">
                          <p className="text-slate-300 font-medium">"{a.currentReel}"</p>
                          <p className="mt-0.5">→ Interest: <span className="text-emerald-300">{a.interestDetected}</span></p>
                          <p>→ Recommends: <span className="text-emerald-200">{a.recommendedReel}</span></p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Brain className="w-8 h-8 text-slate-600 mb-3" />
                    <p className="text-sm text-slate-400 font-medium">No AI results yet</p>
                    <p className="text-xs text-slate-500 mt-1">Click "✦ Run AI" to generate AI analysis for comparison</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ===== TRAP TOAST ===== */}
      {trapToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm p-4 rounded-xl bg-rose-950/90 border border-rose-700/60 shadow-2xl animate-slide-up flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-200">Trap Alert!</p>
            <p className="text-xs text-rose-300/80 mt-1">{trapToast}</p>
          </div>
          <button onClick={() => setTrapToast(null)} className="text-rose-500 hover:text-rose-300 text-xs shrink-0">✕</button>
        </div>
      )}

      {/* ===== BROWSE LIBRARY MODAL ===== */}
      {browseLibraryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0E1524] border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60">
              <h3 className="text-sm font-bold text-white">Browse Reel Library — Click to Add</h3>
              <button onClick={() => setBrowseLibraryOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-3 border-b border-slate-800">
              <input
                type="text" placeholder="Search reels..."
                value={librarySearch} onChange={e => setLibrarySearch(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="overflow-y-auto flex-1 p-3 space-y-2">
              {REEL_LIBRARY.filter(r =>
                !librarySearch || r.title.toLowerCase().includes(librarySearch.toLowerCase()) ||
                r.tags.some(t => t.toLowerCase().includes(librarySearch.toLowerCase()))
              ).map(reel => (
                <button key={reel.id}
                  onClick={() => {
                    handleAddReel({
                      id: `lib-${reel.id}-${Date.now()}`,
                      title: reel.title,
                      tags: reel.tags,
                      watchPercentage: 80,
                      liked: false, saved: false, replayed: false, skipped: false
                    });
                    setBrowseLibraryOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/60 transition-all text-left"
                >
                  <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">{reel.id}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{reel.title}</p>
                    <p className="text-[10px] text-slate-500 truncate">{reel.tags.join(', ')}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 shrink-0">{reel.category}</span>
                  <PlusCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <CustomReelModal isOpen={isAddReelOpen} onClose={() => setIsAddReelOpen(false)} onAddReel={(reel) => {
        handleAddReel(reel);
        // Feature #7: Trap toast
        const trapKeywords = ['hack', 'secret', 'trick', 'you won\'t believe', 'shocking', 'mindblowing', '10 tools', '5 apps', 'get rich'];
        const combined = (reel.title + ' ' + reel.tags.join(' ')).toLowerCase();
        if (trapKeywords.some(k => combined.includes(k))) {
          setTrapToast(`"${reel.title}" looks like clickbait. Consider watching substantive, concept-driven content instead.`);
          setTimeout(() => setTrapToast(null), 5000);
        }
      }} />
    </div>
  );
}



import React, { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Link } from 'react-router-dom';
import {
  Sparkles, Bot, ShieldCheck, ChevronDown, ChevronRight,
  Play, Brain, Zap, Eye, BookOpen, Terminal, ArrowRight, Download, PlusCircle,
  Columns, AlertTriangle, Search
} from 'lucide-react';
import { SAMPLE_PROFILES } from '../data/sampleProfiles';
import { REEL_LIBRARY } from '../data/reelLibrary';
import { analyzeStudentProfile } from '../services/recommendationEngine';
import { analyzeWithGemini, transformGeminiResponse } from '../services/geminiService';
import { ReelFeedViewer } from '../components/ReelFeedViewer';
import { AgentReasoningView } from '../components/AgentReasoningView';
import { RecommendationCard } from '../components/RecommendationCard';
import { StudentProfileSummary } from '../components/StudentProfileSummary';
import { CustomReelModal } from '../components/CustomReelModal';

export function DashboardPage() {
  const [activeProfileId, setActiveProfileId] = useState('profile-swe');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customReels, setCustomReels] = useState(SAMPLE_PROFILES[0].reels);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // AI Mode State
  const [useAI, setUseAI] = useState(true);
  const [apiKey, setApiKey] = useState(() => import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key') || '');
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [pipelineStep, setPipelineStep] = useState(-1);

  // UI State
  const [activeTab, setActiveTab] = useState('input'); // 'input' | 'analysis' | 'compare'
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isAddReelOpen, setIsAddReelOpen] = useState(false);
  const [showPipeline, setShowPipeline] = useState(false);
  const [browseLibraryOpen, setBrowseLibraryOpen] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [trapToast, setTrapToast] = useState(null);

  useEffect(() => {
    if (apiKey) localStorage.setItem('gemini_api_key', apiKey);
  }, [apiKey]);

  // Active Profile
  const currentProfile = useMemo(() => {
    if (isCustomMode) {
      return {
        id: 'profile-custom', name: 'Custom Sandbox Student', avatar: '🛠️',
        tagline: 'Interactive sandbox with custom watch telemetry & signals', reels: customReels
      };
    }
    return SAMPLE_PROFILES.find(p => p.id === activeProfileId) || SAMPLE_PROFILES[0];
  }, [activeProfileId, isCustomMode, customReels]);

  const heuristicResult = useMemo(() => analyzeStudentProfile(currentProfile), [currentProfile]);
  const analysisResult = aiResult && useAI ? aiResult : heuristicResult;

  // Profile switch
  const handleSelectProfile = (profileId) => {
    setIsCustomMode(false);
    setActiveProfileId(profileId);
    setProfileDropdownOpen(false);
    setAiResult(null);
    setAiError(null);
    if (useAI && apiKey) {
      runAIAnalysis(profileId);
    } else {
      triggerCelebration();
    }
  };

  const handleToggleCustomMode = () => {
    if (!isCustomMode) setCustomReels(currentProfile.reels);
    setIsCustomMode(!isCustomMode);
    setProfileDropdownOpen(false);
    setAiResult(null);
    setAiError(null);
  };

  const handleUpdateReel = (reelId, updates) => {
    if (isCustomMode) {
      setCustomReels(prev => prev.map(r => (r.id === reelId ? { ...r, ...updates } : r)));
    } else {
      setIsCustomMode(true);
      setCustomReels(currentProfile.reels.map(r => (r.id === reelId ? { ...r, ...updates } : r)));
    }
    setAiResult(null);
  };

  const handleDeleteReel = (reelId) => { setCustomReels(prev => prev.filter(r => r.id !== reelId)); setAiResult(null); };
  const handleAddReel = (newReel) => { setCustomReels(prev => [newReel, ...prev]); setAiResult(null); };

  // Accept a recommendation → add it to the watch history
  const handleAcceptRecommendation = (analysis) => {
    const newReel = {
      id: `accepted-${Date.now()}`,
      title: analysis.recommendedReelObj?.title || analysis.recommendedReel,
      tags: analysis.recommendedReelObj?.tags || [analysis.category],
      watchPercentage: 85,
      liked: true,
      saved: false,
      replayed: false,
      skipped: false
    };
    if (!isCustomMode) {
      setIsCustomMode(true);
      setCustomReels([...currentProfile.reels, newReel]);
    } else {
      setCustomReels(prev => [...prev, newReel]);
    }
    setAiResult(null);
    setActiveTab('input');
  };

  // Download analysis report
  const downloadReport = () => {
    const lines = [
      `ANALYSIS REPORT — ${currentProfile.name}`,
      `Engine: ${analysisResult.aiPowered ? 'Gemini AI' : 'Heuristic'}`,
      `Date: ${new Date().toLocaleString()}`,
      `${'='.repeat(80)}`,
      '',
      'STUDENT PROFILE SUMMARY',
      `Core Interest Cluster: ${analysisResult.summary.coreCluster}`,
      `Skill Level: ${analysisResult.summary.skillLevel}`,
      `Blind Spots: ${analysisResult.summary.blindSpots}`,
      '',
      `${'='.repeat(80)}`,
      '',
      'CURRENT REEL | INTEREST DETECTED | WHY | RECOMMENDED TECH REEL | CATEGORY | WHY THIS RECOMMENDATION | DIFFICULTY | CONFIDENCE',
      '-'.repeat(120),
    ];
    analysisResult.reelAnalyses.forEach(a => {
      lines.push(
        `${a.currentReel} | ${a.interestDetected} | ${a.why} | ${a.recommendedReel} | ${a.category} | ${a.whyThisRecommendation} | ${a.difficulty} | ${a.confidence}`
      );
    });
    lines.push('', `${'='.repeat(80)}`);
    lines.push('', 'PRIORITY WATCHLIST');
    analysisResult.summary.priorityReels.forEach((p, i) => {
      lines.push(`${i + 1}. ${p.reel} — ${p.reason}`);
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reels-agent-report-${currentProfile.name.replace(/\s+/g, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Pipeline animation
  const runPipelineAnimation = useCallback(() => {
    return new Promise((resolve) => {
      const steps = [0, 1, 2, 3, 4];
      let i = 0;
      setPipelineStep(-1);
      setShowPipeline(true);
      const interval = setInterval(() => {
        if (i < steps.length) { setPipelineStep(steps[i]); i++; }
        else { clearInterval(interval); setPipelineStep(5); resolve(); }
      }, 500);
    });
  }, []);

  // AI Analysis
  const runAIAnalysis = useCallback(async (profileIdOverride) => {
    if (!apiKey) { setAiError("Please enter your Gemini API key first."); return; }
    setIsAnalyzing(true); setAiError(null); setAiResult(null);
    const animationDone = runPipelineAnimation();
    try {
      const targetProfile = profileIdOverride
        ? SAMPLE_PROFILES.find(p => p.id === profileIdOverride) || currentProfile
        : currentProfile;
      const geminiResult = await analyzeWithGemini(targetProfile, REEL_LIBRARY, apiKey);
      const transformed = transformGeminiResponse(geminiResult, targetProfile, REEL_LIBRARY);
      await animationDone;
      setAiResult(transformed);
      setActiveTab('analysis');
      try { confetti({ particleCount: 80, spread: 70, origin: { y: 0.8 }, colors: ['#6366F1', '#06B6D4', '#10B981', '#F59E0B'] }); } catch (e) {}
    } catch (err) {
      await animationDone;
      console.error("Gemini API error:", err);
      setAiError(err.message || "AI analysis failed. Falling back to heuristic engine.");
      setActiveTab('analysis');
    } finally { setIsAnalyzing(false); }
  }, [apiKey, currentProfile, runPipelineAnimation]);

  const triggerAnalysis = useCallback(() => {
    if (useAI && apiKey) { runAIAnalysis(); } else { triggerCelebration(); }
  }, [useAI, apiKey, runAIAnalysis]);

  const triggerCelebration = () => {
    setIsAnalyzing(true); setPipelineStep(-1); setShowPipeline(true);
    const steps = [0, 1, 2, 3, 4]; let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) { setPipelineStep(steps[i]); i++; }
      else {
        clearInterval(interval); setPipelineStep(5); setIsAnalyzing(false);
        setActiveTab('analysis');
        try { confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 }, colors: ['#6366F1', '#06B6D4', '#10B981'] }); } catch (e) {}
      }
    }, 300);
  };

  const handleToggleAI = () => {
    const newVal = !useAI; setUseAI(newVal); setAiResult(null); setAiError(null);
    if (newVal && apiKey) runAIAnalysis();
  };

  const selectedProfileObj = SAMPLE_PROFILES.find(p => p.id === activeProfileId) || SAMPLE_PROFILES[0];

  return (
    <div className="min-h-screen bg-[#0A0E17] text-slate-100 flex flex-col">
      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#0B0F17]/95 backdrop-blur-md px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-400 p-[1px] flex items-center justify-center">
              <div className="w-full h-full bg-[#0D1322] rounded-[7px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
            </div>
            <span className="font-bold text-white text-sm hidden sm:block">
              Reels<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Agent</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <button onClick={handleToggleAI}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                useAI ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' : 'bg-slate-800/80 text-slate-400 border-slate-700'
              }`}>
              {useAI ? <Brain className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
              <span className="hidden sm:inline">{useAI ? '✦ AI Mode' : 'Heuristic'}</span>
            </button>
            <Link to="/library" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all">
              <BookOpen className="w-3 h-3" /><span className="hidden sm:inline">Library</span>
            </Link>
            <Link to="/prompt" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all">
              <Terminal className="w-3 h-3" /><span className="hidden sm:inline">Agent Brain</span>
            </Link>
            <button onClick={triggerAnalysis} disabled={isAnalyzing}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold shadow-md transition-all ${
                isAnalyzing ? 'bg-indigo-700 text-indigo-200 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-indigo-500/25 active:scale-95'
              }`}>
              <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAnalyzing ? 'Analyzing...' : useAI ? '✦ Run AI' : 'Run Agent'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ===== MAIN ===== */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 space-y-4">

        {/* AI Error */}
        {aiError && useAI && (
          <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300 flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span><strong>AI Error:</strong> {aiError} — Heuristic fallback active.</span>
          </div>
        )}

        {/* ===== PROFILE SELECTOR & DEDICATED CUSTOM SANDBOX BUTTON ===== */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#111827] p-3 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0 hidden sm:inline">
              Persona:
            </span>
            <div className="relative flex-1 max-w-md">
              <button onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className={`w-full flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl border transition-all text-left ${
                  !isCustomMode 
                    ? 'bg-slate-900 border-indigo-500/40 text-white shadow-sm'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl shrink-0">{selectedProfileObj.avatar}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{selectedProfileObj.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{selectedProfileObj.tagline}</p>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#111827] border border-slate-700 rounded-xl shadow-2xl z-40 max-h-80 overflow-y-auto">
                  {SAMPLE_PROFILES.map(p => (
                    <button key={p.id} onClick={() => handleSelectProfile(p.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800/60 transition-colors text-left ${
                        activeProfileId === p.id && !isCustomMode ? 'bg-indigo-500/10 border-l-2 border-l-indigo-500' : ''
                      }`}>
                      <span className="text-lg">{p.avatar}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{p.tagline}</p>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">{p.reels.length} reels</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dedicated Custom Sandbox Button & Quick Tools */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleToggleCustomMode}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                isCustomMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 ring-1 ring-amber-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-amber-500/40'
              }`}
            >
              <span className="text-base">🛠️</span>
              <span>{isCustomMode ? 'Custom Sandbox (Active)' : 'Custom Sandbox'}</span>
            </button>

            {isCustomMode && (
              <>
                <button onClick={() => setIsAddReelOpen(true)}
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-500/20">
                  + Add Reel
                </button>
                <button onClick={() => setBrowseLibraryOpen(true)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all">
                  <Search className="w-3.5 h-3.5 inline mr-1" />Library
                </button>
              </>
            )}
          </div>
        </div>

        {/* ===== PIPELINE (collapsible) ===== */}
        {showPipeline && (
          <div className="animate-fade-in">
            <AgentReasoningView isAnalyzing={isAnalyzing} pipelineStep={pipelineStep} useAI={useAI} />
          </div>
        )}

        {/* ===== TABS ===== */}
        <div className="flex items-center gap-1 bg-[#111827] p-1 rounded-xl border border-slate-800 w-fit">
          <button onClick={() => setActiveTab('input')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'input' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}>
            <Play className="w-3 h-3" /> Watch History
          </button>
          <button onClick={() => setActiveTab('analysis')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'analysis' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}>
            <Bot className="w-3 h-3" /> AI Analysis
            {analysisResult.aiPowered && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
          <button onClick={() => setActiveTab('compare')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'compare' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}>
            <Columns className="w-3 h-3" /> Compare
          </button>
        </div>

        {/* ===== TAB CONTENT ===== */}
        {activeTab === 'input' && (
          <div className="animate-fade-in">
            <ReelFeedViewer
              reels={currentProfile.reels}
              onUpdateReel={handleUpdateReel}
              onDeleteReel={handleDeleteReel}
              isCustomMode={isCustomMode}
            />
            {/* CTA to run analysis */}
            <div className="mt-4 flex justify-center">
              <button onClick={triggerAnalysis} disabled={isAnalyzing}
                className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                {isAnalyzing ? 'Analyzing...' : 'Analyze This Student →'}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="space-y-5 animate-fade-in">
            {/* Download Report Button */}
            <div className="flex justify-end">
              <button onClick={downloadReport}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all hover:border-indigo-500/40">
                <Download className="w-3.5 h-3.5" /> Download Report
              </button>
            </div>

            {/* Profile Summary */}
            <StudentProfileSummary
              summary={analysisResult.summary}
              profileName={currentProfile.name}
              aiPowered={analysisResult.aiPowered || false}
            />

            {/* Reel-by-Reel Cards */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Reel-by-Reel Inference
                  </h3>
                  {analysisResult.aiPowered && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ✦ AI-POWERED
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {analysisResult.reelAnalyses.length} Cards
                </span>
              </div>

              {analysisResult.reelAnalyses.map((analysis, idx) => (
                <RecommendationCard key={analysis.reelId || idx} analysis={analysis} index={idx} onAccept={handleAcceptRecommendation} />
              ))}
            </div>
          </div>
        )}
      {/* ===== COMPARE TAB ===== */}
        {activeTab === 'compare' && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-xs text-indigo-300 flex items-center gap-2">
              <Columns className="w-4 h-4 shrink-0" />
              <span>Side-by-side comparison: <strong>Heuristic (keyword-based)</strong> vs <strong>Gemini AI (deep inference)</strong> for the same student.</span>
            </div>

            {/* Compare Summaries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Heuristic Side */}
              <div className="bg-amber-950/15 border border-amber-800/30 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-amber-800/30">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-amber-300">⚡ Heuristic Engine</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">Keyword-Based</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-400/70 font-semibold mb-1">Core Cluster</p>
                    <p className="text-xs text-slate-300">{heuristicResult.summary.coreCluster}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-400/70 font-semibold mb-1">Skill Level</p>
                    <p className="text-xs text-white font-medium">{heuristicResult.summary.skillLevel}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-400/70 font-semibold mb-1">Top 3 Recommendations</p>
                    {heuristicResult.summary.priorityReels.map((r, i) => (
                      <div key={i} className="text-xs text-slate-300 py-1 border-b border-amber-900/20 last:border-0">
                        <span className="text-amber-300 font-semibold">{i + 1}.</span> {r.reel}
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-400/70 font-semibold mb-1">Sample Reel Inference</p>
                    {heuristicResult.reelAnalyses.slice(0, 2).map((a, i) => (
                      <div key={i} className="text-xs text-slate-400 py-1.5 border-b border-amber-900/20 last:border-0">
                        <p className="text-slate-300 font-medium">"{a.currentReel}"</p>
                        <p className="mt-0.5">→ Interest: <span className="text-amber-300">{a.interestDetected}</span></p>
                        <p>→ Recommends: <span className="text-amber-200">{a.recommendedReel}</span></p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI Side */}
              <div className="bg-emerald-950/15 border border-emerald-800/30 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-emerald-800/30">
                  <Brain className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-emerald-300">✦ Gemini AI Engine</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Deep Inference</span>
                </div>
                {aiResult ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold mb-1">Core Cluster</p>
                      <p className="text-xs text-slate-300">{aiResult.summary.coreCluster}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold mb-1">Skill Level</p>
                      <p className="text-xs text-white font-medium">{aiResult.summary.skillLevel}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold mb-1">Top 3 Recommendations</p>
                      {aiResult.summary.priorityReels.map((r, i) => (
                        <div key={i} className="text-xs text-slate-300 py-1 border-b border-emerald-900/20 last:border-0">
                          <span className="text-emerald-300 font-semibold">{i + 1}.</span> {r.reel}
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold mb-1">Sample Reel Inference</p>
                      {aiResult.reelAnalyses.slice(0, 2).map((a, i) => (
                        <div key={i} className="text-xs text-slate-400 py-1.5 border-b border-emerald-900/20 last:border-0">
                          <p className="text-slate-300 font-medium">"{a.currentReel}"</p>
                          <p className="mt-0.5">→ Interest: <span className="text-emerald-300">{a.interestDetected}</span></p>
                          <p>→ Recommends: <span className="text-emerald-200">{a.recommendedReel}</span></p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Brain className="w-8 h-8 text-slate-600 mb-3" />
                    <p className="text-sm text-slate-400 font-medium">No AI results yet</p>
                    <p className="text-xs text-slate-500 mt-1">Click "✦ Run AI" to generate AI analysis for comparison</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ===== TRAP TOAST ===== */}
      {trapToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm p-4 rounded-xl bg-rose-950/90 border border-rose-700/60 shadow-2xl animate-slide-up flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-200">Trap Alert!</p>
            <p className="text-xs text-rose-300/80 mt-1">{trapToast}</p>
          </div>
          <button onClick={() => setTrapToast(null)} className="text-rose-500 hover:text-rose-300 text-xs shrink-0">✕</button>
        </div>
      )}

      {/* ===== BROWSE LIBRARY MODAL ===== */}
      {browseLibraryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0E1524] border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60">
              <h3 className="text-sm font-bold text-white">Browse Reel Library — Click to Add</h3>
              <button onClick={() => setBrowseLibraryOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-3 border-b border-slate-800">
              <input
                type="text" placeholder="Search reels..."
                value={librarySearch} onChange={e => setLibrarySearch(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="overflow-y-auto flex-1 p-3 space-y-2">
              {REEL_LIBRARY.filter(r =>
                !librarySearch || r.title.toLowerCase().includes(librarySearch.toLowerCase()) ||
                r.tags.some(t => t.toLowerCase().includes(librarySearch.toLowerCase()))
              ).map(reel => (
                <button key={reel.id}
                  onClick={() => {
                    handleAddReel({
                      id: `lib-${reel.id}-${Date.now()}`,
                      title: reel.title,
                      tags: reel.tags,
                      watchPercentage: 80,
                      liked: false, saved: false, replayed: false, skipped: false
                    });
                    setBrowseLibraryOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/60 transition-all text-left"
                >
                  <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">{reel.id}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{reel.title}</p>
                    <p className="text-[10px] text-slate-500 truncate">{reel.tags.join(', ')}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 shrink-0">{reel.category}</span>
                  <PlusCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <CustomReelModal isOpen={isAddReelOpen} onClose={() => setIsAddReelOpen(false)} onAddReel={(reel) => {
        handleAddReel(reel);
        // Feature #7: Trap toast
        const trapKeywords = ['hack', 'secret', 'trick', 'you won\'t believe', 'shocking', 'mindblowing', '10 tools', '5 apps', 'get rich'];
        const combined = (reel.title + ' ' + reel.tags.join(' ')).toLowerCase();
        if (trapKeywords.some(k => combined.includes(k))) {
          setTrapToast(`"${reel.title}" looks like clickbait. Consider watching substantive, concept-driven content instead.`);
          setTimeout(() => setTrapToast(null), 5000);
        }
      }} />
    </div>
  );
}
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Link } from 'react-router-dom';
import {
  Sparkles, Bot, ShieldCheck, ChevronDown, ChevronRight,
  Play, Brain, Zap, Eye, BookOpen, Terminal, ArrowRight, Download, PlusCircle,
  Columns, AlertTriangle, Search
} from 'lucide-react';
import { SAMPLE_PROFILES } from '../data/sampleProfiles';
import { REEL_LIBRARY } from '../data/reelLibrary';
import { analyzeStudentProfile } from '../services/recommendationEngine';
import { analyzeWithGemini, transformGeminiResponse } from '../services/geminiService';
import { ReelFeedViewer } from '../components/ReelFeedViewer';
import { AgentReasoningView } from '../components/AgentReasoningView';
import { RecommendationCard } from '../components/RecommendationCard';
import { StudentProfileSummary } from '../components/StudentProfileSummary';
import { CustomReelModal } from '../components/CustomReelModal';

export function DashboardPage() {
  const [activeProfileId, setActiveProfileId] = useState('profile-swe');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customReels, setCustomReels] = useState(SAMPLE_PROFILES[0].reels);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // AI Mode State
  const [useAI, setUseAI] = useState(true);
  const [apiKey, setApiKey] = useState(() => import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key') || '');
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [pipelineStep, setPipelineStep] = useState(-1);

  // UI State
  const [activeTab, setActiveTab] = useState('input'); // 'input' | 'analysis' | 'compare'
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isAddReelOpen, setIsAddReelOpen] = useState(false);
  const [showPipeline, setShowPipeline] = useState(false);
  const [browseLibraryOpen, setBrowseLibraryOpen] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [trapToast, setTrapToast] = useState(null);

  useEffect(() => {
    if (apiKey) localStorage.setItem('gemini_api_key', apiKey);
  }, [apiKey]);

  // Active Profile
  const currentProfile = useMemo(() => {
    if (isCustomMode) {
      return {
        id: 'profile-custom', name: 'Custom Sandbox Student', avatar: '🛠️',
        tagline: 'Interactive sandbox with custom watch telemetry & signals', reels: customReels
      };
    }
    return SAMPLE_PROFILES.find(p => p.id === activeProfileId) || SAMPLE_PROFILES[0];
  }, [activeProfileId, isCustomMode, customReels]);

  const heuristicResult = useMemo(() => analyzeStudentProfile(currentProfile), [currentProfile]);
  const analysisResult = aiResult && useAI ? aiResult : heuristicResult;

  // Profile switch
  const handleSelectProfile = (profileId) => {
    setIsCustomMode(false);
    setActiveProfileId(profileId);
    setProfileDropdownOpen(false);
    setAiResult(null);
    setAiError(null);
    if (useAI && apiKey) {
      runAIAnalysis(profileId);
    } else {
      triggerCelebration();
    }
  };

  const handleToggleCustomMode = () => {
    if (!isCustomMode) setCustomReels(currentProfile.reels);
    setIsCustomMode(!isCustomMode);
    setProfileDropdownOpen(false);
    setAiResult(null);
    setAiError(null);
  };

  const handleUpdateReel = (reelId, updates) => {
    if (isCustomMode) {
      setCustomReels(prev => prev.map(r => (r.id === reelId ? { ...r, ...updates } : r)));
    } else {
      setIsCustomMode(true);
      setCustomReels(currentProfile.reels.map(r => (r.id === reelId ? { ...r, ...updates } : r)));
    }
    setAiResult(null);
  };

  const handleDeleteReel = (reelId) => { setCustomReels(prev => prev.filter(r => r.id !== reelId)); setAiResult(null); };
  const handleAddReel = (newReel) => { setCustomReels(prev => [newReel, ...prev]); setAiResult(null); };

  // Accept a recommendation → add it to the watch history
  const handleAcceptRecommendation = (analysis) => {
    const newReel = {
      id: `accepted-${Date.now()}`,
      title: analysis.recommendedReelObj?.title || analysis.recommendedReel,
      tags: analysis.recommendedReelObj?.tags || [analysis.category],
      watchPercentage: 85,
      liked: true,
      saved: false,
      replayed: false,
      skipped: false
    };
    if (!isCustomMode) {
      setIsCustomMode(true);
      setCustomReels([...currentProfile.reels, newReel]);
    } else {
      setCustomReels(prev => [...prev, newReel]);
    }
    setAiResult(null);
    setActiveTab('input');
  };

  // Download analysis report
  const downloadReport = () => {
    const lines = [
      `ANALYSIS REPORT — ${currentProfile.name}`,
      `Engine: ${analysisResult.aiPowered ? 'Gemini AI' : 'Heuristic'}`,
      `Date: ${new Date().toLocaleString()}`,
      `${'='.repeat(80)}`,
      '',
      'STUDENT PROFILE SUMMARY',
      `Core Interest Cluster: ${analysisResult.summary.coreCluster}`,
      `Skill Level: ${analysisResult.summary.skillLevel}`,
      `Blind Spots: ${analysisResult.summary.blindSpots}`,
      '',
      `${'='.repeat(80)}`,
      '',
      'CURRENT REEL | INTEREST DETECTED | WHY | RECOMMENDED TECH REEL | CATEGORY | WHY THIS RECOMMENDATION | DIFFICULTY | CONFIDENCE',
      '-'.repeat(120),
    ];
    analysisResult.reelAnalyses.forEach(a => {
      lines.push(
        `${a.currentReel} | ${a.interestDetected} | ${a.why} | ${a.recommendedReel} | ${a.category} | ${a.whyThisRecommendation} | ${a.difficulty} | ${a.confidence}`
      );
    });
    lines.push('', `${'='.repeat(80)}`);
    lines.push('', 'PRIORITY WATCHLIST');
    analysisResult.summary.priorityReels.forEach((p, i) => {
      lines.push(`${i + 1}. ${p.reel} — ${p.reason}`);
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reels-agent-report-${currentProfile.name.replace(/\s+/g, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Pipeline animation
  const runPipelineAnimation = useCallback(() => {
    return new Promise((resolve) => {
      const steps = [0, 1, 2, 3, 4];
      let i = 0;
      setPipelineStep(-1);
      setShowPipeline(true);
      const interval = setInterval(() => {
        if (i < steps.length) { setPipelineStep(steps[i]); i++; }
        else { clearInterval(interval); setPipelineStep(5); resolve(); }
      }, 500);
    });
  }, []);

  // AI Analysis
  const runAIAnalysis = useCallback(async (profileIdOverride) => {
    if (!apiKey) { setAiError("Please enter your Gemini API key first."); return; }
    setIsAnalyzing(true); setAiError(null); setAiResult(null);
    const animationDone = runPipelineAnimation();
    try {
      const targetProfile = profileIdOverride
        ? SAMPLE_PROFILES.find(p => p.id === profileIdOverride) || currentProfile
        : currentProfile;
      const geminiResult = await analyzeWithGemini(targetProfile, REEL_LIBRARY, apiKey);
      const transformed = transformGeminiResponse(geminiResult, targetProfile, REEL_LIBRARY);
      await animationDone;
      setAiResult(transformed);
      setActiveTab('analysis');
      try { confetti({ particleCount: 80, spread: 70, origin: { y: 0.8 }, colors: ['#6366F1', '#06B6D4', '#10B981', '#F59E0B'] }); } catch (e) {}
    } catch (err) {
      await animationDone;
      console.error("Gemini API error:", err);
      setAiError(err.message || "AI analysis failed. Falling back to heuristic engine.");
      setActiveTab('analysis');
    } finally { setIsAnalyzing(false); }
  }, [apiKey, currentProfile, runPipelineAnimation]);

  const triggerAnalysis = useCallback(() => {
    if (useAI && apiKey) { runAIAnalysis(); } else { triggerCelebration(); }
  }, [useAI, apiKey, runAIAnalysis]);

  const triggerCelebration = () => {
    setIsAnalyzing(true); setPipelineStep(-1); setShowPipeline(true);
    const steps = [0, 1, 2, 3, 4]; let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) { setPipelineStep(steps[i]); i++; }
      else {
        clearInterval(interval); setPipelineStep(5); setIsAnalyzing(false);
        setActiveTab('analysis');
        try { confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 }, colors: ['#6366F1', '#06B6D4', '#10B981'] }); } catch (e) {}
      }
    }, 300);
  };

  const handleToggleAI = () => {
    const newVal = !useAI; setUseAI(newVal); setAiResult(null); setAiError(null);
    if (newVal && apiKey) runAIAnalysis();
  };

  const selectedProfileObj = SAMPLE_PROFILES.find(p => p.id === activeProfileId) || SAMPLE_PROFILES[0];

  return (
    <div className="min-h-screen bg-[#0A0E17] text-slate-100 flex flex-col">
      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#0B0F17]/95 backdrop-blur-md px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-400 p-[1px] flex items-center justify-center">
              <div className="w-full h-full bg-[#0D1322] rounded-[7px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
            </div>
            <span className="font-bold text-white text-sm hidden sm:block">
              Reels<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Agent</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <button onClick={handleToggleAI}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                useAI ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' : 'bg-slate-800/80 text-slate-400 border-slate-700'
              }`}>
              {useAI ? <Brain className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
              <span className="hidden sm:inline">{useAI ? '✦ AI Mode' : 'Heuristic'}</span>
            </button>
            <Link to="/library" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all">
              <BookOpen className="w-3 h-3" /><span className="hidden sm:inline">Library</span>
            </Link>
            <Link to="/prompt" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all">
              <Terminal className="w-3 h-3" /><span className="hidden sm:inline">Agent Brain</span>
            </Link>
            <button onClick={triggerAnalysis} disabled={isAnalyzing}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold shadow-md transition-all ${
                isAnalyzing ? 'bg-indigo-700 text-indigo-200 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-indigo-500/25 active:scale-95'
              }`}>
              <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAnalyzing ? 'Analyzing...' : useAI ? '✦ Run AI' : 'Run Agent'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ===== MAIN ===== */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 space-y-4">

        {/* AI Error */}
        {aiError && useAI && (
          <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300 flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span><strong>AI Error:</strong> {aiError} — Heuristic fallback active.</span>
          </div>
        )}

        {/* ===== PROFILE SELECTOR & DEDICATED CUSTOM SANDBOX BUTTON ===== */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#111827] p-3 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0 hidden sm:inline">
              Persona:
            </span>
            <div className="relative flex-1 max-w-md">
              <button onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className={`w-full flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl border transition-all text-left ${
                  !isCustomMode 
                    ? 'bg-slate-900 border-indigo-500/40 text-white shadow-sm'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl shrink-0">{selectedProfileObj.avatar}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{selectedProfileObj.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{selectedProfileObj.tagline}</p>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#111827] border border-slate-700 rounded-xl shadow-2xl z-40 max-h-80 overflow-y-auto">
                  {SAMPLE_PROFILES.map(p => (
                    <button key={p.id} onClick={() => handleSelectProfile(p.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800/60 transition-colors text-left ${
                        activeProfileId === p.id && !isCustomMode ? 'bg-indigo-500/10 border-l-2 border-l-indigo-500' : ''
                      }`}>
                      <span className="text-lg">{p.avatar}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{p.tagline}</p>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">{p.reels.length} reels</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dedicated Custom Sandbox Button & Quick Tools */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleToggleCustomMode}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                isCustomMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 ring-1 ring-amber-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-amber-500/40'
              }`}
            >
              <span className="text-base">🛠️</span>
              <span>{isCustomMode ? 'Custom Sandbox (Active)' : 'Custom Sandbox'}</span>
            </button>

            {isCustomMode && (
              <>
                <button onClick={() => setIsAddReelOpen(true)}
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-500/20">
                  + Add Reel
                </button>
                <button onClick={() => setBrowseLibraryOpen(true)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all">
                  <Search className="w-3.5 h-3.5 inline mr-1" />Library
                </button>
              </>
            )}
          </div>
        </div>

        {/* ===== PIPELINE (collapsible) ===== */}
        {showPipeline && (
          <div className="animate-fade-in">
            <AgentReasoningView isAnalyzing={isAnalyzing} pipelineStep={pipelineStep} useAI={useAI} />
          </div>
        )}

        {/* ===== TABS ===== */}
        <div className="flex items-center gap-1 bg-[#111827] p-1 rounded-xl border border-slate-800 w-fit">
          <button onClick={() => setActiveTab('input')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'input' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}>
            <Play className="w-3 h-3" /> Watch History
          </button>
          <button onClick={() => setActiveTab('analysis')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'analysis' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}>
            <Bot className="w-3 h-3" /> AI Analysis
            {analysisResult.aiPowered && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
          <button onClick={() => setActiveTab('compare')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'compare' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}>
            <Columns className="w-3 h-3" /> Compare
          </button>
        </div>

        {/* ===== TAB CONTENT ===== */}
        {activeTab === 'input' && (
          <div className="animate-fade-in">
            <ReelFeedViewer
              reels={currentProfile.reels}
              onUpdateReel={handleUpdateReel}
              onDeleteReel={handleDeleteReel}
              isCustomMode={isCustomMode}
            />
            {/* CTA to run analysis */}
            <div className="mt-4 flex justify-center">
              <button onClick={triggerAnalysis} disabled={isAnalyzing}
                className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                {isAnalyzing ? 'Analyzing...' : 'Analyze This Student →'}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="space-y-5 animate-fade-in">
            {/* Download Report Button */}
            <div className="flex justify-end">
              <button onClick={downloadReport}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all hover:border-indigo-500/40">
                <Download className="w-3.5 h-3.5" /> Download Report
              </button>
            </div>

            {/* Profile Summary */}
            <StudentProfileSummary
              summary={analysisResult.summary}
              profileName={currentProfile.name}
              aiPowered={analysisResult.aiPowered || false}
            />

            {/* Reel-by-Reel Cards */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Reel-by-Reel Inference
                  </h3>
                  {analysisResult.aiPowered && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ✦ AI-POWERED
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {analysisResult.reelAnalyses.length} Cards
                </span>
              </div>

              {analysisResult.reelAnalyses.map((analysis, idx) => (
                <RecommendationCard key={analysis.reelId || idx} analysis={analysis} index={idx} onAccept={handleAcceptRecommendation} />
              ))}
            </div>
          </div>
        )}
      {/* ===== COMPARE TAB ===== */}
        {activeTab === 'compare' && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-xs text-indigo-300 flex items-center gap-2">
              <Columns className="w-4 h-4 shrink-0" />
              <span>Side-by-side comparison: <strong>Heuristic (keyword-based)</strong> vs <strong>Gemini AI (deep inference)</strong> for the same student.</span>
            </div>

            {/* Compare Summaries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Heuristic Side */}
              <div className="bg-amber-950/15 border border-amber-800/30 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-amber-800/30">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-amber-300">⚡ Heuristic Engine</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">Keyword-Based</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-400/70 font-semibold mb-1">Core Cluster</p>
                    <p className="text-xs text-slate-300">{heuristicResult.summary.coreCluster}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-400/70 font-semibold mb-1">Skill Level</p>
                    <p className="text-xs text-white font-medium">{heuristicResult.summary.skillLevel}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-400/70 font-semibold mb-1">Top 3 Recommendations</p>
                    {heuristicResult.summary.priorityReels.map((r, i) => (
                      <div key={i} className="text-xs text-slate-300 py-1 border-b border-amber-900/20 last:border-0">
                        <span className="text-amber-300 font-semibold">{i + 1}.</span> {r.reel}
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-400/70 font-semibold mb-1">Sample Reel Inference</p>
                    {heuristicResult.reelAnalyses.slice(0, 2).map((a, i) => (
                      <div key={i} className="text-xs text-slate-400 py-1.5 border-b border-amber-900/20 last:border-0">
                        <p className="text-slate-300 font-medium">"{a.currentReel}"</p>
                        <p className="mt-0.5">→ Interest: <span className="text-amber-300">{a.interestDetected}</span></p>
                        <p>→ Recommends: <span className="text-amber-200">{a.recommendedReel}</span></p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI Side */}
              <div className="bg-emerald-950/15 border border-emerald-800/30 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-emerald-800/30">
                  <Brain className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-emerald-300">✦ Gemini AI Engine</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Deep Inference</span>
                </div>
                {aiResult ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold mb-1">Core Cluster</p>
                      <p className="text-xs text-slate-300">{aiResult.summary.coreCluster}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold mb-1">Skill Level</p>
                      <p className="text-xs text-white font-medium">{aiResult.summary.skillLevel}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold mb-1">Top 3 Recommendations</p>
                      {aiResult.summary.priorityReels.map((r, i) => (
                        <div key={i} className="text-xs text-slate-300 py-1 border-b border-emerald-900/20 last:border-0">
                          <span className="text-emerald-300 font-semibold">{i + 1}.</span> {r.reel}
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold mb-1">Sample Reel Inference</p>
                      {aiResult.reelAnalyses.slice(0, 2).map((a, i) => (
                        <div key={i} className="text-xs text-slate-400 py-1.5 border-b border-emerald-900/20 last:border-0">
                          <p className="text-slate-300 font-medium">"{a.currentReel}"</p>
                          <p className="mt-0.5">→ Interest: <span className="text-emerald-300">{a.interestDetected}</span></p>
                          <p>→ Recommends: <span className="text-emerald-200">{a.recommendedReel}</span></p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Brain className="w-8 h-8 text-slate-600 mb-3" />
                    <p className="text-sm text-slate-400 font-medium">No AI results yet</p>
                    <p className="text-xs text-slate-500 mt-1">Click "✦ Run AI" to generate AI analysis for comparison</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ===== TRAP TOAST ===== */}
      {trapToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm p-4 rounded-xl bg-rose-950/90 border border-rose-700/60 shadow-2xl animate-slide-up flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-200">Trap Alert!</p>
            <p className="text-xs text-rose-300/80 mt-1">{trapToast}</p>
          </div>
          <button onClick={() => setTrapToast(null)} className="text-rose-500 hover:text-rose-300 text-xs shrink-0">✕</button>
        </div>
      )}

      {/* ===== BROWSE LIBRARY MODAL ===== */}
      {browseLibraryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0E1524] border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60">
              <h3 className="text-sm font-bold text-white">Browse Reel Library — Click to Add</h3>
              <button onClick={() => setBrowseLibraryOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-3 border-b border-slate-800">
              <input
                type="text" placeholder="Search reels..."
                value={librarySearch} onChange={e => setLibrarySearch(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="overflow-y-auto flex-1 p-3 space-y-2">
              {REEL_LIBRARY.filter(r =>
                !librarySearch || r.title.toLowerCase().includes(librarySearch.toLowerCase()) ||
                r.tags.some(t => t.toLowerCase().includes(librarySearch.toLowerCase()))
              ).map(reel => (
                <button key={reel.id}
                  onClick={() => {
                    handleAddReel({
                      id: `lib-${reel.id}-${Date.now()}`,
                      title: reel.title,
                      tags: reel.tags,
                      watchPercentage: 80,
                      liked: false, saved: false, replayed: false, skipped: false
                    });
                    setBrowseLibraryOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/60 transition-all text-left"
                >
                  <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">{reel.id}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{reel.title}</p>
                    <p className="text-[10px] text-slate-500 truncate">{reel.tags.join(', ')}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 shrink-0">{reel.category}</span>
                  <PlusCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <CustomReelModal isOpen={isAddReelOpen} onClose={() => setIsAddReelOpen(false)} onAddReel={(reel) => {
        handleAddReel(reel);
        // Feature #7: Trap toast
        const trapKeywords = ['hack', 'secret', 'trick', 'you won\'t believe', 'shocking', 'mindblowing', '10 tools', '5 apps', 'get rich'];
        const combined = (reel.title + ' ' + reel.tags.join(' ')).toLowerCase();
        if (trapKeywords.some(k => combined.includes(k))) {
          setTrapToast(`"${reel.title}" looks like clickbait. Consider watching substantive, concept-driven content instead.`);
          setTimeout(() => setTrapToast(null), 5000);
        }
      }} />
    </div>
  );
}



import React, { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Link } from 'react-router-dom';
import {
  Sparkles, Bot, ShieldCheck, ChevronDown, ChevronRight,
  Play, Brain, Zap, Eye, BookOpen, Terminal, ArrowRight, Download, PlusCircle,
  Columns, AlertTriangle, Search
} from 'lucide-react';
import { SAMPLE_PROFILES } from '../data/sampleProfiles';
import { REEL_LIBRARY } from '../data/reelLibrary';
import { analyzeStudentProfile } from '../services/recommendationEngine';
import { analyzeWithGemini, transformGeminiResponse } from '../services/geminiService';
import { ReelFeedViewer } from '../components/ReelFeedViewer';
import { AgentReasoningView } from '../components/AgentReasoningView';
import { RecommendationCard } from '../components/RecommendationCard';
import { StudentProfileSummary } from '../components/StudentProfileSummary';
import { CustomReelModal } from '../components/CustomReelModal';

export function DashboardPage() {
  const [activeProfileId, setActiveProfileId] = useState('profile-swe');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customReels, setCustomReels] = useState(SAMPLE_PROFILES[0].reels);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // AI Mode State
  const [useAI, setUseAI] = useState(true);
  const [apiKey, setApiKey] = useState(() => import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key') || '');
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [pipelineStep, setPipelineStep] = useState(-1);

  // UI State
  const [activeTab, setActiveTab] = useState('input'); // 'input' | 'analysis' | 'compare'
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isAddReelOpen, setIsAddReelOpen] = useState(false);
  const [showPipeline, setShowPipeline] = useState(false);
  const [browseLibraryOpen, setBrowseLibraryOpen] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [trapToast, setTrapToast] = useState(null);

  useEffect(() => {
    if (apiKey) localStorage.setItem('gemini_api_key', apiKey);
  }, [apiKey]);

  // Active Profile
  const currentProfile = useMemo(() => {
    if (isCustomMode) {
      return {
        id: 'profile-custom', name: 'Custom Sandbox Student', avatar: '🛠️',
        tagline: 'Interactive sandbox with custom watch telemetry & signals', reels: customReels
      };
    }
    return SAMPLE_PROFILES.find(p => p.id === activeProfileId) || SAMPLE_PROFILES[0];
  }, [activeProfileId, isCustomMode, customReels]);

  const heuristicResult = useMemo(() => analyzeStudentProfile(currentProfile), [currentProfile]);
  const analysisResult = aiResult && useAI ? aiResult : heuristicResult;

  // Profile switch
  const handleSelectProfile = (profileId) => {
    setIsCustomMode(false);
    setActiveProfileId(profileId);
    setProfileDropdownOpen(false);
    setAiResult(null);
    setAiError(null);
    if (useAI && apiKey) {
      runAIAnalysis(profileId);
    } else {
      triggerCelebration();
    }
  };

  const handleToggleCustomMode = () => {
    if (!isCustomMode) setCustomReels(currentProfile.reels);
    setIsCustomMode(!isCustomMode);
    setProfileDropdownOpen(false);
    setAiResult(null);
    setAiError(null);
  };

  const handleUpdateReel = (reelId, updates) => {
    if (isCustomMode) {
      setCustomReels(prev => prev.map(r => (r.id === reelId ? { ...r, ...updates } : r)));
    } else {
      setIsCustomMode(true);
      setCustomReels(currentProfile.reels.map(r => (r.id === reelId ? { ...r, ...updates } : r)));
    }
    setAiResult(null);
  };

  const handleDeleteReel = (reelId) => { setCustomReels(prev => prev.filter(r => r.id !== reelId)); setAiResult(null); };
  const handleAddReel = (newReel) => { setCustomReels(prev => [newReel, ...prev]); setAiResult(null); };

  // Accept a recommendation → add it to the watch history
  const handleAcceptRecommendation = (analysis) => {
    const newReel = {
      id: `accepted-${Date.now()}`,
      title: analysis.recommendedReelObj?.title || analysis.recommendedReel,
      tags: analysis.recommendedReelObj?.tags || [analysis.category],
      watchPercentage: 85,
      liked: true,
      saved: false,
      replayed: false,
      skipped: false
    };
    if (!isCustomMode) {
      setIsCustomMode(true);
      setCustomReels([...currentProfile.reels, newReel]);
    } else {
      setCustomReels(prev => [...prev, newReel]);
    }
    setAiResult(null);
    setActiveTab('input');
  };

  // Download analysis report
  const downloadReport = () => {
    const lines = [
      `ANALYSIS REPORT — ${currentProfile.name}`,
      `Engine: ${analysisResult.aiPowered ? 'Gemini AI' : 'Heuristic'}`,
      `Date: ${new Date().toLocaleString()}`,
      `${'='.repeat(80)}`,
      '',
      'STUDENT PROFILE SUMMARY',
      `Core Interest Cluster: ${analysisResult.summary.coreCluster}`,
      `Skill Level: ${analysisResult.summary.skillLevel}`,
      `Blind Spots: ${analysisResult.summary.blindSpots}`,
      '',
      `${'='.repeat(80)}`,
      '',
      'CURRENT REEL | INTEREST DETECTED | WHY | RECOMMENDED TECH REEL | CATEGORY | WHY THIS RECOMMENDATION | DIFFICULTY | CONFIDENCE',
      '-'.repeat(120),
    ];
    analysisResult.reelAnalyses.forEach(a => {
      lines.push(
        `${a.currentReel} | ${a.interestDetected} | ${a.why} | ${a.recommendedReel} | ${a.category} | ${a.whyThisRecommendation} | ${a.difficulty} | ${a.confidence}`
      );
    });
    lines.push('', `${'='.repeat(80)}`);
    lines.push('', 'PRIORITY WATCHLIST');
    analysisResult.summary.priorityReels.forEach((p, i) => {
      lines.push(`${i + 1}. ${p.reel} — ${p.reason}`);
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reels-agent-report-${currentProfile.name.replace(/\s+/g, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Pipeline animation
  const runPipelineAnimation = useCallback(() => {
    return new Promise((resolve) => {
      const steps = [0, 1, 2, 3, 4];
      let i = 0;
      setPipelineStep(-1);
      setShowPipeline(true);
      const interval = setInterval(() => {
        if (i < steps.length) { setPipelineStep(steps[i]); i++; }
        else { clearInterval(interval); setPipelineStep(5); resolve(); }
      }, 500);
    });
  }, []);

  // AI Analysis
  const runAIAnalysis = useCallback(async (profileIdOverride) => {
    if (!apiKey) { setAiError("Please enter your Gemini API key first."); return; }
    setIsAnalyzing(true); setAiError(null); setAiResult(null);
    const animationDone = runPipelineAnimation();
    try {
      const targetProfile = profileIdOverride
        ? SAMPLE_PROFILES.find(p => p.id === profileIdOverride) || currentProfile
        : currentProfile;
      const geminiResult = await analyzeWithGemini(targetProfile, REEL_LIBRARY, apiKey);
      const transformed = transformGeminiResponse(geminiResult, targetProfile, REEL_LIBRARY);
      await animationDone;
      setAiResult(transformed);
      setActiveTab('analysis');
      try { confetti({ particleCount: 80, spread: 70, origin: { y: 0.8 }, colors: ['#6366F1', '#06B6D4', '#10B981', '#F59E0B'] }); } catch (e) {}
    } catch (err) {
      await animationDone;
      console.error("Gemini API error:", err);
      setAiError(err.message || "AI analysis failed. Falling back to heuristic engine.");
      setActiveTab('analysis');
    } finally { setIsAnalyzing(false); }
  }, [apiKey, currentProfile, runPipelineAnimation]);

  const triggerAnalysis = useCallback(() => {
    if (useAI && apiKey) { runAIAnalysis(); } else { triggerCelebration(); }
  }, [useAI, apiKey, runAIAnalysis]);

  const triggerCelebration = () => {
    setIsAnalyzing(true); setPipelineStep(-1); setShowPipeline(true);
    const steps = [0, 1, 2, 3, 4]; let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) { setPipelineStep(steps[i]); i++; }
      else {
        clearInterval(interval); setPipelineStep(5); setIsAnalyzing(false);
        setActiveTab('analysis');
        try { confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 }, colors: ['#6366F1', '#06B6D4', '#10B981'] }); } catch (e) {}
      }
    }, 300);
  };

  const handleToggleAI = () => {
    const newVal = !useAI; setUseAI(newVal); setAiResult(null); setAiError(null);
    if (newVal && apiKey) runAIAnalysis();
  };

  const selectedProfileObj = SAMPLE_PROFILES.find(p => p.id === activeProfileId) || SAMPLE_PROFILES[0];

  return (
    <div className="min-h-screen bg-[#0A0E17] text-slate-100 flex flex-col">
      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#0B0F17]/95 backdrop-blur-md px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-400 p-[1px] flex items-center justify-center">
              <div className="w-full h-full bg-[#0D1322] rounded-[7px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
            </div>
            <span className="font-bold text-white text-sm hidden sm:block">
              Reels<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Agent</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <button onClick={handleToggleAI}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                useAI ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' : 'bg-slate-800/80 text-slate-400 border-slate-700'
              }`}>
              {useAI ? <Brain className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
              <span className="hidden sm:inline">{useAI ? '✦ AI Mode' : 'Heuristic'}</span>
            </button>
            <Link to="/library" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all">
              <BookOpen className="w-3 h-3" /><span className="hidden sm:inline">Library</span>
            </Link>
            <Link to="/prompt" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all">
              <Terminal className="w-3 h-3" /><span className="hidden sm:inline">Agent Brain</span>
            </Link>
            <button onClick={triggerAnalysis} disabled={isAnalyzing}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold shadow-md transition-all ${
                isAnalyzing ? 'bg-indigo-700 text-indigo-200 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-indigo-500/25 active:scale-95'
              }`}>
              <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAnalyzing ? 'Analyzing...' : useAI ? '✦ Run AI' : 'Run Agent'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ===== MAIN ===== */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 space-y-4">

        {/* AI Error */}
        {aiError && useAI && (
          <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300 flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span><strong>AI Error:</strong> {aiError} — Heuristic fallback active.</span>
          </div>
        )}

        {/* ===== PROFILE SELECTOR & DEDICATED CUSTOM SANDBOX BUTTON ===== */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#111827] p-3 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0 hidden sm:inline">
              Persona:
            </span>
            <div className="relative flex-1 max-w-md">
              <button onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className={`w-full flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl border transition-all text-left ${
                  !isCustomMode 
                    ? 'bg-slate-900 border-indigo-500/40 text-white shadow-sm'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl shrink-0">{selectedProfileObj.avatar}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{selectedProfileObj.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{selectedProfileObj.tagline}</p>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#111827] border border-slate-700 rounded-xl shadow-2xl z-40 max-h-80 overflow-y-auto">
                  {SAMPLE_PROFILES.map(p => (
                    <button key={p.id} onClick={() => handleSelectProfile(p.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800/60 transition-colors text-left ${
                        activeProfileId === p.id && !isCustomMode ? 'bg-indigo-500/10 border-l-2 border-l-indigo-500' : ''
                      }`}>
                      <span className="text-lg">{p.avatar}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{p.tagline}</p>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">{p.reels.length} reels</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dedicated Custom Sandbox Button & Quick Tools */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleToggleCustomMode}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                isCustomMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 ring-1 ring-amber-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-amber-500/40'
              }`}
            >
              <span className="text-base">🛠️</span>
              <span>{isCustomMode ? 'Custom Sandbox (Active)' : 'Custom Sandbox'}</span>
            </button>

            {isCustomMode && (
              <>
                <button onClick={() => setIsAddReelOpen(true)}
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-500/20">
                  + Add Reel
                </button>
                <button onClick={() => setBrowseLibraryOpen(true)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all">
                  <Search className="w-3.5 h-3.5 inline mr-1" />Library
                </button>
              </>
            )}
          </div>
        </div>

        {/* ===== PIPELINE (collapsible) ===== */}
        {showPipeline && (
          <div className="animate-fade-in">
            <AgentReasoningView isAnalyzing={isAnalyzing} pipelineStep={pipelineStep} useAI={useAI} />
          </div>
        )}

        {/* ===== TABS ===== */}
        <div className="flex items-center gap-1 bg-[#111827] p-1 rounded-xl border border-slate-800 w-fit">
          <button onClick={() => setActiveTab('input')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'input' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}>
            <Play className="w-3 h-3" /> Watch History
          </button>
          <button onClick={() => setActiveTab('analysis')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'analysis' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}>
            <Bot className="w-3 h-3" /> AI Analysis
            {analysisResult.aiPowered && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
          <button onClick={() => setActiveTab('compare')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'compare' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}>
            <Columns className="w-3 h-3" /> Compare
          </button>
        </div>

        {/* ===== TAB CONTENT ===== */}
        {activeTab === 'input' && (
          <div className="animate-fade-in">
            <ReelFeedViewer
              reels={currentProfile.reels}
              onUpdateReel={handleUpdateReel}
              onDeleteReel={handleDeleteReel}
              isCustomMode={isCustomMode}
            />
            {/* CTA to run analysis */}
            <div className="mt-4 flex justify-center">
              <button onClick={triggerAnalysis} disabled={isAnalyzing}
                className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                {isAnalyzing ? 'Analyzing...' : 'Analyze This Student →'}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="space-y-5 animate-fade-in">
            {/* Download Report Button */}
            <div className="flex justify-end">
              <button onClick={downloadReport}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all hover:border-indigo-500/40">
                <Download className="w-3.5 h-3.5" /> Download Report
              </button>
            </div>

            {/* Profile Summary */}
            <StudentProfileSummary
              summary={analysisResult.summary}
              profileName={currentProfile.name}
              aiPowered={analysisResult.aiPowered || false}
            />

            {/* Reel-by-Reel Cards */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Reel-by-Reel Inference
                  </h3>
                  {analysisResult.aiPowered && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ✦ AI-POWERED
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {analysisResult.reelAnalyses.length} Cards
                </span>
              </div>

              {analysisResult.reelAnalyses.map((analysis, idx) => (
                <RecommendationCard key={analysis.reelId || idx} analysis={analysis} index={idx} onAccept={handleAcceptRecommendation} />
              ))}
            </div>
          </div>
        )}
      {/* ===== COMPARE TAB ===== */}
        {activeTab === 'compare' && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-xs text-indigo-300 flex items-center gap-2">
              <Columns className="w-4 h-4 shrink-0" />
              <span>Side-by-side comparison: <strong>Heuristic (keyword-based)</strong> vs <strong>Gemini AI (deep inference)</strong> for the same student.</span>
            </div>

            {/* Compare Summaries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Heuristic Side */}
              <div className="bg-amber-950/15 border border-amber-800/30 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-amber-800/30">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-amber-300">⚡ Heuristic Engine</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">Keyword-Based</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-400/70 font-semibold mb-1">Core Cluster</p>
                    <p className="text-xs text-slate-300">{heuristicResult.summary.coreCluster}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-400/70 font-semibold mb-1">Skill Level</p>
                    <p className="text-xs text-white font-medium">{heuristicResult.summary.skillLevel}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-400/70 font-semibold mb-1">Top 3 Recommendations</p>
                    {heuristicResult.summary.priorityReels.map((r, i) => (
                      <div key={i} className="text-xs text-slate-300 py-1 border-b border-amber-900/20 last:border-0">
                        <span className="text-amber-300 font-semibold">{i + 1}.</span> {r.reel}
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-400/70 font-semibold mb-1">Sample Reel Inference</p>
                    {heuristicResult.reelAnalyses.slice(0, 2).map((a, i) => (
                      <div key={i} className="text-xs text-slate-400 py-1.5 border-b border-amber-900/20 last:border-0">
                        <p className="text-slate-300 font-medium">"{a.currentReel}"</p>
                        <p className="mt-0.5">→ Interest: <span className="text-amber-300">{a.interestDetected}</span></p>
                        <p>→ Recommends: <span className="text-amber-200">{a.recommendedReel}</span></p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI Side */}
              <div className="bg-emerald-950/15 border border-emerald-800/30 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-emerald-800/30">
                  <Brain className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-emerald-300">✦ Gemini AI Engine</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Deep Inference</span>
                </div>
                {aiResult ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold mb-1">Core Cluster</p>
                      <p className="text-xs text-slate-300">{aiResult.summary.coreCluster}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold mb-1">Skill Level</p>
                      <p className="text-xs text-white font-medium">{aiResult.summary.skillLevel}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold mb-1">Top 3 Recommendations</p>
                      {aiResult.summary.priorityReels.map((r, i) => (
                        <div key={i} className="text-xs text-slate-300 py-1 border-b border-emerald-900/20 last:border-0">
                          <span className="text-emerald-300 font-semibold">{i + 1}.</span> {r.reel}
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold mb-1">Sample Reel Inference</p>
                      {aiResult.reelAnalyses.slice(0, 2).map((a, i) => (
                        <div key={i} className="text-xs text-slate-400 py-1.5 border-b border-emerald-900/20 last:border-0">
                          <p className="text-slate-300 font-medium">"{a.currentReel}"</p>
                          <p className="mt-0.5">→ Interest: <span className="text-emerald-300">{a.interestDetected}</span></p>
                          <p>→ Recommends: <span className="text-emerald-200">{a.recommendedReel}</span></p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Brain className="w-8 h-8 text-slate-600 mb-3" />
                    <p className="text-sm text-slate-400 font-medium">No AI results yet</p>
                    <p className="text-xs text-slate-500 mt-1">Click "✦ Run AI" to generate AI analysis for comparison</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ===== TRAP TOAST ===== */}
      {trapToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm p-4 rounded-xl bg-rose-950/90 border border-rose-700/60 shadow-2xl animate-slide-up flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-200">Trap Alert!</p>
            <p className="text-xs text-rose-300/80 mt-1">{trapToast}</p>
          </div>
          <button onClick={() => setTrapToast(null)} className="text-rose-500 hover:text-rose-300 text-xs shrink-0">✕</button>
        </div>
      )}

      {/* ===== BROWSE LIBRARY MODAL ===== */}
      {browseLibraryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0E1524] border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60">
              <h3 className="text-sm font-bold text-white">Browse Reel Library — Click to Add</h3>
              <button onClick={() => setBrowseLibraryOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-3 border-b border-slate-800">
              <input
                type="text" placeholder="Search reels..."
                value={librarySearch} onChange={e => setLibrarySearch(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="overflow-y-auto flex-1 p-3 space-y-2">
              {REEL_LIBRARY.filter(r =>
                !librarySearch || r.title.toLowerCase().includes(librarySearch.toLowerCase()) ||
                r.tags.some(t => t.toLowerCase().includes(librarySearch.toLowerCase()))
              ).map(reel => (
                <button key={reel.id}
                  onClick={() => {
                    handleAddReel({
                      id: `lib-${reel.id}-${Date.now()}`,
                      title: reel.title,
                      tags: reel.tags,
                      watchPercentage: 80,
                      liked: false, saved: false, replayed: false, skipped: false
                    });
                    setBrowseLibraryOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/60 transition-all text-left"
                >
                  <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">{reel.id}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{reel.title}</p>
                    <p className="text-[10px] text-slate-500 truncate">{reel.tags.join(', ')}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 shrink-0">{reel.category}</span>
                  <PlusCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <CustomReelModal isOpen={isAddReelOpen} onClose={() => setIsAddReelOpen(false)} onAddReel={(reel) => {
        handleAddReel(reel);
        // Feature #7: Trap toast
        const trapKeywords = ['hack', 'secret', 'trick', 'you won\'t believe', 'shocking', 'mindblowing', '10 tools', '5 apps', 'get rich'];
        const combined = (reel.title + ' ' + reel.tags.join(' ')).toLowerCase();
        if (trapKeywords.some(k => combined.includes(k))) {
          setTrapToast(`"${reel.title}" looks like clickbait. Consider watching substantive, concept-driven content instead.`);
          setTimeout(() => setTrapToast(null), 5000);
        }
      }} />
    </div>
  );
}
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Link } from 'react-router-dom';
import {
  Sparkles, Bot, ShieldCheck, ChevronDown, ChevronRight,
  Play, Brain, Zap, Eye, BookOpen, Terminal, ArrowRight, Download, PlusCircle,
  Columns, AlertTriangle, Search
} from 'lucide-react';
import { SAMPLE_PROFILES } from '../data/sampleProfiles';
import { REEL_LIBRARY } from '../data/reelLibrary';
import { analyzeStudentProfile } from '../services/recommendationEngine';
import { analyzeWithGemini, transformGeminiResponse } from '../services/geminiService';
import { ReelFeedViewer } from '../components/ReelFeedViewer';
import { AgentReasoningView } from '../components/AgentReasoningView';
import { RecommendationCard } from '../components/RecommendationCard';
import { StudentProfileSummary } from '../components/StudentProfileSummary';
import { CustomReelModal } from '../components/CustomReelModal';

export function DashboardPage() {
  const [activeProfileId, setActiveProfileId] = useState('profile-swe');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customReels, setCustomReels] = useState(SAMPLE_PROFILES[0].reels);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // AI Mode State
  const [useAI, setUseAI] = useState(true);
  const [apiKey, setApiKey] = useState(() => import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key') || '');
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [pipelineStep, setPipelineStep] = useState(-1);

  // UI State
  const [activeTab, setActiveTab] = useState('input'); // 'input' | 'analysis' | 'compare'
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isAddReelOpen, setIsAddReelOpen] = useState(false);
  const [showPipeline, setShowPipeline] = useState(false);
  const [browseLibraryOpen, setBrowseLibraryOpen] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [trapToast, setTrapToast] = useState(null);

  useEffect(() => {
    if (apiKey) localStorage.setItem('gemini_api_key', apiKey);
  }, [apiKey]);

  // Active Profile
  const currentProfile = useMemo(() => {
    if (isCustomMode) {
      return {
        id: 'profile-custom', name: 'Custom Sandbox Student', avatar: '🛠️',
        tagline: 'Interactive sandbox with custom watch telemetry & signals', reels: customReels
      };
    }
    return SAMPLE_PROFILES.find(p => p.id === activeProfileId) || SAMPLE_PROFILES[0];
  }, [activeProfileId, isCustomMode, customReels]);

  const heuristicResult = useMemo(() => analyzeStudentProfile(currentProfile), [currentProfile]);
  const analysisResult = aiResult && useAI ? aiResult : heuristicResult;

  // Profile switch
  const handleSelectProfile = (profileId) => {
    setIsCustomMode(false);
    setActiveProfileId(profileId);
    setProfileDropdownOpen(false);
    setAiResult(null);
    setAiError(null);
    if (useAI && apiKey) {
      runAIAnalysis(profileId);
    } else {
      triggerCelebration();
    }
  };

  const handleToggleCustomMode = () => {
    if (!isCustomMode) setCustomReels(currentProfile.reels);
    setIsCustomMode(!isCustomMode);
    setProfileDropdownOpen(false);
    setAiResult(null);
    setAiError(null);
  };

  const handleUpdateReel = (reelId, updates) => {
    if (isCustomMode) {
      setCustomReels(prev => prev.map(r => (r.id === reelId ? { ...r, ...updates } : r)));
    } else {
      setIsCustomMode(true);
      setCustomReels(currentProfile.reels.map(r => (r.id === reelId ? { ...r, ...updates } : r)));
    }
    setAiResult(null);
  };

  const handleDeleteReel = (reelId) => { setCustomReels(prev => prev.filter(r => r.id !== reelId)); setAiResult(null); };
  const handleAddReel = (newReel) => { setCustomReels(prev => [newReel, ...prev]); setAiResult(null); };

  // Accept a recommendation → add it to the watch history
  const handleAcceptRecommendation = (analysis) => {
    const newReel = {
      id: `accepted-${Date.now()}`,
      title: analysis.recommendedReelObj?.title || analysis.recommendedReel,
      tags: analysis.recommendedReelObj?.tags || [analysis.category],
      watchPercentage: 85,
      liked: true,
      saved: false,
      replayed: false,
      skipped: false
    };
    if (!isCustomMode) {
      setIsCustomMode(true);
      setCustomReels([...currentProfile.reels, newReel]);
    } else {
      setCustomReels(prev => [...prev, newReel]);
    }
    setAiResult(null);
    setActiveTab('input');
  };

  // Download analysis report
  const downloadReport = () => {
    const lines = [
      `ANALYSIS REPORT — ${currentProfile.name}`,
      `Engine: ${analysisResult.aiPowered ? 'Gemini AI' : 'Heuristic'}`,
      `Date: ${new Date().toLocaleString()}`,
      `${'='.repeat(80)}`,
      '',
      'STUDENT PROFILE SUMMARY',
      `Core Interest Cluster: ${analysisResult.summary.coreCluster}`,
      `Skill Level: ${analysisResult.summary.skillLevel}`,
      `Blind Spots: ${analysisResult.summary.blindSpots}`,
      '',
      `${'='.repeat(80)}`,
      '',
      'CURRENT REEL | INTEREST DETECTED | WHY | RECOMMENDED TECH REEL | CATEGORY | WHY THIS RECOMMENDATION | DIFFICULTY | CONFIDENCE',
      '-'.repeat(120),
    ];
    analysisResult.reelAnalyses.forEach(a => {
      lines.push(
        `${a.currentReel} | ${a.interestDetected} | ${a.why} | ${a.recommendedReel} | ${a.category} | ${a.whyThisRecommendation} | ${a.difficulty} | ${a.confidence}`
      );
    });
    lines.push('', `${'='.repeat(80)}`);
    lines.push('', 'PRIORITY WATCHLIST');
    analysisResult.summary.priorityReels.forEach((p, i) => {
      lines.push(`${i + 1}. ${p.reel} — ${p.reason}`);
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reels-agent-report-${currentProfile.name.replace(/\s+/g, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Pipeline animation
  const runPipelineAnimation = useCallback(() => {
    return new Promise((resolve) => {
      const steps = [0, 1, 2, 3, 4];
      let i = 0;
      setPipelineStep(-1);
      setShowPipeline(true);
      const interval = setInterval(() => {
        if (i < steps.length) { setPipelineStep(steps[i]); i++; }
        else { clearInterval(interval); setPipelineStep(5); resolve(); }
      }, 500);
    });
  }, []);

  // AI Analysis
  const runAIAnalysis = useCallback(async (profileIdOverride) => {
    if (!apiKey) { setAiError("Please enter your Gemini API key first."); return; }
    setIsAnalyzing(true); setAiError(null); setAiResult(null);
    const animationDone = runPipelineAnimation();
    try {
      const targetProfile = profileIdOverride
        ? SAMPLE_PROFILES.find(p => p.id === profileIdOverride) || currentProfile
        : currentProfile;
      const geminiResult = await analyzeWithGemini(targetProfile, REEL_LIBRARY, apiKey);
      const transformed = transformGeminiResponse(geminiResult, targetProfile, REEL_LIBRARY);
      await animationDone;
      setAiResult(transformed);
      setActiveTab('analysis');
      try { confetti({ particleCount: 80, spread: 70, origin: { y: 0.8 }, colors: ['#6366F1', '#06B6D4', '#10B981', '#F59E0B'] }); } catch (e) {}
    } catch (err) {
      await animationDone;
      console.error("Gemini API error:", err);
      setAiError(err.message || "AI analysis failed. Falling back to heuristic engine.");
      setActiveTab('analysis');
    } finally { setIsAnalyzing(false); }
  }, [apiKey, currentProfile, runPipelineAnimation]);

  const triggerAnalysis = useCallback(() => {
    if (useAI && apiKey) { runAIAnalysis(); } else { triggerCelebration(); }
  }, [useAI, apiKey, runAIAnalysis]);

  const triggerCelebration = () => {
    setIsAnalyzing(true); setPipelineStep(-1); setShowPipeline(true);
    const steps = [0, 1, 2, 3, 4]; let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) { setPipelineStep(steps[i]); i++; }
      else {
        clearInterval(interval); setPipelineStep(5); setIsAnalyzing(false);
        setActiveTab('analysis');
        try { confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 }, colors: ['#6366F1', '#06B6D4', '#10B981'] }); } catch (e) {}
      }
    }, 300);
  };

  const handleToggleAI = () => {
    const newVal = !useAI; setUseAI(newVal); setAiResult(null); setAiError(null);
    if (newVal && apiKey) runAIAnalysis();
  };

  const selectedProfileObj = SAMPLE_PROFILES.find(p => p.id === activeProfileId) || SAMPLE_PROFILES[0];

  return (
    <div className="min-h-screen bg-[#0A0E17] text-slate-100 flex flex-col">
      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#0B0F17]/95 backdrop-blur-md px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-400 p-[1px] flex items-center justify-center">
              <div className="w-full h-full bg-[#0D1322] rounded-[7px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
            </div>
            <span className="font-bold text-white text-sm hidden sm:block">
              Reels<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Agent</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <button onClick={handleToggleAI}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                useAI ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' : 'bg-slate-800/80 text-slate-400 border-slate-700'
              }`}>
              {useAI ? <Brain className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
              <span className="hidden sm:inline">{useAI ? '✦ AI Mode' : 'Heuristic'}</span>
            </button>
            <Link to="/library" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all">
              <BookOpen className="w-3 h-3" /><span className="hidden sm:inline">Library</span>
            </Link>
            <Link to="/prompt" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all">
              <Terminal className="w-3 h-3" /><span className="hidden sm:inline">Agent Brain</span>
            </Link>
            <button onClick={triggerAnalysis} disabled={isAnalyzing}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold shadow-md transition-all ${
                isAnalyzing ? 'bg-indigo-700 text-indigo-200 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-indigo-500/25 active:scale-95'
              }`}>
              <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAnalyzing ? 'Analyzing...' : useAI ? '✦ Run AI' : 'Run Agent'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ===== MAIN ===== */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 space-y-4">

        {/* AI Error */}
        {aiError && useAI && (
          <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300 flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span><strong>AI Error:</strong> {aiError} — Heuristic fallback active.</span>
          </div>
        )}

        {/* ===== PROFILE SELECTOR & DEDICATED CUSTOM SANDBOX BUTTON ===== */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#111827] p-3 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0 hidden sm:inline">
              Persona:
            </span>
            <div className="relative flex-1 max-w-md">
              <button onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className={`w-full flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl border transition-all text-left ${
                  !isCustomMode 
                    ? 'bg-slate-900 border-indigo-500/40 text-white shadow-sm'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl shrink-0">{selectedProfileObj.avatar}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{selectedProfileObj.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{selectedProfileObj.tagline}</p>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#111827] border border-slate-700 rounded-xl shadow-2xl z-40 max-h-80 overflow-y-auto">
                  {SAMPLE_PROFILES.map(p => (
                    <button key={p.id} onClick={() => handleSelectProfile(p.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800/60 transition-colors text-left ${
                        activeProfileId === p.id && !isCustomMode ? 'bg-indigo-500/10 border-l-2 border-l-indigo-500' : ''
                      }`}>
                      <span className="text-lg">{p.avatar}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{p.tagline}</p>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">{p.reels.length} reels</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dedicated Custom Sandbox Button & Quick Tools */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleToggleCustomMode}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                isCustomMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 ring-1 ring-amber-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-amber-500/40'
              }`}
            >
              <span className="text-base">🛠️</span>
              <span>{isCustomMode ? 'Custom Sandbox (Active)' : 'Custom Sandbox'}</span>
            </button>

            {isCustomMode && (
              <>
                <button onClick={() => setIsAddReelOpen(true)}
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-500/20">
                  + Add Reel
                </button>
                <button onClick={() => setBrowseLibraryOpen(true)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all">
                  <Search className="w-3.5 h-3.5 inline mr-1" />Library
                </button>
              </>
            )}
          </div>
        </div>

        {/* ===== PIPELINE (collapsible) ===== */}
        {showPipeline && (
          <div className="animate-fade-in">
            <AgentReasoningView isAnalyzing={isAnalyzing} pipelineStep={pipelineStep} useAI={useAI} />
          </div>
        )}

        {/* ===== TABS ===== */}
        <div className="flex items-center gap-1 bg-[#111827] p-1 rounded-xl border border-slate-800 w-fit">
          <button onClick={() => setActiveTab('input')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'input' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}>
            <Play className="w-3 h-3" /> Watch History
          </button>
          <button onClick={() => setActiveTab('analysis')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'analysis' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}>
            <Bot className="w-3 h-3" /> AI Analysis
            {analysisResult.aiPowered && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
          <button onClick={() => setActiveTab('compare')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'compare' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}>
            <Columns className="w-3 h-3" /> Compare
          </button>
        </div>

        {/* ===== TAB CONTENT ===== */}
        {activeTab === 'input' && (
          <div className="animate-fade-in">
            <ReelFeedViewer
              reels={currentProfile.reels}
              onUpdateReel={handleUpdateReel}
              onDeleteReel={handleDeleteReel}
              isCustomMode={isCustomMode}
            />
            {/* CTA to run analysis */}
            <div className="mt-4 flex justify-center">
              <button onClick={triggerAnalysis} disabled={isAnalyzing}
                className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                {isAnalyzing ? 'Analyzing...' : 'Analyze This Student →'}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="space-y-5 animate-fade-in">
            {/* Download Report Button */}
            <div className="flex justify-end">
              <button onClick={downloadReport}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all hover:border-indigo-500/40">
                <Download className="w-3.5 h-3.5" /> Download Report
              </button>
            </div>

            {/* Profile Summary */}
            <StudentProfileSummary
              summary={analysisResult.summary}
              profileName={currentProfile.name}
              aiPowered={analysisResult.aiPowered || false}
            />

            {/* Reel-by-Reel Cards */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Reel-by-Reel Inference
                  </h3>
                  {analysisResult.aiPowered && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ✦ AI-POWERED
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {analysisResult.reelAnalyses.length} Cards
                </span>
              </div>

              {analysisResult.reelAnalyses.map((analysis, idx) => (
                <RecommendationCard key={analysis.reelId || idx} analysis={analysis} index={idx} onAccept={handleAcceptRecommendation} />
              ))}
            </div>
          </div>
        )}
      {/* ===== COMPARE TAB ===== */}
        {activeTab === 'compare' && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-xs text-indigo-300 flex items-center gap-2">
              <Columns className="w-4 h-4 shrink-0" />
              <span>Side-by-side comparison: <strong>Heuristic (keyword-based)</strong> vs <strong>Gemini AI (deep inference)</strong> for the same student.</span>
            </div>

            {/* Compare Summaries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Heuristic Side */}
              <div className="bg-amber-950/15 border border-amber-800/30 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-amber-800/30">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-amber-300">⚡ Heuristic Engine</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">Keyword-Based</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-400/70 font-semibold mb-1">Core Cluster</p>
                    <p className="text-xs text-slate-300">{heuristicResult.summary.coreCluster}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-400/70 font-semibold mb-1">Skill Level</p>
                    <p className="text-xs text-white font-medium">{heuristicResult.summary.skillLevel}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-400/70 font-semibold mb-1">Top 3 Recommendations</p>
                    {heuristicResult.summary.priorityReels.map((r, i) => (
                      <div key={i} className="text-xs text-slate-300 py-1 border-b border-amber-900/20 last:border-0">
                        <span className="text-amber-300 font-semibold">{i + 1}.</span> {r.reel}
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-400/70 font-semibold mb-1">Sample Reel Inference</p>
                    {heuristicResult.reelAnalyses.slice(0, 2).map((a, i) => (
                      <div key={i} className="text-xs text-slate-400 py-1.5 border-b border-amber-900/20 last:border-0">
                        <p className="text-slate-300 font-medium">"{a.currentReel}"</p>
                        <p className="mt-0.5">→ Interest: <span className="text-amber-300">{a.interestDetected}</span></p>
                        <p>→ Recommends: <span className="text-amber-200">{a.recommendedReel}</span></p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI Side */}
              <div className="bg-emerald-950/15 border border-emerald-800/30 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-emerald-800/30">
                  <Brain className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-emerald-300">✦ Gemini AI Engine</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Deep Inference</span>
                </div>
                {aiResult ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold mb-1">Core Cluster</p>
                      <p className="text-xs text-slate-300">{aiResult.summary.coreCluster}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold mb-1">Skill Level</p>
                      <p className="text-xs text-white font-medium">{aiResult.summary.skillLevel}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold mb-1">Top 3 Recommendations</p>
                      {aiResult.summary.priorityReels.map((r, i) => (
                        <div key={i} className="text-xs text-slate-300 py-1 border-b border-emerald-900/20 last:border-0">
                          <span className="text-emerald-300 font-semibold">{i + 1}.</span> {r.reel}
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold mb-1">Sample Reel Inference</p>
                      {aiResult.reelAnalyses.slice(0, 2).map((a, i) => (
                        <div key={i} className="text-xs text-slate-400 py-1.5 border-b border-emerald-900/20 last:border-0">
                          <p className="text-slate-300 font-medium">"{a.currentReel}"</p>
                          <p className="mt-0.5">→ Interest: <span className="text-emerald-300">{a.interestDetected}</span></p>
                          <p>→ Recommends: <span className="text-emerald-200">{a.recommendedReel}</span></p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Brain className="w-8 h-8 text-slate-600 mb-3" />
                    <p className="text-sm text-slate-400 font-medium">No AI results yet</p>
                    <p className="text-xs text-slate-500 mt-1">Click "✦ Run AI" to generate AI analysis for comparison</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ===== TRAP TOAST ===== */}
      {trapToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm p-4 rounded-xl bg-rose-950/90 border border-rose-700/60 shadow-2xl animate-slide-up flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-200">Trap Alert!</p>
            <p className="text-xs text-rose-300/80 mt-1">{trapToast}</p>
          </div>
          <button onClick={() => setTrapToast(null)} className="text-rose-500 hover:text-rose-300 text-xs shrink-0">✕</button>
        </div>
      )}

      {/* ===== BROWSE LIBRARY MODAL ===== */}
      {browseLibraryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0E1524] border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60">
              <h3 className="text-sm font-bold text-white">Browse Reel Library — Click to Add</h3>
              <button onClick={() => setBrowseLibraryOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-3 border-b border-slate-800">
              <input
                type="text" placeholder="Search reels..."
                value={librarySearch} onChange={e => setLibrarySearch(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="overflow-y-auto flex-1 p-3 space-y-2">
              {REEL_LIBRARY.filter(r =>
                !librarySearch || r.title.toLowerCase().includes(librarySearch.toLowerCase()) ||
                r.tags.some(t => t.toLowerCase().includes(librarySearch.toLowerCase()))
              ).map(reel => (
                <button key={reel.id}
                  onClick={() => {
                    handleAddReel({
                      id: `lib-${reel.id}-${Date.now()}`,
                      title: reel.title,
                      tags: reel.tags,
                      watchPercentage: 80,
                      liked: false, saved: false, replayed: false, skipped: false
                    });
                    setBrowseLibraryOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/60 transition-all text-left"
                >
                  <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">{reel.id}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{reel.title}</p>
                    <p className="text-[10px] text-slate-500 truncate">{reel.tags.join(', ')}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 shrink-0">{reel.category}</span>
                  <PlusCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <CustomReelModal isOpen={isAddReelOpen} onClose={() => setIsAddReelOpen(false)} onAddReel={(reel) => {
        handleAddReel(reel);
        // Feature #7: Trap toast
        const trapKeywords = ['hack', 'secret', 'trick', 'you won\'t believe', 'shocking', 'mindblowing', '10 tools', '5 apps', 'get rich'];
        const combined = (reel.title + ' ' + reel.tags.join(' ')).toLowerCase();
        if (trapKeywords.some(k => combined.includes(k))) {
          setTrapToast(`"${reel.title}" looks like clickbait. Consider watching substantive, concept-driven content instead.`);
          setTimeout(() => setTrapToast(null), 5000);
        }
      }} />
    </div>
  );
}



import React, { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Link } from 'react-router-dom';
import {
  Sparkles, Bot, ShieldCheck, ChevronDown, ChevronRight,
  Play, Brain, Zap, Eye, BookOpen, Terminal, ArrowRight, Download, PlusCircle,
  Columns, AlertTriangle, Search
} from 'lucide-react';
import { SAMPLE_PROFILES } from '../data/sampleProfiles';
import { REEL_LIBRARY } from '../data/reelLibrary';
import { analyzeStudentProfile } from '../services/recommendationEngine';
import { analyzeWithGemini, transformGeminiResponse } from '../services/geminiService';
import { ReelFeedViewer } from '../components/ReelFeedViewer';
import { AgentReasoningView } from '../components/AgentReasoningView';
import { RecommendationCard } from '../components/RecommendationCard';
import { StudentProfileSummary } from '../components/StudentProfileSummary';
import { CustomReelModal } from '../components/CustomReelModal';

export function DashboardPage() {
  const [activeProfileId, setActiveProfileId] = useState('profile-swe');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customReels, setCustomReels] = useState(SAMPLE_PROFILES[0].reels);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // AI Mode State
  const [useAI, setUseAI] = useState(true);
  const [apiKey, setApiKey] = useState(() => import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key') || '');
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [pipelineStep, setPipelineStep] = useState(-1);

  // UI State
  const [activeTab, setActiveTab] = useState('input'); // 'input' | 'analysis' | 'compare'
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isAddReelOpen, setIsAddReelOpen] = useState(false);
  const [showPipeline, setShowPipeline] = useState(false);
  const [browseLibraryOpen, setBrowseLibraryOpen] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [trapToast, setTrapToast] = useState(null);

  useEffect(() => {
    if (apiKey) localStorage.setItem('gemini_api_key', apiKey);
  }, [apiKey]);

  // Active Profile
  const currentProfile = useMemo(() => {
    if (isCustomMode) {
      return {
        id: 'profile-custom', name: 'Custom Sandbox Student', avatar: '🛠️',
        tagline: 'Interactive sandbox with custom watch telemetry & signals', reels: customReels
      };
    }
    return SAMPLE_PROFILES.find(p => p.id === activeProfileId) || SAMPLE_PROFILES[0];
  }, [activeProfileId, isCustomMode, customReels]);

  const heuristicResult = useMemo(() => analyzeStudentProfile(currentProfile), [currentProfile]);
  const analysisResult = aiResult && useAI ? aiResult : heuristicResult;

  // Profile switch
  const handleSelectProfile = (profileId) => {
    setIsCustomMode(false);
    setActiveProfileId(profileId);
    setProfileDropdownOpen(false);
    setAiResult(null);
    setAiError(null);
    if (useAI && apiKey) {
      runAIAnalysis(profileId);
    } else {
      triggerCelebration();
    }
  };

  const handleToggleCustomMode = () => {
    if (!isCustomMode) setCustomReels(currentProfile.reels);
    setIsCustomMode(!isCustomMode);
    setProfileDropdownOpen(false);
    setAiResult(null);
    setAiError(null);
  };

  const handleUpdateReel = (reelId, updates) => {
    if (isCustomMode) {
      setCustomReels(prev => prev.map(r => (r.id === reelId ? { ...r, ...updates } : r)));
    } else {
      setIsCustomMode(true);
      setCustomReels(currentProfile.reels.map(r => (r.id === reelId ? { ...r, ...updates } : r)));
    }
    setAiResult(null);
  };

  const handleDeleteReel = (reelId) => { setCustomReels(prev => prev.filter(r => r.id !== reelId)); setAiResult(null); };
  const handleAddReel = (newReel) => { setCustomReels(prev => [newReel, ...prev]); setAiResult(null); };

  // Accept a recommendation → add it to the watch history
  const handleAcceptRecommendation = (analysis) => {
    const newReel = {
      id: `accepted-${Date.now()}`,
      title: analysis.recommendedReelObj?.title || analysis.recommendedReel,
      tags: analysis.recommendedReelObj?.tags || [analysis.category],
      watchPercentage: 85,
      liked: true,
      saved: false,
      replayed: false,
      skipped: false
    };
    if (!isCustomMode) {
      setIsCustomMode(true);
      setCustomReels([...currentProfile.reels, newReel]);
    } else {
      setCustomReels(prev => [...prev, newReel]);
    }
    setAiResult(null);
    setActiveTab('input');
  };

  // Download analysis report
  const downloadReport = () => {
    const lines = [
      `ANALYSIS REPORT — ${currentProfile.name}`,
      `Engine: ${analysisResult.aiPowered ? 'Gemini AI' : 'Heuristic'}`,
      `Date: ${new Date().toLocaleString()}`,
      `${'='.repeat(80)}`,
      '',
      'STUDENT PROFILE SUMMARY',
      `Core Interest Cluster: ${analysisResult.summary.coreCluster}`,
      `Skill Level: ${analysisResult.summary.skillLevel}`,
      `Blind Spots: ${analysisResult.summary.blindSpots}`,
      '',
      `${'='.repeat(80)}`,
      '',
      'CURRENT REEL | INTEREST DETECTED | WHY | RECOMMENDED TECH REEL | CATEGORY | WHY THIS RECOMMENDATION | DIFFICULTY | CONFIDENCE',
      '-'.repeat(120),
    ];
    analysisResult.reelAnalyses.forEach(a => {
      lines.push(
        `${a.currentReel} | ${a.interestDetected} | ${a.why} | ${a.recommendedReel} | ${a.category} | ${a.whyThisRecommendation} | ${a.difficulty} | ${a.confidence}`
      );
    });
    lines.push('', `${'='.repeat(80)}`);
    lines.push('', 'PRIORITY WATCHLIST');
    analysisResult.summary.priorityReels.forEach((p, i) => {
      lines.push(`${i + 1}. ${p.reel} — ${p.reason}`);
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reels-agent-report-${currentProfile.name.replace(/\s+/g, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Pipeline animation
  const runPipelineAnimation = useCallback(() => {
    return new Promise((resolve) => {
      const steps = [0, 1, 2, 3, 4];
      let i = 0;
      setPipelineStep(-1);
      setShowPipeline(true);
      const interval = setInterval(() => {
        if (i < steps.length) { setPipelineStep(steps[i]); i++; }
        else { clearInterval(interval); setPipelineStep(5); resolve(); }
      }, 500);
    });
  }, []);

  // AI Analysis
  const runAIAnalysis = useCallback(async (profileIdOverride) => {
    if (!apiKey) { setAiError("Please enter your Gemini API key first."); return; }
    setIsAnalyzing(true); setAiError(null); setAiResult(null);
    const animationDone = runPipelineAnimation();
    try {
      const targetProfile = profileIdOverride
        ? SAMPLE_PROFILES.find(p => p.id === profileIdOverride) || currentProfile
        : currentProfile;
      const geminiResult = await analyzeWithGemini(targetProfile, REEL_LIBRARY, apiKey);
      const transformed = transformGeminiResponse(geminiResult, targetProfile, REEL_LIBRARY);
      await animationDone;
      setAiResult(transformed);
      setActiveTab('analysis');
      try { confetti({ particleCount: 80, spread: 70, origin: { y: 0.8 }, colors: ['#6366F1', '#06B6D4', '#10B981', '#F59E0B'] }); } catch (e) {}
    } catch (err) {
      await animationDone;
      console.error("Gemini API error:", err);
      setAiError(err.message || "AI analysis failed. Falling back to heuristic engine.");
      setActiveTab('analysis');
    } finally { setIsAnalyzing(false); }
  }, [apiKey, currentProfile, runPipelineAnimation]);

  const triggerAnalysis = useCallback(() => {
    if (useAI && apiKey) { runAIAnalysis(); } else { triggerCelebration(); }
  }, [useAI, apiKey, runAIAnalysis]);

  const triggerCelebration = () => {
    setIsAnalyzing(true); setPipelineStep(-1); setShowPipeline(true);
    const steps = [0, 1, 2, 3, 4]; let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) { setPipelineStep(steps[i]); i++; }
      else {
        clearInterval(interval); setPipelineStep(5); setIsAnalyzing(false);
        setActiveTab('analysis');
        try { confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 }, colors: ['#6366F1', '#06B6D4', '#10B981'] }); } catch (e) {}
      }
    }, 300);
  };

  const handleToggleAI = () => {
    const newVal = !useAI; setUseAI(newVal); setAiResult(null); setAiError(null);
    if (newVal && apiKey) runAIAnalysis();
  };

  const selectedProfileObj = SAMPLE_PROFILES.find(p => p.id === activeProfileId) || SAMPLE_PROFILES[0];

  return (
    <div className="min-h-screen bg-[#0A0E17] text-slate-100 flex flex-col">
      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#0B0F17]/95 backdrop-blur-md px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-400 p-[1px] flex items-center justify-center">
              <div className="w-full h-full bg-[#0D1322] rounded-[7px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
            </div>
            <span className="font-bold text-white text-sm hidden sm:block">
              Reels<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Agent</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <button onClick={handleToggleAI}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                useAI ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' : 'bg-slate-800/80 text-slate-400 border-slate-700'
              }`}>
              {useAI ? <Brain className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
              <span className="hidden sm:inline">{useAI ? '✦ AI Mode' : 'Heuristic'}</span>
            </button>
            <Link to="/library" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all">
              <BookOpen className="w-3 h-3" /><span className="hidden sm:inline">Library</span>
            </Link>
            <Link to="/prompt" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all">
              <Terminal className="w-3 h-3" /><span className="hidden sm:inline">Agent Brain</span>
            </Link>
            <button onClick={triggerAnalysis} disabled={isAnalyzing}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold shadow-md transition-all ${
                isAnalyzing ? 'bg-indigo-700 text-indigo-200 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-indigo-500/25 active:scale-95'
              }`}>
              <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAnalyzing ? 'Analyzing...' : useAI ? '✦ Run AI' : 'Run Agent'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ===== MAIN ===== */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 space-y-4">

        {/* AI Error */}
        {aiError && useAI && (
          <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300 flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span><strong>AI Error:</strong> {aiError} — Heuristic fallback active.</span>
          </div>
        )}

        {/* ===== PROFILE SELECTOR & DEDICATED CUSTOM SANDBOX BUTTON ===== */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#111827] p-3 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0 hidden sm:inline">
              Persona:
            </span>
            <div className="relative flex-1 max-w-md">
              <button onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className={`w-full flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl border transition-all text-left ${
                  !isCustomMode 
                    ? 'bg-slate-900 border-indigo-500/40 text-white shadow-sm'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl shrink-0">{selectedProfileObj.avatar}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{selectedProfileObj.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{selectedProfileObj.tagline}</p>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#111827] border border-slate-700 rounded-xl shadow-2xl z-40 max-h-80 overflow-y-auto">
                  {SAMPLE_PROFILES.map(p => (
                    <button key={p.id} onClick={() => handleSelectProfile(p.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800/60 transition-colors text-left ${
                        activeProfileId === p.id && !isCustomMode ? 'bg-indigo-500/10 border-l-2 border-l-indigo-500' : ''
                      }`}>
                      <span className="text-lg">{p.avatar}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{p.tagline}</p>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">{p.reels.length} reels</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dedicated Custom Sandbox Button & Quick Tools */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleToggleCustomMode}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                isCustomMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 ring-1 ring-amber-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-amber-500/40'
              }`}
            >
              <span className="text-base">🛠️</span>
              <span>{isCustomMode ? 'Custom Sandbox (Active)' : 'Custom Sandbox'}</span>
            </button>

            {isCustomMode && (
              <>
                <button onClick={() => setIsAddReelOpen(true)}
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-500/20">
                  + Add Reel
                </button>
                <button onClick={() => setBrowseLibraryOpen(true)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all">
                  <Search className="w-3.5 h-3.5 inline mr-1" />Library
                </button>
              </>
            )}
          </div>
        </div>

        {/* ===== PIPELINE (collapsible) ===== */}
        {showPipeline && (
          <div className="animate-fade-in">
            <AgentReasoningView isAnalyzing={isAnalyzing} pipelineStep={pipelineStep} useAI={useAI} />
          </div>
        )}

        {/* ===== TABS ===== */}
        <div className="flex items-center gap-1 bg-[#111827] p-1 rounded-xl border border-slate-800 w-fit">
          <button onClick={() => setActiveTab('input')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'input' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}>
            <Play className="w-3 h-3" /> Watch History
          </button>
          <button onClick={() => setActiveTab('analysis')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'analysis' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}>
            <Bot className="w-3 h-3" /> AI Analysis
            {analysisResult.aiPowered && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
          <button onClick={() => setActiveTab('compare')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'compare' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}>
            <Columns className="w-3 h-3" /> Compare
          </button>
        </div>

        {/* ===== TAB CONTENT ===== */}
        {activeTab === 'input' && (
          <div className="animate-fade-in">
            <ReelFeedViewer
              reels={currentProfile.reels}
              onUpdateReel={handleUpdateReel}
              onDeleteReel={handleDeleteReel}
              isCustomMode={isCustomMode}
            />
            {/* CTA to run analysis */}
            <div className="mt-4 flex justify-center">
              <button onClick={triggerAnalysis} disabled={isAnalyzing}
                className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                {isAnalyzing ? 'Analyzing...' : 'Analyze This Student →'}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="space-y-5 animate-fade-in">
            {/* Download Report Button */}
            <div className="flex justify-end">
              <button onClick={downloadReport}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all hover:border-indigo-500/40">
                <Download className="w-3.5 h-3.5" /> Download Report
              </button>
            </div>

            {/* Profile Summary */}
            <StudentProfileSummary
              summary={analysisResult.summary}
              profileName={currentProfile.name}
              aiPowered={analysisResult.aiPowered || false}
            />

            {/* Reel-by-Reel Cards */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Reel-by-Reel Inference
                  </h3>
                  {analysisResult.aiPowered && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ✦ AI-POWERED
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {analysisResult.reelAnalyses.length} Cards
                </span>
              </div>

              {analysisResult.reelAnalyses.map((analysis, idx) => (
                <RecommendationCard key={analysis.reelId || idx} analysis={analysis} index={idx} onAccept={handleAcceptRecommendation} />
              ))}
            </div>
          </div>
        )}
      {/* ===== COMPARE TAB ===== */}
        {activeTab === 'compare' && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-xs text-indigo-300 flex items-center gap-2">
              <Columns className="w-4 h-4 shrink-0" />
              <span>Side-by-side comparison: <strong>Heuristic (keyword-based)</strong> vs <strong>Gemini AI (deep inference)</strong> for the same student.</span>
            </div>

            {/* Compare Summaries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Heuristic Side */}
              <div className="bg-amber-950/15 border border-amber-800/30 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-amber-800/30">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-amber-300">⚡ Heuristic Engine</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">Keyword-Based</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-400/70 font-semibold mb-1">Core Cluster</p>
                    <p className="text-xs text-slate-300">{heuristicResult.summary.coreCluster}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-400/70 font-semibold mb-1">Skill Level</p>
                    <p className="text-xs text-white font-medium">{heuristicResult.summary.skillLevel}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-400/70 font-semibold mb-1">Top 3 Recommendations</p>
                    {heuristicResult.summary.priorityReels.map((r, i) => (
                      <div key={i} className="text-xs text-slate-300 py-1 border-b border-amber-900/20 last:border-0">
                        <span className="text-amber-300 font-semibold">{i + 1}.</span> {r.reel}
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-400/70 font-semibold mb-1">Sample Reel Inference</p>
                    {heuristicResult.reelAnalyses.slice(0, 2).map((a, i) => (
                      <div key={i} className="text-xs text-slate-400 py-1.5 border-b border-amber-900/20 last:border-0">
                        <p className="text-slate-300 font-medium">"{a.currentReel}"</p>
                        <p className="mt-0.5">→ Interest: <span className="text-amber-300">{a.interestDetected}</span></p>
                        <p>→ Recommends: <span className="text-amber-200">{a.recommendedReel}</span></p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI Side */}
              <div className="bg-emerald-950/15 border border-emerald-800/30 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-emerald-800/30">
                  <Brain className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-emerald-300">✦ Gemini AI Engine</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Deep Inference</span>
                </div>
                {aiResult ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold mb-1">Core Cluster</p>
                      <p className="text-xs text-slate-300">{aiResult.summary.coreCluster}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold mb-1">Skill Level</p>
                      <p className="text-xs text-white font-medium">{aiResult.summary.skillLevel}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold mb-1">Top 3 Recommendations</p>
                      {aiResult.summary.priorityReels.map((r, i) => (
                        <div key={i} className="text-xs text-slate-300 py-1 border-b border-emerald-900/20 last:border-0">
                          <span className="text-emerald-300 font-semibold">{i + 1}.</span> {r.reel}
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold mb-1">Sample Reel Inference</p>
                      {aiResult.reelAnalyses.slice(0, 2).map((a, i) => (
                        <div key={i} className="text-xs text-slate-400 py-1.5 border-b border-emerald-900/20 last:border-0">
                          <p className="text-slate-300 font-medium">"{a.currentReel}"</p>
                          <p className="mt-0.5">→ Interest: <span className="text-emerald-300">{a.interestDetected}</span></p>
                          <p>→ Recommends: <span className="text-emerald-200">{a.recommendedReel}</span></p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Brain className="w-8 h-8 text-slate-600 mb-3" />
                    <p className="text-sm text-slate-400 font-medium">No AI results yet</p>
                    <p className="text-xs text-slate-500 mt-1">Click "✦ Run AI" to generate AI analysis for comparison</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ===== TRAP TOAST ===== */}
      {trapToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm p-4 rounded-xl bg-rose-950/90 border border-rose-700/60 shadow-2xl animate-slide-up flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-200">Trap Alert!</p>
            <p className="text-xs text-rose-300/80 mt-1">{trapToast}</p>
          </div>
          <button onClick={() => setTrapToast(null)} className="text-rose-500 hover:text-rose-300 text-xs shrink-0">✕</button>
        </div>
      )}

      {/* ===== BROWSE LIBRARY MODAL ===== */}
      {browseLibraryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0E1524] border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60">
              <h3 className="text-sm font-bold text-white">Browse Reel Library — Click to Add</h3>
              <button onClick={() => setBrowseLibraryOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-3 border-b border-slate-800">
              <input
                type="text" placeholder="Search reels..."
                value={librarySearch} onChange={e => setLibrarySearch(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="overflow-y-auto flex-1 p-3 space-y-2">
              {REEL_LIBRARY.filter(r =>
                !librarySearch || r.title.toLowerCase().includes(librarySearch.toLowerCase()) ||
                r.tags.some(t => t.toLowerCase().includes(librarySearch.toLowerCase()))
              ).map(reel => (
                <button key={reel.id}
                  onClick={() => {
                    handleAddReel({
                      id: `lib-${reel.id}-${Date.now()}`,
                      title: reel.title,
                      tags: reel.tags,
                      watchPercentage: 80,
                      liked: false, saved: false, replayed: false, skipped: false
                    });
                    setBrowseLibraryOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/60 transition-all text-left"
                >
                  <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">{reel.id}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{reel.title}</p>
                    <p className="text-[10px] text-slate-500 truncate">{reel.tags.join(', ')}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 shrink-0">{reel.category}</span>
                  <PlusCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <CustomReelModal isOpen={isAddReelOpen} onClose={() => setIsAddReelOpen(false)} onAddReel={(reel) => {
        handleAddReel(reel);
        // Feature #7: Trap toast
        const trapKeywords = ['hack', 'secret', 'trick', 'you won\'t believe', 'shocking', 'mindblowing', '10 tools', '5 apps', 'get rich'];
        const combined = (reel.title + ' ' + reel.tags.join(' ')).toLowerCase();
        if (trapKeywords.some(k => combined.includes(k))) {
          setTrapToast(`"${reel.title}" looks like clickbait. Consider watching substantive, concept-driven content instead.`);
          setTimeout(() => setTrapToast(null), 5000);
        }
      }} />
    </div>
  );
}

