import React, { useState, useEffect } from 'react';
import { Trophy, Sparkles, X, Award, CheckCircle2 } from 'lucide-react';
import '../styles/AchievementUnlockModal.css';

export default function AchievementUnlockModal({ newlyUnlocked = [], onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!newlyUnlocked || newlyUnlocked.length === 0) return null;

  const currentAch = newlyUnlocked[currentIndex];
  const isLast = currentIndex === newlyUnlocked.length - 1;

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  return (
    <div className="achievement-overlay animate-fade-in">
      <div className="achievement-modal-card">
        {/* Background glow & sparkles */}
        <div className="achievement-card-glow" />
        
        <button className="achievement-close-btn" onClick={onClose} title="Đóng">
          <X size={18} />
        </button>

        <div className="achievement-badge-header">
          <div className="achievement-title-chip">
            <Sparkles size={14} className="sparkle-icon" />
            <span>THÀNH TỰU MỚI MỞ KHÓA!</span>
            <Sparkles size={14} className="sparkle-icon" />
          </div>

          <div className="achievement-badge-container">
            <div className="badge-ring-pulse" />
            <img 
              src={currentAch.icon || '/assets/badge_streak_fire.png'} 
              alt={currentAch.title} 
              className="achievement-badge-img"
              onError={(e) => { e.target.src = '/assets/badge_streak_fire.png'; }}
            />
          </div>
        </div>

        <div className="achievement-body">
          <h2 className="achievement-name">{currentAch.title}</h2>
          <p className="achievement-desc">{currentAch.description}</p>

          <div className="achievement-reward-row">
            <div className="reward-item">
              <Award size={18} color="#f59e0b" />
              <span>+{currentAch.points} Điểm AP</span>
            </div>
            <div className="reward-item">
              <CheckCircle2 size={18} color="#10b981" />
              <span>Cấp độ {currentAch.treeLevel}</span>
            </div>
          </div>

          {newlyUnlocked.length > 1 && (
            <div className="achievement-counter">
              Thành tựu {currentIndex + 1} / {newlyUnlocked.length}
            </div>
          )}
        </div>

        <div className="achievement-footer">
          <button className="achievement-claim-btn" onClick={handleNext}>
            {isLast ? 'Tuyệt Vời! Nhận Thưởng' : 'Tiếp Theo'}
          </button>
        </div>
      </div>
    </div>
  );
}
