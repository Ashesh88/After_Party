'use client';
import { useState, useEffect, useRef } from 'react';
import api from '../../../lib/api';
import { Goal } from '../../../lib/types';
import { useSocketStore } from '../../../lib/store/socketStore';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, Plus, CheckCircle2, Trash2, 
  RotateCcw, Sparkles, ChevronRight, X, Heart
} from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: '✨' },
  { id: 'finance', label: 'Finance', icon: '💰', color: 'from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/30' },
  { id: 'travel', label: 'Travel', icon: '✈️', color: 'from-blue-500/20 to-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  { id: 'relationship', label: 'Love', icon: '💖', color: 'from-pink-500/20 to-rose-500/20 text-pink-300 border-pink-500/30' },
  { id: 'health', label: 'Health', icon: '🏃', color: 'from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/30' },
  { id: 'other', label: 'Other', icon: '🌟', color: 'from-purple-500/20 to-violet-500/20 text-purple-300 border-purple-500/30' },
];

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newCat, setNewCat] = useState('relationship');
  const [newOwner, setNewOwner] = useState<'both' | 'me' | 'partner'>('both');
  const [newDueDate, setNewDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const socket = useSocketStore(state => state.socket);
  const progressDebounceRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  const fetchGoals = async () => {
    try {
      const res = await api.get('/goals');
      let fetched: Goal[] = res.data.goals || [];

      // If room has no goals yet, seed couple starters
      if (fetched.length === 0) {
        try {
          const starter1 = await api.post('/goals', {
            title: 'Save for Japan trip',
            category: 'finance',
            progress: 45,
            owner: 'both',
          });
          const starter2 = await api.post('/goals', {
            title: 'Workout 3x a week',
            category: 'health',
            progress: 80,
            owner: 'both',
          });
          fetched = [starter1.data.goal, starter2.data.goal];
        } catch {
          // fallback in-memory if room not ready
          fetched = [
            { _id: '1', title: 'Save for Japan trip', category: 'finance', progress: 45, owner: 'both' },
            { _id: '2', title: 'Workout 3x a week', category: 'health', progress: 80, owner: 'both' },
          ];
        }
      }

      setGoals(fetched);
    } catch {
      // offline/starter fallback
      setGoals([
        { _id: '1', title: 'Save for Japan trip', category: 'finance', progress: 45, owner: 'both' },
        { _id: '2', title: 'Workout 3x a week', category: 'health', progress: 80, owner: 'both' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  // Listen for live updates from partner
  useEffect(() => {
    if (!socket) return;
    const handleGoalUpdate = (data: any) => {
      if (data?.goalId && typeof data.progress === 'number') {
        setGoals(prev => prev.map(g => g._id === data.goalId ? { ...g, progress: data.progress } : g));
      } else {
        fetchGoals();
      }
    };

    socket.on('goal:update', handleGoalUpdate);
    return () => {
      socket.off('goal:update', handleGoalUpdate);
    };
  }, [socket]);

  // Update progress locally & sync to server
  const handleProgressChange = (id: string, newProgress: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(newProgress)));
    
    // Immediate optimistic local update
    setGoals(prev => prev.map(g => g._id === id ? { ...g, progress: clamped } : g));

    // Debounced API persist
    if (progressDebounceRef.current[id]) {
      clearTimeout(progressDebounceRef.current[id]);
    }

    progressDebounceRef.current[id] = setTimeout(async () => {
      try {
        await api.patch(`/goals/${id}/progress`, { progress: clamped });
        socket?.emit('goal:update', { goalId: id, progress: clamped });
        if (clamped === 100) {
          toast.success('Goal Achieved! You two did it! 🎉💕');
        }
      } catch {
        // silently handled
      }
    }, 250);
  };

  const handleStepProgress = (id: string, delta: number) => {
    const goal = goals.find(g => g._id === id);
    if (!goal) return;
    handleProgressChange(id, goal.progress + delta);
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Please enter a goal title');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/goals', {
        title: newTitle.trim(),
        category: newCat,
        owner: newOwner,
        dueDate: newDueDate || undefined,
        progress: 0,
      });

      setGoals(prev => [res.data.goal, ...prev]);
      socket?.emit('goal:update', { created: true });
      toast.success('New couple goal added! 🎯');
      setNewTitle('');
      setNewDueDate('');
      setShowAddModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add goal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      await api.delete(`/goals/${id}`);
      setGoals(prev => prev.filter(g => g._id !== id));
      socket?.emit('goal:update', { deleted: true });
      toast.success('Goal removed');
      setActiveMenuId(null);
    } catch {
      toast.error('Failed to delete goal');
    }
  };

  const filteredGoals = goals.filter(g => {
    if (selectedCat === 'all') return true;
    return (g.category || '').toLowerCase() === selectedCat.toLowerCase();
  });

  const totalGoals = goals.length;
  const completedGoals = goals.filter(g => g.progress === 100).length;
  const avgProgress = totalGoals > 0 ? Math.round(goals.reduce((acc, g) => acc + g.progress, 0) / totalGoals) : 0;

  return (
    <div className="min-h-screen bg-[#07070f] text-slate-100 flex flex-col overflow-y-auto px-4 pt-4 sm:pt-6 pb-36 max-w-lg mx-auto w-full">
      {/* Background ambient romance glow */}
      <div className="ambient-glow-pink -top-20 -left-20 pointer-events-none" />
      <div className="ambient-glow-purple -bottom-20 -right-20 pointer-events-none" />

      {/* Header */}
      <header className="flex justify-between items-center mb-5 shrink-0 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Goals 🎯</h1>
            <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 text-[10px] font-bold">
              Shared Space
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Grow together, celebrate every milestone 💕</p>
        </div>

        <button 
          onClick={() => setShowAddModal(true)}
          className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-pink-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
          title="Add New Goal"
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      </header>

      {/* Overall Progress Stats Card */}
      <div className="mb-5 p-4 sm:p-5 rounded-3xl glass-panel border border-white/10 shadow-xl relative overflow-hidden shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
              <Sparkles size={16} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Couple Sync</span>
              <span className="text-sm font-black text-white">{completedGoals} of {totalGoals} Goals Done</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 font-mono">
              {avgProgress}%
            </span>
          </div>
        </div>

        {/* Big Overall Bar */}
        <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/5">
          <div 
            className="h-full bg-gradient-to-r from-pink-500 via-rose-400 to-purple-500 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(244,63,142,0.6)]"
            style={{ width: `${avgProgress}%` }}
          />
        </div>
      </div>

      {/* Category Filter Pills (Horizontal scroll on mobile) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none shrink-0 -mx-1 px-1">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCat(cat.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedCat === cat.id
                ? 'bg-pink-500 text-white shadow-md shadow-pink-500/30 border border-pink-400'
                : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] border border-white/5'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Goal Cards List */}
      <div className="space-y-3.5 relative z-10 flex-1">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs animate-pulse">
            Loading your goals... ✨
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className="p-8 rounded-3xl glass-panel text-center border border-white/5 my-6">
            <span className="text-3xl block mb-2">🎯</span>
            <h3 className="font-bold text-sm text-white mb-1">No goals found here</h3>
            <p className="text-xs text-slate-400 mb-4">Tap the + button above to create a new adventure together!</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-2xl btn-sexy text-xs font-bold text-white shadow-lg inline-flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Add First Goal</span>
            </button>
          </div>
        ) : (
          filteredGoals.map(goal => {
            const isCompleted = goal.progress >= 100;
            const categoryMeta = CATEGORIES.find(c => c.id === (goal.category || '').toLowerCase()) || CATEGORIES[1];

            return (
              <div 
                key={goal._id} 
                className={`p-4 sm:p-5 rounded-3xl glass-panel border transition-all relative overflow-hidden ${
                  isCompleted 
                    ? 'border-emerald-500/40 bg-emerald-950/15 shadow-[0_4px_25px_rgba(16,185,129,0.15)]' 
                    : 'border-white/[0.08] hover:border-pink-500/30'
                }`}
              >
                {/* Top Row: Category + Owner + Menu */}
                <div className="flex justify-between items-center mb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-lg border bg-gradient-to-r ${categoryMeta.color || 'from-pink-500/20 to-purple-500/20 text-pink-300 border-pink-500/30'}`}>
                      {goal.category || 'Goal'}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                      <Heart size={10} className="text-pink-400" />
                      {goal.owner === 'me' ? 'For Me' : goal.owner === 'partner' ? 'For Partner' : 'Both of Us'}
                    </span>
                  </div>

                  {/* Context Menu Trigger */}
                  <div className="relative">
                    <button 
                      onClick={() => setActiveMenuId(activeMenuId === goal._id ? null : goal._id)}
                      className="w-7 h-7 rounded-full bg-white/[0.04] hover:bg-white/[0.1] text-slate-400 hover:text-white flex items-center justify-center text-xs transition-colors cursor-pointer"
                    >
                      ⋮
                    </button>

                    {/* Dropdown Menu */}
                    {activeMenuId === goal._id && (
                      <div className="absolute right-0 top-8 w-40 rounded-2xl glass-panel border border-white/10 bg-[#0d0d1a]/95 backdrop-blur-2xl shadow-2xl p-1.5 z-30 flex flex-col gap-1">
                        <button
                          onClick={() => {
                            handleProgressChange(goal._id, 100);
                            setActiveMenuId(null);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <CheckCircle2 size={13} />
                          <span>Mark 100%</span>
                        </button>
                        <button
                          onClick={() => {
                            handleProgressChange(goal._id, 0);
                            setActiveMenuId(null);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-semibold text-slate-300 hover:bg-white/10 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <RotateCcw size={13} />
                          <span>Reset to 0%</span>
                        </button>
                        <button
                          onClick={() => handleDeleteGoal(goal._id)}
                          className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-semibold text-rose-400 hover:bg-rose-500/20 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Trash2 size={13} />
                          <span>Delete Goal</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Goal Title */}
                <h3 className={`font-bold text-base sm:text-lg mb-3 ${isCompleted ? 'text-emerald-200 line-through decoration-emerald-400/50' : 'text-white'}`}>
                  {goal.title}
                </h3>

                {/* Progress Stats & Interactive Controls */}
                <div className="flex justify-between items-center text-xs mb-2">
                  <span className="text-slate-400 font-medium">Progress</span>
                  <div className="flex items-center gap-1.5">
                    {isCompleted ? (
                      <span className="text-emerald-400 font-extrabold flex items-center gap-1 font-mono">
                        <CheckCircle2 size={13} /> 100% DONE! 🎉
                      </span>
                    ) : (
                      <span className="text-pink-300 font-black font-mono text-sm">
                        {goal.progress}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Interactive Slider Bar */}
                <div className="relative mb-3">
                  <div className="w-full h-3 bg-black/50 rounded-full overflow-hidden p-0.5 border border-white/5 relative">
                    <div 
                      className={`h-full rounded-full transition-all duration-200 ${
                        isCompleted 
                          ? 'bg-gradient-to-r from-emerald-400 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.8)]' 
                          : 'bg-gradient-to-r from-pink-500 via-rose-400 to-purple-500 shadow-[0_0_10px_rgba(244,63,142,0.7)]'
                      }`}
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>

                  {/* Real HTML Range Slider Overlay (Allows direct touch dragging) */}
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={goal.progress}
                    onChange={(e) => handleProgressChange(goal._id, Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize touch-manipulation"
                    aria-label={`Change progress for ${goal.title}`}
                  />
                </div>

                {/* Quick Step Buttons for Instant Phone Tapping */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.04]">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleStepProgress(goal._id, -10)}
                      disabled={goal.progress <= 0}
                      className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] active:bg-white/[0.14] text-[11px] font-bold text-slate-300 disabled:opacity-30 cursor-pointer active:scale-95 transition-all"
                    >
                      -10%
                    </button>
                    <button
                      onClick={() => handleStepProgress(goal._id, +10)}
                      disabled={goal.progress >= 100}
                      className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] active:bg-white/[0.14] text-[11px] font-bold text-slate-300 disabled:opacity-30 cursor-pointer active:scale-95 transition-all"
                    >
                      +10%
                    </button>
                  </div>

                  <button
                    onClick={() => handleProgressChange(goal._id, isCompleted ? 0 : 100)}
                    className={`px-3 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                      isCompleted
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/30'
                    }`}
                  >
                    <CheckCircle2 size={13} />
                    <span>{isCompleted ? 'Completed ✓' : 'Finish (100%)'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add New Goal Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm rounded-[32px] glass-panel p-6 shadow-2xl border border-pink-500/30 overflow-hidden"
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                    <Target size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">New Couple Goal 💕</h3>
                    <p className="text-[11px] text-slate-400">Plan a shared milestone</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleCreateGoal} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Goal Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Save for Paris trip, Cook dinner together"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white/[0.05] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-pink-500/60"
                  />
                </div>

                {/* Category Picker */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Category
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setNewCat(cat.id)}
                        className={`py-2 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all border ${
                          newCat === cat.id
                            ? 'bg-pink-500/25 text-pink-300 border-pink-500/60 shadow-sm'
                            : 'bg-white/[0.03] text-slate-400 border-white/5 hover:bg-white/[0.06]'
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Owner Picker */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Who is this for?
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'both', label: 'Both 💕' },
                      { id: 'me', label: 'For Me 🧸' },
                      { id: 'partner', label: 'Partner 🐰' },
                    ].map(item => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setNewOwner(item.id as any)}
                        className={`py-2 px-1.5 rounded-xl text-[11px] font-bold text-center transition-all border ${
                          newOwner === item.id
                            ? 'bg-purple-500/25 text-purple-300 border-purple-500/60'
                            : 'bg-white/[0.03] text-slate-400 border-white/5'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Due Date */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Target Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white/[0.05] border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500/60"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-2xl btn-sexy text-xs font-bold text-white shadow-xl flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer mt-2"
                >
                  <Plus size={16} />
                  <span>{submitting ? 'Adding Goal...' : 'Create Goal ✨'}</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
