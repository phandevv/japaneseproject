import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  BookOpen, Volume2, Square, Sparkles, Eye, EyeOff, Edit3, 
  RotateCcw, CheckCircle, XCircle, AlertCircle, RefreshCw, 
  Award, Play, Clock, HelpCircle, ChevronDown, ChevronUp, Highlighter
} from 'lucide-react';
import { jlptN3Api } from '../services/api';
import FuriganaText from './FuriganaText';
import JlptN3ReadingEditModal from './JlptN3ReadingEditModal';

const JlptN3ReadingView = ({
  chapter,
  lesson,
  lessonData,
  isAdmin,
  onProgressUpdate
}) => {
  // Reading Data State
  const [reading, setReading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(1);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Passage Controls (Furigana default OFF per Q&A)
  const [showFurigana, setShowFurigana] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showCoverageDetails, setShowCoverageDetails] = useState(false);

  // Audio TTS State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechRate, setSpeechRate] = useState(0.9);
  const synthRef = useRef(null);

  // Admin Modal
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Quiz States
  const [userAnswers, setUserAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizSubmittedResult, setQuizSubmittedResult] = useState(null);

  // Fetch Reading Data
  const fetchReadingData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await jlptN3Api.getReading(chapter, lesson);
      if (data && data.exists) {
        setReading(data);
      } else {
        setReading(null);
      }
    } catch (err) {
      console.error('Error fetching reading comprehension:', err);
      setError('Không thể tải bài đọc hiểu. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadingData();
    // Stop any ongoing speech when switching lessons
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    setUserAnswers({});
    setIsSubmitted(false);
    setQuizSubmittedResult(null);
  }, [chapter, lesson]);

  // Generation Timer
  useEffect(() => {
    let timer;
    if (generating) {
      timer = setInterval(() => {
        setElapsedSeconds(prev => {
          const next = prev + 1;
          if (next >= 35 && generationStep === 1) {
            setGenerationStep(2);
          }
          return next;
        });
      }, 1000);
    } else {
      setElapsedSeconds(0);
      setGenerationStep(1);
    }
    return () => clearInterval(timer);
  }, [generating, generationStep]);

  // Trigger AI Generation (Admin)
  const handleGenerateReading = async () => {
    const confirmMsg = reading?.exists
      ? `Bạn có chắc chắn muốn TẠO LẠI bài đọc hiểu bằng DeepSeek AI cho Chương ${chapter} Bài ${lesson}? Dữ liệu hiện tại sẽ được thay mới.`
      : `Bắt đầu sinh bài đọc hiểu AI (~1500 - 2000 chữ) và 10 câu hỏi trắc nghiệm cho Chương ${chapter} Bài ${lesson}?`;

    if (!window.confirm(confirmMsg)) return;

    setGenerating(true);
    setError('');
    setSuccessMsg('');
    setElapsedSeconds(0);
    setGenerationStep(1);

    try {
      const result = await jlptN3Api.generateReading(chapter, lesson);
      setReading(result);
      setSuccessMsg('Đã tạo thành công bài đọc hiểu AI và 10 câu hỏi trắc nghiệm!');
      setUserAnswers({});
      setIsSubmitted(false);
      setQuizSubmittedResult(null);
    } catch (err) {
      console.error('Lỗi khi sinh bài đọc hiểu:', err);
      setError(err?.response?.data?.error || err.message || 'Lỗi khi gọi AI sinh bài đọc hiểu.');
    } finally {
      setGenerating(false);
    }
  };

  // Text-To-Speech Play/Stop
  const handleToggleSpeech = () => {
    if (!('speechSynthesis' in window)) {
      alert('Trình duyệt của bạn không hỗ trợ tính năng đọc âm thanh (Speech Synthesis).');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!reading || !reading.passage) return;

    // Clean [Kanji|hiragana] -> Kanji for TTS reading
    const cleanText = reading.passage.replace(/\[([^\|\]]+)\|[^\]]+\]/g, '$1');

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ja-JP';
    utterance.rate = speechRate;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      console.warn('Speech error:', e);
      setIsSpeaking(false);
    };

    synthRef.current = utterance;
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Admin Save Modal
  const handleSaveModal = async (updated) => {
    const res = await jlptN3Api.updateReading(chapter, lesson, updated);
    setReading(res);
    setSuccessMsg('Đã cập nhật bài đọc hiểu thành công!');
  };

  // Handle Option Select
  const handleSelectOption = (questionId, option) => {
    if (isSubmitted) return;
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
  };

  // Submit Quiz
  const handleSubmitQuiz = async () => {
    const questions = reading?.questions || [];
    if (questions.length === 0) return;

    const answeredCount = Object.keys(userAnswers).length;
    if (answeredCount < questions.length) {
      const confirmIncomplete = window.confirm(
        `Bạn mới trả lời ${answeredCount}/${questions.length} câu. Bạn có chắc chắn muốn nộp bài ngay bây giờ không?`
      );
      if (!confirmIncomplete) return;
    }

    // Grade locally
    let correctCount = 0;
    questions.forEach(q => {
      const selected = userAnswers[q.id];
      if (selected && q.answer) {
        const selectedLetter = selected.trim().charAt(0).toUpperCase();
        const correctLetter = q.answer.trim().charAt(0).toUpperCase();
        if (selectedLetter === correctLetter || selected.trim() === q.answer.trim()) {
          correctCount++;
        }
      }
    });

    setQuizScore(correctCount);
    setIsSubmitted(true);
    setSubmitting(true);

    try {
      const res = await jlptN3Api.submitReadingQuiz(chapter, lesson, correctCount, questions.length);
      setQuizSubmittedResult(res);
      if (onProgressUpdate) {
        onProgressUpdate(res);
      }
    } catch (err) {
      console.error('Lỗi khi nộp bài đọc hiểu:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Retry Quiz
  const handleRetryQuiz = () => {
    setUserAnswers({});
    setIsSubmitted(false);
    setQuizSubmittedResult(null);
    setQuizScore(0);
  };

  // Calculate target terms for highlighting
  const targetVocabs = useMemo(() => lessonData?.tu_vung || [], [lessonData]);
  const targetGrammars = useMemo(() => lessonData?.ngu_phap || [], [lessonData]);

  // Analyze coverage of lesson's vocabulary (> 50%) and grammar (100%)
  const coverageData = useMemo(() => {
    if (reading?.coverage) {
      return reading.coverage;
    }
    if (!reading?.passage) return null;
    const passage = reading.passage;
    const cleanPassage = passage.replace(/\[([^\|\]]+)\|[^\]]+\]/g, '$1');

    // Grammar Coverage (Target: 100%)
    const totalGrammar = targetGrammars.length;
    const matchedGrammars = [];
    const missingGrammars = [];
    targetGrammars.forEach(g => {
      const struc = (g.cau_truc || '').trim();
      if (!struc) return;
      const normalized = struc.replace(/[〜~\.\…\s]/g, '');
      if (normalized && (cleanPassage.includes(normalized) || passage.includes(struc) || cleanPassage.includes(struc))) {
        matchedGrammars.push(struc);
      } else {
        missingGrammars.push(struc);
      }
    });
    const matchedGrammarCount = matchedGrammars.length;
    const grammarCoveragePercent = totalGrammar > 0 ? Math.round((matchedGrammarCount / totalGrammar) * 1000) / 10 : 100;

    // Vocab Coverage (Target: > 50%)
    const totalVocab = targetVocabs.length;
    const minVocabRequired = totalVocab > 0 ? Math.floor(totalVocab * 0.5) + 1 : 0;
    const matchedVocabs = [];
    const missingVocabs = [];
    targetVocabs.forEach(v => {
      const word = (v.tu || v.kanji || '').trim();
      const reading = (v.furigana || v.hiragana || '').trim();
      const meaning = (v.nghia || v.meaning || '').trim();
      if (!word && !reading) return;

      const matched = (word && (cleanPassage.includes(word) || passage.includes(word))) ||
                      (reading && (cleanPassage.includes(reading) || passage.includes(reading)));
      const item = { word: word || reading, reading, meaning };
      if (matched) {
        matchedVocabs.push(item);
      } else {
        missingVocabs.push(item);
      }
    });
    const matchedVocabCount = matchedVocabs.length;
    const vocabCoveragePercent = totalVocab > 0 ? Math.round((matchedVocabCount / totalVocab) * 1000) / 10 : 100;
    const passedCriteria = grammarCoveragePercent >= 100 && (totalVocab === 0 || matchedVocabCount >= minVocabRequired);

    return {
      totalGrammar,
      matchedGrammarCount,
      grammarCoveragePercent,
      matchedGrammars,
      missingGrammars,
      totalVocab,
      minVocabRequired,
      matchedVocabCount,
      vocabCoveragePercent,
      matchedVocabs,
      missingVocabs,
      passedCriteria
    };
  }, [reading, targetVocabs, targetGrammars]);

  const questionsList = useMemo(() => {
    if (!reading || !Array.isArray(reading.questions)) return [];
    return reading.questions;
  }, [reading]);

  // Overall reading pass status
  const isReadingPassed = lessonData?.readingPassed || quizSubmittedResult?.readingPassed;
  const bestReadingScore = lessonData?.readingScore || quizSubmittedResult?.readingScore || 0;

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <RefreshCw size={36} className="animate-spin" style={{ margin: '0 auto 16px', color: 'var(--accent-color)' }} />
        <p style={{ fontWeight: 600 }}>Đang tải bài đọc hiểu Chương {chapter} Bài {lesson}...</p>
      </div>
    );
  }

  // State: No Reading Data Yet
  if (!reading || !reading.exists) {
    return (
      <div
        className="card animate-fade-in"
        style={{
          padding: '50px 30px',
          textAlign: 'center',
          maxWidth: '800px',
          margin: '30px auto',
          borderRadius: '20px',
          border: '1.5px dashed var(--border-color)',
          backgroundColor: 'var(--surface-color)'
        }}
      >
        <BookOpen size={48} style={{ color: 'var(--accent-color)', margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '10px', color: 'var(--text-primary)' }}>
          Chưa có Bài Đọc Hiểu cho Chương {chapter} - Bài {lesson}
        </h3>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '560px', margin: '0 auto 24px', lineHeight: 1.6 }}>
          Bài đọc hiểu trường văn (~1500 - 2000 chữ) lồng ghép toàn bộ từ vựng và ngữ pháp của bài học cùng 10 câu hỏi phân tích chưa được khởi tạo.
        </p>

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', marginBottom: '20px', fontWeight: 600 }}>
            {error}
          </div>
        )}

        {isAdmin ? (
          <div>
            <button
              onClick={handleGenerateReading}
              disabled={generating}
              style={{
                padding: '16px 32px',
                borderRadius: '14px',
                border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white',
                fontWeight: 800,
                fontSize: '1.05rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
                transition: 'all 0.2s ease'
              }}
            >
              {generating ? (
                <>
                  <RefreshCw size={20} className="animate-spin" />
                  Đang Sinh Bài Đọc Hiểu AI ({elapsedSeconds}s)...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  ⚡ Nạp Bài Đọc Hiểu AI (DeepSeek)
                </>
              )}
            </button>

            {generating && (
              <div style={{ marginTop: '24px', textAlign: 'left', maxWidth: '520px', margin: '24px auto 0', padding: '16px 20px', borderRadius: '12px', background: 'var(--surface-hover)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent-color)' }}>
                    ⏱️ Thời gian đã chạy: {elapsedSeconds} giây (Dự kiến ~60 - 90s)
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Bước {generationStep}/2
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: generationStep >= 1 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {generationStep === 1 ? <RefreshCw size={14} className="animate-spin" style={{ color: 'var(--accent-color)' }} /> : <CheckCircle size={14} style={{ color: '#10b981' }} />}
                    <span>Bước 1: DeepSeek AI đang sáng tác bài văn ~1500-2000 chữ có Furigana...</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: generationStep >= 2 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {generationStep === 2 ? <RefreshCw size={14} className="animate-spin" style={{ color: 'var(--accent-color)' }} /> : <Clock size={14} />}
                    <span>Bước 2: Biên soạn 10 câu trắc nghiệm & phân tích giải thích 100% tiếng Việt...</span>
                  </div>
                </div>
                <p style={{ margin: '12px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  * Vui lòng không đóng trình duyệt trong khi AI đang xử lý.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', background: 'var(--surface-hover)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            <AlertCircle size={16} />
            <span>Vui lòng liên hệ Admin để tạo bài đọc hiểu cho bài học này.</span>
          </div>
        )}
      </div>
    );
  }

  // State: Reading Data Exists -> Render Split View
  return (
    <div className="animate-fade-in" style={{ width: '100%', maxWidth: '1440px', margin: '0 auto', padding: '10px 0' }}>
      
      {/* Alert Banners */}
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', marginBottom: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 700 }}>✕</button>
        </div>
      )}
      {successMsg && (
        <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', marginBottom: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer', fontWeight: 700 }}>✕</button>
        </div>
      )}

      {/* Main Split-View: 2 Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: '24px', alignItems: 'start' }}>

        {/* ══════════════════════════════════════════════════════════════════════
            LEFT COLUMN (55%): READING PASSAGE & CONTROLS
           ══════════════════════════════════════════════════════════════════════ */}
        <div
          className="card"
          style={{
            padding: '28px 32px',
            borderRadius: '20px',
            backgroundColor: 'var(--surface-color)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.1)'
          }}
        >
          {/* Passage Header */}
          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, padding: '4px 10px', borderRadius: '8px', background: 'var(--accent-light, rgba(99,102,241,0.15))', color: 'var(--accent-color, #6366f1)' }}>
                  📖 Trường Văn JLPT N3
                </span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Chương {chapter} Bài {lesson}
                </span>
              </div>

              {/* Status Badge */}
              {isReadingPassed && (
                <span style={{ fontSize: '0.82rem', fontWeight: 700, padding: '4px 12px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle size={14} /> Đã Đạt ({bestReadingScore}/10 câu)
                </span>
              )}
            </div>

            <h2 className="font-jp" style={{ fontSize: '1.45rem', fontWeight: 800, margin: '6px 0 0', color: 'var(--text-primary)', lineHeight: 1.5 }}>
              <FuriganaText text={reading.title} showFurigana={showFurigana} />
            </h2>
          </div>

          {/* Lesson Coverage Banner (100% Grammar, > 50% Vocabulary) */}
          {coverageData && (
            <div style={{
              marginBottom: '18px',
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-secondary)' }}>
                    🎯 Độ Phủ Bài Học:
                  </span>

                  {/* Grammar Badge */}
                  <span style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: coverageData.grammarCoveragePercent >= 100 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: coverageData.grammarCoveragePercent >= 100 ? '#10b981' : '#f59e0b',
                    border: `1px solid ${coverageData.grammarCoveragePercent >= 100 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    <span>Ngữ pháp:</span>
                    <strong>{coverageData.matchedGrammarCount}/{coverageData.totalGrammar} ({coverageData.grammarCoveragePercent}%)</strong>
                    {coverageData.grammarCoveragePercent >= 100 ? '✓ Đủ 100%' : '⚠️ Chưa đủ 100%'}
                  </span>

                  {/* Vocab Badge */}
                  <span style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: coverageData.vocabCoveragePercent >= 50 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: coverageData.vocabCoveragePercent >= 50 ? '#10b981' : '#f59e0b',
                    border: `1px solid ${coverageData.vocabCoveragePercent >= 50 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    <span>Từ vựng:</span>
                    <strong>{coverageData.matchedVocabCount}/{coverageData.totalVocab} ({coverageData.vocabCoveragePercent}%)</strong>
                    {coverageData.vocabCoveragePercent >= 50 ? '✓ Đạt >50%' : '⚠️ Dưới 50%'}
                  </span>
                </div>

                {/* Toggle details button */}
                <button
                  type="button"
                  onClick={() => setShowCoverageDetails(prev => !prev)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--accent-color)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {showCoverageDetails ? 'Thu gọn đối soát' : 'Xem chi tiết đối soát'}
                  {showCoverageDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              {/* Expandable Checklist Details */}
              {showCoverageDetails && (
                <div className="animate-fade-in" style={{
                  marginTop: '6px',
                  paddingTop: '10px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  fontSize: '0.82rem'
                }}>
                  {/* Grammar list */}
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                      Cấu trúc ngữ pháp đã lồng ghép ({coverageData.matchedGrammars?.length || 0}/{coverageData.totalGrammar}):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {coverageData.matchedGrammars?.map((g, idx) => (
                        <span key={idx} style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(14, 165, 233, 0.15)', color: '#0ea5e9', fontWeight: 600 }}>
                          ✓ {g}
                        </span>
                      ))}
                      {coverageData.missingGrammars?.map((g, idx) => (
                        <span key={idx} style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: 600 }}>
                          ✗ {g} (chưa xuất hiện)
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Vocab list */}
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                      Từ vựng đã lồng ghép ({coverageData.matchedVocabs?.length || 0}/{coverageData.totalVocab}):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                      {coverageData.matchedVocabs?.map((v, idx) => (
                        <span key={idx} title={v.meaning} style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', fontWeight: 600, cursor: 'help' }}>
                          ✓ {v.word} {v.reading && `(${v.reading})`}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action & Control Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '22px', padding: '10px 14px', borderRadius: '12px', background: 'var(--surface-hover)' }}>
            
            {/* Left Controls: Furigana Toggle + Highlight Toggle + Audio TTS */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              
              {/* Furigana Single Toggle (Default OFF) */}
              <button
                type="button"
                onClick={() => setShowFurigana(prev => !prev)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '9px',
                  border: showFurigana ? '1.5px solid var(--accent-color)' : '1px solid var(--border-color)',
                  background: showFurigana ? 'var(--accent-light, rgba(99,102,241,0.2))' : 'var(--surface-color)',
                  color: showFurigana ? 'var(--accent-color)' : 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
                title={showFurigana ? "Nhấn để TẮT Furigana" : "Nhấn để BẬT Furigana"}
              >
                <span>文 Furigana:</span>
                <span style={{
                  padding: '1px 6px',
                  borderRadius: '5px',
                  background: showFurigana ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)',
                  color: showFurigana ? 'white' : 'var(--text-muted)',
                  fontSize: '0.72rem',
                  fontWeight: 800
                }}>
                  {showFurigana ? 'BẬT' : 'TẮT'}
                </span>
              </button>

              {/* Target Vocab & Grammar Highlight Toggle */}
              <button
                type="button"
                onClick={() => setShowHighlight(prev => !prev)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '9px',
                  border: showHighlight ? '1.5px solid #f59e0b' : '1px solid var(--border-color)',
                  background: showHighlight ? 'rgba(245, 158, 11, 0.18)' : 'var(--surface-color)',
                  color: showHighlight ? '#d97706' : 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
                title="Bật/Tắt làm nổi bật từ vựng & ngữ pháp trọng tâm của bài trong bài đọc"
              >
                <Highlighter size={15} />
                <span>Highlight:</span>
                <span style={{
                  padding: '1px 6px',
                  borderRadius: '5px',
                  background: showHighlight ? '#f59e0b' : 'rgba(255,255,255,0.1)',
                  color: showHighlight ? 'white' : 'var(--text-muted)',
                  fontSize: '0.72rem',
                  fontWeight: 800
                }}>
                  {showHighlight ? 'BẬT' : 'TẮT'}
                </span>
              </button>

              {/* Text-To-Speech (TTS) Button */}
              <button
                type="button"
                onClick={handleToggleSpeech}
                style={{
                  padding: '7px 14px',
                  borderRadius: '9px',
                  border: isSpeaking ? '1.5px solid #10b981' : '1px solid var(--border-color)',
                  background: isSpeaking ? 'rgba(16, 185, 129, 0.2)' : 'var(--surface-color)',
                  color: isSpeaking ? '#10b981' : 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
                title={isSpeaking ? "Nhấn để dừng đọc" : "Nhấn để nghe AI phát âm tiếng Nhật bài đọc"}
              >
                {isSpeaking ? (
                  <>
                    <Square size={14} fill="#10b981" />
                    <span>Dừng Đọc</span>
                  </>
                ) : (
                  <>
                    <Volume2 size={16} />
                    <span>🔊 Nghe Đọc</span>
                  </>
                )}
              </button>
            </div>

            {/* Right Admin Controls */}
            {isAdmin && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setEditModalOpen(true)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--surface-color)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Chỉnh sửa nội dung bài đọc và bộ câu hỏi"
                >
                  <Edit3 size={14} /> Sửa
                </button>
                <button
                  type="button"
                  onClick={handleGenerateReading}
                  disabled={generating}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--accent-color)',
                    background: 'transparent',
                    color: 'var(--accent-color)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Yêu cầu AI sinh lại bộ đề mới"
                >
                  <RefreshCw size={14} className={generating ? 'animate-spin' : ''} />
                  {generating ? `${elapsedSeconds}s...` : 'Tạo Lại AI'}
                </button>
              </div>
            )}
          </div>

          {/* Highlight Legend (if Highlight ON) */}
          {showHighlight && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <span>Chú giải:</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(245, 158, 11, 0.3)', borderBottom: '2px solid #f59e0b' }}></span>
                <span>Từ vựng mục tiêu (Di chuột để xem nghĩa)</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(14, 165, 233, 0.3)', borderBottom: '2px solid #0ea5e9' }}></span>
                <span>Ngữ pháp mục tiêu</span>
              </span>
            </div>
          )}

          {/* Passage Content */}
          <div
            className="font-jp"
            style={{
              color: 'var(--text-primary)',
              minHeight: '380px',
              fontFamily: '"Noto Serif JP", "Hiragino Mincho ProN", serif',
              letterSpacing: '0.03em'
            }}
          >
            <FuriganaText
              text={reading.passage}
              showFurigana={showFurigana}
              showHighlight={showHighlight}
              targetVocabs={targetVocabs}
              targetGrammars={targetGrammars}
            />
          </div>

          {/* Collapsible Vietnamese Translation */}
          <div style={{ marginTop: '28px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <button
              type="button"
              onClick={() => setShowTranslation(prev => !prev)}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                background: showTranslation ? 'var(--surface-hover)' : 'transparent',
                color: 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {showTranslation ? <EyeOff size={16} /> : <Eye size={16} />}
                <span>{showTranslation ? 'Ẩn bản dịch tiếng Việt' : '👁️ Xem bản dịch tiếng Việt'}</span>
              </div>
              {showTranslation ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showTranslation && (
              <div
                className="animate-fade-in"
                style={{
                  marginTop: '14px',
                  padding: '18px 20px',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem',
                  lineHeight: 1.8
                }}
              >
                {reading.translation ? (
                  reading.translation.split(/\n+/).map((para, idx) => (
                    <p key={idx} style={{ marginBottom: '1em', textIndent: '1em' }}>
                      {para}
                    </p>
                  ))
                ) : (
                  <p style={{ color: 'var(--text-muted)' }}>Chưa có bản dịch cho bài này.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            RIGHT COLUMN (45%): 10 QUESTIONS QUIZ & EXPLANATION
           ══════════════════════════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Quiz Top Status & Summary Card */}
          <div
            className="card"
            style={{
              padding: '20px 24px',
              borderRadius: '18px',
              backgroundColor: 'var(--surface-color)',
              border: '1px solid var(--border-color)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HelpCircle size={20} style={{ color: 'var(--accent-color)' }} />
                  Đề Thi 10 Câu Đọc Hiểu
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Yêu cầu: Đúng từ 8/10 câu trở lên để hoàn thành bài học
                </p>
              </div>

              {/* Badge */}
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  padding: '6px 14px',
                  borderRadius: '10px',
                  background: isReadingPassed ? 'rgba(16, 185, 129, 0.18)' : 'var(--surface-hover)',
                  color: isReadingPassed ? '#10b981' : 'var(--text-secondary)',
                  border: isReadingPassed ? '1px solid #10b981' : '1px solid var(--border-color)'
                }}>
                  {isReadingPassed ? `✓ ĐÃ ĐẠT (${bestReadingScore}/10)` : `Chưa Đạt (${bestReadingScore}/10)`}
                </span>
              </div>
            </div>

            {/* Post-submission Result Banner */}
            {isSubmitted && (
              <div
                className="animate-fade-in"
                style={{
                  marginTop: '16px',
                  padding: '16px 18px',
                  borderRadius: '12px',
                  background: quizScore >= 8 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: `1.5px solid ${quizScore >= 8 ? '#10b981' : '#ef4444'}`,
                  color: quizScore >= 8 ? '#10b981' : '#ef4444'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                      {quizScore >= 8 ? '🎉 XUẤT SẮC! BẠN ĐÃ VƯỢT QUA (PASS)' : '⚠️ CHƯA ĐẠT (CẦN TỐI THIỂU 8/10)'}
                    </h4>
                    <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      Kết quả của bạn: <strong>{quizScore} / {questionsList.length} câu</strong> ({Math.round(quizScore * 100 / (questionsList.length || 1))}%)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRetryQuiz}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '10px',
                      border: 'none',
                      background: quizScore >= 8 ? '#10b981' : '#ef4444',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <RotateCcw size={15} /> Làm Lại Bài Test
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 10 Questions List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {questionsList.map((q, qIdx) => {
              const selectedOpt = userAnswers[q.id];
              const isAnswered = Boolean(selectedOpt);

              let isQuestionCorrect = false;
              if (isSubmitted && selectedOpt && q.answer) {
                const selectedLetter = selectedOpt.trim().charAt(0).toUpperCase();
                const correctLetter = q.answer.trim().charAt(0).toUpperCase();
                isQuestionCorrect = (selectedLetter === correctLetter || selectedOpt.trim() === q.answer.trim());
              }

              return (
                <div
                  key={q.id || qIdx}
                  className="card"
                  style={{
                    padding: '20px 24px',
                    borderRadius: '16px',
                    backgroundColor: 'var(--surface-color)',
                    border: isSubmitted
                      ? isQuestionCorrect
                        ? '1.5px solid #10b981'
                        : '1.5px solid #ef4444'
                      : '1px solid var(--border-color)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Question Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--accent-color)' }}>
                      Câu {qIdx + 1}
                    </span>

                    {/* Result Icon */}
                    {isSubmitted && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        color: isQuestionCorrect ? '#10b981' : '#ef4444'
                      }}>
                        {isQuestionCorrect ? <><CheckCircle size={15} /> Đúng</> : <><XCircle size={15} /> Sai</>}
                      </span>
                    )}
                  </div>

                  {/* Question Title */}
                  <h4
                    className="font-jp"
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      margin: '0 0 16px',
                      color: 'var(--text-primary)',
                      lineHeight: 1.6
                    }}
                  >
                    <FuriganaText text={q.question} showFurigana={showFurigana} />
                  </h4>

                  {/* 4 Options */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(q.options || []).map((opt, oIdx) => {
                      const optLetter = opt.trim().charAt(0).toUpperCase();
                      const isOptionSelected = selectedOpt === opt;
                      const isThisCorrectAnswer = q.answer && (q.answer.trim().startsWith(optLetter) || q.answer.trim() === opt.trim());

                      let optionBorder = '1px solid var(--border-color)';
                      let optionBg = 'var(--surface-color)';
                      let optionColor = 'var(--text-primary)';

                      if (isSubmitted) {
                        if (isThisCorrectAnswer) {
                          optionBorder = '1.5px solid #10b981';
                          optionBg = 'rgba(16, 185, 129, 0.15)';
                          optionColor = '#10b981';
                        } else if (isOptionSelected && !isThisCorrectAnswer) {
                          optionBorder = '1.5px solid #ef4444';
                          optionBg = 'rgba(239, 68, 68, 0.15)';
                          optionColor = '#ef4444';
                        }
                      } else if (isOptionSelected) {
                        optionBorder = '1.5px solid var(--accent-color)';
                        optionBg = 'var(--accent-light, rgba(99,102,241,0.15))';
                        optionColor = 'var(--accent-color)';
                      }

                      return (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() => handleSelectOption(q.id, opt)}
                          disabled={isSubmitted}
                          style={{
                            padding: '12px 16px',
                            borderRadius: '10px',
                            border: optionBorder,
                            background: optionBg,
                            color: optionColor,
                            textAlign: 'left',
                            fontSize: '0.92rem',
                            fontWeight: isOptionSelected || (isSubmitted && isThisCorrectAnswer) ? 700 : 500,
                            cursor: isSubmitted ? 'default' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              border: optionBorder,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              flexShrink: 0
                            }}
                          >
                            {optLetter}
                          </span>
                          <span className="font-jp" style={{ flex: 1 }}>
                            <FuriganaText text={opt.replace(/^[A-D]\.\s*/, '')} showFurigana={showFurigana} />
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation (Shown when submitted) */}
                  {isSubmitted && q.explanation && (
                    <div
                      className="animate-fade-in"
                      style={{
                        marginTop: '16px',
                        padding: '14px 16px',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,0.03)',
                        borderLeft: `3px solid ${isQuestionCorrect ? '#10b981' : '#ef4444'}`,
                        fontSize: '0.88rem',
                        lineHeight: 1.7,
                        color: 'var(--text-primary)'
                      }}
                    >
                      <div style={{ fontWeight: 800, marginBottom: '6px', color: isQuestionCorrect ? '#10b981' : '#ef4444' }}>
                        💡 Phân tích & Dẫn chứng từ bài đọc:
                      </div>
                      {q.explanation.split(/\n+/).map((line, lIdx) => (
                        <div key={lIdx} style={{ marginBottom: '4px' }}>
                          {line}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Submit Quiz Bottom Button */}
          {!isSubmitted && questionsList.length > 0 && (
            <button
              type="button"
              onClick={handleSubmitQuiz}
              disabled={submitting}
              style={{
                padding: '16px',
                borderRadius: '14px',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                fontWeight: 800,
                fontSize: '1.05rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)',
                transition: 'all 0.2s ease',
                marginTop: '10px'
              }}
            >
              <CheckCircle size={20} />
              {submitting ? 'Đang Nộp Bài...' : `Nộp Bài Kiểm Tra (${Object.keys(userAnswers).length}/${questionsList.length} câu)`}
            </button>
          )}

          {isSubmitted && (
            <button
              type="button"
              onClick={handleRetryQuiz}
              style={{
                padding: '16px',
                borderRadius: '14px',
                border: '1px solid var(--border-color)',
                background: 'var(--surface-color)',
                color: 'var(--text-primary)',
                fontWeight: 800,
                fontSize: '1.05rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                marginTop: '10px'
              }}
            >
              <RotateCcw size={20} /> Làm Lại Bài Test
            </button>
          )}
        </div>
      </div>

      {/* Admin Edit Modal */}
      {isAdmin && (
        <JlptN3ReadingEditModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          readingData={reading}
          onSave={handleSaveModal}
        />
      )}
    </div>
  );
};

export default JlptN3ReadingView;
