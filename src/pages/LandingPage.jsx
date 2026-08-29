import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Brain, Target, Smartphone, Play, ArrowRight, Zap, Code, Shield } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0E17] text-slate-200 font-sans overflow-x-hidden">
      {/* 1. Hero Section */}
      <section className="relative px-6 pt-32 pb-24 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-indigo-500/20 to-transparent blur-3xl -z-10 pointer-events-none"></div>
        
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-8">
          <Sparkles size={16} className="animate-pulse" />
          <span className="text-sm font-medium">Hackathon Demo Live</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
            Stop Scrolling Mindlessly.
          </span>
          <br />
          <span className="text-white">Start Scrolling Smarter.</span>
        </h1>

        <p className="max-w-2xl text-lg md:text-xl text-slate-400 mb-10 leading-relaxed">
          An AI agent that analyzes your Reel watching behavior, infers your deep interests, 
          and recommends tech content that actually helps your career.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link 
            to="/dashboard" 
            className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)]"
          >
            Start Analyzing
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link 
            to="/library" 
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-slate-800/50 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-xl font-semibold transition-all"
          >
            <Play size={20} />
            View Reel Library
          </Link>
        </div>
      </section>

      {/* 2. Problem Section */}
      <section className="px-6 py-20 bg-slate-900/50 border-y border-slate-800/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8 text-white">The Problem</h2>
          <div className="bg-[#0A0E17] border border-slate-800 p-8 rounded-2xl shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Zap size={120} />
            </div>
            <p className="text-xl text-slate-300 leading-relaxed">
              Students spend hours scrolling short-form content. Most of it is purely entertainment 
              with <span className="text-pink-400 font-semibold">zero career value</span>. 
              What if we could make that scrolling time useful, transforming a mindless habit into a 
              career-building superpower?
            </p>
          </div>
        </div>
      </section>

      {/* 3. How It Works */}
      <section className="px-6 py-24 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How It Works</h2>
          <p className="text-slate-400">Three simple steps to smarter content consumption.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: <Smartphone size={32} className="text-blue-400" />,
              title: "📱 Watch Reels",
              desc: "We analyze your watch history, likes, saves, replays, and skips."
            },
            {
              icon: <Brain size={32} className="text-purple-400" />,
              title: "🧠 AI Infers Intent",
              desc: "Gemini AI clusters behavioral signals to detect your REAL interests — not just keywords."
            },
            {
              icon: <Target size={32} className="text-emerald-400" />,
              title: "🎯 Get Smart Recommendations",
              desc: "Receive curated tech reels matched to your skill level with confidence scores."
            }
          ].map((step, i) => (
            <div key={i} className="bg-slate-800/30 border border-slate-700/50 p-8 rounded-2xl hover:bg-slate-800/50 transition-colors">
              <div className="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center mb-6">
                {step.icon}
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
              <p className="text-slate-400 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. The Built-In Trap Demo */}
      <section className="px-6 py-24 bg-gradient-to-b from-[#0A0E17] to-slate-900 border-t border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Can Our Agent See Through the Trap?</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Traditional recommendation engines fall for shallow signals. Our agent looks deeper to understand who you really are.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Shallow System */}
            <div className="bg-red-950/20 border border-red-900/30 rounded-2xl p-8 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500/50"></div>
              <h3 className="text-xl font-bold text-red-400 mb-6 flex items-center gap-2">
                <span className="text-2xl">❌</span> Shallow System
              </h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-[#0A0E17] rounded-xl border border-slate-800">
                  <p className="text-sm text-slate-400 mb-1">Student watches:</p>
                  <p className="text-slate-200 font-medium">"Java meme about NullPointer"</p>
                </div>
                <div className="flex justify-center py-2 text-slate-600">
                  <ArrowRight className="rotate-90 md:rotate-0" />
                </div>
                <div className="p-4 bg-red-900/20 rounded-xl border border-red-800/50">
                  <p className="text-sm text-red-300/70 mb-1">System recommends:</p>
                  <p className="text-red-200 font-medium">"Another basic Java tutorial"</p>
                </div>
              </div>
            </div>

            {/* Our Agent */}
            <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-2xl p-8 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/50"></div>
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 blur-2xl rounded-full"></div>
              <h3 className="text-xl font-bold text-emerald-400 mb-6 flex items-center gap-2">
                <span className="text-2xl">✅</span> Our AI Agent
              </h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-[#0A0E17] rounded-xl border border-slate-800">
                  <p className="text-sm text-slate-400 mb-1">Student watches:</p>
                  <p className="text-slate-200 font-medium">Java meme + SWE lifestyle + laptop review</p>
                </div>
                <div className="flex justify-center py-2 text-emerald-600">
                  <ArrowRight className="rotate-90 md:rotate-0" />
                </div>
                <div className="p-4 bg-emerald-900/20 rounded-xl border border-emerald-800/50">
                  <p className="text-sm text-emerald-300/70 mb-1">AI Infers: Aspiring Software Engineer</p>
                  <p className="text-emerald-200 font-medium">Recommends: Open Source, Internship Prep, DSA fundamentals</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Stats Bar */}
      <section className="px-6 py-12 border-y border-slate-800/50 bg-[#0A0E17]/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-8 md:gap-16 text-center">
          {[
            { label: "Student Profiles", value: "8" },
            { label: "Tech Reels", value: "25" },
            { label: "Powered By", value: "Gemini AI" },
            { label: "Filter", value: "Anti-Clickbait" }
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center">
              <span className="text-2xl md:text-3xl font-bold text-white mb-1">{stat.value}</span>
              <span className="text-sm text-slate-500 uppercase tracking-wider font-medium">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Footer CTA */}
      <section className="px-6 py-32 text-center relative">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-gradient-to-t from-indigo-500/10 to-transparent blur-3xl -z-10 pointer-events-none"></div>
        <h2 className="text-4xl font-bold text-white mb-8">Ready to see it in action?</h2>
        <Link 
          to="/dashboard" 
          className="inline-flex items-center justify-center gap-2 px-10 py-5 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-bold text-lg transition-all hover:scale-105 active:scale-95 shadow-xl"
        >
          Launch Dashboard
          <ArrowRight size={24} />
        </Link>
      </section>
    </div>
  );
}
