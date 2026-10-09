'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../lib/store/authStore';

export default function RoomSetupPage() {
  const [inviteCode, setInviteCode] = useState('');
  const [createdCode, setCreatedCode] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setRoom = useAuthStore((state) => state.setRoom);

  const handleCreateRoom = async () => {
    setLoading(true);
    try {
      const res = await api.post('/rooms/create');
      setCreatedCode(res.data.room.inviteCode);
      setRoom(res.data.room);
      toast.success('Room created!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/rooms/join', { inviteCode });
      setRoom(res.data.room);
      toast.success('Joined room!');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(createdCode);
    toast.success('Code copied!');
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-[#07070e]">
      {/* Ambient background glows */}
      <div className="ambient-glow-pink -top-20 -left-20 pointer-events-none" />
      <div className="ambient-glow-purple -bottom-24 -right-24 pointer-events-none" />
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{ backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`, backgroundSize: '32px 32px' }}
      />

      <div className="relative w-full max-w-[440px] p-8 sm:p-10 rounded-[32px] glass-panel z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-pink-500/30 mb-4 shadow-[0_0_25px_rgba(244,63,142,0.3)]">
            <span className="text-2xl">🏡</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
            Couple <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-400 to-purple-400">Space</span>
          </h1>
          <p className="text-sm text-slate-400 font-medium">
            Create a sacred room or join your partner's invite
          </p>
        </div>

        {!createdCode ? (
          <div className="space-y-6">
            <div>
              <button
                onClick={handleCreateRoom}
                disabled={loading}
                className="w-full py-4 px-6 rounded-2xl btn-sexy text-white font-semibold text-sm shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Create New Room</span>
                <span className="text-base">✨</span>
              </button>
            </div>
            
            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-white/[0.08]" />
              <span className="absolute bg-[#0f0f1c] px-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
                OR
              </span>
            </div>

            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 ml-1">
                  Have an Invite Code?
                </label>
                <input
                  type="text"
                  placeholder="e.g. 7A8B9C1D"
                  className="w-full px-4 py-3.5 rounded-2xl glass-input text-center text-slate-100 font-mono tracking-[0.25em] text-lg placeholder:text-slate-600 uppercase outline-none"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  maxLength={8}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading || inviteCode.length < 8}
                className="w-full py-4 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white font-semibold text-sm transition-all disabled:opacity-40 cursor-pointer shadow-lg"
              >
                {loading ? 'Joining...' : 'Enter Partner Space 🗝️'}
              </button>
            </form>
          </div>
        ) : (
          <div className="text-center space-y-6">
            <div className="p-6 rounded-2xl bg-pink-500/[0.05] border border-pink-500/20 backdrop-blur-md">
              <p className="text-xs uppercase tracking-wider font-semibold text-pink-300 mb-3">
                Your Secret Pairing Code
              </p>
              <div className="text-4xl sm:text-5xl font-mono tracking-[0.2em] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-300 to-purple-400 py-2 selection:bg-transparent">
                {createdCode}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Send this 8-digit code to your partner to pair!
              </p>
            </div>

            <button
              onClick={copyCode}
              className="w-full py-3.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-200 font-medium text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Copy Code to Clipboard</span>
              <span>📋</span>
            </button>

            <button
              onClick={() => router.push('/dashboard')}
              className="w-full py-4 rounded-2xl btn-sexy text-white font-semibold text-sm transition-all cursor-pointer shadow-xl flex items-center justify-center gap-2"
            >
              <span>Enter Dashboard</span>
              <span>🚀</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
