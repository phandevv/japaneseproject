import React, { useState } from 'react';
import { Lock, Check, Award, Flame, BookOpen, Target, Bot, Crown, Sparkles, ChevronRight } from 'lucide-react';
import '../styles/AchievementTree.css';

const categoryMeta = {
  STREAK: {
    label: 'Chuỗi Học Tập (Streak)',
    icon: Flame,
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.08)'
  },
  VOCABULARY: {
    label: 'Từ Vựng & SRS',
    icon: BookOpen,
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.08)'
  },
  QUIZ: {
    label: 'Thử Thách Quiz',
    icon: Target,
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.08)'
  },
  AI_KAIWA: {
    label: 'Trợ Lý SIRO AI',
    icon: Bot,
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.08)'
  },
  COMMUNITY: {
    label: 'Xếp Hạng & Cống Hiến',
    icon: Crown,
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.08)'
  }
};

export default function AchievementTree({ achievements = [] }) {
  const [activeCategory, setActiveCategory] = useState('STREAK');
  const [selectedNode, setSelectedNode] = useState(null);

  // Group achievements by category
  const grouped = {};
  Object.keys(categoryMeta).forEach(cat => {
    grouped[cat] = achievements.filter(a => a.category === cat);
  });

  const currentList = grouped[activeCategory] || [];
  const currentMeta = categoryMeta[activeCategory] || categoryMeta.STREAK;
  const CategoryIcon = currentMeta.icon;

  // Calculate category progress
  const catUnlocked = currentList.filter(a => a.isUnlocked).length;
  const catTotal = currentList.length;
  const catPercent = catTotal > 0 ? Math.round((catUnlocked / catTotal) * 100) : 0;

  return (
    <div className="achievement-tree-wrapper">
      {/* Category Tabs */}
      <div className="achievement-tabs-row">
        {Object.keys(categoryMeta).map(catKey => {
          const meta = categoryMeta[catKey];
          const Icon = meta.icon;
          const items = grouped[catKey] || [];
          const unlocked = items.filter(a => a.isUnlocked).length;
          const isActive = activeCategory === catKey;

          return (
            <button
              key={catKey}
              className={`ach-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => {
                setActiveCategory(catKey);
                setSelectedNode(null);
              }}
              style={{
                borderColor: isActive ? meta.color : 'var(--border-color)',
                backgroundColor: isActive ? meta.bg : 'var(--surface-color)'
              }}
            >
              <div className="ach-tab-icon" style={{ color: meta.color }}>
                <Icon size={20} />
              </div>
              <div className="ach-tab-info">
                <span className="ach-tab-title">{meta.label}</span>
                <span className="ach-tab-subtitle">{unlocked}/{items.length} Thành tựu</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Category Header & Progress */}
      <div className="ach-tree-banner card">
        <div className="ach-banner-left">
          <div className="ach-banner-badge" style={{ backgroundColor: currentMeta.bg, color: currentMeta.color }}>
            <CategoryIcon size={28} />
          </div>
          <div>
            <h2 className="ach-banner-title">{currentMeta.label}</h2>
            <p className="ach-banner-desc">Chinh phục các cột mốc để mở khóa điểm thưởng và huy hiệu danh giá.</p>
          </div>
        </div>

        <div className="ach-banner-right">
          <div className="ach-progress-label">
            <span>Tiến Trình Nhánh</span>
            <strong>{catPercent}% ({catUnlocked}/{catTotal})</strong>
          </div>
          <div className="progress-bg" style={{ width: '180px', height: '10px' }}>
            <div 
              className="progress-fill" 
              style={{ 
                width: `${catPercent}%`,
                background: `linear-gradient(90deg, ${currentMeta.color}, #f59e0b)`
              }} 
            />
          </div>
        </div>
      </div>

      {/* Visual Skill Tree Area */}
      <div className="ach-tree-graph-container card">
        <div className="ach-nodes-path">
          {currentList.map((node, index) => {
            const isUnlocked = node.isUnlocked;
            const isSelected = selectedNode?.id === node.id;
            const pct = Math.min(100, Math.round((node.currentProgress / node.targetValue) * 100));

            return (
              <React.Fragment key={node.id}>
                {/* Connector line from previous node */}
                {index > 0 && (
                  <div className={`ach-connector-line ${currentList[index - 1].isUnlocked ? 'active' : ''}`}>
                    <div className="connector-pulse" />
                  </div>
                )}

                {/* Achievement Node */}
                <div 
                  className={`ach-node-card ${isUnlocked ? 'unlocked' : 'locked'} ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedNode(node)}
                >
                  <div className="ach-node-level-tag">Cấp {node.treeLevel}</div>

                  <div className="ach-node-badge">
                    <img 
                      src={node.icon || '/assets/badge_streak_fire.png'} 
                      alt={node.title}
                      className="ach-node-img"
                      onError={(e) => { e.target.src = '/assets/badge_streak_fire.png'; }}
                    />
                    {isUnlocked ? (
                      <div className="ach-unlocked-check">
                        <Check size={12} color="white" />
                      </div>
                    ) : (
                      <div className="ach-locked-overlay">
                        <Lock size={14} color="white" />
                      </div>
                    )}
                  </div>

                  <div className="ach-node-content">
                    <div className="ach-node-title-row">
                      <h4 className="ach-node-title">{node.title}</h4>
                      <span className="ach-node-pts">+{node.points} AP</span>
                    </div>

                    <p className="ach-node-desc">{node.description}</p>

                    {!isUnlocked && (
                      <div className="ach-node-progress-wrapper">
                        <div className="ach-node-progress-info">
                          <span>Tiến trình</span>
                          <span>{node.currentProgress} / {node.targetValue}</span>
                        </div>
                        <div className="progress-bg" style={{ height: '6px' }}>
                          <div className="progress-fill" style={{ width: `${pct}%`, backgroundColor: currentMeta.color }} />
                        </div>
                      </div>
                    )}

                    {isUnlocked && (
                      <div className="ach-node-unlocked-tag">
                        <Sparkles size={12} /> Đã hoàn thành
                      </div>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
