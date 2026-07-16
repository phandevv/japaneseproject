import React from 'react';

/**
 * MascotCorners — renders two floating mascots at the top-left and top-right
 * corners of the page.  Drop this into any page for instant decoration.
 */
const cornerStyle = {
  position: 'fixed',
  top: 20,
  height: 140,
  objectFit: 'contain',
  zIndex: 2,
  pointerEvents: 'none',
  opacity: 0.85,
  filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.12))',
};

const MascotCorners = () => (
  <>
    <style>{`
      @keyframes mascot-corner-float {
        0%, 100% { transform: translateY(0); }
        50%      { transform: translateY(-8px); }
      }
    `}</style>
    <img
      src="/assets/mascot_siro_kimono_nobg.png"
      alt="Siro Kimono"
      style={{
        ...cornerStyle,
        left: 'calc(var(--sidebar-width, 220px) + 20px)',
        animation: 'mascot-corner-float 3s ease-in-out infinite',
      }}
    />
    <img
      src="/assets/mascot_siro_studying.png"
      alt="Siro Studying"
      style={{
        ...cornerStyle,
        right: 20,
        animation: 'mascot-corner-float 3s ease-in-out 1.5s infinite',
      }}
    />
  </>
);

export default MascotCorners;
