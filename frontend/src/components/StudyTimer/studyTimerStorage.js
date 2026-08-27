// Persistence Adapter for Japanese Study Timer (Pomodoro)
// Handles safe LocalStorage serialization, validation, and reconciliation

const SETTINGS_KEY = 'nihongo_study_timer_settings_v1';
const STATE_KEY = 'nihongo_study_timer_state_v1';

export const DEFAULT_SETTINGS = {
  focusDuration: 25,          // minutes (1 - 120)
  shortBreakDuration: 5,      // minutes (1 - 60)
  longBreakDuration: 15,      // minutes (1 - 60)
  sessionsBeforeLongBreak: 4, // count (1 - 12)
  autoStartNext: false,
  soundEnabled: true,
  notificationEnabled: false,
};

export const DEFAULT_STATE = {
  mode: 'FOCUS',              // 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK'
  status: 'IDLE',             // 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED'
  currentSession: 1,          // 1 .. sessionsBeforeLongBreak
  completedFocusSessions: 0,
  startedAt: null,
  endAt: null,
  remainingAtPause: null,
  targetDurationMs: 25 * 60 * 1000,
  activity: 'ALL',
  lastUpdated: Date.now(),
};

/**
 * Validate and sanitize settings values
 */
export const sanitizeSettings = (raw) => {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS };

  const clamp = (val, min, max, fallback) => {
    const num = Number(val);
    if (isNaN(num) || num < min) return fallback;
    if (num > max) return max;
    return Math.round(num);
  };

  return {
    focusDuration: clamp(raw.focusDuration, 1, 120, DEFAULT_SETTINGS.focusDuration),
    shortBreakDuration: clamp(raw.shortBreakDuration, 1, 60, DEFAULT_SETTINGS.shortBreakDuration),
    longBreakDuration: clamp(raw.longBreakDuration, 1, 60, DEFAULT_SETTINGS.longBreakDuration),
    sessionsBeforeLongBreak: clamp(raw.sessionsBeforeLongBreak, 1, 12, DEFAULT_SETTINGS.sessionsBeforeLongBreak),
    autoStartNext: Boolean(raw.autoStartNext),
    soundEnabled: raw.soundEnabled !== undefined ? Boolean(raw.soundEnabled) : DEFAULT_SETTINGS.soundEnabled,
    notificationEnabled: Boolean(raw.notificationEnabled),
  };
};

/**
 * Load settings from localStorage
 */
export const loadSettings = () => {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(stored);
    return sanitizeSettings(parsed);
  } catch (e) {
    console.warn('[StudyTimer] Error reading settings from storage, using defaults:', e);
    return { ...DEFAULT_SETTINGS };
  }
};

/**
 * Save settings to localStorage
 */
export const saveSettings = (settings) => {
  if (typeof window === 'undefined') return;
  try {
    const sanitized = sanitizeSettings(settings);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(sanitized));
  } catch (e) {
    console.error('[StudyTimer] Error saving settings to storage:', e);
  }
};

/**
 * Load and reconcile timer state from localStorage on startup/F5
 */
export const loadTimerState = (settings = DEFAULT_SETTINGS) => {
  if (typeof window === 'undefined') return { ...DEFAULT_STATE };
  try {
    const stored = localStorage.getItem(STATE_KEY);
    if (!stored) {
      return {
        ...DEFAULT_STATE,
        targetDurationMs: settings.focusDuration * 60 * 1000,
      };
    }

    const parsed = JSON.parse(stored);
    const now = Date.now();

    // Reconcile RUNNING status
    if (parsed.status === 'RUNNING' && parsed.endAt) {
      if (now >= parsed.endAt) {
        // Time expired while browser tab was closed or laptop slept
        return {
          ...parsed,
          status: 'COMPLETED',
          remainingAtPause: 0,
          lastUpdated: now,
        };
      }
    }

    return {
      mode: ['FOCUS', 'SHORT_BREAK', 'LONG_BREAK'].includes(parsed.mode) ? parsed.mode : 'FOCUS',
      status: ['IDLE', 'RUNNING', 'PAUSED', 'COMPLETED'].includes(parsed.status) ? parsed.status : 'IDLE',
      currentSession: Number(parsed.currentSession) || 1,
      completedFocusSessions: Number(parsed.completedFocusSessions) || 0,
      startedAt: parsed.startedAt || null,
      endAt: parsed.endAt || null,
      remainingAtPause: parsed.remainingAtPause !== undefined ? parsed.remainingAtPause : null,
      targetDurationMs: Number(parsed.targetDurationMs) || (settings.focusDuration * 60 * 1000),
      activity: parsed.activity || 'ALL',
      lastUpdated: now,
    };
  } catch (e) {
    console.warn('[StudyTimer] Error loading state from storage, resetting to default:', e);
    return {
      ...DEFAULT_STATE,
      targetDurationMs: settings.focusDuration * 60 * 1000,
    };
  }
};

/**
 * Save timer state to localStorage ONLY on status transition
 */
export const saveTimerState = (state) => {
  if (typeof window === 'undefined') return;
  try {
    const serialized = {
      ...state,
      lastUpdated: Date.now(),
    };
    localStorage.setItem(STATE_KEY, JSON.stringify(serialized));
  } catch (e) {
    console.error('[StudyTimer] Error persisting state:', e);
  }
};

export default {
  DEFAULT_SETTINGS,
  DEFAULT_STATE,
  loadSettings,
  saveSettings,
  loadTimerState,
  saveTimerState,
  sanitizeSettings,
};
