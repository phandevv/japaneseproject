import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, XCircle, ArrowLeft, RotateCcw, Award, 
  BarChart3, Check, X, BookOpen, Volume2, Clock, Filter, 
  Sparkles, ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';
import { mockExamApi, getMediaUrl } from '../services/api';

export default function MockExamResultPage({ attemptId: propAttemptId }) {
  const params = useParams();
  const navigate = useNavigate();
  const attemptId = propAttemptId || params.attemptId;

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'INCORRECT' | 'CORRECT'
  const [selectedSectionId, setSelectedSectionId] = useState('ALL');

  useEffect(() => {
    if (!attemptId) return;

    const loadResult = async () => {
      setLoading(true);
      try {
        const data = await mockExamApi.getResult(attemptId);
        setResult(data);
      } catch (err) {
        console.error("Failed to load attempt result:", err);
      } finally {
        setLoading(false);
      }
    };

    loadResult();
  }, [attemptId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-secondary)' }}>
        <BarChart3 size={40} className="animate-pulse" style={{ marginBottom: 16 }} />
        <div>Đang tải kết quả bài thi...</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div style={{ maxWidth: 500, margin: '80px auto', textAlign: 'center', padding: 24 }}>
        <AlertCircle size={48} color="var(--danger-color)" style={{ marginBottom: 16 }} />
        <h2>Không tìm thấy kết quả bài thi</h2>
        <button
          onClick={() => navigate('/mock-exams')}
          style={{
            marginTop: 16,
            padding: '10px 20px',
            background: 'var(--accent-color)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer'
          }}
        >
          Quay lại danh sách đề thi
        </button>
      </div>
    );
  }

  // Calculate scaled scores ~180 standard JLPT N3 scale
  // JLPT N3 passing mark: Total >= 95/180 (~52.8%) AND each section >= 19/60 (~31.6%)
  const isPassed = result.percentage >= 53.0;

  // Flatten questions from all sections for review
  const allSections = result.sectionResults || [];
  const displaySections = selectedSectionId === 'ALL'
    ? allSections
    : allSections.filter(s => s.sectionId === selectedSectionId);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px', minHeight: '85vh' }}>
      {/* Top Breadcrumb & Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20
      }}>
        <button
          type="button"
          onClick={() => navigate('/mock-exams')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={16} />
          Danh sách đề thi
        </button>

        <button
          type="button"
          onClick={() => navigate(`/mock-exams/run/${result.examId}`)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent-color)',
            color: '#ffffff',
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <RotateCcw size={15} />
          Thi lại đề này
        </button>
      </div>

      {/* Main Score Hero Card */}
      <div style={{
        background: isPassed 
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.9))'
          : 'linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(220, 38, 38, 0.9))',
        borderRadius: 'var(--radius-xl)',
        padding: '36px 32px',
        color: '#ffffff',
        marginBottom: 28,
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 24
      }}>
        <div style={{ maxWidth: 600 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 700,
            marginBottom: 12
          }}>
            {isPassed ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
            {isPassed ? 'KẾT QUẢ: ĐẠT (合格)' : 'KẾT QUẢ: CHƯA ĐẠT (不合格)'}
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px 0' }}>
            {result.examTitle}
          </h1>

          <p style={{ margin: 0, opacity: 0.92, fontSize: 15, lineHeight: 1.5 }}>
            {isPassed 
              ? 'Chúc mừng bạn đã vượt qua đề thi thử với kết quả xuất sắc! Hãy xem lại các câu sai bên dưới để tối ưu điểm số.'
              : 'Đừng nản lòng! Hãy rà soát kỹ lại các câu chưa chính xác trong phần giải thích bên dưới để củng cố kiến thức nhé.'}
          </p>
        </div>

        {/* Circular / Large Score Badge */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.18)',
          borderRadius: 'var(--radius-xl)',
          padding: '20px 32px',
          backdropFilter: 'blur(10px)',
          textAlign: 'center',
          minWidth: 180
        }}>
          <div style={{ fontSize: 13, opacity: 0.85, fontWeight: 600, textTransform: 'uppercase' }}>
            Tổng số điểm
          </div>
          <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 1.1, margin: '6px 0' }}>
            {result.percentage}%
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, opacity: 0.95 }}>
            {result.totalCorrect} / {result.totalQuestions} câu đúng
          </div>
        </div>
      </div>

      {/* 3 Section Breakdown Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 16,
        marginBottom: 32
      }}>
        {allSections.map((sec, idx) => {
          const pct = sec.percentage || 0;
          const isSecPass = pct >= 32.0;

          return (
            <div
              key={sec.sectionId}
              style={{
                background: 'var(--surface-color)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-color)',
                padding: '20px',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
                  PHẦN {idx + 1}
                </span>
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: isSecPass ? 'var(--success-color)' : 'var(--danger-color)',
                  background: isSecPass ? 'var(--success-light)' : 'var(--danger-light)',
                  padding: '2px 8px',
                  borderRadius: 4
                }}>
                  {isSecPass ? 'Đạt' : 'Điểm liệt'}
                </span>
              </div>

              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 6 }}>
                {sec.titleVi || sec.title}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
                  {sec.correctCount} <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>/ {sec.totalQuestions} câu</span>
                </span>
                <span style={{ fontSize: 16, fontWeight: 700, color: pct >= 50 ? 'var(--success-color)' : 'var(--danger-color)' }}>
                  {pct}%
                </span>
              </div>

              {/* Progress bar */}
              <div style={{
                height: 8,
                background: 'var(--bg-color)',
                borderRadius: 999,
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: pct >= 50 ? 'var(--success-color)' : 'var(--danger-color)',
                  borderRadius: 999,
                  transition: 'width 0.4s ease'
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Question Review Header & Filters */}
      <div style={{
        background: 'var(--surface-color)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        padding: '16px 20px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BookOpen size={18} color="var(--accent-color)" />
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Chi Tiết Từng Câu Hỏi
          </h2>
        </div>

        {/* Filter controls */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {/* Section filter */}
          <select
            value={selectedSectionId}
            onChange={e => setSelectedSectionId(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-color)',
              color: 'var(--text-primary)',
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            <option value="ALL">Tất cả phần thi</option>
            {allSections.map(s => (
              <option key={s.sectionId} value={s.sectionId}>{s.titleVi || s.title}</option>
            ))}
          </select>

          {/* Correctness filter buttons */}
          <div style={{ display: 'flex', background: 'var(--bg-color)', borderRadius: 'var(--radius-md)', padding: 3 }}>
            <button
              onClick={() => setFilterMode('ALL')}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: filterMode === 'ALL' ? 'var(--surface-color)' : 'transparent',
                color: filterMode === 'ALL' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: filterMode === 'ALL' ? 700 : 500,
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilterMode('INCORRECT')}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: filterMode === 'INCORRECT' ? 'var(--danger-light)' : 'transparent',
                color: filterMode === 'INCORRECT' ? 'var(--danger-color)' : 'var(--text-muted)',
                fontWeight: filterMode === 'INCORRECT' ? 700 : 500,
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              Chỉ câu sai
            </button>
            <button
              onClick={() => setFilterMode('CORRECT')}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: filterMode === 'CORRECT' ? 'var(--success-light)' : 'transparent',
                color: filterMode === 'CORRECT' ? 'var(--success-color)' : 'var(--text-muted)',
                fontWeight: filterMode === 'CORRECT' ? 700 : 500,
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              Chỉ câu đúng
            </button>
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {displaySections.map(sec => {
          const filteredQList = (sec.questions || []).filter(q => {
            if (filterMode === 'INCORRECT') return !q.isCorrect;
            if (filterMode === 'CORRECT') return q.isCorrect;
            return true;
          });

          if (filteredQList.length === 0) return null;

          return (
            <div key={sec.sectionId} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--text-primary)',
                padding: '8px 4px',
                borderBottom: '2px solid var(--accent-color)'
              }}>
                {sec.titleVi || sec.title} ({filteredQList.length} câu)
              </div>

              {filteredQList.map(q => {
                const userChoice = q.selectedChoice;
                const correctAns = q.correctAnswer;
                const isCorrect = q.isCorrect;

                return (
                  <div
                    key={q.questionId}
                    style={{
                      background: 'var(--surface-color)',
                      borderRadius: 'var(--radius-lg)',
                      border: `1px solid ${isCorrect ? 'var(--border-color)' : 'rgba(239, 68, 68, 0.3)'}`,
                      padding: '20px',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    {/* Question Top Tags */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: 'var(--bg-color)',
                          fontSize: 12,
                          fontWeight: 700,
                          color: 'var(--text-primary)'
                        }}>
                          問題 {q.mondai} - Câu {q.questionNumber}
                        </span>

                        {q.questionType && (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            ({q.questionType})
                          </span>
                        )}
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        borderRadius: 6,
                        background: isCorrect ? 'var(--success-light)' : 'var(--danger-light)',
                        color: isCorrect ? 'var(--success-color)' : 'var(--danger-color)',
                        fontSize: 12,
                        fontWeight: 700
                      }}>
                        {isCorrect ? <Check size={14} /> : <X size={14} />}
                        {isCorrect ? 'Chính xác' : userChoice ? 'Sai' : 'Chưa trả lời'}
                      </div>
                    </div>

                    {/* Passage if present */}
                    {q.passage && (
                      <div style={{
                        background: 'var(--bg-color)',
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 14,
                        lineHeight: 1.7,
                        color: 'var(--text-primary)',
                        marginBottom: 14,
                        fontFamily: 'var(--font-jp)',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {q.passage}
                      </div>
                    )}

                    {/* Question Text */}
                    <div style={{
                      fontSize: 16,
                      fontWeight: 600,
                      lineHeight: 1.6,
                      color: 'var(--text-primary)',
                      marginBottom: 16,
                      fontFamily: 'var(--font-jp)'
                    }}>
                      {q.questionText || `Câu hỏi số ${q.questionNumber}`}
                    </div>

                    {/* Attached Image if present */}
                    {q.imageRef && (
                      <div style={{ marginBottom: 16 }}>
                        <img
                          src={getMediaUrl(`/exams/images/${result.examId}/${q.imageRef}`)}
                          alt="Tranh minh họa"
                          style={{
                            maxHeight: 240,
                            maxWidth: '100%',
                            borderRadius: 8,
                            border: '1px solid var(--border-color)',
                            background: '#ffffff'
                          }}
                        />
                      </div>
                    )}

                    {/* Choices Review */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                      {q.choices?.map((cText, cIdx) => {
                        const choiceNum = cIdx + 1;
                        const isCorrectAnswer = choiceNum === correctAns;
                        const isUserChoice = choiceNum === userChoice;

                        let cardBg = 'var(--bg-color)';
                        let cardBorder = '1px solid var(--border-color)';
                        let badgeBg = 'var(--surface-color)';
                        let badgeColor = 'var(--text-primary)';

                        if (isCorrectAnswer) {
                          cardBg = 'var(--success-light)';
                          cardBorder = '2px solid var(--success-color)';
                          badgeBg = 'var(--success-color)';
                          badgeColor = '#ffffff';
                        } else if (isUserChoice && !isCorrectAnswer) {
                          cardBg = 'var(--danger-light)';
                          cardBorder = '2px solid var(--danger-color)';
                          badgeBg = 'var(--danger-color)';
                          badgeColor = '#ffffff';
                        }

                        return (
                          <div
                            key={cIdx}
                            style={{
                              padding: '10px 14px',
                              borderRadius: 'var(--radius-md)',
                              background: cardBg,
                              border: cardBorder,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10
                            }}
                          >
                            <div style={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              background: badgeBg,
                              color: badgeColor,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: 12,
                              flexShrink: 0
                            }}>
                              {choiceNum}
                            </div>
                            <div style={{
                              fontSize: 14,
                              fontWeight: (isCorrectAnswer || isUserChoice) ? 600 : 400,
                              color: 'var(--text-primary)',
                              fontFamily: 'var(--font-jp)',
                              flex: 1
                            }}>
                              {cText}
                            </div>
                            {isCorrectAnswer && (
                              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--success-color)' }}>
                                Đáp án đúng
                              </span>
                            )}
                            {isUserChoice && !isCorrectAnswer && (
                              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--danger-color)' }}>
                                Bạn đã chọn
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
