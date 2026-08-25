import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  CheckCircle, XCircle, ChevronRight, ChevronLeft, RotateCcw, 
  Trophy, Award, Volume2, Sparkles, HelpCircle, Eye, EyeOff, 
  ArrowRight, Check, AlertCircle, RefreshCw, Flame
} from 'lucide-react';
import { jlptN3Api } from '../services/api';

const LessonQuizView = ({ chapter, lesson, lessonData, onQuizCompleted }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Quiz Play State
  const [quizState, setQuizState] = useState('playing'); // 'playing' | 'result'
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionKey, setSelectedOptionKey] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [answersMap, setAnswersMap] = useState({}); // { [questionIndex]: { selectedKey, isCorrect, timeSpent } }
  const [showSentenceTranslation, setShowSentenceTranslation] = useState(true);
  
  // Timer & Statistics
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [reviewFilter, setReviewFilter] = useState('all'); // 'all' | 'wrong' | 'correct'

  // Load 20 questions from MongoDB
  const loadQuiz = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await jlptN3Api.getLessonQuiz(chapter, lesson);
      if (data && Array.isArray(data) && data.length > 0) {
        setQuestions(data);
        resetQuizState();
      } else {
        setError(`Chưa có dữ liệu bài tập trắc nghiệm cho Chương ${chapter} Bài ${lesson}.`);
      }
    } catch (err) {
      console.error("Error loading lesson quiz:", err);
      setError("Không thể tải bài tập trắc nghiệm từ hệ thống.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuiz();
  }, [chapter, lesson]);

  // Timer Effect
  useEffect(() => {
    let timer = null;
    if (quizState === 'playing') {
      timer = setInterval(() => {
        setSecondsElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [quizState]);

  // Keyboard shortcut listener (Keys 1, 2, 3, 4 to select; Enter/Space for next)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (quizState !== 'playing' || loading) return;

      if (!isAnswered) {
        if (['1', '2', '3', '4'].includes(e.key)) {
          const optKey = parseInt(e.key, 10);
          handleSelectOption(optKey);
        }
      } else {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleNextQuestion();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quizState, isAnswered, currentIndex, questions, loading]);

  const resetQuizState = () => {
    setQuizState('playing');
    setCurrentIndex(0);
    setSelectedOptionKey(null);
    setIsAnswered(false);
    setAnswersMap({});
    setSecondsElapsed(0);
    setSubmitResult(null);
  };

  const currentQ = questions[currentIndex];

  const handleSelectOption = (key) => {
    if (isAnswered || !currentQ) return;
    setSelectedOptionKey(key);
    setIsAnswered(true);

    const isCorrect = (key === currentQ.answer);
    setAnswersMap(prev => ({
      ...prev,
      [currentIndex]: {
        questionId: currentQ.id || currentIndex + 1,
        selectedKey: key,
        correctKey: currentQ.answer,
        isCorrect
      }
    }));

    // Voice pronounce if sound enabled
    speakJapanese(currentQ.options?.find(o => o.key === key)?.text || currentQ.question);
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOptionKey(null);
      setIsAnswered(false);
    } else {
      handleFinishQuiz();
    }
  };

  const handlePrevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      const prevAns = answersMap[currentIndex - 1];
      if (prevAns) {
        setSelectedOptionKey(prevAns.selectedKey);
        setIsAnswered(true);
      } else {
        setSelectedOptionKey(null);
        setIsAnswered(false);
      }
    }
  };

  const handleFinishQuiz = async () => {
    setQuizState('result');

    // Calculate score
    let correctCount = 0;
    const total = questions.length;
    for (let i = 0; i < total; i++) {
      if (answersMap[i]?.isCorrect) {
        correctCount++;
      }
    }

    setSubmitting(true);
    try {
      const res = await jlptN3Api.submitLessonQuiz(chapter, lesson, correctCount, total);
      setSubmitResult(res);
      if (onQuizCompleted) {
        onQuizCompleted(res);
      }
    } catch (err) {
      console.error("Error submitting lesson quiz score:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const speakJapanese = (text) => {
    if (!text) return;
    try {
      const clean = text.replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '');
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("Audio TTS error:", e);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={{
        background: 'var(--surface-color)',
        borderRadius: '20px',
        padding: '50px 20px',
        textAlign: 'center',
        border: '1px solid var(--border-color)',
        color: 'var(--text-secondary)'
      }}>
        <RefreshCw size={36} className="spin-animation" style={{ color: 'var(--accent-color)', marginBottom: '16px' }} />
        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          Đang tải 20 câu hỏi trắc nghiệm bài học từ Database...
        </div>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div style={{
        background: 'var(--surface-color)',
        borderRadius: '20px',
        padding: '40px 20px',
        textAlign: 'center',
        border: '1px solid var(--border-color)'
      }}>
        <AlertCircle size={48} style={{ color: '#f59e0b', marginBottom: '16px' }} />
        <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
          {error || 'Không tìm thấy câu hỏi.'}
        </h3>
        <button
          onClick={loadQuiz}
          style={{
            marginTop: '16px',
            padding: '10px 24px',
            borderRadius: '10px',
            background: 'var(--accent-color)',
            color: '#fff',
            border: 'none',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Tải lại
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // VIEW: RESULT & FINISHED SCREEN
  // ─────────────────────────────────────────────────────────────
  if (quizState === 'result') {
    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (answersMap[idx]?.isCorrect) correctCount++;
    });
    const total = questions.length;
    const isPerfect = (correctCount === total && total === 20);
    const accuracy = Math.round((correctCount / total) * 100);

    const filteredQuestions = questions.filter((q, idx) => {
      const isCor = answersMap[idx]?.isCorrect;
      if (reviewFilter === 'wrong') return !isCor;
      if (reviewFilter === 'correct') return isCor;
      return true;
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
        {/* Banner Result */}
        <div style={{
          background: isPerfect
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.25) 100%)'
            : 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(220, 38, 38, 0.2) 100%)',
          border: `2px solid ${isPerfect ? '#10b981' : '#ef4444'}`,
          borderRadius: '24px',
          padding: '36px 24px',
          textAlign: 'center',
          position: 'relative',
          boxShadow: isPerfect ? '0 10px 30px rgba(16, 185, 129, 0.2)' : '0 10px 30px rgba(239, 68, 68, 0.15)'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: isPerfect ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            boxShadow: '0 8px 20px rgba(0,0,0,0.2)'
          }}>
            {isPerfect ? <Trophy size={42} /> : <AlertCircle size={42} />}
          </div>

          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
            {isPerfect ? '🎉 XUẤT SẮC! BẠN ĐÃ PASS BÀI HỌC (100%)' : '⚠️ CHƯA ĐẠT 100% ĐỂ PASS BÀI HỌC'}
          </h2>

          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 20px auto', lineHeight: '1.6' }}>
            {isPerfect
              ? `Chúc mừng bạn đã trả lời đúng hoàn hảo 20/20 câu hỏi của Chương ${chapter} - Bài ${lesson}! Trạng thái bài học đã được ghi nhận hoàn thành.`
              : `Quy định: Cần đạt đúng 20/20 câu (100%) để vượt qua bài kiểm tra tổng hợp này. Bạn đạt ${correctCount}/${total} câu (${accuracy}%).`}
          </p>

          {/* Stats Bar */}
          <div style={{
            display: 'inline-flex',
            gap: '24px',
            background: 'var(--surface-color)',
            padding: '14px 28px',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            marginBottom: '24px',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Điểm số</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: isPerfect ? '#10b981' : '#ef4444' }}>
                {correctCount} / {total}
              </div>
            </div>
            <div style={{ width: '1px', background: 'var(--border-color)' }} />
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Độ chính xác</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {accuracy}%
              </div>
            </div>
            <div style={{ width: '1px', background: 'var(--border-color)' }} />
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Thời gian</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {formatTime(secondsElapsed)}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={resetQuizState}
              style={{
                padding: '12px 28px',
                borderRadius: '12px',
                background: isPerfect ? 'var(--accent-color)' : '#ef4444',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
              }}
            >
              <RotateCcw size={18} /> {isPerfect ? 'Luyện tập lại' : 'Làm lại bài kiểm tra (Mục tiêu 20/20)'}
            </button>
          </div>
        </div>

        {/* Detailed Review Section */}
        <div style={{
          background: 'var(--surface-color)',
          borderRadius: '20px',
          padding: '24px',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HelpCircle size={20} style={{ color: 'var(--accent-color)' }} />
              Chi tiết giải thích từng câu hỏi ({filteredQuestions.length}/{total}):
            </h3>

            {/* Filter Buttons */}
            <div style={{ display: 'flex', gap: '6px', background: 'var(--surface-hover)', padding: '4px', borderRadius: '10px' }}>
              <button
                onClick={() => setReviewFilter('all')}
                style={{
                  padding: '6px 12px', borderRadius: '8px', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                  background: reviewFilter === 'all' ? 'var(--accent-color)' : 'transparent',
                  color: reviewFilter === 'all' ? '#fff' : 'var(--text-secondary)'
                }}
              >
                Tất cả ({total})
              </button>
              <button
                onClick={() => setReviewFilter('wrong')}
                style={{
                  padding: '6px 12px', borderRadius: '8px', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                  background: reviewFilter === 'wrong' ? '#ef4444' : 'transparent',
                  color: reviewFilter === 'wrong' ? '#fff' : 'var(--text-secondary)'
                }}
              >
                Câu sai ({total - correctCount})
              </button>
              <button
                onClick={() => setReviewFilter('correct')}
                style={{
                  padding: '6px 12px', borderRadius: '8px', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                  background: reviewFilter === 'correct' ? '#10b981' : 'transparent',
                  color: reviewFilter === 'correct' ? '#fff' : 'var(--text-secondary)'
                }}
              >
                Câu đúng ({correctCount})
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredQuestions.map((q, idx) => {
              const qOriginalIndex = questions.indexOf(q);
              const userAns = answersMap[qOriginalIndex];
              const isCor = userAns?.isCorrect;

              return (
                <div
                  key={q.id || idx}
                  style={{
                    background: 'var(--bg-color)',
                    border: `1px solid ${isCor ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    borderRadius: '16px',
                    padding: '18px 20px',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: isCor ? '#10b981' : '#ef4444',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {qOriginalIndex + 1}
                      </span>
                      <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: '1.5' }}>
                        {q.question}
                      </span>
                    </div>

                    <button
                      onClick={() => speakJapanese(q.question)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', padding: '4px' }}
                      title="Phát âm câu hỏi"
                    >
                      <Volume2 size={20} />
                    </button>
                  </div>

                  {q.translation && (
                    <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '14px', fontStyle: 'italic', paddingLeft: '38px' }}>
                      👉 {q.translation}
                    </div>
                  )}

                  {/* 4 Options Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginTop: '10px' }}>
                    {q.options?.map(opt => {
                      const isOptionCorrect = (opt.key === q.answer);
                      const isOptionChosen = (userAns?.selectedKey === opt.key);

                      let bg = 'var(--surface-color)';
                      let border = '1px solid var(--border-color)';
                      let badgeBg = 'var(--surface-hover)';

                      if (isOptionCorrect) {
                        bg = 'rgba(16, 185, 129, 0.12)';
                        border = '1.5px solid #10b981';
                        badgeBg = '#10b981';
                      } else if (isOptionChosen && !isOptionCorrect) {
                        bg = 'rgba(239, 68, 68, 0.12)';
                        border = '1.5px solid #ef4444';
                        badgeBg = '#ef4444';
                      }

                      return (
                        <div
                          key={opt.key}
                          style={{
                            background: bg,
                            border: border,
                            borderRadius: '12px',
                            padding: '12px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '6px',
                                background: badgeBg,
                                color: (isOptionCorrect || isOptionChosen) ? '#fff' : 'var(--text-secondary)',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                {opt.key}
                              </span>
                              <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {opt.text}
                              </span>
                            </div>
                            {isOptionCorrect && <Check size={16} style={{ color: '#10b981' }} />}
                            {isOptionChosen && !isOptionCorrect && <XCircle size={16} style={{ color: '#ef4444' }} />}
                          </div>

                          {opt.reading && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--accent-color)', paddingLeft: '30px' }}>
                              {opt.reading}
                            </div>
                          )}

                          {opt.meaning && (
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingLeft: '30px' }}>
                              {opt.meaning}
                            </div>
                          )}

                          {opt.explain && (
                            <div style={{
                              fontSize: '0.8rem',
                              color: isOptionCorrect ? '#059669' : 'var(--text-muted)',
                              marginTop: '4px',
                              paddingTop: '6px',
                              borderTop: '1px dashed var(--border-color)',
                              lineHeight: '1.4'
                            }}>
                              💡 {opt.explain}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // VIEW: PLAYING QUIZ SCREEN
  // ─────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '840px', margin: '0 auto', width: '100%' }}>
      {/* Top Header Card */}
      <div style={{
        background: 'var(--surface-color)',
        borderRadius: '20px',
        padding: '16px 20px',
        border: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            background: 'var(--accent-light)',
            color: 'var(--accent-color)',
            fontSize: '0.85rem',
            fontWeight: 800,
            padding: '4px 12px',
            borderRadius: '10px',
            border: '1px solid var(--accent-color)'
          }}>
            Chương {chapter} - Bài {lesson}
          </span>
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Câu {currentIndex + 1} / {questions.length}
          </span>
        </div>

        {/* Stopwatch & Live Score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            ⏱ {formatTime(secondsElapsed)}
          </div>
          <div style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: 700 }}>
            ✓ Đúng: {Object.values(answersMap).filter(a => a.isCorrect).length}
          </div>
          <button
            onClick={() => setShowSentenceTranslation(prev => !prev)}
            style={{
              background: 'var(--surface-hover)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {showSentenceTranslation ? <Eye size={14} /> : <EyeOff size={14} />} Dịch nghĩa
          </button>
        </div>
      </div>

      {/* Progress Dots Bar */}
      <div style={{
        display: 'flex',
        gap: '6px',
        background: 'var(--surface-color)',
        padding: '10px 14px',
        borderRadius: '14px',
        border: '1px solid var(--border-color)',
        overflowX: 'auto'
      }}>
        {questions.map((q, idx) => {
          const ans = answersMap[idx];
          const isCurrent = (idx === currentIndex);
          let bg = 'var(--surface-hover)';
          let border = '1px solid transparent';

          if (ans) {
            bg = ans.isCorrect ? '#10b981' : '#ef4444';
          }
          if (isCurrent) {
            border = '2px solid var(--accent-color)';
            if (!ans) bg = 'var(--accent-light)';
          }

          return (
            <div
              key={idx}
              onClick={() => {
                if (idx <= Object.keys(answersMap).length) {
                  setCurrentIndex(idx);
                  const existing = answersMap[idx];
                  if (existing) {
                    setSelectedOptionKey(existing.selectedKey);
                    setIsAnswered(true);
                  } else {
                    setSelectedOptionKey(null);
                    setIsAnswered(false);
                  }
                }
              }}
              style={{
                flex: 1,
                minWidth: '24px',
                height: '24px',
                borderRadius: '6px',
                background: bg,
                border: border,
                color: ans ? '#fff' : isCurrent ? 'var(--accent-color)' : 'var(--text-muted)',
                fontSize: '0.75rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title={`Câu ${idx + 1}`}
            >
              {idx + 1}
            </div>
          );
        })}
      </div>

      {/* Question Main Card */}
      {currentQ && (
        <div style={{
          background: 'linear-gradient(135deg, var(--surface-color) 0%, var(--bg-color) 100%)',
          borderRadius: '24px',
          padding: '32px 24px',
          border: '1px solid var(--border-color)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
          position: 'relative'
        }}>
          {/* Audio Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-color)', textTransform: 'uppercase' }}>
              Câu hỏi số {currentIndex + 1} / {questions.length}
            </span>
            <button
              onClick={() => speakJapanese(currentQ.question)}
              style={{
                background: 'var(--surface-hover)',
                border: '1px solid var(--border-color)',
                color: 'var(--accent-color)',
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
              title="Phát âm câu hỏi tiếng Nhật"
            >
              <Volume2 size={20} />
            </button>
          </div>

          {/* Prompt Sentence */}
          <h2 style={{
            fontSize: '1.45rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            lineHeight: '1.7',
            marginBottom: '14px',
            letterSpacing: '-0.2px'
          }}>
            {currentQ.question}
          </h2>

          {/* Translation */}
          {showSentenceTranslation && currentQ.translation && (
            <div style={{
              fontSize: '1rem',
              color: 'var(--text-secondary)',
              lineHeight: '1.6',
              marginBottom: '24px',
              fontStyle: 'italic',
              background: 'var(--surface-hover)',
              padding: '10px 16px',
              borderRadius: '10px',
              borderLeft: '4px solid var(--accent-color)'
            }}>
              👉 {currentQ.translation}
            </div>
          )}

          {/* 4 Options Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '14px',
            marginBottom: '24px'
          }}>
            {currentQ.options?.map(opt => {
              const isSelected = (selectedOptionKey === opt.key);
              const isCorrect = (opt.key === currentQ.answer);

              let optionBg = 'var(--surface-color)';
              let optionBorder = '2px solid var(--border-color)';
              let textColor = 'var(--text-primary)';
              let badgeBg = 'var(--surface-hover)';

              if (isAnswered) {
                if (isCorrect) {
                  optionBg = 'rgba(16, 185, 129, 0.15)';
                  optionBorder = '2px solid #10b981';
                  textColor = '#059669';
                  badgeBg = '#10b981';
                } else if (isSelected && !isCorrect) {
                  optionBg = 'rgba(239, 68, 68, 0.15)';
                  optionBorder = '2px solid #ef4444';
                  textColor = '#dc2626';
                  badgeBg = '#ef4444';
                } else {
                  optionBg = 'var(--bg-color)';
                  optionBorder = '1px solid var(--border-color)';
                  textColor = 'var(--text-muted)';
                }
              } else if (isSelected) {
                optionBg = 'var(--accent-light)';
                optionBorder = '2px solid var(--accent-color)';
              }

              return (
                <button
                  key={opt.key}
                  onClick={() => handleSelectOption(opt.key)}
                  disabled={isAnswered}
                  style={{
                    background: optionBg,
                    border: optionBorder,
                    borderRadius: '16px',
                    padding: '16px 18px',
                    textAlign: 'left',
                    cursor: isAnswered ? 'default' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: badgeBg,
                        color: (isAnswered && (isCorrect || isSelected)) ? '#fff' : 'var(--text-secondary)',
                        fontSize: '0.85rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {opt.key}
                      </span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: textColor }}>
                        {opt.text}
                      </span>
                    </div>

                    {isAnswered && isCorrect && <CheckCircle size={20} style={{ color: '#10b981' }} />}
                    {isAnswered && isSelected && !isCorrect && <XCircle size={20} style={{ color: '#ef4444' }} />}
                  </div>

                  {opt.reading && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--accent-color)', fontWeight: 600, paddingLeft: '38px' }}>
                      {opt.reading}
                    </div>
                  )}

                  {opt.meaning && (
                    <div style={{ fontSize: '0.9rem', color: isAnswered && !isCorrect && !isSelected ? 'var(--text-muted)' : 'var(--text-secondary)', paddingLeft: '38px' }}>
                      {opt.meaning}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation Box on Answered */}
          {isAnswered && (
            <div style={{
              background: selectedOptionKey === currentQ.answer ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.08)',
              border: `1.5px solid ${selectedOptionKey === currentQ.answer ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.3)'}`,
              borderRadius: '16px',
              padding: '18px 20px',
              marginBottom: '24px',
              animation: 'fadeIn 0.3s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                {selectedOptionKey === currentQ.answer ? (
                  <>
                    <CheckCircle size={20} style={{ color: '#10b981' }} />
                    <strong style={{ color: '#059669', fontSize: '1rem' }}>Chính xác!</strong>
                  </>
                ) : (
                  <>
                    <XCircle size={20} style={{ color: '#ef4444' }} />
                    <strong style={{ color: '#dc2626', fontSize: '1rem' }}>
                      Chưa chính xác! Đáp án đúng là ({currentQ.answer}) {currentQ.options?.find(o => o.key === currentQ.answer)?.text}
                    </strong>
                  </>
                )}
              </div>

              {/* Explanations of All Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                {currentQ.options?.map(opt => (
                  <div key={opt.key} style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                    <strong style={{ color: opt.key === currentQ.answer ? '#059669' : 'var(--accent-color)' }}>
                      • ({opt.key}) {opt.text} {opt.reading ? `(${opt.reading})` : ''}:
                    </strong>{' '}
                    <span style={{ color: opt.key === currentQ.answer ? '#059669' : 'var(--text-secondary)' }}>
                      {opt.explain || opt.meaning}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Navigation Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap', gap: '12px' }}>
            <button
              onClick={handlePrevQuestion}
              disabled={currentIndex === 0}
              style={{
                padding: '10px 18px',
                borderRadius: '12px',
                background: 'var(--surface-hover)',
                border: '1px solid var(--border-color)',
                color: currentIndex === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
                fontWeight: 600,
                cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <ChevronLeft size={18} /> Câu trước
            </button>

            <button
              onClick={handleNextQuestion}
              disabled={!isAnswered}
              style={{
                padding: '12px 28px',
                borderRadius: '12px',
                background: isAnswered ? 'var(--accent-color)' : 'var(--surface-hover)',
                border: 'none',
                color: isAnswered ? '#fff' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: isAnswered ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: isAnswered ? '0 4px 14px rgba(0,0,0,0.15)' : 'none'
              }}
            >
              {currentIndex + 1 === questions.length ? (
                <>Xem kết quả & Nộp bài <Award size={18} /></>
              ) : (
                <>Câu tiếp theo <ChevronRight size={18} /></>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonQuizView;
