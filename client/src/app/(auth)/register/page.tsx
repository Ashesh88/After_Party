'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../../lib/store/authStore';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { register, isLoading } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      await register(email, password, displayName);
      toast.success('Account created!');
      router.push('/room/setup');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to register');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-[#07070e]">
      {/* Dynamic ambient lights */}
      <div className="ambient-glow-pink -top-24 -left-24 pointer-events-none" />
      <div className="ambient-glow-purple -bottom-32 -right-32 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,40,200,0.12),transparent_70%)] pointer-events-none" />

      {/* Subtle grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{ backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`, backgroundSize: '32px 32px' }}
      />

      <div className="relative w-full max-w-[420px] p-8 sm:p-10 rounded-[32px] glass-panel z-10">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-pink-500/30 mb-4 shadow-[0_0_25px_rgba(244,63,142,0.3)]">
            <span className="text-2xl">✨</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            After <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-400 to-purple-400">Party</span>
          </h1>
          <p className="text-sm text-slate-400 font-medium">
            Your private remote universe for two 💕
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
              Your Name
            </label>
            <input
              type="text"
              placeholder="e.g. Ashesh"
              className="w-full px-4 py-3.5 rounded-2xl glass-input text-slate-100 placeholder:text-slate-500 outline-none text-sm font-medium"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
              Email Address
            </label>
            <input
              type="email"
              placeholder="you@love.com"
              className="w-full px-4 py-3.5 rounded-2xl glass-input text-slate-100 placeholder:text-slate-500 outline-none text-sm font-medium"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-3.5 rounded-2xl glass-input text-slate-100 placeholder:text-slate-500 outline-none text-sm font-medium"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                Confirm
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-3.5 rounded-2xl glass-input text-slate-100 placeholder:text-slate-500 outline-none text-sm font-medium"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-2xl btn-sexy text-white font-semibold text-sm tracking-wide transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <span>Create Couple Space</span>
                  <span className="text-base">🚀</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-white/[0.06] text-center">
          <p className="text-xs text-slate-400">
            Already have a space?{' '}
            <Link 
              href="/login" 
              className="text-pink-400 font-semibold hover:text-pink-300 transition-colors underline underline-offset-4"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
