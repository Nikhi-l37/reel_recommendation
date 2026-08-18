import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Search, Tag, Filter, ArrowLeft } from 'lucide-react';
import { REEL_LIBRARY } from '../data/reelLibrary';

export function LibraryPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');

  const categories = ['All', 'DSA', 'AI', 'HLD', 'Cybersecurity', 'Cloud', 'Hardware', 'Career', 'Other'];
  const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced'];

  const filteredReels = REEL_LIBRARY.filter(reel => {
    const matchesSearch = reel.title.toLowerCase().includes(search.toLowerCase()) ||
      reel.tags.some(t => t.toLowerCase().includes(search.toLowerCase())) ||
      reel.description.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'All' || reel.category === selectedCategory;
    const matchesDiff = selectedDifficulty === 'All' || reel.difficulty === selectedDifficulty;
    return matchesSearch && matchesCat && matchesDiff;
  });

  return (
    <div className="min-h-screen bg-[#0A0E17] text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Navigation & Header */}
        <div>
          <Link 
            to="/dashboard" 
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          
          <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Tech Reel Library</h1>
              <p className="text-sm text-slate-400">
                25 curated educational tech reels available for recommendation
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[#0E1524] border border-slate-800 rounded-2xl p-4 md:p-5 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by title, tags, or concepts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            
            <div className="flex items-center text-sm text-slate-400 whitespace-nowrap bg-slate-900/50 px-4 py-2.5 rounded-xl border border-slate-800">
              Showing {filteredReels.length} reels
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-4">
            {/* Category Filter */}
            <div className="flex-1 flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
              <Filter className="w-4 h-4 text-slate-500 flex-shrink-0" />
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs px-3 py-1.5 rounded-lg border whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200 font-medium'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Difficulty Filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
              <div className="text-xs text-slate-500 font-medium mr-1 uppercase tracking-wider">Difficulty:</div>
              {difficulties.map((diff) => (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`text-xs px-3 py-1.5 rounded-lg border whitespace-nowrap transition-all ${
                    selectedDifficulty === diff
                      ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200 font-medium'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReels.map((reel) => (
            <div
              key={reel.id}
              className="p-5 rounded-2xl bg-[#0E1524] border border-slate-800 hover:border-indigo-500/40 transition-all flex flex-col h-full shadow-lg"
            >
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
                    {reel.id}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700">
                      {reel.category}
                    </span>
                    <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${
                      reel.difficulty === 'Beginner' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      reel.difficulty === 'Intermediate' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {reel.difficulty}
                    </span>
                  </div>
                </div>

                <h3 className="text-sm md:text-base font-bold text-white mb-2 leading-snug">
                  {reel.title}
                </h3>
                <p className="text-xs md:text-sm text-slate-400 leading-relaxed mb-4">
                  {reel.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-4 border-t border-slate-800/80">
                {reel.tags.map((tag, tIdx) => (
                  <span
                    key={tIdx}
                    className="text-[11px] font-mono px-2 py-1 rounded-md bg-slate-950 text-slate-400 border border-slate-800 flex items-center gap-1"
                  >
                    <Tag className="w-3 h-3 text-slate-500" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
          
          {filteredReels.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-800 rounded-2xl">
              <Search className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-slate-300 mb-1">No reels found</h3>
              <p className="text-slate-500 text-sm">Try adjusting your filters or search terms.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
