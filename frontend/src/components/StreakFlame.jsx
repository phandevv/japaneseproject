import React, { useState, useEffect } from 'react';

const TOTAL_FRAMES = 19;
const FPS = 12;
const FRAME_DURATION = 1000 / FPS;

const FRAME_PATHS = Array.from({ length: TOTAL_FRAMES }, (_, i) => {
  const pad = i < 10 ? `0${i}` : `${i}`;
  return `/sprites/frame_${pad}.png`;
});

// Preload all 19 frames in browser memory once
if (typeof window !== 'undefined') {
  FRAME_PATHS.forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}

// Global ticker for synchronized 12fps loop across all StreakFlame components
let globalFrame = 0;
const listeners = new Set();
let tickerTimer = null;

function startGlobalTicker() {
  if (!tickerTimer) {
    tickerTimer = setInterval(() => {
      globalFrame = (globalFrame + 1) % TOTAL_FRAMES;
      listeners.forEach((fn) => fn(globalFrame));
    }, FRAME_DURATION);
  }
}

function stopGlobalTicker() {
  if (listeners.size === 0 && tickerTimer) {
    clearInterval(tickerTimer);
    tickerTimer = null;
  }
}

/**
 * Hook to subscribe to global 12fps animation frame
 */
export function useFlameFrame() {
  const [frame, setFrame] = useState(globalFrame);

  useEffect(() => {
    listeners.add(setFrame);
    startGlobalTicker();

    return () => {
      listeners.delete(setFrame);
      stopGlobalTicker();
    };
  }, []);

  return frame;
}

/**
 * StreakFlame Component
 * Renders 19-frame seamless Amaterasu flame animation at 12 FPS.
 */
export default function StreakFlame({
  size = 32,
  active = true,
  showGlow = true,
  className = '',
  style = {},
  title = ''
}) {
  const currentFrame = useFlameFrame();

  const dimension = typeof size === 'number' ? `${size}px` : size;

  const activeFilter = showGlow
    ? 'drop-shadow(0 0 6px rgba(168, 85, 247, 0.55)) drop-shadow(0 0 14px rgba(192, 132, 252, 0.35))'
    : 'none';

  const inactiveFilter = 'grayscale(1) opacity(0.32) brightness(0.7)';

  return (
    <div
      className={`streak-flame-container ${active ? 'is-active' : 'is-inactive'} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: dimension,
        height: dimension,
        position: 'relative',
        flexShrink: 0,
        ...style
      }}
      title={title}
    >
      <img
        src={FRAME_PATHS[currentFrame]}
        alt="Streak Flame"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          userSelect: 'none',
          pointerEvents: 'none',
          filter: active ? activeFilter : inactiveFilter,
          transition: 'filter 0.3s ease'
        }}
        draggable={false}
      />
    </div>
  );
}
