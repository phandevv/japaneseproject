import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader, FileQuestion, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { srsApi, vocabApi } from '../services/api';

/**
 * ReviewQuizPage – Simple multiple-choice quiz using the user's SRS learned word list.
 * Loaded from srsApi.getRandomLearnedWords(), reusing the same quiz logic as DailyStudyPage.
 */
const ReviewQuizPage = ({ goBack }) => {
  const [loading, setLoading] = useState(true);
  const [words, setWords] = useState([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [choices, setChoices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [finished, setFinished] = useState(false);
  const [questionType, setQuestionType] = useState('ja-to-vi'); // 'ja-to-vi' or 'vi-to-ja'
  const [showHiragana, setShowHiragana] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await srsApi.getRandomLearnedWords(20);
        if (!data || data.length === 0) {
          setWords([]);
          setLoading(false);
          return;
        }
        // Shuffle words
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        setWords(shuffled);
      } catch (e) {
        console.error('Failed to load SRS words for quiz:', e);
        setWords([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Build choices whenever quizIndex changes
  useEffect(() => {
    if (words.length === 0) return;
    const current = words[quizIndex];
    if (!current) return;

    // Pick 3 random wrong choices
    const others = words.filter((_, i) => i !== quizIndex);
    const shuffledOthers = [...others].sort(() => Math.random() - 0.5).slice(0, 3);
    const allChoices = [...shuffledOthers, current].sort(() => Math.random() - 0.5);
    setChoices(allChoices);
    setSelected(null);
    setShowHiragana(false); // Reset visibility for next question
  }, [quizIndex, words]);

  const handleAnswer = (word) => {
    if (selected !== null) return; // already answered
    setSelected(word);
    const current = words[quizIndex];
    if (word.id === current.id) {
      setScore(s => s + 1);
    } else {
      setMistakes(m => m + 1);
    }
    // Auto-advance after 1.2s
    setTimeout(() => {
      if (quizIndex + 1 >= words.length) {
        setFinished(true);
      } else {
        setQuizIndex(i => i + 1);
      }
    }, 1200);
  };

  const restart = () => {
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    setWords(shuffled);
    setQuizIndex(0);
    setScore(0);
    setMistakes(0);
    setSelected(null);
    setFinished(false);
    setShowHiragana(false);
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
        <Loader size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-color)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Đang tải từ vựng đã học...</p>
      </div>
    );
  }

  if (words.length < 4) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '20px', textAlign: 'center', padding: '20px' }}>
        <FileQuestion size={48} color="var(--text-secondary)" />
        <div>
          <h2 style={{ margin: '0 0 8px' }}>Chưa đủ từ vựng</h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Bạn cần ít nhất 4 từ đã học để làm quiz.<br />
            Hãy học thêm từ mới qua phần <strong>Học hàng ngày</strong> trước nhé!
          </p>
        </div>
        <button className="btn btn-primary" onClick={goBack}>Quay lại</button>
      </div>
    );
  }

  // ── Finished ───────────────────────────────────────────────────────────────
  if (finished) {
    const accuracy = Math.round((score / words.length) * 100);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '70vh', gap: '24px', textAlign: 'center', padding: '20px' }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          background: accuracy >= 70 ? 'linear-gradient(135deg, #10b981, #3b82f6)' : 'linear-gradient(135deg, #ef4444, #f59e0b)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {accuracy >= 70 ? <CheckCircle size={36} color="white" /> : <XCircle size={36} color="white" />}
        </div>
        <div>
          <h1 style={{ margin: '0 0 8px' }}>Hoàn thành! 🎉</h1>
          <p style={{ fontSize: '2rem', fontWeight: 700, margin: '0 0 4px', color: accuracy >= 70 ? '#10b981' : '#ef4444' }}>
            {accuracy}%
          </p>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            {score}/{words.length} câu đúng • {mistakes} câu sai
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={goBack}>Quay lại</button>
          <button className="btn btn-primary" onClick={restart}>Làm lại</button>
        </div>
      </div>
    );
  }

  // ── Quiz question ──────────────────────────────────────────────────────────
  const current = words[quizIndex];
  const isJaToVi = questionType === 'ja-to-vi';

  return (
    <div className="container animate-fade-in" style={{ padding: '36px 20px', maxWidth: '840px', margin: '0 auto' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button className="btn btn-secondary" onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', fontSize: '0.95rem' }}>
          <ArrowLeft size={16} /> Quay lại
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileQuestion size={22} color="var(--accent-color)" />
          <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Trắc nghiệm ôn tập</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px', fontSize: '1rem' }}>
          <span style={{ color: '#10b981', fontWeight: 700 }}>✓ {score}</span>
          <span style={{ color: '#ef4444', fontWeight: 700 }}>✗ {mistakes}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: '8px', background: 'var(--surface-hover)', borderRadius: '4px', marginBottom: '28px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${((quizIndex) / words.length) * 100}%`,
          background: 'linear-gradient(90deg, #10b981, #3b82f6)',
          borderRadius: '4px', transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Question type toggle */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
        <button
          onClick={() => setQuestionType('ja-to-vi')}
          style={{
            padding: '8px 18px', borderRadius: '24px', fontSize: '0.9rem', border: 'none', cursor: 'pointer', fontWeight: 600,
            background: isJaToVi ? 'var(--accent-color)' : 'var(--surface-hover)',
            color: isJaToVi ? 'white' : 'var(--text-secondary)',
            transition: 'all 0.2s ease',
          }}
        >🇯🇵 → 🇻🇳 Nhật → Việt</button>
        <button
          onClick={() => setQuestionType('vi-to-ja')}
          style={{
            padding: '8px 18px', borderRadius: '24px', fontSize: '0.9rem', border: 'none', cursor: 'pointer', fontWeight: 600,
            background: !isJaToVi ? 'var(--accent-color)' : 'var(--surface-hover)',
            color: !isJaToVi ? 'white' : 'var(--text-secondary)',
            transition: 'all 0.2s ease',
          }}
        >🇻🇳 → 🇯🇵 Việt → Nhật</button>
      </div>

      {/* Question card */}
      <div className="card" style={{ padding: '44px 32px', textAlign: 'center', marginBottom: '28px', borderRadius: '20px' }}>
        <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
          Câu {quizIndex + 1} / {words.length}
        </p>
        {isJaToVi ? (
          <>
            <p className="jp-text" style={{ fontSize: '2.8rem', margin: '0 0 10px', fontWeight: 700, lineHeight: 1.3 }}>
              {current.kanji || current.hiragana}
            </p>
            {current.kanji && current.hiragana && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}>
                <span 
                  onClick={() => setShowHiragana(!showHiragana)}
                  style={{ 
                    fontSize: '1.1rem',
                    color: 'var(--text-secondary)',
                    filter: (showHiragana || selected !== null) ? 'none' : 'blur(6px)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'filter 0.25s ease',
                  }}
                  title={(showHiragana || selected !== null) ? '' : 'Bấm để xem cách đọc'}
                >
                  {current.hiragana}
                </span>
                {selected === null && (
                  <button 
                    onClick={() => setShowHiragana(!showHiragana)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 0 }}
                  >
                    {showHiragana ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <p style={{ fontSize: '1.8rem', margin: 0, fontWeight: 600, lineHeight: 1.4 }}>{current.meaning}</p>
        )}
      </div>

      {/* Answer choices */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {choices.map((choice, i) => {
          const isCorrect = choice.id === current.id;
          const isSelected = selected?.id === choice.id;

          let bg = 'var(--surface-color)';
          let border = '2px solid var(--border-color)';
          let color = 'var(--text-primary)';

          if (selected !== null) {
            if (isCorrect) {
              bg = 'rgba(16,185,129,0.12)';
              border = '2px solid #10b981';
              color = '#10b981';
            } else if (isSelected && !isCorrect) {
              bg = 'rgba(239,68,68,0.12)';
              border = '2px solid #ef4444';
              color = '#ef4444';
            } else {
              bg = 'var(--surface-color)';
              border = '2px solid var(--border-color)';
              color = 'var(--text-muted)';
            }
          }

          return (
            <button
              key={choice.id || i}
              onClick={() => handleAnswer(choice)}
              disabled={selected !== null}
              style={{
                padding: '22px 24px',
                borderRadius: '16px',
                border,
                background: bg,
                color,
                cursor: selected ? 'default' : 'pointer',
                textAlign: 'center',
                transition: 'border-color 0.2s ease, background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease',
                fontSize: isJaToVi ? '1.15rem' : '1.3rem',
                fontWeight: 600,
                minHeight: '75px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                WebkitFontSmoothing: 'antialiased',
              }}
              onMouseEnter={e => {
                if (!selected) {
                  e.currentTarget.style.borderColor = 'var(--accent-color)';
                  e.currentTarget.style.backgroundColor = 'var(--accent-light)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(37,99,235,0.15)';
                }
              }}
              onMouseLeave={e => {
                if (!selected) {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.backgroundColor = 'var(--surface-color)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.03)';
                }
              }}
            >
              {isJaToVi ? (
                choice.meaning
              ) : (
                <span className="jp-text">{choice.kanji || choice.hiragana}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ReviewQuizPage;
