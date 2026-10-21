import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Clock, CheckCircle, AlertTriangle, ArrowLeft, ArrowRight, 
  Bookmark, BookmarkCheck, Send, Check, ChevronDown, ChevronUp,
  Volume2, BookOpen, AlertCircle, Save
} from 'lucide-react';
import { mockExamApi, getMediaUrl } from '../services/api';
import ListeningSectionView from '../components/ListeningSectionView';
import FormattedQuestionText from '../components/FormattedQuestionText';
import { renderTextWithFurigana } from '../utils/furiganaUtils';

export default function MockExamRunnerPage({ examId: propExamId }) {
  const params = useParams();
  const navigate = useNavigate();
  const examId = propExamId || params.examId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [exam, setExam] = useState(null);

  // Exam state
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [timeLeft, setTimeLeft] = useState(1800);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedText, setLastSavedText] = useState('Đã lưu');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [isPassageExpanded, setIsPassageExpanded] = useState(true);

  const timerRef = useRef(null);
  const autoSaveRef = useRef(null);
  const answersRef = useRef(answers);
  const timeLeftRef = useRef(timeLeft);
  const currentSectionRef = useRef(currentSectionIndex);

  answersRef.current = answers;
  timeLeftRef.current = timeLeft;
  currentSectionRef.current = currentSectionIndex;

  // Initialize or resume exam
  useEffect(() => {
    if (!examId) return;

    const initExam = async () => {
      setLoading(true);
      try {
        const attemptData = await mockExamApi.startExam(examId);

        // Normalize exam so every question is guaranteed to have a unique valid id
        const rawExam = attemptData.exam;
        if (rawExam && Array.isArray(rawExam.sections)) {
          rawExam.sections = rawExam.sections.map((sec, secIdx) => {
            const secId = sec.sectionId || `sec-${secIdx}`;
            return {
              ...sec,
              sectionId: secId,
              questions: (sec.questions || []).map((q, qIdx) => ({
                ...q,
                id: (q.id && String(q.id).trim() !== '' && q.id !== 'undefined' && q.id !== 'null')
                  ? String(q.id)
                  : `${rawExam.examId || examId}-${secId}-m${q.mondai || 1}-q${q.questionNumber || (qIdx + 1)}`
              }))
            };
          });
        }

        setAttempt(attemptData);
        setExam(rawExam);

        const saved = attemptData.savedAnswers || {};
        // Clean out any invalid keys
        const cleanSaved = {};
        for (const [k, v] of Object.entries(saved)) {
          if (k && k !== 'undefined' && k !== 'null') {
            cleanSaved[k] = v;
          }
        }
        setAnswers(cleanSaved);

        const secIdx = attemptData.currentSectionIndex || 0;
        setCurrentSectionIndex(secIdx);

        const currentSec = attemptData.exam?.sections?.[secIdx];
        const initialTime = attemptData.sectionTimeLeftSec > 0 
          ? attemptData.sectionTimeLeftSec 
          : (currentSec?.timeLimitSec || 1800);
        setTimeLeft(initialTime);

      } catch (err) {
        console.error("Failed to start mock exam:", err);
        setError(err.response?.data?.message || "Không thể tải đề thi");
      } finally {
        setLoading(false);
      }
    };

    initExam();
  }, [examId]);

  // Timer countdown
  useEffect(() => {
    if (loading || !attempt) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [loading, attempt, currentSectionIndex]);

  // Periodic Auto-save every 20 seconds
  useEffect(() => {
    if (!attempt) return;

    autoSaveRef.current = setInterval(() => {
      triggerSave();
    }, 20000);

    return () => clearInterval(autoSaveRef.current);
  }, [attempt]);

  // Keyboard shortcut listener (1, 2, 3, 4 for answer selection)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['1', '2', '3', '4'].includes(e.key)) {
        const activeQ = currentSection?.questions?.[currentQuestionIndex];
        if (activeQ && activeQ.id) {
          const choiceNum = Number(e.key);
          if (choiceNum <= (activeQ.choices?.length || 4)) {
            handleSelectAnswer(activeQ.id, choiceNum);
          }
        }
      } else if (e.key === 'ArrowRight') {
        handleNextQuestion();
      } else if (e.key === 'ArrowLeft') {
        handlePrevQuestion();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const triggerSave = async () => {
    if (!attempt?.attemptId) return;
    setIsSaving(true);
    try {
      await mockExamApi.saveProgress(attempt.attemptId, {
        currentSectionIndex: currentSectionRef.current,
        sectionTimeLeftSec: timeLeftRef.current,
        answers: answersRef.current
      });
      setLastSavedText('Đã lưu lúc ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.warn("Auto save failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTimeExpired = () => {
    if (currentSectionIndex < (exam?.sections?.length || 3) - 1) {
      alert("Hết thời gian của phần thi này! Hệ thống sẽ tự động chuyển sang phần thi tiếp theo.");
      handleChangeSection(currentSectionIndex + 1);
    } else {
      alert("Hết giờ làm bài thi! Hệ thống đang tiến hành thu bài và chấm điểm.");
      handleSubmitExam();
    }
  };

  const currentSection = exam?.sections?.[currentSectionIndex];
  const activeQuestion = currentSection?.questions?.[currentQuestionIndex];
  const isListeningSection = currentSection?.sectionId === 'listening';

  const handleSelectAnswer = (qId, choiceNum) => {
    if (!qId || qId === 'undefined' || qId === 'null') return;
    setAnswers(prev => ({
      ...prev,
      [qId]: choiceNum
    }));
  };

  const toggleFlagQuestion = (qId) => {
    if (!qId || qId === 'undefined' || qId === 'null') return;
    setFlagged(prev => ({
      ...prev,
      [qId]: !prev[qId]
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < (currentSection?.questions?.length || 0) - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleChangeSection = async (newSecIdx) => {
    await triggerSave();
    setCurrentSectionIndex(newSecIdx);
    setCurrentQuestionIndex(0);
    const newSec = exam?.sections?.[newSecIdx];
    setTimeLeft(newSec?.timeLimitSec || 1800);
  };

  const handleSubmitExam = async () => {
    setShowSubmitModal(false);
    setLoading(true);
    try {
      await mockExamApi.submitExam(attempt.attemptId, answers);
      navigate(`/mock-exams/result/${attempt.attemptId}`);
    } catch (err) {
      console.error("Submission failed:", err);
      alert("Nộp bài thất bại: " + (err.response?.data?.message || err.message));
      setLoading(false);
    }
  };

  const handleExitExam = async () => {
    await triggerSave();
    navigate('/mock-exams');
  };

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Count answered questions in current section
  const sectionQuestions = currentSection?.questions || [];
  const answeredCount = sectionQuestions.filter(q => q?.id && answers[q.id] != null).length;
  const flaggedCount = sectionQuestions.filter(q => q?.id && flagged[q.id]).length;

  if (loading && !exam) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-secondary)' }}>
        <Clock size={40} className="animate-spin" style={{ marginBottom: 16 }} />
        <div>Đang tải phòng thi...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 600, margin: '80px auto', textAlign: 'center', padding: 32 }}>
        <AlertCircle size={48} color="var(--danger-color)" style={{ marginBottom: 16 }} />
        <h2>{error}</h2>
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

  return (
    <div style={{
      maxWidth: 1400,
      margin: '0 auto',
      padding: '16px',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Top Header Room Bar */}
      <div style={{
        background: 'var(--surface-color)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        padding: '14px 20px',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        boxShadow: 'var(--shadow-sm)'
      }}>
        {/* Left: Exit + Exam Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            type="button"
            onClick={() => setShowExitModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14
            }}
          >
            <ArrowLeft size={18} />
            Thoát
          </button>

          <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>
              {exam?.title}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {lastSavedText} {isSaving && '(Đang lưu...)'}
            </div>
          </div>
        </div>

        {/* Center: Section Selector */}
        <div style={{ display: 'flex', gap: 8 }}>
          {exam?.sections?.map((sec, idx) => {
            const isActive = idx === currentSectionIndex;
            return (
              <button
                key={sec.sectionId}
                onClick={() => handleChangeSection(idx)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: isActive ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                  background: isActive ? 'var(--accent-light)' : 'var(--bg-color)',
                  color: isActive ? 'var(--accent-color)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span>{idx + 1}. {sec.titleVi || sec.title}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Timer & Submit Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px',
            borderRadius: 'var(--radius-md)',
            background: timeLeft < 300 ? 'var(--danger-light)' : 'var(--bg-color)',
            color: timeLeft < 300 ? 'var(--danger-color)' : 'var(--text-primary)',
            fontWeight: 800,
            fontSize: 16,
            border: `1px solid ${timeLeft < 300 ? 'var(--danger-color)' : 'var(--border-color)'}`
          }}>
            <Clock size={18} />
            <span>{formatTimer(timeLeft)}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowSubmitModal(true)}
            style={{
              padding: '10px 18px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--success-color)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <Send size={15} />
            Nộp bài thi
          </button>
        </div>
      </div>

      {/* Main Examination Layout: 2 Columns */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 320px',
        gap: 16,
        flex: 1
      }}>
        {/* Left: Active Question Viewer */}
        <div style={{
          background: 'var(--surface-color)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div>
            {/* Listening Section Player if active */}
            {isListeningSection && (
              <ListeningSectionView
                examId={examId}
                audioFile={exam?.audioFile}
                currentQuestion={activeQuestion}
                isExamMode={true}
              />
            )}

            {/* Question Header & Mondai */}
            {activeQuestion && (
              <>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      background: 'var(--accent-light)',
                      color: 'var(--accent-color)',
                      fontSize: 13,
                      fontWeight: 700
                    }}>
                      問題 {activeQuestion.mondai}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                      Câu {activeQuestion.questionNumber}
                    </span>
                    {activeQuestion.questionType && (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        ({activeQuestion.questionType})
                      </span>
                    )}
                  </div>

                  {/* Flag for review */}
                  <button
                    type="button"
                    onClick={() => toggleFlagQuestion(activeQuestion?.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: (activeQuestion?.id && flagged[activeQuestion.id]) ? 'var(--warning-light)' : 'transparent',
                      color: (activeQuestion?.id && flagged[activeQuestion.id]) ? 'var(--warning-color)' : 'var(--text-muted)',
                      border: `1px solid ${(activeQuestion?.id && flagged[activeQuestion.id]) ? 'var(--warning-color)' : 'var(--border-color)'}`,
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600
                    }}
                  >
                    {(activeQuestion?.id && flagged[activeQuestion.id]) ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                    {(activeQuestion?.id && flagged[activeQuestion.id]) ? 'Đã đánh dấu' : 'Đánh dấu xem lại'}
                  </button>
                </div>

                {/* Reading Passage (if present) */}
                {activeQuestion.passage && (
                  <div style={{
                    background: 'var(--bg-color)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    padding: '16px',
                    marginBottom: 20
                  }}>
                    <div 
                      onClick={() => setIsPassageExpanded(!isPassageExpanded)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: 13,
                        color: 'var(--text-primary)',
                        marginBottom: isPassageExpanded ? 10 : 0
                      }}
                    >
                      <span>Đoạn văn đọc hiểu</span>
                      {isPassageExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>

                    {isPassageExpanded && (
                      <div style={{
                        fontSize: 15,
                        lineHeight: 1.8,
                        color: 'var(--text-primary)',
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'var(--font-jp)'
                      }}>
                        {renderTextWithFurigana(activeQuestion.passage, { keyPrefix: 'runner-psg' })}
                      </div>
                    )}
                  </div>
                )}

                {/* Question Prompt */}
                <div style={{
                  fontSize: 18,
                  fontWeight: 600,
                  lineHeight: 1.7,
                  color: 'var(--text-primary)',
                  marginBottom: 24,
                  fontFamily: 'var(--font-jp)'
                }}>
                  <FormattedQuestionText
                    text={activeQuestion.questionText}
                    fallbackNumber={activeQuestion.questionNumber}
                    questionType={activeQuestion.questionType}
                    choices={activeQuestion.choices}
                  />
                </div>

                {/* Attached question image if not listening section */}
                {!isListeningSection && activeQuestion.imageRef && (
                  <div style={{ marginBottom: 20, textAlign: 'center' }}>
                    <img
                      src={getMediaUrl(`/exams/images/${examId}/${activeQuestion.imageRef}`)}
                      alt="Hình minh họa"
                      style={{
                        maxHeight: 280,
                        maxWidth: '100%',
                        borderRadius: 8,
                        border: '1px solid var(--border-color)'
                      }}
                    />
                  </div>
                )}

                {/* Choices (1, 2, 3, 4) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {activeQuestion.choices?.map((choiceText, cIdx) => {
                    const choiceNum = cIdx + 1;
                    const isSelected = Boolean(activeQuestion?.id && answers[activeQuestion.id] === choiceNum);

                    return (
                      <div
                        key={cIdx}
                        onClick={() => handleSelectAnswer(activeQuestion?.id, choiceNum)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          padding: '14px 18px',
                          borderRadius: 'var(--radius-md)',
                          border: `2px solid ${isSelected ? 'var(--accent-color)' : 'var(--border-color)'}`,
                          background: isSelected ? 'var(--accent-light)' : 'var(--bg-color)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          userSelect: 'none'
                        }}
                      >
                        {/* Choice number pill */}
                        <div style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: isSelected ? 'var(--accent-color)' : 'var(--surface-color)',
                          color: isSelected ? '#ffffff' : 'var(--text-primary)',
                          border: `1px solid ${isSelected ? 'var(--accent-color)' : 'var(--border-color)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: 13,
                          flexShrink: 0
                        }}>
                          {choiceNum}
                        </div>

                        {/* Choice Text */}
                        <div style={{
                          fontSize: 16,
                          fontWeight: isSelected ? 600 : 400,
                          color: 'var(--text-primary)',
                          fontFamily: 'var(--font-jp)',
                          flex: 1
                        }}>
                          {renderTextWithFurigana(choiceText, { keyPrefix: `runner-ch-${cIdx}` })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Question Bottom Navigation */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 32,
            paddingTop: 16,
            borderTop: '1px solid var(--border-color)'
          }}>
            <button
              type="button"
              onClick={handlePrevQuestion}
              disabled={currentQuestionIndex === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-color)',
                border: '1px solid var(--border-color)',
                color: currentQuestionIndex === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
                cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer',
                fontWeight: 600
              }}
            >
              <ArrowLeft size={16} />
              Câu trước
            </button>

            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Phím tắt: bấm 1, 2, 3, 4 để chọn đáp án
            </span>

            <button
              type="button"
              onClick={handleNextQuestion}
              disabled={currentQuestionIndex === sectionQuestions.length - 1}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 'var(--radius-md)',
                background: currentQuestionIndex === sectionQuestions.length - 1 ? 'var(--bg-color)' : 'var(--accent-color)',
                border: 'none',
                color: currentQuestionIndex === sectionQuestions.length - 1 ? 'var(--text-muted)' : '#ffffff',
                cursor: currentQuestionIndex === sectionQuestions.length - 1 ? 'not-allowed' : 'pointer',
                fontWeight: 600
              }}
            >
              Câu tiếp theo
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Right: Answer Matrix Sidebar */}
        <div style={{
          background: 'var(--surface-color)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          padding: '20px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px 0', color: 'var(--text-primary)' }}>
            Phiếu Trả Lời
          </h3>

          {/* Section Summary Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            marginBottom: 16,
            fontSize: 12
          }}>
            <div style={{ background: 'var(--bg-color)', padding: '8px 10px', borderRadius: 6 }}>
              <span style={{ color: 'var(--text-muted)' }}>Đã làm: </span>
              <strong style={{ color: 'var(--accent-color)' }}>{answeredCount} / {sectionQuestions.length}</strong>
            </div>
            <div style={{ background: 'var(--bg-color)', padding: '8px 10px', borderRadius: 6 }}>
              <span style={{ color: 'var(--text-muted)' }}>Đánh dấu: </span>
              <strong style={{ color: 'var(--warning-color)' }}>{flaggedCount}</strong>
            </div>
          </div>

          {/* Question Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 8,
            overflowY: 'auto',
            maxHeight: 'calc(100vh - 340px)',
            paddingRight: 4
          }}>
            {sectionQuestions.map((q, qIdx) => {
              const isCurrent = qIdx === currentQuestionIndex;
              const isAnswered = Boolean(q?.id && answers[q.id] != null);
              const isFlagged = Boolean(q?.id && flagged[q.id]);

              let bg = 'var(--bg-color)';
              let color = 'var(--text-primary)';
              let border = '1px solid var(--border-color)';

              if (isAnswered) {
                bg = 'var(--accent-color)';
                color = '#ffffff';
                border = '1px solid var(--accent-color)';
              }

              if (isFlagged) {
                bg = 'var(--warning-color)';
                color = '#ffffff';
                border = '1px solid var(--warning-color)';
              }

              if (isCurrent) {
                border = '2px solid var(--text-primary)';
              }

              return (
                <button
                  key={q?.id || qIdx}
                  type="button"
                  onClick={() => setCurrentQuestionIndex(qIdx)}
                  style={{
                    height: 38,
                    borderRadius: 'var(--radius-md)',
                    background: bg,
                    color: color,
                    border: border,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease'
                  }}
                  title={`Câu ${q.questionNumber}`}
                >
                  {q.questionNumber}
                </button>
              );
            })}
          </div>

          {/* Quick Legend */}
          <div style={{
            marginTop: 'auto',
            paddingTop: 16,
            borderTop: '1px solid var(--border-color)',
            fontSize: 11,
            color: 'var(--text-muted)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--accent-color)' }} />
              <span>Đã trả lời</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--warning-color)' }} />
              <span>Đánh dấu xem lại</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--bg-color)', border: '1px solid var(--border-color)' }} />
              <span>Chưa làm</span>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }}>
          <div style={{
            background: 'var(--surface-color)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            maxWidth: 480,
            width: '100%',
            padding: 28,
            boxShadow: 'var(--shadow-xl)'
          }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 12px 0', color: 'var(--text-primary)' }}>
              Xác Nhận Nộp Bài Thi
            </h3>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 20px 0' }}>
              Bạn đã trả lời <strong>{Object.keys(answers).length}</strong> câu hỏi. Hệ thống sẽ kết thúc bài thi và tính điểm chi tiết từng phần. Bạn có chắc chắn muốn nộp bài?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                style={{
                  padding: '10px 18px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-color)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Tiếp tục làm bài
              </button>
              <button
                type="button"
                onClick={handleSubmitExam}
                style={{
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--success-color)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Đồng ý nộp bài
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }}>
          <div style={{
            background: 'var(--surface-color)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            maxWidth: 440,
            width: '100%',
            padding: 24,
            boxShadow: 'var(--shadow-xl)'
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 10px 0', color: 'var(--text-primary)' }}>
              Tạm Dừng & Thoát Phòng Thi?
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              Tất cả các câu trả lời và thời gian làm bài của bạn đã được lưu tự động. Bạn có thể quay lại bất cứ lúc nào để tiếp tục làm bài.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-color)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Ở lại phòng thi
              </button>
              <button
                type="button"
                onClick={handleExitExam}
                style={{
                  padding: '8px 18px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-color)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Lưu và thoát
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
