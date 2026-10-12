'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, Menu, X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0f0f1a]/85 border-b border-white/[0.08] transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link 
          href="/" 
          className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 rounded-xl p-1"
          aria-label="After Party Home"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-purple-600 p-[1.5px] shadow-[0_0_20px_rgba(244,63,94,0.35)] group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-[#121224] rounded-[14px] flex items-center justify-center">
              <Heart size={18} className="text-rose-400 fill-rose-400/30" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-display text-lg sm:text-xl font-bold tracking-tight text-white group-hover:text-rose-200 transition-colors">
              After Party
            </span>
            <span className="text-xs font-medium tracking-wider text-slate-400 -mt-0.5 hidden sm:block">
              For Long-Distance Couples
            </span>
          </div>
        </Link>

        {/* Desktop Nav Items */}
        <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="#how-it-works" className="hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 rounded-md px-1 py-0.5">
            How It Works
          </a>
          <a href="#features" className="hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 rounded-md px-1 py-0.5">
            Features
          </a>
          <a href="#squads" className="hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 rounded-md px-1 py-0.5">
            Friend Squads
          </a>
          <a href="#privacy" className="hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 rounded-md px-1 py-0.5">
            Privacy
          </a>
          <a href="#faqs" className="hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 rounded-md px-1 py-0.5">
            FAQ
          </a>
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 rounded-xl"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold text-sm shadow-[0_4px_20px_rgba(244,63,94,0.35)] hover:shadow-[0_4px_25px_rgba(244,63,94,0.5)] active:scale-95 transition-all flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            <span>Start Free</span>
            <ArrowRight size={15} />
          </Link>
        </div>

        {/* Mobile Hamburger Button (Strict min 44x44px tap target) */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            href="/login"
            className="min-h-[44px] px-3 flex items-center text-sm font-semibold text-slate-200 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 rounded-xl"
          >
            Sign In
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/[0.06] border border-white/10 text-slate-200 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

      </div>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-white/[0.08] bg-[#121224]/98 backdrop-blur-2xl px-5 py-6 space-y-5 overflow-hidden shadow-2xl"
          >
            <div className="flex flex-col gap-2 font-medium text-slate-200 text-base">
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="py-3 px-3 rounded-xl hover:bg-white/[0.06] transition-colors"
              >
                How It Works
              </a>
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="py-3 px-3 rounded-xl hover:bg-white/[0.06] transition-colors"
              >
                Features
              </a>
              <a
                href="#squads"
                onClick={() => setMobileMenuOpen(false)}
                className="py-3 px-3 rounded-xl hover:bg-white/[0.06] transition-colors"
              >
                Friend Squads
              </a>
              <a
                href="#privacy"
                onClick={() => setMobileMenuOpen(false)}
                className="py-3 px-3 rounded-xl hover:bg-white/[0.06] transition-colors"
              >
                Privacy
              </a>
              <a
                href="#faqs"
                onClick={() => setMobileMenuOpen(false)}
                className="py-3 px-3 rounded-xl hover:bg-white/[0.06] transition-colors"
              >
                FAQ
              </a>
            </div>

            <div className="pt-4 border-t border-white/[0.08] flex flex-col gap-3">
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full min-h-[44px] py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold text-center text-sm shadow-md flex items-center justify-center"
              >
                Start your space, free
              </Link>
              <Link
                href="/room/setup"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full min-h-[44px] py-3 rounded-xl bg-white/[0.08] text-white font-semibold text-center text-sm border border-white/10 flex items-center justify-center"
              >
                Join with room code
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
