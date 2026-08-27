// Domain Hook: Japanese Study Timer (Pomodoro)
// Strict timestamp-based calculation, zero drift, Page Visibility recovery, multi-tab sync

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  loadSettings,
  saveSettings,
  loadTimerState,
  saveTimerState,
  DEFAULT_SETTINGS,
} from './studyTimerStorage';
import { playCompletionChime } from './studyTimerAudio';
import {
  notifyFocusCompleted,
  notifyBreakCompleted,
} from './studyTimerNotification';

/**
 * Format milliseconds to MM:SS
 */
export const formatTimeMs = (ms) => {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export function useStudyTimer() {
  // 1. Settings state
  const [settings, setSettings] = useState(() => loadSettings());

  // 2. Timer machine state
  const [timerState, setTimerState] = useState(() => loadTimerState(settings));

  // 3. UI tick driver (only used to trigger re-renders)
  const [, setTick] = useState(0);
  const intervalRef = useRef(null);

  // Helper: calculate target duration in ms for a given mode
  const getDurationForMode = useCallback((mode, customSettings = settings) => {
    switch (mode) {
      case 'SHORT_BREAK':
        return customSettings.shortBreakDuration * 60 * 1000;
      case 'LONG_BREAK':
        return customSettings.longBreakDuration * 60 * 1000;
      case 'FOCUS':
      default:
        return customSettings.focusDuration * 60 * 1000;
    }
  }, [settings]);

  // Derive remaining milliseconds accurately using timestamp
  const remainingMs = useMemo(() => {
    const { status, endAt, remainingAtPause, targetDurationMs } = timerState;
    if (status === 'RUNNING' && endAt) {
      return Math.max(0, endAt - Date.now());
    }
    if (status === 'PAUSED' && remainingAtPause !== null) {
      return Math.max(0, remainingAtPause);
    }
    if (status === 'COMPLETED') {
      return 0;
    }
    return targetDurationMs || getDurationForMode(timerState.mode);
  }, [timerState, getDurationForMode]);

  // Derived progress ratio (0 to 1)
  const progressRatio = useMemo(() => {
    const total = timerState.targetDurationMs || getDurationForMode(timerState.mode);
    if (total <= 0) return 0;
    const elapsed = total - remainingMs;
    return Math.min(1, Math.max(0, elapsed / total));
  }, [timerState, remainingMs, getDurationForMode]);

  // 4. Handle Phase Expiration and Transition
  const handlePhaseComplete = useCallback((currentState) => {
    const { mode, currentSession, completedFocusSessions } = currentState;

    // Sound & Browser Notification
    playCompletionChime(settings.soundEnabled);

    let nextMode = 'FOCUS';
    let nextSession = currentSession;
    let nextCompleted = completedFocusSessions;

    if (mode === 'FOCUS') {
      nextCompleted += 1;
      notifyFocusCompleted(settings.shortBreakDuration, settings.notificationEnabled);

      if (currentSession >= settings.sessionsBeforeLongBreak) {
        nextMode = 'LONG_BREAK';
      } else {
        nextMode = 'SHORT_BREAK';
      }
    } else if (mode === 'SHORT_BREAK') {
      notifyBreakCompleted(settings.notificationEnabled);
      nextMode = 'FOCUS';
      nextSession = currentSession + 1;
    } else if (mode === 'LONG_BREAK') {
      notifyBreakCompleted(settings.notificationEnabled);
      nextMode = 'FOCUS';
      nextSession = 1; // Cycle completed, restart session 1
    }

    const nextDurationMs = getDurationForMode(nextMode);

    if (settings.autoStartNext) {
      const now = Date.now();
      const updatedState = {
        mode: nextMode,
        status: 'RUNNING',
        currentSession: nextSession,
        completedFocusSessions: nextCompleted,
        startedAt: now,
        endAt: now + nextDurationMs,
        remainingAtPause: null,
        targetDurationMs: nextDurationMs,
        activity: currentState.activity || 'ALL',
      };
      setTimerState(updatedState);
      saveTimerState(updatedState);
    } else {
      const updatedState = {
        mode: nextMode,
        status: 'IDLE',
        currentSession: nextSession,
        completedFocusSessions: nextCompleted,
        startedAt: null,
        endAt: null,
        remainingAtPause: null,
        targetDurationMs: nextDurationMs,
        activity: currentState.activity || 'ALL',
      };
      setTimerState(updatedState);
      saveTimerState(updatedState);
    }
  }, [settings, getDurationForMode]);

  // 5. Timer UI Interval Loop (Refreshes UI only, does not calculate time)
  useEffect(() => {
    if (timerState.status === 'RUNNING') {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        if (timerState.endAt && now >= timerState.endAt) {
          clearInterval(intervalRef.current);
          handlePhaseComplete(timerState);
        } else {
          // Trigger render
          setTick(t => t + 1);
        }
      }, 500);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerState, handlePhaseComplete]);

  // 6. Page Visibility Recovery (Recalculate on foreground switch)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && timerState.status === 'RUNNING') {
        const now = Date.now();
        if (timerState.endAt && now >= timerState.endAt) {
          handlePhaseComplete(timerState);
        } else {
          setTick(t => t + 1);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [timerState, handlePhaseComplete]);

  // 7. Multi-Tab Synchronization via Window Storage Event
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'nihongo_study_timer_state_v1' && e.newValue) {
        try {
          const remoteState = JSON.parse(e.newValue);
          setTimerState(remoteState);
        } catch (err) {}
      } else if (e.key === 'nihongo_study_timer_settings_v1' && e.newValue) {
        try {
          const remoteSettings = JSON.parse(e.newValue);
          setSettings(remoteSettings);
        } catch (err) {}
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // ── Actions ─────────────────────────────────────────────────────────────

  // Start
  const start = useCallback(() => {
    if (timerState.status === 'RUNNING') return;

    const now = Date.now();
    const durationMs = timerState.remainingAtPause !== null
      ? timerState.remainingAtPause
      : (timerState.targetDurationMs || getDurationForMode(timerState.mode));

    const updated = {
      ...timerState,
      status: 'RUNNING',
      startedAt: now,
      endAt: now + durationMs,
      remainingAtPause: null,
      targetDurationMs: timerState.targetDurationMs || durationMs,
    };
    setTimerState(updated);
    saveTimerState(updated);
  }, [timerState, getDurationForMode]);

  // Pause
  const pause = useCallback(() => {
    if (timerState.status !== 'RUNNING') return;

    const now = Date.now();
    const remaining = timerState.endAt ? Math.max(0, timerState.endAt - now) : 0;

    const updated = {
      ...timerState,
      status: 'PAUSED',
      endAt: null,
      remainingAtPause: remaining,
    };
    setTimerState(updated);
    saveTimerState(updated);
  }, [timerState]);

  // Resume
  const resume = useCallback(() => {
    if (timerState.status !== 'PAUSED') return;

    const now = Date.now();
    const remaining = timerState.remainingAtPause || getDurationForMode(timerState.mode);

    const updated = {
      ...timerState,
      status: 'RUNNING',
      endAt: now + remaining,
      remainingAtPause: null,
    };
    setTimerState(updated);
    saveTimerState(updated);
  }, [timerState, getDurationForMode]);

  // Reset
  const reset = useCallback(() => {
    const defaultDuration = getDurationForMode(timerState.mode);
    const updated = {
      ...timerState,
      status: 'IDLE',
      startedAt: null,
      endAt: null,
      remainingAtPause: null,
      targetDurationMs: defaultDuration,
    };
    setTimerState(updated);
    saveTimerState(updated);
  }, [timerState, getDurationForMode]);

  // Skip (Advances to next mode, does NOT count as completed session)
  const skip = useCallback(() => {
    let nextMode = 'FOCUS';
    let nextSession = timerState.currentSession;

    if (timerState.mode === 'FOCUS') {
      if (timerState.currentSession >= settings.sessionsBeforeLongBreak) {
        nextMode = 'LONG_BREAK';
      } else {
        nextMode = 'SHORT_BREAK';
      }
    } else if (timerState.mode === 'SHORT_BREAK') {
      nextMode = 'FOCUS';
      nextSession = timerState.currentSession + 1;
    } else if (timerState.mode === 'LONG_BREAK') {
      nextMode = 'FOCUS';
      nextSession = 1;
    }

    const duration = getDurationForMode(nextMode);
    const updated = {
      ...timerState,
      mode: nextMode,
      status: 'IDLE',
      currentSession: nextSession,
      startedAt: null,
      endAt: null,
      remainingAtPause: null,
      targetDurationMs: duration,
    };
    setTimerState(updated);
    saveTimerState(updated);
  }, [timerState, settings, getDurationForMode]);

  // Update Settings
  const updateSettings = useCallback((newSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);

    // If IDLE, re-sync target duration with new duration
    if (timerState.status === 'IDLE') {
      const newDuration = getDurationForMode(timerState.mode, newSettings);
      const updated = {
        ...timerState,
        targetDurationMs: newDuration,
      };
      setTimerState(updated);
      saveTimerState(updated);
    }
  }, [timerState, getDurationForMode]);

  return {
    mode: timerState.mode,
    status: timerState.status,
    currentSession: timerState.currentSession,
    totalSessions: settings.sessionsBeforeLongBreak,
    completedFocusSessions: timerState.completedFocusSessions,
    remainingMs,
    formattedTime: formatTimeMs(remainingMs),
    progressRatio,
    settings,
    start,
    pause,
    resume,
    reset,
    skip,
    updateSettings,
  };
}

export default useStudyTimer;
