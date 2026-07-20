import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader, Bot, CheckCircle, XCircle, Send, Sparkles, RefreshCw } from 'lucide-react';
import { studyApi, srsApi } from '../services/api';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const aiExerciseApi = {
  generate: async (vocabularyIds) => {
    const token = localStorage.getItem('authToken');
    const resp = await axios.post(`${API_BASE_URL}/ai/exercise/generate`,
      { vocabularyIds },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return resp.data;
  },
  grade: async (sentence, userTranslation, vocabularyIds) => {
    const token = localStorage.getItem('authToken');
    const resp = await axios.post(`${API_BASE_URL}/ai/exercise/grade`,
      { sentence, userTranslation, vocabularyIds },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return resp.data;
  },
};

// Map AI score (0-10) to FSRS quality (1-4)
const scoreToQuality = (score) => {
  if (score >= 8) return 4; // Easy
  if (score >= 6) return 3; // Good
  if (score >= 4) return 2; // Hard
  return 1;                 // Forgot
};

const qualityLabel = (q) => {
  if (q === 4) return { label: 'Easy', color: '#10b981' };
  if (q === 3) return { label: 'Good', color: '#3b82f6' };
  if (q === 2) return { label: 'Hard', color: '#f59e0b' };
  return { label: 'Forgot', color: '#ef4444' };
};

const STEP = { LOADING: 'loading', EXERCISE: 'exercise', GRADING: 'grading', RESULT: 'result', DONE: 'done' };

const AiTranslationStudy = ({ mode = 'morning', goBack }) => {
  const [step, setStep] = useState(STEP.LOADING);
  const [words, setWords] = useState([]);
  const [exercise, setExercise] = useState(null); // { sentence, hint }
  const [userInput, setUserInput] = useState('');
  const [result, setResult] = useState(null);   // { score, feedback, correctTranslation }
  const [error, setError] = useState('');
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [totalExercises, setTotalExercises] = useState(3);

  const loadWordsAndGenerate = async () => {
    setStep(STEP.LOADING);
    setError('');
    setUserInput('');
    setResult(null);
    try {
      let fetchedWords = [];
      if (mode === 'morning') {
        const resp = await studyApi.getQueue();
        fetchedWords = (resp.queue || []).slice(0, 5).map(item => ({
          id: item.vocabulary?.id || item.id,
          word: item.vocabulary?.kanji || item.vocabulary?.hiragana,
        }));
      } else {
        const resp = await srsApi.getTodayReviewed();
        fetchedWords = (Array.isArray(resp) ? resp : []).slice(0, 5).map(w => ({
          id: w.id,
          word: w.kanji || w.hiragana,
        }));
      }

      if (fetchedWords.length === 0) {
        setError('Không có từ nào để tạo bài tập. Hãy học thêm từ mới trước!');
        setStep(STEP.EXERCISE);
        return;
      }

      setWords(fetchedWords);
      const ids = fetchedWords.map(w => w.id);
      const ex = await aiExerciseApi.generate(ids);
      setExercise(ex);
      setStep(STEP.EXERCISE);
    } catch (e) {
      console.error(e);
      setError('Không thể kết nối AI để tạo bài tập. Vui lòng thử lại.');
      setStep(STEP.EXERCISE);
    }
  };

  useEffect(() => { loadWordsAndGenerate(); }, [mode]);

  const handleSubmit = async () => {
    if (!userInput.trim()) return;
    setStep(STEP.GRADING);
    try {
      const ids = words.map(w => w.id);
      const res = await aiExerciseApi.grade(exercise.sentence, userInput.trim(), ids);
      setResult(res);
      setStep(STEP.RESULT);
    } catch (e) {
      console.error(e);
      setError('Không thể chấm điểm. Vui lòng thử lại.');
      setStep(STEP.EXERCISE);
    }
  };

  const handleNext = async () => {
    const next = exerciseIndex + 1;
    if (next >= totalExercises) {
      setStep(STEP.DONE);
    } else {
      setExerciseIndex(next);
      await loadWordsAndGenerate();
    }
  };

  const quality = result ? scoreToQuality(result.score) : null;
  const ql = quality ? qualityLabel(quality) : null;

  // ── LOADING ──
  if (step === STEP.LOADING) {
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
          <h2 style={{ margin: '0 0 8px' }}>AI đang soạn câu hỏi...</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>DeepSeek đang tạo bài tập dịch thuật cho bạn</p>
        </div>
        <Loader size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-color)' }} />
      </div>
    );
  }

  // ── GRADING ──
  if (step === STEP.GRADING) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '70vh', gap: '20px' }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'pulse 2s ease-in-out infinite',
        }}>
          <Sparkles size={36} color="white" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 8px' }}>AI đang chấm điểm...</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Đang phân tích bản dịch của bạn</p>
        </div>
        <Loader size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-color)' }} />
      </div>
    );
  }

  // ── DONE ──
  if (step === STEP.DONE) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '70vh', gap: '24px' }}>
        <CheckCircle size={64} color="var(--success-color)" />
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ margin: '0 0 8px' }}>Hoàn thành!</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Bạn đã hoàn thành {totalExercises} bài tập dịch thuật hôm nay. Kết quả đã được ghi vào SRS.</p>
        </div>
        <button className="btn btn-primary" onClick={goBack}>
          Quay về
        </button>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in" style={{ padding: '32px 20px', maxWidth: '720px', margin: '0 auto' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <button className="btn btn-secondary" onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ArrowLeft size={15} /> Quay lại
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bot size={20} color="#ef4444" />
          <span style={{ fontWeight: 600 }}>Thử thách AI — Dịch thuật</span>
        </div>
        <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Câu {exerciseIndex + 1} / {totalExercises}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: '4px', background: 'var(--surface-hover)', borderRadius: '2px', marginBottom: '32px' }}>
        <div style={{
          height: '100%',
          width: `${((exerciseIndex) / totalExercises) * 100}%`,
          background: 'linear-gradient(90deg, #ef4444, #f59e0b)',
          borderRadius: '2px',
          transition: 'width 0.5s ease',
        }} />
      </div>

      {error && (
        <div style={{
          padding: '16px', marginBottom: '24px',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '12px', color: '#ef4444',
        }}>
          {error}
          <button className="btn btn-secondary" onClick={loadWordsAndGenerate} style={{ marginLeft: '16px', padding: '4px 12px', fontSize: '0.8rem' }}>
            <RefreshCw size={12} /> Thử lại
          </button>
        </div>
      )}

      {/* Exercise card (when not showing result) */}
      {step === STEP.EXERCISE && exercise && (
        <div className="card" style={{ padding: '32px', marginBottom: '24px' }}>
          <div style={{ marginBottom: '20px' }}>
            <p style={{ margin: '0 0 6px', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Dịch câu sau sang Tiếng Việt
            </p>
            <div style={{
              padding: '20px 24px',
              background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(59,130,246,0.05))',
              border: '1px solid rgba(139,92,246,0.2)',
              borderRadius: '12px',
            }}>
              <p className="jp-text" style={{ fontSize: '1.5rem', margin: 0, lineHeight: 1.6 }}>
                {exercise.sentence}
              </p>
            </div>
          </div>

          {exercise.hint && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
              💡 Gợi ý: {exercise.hint}
            </p>
          )}

          <textarea
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            placeholder="Nhập bản dịch của bạn vào đây..."
            rows={4}
            style={{
              width: '100%', padding: '14px 16px',
              background: 'var(--surface-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              resize: 'vertical',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
              outline: 'none',
            }}
            onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') handleSubmit(); }}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>Ctrl + Enter để gửi</p>

          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={!userInput.trim()}
            style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 28px' }}
          >
            <Send size={16} />
            Gửi bài
          </button>
        </div>
      )}

      {/* Result card */}
      {step === STEP.RESULT && result && (
        <>
          {/* Original question recap */}
          <div className="card" style={{ padding: '20px 24px', marginBottom: '16px', opacity: 0.8 }}>
            <p style={{ margin: '0 0 8px', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Câu hỏi</p>
            <p className="jp-text" style={{ margin: 0, fontSize: '1.2rem' }}>{exercise.sentence}</p>
          </div>

          {/* Score card */}
          <div className="card" style={{
            padding: '28px', marginBottom: '16px',
            background: result.score >= 8
              ? 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,182,212,0.06))'
              : result.score >= 6
                ? 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(139,92,246,0.06))'
                : result.score >= 4
                  ? 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(239,68,68,0.06))'
                  : 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(245,158,11,0.06))',
            border: `1px solid ${ql.color}33`,
          }}>
            {/* Score + quality */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {result.score >= 6
                  ? <CheckCircle size={28} color={ql.color} />
                  : <XCircle size={28} color={ql.color} />
                }
                <div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Điểm AI</p>
                  <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: ql.color }}>{result.score}/10</p>
                </div>
              </div>
              <div style={{
                padding: '8px 20px', borderRadius: '50px',
                background: `${ql.color}22`, border: `1px solid ${ql.color}55`,
                color: ql.color, fontWeight: 600, fontSize: '0.9rem',
              }}>
                SRS: {ql.label}
              </div>
            </div>

            {/* User answer */}
            <div style={{ marginBottom: '16px' }}>
              <p style={{ margin: '0 0 6px', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Bản dịch của bạn</p>
              <p style={{
                margin: 0, padding: '12px 16px',
                background: 'var(--surface-hover)',
                borderRadius: '8px', fontSize: '1rem',
              }}>{userInput}</p>
            </div>

            {/* Correct translation */}
            <div style={{ marginBottom: '16px' }}>
              <p style={{ margin: '0 0 6px', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Bản dịch chuẩn</p>
              <p style={{
                margin: 0, padding: '12px 16px',
                background: `${ql.color}11`, border: `1px solid ${ql.color}33`,
                borderRadius: '8px', fontSize: '1rem', color: ql.color,
              }}>{result.correctTranslation}</p>
            </div>

            {/* Feedback */}
            {result.feedback && (
              <div>
                <p style={{ margin: '0 0 6px', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Nhận xét từ AI</p>
                <p style={{
                  margin: 0, padding: '12px 16px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '8px', fontSize: '0.9rem',
                  lineHeight: 1.6, color: 'var(--text-primary)',
                }}>{result.feedback}</p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={goBack} style={{ flex: 1 }}>
              Về trang ôn tập
            </button>
            <button className="btn btn-primary" onClick={handleNext} style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {exerciseIndex + 1 >= totalExercises ? '🎉 Hoàn thành!' : 'Câu tiếp theo →'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AiTranslationStudy;
