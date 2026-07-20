import React from 'react';

const MascotLoader = ({ message = "Đang tải dữ liệu..." }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', width: '100%', minHeight: '200px' }}>
      <style>{`
        .mascot-loader-container {
          position: relative;
          width: 240px;
          height: 80px;
          display: flex;
          align-items: flex-end;
          margin-bottom: 20px;
        }

        .mascot-loader-track {
          width: 100%;
          height: 8px;
          background: rgba(0, 0, 0, 0.1);
          border-radius: 10px;
          position: absolute;
          bottom: 0;
          left: 0;
          overflow: hidden;
        }

        .mascot-loader-bar {
          height: 100%;
          width: 80px;
          background: var(--accent-color);
          border-radius: 10px;
          position: absolute;
          left: 0;
          bottom: 0;
          animation: slide-bar 2s ease-in-out infinite;
        }

        .mascot-runner {
          width: 60px;
          height: 60px;
          position: absolute;
          bottom: 4px; /* Slightly above the track */
          left: 0;
          animation: run-fox 2s ease-in-out infinite;
          transform-origin: center bottom;
        }

        @keyframes slide-bar {
          0% { transform: translateX(0px); }
          48% { transform: translateX(160px); }
          50% { transform: translateX(160px); }
          98% { transform: translateX(0px); }
          100% { transform: translateX(0px); }
        }

        @keyframes run-fox {
          0% { transform: translateX(-10px) scaleX(1); }
          48% { transform: translateX(190px) scaleX(1); }
          50% { transform: translateX(190px) scaleX(-1); }
          98% { transform: translateX(-10px) scaleX(-1); }
          100% { transform: translateX(-10px) scaleX(1); }
        }
        
        .mascot-loader-text {
          color: var(--text-secondary);
          font-weight: 700;
          font-family: var(--font-ui);
          font-size: 1.1rem;
          animation: pulse-text 1.5s infinite;
        }
        
        @keyframes pulse-text {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
      `}</style>

      <div className="mascot-loader-container">
        <img src="/assets/mascot_siro_ninja_nobg.png" className="mascot-runner" alt="Loading Mascot" />
        <div className="mascot-loader-track">
          <div className="mascot-loader-bar"></div>
        </div>
      </div>
      
      <div className="mascot-loader-text">{message}</div>
    </div>
  );
};

export default MascotLoader;
