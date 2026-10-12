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
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      preload="none"
      loop
      muted
      playsInline
      aria-label={ariaLabel}
      className={className || 'w-full h-full object-cover'}
    />
  );
}
