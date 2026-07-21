import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Loader, Bot, CheckCircle, XCircle, Send, Sparkles, RefreshCw, Clock } from 'lucide-react';
import { studyApi, srsApi } from '../services/api';
import axios from 'axios';

// Use same URL logic as api.js - works on both localhost and production
const getApiBaseUrl = () => {
  if (typeof window === 'undefined') return 'http://127.0.0.1:8080/api';
  const { hostname, protocol } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8080/api';
  }
  return `${protocol}//${hostname}/api`;
};

const API_BASE_URL = getApiBaseUrl();
const TOTAL_EXERCISES = 3;

// ── API helpers ───────────────────────────────────────────────────────────────
const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const aiExerciseApi = {
  batchGenerate: async (vocabularyIds, count = TOTAL_EXERCISES) => {
    const resp = await axios.post(
      `${API_BASE_URL}/ai/exercise/batch-generate`,
      { vocabularyIds, count },
      { headers: getAuthHeaders() }
    );
    return resp.data; // Array<{ index, sentence, hint, vocabularyIds }>
  },

  grade: async (sentence, userTranslation, vocabularyIds) => {
    const resp = await axios.post(
      `${API_BASE_URL}/ai/exercise/grade`,
      { sentence, userTranslation, vocabularyIds },
      { headers: getAuthHeaders() }
    );
    return resp.data; // { score, feedback, correctTranslation }
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const scoreToQuality = (score) => {
  if (score >= 8) return { label: 'Easy', color: '#10b981' };
  if (score >= 6) return { label: 'Good', color: '#3b82f6' };
  if (score >= 4) return { label: 'Hard', color: '#f59e0b' };
  return { label: 'Forgot', color: '#ef4444' };
};

// ── Component ─────────────────────────────────────────────────────────────────
const AiTranslationStudy = ({ mode = 'morning', goBack }) => {
  // Phase: 'loading' | 'exercise' | 'results'
  const [phase, setPhase] = useState('loading');

  // All pre-generated exercises (array, filled by batch-generate)
  const [exercises, setExercises] = useState([]); // [{ index, sentence, hint, vocabularyIds }]

  // Current exercise index (0-based)
  const [current, setCurrent] = useState(0);

  // User answers: Map<index, string>
  const [answers, setAnswers] = useState({});

  // Submitted status per exercise
  const [submitted, setSubmitted] = useState({}); // { 0: true, 1: false, ... }

  // Grading results: Map<index, { score, feedback, correctTranslation } | 'pending' | Error>
  const gradesRef = useRef({}); // raw ref for immediate access
  const [grades, setGrades] = useState({}); // state for re-render

  const [error, setError] = useState('');

  // ── 1. On mount: fetch words, then batch-generate ALL exercises in parallel ─
  useEffect(() => {
    const init = async () => {
      try {
        let vocabIds = [];

        if (mode === 'morning') {
          const resp = await studyApi.getQueue();
          vocabIds = (resp.queue || []).slice(0, 10).map(item => item.vocabulary?.id || item.id).filter(Boolean);
        } else {
          const resp = await srsApi.getTodayReviewed();
          vocabIds = (Array.isArray(resp) ? resp : []).slice(0, 10).map(w => w.id).filter(Boolean);
        }

        if (vocabIds.length === 0) {
          setError('Không có từ nào để tạo bài tập. Hãy học thêm từ mới trước!');
          setPhase('exercise');
          return;
        }

        // Batch generate all exercises in parallel (backend uses CompletableFuture.allOf)
        const generated = await aiExerciseApi.batchGenerate(vocabIds, TOTAL_EXERCISES);
        setExercises(generated);
        setPhase('exercise');
      } catch (e) {
        console.error('Init failed:', e);
        setError('Không thể kết nối AI để tạo bài tập. ' + (e.response?.data?.error || e.message));
        setPhase('exercise');
      }
    };
    init();
  }, [mode]);

  // ── 2. Fire grading immediately when user submits each exercise ───────────
  const fireGrade = (index, exercise, userTranslation) => {
    // Mark as pending immediately
    gradesRef.current[index] = 'pending';
    setGrades(prev => ({ ...prev, [index]: 'pending' }));

    aiExerciseApi.grade(exercise.sentence, userTranslation, exercise.vocabularyIds)
      .then(result => {
        gradesRef.current[index] = result;
        setGrades(prev => ({ ...prev, [index]: result }));
      })
      .catch(err => {
        const fallback = { score: 0, feedback: 'Lỗi khi chấm điểm: ' + err.message, correctTranslation: '' };
        gradesRef.current[index] = fallback;
        setGrades(prev => ({ ...prev, [index]: fallback }));
      });
  };

  // ── 3. Submit handler for current exercise ────────────────────────────────
  const handleSubmit = () => {
    const answer = (answers[current] || '').trim();
    if (!answer || !exercises[current]) return;

    const exercise = exercises[current];
    setSubmitted(prev => ({ ...prev, [current]: true }));

    // IMMEDIATELY fire grading in background (don't await)
    fireGrade(current, exercise, answer);

    // Advance to next or go to results
    if (current + 1 < exercises.length) {
      setCurrent(prev => prev + 1);
    } else {
      // Last exercise submitted → go to results
      setPhase('results');
    }
  };

  const handleKeyDown = (e) => {
    if (e.ctrlKey && e.key === 'Enter') handleSubmit();
  };

  // ── Progress bar ──────────────────────────────────────────────────────────
  const ProgressBar = () => (
    <div style={{ height: '6px', background: 'var(--surface-hover)', borderRadius: '3px', marginBottom: '28px', overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        width: `${(Object.keys(submitted).length / TOTAL_EXERCISES) * 100}%`,
        background: 'linear-gradient(90deg, #ef4444, #f59e0b)',
        borderRadius: '3px',
        transition: 'width 0.4s ease',
      }} />
    </div>
  );

  // ── LOADING SCREEN ────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '70vh', gap: '20px' }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #ef4444, #f59e0b)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'pulse 2s ease-in-out infinite',
        }}>
          <Bot size={36} color="white" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 8px' }}>AI đang soạn {TOTAL_EXERCISES} câu hỏi song song...</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            DeepSeek đang sinh {TOTAL_EXERCISES} bài tập cùng lúc, chờ tý thôi!
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          {Array.from({ length: TOTAL_EXERCISES }).map((_, i) => (
            <div key={i} style={{
              width: '10px', height: '10px', borderRadius: '50%',
              background: 'var(--accent-color)',
              animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite`,
            }} />
          ))}
        </div>
        <style>{`
          @keyframes bounce {
            0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
            40% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // ── EXERCISE SCREEN ───────────────────────────────────────────────────────
  if (phase === 'exercise') {
    const exercise = exercises[current];

    return (
      <div className="container animate-fade-in" style={{ padding: '32px 20px', maxWidth: '720px', margin: '0 auto' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <button className="btn btn-secondary" onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={15} /> Quay lại
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bot size={20} color="#ef4444" />
            <span style={{ fontWeight: 600 }}>Thử thách AI — Dịch thuật</span>
          </div>
          <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Câu {current + 1} / {TOTAL_EXERCISES}
          </span>
        </div>

        <ProgressBar />

        {/* Mini status strip: show grading progress for already-submitted ones */}
        {Object.keys(submitted).length > 0 && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {Object.keys(submitted).map(idx => {
              const g = grades[parseInt(idx)];
              const isPending = g === 'pending' || g === undefined;
              const isReady = g && g !== 'pending';
              return (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem',
                  background: isPending ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)',
                  border: `1px solid ${isPending ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`,
                  color: isPending ? '#f59e0b' : '#10b981',
                }}>
                  {isPending ? <Clock size={10} /> : <CheckCircle size={10} />}
                  Câu {parseInt(idx) + 1}: {isPending ? 'Đang chấm...' : `${g.score}/10`}
                </div>
              );
            })}
          </div>
        )}

        {error && (
          <div style={{ padding: '16px', marginBottom: '24px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', color: '#ef4444' }}>
            {error}
          </div>
        )}

        {exercise ? (
          <div className="card" style={{ padding: '32px', marginBottom: '24px' }}>
            <p style={{ margin: '0 0 6px', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Dịch câu sau sang Tiếng Việt
            </p>
            <div style={{
              padding: '20px 24px', marginBottom: '16px',
              background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(59,130,246,0.05))',
              border: '1px solid rgba(139,92,246,0.2)', borderRadius: '12px',
            }}>
              <p className="jp-text" style={{ fontSize: '1.6rem', margin: 0, lineHeight: 1.6 }}>
                {exercise.sentence}
              </p>
            </div>

            {exercise.hint && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
                💡 {exercise.hint}
              </p>
            )}

            <textarea
              value={answers[current] || ''}
              onChange={e => setAnswers(prev => ({ ...prev, [current]: e.target.value }))}
              placeholder="Nhập bản dịch của bạn..."
              rows={4}
              onKeyDown={handleKeyDown}
              autoFocus
              style={{
                width: '100%', padding: '14px 16px',
                background: 'var(--surface-color)', border: '1px solid var(--border-color)',
                borderRadius: '10px', color: 'var(--text-primary)', fontSize: '1rem',
                resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none',
              }}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '6px 0 16px' }}>
              Ctrl + Enter để gửi
            </p>

            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={!(answers[current] || '').trim()}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 28px' }}
            >
              <Send size={16} />
              {current + 1 >= TOTAL_EXERCISES ? '🎯 Nộp bài & Xem kết quả' : 'Gửi & Câu tiếp →'}
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            Không có câu hỏi để hiển thị.
            <button className="btn btn-secondary" onClick={goBack} style={{ marginTop: '16px', display: 'block', margin: '16px auto 0' }}>
              Quay lại
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── RESULTS SCREEN ────────────────────────────────────────────────────────
  const allGraded = exercises.every((_, i) => grades[i] && grades[i] !== 'pending');
  const totalScore = allGraded
    ? exercises.reduce((sum, _, i) => sum + (grades[i]?.score || 0), 0)
    : null;
  const avgScore = totalScore !== null ? Math.round(totalScore / exercises.length) : null;

  return (
    <div className="container animate-fade-in" style={{ padding: '32px 20px', maxWidth: '720px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button className="btn btn-secondary" onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ArrowLeft size={15} /> Kết thúc
        </button>
        <h2 style={{ margin: 0 }}>📊 Kết quả</h2>
        {!allGraded && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
            AI đang chấm nốt...
          </div>
        )}
        {allGraded && avgScore !== null && (
          <div style={{
            marginLeft: 'auto', padding: '6px 16px', borderRadius: '50px', fontWeight: 700,
            background: avgScore >= 8 ? 'rgba(16,185,129,0.15)' : avgScore >= 6 ? 'rgba(59,130,246,0.15)' : 'rgba(239,68,68,0.15)',
            color: avgScore >= 8 ? '#10b981' : avgScore >= 6 ? '#3b82f6' : '#ef4444',
            border: `1px solid ${avgScore >= 8 ? 'rgba(16,185,129,0.3)' : avgScore >= 6 ? 'rgba(59,130,246,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}>
            Trung bình: {avgScore}/10
          </div>
        )}
      </div>

      {/* Per-exercise result cards, appear as grading completes */}
      {exercises.map((exercise, i) => {
        const g = grades[i];
        const isPending = !g || g === 'pending';
        const userAns = answers[i] || '';

        return (
          <div key={i} className="card" style={{
            padding: '24px', marginBottom: '16px',
            opacity: isPending ? 0.7 : 1,
            transition: 'opacity 0.3s ease',
            border: isPending ? '1px solid var(--border-color)' : `1px solid ${scoreToQuality(g.score).color}33`,
          }}>
            {/* Exercise header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Câu {i + 1}</span>
              {isPending
                ? <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontSize: '0.8rem' }}>
                    <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> Đang chấm...
                  </div>
                : <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.3rem', fontWeight: 700, color: scoreToQuality(g.score).color }}>
                      {g.score}/10
                    </span>
                    <span style={{
                      padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                      background: `${scoreToQuality(g.score).color}22`,
                      color: scoreToQuality(g.score).color,
                      border: `1px solid ${scoreToQuality(g.score).color}44`,
                    }}>
                      {scoreToQuality(g.score).label}
                    </span>
                  </div>
              }
            </div>

            {/* Japanese sentence */}
            <p className="jp-text" style={{ margin: '0 0 10px', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
              {exercise.sentence}
            </p>

            {/* User answer */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div style={{ padding: '10px 14px', background: 'var(--surface-hover)', borderRadius: '8px' }}>
                <p style={{ margin: '0 0 4px', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Bạn dịch</p>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>{userAns || '—'}</p>
              </div>
              <div style={{
                padding: '10px 14px', borderRadius: '8px',
                background: isPending ? 'var(--surface-hover)' : `${scoreToQuality(g.score).color}11`,
                border: isPending ? 'none' : `1px solid ${scoreToQuality(g.score).color}33`,
              }}>
                <p style={{ margin: '0 0 4px', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Đáp án chuẩn</p>
                <p style={{ margin: 0, fontSize: '0.9rem', color: isPending ? 'var(--text-secondary)' : scoreToQuality(g.score).color }}>
                  {isPending ? '...' : (g.correctTranslation || '—')}
                </p>
              </div>
            </div>

            {/* AI Feedback */}
            {!isPending && g.feedback && (
              <p style={{
                margin: 0, padding: '10px 14px',
                background: 'rgba(255,255,255,0.03)', borderRadius: '8px',
                fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6,
              }}>
                💬 {g.feedback}
              </p>
            )}
          </div>
        );
      })}

      {/* Done button */}
      <button className="btn btn-primary" onClick={goBack} style={{ width: '100%', padding: '14px', marginTop: '8px', fontSize: '1rem' }}>
        {allGraded ? '✅ Hoàn thành! Quay về' : '⏳ Đang chấm... (bạn có thể đóng)'}
      </button>
    </div>
  );
};

export default AiTranslationStudy;
