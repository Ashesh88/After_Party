'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function StickyCta() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShow(window.scrollY > 480);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-[#0f0f1a]/95 backdrop-blur-xl border-t border-white/10 flex items-center gap-2.5 shadow-[0_-10px_25px_rgba(0,0,0,0.8)]"
        >
          <Link
            href="/register"
            className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold text-center text-sm shadow-md active:scale-95 transition-transform flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            Start your space, free
          </Link>
          <Link
            href="/room/setup"
            className="min-h-[44px] py-2.5 px-3.5 rounded-xl bg-white/[0.08] text-white font-semibold text-xs border border-white/10 shrink-0 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            Enter Code
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
