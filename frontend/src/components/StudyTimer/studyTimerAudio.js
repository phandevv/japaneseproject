// Web Audio API Synthesizer for Japanese Study Timer (Pomodoro)
// Generates a soothing harmonic chime with zero external audio assets

let audioCtx = null;

/**
 * Get or initialize AudioContext after a user interaction
 */
const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

/**
 * Play a soothing three-note ascending chime (C5 - E5 - G5)
 * 
 * @param {boolean} soundEnabled - Whether sound is enabled in user settings
 */
export const playCompletionChime = (soundEnabled = true) => {
  if (!soundEnabled || typeof window === 'undefined') return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const playNote = (timeOffset, frequency, duration, gainLevel = 0.15) => {
      const startTime = ctx.currentTime + timeOffset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, startTime);

      // Envelope: gentle attack, exponential smooth decay
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(gainLevel, startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
    };

    // Beautiful Japanese temple-inspired soothing chime: C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz)
    playNote(0.00, 523.25, 0.45, 0.15); // C5
    playNote(0.18, 659.25, 0.45, 0.14); // E5
    playNote(0.36, 783.99, 0.70, 0.16); // G5
  } catch (err) {
    console.debug('[StudyTimer] Web Audio playback deferred/unavailable:', err.message);
  }
};

export default {
  playCompletionChime,
  getAudioContext,
};
