// Study Timer (Pomodoro) Floating Widget
// Positioned directly below AI Assistant, opens floating panel to the left

import React, { useState, useEffect, useRef } from 'react';
import { 
  Timer as TimerIcon, 
  Play, 
  Pause, 
  RotateCcw, 
  SkipForward, 
  Settings as SettingsIcon, 
  X, 
  Sparkles,
  CheckCircle2,
  Coffee
} from 'lucide-react';
import { useStudyTimer } from './useStudyTimer';
import StudyTimerSettings from './StudyTimerSettings';
import '../../styles/StudyTimerWidget.css';

export default function StudyTimerWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('timer'); // 'timer' | 'settings'
  const panelRef = useRef(null);

  const {
    mode,
    status,
    currentSession,
    totalSessions,
    completedFocusSessions,
    formattedTime,
    progressRatio,
    settings,
    start,
    pause,
    resume,
    reset,
    skip,
    updateSettings,
  } = useStudyTimer();

  // Close panel on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Click outside to close (Desktop & Mobile)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isOpen && panelRef.current && !panelRef.current.contains(e.target) && !e.target.closest('.study-timer-fab')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Phase Title & Badge in natural Japanese
  const getPhaseInfo = () => {
    switch (mode) {
      case 'SHORT_BREAK':
        return {
          title: '短い休憩',
          sub: 'リフレッシュタイム',
          colorClass: 'phase-short-break',
          icon: <Coffee size={15} />,
        };
      case 'LONG_BREAK':
        return {
          title: '長い休憩',
          sub: 'しっかり休みましょう',
          colorClass: 'phase-long-break',
          icon: <Coffee size={15} />,
        };
      case 'FOCUS':
      default:
        return {
          title: '集中',
          sub: '日本語の学習に集中',
          colorClass: 'phase-focus',
          icon: <Sparkles size={15} />,
        };
    }
  };

  const phaseInfo = getPhaseInfo();

  // Render session indicator dots: ● ○ ○ ○
  const renderSessionDots = () => {
    const dots = [];
    for (let i = 1; i <= totalSessions; i++) {
      const isCompleted = i < currentSession;
      const isCurrent = i === currentSession;
      dots.push(
        <span
          key={i}
          className={`study-timer-dot ${isCompleted ? 'completed' : ''} ${isCurrent ? 'active' : ''}`}
          title={`セッション ${i}`}
        >
          {isCompleted ? '●' : (isCurrent ? '●' : '○')}
        </span>
      );
    }
    return dots;
  };

  const handleToggleOpen = () => {
    setIsOpen(prev => !prev);
    setActiveTab('timer');
  };

  return (
    <>
      {/* ── Floating Study Timer FAB Button ────────────────────────── */}
      <button
        className={`study-timer-fab ${isOpen ? 'open' : ''} ${status === 'RUNNING' ? 'running' : ''}`}
        onClick={handleToggleOpen}
        title="日本語学習タイマー (Pomodoro)"
        aria-label="学習タイマーを開く"
        aria-expanded={isOpen}
      >
        <div className="study-timer-fab-inner">
          <TimerIcon size={24} className="study-timer-fab-icon" />
          {status === 'RUNNING' && (
            <span className="study-timer-fab-time">
              {formattedTime}
            </span>
          )}
        </div>
        {status === 'RUNNING' && <span className="study-timer-fab-pulse" />}
      </button>

      {/* ── Floating Timer Panel (Opens to the LEFT of the FAB) ────── */}
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div 
            className="study-timer-backdrop" 
            onClick={() => setIsOpen(false)} 
            aria-hidden="true" 
          />

          <div 
            ref={panelRef} 
            className={`study-timer-panel ${phaseInfo.colorClass}`}
            role="dialog"
            aria-label="日本語学習タイマー"
          >
            {activeTab === 'settings' ? (
              <StudyTimerSettings
                settings={settings}
                onSave={(newSettings) => {
                  updateSettings(newSettings);
                  setActiveTab('timer');
                }}
                onBack={() => setActiveTab('timer')}
              />
            ) : (
              <div className="study-timer-view">
                {/* Panel Header */}
                <div className="study-timer-header">
                  <div className="study-timer-header-title">
                    <TimerIcon size={18} className="study-timer-title-icon" />
                    <span>学習タイマー</span>
                  </div>
                  <div className="study-timer-header-actions">
                    <button
                      type="button"
                      className="study-timer-icon-btn"
                      onClick={() => setActiveTab('settings')}
                      title="設定"
                      aria-label="設定"
                    >
                      <SettingsIcon size={16} />
                    </button>
                    <button
                      type="button"
                      className="study-timer-icon-btn"
                      onClick={() => setIsOpen(false)}
                      title="閉じる"
                      aria-label="閉じる"
                    >
                      <X size={17} />
                    </button>
                  </div>
                </div>

                {/* Phase Badge */}
                <div className="study-timer-phase-badge-container">
                  <div className={`study-timer-phase-badge ${phaseInfo.colorClass}`}>
                    {phaseInfo.icon}
                    <span>{phaseInfo.title}</span>
                  </div>
                  <span className="study-timer-phase-sub">
                    {phaseInfo.sub}
                  </span>
                </div>

                {/* Main Timer Display */}
                <div className="study-timer-display-card">
                  <div className="study-timer-time">
                    {formattedTime}
                  </div>

                  {/* Progress bar */}
                  <div className="study-timer-progress-track">
                    <div 
                      className="study-timer-progress-bar" 
                      style={{ width: `${progressRatio * 100}%` }}
                    />
                  </div>

                  {/* Session counter */}
                  <div className="study-timer-sessions">
                    <div className="study-timer-dots">
                      {renderSessionDots()}
                    </div>
                    <span className="study-timer-session-label">
                      セッション {currentSession} / {totalSessions}
                    </span>
                  </div>
                </div>

                {/* Main Action Buttons */}
                <div className="study-timer-controls">
                  {status === 'IDLE' && (
                    <button
                      type="button"
                      className="study-timer-btn-primary"
                      onClick={start}
                    >
                      <Play size={18} fill="currentColor" />
                      <span>開始</span>
                    </button>
                  )}

                  {status === 'RUNNING' && (
                    <button
                      type="button"
                      className="study-timer-btn-primary warning"
                      onClick={pause}
                    >
                      <Pause size={18} fill="currentColor" />
                      <span>一時停止</span>
                    </button>
                  )}

                  {status === 'PAUSED' && (
                    <button
                      type="button"
                      className="study-timer-btn-primary resume"
                      onClick={resume}
                    >
                      <Play size={18} fill="currentColor" />
                      <span>再開</span>
                    </button>
                  )}

                  {status === 'COMPLETED' && (
                    <button
                      type="button"
                      className="study-timer-btn-primary"
                      onClick={start}
                    >
                      <Play size={18} fill="currentColor" />
                      <span>次のセッション開始</span>
                    </button>
                  )}

                  {/* Secondary Action Controls */}
                  <div className="study-timer-sub-controls">
                    <button
                      type="button"
                      className="study-timer-btn-sub"
                      onClick={reset}
                      title="リセット"
                    >
                      <RotateCcw size={15} />
                      <span>リセット</span>
                    </button>
                    <button
                      type="button"
                      className="study-timer-btn-sub"
                      onClick={skip}
                      title="スキップ (次のフェーズへ)"
                    >
                      <SkipForward size={15} />
                      <span>スキップ</span>
                    </button>
                  </div>
                </div>

                {/* Footer status summary */}
                <div className="study-timer-footer">
                  <span>完了した集中セッション: <strong>{completedFocusSessions}</strong> 回</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
