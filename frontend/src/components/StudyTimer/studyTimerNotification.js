// Web Notification API Service for Japanese Study Timer (Pomodoro)
// Delivers notifications when tab is in background

/**
 * Check if Web Notifications are supported
 */
export const isNotificationSupported = () => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

/**
 * Request notification permission from user upon explicit action
 */
export const requestNotificationPermission = async () => {
  if (!isNotificationSupported()) return false;
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (err) {
    console.warn('[StudyTimer] Notification permission request error:', err);
    return false;
  }
};

/**
 * Check if permission has been granted
 */
export const hasNotificationPermission = () => {
  if (!isNotificationSupported()) return false;
  return Notification.permission === 'granted';
};

/**
 * Send a notification if permitted and enabled
 * 
 * @param {string} title
 * @param {string} body
 * @param {boolean} enabled
 */
export const sendTimerNotification = (title, body, enabled = true) => {
  if (!enabled || !isNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  try {
    const options = {
      body,
      icon: '/assets/siro_ai_logo.png',
      badge: '/assets/siro_ai_logo.png',
      silent: true, // We play our custom soothing Web Audio chime instead of OS default beep
      tag: 'nihongo-pomodoro-timer',
    };

    const notification = new Notification(title, options);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto-dismiss after 8 seconds
    setTimeout(() => {
      try { notification.close(); } catch (e) {}
    }, 8000);
  } catch (err) {
    console.debug('[StudyTimer] Could not show notification:', err);
  }
};

/**
 * Send notification when Focus session finishes
 */
export const notifyFocusCompleted = (shortBreakMinutes, enabled = true) => {
  sendTimerNotification(
    '日本語学習タイマー 🌸',
    `集中セッションが終了しました！ ${shortBreakMinutes}分間休憩しましょう。`,
    enabled
  );
};

/**
 * Send notification when Break finishes
 */
export const notifyBreakCompleted = (enabled = true) => {
  sendTimerNotification(
    '日本語学習タイマー ⏰',
    '休憩時間が終了しました。次の学習セッションを始めましょう！',
    enabled
  );
};

export default {
  isNotificationSupported,
  requestNotificationPermission,
  hasNotificationPermission,
  sendTimerNotification,
  notifyFocusCompleted,
  notifyBreakCompleted,
};
