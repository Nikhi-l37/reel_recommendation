import React, { useState } from 'react';
import { X, Plus, Sparkles, Tag, Eye } from 'lucide-react';

export function CustomReelModal({ isOpen, onClose, onAddReel }) {
  const [title, setTitle] = useState('');
  const [reelUrl, setReelUrl] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [watchPercentage, setWatchPercentage] = useState(100);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [replayed, setReplayed] = useState(false);
  const [skipped, setSkipped] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    onAddReel({
      id: 'custom-' + Date.now(),
      title: title.trim(),
      reelUrl: reelUrl.trim(),
      tags: tags.length > 0 ? tags : ['custom', 'student'],
      watchPercentage: Number(watchPercentage),
      liked,
      saved,
      replayed,
      skipped
    });

    // Reset & Close
    setTitle('');
    setReelUrl('');
    setTagsInput('');
    setWatchPercentage(100);
    setLiked(false);
    setSaved(false);
    setReplayed(false);
    setSkipped(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0E1524] border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Plus className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="text-sm font-bold text-white">
              Add Custom Reel to Sandbox
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1.5">
              Reel Title / Description
            </label>
            <input
              type="text"
              required
              placeholder='e.g., "Why microservices might be an anti-pattern"'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1.5 flex items-center justify-between">
              <span>Reel / Short URL <span className="text-slate-500 font-normal">(Optional)</span></span>
              <span className="text-[10px] text-slate-500">YouTube Shorts, IG Reel, TikTok</span>
            </label>
            <input
              type="url"
              placeholder='e.g., "https://youtube.com/shorts/xyz123"'
              value={reelUrl}
              onChange={(e) => setReelUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1.5">
              Tags (Comma separated)
            </label>
            <input
              type="text"
              placeholder="e.g., backend, system design, architecture"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-300 font-medium flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-indigo-400" />
                Watch Percentage:
              </label>
              <span className="font-mono font-bold text-indigo-300">
                {watchPercentage}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={watchPercentage}
              onChange={(e) => setWatchPercentage(e.target.value)}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-2">
              Behavioral Signals:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={liked}
                  onChange={(e) => setLiked(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span className="text-slate-300 font-medium">❤️ Liked</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={saved}
                  onChange={(e) => setSaved(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span className="text-slate-300 font-medium">🔖 Saved</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={replayed}
                  onChange={(e) => {
                    setReplayed(e.target.checked);
                    if (e.target.checked) setSkipped(false);
                  }}
                  className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span className="text-slate-300 font-medium">🔁 Replayed</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={skipped}
                  onChange={(e) => {
                    setSkipped(e.target.checked);
                    if (e.target.checked) { setReplayed(false); setLiked(false); setSaved(false); }
                  }}
                  className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span className="text-slate-300 font-medium">⏭️ Skipped</span>
              </label>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all shadow-md shadow-indigo-500/20"
            >
              Add to Stream
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
