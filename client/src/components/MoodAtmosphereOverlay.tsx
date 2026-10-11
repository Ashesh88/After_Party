'use client';

import React, { useEffect, useState } from 'react';
import { useMoodStore, MOOD_CONFIG } from '../lib/store/moodStore';
import { useSocketStore } from '../lib/store/socketStore';
import { soundService } from '../lib/soundService';
import toast from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';

export default function MoodAtmosphereOverlay() {
  const moodTheme = useMoodStore((state) => state.moodTheme);
  const socket = useSocketStore((state) => state.socket);
  const [nudgeAlert, setNudgeAlert] = useState<{ emoji: string; text: string; sender: string } | null>(null);

  const currentMood = moodTheme.current || 'love';
  const config = MOOD_CONFIG[currentMood] || MOOD_CONFIG.love;

  // Listen to socket mood:nudge event from partner
  useEffect(() => {
    if (!socket) return;
    const handleNudge = (data: { emoji: string; text: string; senderName?: string }) => {
      soundService.playMoodNudge();
      setNudgeAlert({
        emoji: data.emoji || '💖',
        text: data.text || 'sent you love!',
        sender: data.senderName || 'Partner',
      });
      setTimeout(() => setNudgeAlert(null), 4000);
    };

    socket.on('mood:nudge', handleNudge);
    return () => {
      socket.off('mood:nudge', handleNudge);
    };
  }, [socket]);

  return (
    <>
      {/* Interactive Particle Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-[2] overflow-hidden select-none">
        {/* LOVE: Floating glowing hearts */}
        {currentMood === 'love' && (
          <div className="absolute inset-0">
            {[...Array(12)].map((_, i) => (
              <span
                key={i}
                className="absolute text-pink-400 opacity-25 animate-float-heart drop-shadow-[0_0_8px_rgba(244,63,142,0.8)]"
                style={{
                  left: `${(i * 8.5 + 4) % 96}%`,
                  bottom: '-20px',
                  fontSize: `${14 + (i % 4) * 6}px`,
                  animationDuration: `${7 + (i % 5) * 2}s`,
                  animationDelay: `${(i * 0.7) % 5}s`,
                }}
              >
                ♥
              </span>
            ))}
          </div>
        )}

        {/* ANGER: Rising fiery ember sparks */}
        {currentMood === 'angry' && (
          <div className="absolute inset-0">
            {[...Array(14)].map((_, i) => (
              <span
                key={i}
                className="absolute text-orange-400 opacity-30 animate-float-ember drop-shadow-[0_0_10px_rgba(239,68,68,0.9)]"
                style={{
                  left: `${(i * 7.2 + 3) % 96}%`,
                  bottom: '-15px',
                  fontSize: `${10 + (i % 3) * 5}px`,
                  animationDuration: `${5 + (i % 4) * 1.5}s`,
                  animationDelay: `${(i * 0.5) % 4}s`,
                }}
              >
                ✦
              </span>
            ))}
          </div>
        )}

        {/* JUST FRIENDS: Gaming neon stars & chill geometric sparks */}
        {currentMood === 'just_friends' && (
          <div className="absolute inset-0">
            {[...Array(14)].map((_, i) => (
              <span
                key={i}
                className="absolute text-cyan-300 opacity-25 animate-float-star drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                style={{
                  left: `${(i * 7.5 + 5) % 96}%`,
                  bottom: '-20px',
                  fontSize: `${11 + (i % 3) * 5}px`,
                  animationDuration: `${8 + (i % 4) * 2}s`,
                  animationDelay: `${(i * 0.6) % 6}s`,
                }}
              >
                ★
              </span>
            ))}
          </div>
        )}

        {/* SAD: Gentle calming blue raindrops drifting down */}
        {currentMood === 'sad' && (
          <div className="absolute inset-0">
            {[...Array(16)].map((_, i) => (
              <span
                key={i}
                className="absolute text-blue-400 opacity-30 animate-fall-rain drop-shadow-[0_0_6px_rgba(59,130,246,0.8)]"
                style={{
                  left: `${(i * 6.2 + 2) % 96}%`,
                  top: '-20px',
                  fontSize: `${12 + (i % 3) * 4}px`,
                  animationDuration: `${4 + (i % 3) * 1.5}s`,
                  animationDelay: `${(i * 0.4) % 4}s`,
                }}
              >
                💧
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Floating Center Screen Partner Nudge Notification */}
      <AnimatePresence>
        {nudgeAlert && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[150] px-5 py-3 rounded-2xl glass-panel border shadow-2xl backdrop-blur-xl flex items-center gap-3 select-none pointer-events-auto"
            style={{
              borderColor: `${config.primaryColor}60`,
              backgroundColor: 'rgba(12, 13, 26, 0.92)',
              boxShadow: `0 10px 40px ${config.glowColor}`,
            }}
          >
            <span className="text-3xl animate-bounce">{nudgeAlert.emoji}</span>
            <div>
              <p className="text-xs font-bold text-white">
                <span style={{ color: config.primaryColor }}>{nudgeAlert.sender}</span> {nudgeAlert.text}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Atmosphere sync active</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @keyframes floatHeart {
          0% {
            transform: translateY(0) scale(0.8) rotate(0deg);
            opacity: 0;
          }
          20% {
            opacity: 0.35;
          }
          80% {
            opacity: 0.35;
          }
          100% {
            transform: translateY(-110vh) scale(1.2) rotate(25deg);
            opacity: 0;
          }
        }
        @keyframes floatEmber {
          0% {
            transform: translateY(0) scale(0.7);
            opacity: 0;
          }
          30% {
            opacity: 0.4;
          }
          70% {
            opacity: 0.4;
          }
          100% {
            transform: translateY(-105vh) scale(1.1) translateX(15px);
            opacity: 0;
          }
        }
        @keyframes floatStar {
          0% {
            transform: translateY(0) scale(0.6) rotate(0deg);
            opacity: 0;
          }
          25% {
            opacity: 0.35;
          }
          75% {
            opacity: 0.35;
          }
          100% {
            transform: translateY(-110vh) scale(1.15) rotate(180deg);
            opacity: 0;
          }
        }
        @keyframes fallRain {
          0% {
            transform: translateY(0) scale(0.8);
            opacity: 0;
          }
          20% {
            opacity: 0.35;
          }
          80% {
            opacity: 0.35;
          }
          100% {
            transform: translateY(110vh) scale(1.1);
            opacity: 0;
          }
        }
        .animate-float-heart {
          animation: floatHeart linear infinite;
        }
        .animate-float-ember {
          animation: floatEmber linear infinite;
        }
        .animate-float-star {
          animation: floatStar linear infinite;
        }
        .animate-fall-rain {
          animation: fallRain linear infinite;
        }
      `}</style>
    </>
  );
}
