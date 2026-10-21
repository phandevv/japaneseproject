import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, Image as ImageIcon } from 'lucide-react';
import { getMediaUrl } from '../services/api';

export default function ListeningSectionView({ 
  examId, 
  audioFile, 
  currentQuestion, 
  onTimeUpdate, 
  isExamMode = true 
}) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [imageModalUrl, setImageModalUrl] = useState(null);

  const audioSrc = audioFile ? getMediaUrl(`/exams/audio/${audioFile}`) : null;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (onTimeUpdate) {
        onTimeUpdate(audio.currentTime);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioSrc, onTimeUpdate]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const handleSeek = (e) => {
    const newTime = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleReplayQuestion = () => {
    if (currentQuestion?.audioStartSec != null && audioRef.current) {
      audioRef.current.currentTime = currentQuestion.audioStartSec;
      if (!isPlaying) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
      }
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const changeRate = () => {
    const rates = [1, 1.1, 0.9];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const imageUrl = currentQuestion?.imageRef 
    ? getMediaUrl(`/exams/images/${examId}/${currentQuestion.imageRef}`)
    : null;

  return (
    <div style={{
      background: 'var(--surface-color)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-color)',
      padding: '20px',
      marginBottom: 20,
      boxShadow: 'var(--shadow-sm)'
    }}>
      {audioSrc && (
        <audio ref={audioRef} src={audioSrc} preload="auto" />
      )}

      {/* Listening Player Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        {/* Play/Pause Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={togglePlay}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'var(--accent-color)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-md)',
              transition: 'transform 0.15s'
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={e => e.currentTarget.style.transform = 'none'}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: 2 }} />}
          </button>

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              Phần Nghe Hiểu (聴解)
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
        </div>

        {/* Progress Scrubber */}
        <div style={{ flex: '1 1 200px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            disabled={isExamMode} // In strict exam mode, scrubber is locked to simulate real exam
            style={{
              width: '100%',
              cursor: isExamMode ? 'not-allowed' : 'pointer',
              accentColor: 'var(--accent-color)'
            }}
            title={isExamMode ? "Ở chế độ thi thật, băng nghe chạy một chiều" : "Tua audio"}
          />
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Re-listen button (available in practice or review) */}
          {!isExamMode && currentQuestion?.audioStartSec != null && (
            <button
              type="button"
              onClick={handleReplayQuestion}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-color)',
                border: '1px solid var(--border-color)',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
              title="Nghe lại đoạn hội thoại câu hỏi hiện tại"
            >
              <RotateCcw size={14} />
              Nghe lại câu này
            </button>
          )}

          {/* Speed Toggle */}
          <button
            type="button"
            onClick={changeRate}
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-color)',
              border: '1px solid var(--border-color)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
            title="Tốc độ phát"
          >
            {playbackRate}x
          </button>

          {/* Mute Toggle */}
          <button
            type="button"
            onClick={toggleMute}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: 6
            }}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </div>

      {/* Attached Illustration Image (For Mondai 4 or questions with diagrams) */}
      {imageUrl && (
        <div style={{
          marginTop: 18,
          paddingTop: 16,
          borderTop: '1px solid var(--border-color)',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}>
            <ImageIcon size={14} />
            Hình ảnh minh họa câu hỏi (Nhấn để phóng to)
          </div>
          <img
            src={imageUrl}
            alt="Tranh minh họa câu hỏi"
            onClick={() => setImageModalUrl(imageUrl)}
            style={{
              maxHeight: 280,
              maxWidth: '100%',
              objectFit: 'contain',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              cursor: 'pointer',
              background: '#ffffff',
              boxShadow: 'var(--shadow-sm)'
            }}
          />
        </div>
      )}

      {/* Image Zoom Modal */}
      {imageModalUrl && (
        <div 
          onClick={() => setImageModalUrl(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
        >
          <img 
            src={imageModalUrl} 
            alt="Phóng to" 
            style={{ 
              maxWidth: '90vw', 
              maxHeight: '90vh', 
              objectFit: 'contain',
              borderRadius: 8,
              background: '#ffffff'
            }} 
          />
        </div>
      )}
    </div>
  );
}
