// Settings Component for Japanese Study Timer (Pomodoro)
// Japanese terminology, input validation, permission flow

import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Save, 
  Volume2, 
  VolumeX, 
  Bell, 
  BellOff, 
  Sparkles, 
  RotateCcw 
} from 'lucide-react';
import { 
  isNotificationSupported, 
  requestNotificationPermission, 
  hasNotificationPermission 
} from './studyTimerNotification';
import { DEFAULT_SETTINGS } from './studyTimerStorage';

export default function StudyTimerSettings({ settings, onSave, onBack }) {
  const [form, setForm] = useState({ ...settings });
  const [errorMsg, setErrorMsg] = useState('');
  const [notifState, setNotifState] = useState(() => hasNotificationPermission());

  const handleChange = (key, value) => {
    setErrorMsg('');
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleNotificationToggle = async (e) => {
    const checked = e.target.checked;
    if (checked) {
      if (!isNotificationSupported()) {
        setErrorMsg('このブラウザは通知機能をサポートしていません。');
        return;
      }
      const granted = await requestNotificationPermission();
      setNotifState(granted);
      if (granted) {
        handleChange('notificationEnabled', true);
      } else {
        setErrorMsg('ブラウザの通知権限が拒否されています。');
        handleChange('notificationEnabled', false);
      }
    } else {
      handleChange('notificationEnabled', false);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();

    // Validation
    const focus = Number(form.focusDuration);
    const shortBreak = Number(form.shortBreakDuration);
    const longBreak = Number(form.longBreakDuration);
    const cycles = Number(form.sessionsBeforeLongBreak);

    if (focus < 1 || focus > 120) {
      setErrorMsg('集中時間は1分から120分の間で設定してください。');
      return;
    }
    if (shortBreak < 1 || shortBreak > 60) {
      setErrorMsg('短い休憩は1分から60分の間で設定してください。');
      return;
    }
    if (longBreak < 1 || longBreak > 60) {
      setErrorMsg('長い休憩は1分から60分の間で設定してください。');
      return;
    }
    if (cycles < 1 || cycles > 12) {
      setErrorMsg('セッション数は1から12の間で設定してください。');
      return;
    }

    onSave({
      ...form,
      focusDuration: Math.round(focus),
      shortBreakDuration: Math.round(shortBreak),
      longBreakDuration: Math.round(longBreak),
      sessionsBeforeLongBreak: Math.round(cycles),
    });
  };

  const handleResetDefaults = () => {
    setForm({ ...DEFAULT_SETTINGS });
    setErrorMsg('');
  };

  return (
    <div className="study-timer-settings-view">
      <div className="study-timer-settings-header">
        <button 
          type="button" 
          className="study-timer-icon-btn" 
          onClick={onBack}
          title="戻る"
          aria-label="戻る"
        >
          <ArrowLeft size={18} />
        </button>
        <h4 className="study-timer-settings-title">
          タイマー設定
        </h4>
        <button
          type="button"
          className="study-timer-icon-btn"
          onClick={handleResetDefaults}
          title="デフォルトに戻す"
          aria-label="デフォルトに戻す"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {errorMsg && (
        <div className="study-timer-error-banner">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSave} className="study-timer-settings-form">
        {/* Durations Group */}
        <div className="study-timer-field-group">
          <div className="study-timer-field">
            <label htmlFor="focusDuration">
              集中時間 (Focus)
            </label>
            <div className="study-timer-input-unit">
              <input
                id="focusDuration"
                type="number"
                min="1"
                max="120"
                value={form.focusDuration}
                onChange={e => handleChange('focusDuration', e.target.value)}
                required
              />
              <span>分</span>
            </div>
          </div>

          <div className="study-timer-field">
            <label htmlFor="shortBreakDuration">
              短い休憩 (Short Break)
            </label>
            <div className="study-timer-input-unit">
              <input
                id="shortBreakDuration"
                type="number"
                min="1"
                max="60"
                value={form.shortBreakDuration}
                onChange={e => handleChange('shortBreakDuration', e.target.value)}
                required
              />
              <span>分</span>
            </div>
          </div>

          <div className="study-timer-field">
            <label htmlFor="longBreakDuration">
              長い休憩 (Long Break)
            </label>
            <div className="study-timer-input-unit">
              <input
                id="longBreakDuration"
                type="number"
                min="1"
                max="60"
                value={form.longBreakDuration}
                onChange={e => handleChange('longBreakDuration', e.target.value)}
                required
              />
              <span>分</span>
            </div>
          </div>

          <div className="study-timer-field">
            <label htmlFor="sessionsBeforeLongBreak">
              長い休憩までのセッション数
            </label>
            <div className="study-timer-input-unit">
              <input
                id="sessionsBeforeLongBreak"
                type="number"
                min="1"
                max="12"
                value={form.sessionsBeforeLongBreak}
                onChange={e => handleChange('sessionsBeforeLongBreak', e.target.value)}
                required
              />
              <span>回</span>
            </div>
          </div>
        </div>

        {/* Toggles Group */}
        <div className="study-timer-toggles-group">
          <label className="study-timer-toggle-item">
            <div className="study-timer-toggle-label">
              <span>次のセッションを自動開始</span>
              <small>休憩・集中へ自動で移行します</small>
            </div>
            <input
              type="checkbox"
              checked={form.autoStartNext}
              onChange={e => handleChange('autoStartNext', e.target.checked)}
            />
          </label>

          <label className="study-timer-toggle-item">
            <div className="study-timer-toggle-label">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {form.soundEnabled ? <Volume2 size={16} color="var(--accent-color)" /> : <VolumeX size={16} color="var(--text-muted)" />}
                <span>通知音 (Chime)</span>
              </div>
              <small>終了時に和風の優しいチャイムを再生</small>
            </div>
            <input
              type="checkbox"
              checked={form.soundEnabled}
              onChange={e => handleChange('soundEnabled', e.target.checked)}
            />
          </label>

          {isNotificationSupported() && (
            <label className="study-timer-toggle-item">
              <div className="study-timer-toggle-label">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {form.notificationEnabled && notifState ? <Bell size={16} color="var(--accent-color)" /> : <BellOff size={16} color="var(--text-muted)" />}
                  <span>ブラウザ通知</span>
                </div>
                <small>タブが背景にある時にお知らせ</small>
              </div>
              <input
                type="checkbox"
                checked={form.notificationEnabled}
                onChange={handleNotificationToggle}
              />
            </label>
          )}
        </div>

        {/* Save button */}
        <button type="submit" className="study-timer-save-btn">
          <Save size={16} />
          <span>設定を保存</span>
        </button>
      </form>
    </div>
  );
}
