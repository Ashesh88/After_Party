'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Layers, Check, Copy, Sparkles, ArrowRight, 
  Trash2, Edit2, Plus, Loader2, KeyRound, ShieldCheck, Heart
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuthStore } from '../lib/store/authStore';
import { useSocketStore } from '../lib/store/socketStore';
import { useMoodStore } from '../lib/store/moodStore';
import { SavedSpace } from '../lib/types';

interface SavedSpacesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSpaceSwitched?: (room: any) => void;
}

export default function SavedSpacesModal({ isOpen, onClose, onSpaceSwitched }: SavedSpacesModalProps) {
  const user = useAuthStore((state) => state.user);
  const setAuthRoom = useAuthStore((state) => state.setRoom);
  const socket = useSocketStore((state) => state.socket);
  const fetchMood = useMoodStore((state) => state.fetchMood);

  const [spaces, setSpaces] = useState<SavedSpace[]>([]);
  const [loading, setLoading] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // New space inputs
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  const fetchSpaces = async () => {
    try {
      setLoading(true);
      const res = await api.get('/rooms/saved');
      setSpaces(res.data.spaces || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSpaces();
    }
  }, [isOpen]);

  const handleCopyCode = (roomId: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(roomId);
    toast.success('Room code copied');
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleSwitchSpace = async (space: SavedSpace) => {
    if (space.isActive) {
      toast('Already in this space');
      return;
    }

    setSwitchingId(space.roomId);
    try {
      const res = await api.post(`/rooms/switch/${space.roomId}`);
      const newRoom = res.data.room;

      setAuthRoom(newRoom);
      if (socket) {
        socket.emit('room:switch', { roomId: newRoom._id });
      }

      fetchMood();
      window.dispatchEvent(new CustomEvent('room:changed', { detail: newRoom }));

      if (onSpaceSwitched) {
        onSpaceSwitched(newRoom);
      }

      toast.success(`Switched to "${space.customName || 'Space'}"! Everything restored ✨`);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to switch space');
    } finally {
      setSwitchingId(null);
    }
  };

  const handleStartRename = (space: SavedSpace) => {
    setEditingId(space.roomId);
    setEditName(space.customName || '');
  };

  const handleSaveRename = async (roomId: string) => {
    if (!editName.trim()) return;
    setSavingName(true);
    try {
      await api.post('/rooms/save', {
        roomId,
        customName: editName.trim(),
      });
      setSpaces((prev) =>
        prev.map((s) => (s.roomId === roomId ? { ...s, customName: editName.trim() } : s))
      );
      setEditingId(null);
      toast.success('Space nickname updated');
    } catch {
      toast.error('Failed to update nickname');
    } finally {
      setSavingName(false);
    }
  };

  const handleRemoveSpace = async (roomId: string, name: string) => {
    if (!confirm(`Remove "${name}" from your saved spaces list? (Data in room will not be lost)`)) {
      return;
    }
    try {
      await api.delete(`/rooms/saved/${roomId}`);
      setSpaces((prev) => prev.filter((s) => s.roomId !== roomId));
      toast.success('Space removed from saved list');
    } catch {
      toast.error('Failed to remove space');
    }
  };

  const handleJoinNewSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;

    setJoining(true);
    try {
      const res = await api.post('/rooms/join', { inviteCode: code });
      const newRoom = res.data.room;

      setAuthRoom(newRoom);
      if (socket) {
        socket.emit('room:switch', { roomId: newRoom._id });
      }

      fetchMood();
      window.dispatchEvent(new CustomEvent('room:changed', { detail: newRoom }));

      if (onSpaceSwitched) {
        onSpaceSwitched(newRoom);
      }

      toast.success(`Joined and saved space ${code}! ✨`);
      setJoinCode('');
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not join room');
    } finally {
      setJoining(false);
    }
  };

  if (!isOpen) return null;

  const activeSpace = spaces.find((s) => s.isActive);
  const otherSpaces = spaces.filter((s) => !s.isActive);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-xl rounded-3xl glass-panel border border-purple-500/30 p-4 sm:p-6 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col bg-[#0d0c18]/95"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-60 h-60 rounded-full blur-3xl opacity-25 pointer-events-none bg-purple-500" />
          <div className="absolute -bottom-24 -left-24 w-60 h-60 rounded-full blur-3xl opacity-20 pointer-events-none bg-pink-500" />

          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500/25 to-pink-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-md">
                <Layers size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-white leading-tight flex items-center gap-2">
                  <span>My Spaces</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono font-bold uppercase tracking-wider border border-purple-500/30">
                    {spaces.length} Saved
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400">
                  Switch seamlessly between your private rooms without losing goals or history
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto space-y-4 py-3.5 pr-1 flex-1 custom-scrollbar">
            {/* Active Space Banner Card */}
            {activeSpace && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/50 via-[#181128] to-pink-950/40 border border-purple-500/40 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Current Active Space</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => handleCopyCode(activeSpace.roomId, activeSpace.inviteCode)}
                    className="font-mono text-xs text-pink-300 font-bold flex items-center gap-1 hover:text-white"
                  >
                    <span>Room: {activeSpace.inviteCode}</span>
                    {copiedCodeId === activeSpace.roomId ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="opacity-70" />}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 flex-wrap">
                  {editingId === activeSpace.roomId ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="e.g. My Love 💕"
                        className="px-3 py-1.5 rounded-xl bg-black/40 border border-purple-500/40 text-white text-sm font-bold flex-1 focus:outline-none"
                      />
                      <button
                        onClick={() => handleSaveRename(activeSpace.roomId)}
                        disabled={savingName}
                        className="px-3 py-1.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold"
                      >
                        {savingName ? <Loader2 size={12} className="animate-spin" /> : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2 py-1.5 text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black text-white">
                        {activeSpace.customName || 'Active Space'}
                      </h3>
                      <button
                        onClick={() => handleStartRename(activeSpace)}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                        title="Rename space nickname"
                      >
                        <Edit2 size={12} />
                      </button>
                    </div>
                  )}

                  {activeSpace.partner && (
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <span className="text-slate-500">with</span>
                      <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-800">
                        {activeSpace.partner.avatar ? (
                          <img src={activeSpace.partner.avatar} alt="partner" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] flex items-center justify-center font-bold text-white">
                            {activeSpace.partner.displayName?.charAt(0)}
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-white">{activeSpace.partner.displayName}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Other Saved Spaces List */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Layers size={13} className="text-purple-400" />
                  <span>Other Spaces ({otherSpaces.length})</span>
                </span>
              </div>

              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin text-purple-400" />
                  <span>Loading spaces...</span>
                </div>
              ) : otherSpaces.length === 0 ? (
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 text-center text-xs text-slate-400">
                  No other saved spaces yet. Join or create another room below to switch back and forth anytime!
                </div>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                  {otherSpaces.map((space) => {
                    return (
                      <div
                        key={space.roomId}
                        className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-purple-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                      >
                        <div className="min-w-0 space-y-1">
                          {editingId === space.roomId ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="Space name..."
                                className="px-2.5 py-1 rounded-xl bg-black/40 border border-purple-500/40 text-white text-xs font-bold focus:outline-none"
                              />
                              <button
                                onClick={() => handleSaveRename(space.roomId)}
                                disabled={savingName}
                                className="px-2.5 py-1 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="text-xs text-slate-400 hover:text-white"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-extrabold text-sm text-white truncate">
                                {space.customName || 'Saved Space'}
                              </h4>
                              <button
                                onClick={() => handleStartRename(space)}
                                className="p-0.5 rounded text-slate-500 hover:text-white"
                                title="Rename nickname"
                              >
                                <Edit2 size={11} />
                              </button>
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                            <span className="font-mono text-purple-300 font-semibold">
                              Code: {space.inviteCode}
                            </span>
                            {space.partner && (
                              <span>• with <strong className="text-white">{space.partner.displayName}</strong></span>
                            )}
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/5 border border-white/10 uppercase font-mono">
                              {space.memberCount} member{space.memberCount === 1 ? '' : 's'}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            disabled={switchingId === space.roomId}
                            onClick={() => handleSwitchSpace(space)}
                            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {switchingId === space.roomId ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <ArrowRight size={13} />
                            )}
                            <span>Switch</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveSpace(space.roomId, space.customName)}
                            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-500 hover:text-rose-300 flex items-center justify-center transition-all cursor-pointer"
                            title="Remove from saved list"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Switch / Join via Code Form */}
            <form onSubmit={handleJoinNewSpace} className="space-y-1.5 pt-2 border-t border-white/10">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <KeyRound size={13} className="text-pink-400" />
                <span>Join & Save Another Space by Code</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter 8-digit Room Code (e.g. 7F3BCB8F)"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs sm:text-sm font-mono focus:outline-none focus:border-purple-400 transition-colors uppercase"
                />
                <button
                  type="submit"
                  disabled={joining || joinCode.trim().length < 8}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 hover:brightness-110 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95 disabled:opacity-50 shrink-0"
                >
                  {joining ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  <span>Join Space</span>
                </button>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
            <span>Themes, countdowns, and chats stay 100% saved in each space</span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold transition-all cursor-pointer active:scale-95"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
