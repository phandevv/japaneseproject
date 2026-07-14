import React, { useState, useEffect, useRef } from 'react';
import { 
  Timer as TimerIcon, 
  Play, 
  Pause, 
  SkipForward, 
  RotateCcw, 
  Settings, 
  BarChart2, 
  X, 
  Coffee, 
  Check, 
  Trophy, 
  Clock 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import '../styles/PomodoroTimer.css';

// Key templates for LocalStorage
const SETTINGS_KEY = 'nihongo-pomodoro-settings';
const STATE_KEY = 'nihongo-pomodoro-state';
const STATS_KEY = 'nihongo-pomodoro-stats';

const getTodayDateString = () => new Date().toISOString().slice(0, 10);

const defaultSettings = {
  workTime: 25,
  shortBreak: 5,
  longBreak: 15,
  maxCycles: 4,
  autoStart: true,
};

const defaultStats = {
  date: getTodayDateString(),
  focusMinutes: 0,
  completedCycles: 0,
};

export default function PomodoroTimer() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('timer'); // 'timer' | 'settings' | 'stats'

  // Settings state
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  // Timer configuration inputs state (temporary variables for settings form)
  const [inputs, setInputs] = useState({ ...settings });

  // Timer run state
  const [phase, setPhase] = useState('work'); // 'work' | 'short-break' | 'long-break'
  const [timeLeft, setTimeLeft] = useState(settings.workTime * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [cycle, setCycle] = useState(1);

  // Statistics state
  const [stats, setStats] = useState(() => {
    try {
      const stored = localStorage.getItem(STATS_KEY);
      const parsed = stored ? JSON.parse(stored) : defaultStats;
      const today = getTodayDateString();
      if (parsed.date !== today) {
        return { ...defaultStats, date: today };
      }
      return parsed;
    } catch {
      return { ...defaultStats, date: getTodayDateString() };
    }
  });

  // Alert popup state
  const [alertState, setAlertState] = useState({
    show: false,
    type: 'work-done', // 'work-done' | 'break-done'
  });

  // Refs for tracking timer
  const timerRef = useRef(null);
  const lastTickRef = useRef(null);

  // Synthesize alarm sound via Web Audio API
  const playAlertSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const playNote = (time, freq, duration, type = 'sine') => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, time);
        
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.2, time + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        
        osc.start(time);
        osc.stop(time + duration);
      };
      
      const now = ctx.currentTime;
      // High-low double chime
      playNote(now, 523.25, 0.3, 'sine'); // C5
      playNote(now + 0.15, 659.25, 0.3, 'sine'); // E5
      playNote(now + 0.3, 783.99, 0.5, 'sine'); // G5
    } catch (e) {
      console.error('Audio API chime failed to play:', e);
    }
  };

  // Synchronize input fields when settings update
  useEffect(() => {
    setInputs({ ...settings });
  }, [settings]);

  // Persistent Timer State Restore on Mount
  useEffect(() => {
    try {
      const storedState = localStorage.getItem(STATE_KEY);
      if (storedState) {
        const parsed = JSON.parse(storedState);
        const elapsedSeconds = Math.floor((Date.now() - parsed.savedAt) / 1000);
        
        let calculatedTime = parsed.timeLeft;
        let calculatedPhase = parsed.phase;
        let calculatedCycle = parsed.cycle;
        let calculatedRunning = parsed.isRunning;

        if (parsed.isRunning) {
          if (elapsedSeconds >= parsed.timeLeft) {
            // Timer expired while app was closed/reloaded
            calculatedTime = 0;
            calculatedRunning = false;
          } else {
            calculatedTime = parsed.timeLeft - elapsedSeconds;
          }
        }

        setPhase(calculatedPhase);
        setTimeLeft(calculatedTime);
        setIsRunning(calculatedRunning);
        setCycle(calculatedCycle);
      }
    } catch (e) {
      console.error('Could not restore Pomodoro state:', e);
    }
  }, []);

  // Save current timer state to localStorage whenever it changes
  useEffect(() => {
    try {
      const stateToStore = {
        phase,
        timeLeft,
        isRunning,
        cycle,
        savedAt: Date.now()
      };
      localStorage.setItem(STATE_KEY, JSON.stringify(stateToStore));
    } catch (e) {
      console.warn('Could not store state:', e);
    }
  }, [phase, timeLeft, isRunning, cycle]);

  // Persist settings
  const saveSettingsToStorage = (newSettings) => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (e) {
      console.error(e);
    }
  };

  // Persist stats
  const saveStatsToStorage = (newStats) => {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(newStats));
    } catch (e) {
      console.error(e);
    }
  };

  // Main Timer Interval Logic
  useEffect(() => {
    if (isRunning) {
      lastTickRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const delta = Math.round((now - lastTickRef.current) / 1000);
        lastTickRef.current = now;

        setTimeLeft(prev => {
          const nextTime = prev - delta;
          if (nextTime <= 0) {
            handleTimerExpiry();
            return 0;
          }
          return nextTime;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, phase, cycle, settings]);

  // Handle Timer completion and switch phase
  const handleTimerExpiry = () => {
    setIsRunning(false);
    playAlertSound();

    let nextPhase = 'work';
    let nextTime = settings.workTime * 60;
    let nextCycle = cycle;
    let alertType = 'work-done';

    const todayStr = getTodayDateString();
    let updatedStats = { ...stats };
    if (updatedStats.date !== todayStr) {
      updatedStats = { ...defaultStats, date: todayStr };
    }

    if (phase === 'work') {
      // Completed focus cycle!
      alertType = 'work-done';
      updatedStats.focusMinutes += settings.workTime;
      updatedStats.completedCycles += 1;

      setStats(updatedStats);
      saveStatsToStorage(updatedStats);

      if (cycle >= settings.maxCycles) {
        nextPhase = 'long-break';
        nextTime = settings.longBreak * 60;
        nextCycle = 1; // Reset cycle loop
      } else {
        nextPhase = 'short-break';
        nextTime = settings.shortBreak * 60;
      }
    } else {
      // Completed break
      alertType = 'break-done';
      nextPhase = 'work';
      nextTime = settings.workTime * 60;
      if (phase === 'short-break') {
        nextCycle = Math.min(settings.maxCycles, cycle + 1);
      } else {
        nextCycle = 1; // After long break
      }
    }

    setPhase(nextPhase);
    setTimeLeft(nextTime);
    setCycle(nextCycle);
    setAlertState({ show: true, type: alertType });

    if (settings.autoStart) {
      setTimeout(() => {
        setIsRunning(true);
      }, 1000);
    }
  };

  // Toggle play/pause
  const togglePlayPause = () => {
    setIsRunning(!isRunning);
  };

  // Skip current phase
  const handleSkip = () => {
    if (window.confirm('Bạn muốn bỏ qua pha hiện tại?')) {
      handleTimerExpiry();
    }
  };

  // Reset timer
  const handleReset = () => {
    if (window.confirm('Đặt lại đồng hồ về đầu pha hiện tại?')) {
      setIsRunning(false);
      if (phase === 'work') {
        setTimeLeft(settings.workTime * 60);
      } else if (phase === 'short-break') {
        setTimeLeft(settings.shortBreak * 60);
      } else {
        setTimeLeft(settings.longBreak * 60);
      }
    }
  };

  // Save Settings from settings form
  const handleSaveSettings = (e) => {
    e.preventDefault();
    const newSettings = {
      workTime: Math.max(1, parseInt(inputs.workTime) || 25),
      shortBreak: Math.max(1, parseInt(inputs.shortBreak) || 5),
      longBreak: Math.max(1, parseInt(inputs.longBreak) || 15),
      maxCycles: Math.max(1, parseInt(inputs.maxCycles) || 4),
      autoStart: !!inputs.autoStart,
    };

    setSettings(newSettings);
    saveSettingsToStorage(newSettings);

    // Update active timer values if we are resetting or modifying the active phase
    setIsRunning(false);
    if (phase === 'work') {
      setTimeLeft(newSettings.workTime * 60);
    } else if (phase === 'short-break') {
      setTimeLeft(newSettings.shortBreak * 60);
    } else {
      setTimeLeft(newSettings.longBreak * 60);
    }
    setCycle(1);

    setActiveTab('timer');
  };

  // Revert settings changes on cancel
  const handleCancelSettings = () => {
    setInputs({ ...settings });
    setActiveTab('timer');
  };

  // Reset stats today
  const handleClearStats = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa dữ liệu thống kê hôm nay?')) {
      const reset = { ...defaultStats, date: getTodayDateString() };
      setStats(reset);
      saveStatsToStorage(reset);
    }
  };

  // Helper formatting mm:ss
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // SVG parameters for progress ring
  const strokeRadius = 78;
  const strokeCircumference = 2 * Math.PI * strokeRadius;
  
  let currentMaxDuration = settings.workTime * 60;
  if (phase === 'short-break') currentMaxDuration = settings.shortBreak * 60;
  if (phase === 'long-break') currentMaxDuration = settings.longBreak * 60;

  const strokeDashoffset = strokeCircumference - (timeLeft / currentMaxDuration) * strokeCircumference;

  // Active status color matching CSS classes
  const getPhaseName = () => {
    if (phase === 'work') return t.pomodoro.phaseFocus;
    if (phase === 'short-break') return t.pomodoro.phaseShortBreak;
    return t.pomodoro.phaseLongBreak;
  };

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <button 
        className={`pomodoro-fab ${isRunning ? 'active animate-pulse' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={t.pomodoro.title}
      >
        <TimerIcon size={24} />
        {isRunning && (
          <div className="pomodoro-badge">
            {formatTime(timeLeft)}
          </div>
        )}
      </button>

      {/* Slide-out / Popover Pomodoro Panel */}
      {isOpen && (
        <div className="pomodoro-panel">
          <div className="pomodoro-header">
            <h3>
              <TimerIcon size={18} style={{ color: 'var(--accent-color)' }} />
              {t.pomodoro.title}
            </h3>
            <button className="btn-close" onClick={() => setIsOpen(false)}>
              <X size={18} />
            </button>
          </div>

          {/* Tab Selection */}
          <div className="pomodoro-tabs">
            <button 
              className={`pomodoro-tab-btn ${activeTab === 'timer' ? 'active' : ''}`}
              onClick={() => setActiveTab('timer')}
            >
              {t.pomodoro.tabTimer}
            </button>
            <button 
              className={`pomodoro-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              {t.pomodoro.tabSettings}
            </button>
            <button 
              className={`pomodoro-tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveTab('stats')}
            >
              {t.pomodoro.tabStats}
            </button>
          </div>

          <div className="pomodoro-content">
            {/* Timer Tab */}
            {activeTab === 'timer' && (
              <div className="timer-container animate-fade-in">
                <span className={`phase-label ${phase}`}>
                  {getPhaseName()}
                </span>

                <div className="timer-ring-wrapper">
                  <svg className="timer-ring-svg">
                    <circle 
                      className="timer-ring-bg" 
                      cx="90" 
                      cy="90" 
                      r={strokeRadius} 
                    />
                    <circle 
                      className={`timer-ring-fill ${phase}`} 
                      cx="90" 
                      cy="90" 
                      r={strokeRadius} 
                      strokeDasharray={strokeCircumference}
                      strokeDashoffset={strokeDashoffset}
                    />
                  </svg>
                  <div className="timer-time-display">
                    <span>{formatTime(timeLeft)}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '-2px' }}>
                      {cycle}/{settings.maxCycles}
                    </span>
                  </div>
                </div>

                {/* Control Actions */}
                <div className="timer-controls">
                  <button 
                    className="btn-ctrl" 
                    onClick={handleReset}
                    title={t.pomodoro.resetBtn}
                  >
                    <RotateCcw size={16} />
                  </button>

                  <button 
                    className="btn-ctrl btn-play-pause" 
                    onClick={togglePlayPause}
                    title={isRunning ? t.pomodoro.pauseBtn : t.pomodoro.startBtn}
                  >
                    {isRunning ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: '2px' }} />}
                  </button>

                  <button 
                    className="btn-ctrl" 
                    onClick={handleSkip}
                    title={t.pomodoro.skipBtn}
                  >
                    <SkipForward size={16} />
                  </button>
                </div>

                {/* Small indicator dots for cycles */}
                <div className="cycles-indicator">
                  {Array.from({ length: settings.maxCycles }).map((_, idx) => (
                    <div 
                      key={idx} 
                      className={`cycle-dot ${idx + 1 < cycle ? 'completed' : ''} ${idx + 1 === cycle && phase === 'work' ? 'active' : ''}`} 
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <form onSubmit={handleSaveSettings} className="settings-form animate-fade-in">
                <div className="setting-row">
                  <label>{t.pomodoro.workTime}</label>
                  <div className="setting-input-wrapper">
                    <input 
                      type="number" 
                      min="1" 
                      max="120"
                      value={inputs.workTime}
                      onChange={(e) => setInputs({ ...inputs, workTime: e.target.value })}
                    />
                    <span>{t.pomodoro.minutes}</span>
                  </div>
                </div>

                <div className="setting-row">
                  <label>{t.pomodoro.shortBreak}</label>
                  <div className="setting-input-wrapper">
                    <input 
                      type="number" 
                      min="1" 
                      max="60"
                      value={inputs.shortBreak}
                      onChange={(e) => setInputs({ ...inputs, shortBreak: e.target.value })}
                    />
                    <span>{t.pomodoro.minutes}</span>
                  </div>
                </div>

                <div className="setting-row">
                  <label>{t.pomodoro.longBreak}</label>
                  <div className="setting-input-wrapper">
                    <input 
                      type="number" 
                      min="1" 
                      max="120"
                      value={inputs.longBreak}
                      onChange={(e) => setInputs({ ...inputs, longBreak: e.target.value })}
                    />
                    <span>{t.pomodoro.minutes}</span>
                  </div>
                </div>

                <div className="setting-row">
                  <label>{t.pomodoro.cycles}</label>
                  <div className="setting-input-wrapper" style={{ width: '80px' }}>
                    <input 
                      type="number" 
                      min="1" 
                      max="12"
                      value={inputs.maxCycles}
                      onChange={(e) => setInputs({ ...inputs, maxCycles: e.target.value })}
                      style={{ textAlign: 'center' }}
                    />
                  </div>
                </div>

                <div className="setting-row" style={{ marginTop: '4px' }}>
                  <label 
                    className="setting-checkbox-row" 
                    onClick={() => setInputs({ ...inputs, autoStart: !inputs.autoStart })}
                  >
                    <input 
                      type="checkbox" 
                      checked={inputs.autoStart} 
                      onChange={() => {}} // Controlled via label click
                    />
                    <div className="custom-checkbox">
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <span>{t.pomodoro.autoStart}</span>
                  </label>
                </div>

                <div className="settings-actions">
                  <button 
                    type="button" 
                    className="btn-settings-cancel"
                    onClick={handleCancelSettings}
                  >
                    {t.pomodoro.cancelBtn}
                  </button>
                  <button 
                    type="submit" 
                    className="btn-settings-save"
                  >
                    {t.pomodoro.saveBtn}
                  </button>
                </div>
              </form>
            )}

            {/* Statistics Tab */}
            {activeTab === 'stats' && (
              <div className="stats-container animate-fade-in">
                <div className="stat-box">
                  <div className="stat-icon">
                    <Clock size={20} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">{t.pomodoro.statsFocusTime}</span>
                    <span className="stat-value">{stats.focusMinutes} {t.pomodoro.minutes}</span>
                  </div>
                </div>

                <div className="stat-box cycles-box">
                  <div className="stat-icon">
                    <Trophy size={20} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">{t.pomodoro.statsCycles}</span>
                    <span className="stat-value">{stats.completedCycles}</span>
                  </div>
                </div>

                <button className="btn-stats-clear" onClick={handleClearStats}>
                  {t.pomodoro.statsClear}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expired Center Screen Overlay Modal */}
      {alertState.show && (
        <div className="pomodoro-alert-overlay">
          <div className="pomodoro-alert-card">
            {alertState.type === 'work-done' ? (
              <>
                <div className="alert-illustration-wrapper work-done">
                  <Coffee size={36} />
                </div>
                <h2>{t.pomodoro.alertFocusTitle}</h2>
                <p>{t.pomodoro.alertFocusMsg}</p>
              </>
            ) : (
              <>
                <div className="alert-illustration-wrapper break-done">
                  <Trophy size={36} style={{ color: 'var(--accent-color)' }} />
                </div>
                <h2>{t.pomodoro.alertBreakTitle}</h2>
                <p>{t.pomodoro.alertBreakMsg}</p>
              </>
            )}

            <button 
              className="btn-alert-dismiss"
              onClick={() => setAlertState({ show: false, type: 'work-done' })}
            >
              {t.pomodoro.alertDismiss}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
