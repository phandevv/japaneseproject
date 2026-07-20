import React from 'react';

/**
 * MascotCorners — renders two floating mascots at the top-left and top-right
 * corners of the page. Drop this into any page for instant decoration.
 */
const cornerStyle = {
  position: 'fixed',
  top: '20px',
  width: '140px',
  height: '140px',
  zIndex: 2,
  pointerEvents: 'none',
  filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.12))',
  isolation: 'isolate',
};

const MascotImage = ({ src, position, delay = '0s' }) => {
  const imgSrc = src.includes('_nobg') ? src : src.replace('.png', '_nobg.png');
  const positionStyle = position === 'left' ? { left: '20px' } : { right: '20px' };

  return (
    <div
      style={{
        ...cornerStyle,
        ...positionStyle,
        animation: `mascot-corner-float 3s ease-in-out ${delay} infinite`,
      }}
    >
      <img
        src={`/assets/${imgSrc}`}
        alt="Siro Mascot"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      />
    </div>
  );
};

const MascotCorners = ({ leftMascot = "mascot_siro_kimono_nobg.png", rightMascot = "mascot_siro_studying.png" }) => (
  <>
    <style>{`
      @keyframes mascot-corner-float {
        0%, 100% { transform: translateY(0); }
        50%      { transform: translateY(-8px); }
      }
    `}</style>
    <MascotImage src={leftMascot} position="left" delay="0s" />
    <MascotImage src={rightMascot} position="right" delay="1.5s" />
  </>
);

export default MascotCorners;
