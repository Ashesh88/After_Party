'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Plus, Image as ImageIcon, Trash2, Calendar, Heart } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { WeeklyMemory } from '../lib/types';
import { useSocketStore } from '../lib/store/socketStore';

const WEEKLY_PROMPTS = [
  'Best highlight together this week',
  'Favorite inside joke this week',
  'What made me smile thinking of you',
  'Our spontaneous cozy moment',
  'Song that defined our week',
];

export default function WeeklyMemoryWall() {
  const [memories, setMemories] = useState<WeeklyMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState(WEEKLY_PROMPTS[0]);
  const [submitting, setSubmitting] = useState(false);
  const { socket } = useSocketStore();

  const fetchMemories = async () => {
    try {
      setLoading(true);
      const res = await api.get('/rooms/memories');
      setMemories(res.data.memories || []);
    } catch {
      // room might not be set up yet
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleMemoryAdded = (data: { memory: WeeklyMemory }) => {
      setMemories((prev) => [data.memory, ...prev.filter((m) => m._id !== data.memory._id)]);
      toast.success('New weekly memory saved! ✨');
    };
    const handleMemoryDeleted = (data: { memoryId: string }) => {
      setMemories((prev) => prev.filter((m) => m._id !== data.memoryId));
    };

    socket.on('room:memory-added', handleMemoryAdded);
    socket.on('room:memory-deleted', handleMemoryDeleted);

    return () => {
      socket.off('room:memory-added', handleMemoryAdded);
      socket.off('room:memory-deleted', handleMemoryDeleted);
    };
  }, [socket]);

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.post('/rooms/memories', {
        caption: caption.trim(),
        imageUrl: imageUrl.trim(),
        prompt: selectedPrompt,
      });
      setMemories(res.data.memories);
      setShowAddModal(false);
      setCaption('');
      setImageUrl('');
      toast.success('Weekly memory pinned to your wall!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to pin memory');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    if (!confirm('Remove this weekly memory?')) return;
    try {
      await api.delete(`/rooms/memories/${id}`);
      setMemories((prev) => prev.filter((m) => m._id !== id));
      toast('Memory removed');
    } catch (err: any) {
      toast.error('Failed to remove memory');
    }
  };

  return (
    <div className="p-5 sm:p-6 rounded-[32px] glass-panel border border-pink-500/25 shadow-xl bg-gradient-to-b from-[#130b1c]/80 to-[#090610]/95 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white">Weekly Memory Wall</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/15 text-pink-300 border border-pink-500/30">
                Weekly Edition
              </span>
            </div>
            <p className="text-xs text-slate-400">Capture your favorite moment and highlights every week</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-2 rounded-xl btn-sexy text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
        >
          <Plus size={14} />
          <span>Add Weekly Memory</span>
        </button>
      </div>

      {/* Memory Carousel / Cards */}
      {loading ? (
        <div className="py-8 text-center text-xs text-slate-500 font-medium">Loading weekly memories...</div>
      ) : memories.length === 0 ? (
        <div className="py-8 px-4 rounded-2xl border border-dashed border-white/10 text-center space-y-2 bg-white/[0.02]">
          <p className="text-xs text-slate-300 font-semibold">No memories pinned for this week yet.</p>
          <p className="text-[11px] text-slate-500">
            Tap "Add Weekly Memory" to store a sweet memory or photo together this week!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-1">
          {memories.map((mem) => (
            <motion.div
              key={mem._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="group relative p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] hover:border-pink-500/30 transition-all shadow-md flex flex-col justify-between overflow-hidden"
            >
              {mem.imageUrl && (
                <div className="w-full h-36 rounded-xl overflow-hidden mb-3 border border-white/10 bg-black/40">
                  <img src={mem.imageUrl} alt="Memory" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
              )}

              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider flex items-center gap-1">
                    <Calendar size={11} /> Week {mem.weekNumber}, {mem.year}
                  </span>
                  <button
                    onClick={() => handleDeleteMemory(mem._id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-opacity p-1"
                    title="Delete memory"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="text-[11px] font-semibold text-slate-300 italic">
                  "{mem.prompt}"
                </div>

                <p className="text-xs text-white font-medium leading-relaxed break-words">
                  {mem.caption}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-slate-400">
                <span>By {mem.addedByName || 'Partner'}</span>
                <span className="flex items-center gap-1 text-pink-400">
                  <Heart size={11} fill="currentColor" /> Saved
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Memory Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md p-6 rounded-3xl glass-panel border border-pink-500/30 bg-[#0d0d1b] space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-pink-400" />
                  <h3 className="font-bold text-base text-white">Add Weekly Memory</h3>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 text-xs"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddMemory} className="space-y-3.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Select Weekly Prompt
                  </label>
                  <select
                    value={selectedPrompt}
                    onChange={(e) => setSelectedPrompt(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-white outline-none cursor-pointer"
                  >
                    {WEEKLY_PROMPTS.map((p) => (
                      <option key={p} value={p} className="bg-[#121224] text-white">
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Memory Note / Caption
                  </label>
                  <textarea
                    rows={3}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Write what made this week special..."
                    className="w-full p-3 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-white outline-none placeholder:text-slate-500 resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Photo URL (Optional)
                  </label>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.06] border border-white/10">
                    <ImageIcon size={16} className="text-slate-400 shrink-0" />
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="Paste image link (e.g. from Unsplash or upload)"
                      className="w-full bg-transparent text-xs text-white outline-none placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !caption.trim()}
                    className="flex-1 py-2.5 rounded-xl btn-sexy text-xs font-bold text-white shadow-lg disabled:opacity-50"
                  >
                    {submitting ? 'Pinning...' : 'Pin Memory ✨'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
