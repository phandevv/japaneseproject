import React, { useMemo } from 'react';

/**
 * SakuraPetals — renders falling cherry blossom petals as a background effect.
 * Drop this into any page for instant sakura ambiance.
 */

const SakuraPetals = ({ count = 18 }) => {
  const petals = useMemo(() =>
    Array.from({ length: count }).map((_, i) => ({
      left: Math.random() * 100,
      dur: 8 + Math.random() * 8,
      delay: Math.random() * 10,
      size: 10 + Math.random() * 14,
      swayDur: 3 + Math.random() * 4,
    })), [count]);

  return (
    <>
      <style>{`
        @keyframes sakura-petal-fall {
          0%   { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
        }
        @keyframes sakura-petal-sway {
          0%, 100% { margin-left: 0; }
          25%      { margin-left: 30px; }
          75%      { margin-left: -30px; }
        }
      `}</style>
      {petals.map((p, i) => (
        <span
          key={`sakura-${i}`}
          style={{
            position: 'fixed',
            top: -20,
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            borderRadius: '50% 0 50% 50%',
            background: 'linear-gradient(135deg, rgba(255,183,197,0.7), rgba(255,105,135,0.4))',
            pointerEvents: 'none',
            zIndex: 0,
            opacity: 0.45,
            animation: `sakura-petal-fall ${p.dur}s linear ${p.delay}s infinite, sakura-petal-sway ${p.swayDur}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </>
  );
};

export default SakuraPetals;
