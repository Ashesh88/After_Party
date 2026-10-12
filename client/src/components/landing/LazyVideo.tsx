'use client';

import { useRef, useEffect } from 'react';

interface LazyVideoProps {
  src: string;
  poster?: string;
  ariaLabel: string;
  className?: string;
}

export default function LazyVideo({ src, poster, ariaLabel, className }: LazyVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.25 }
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        preload="none"
        loop
        muted
        playsInline
        aria-label={ariaLabel}
        className={className || 'w-full h-full object-cover pointer-events-none'}
        style={{ objectPosition: 'top center' }}
      />
      {/* Subtle bottom edge gradient to ensure any bottom-right corner watermark is completely invisible */}
      <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#121224] via-[#121224]/70 to-transparent pointer-events-none" />
    </div>
  );
}
