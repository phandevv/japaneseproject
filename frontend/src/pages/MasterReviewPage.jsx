import React, { useState, useEffect, useRef } from 'react';
import { masterReviewApi, srsApi, analyticsApi, vocabApi } from '../services/api';
import { ArrowLeft, BookOpen, Layers, CheckCircle, XCircle, RotateCcw, Calendar, FileQuestion, ListFilter, Keyboard, Send, Volume2, Eye, EyeOff, Sparkles, Trophy } from 'lucide-react';
import MascotLoader from '../components/MascotLoader';
import KanjiDetailModal from '../components/KanjiDetailModal';
import MascotCorners from '../components/MascotCorners';
import SakuraPetals from '../components/SakuraPetals';

// ── Smart Vietnamese Matcher ──────────────────────────────────────────────────
const VIETNAMESE_SYNONYMS = [
  ["tôi", "mình", "ta", "tớ"],
  ["bạn", "cậu", "anh", "chị"],
  ["anh ấy", "cậu ấy", "hắn"],
  ["cô ấy", "nàng"],
  ["vâng", "dạ", "ừ", "có"],
  ["không", "chưa"],
  ["yêu", "thương"],
  ["ghét", "hận"],
  ["ăn", "dùng bữa", "xơi"],
  ["uống", "cạn ly"],
  ["ngủ", "nghỉ ngơi"],
  ["đi", "di chuyển"],
  ["đến", "tới"],
  ["về", "trở về"],
  ["chạy", "chạy bộ"],
  ["bơi", "tắm biển"],
];

const areVietnameseSynonyms = (w1, w2) => {
  const clean1 = w1.trim().toLowerCase().normalize("NFC");
  const clean2 = w2.trim().toLowerCase().normalize("NFC");
  if (clean1 === clean2) return true;
  return VIETNAMESE_SYNONYMS.some(cluster => cluster.includes(clean1) && cluster.includes(clean2));
};

const getLevenshteinDistance = (a, b) => {
  const aNorm = a.normalize("NFC");
  const bNorm = b.normalize("NFC");
  if (aNorm.length === 0) return bNorm.length;
  if (bNorm.length === 0) return aNorm.length;
  const matrix = [];
  for (let i = 0; i <= bNorm.length; i++) matrix[i] = [i];
  for (let j = 0; j <= aNorm.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= bNorm.length; i++) {
    for (let j = 1; j <= aNorm.length; j++) {
      if (bNorm.charAt(i - 1) === aNorm.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
      }
    }
  }
  return matrix[bNorm.length][aNorm.length];
};

const matchVietnameseAnswer = (userInput, correctMeaning) => {
  if (!userInput || !correctMeaning) return false;
  const inputClean = userInput.trim().toLowerCase().normalize("NFC");
  const meaningClean = correctMeaning.trim().toLowerCase().normalize("NFC");
  if (inputClean === meaningClean) return true;

  const delimiters = /[,;\/()]/;
  const correctParts = meaningClean.split(delimiters).map(p => p.trim()).filter(p => p.length > 0);
  if (correctParts.includes(inputClean)) return true;

  for (const part of correctParts) {
    if (areVietnameseSynonyms(inputClean, part)) return true;
  }
  for (const part of correctParts) {
    if (part.length >= 4) {
      if (getLevenshteinDistance(inputClean, part) <= 1) return true;
    }
  }
  return false;
};

const SESSION_STORAGE_KEY = 'nihongo_master_review_session';

/**
 * MasterReviewPage – "Tổng ôn tập" Module
 * Phase 0: Range Selection (Tất cả từ đã học hoặc Theo khoảng thời gian A - B)
 * Phase 1: Minimalist Screening Flashcards (Front: ONLY Kanji/Reading; Back: ONLY Meaning)
 * Phase 2: Forgotten Words Review List & Detail Modal
 * Phase 3: Mandatory Mastery Quiz (> 90% pass rate required to clear session)
 */
const MasterReviewPage = ({ goBack }) => {
  // Phase state: 0: Range Select, 1: Flashcard Screening, 2: Forgotten List, 3: Quiz
  const [phase, setPhase] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Scope selection states
  const [rangeType, setRangeType] = useState('all'); // 'all' or 'range'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Loaded words for screening
  const [allWords, setAllWords] = useState([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Forgotten words collected during screening
  const [forgottenWords, setForgottenWords] = useState([]);

  // Detail Modal state
  const [selectedModalVocab, setSelectedModalVocab] = useState(null);

  // Quiz states (Phase 3)
  const [quizWords, setQuizWords] = useState([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizFormat, setQuizFormat] = useState('choice'); // 'choice' or 'typing'
  const [questionType, setQuestionType] = useState('ja-to-vi'); // 'ja-to-vi' or 'vi-to-ja'
  const [choices, setChoices] = useState([]);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [typingStatus, setTypingStatus] = useState('idle'); // idle, correct, incorrect
  const [quizScore, setQuizScore] = useState(0);
  const [quizMistakes, setQuizMistakes] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [showHiraganaHint, setShowHiraganaHint] = useState(false);
  const inputRef = useRef(null);

  // 1. On Mount: Check for persisted unfinished session
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem(SESSION_STORAGE_KEY);
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed && parsed.forgottenWords && parsed.forgottenWords.length > 0) {
          setForgottenWords(parsed.forgottenWords);
          setRangeType(parsed.rangeType || 'all');
          setStartDate(parsed.startDate || '');
          setEndDate(parsed.endDate || '');
          // If session was saved in quiz or review state, resume at Phase 2 (Forgotten Words List)
          setPhase(2);
        }
      }
    } catch (e) {
      console.error("Failed to restore master review session:", e);
    }
  }, []);

  // Helper to persist current session state
  const persistSession = (fwList, currentRange = rangeType, sDate = startDate, eDate = endDate) => {
    if (!fwList || fwList.length === 0) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } else {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
        forgottenWords: fwList,
        rangeType: currentRange,
        startDate: sDate,
        endDate: eDate,
        updatedAt: new Date().toISOString()
      }));
    }
  };

  // Clear session state
  const clearSession = () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setForgottenWords([]);
    setPhase(0);
  };

  // Audio speech synthesis
  const speakWord = (word) => {
    if (!word) return;
    const text = word.kanji || word.hiragana;
    if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("Speech audio error:", e);
    }
  };

  // ── Step 1: Start Screening ────────────────────────────────────────────────
  const handleStartScreening = async () => {
    setErrorMsg('');
    if (rangeType === 'range') {
      if (!startDate || !endDate) {
        setErrorMsg('Vui lòng chọn khoảng thời gian Từ ngày và Đến ngày!');
        return;
      }
      if (new Date(startDate) > new Date(endDate)) {
        setErrorMsg('Ngày bắt đầu không được lớn hơn ngày kết thúc!');
        return;
      }
    }

    setLoading(true);
    try {
      const data = await masterReviewApi.getWords(
        rangeType === 'range' ? startDate : null,
        rangeType === 'range' ? endDate : null
      );

      if (!data || data.length === 0) {
        setErrorMsg('Không tìm thấy từ vựng nào trong phạm vi này.');
        setLoading(false);
        return;
      }

      const shuffled = [...data].sort(() => Math.random() - 0.5);
      setAllWords(shuffled);
      setCardIndex(0);
      setIsFlipped(false);
      setForgottenWords([]);
      setPhase(1);
    } catch (e) {
      console.error("Error starting master review screening:", e);
      setErrorMsg(e.response?.data?.error || 'Không thể tải danh sách từ vựng.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Minimalist Flashcard Screening Actions ─────────────────────────
  const handleFlashcardRating = (remembered) => {
    const current = allWords[cardIndex];
    if (!current) return;

    let updatedForgotten = [...forgottenWords];
    if (remembered) {
      srsApi.reviewWord(current.id, 3).catch(console.error);
    } else {
      if (!updatedForgotten.some(w => w.id === current.id)) {
        updatedForgotten.push(current);
        setForgottenWords(updatedForgotten);
      }
      srsApi.reviewWord(current.id, 1).catch(console.error);
    }

    // Advance to next card or finish screening
    if (cardIndex + 1 < allWords.length) {
      setCardIndex(cardIndex + 1);
      setIsFlipped(false);
    } else {
      // Screening finished!
      if (updatedForgotten.length === 0) {
        // 100% remembered!
        clearSession();
        setPhase(4); // 100% success phase
      } else {
        persistSession(updatedForgotten);
        setPhase(2); // Show forgotten words list
      }
    }
  };

  // ── Step 3: Start Quiz on Forgotten Words ──────────────────────────────────
  const handleStartQuiz = () => {
    if (forgottenWords.length === 0) return;
    const shuffled = [...forgottenWords].sort(() => Math.random() - 0.5);
    setQuizWords(shuffled);
    setQuizIndex(0);
    setQuizScore(0);
    setQuizMistakes(0);
    setQuizFinished(false);
    setSelectedChoice(null);
    setUserInput('');
    setTypingStatus('idle');
    setPhase(3);
  };

  // Prepare multiple choice options for Phase 3 Quiz
  useEffect(() => {
    if (phase !== 3 || quizWords.length === 0) return;
    const current = quizWords[quizIndex];
    if (!current) return;

    if (quizFormat === 'choice') {
      const others = quizWords.filter((_, i) => i !== quizIndex);
      const shuffledOthers = [...others].sort(() => Math.random() - 0.5).slice(0, 3);
      const allChoices = [...shuffledOthers, current].sort(() => Math.random() - 0.5);
      setChoices(allChoices);
      setSelectedChoice(null);
    } else {
      setUserInput('');
      setTypingStatus('idle');
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 100);
    }
    setShowHiraganaHint(false);
  }, [phase, quizIndex, quizWords, quizFormat]);

  // Quiz Choice Handler
  const handleQuizChoice = (choice) => {
    if (selectedChoice !== null) return;
    setSelectedChoice(choice);
    const current = quizWords[quizIndex];
    const isCorrect = choice.id === current.id;

    if (isCorrect) {
      setQuizScore(s => s + 1);
      srsApi.reviewWord(current.id, 3).catch(console.error);
      analyticsApi.logSession(0, 1, 1).catch(console.error);
      speakWord(current);
    } else {
      setQuizMistakes(m => m + 1);
      srsApi.reviewWord(current.id, 1).catch(console.error);
      analyticsApi.logSession(0, 0, 1).catch(console.error);
    }

    setTimeout(() => {
      advanceQuizNext();
    }, 1200);
  };

  // Quiz Typing Handler
  const handleQuizTypingCheck = (e) => {
    if (e) e.preventDefault();
    if (typingStatus !== 'idle') {
      advanceQuizNext();
      return;
    }
    if (!userInput.trim()) return;

    const current = quizWords[quizIndex];
    const inputClean = userInput.trim().toLowerCase();
    let isCorrect = false;

    if (questionType === 'vi-to-ja') {
      const kanjiClean = current.kanji ? current.kanji.trim().toLowerCase() : '';
      const hiraganaClean = current.hiragana ? current.hiragana.trim().toLowerCase() : '';
      isCorrect = (inputClean === kanjiClean || inputClean === hiraganaClean);
    } else {
      isCorrect = matchVietnameseAnswer(userInput, current.meaning || '');
    }

    if (isCorrect) {
      setTypingStatus('correct');
      setQuizScore(s => s + 1);
      srsApi.reviewWord(current.id, 4).catch(console.error);
      analyticsApi.logSession(0, 1, 1).catch(console.error);
      speakWord(current);
    } else {
      setTypingStatus('incorrect');
      setQuizMistakes(m => m + 1);
      srsApi.reviewWord(current.id, 1).catch(console.error);
      analyticsApi.logSession(0, 0, 1).catch(console.error);
      speakWord(current);
    }
  };

  const advanceQuizNext = () => {
    if (quizIndex + 1 >= quizWords.length) {
      setQuizFinished(true);
    } else {
      setQuizIndex(i => i + 1);
      setSelectedChoice(null);
      setUserInput('');
      setTypingStatus('idle');
    }
  };

  // ── Render Loading ─────────────────────────────────────────────────────────
  if (loading) {
    return <MascotLoader message="Đang rà soát và tải danh sách từ vựng..." />;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PHASE 0: RANGE SELECTION SCREEN
  // ───────────────────────────────────────────────────────────────────────────
  if (phase === 0) {
    return (
      <div className="container animate-fade-in" style={{ padding: '40px 20px', maxWidth: '780px', margin: '0 auto', minHeight: '85vh' }}>
        <MascotCorners rightMascot="mascot_siro_reading.png" />
        <SakuraPetals />

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <button className="btn btn-secondary" onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px' }}>
            <ArrowLeft size={16} /> Quay lại
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={28} color="var(--accent-color)" />
            <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Tổng ôn tập kiến thức</h1>
          </div>
        </div>

        <div className="card" style={{ padding: '36px 32px', borderRadius: '20px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '1.25rem' }}>🎯 Chọn phạm vi tổng ôn</h3>
          <p style={{ color: 'var(--text-secondary)', margin: '0 0 28px', fontSize: '0.95rem', lineHeight: 1.5 }}>
            Tính năng này giúp bạn rà soát nhanh các từ vựng đã học, tự lọc ra các từ chưa thuộc và bắt buộc hoàn thành bài Quiz với kết quả <strong>&gt; 90%</strong>.
          </p>

          {errorMsg && (
            <div style={{ padding: '14px 18px', background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '12px', marginBottom: '24px', fontSize: '0.95rem' }}>
              ⚠️ {errorMsg}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            {/* Option A: All learned words */}
            <label style={{
              display: 'flex', alignItems: 'center', gap: '14px', padding: '18px 20px', borderRadius: '14px',
              border: `2px solid ${rangeType === 'all' ? 'var(--accent-color)' : 'var(--border-color)'}`,
              backgroundColor: rangeType === 'all' ? 'rgba(37,99,235,0.04)' : 'var(--surface-color)',
              cursor: 'pointer', transition: 'all 0.2s ease'
            }}>
              <input
                type="radio"
                name="rangeType"
                value="all"
                checked={rangeType === 'all'}
                onChange={() => setRangeType('all')}
              />
              <div>
                <strong style={{ fontSize: '1.05rem' }}>Tất cả từ vựng đã học</strong>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Rà soát toàn bộ các từ vựng đã từng lưu hoặc ôn luyện trong hệ thống.
                </div>
              </div>
            </label>

            {/* Option B: Date Range A - B */}
            <label style={{
              display: 'flex', flexDirection: 'column', gap: '14px', padding: '18px 20px', borderRadius: '14px',
              border: `2px solid ${rangeType === 'range' ? 'var(--accent-color)' : 'var(--border-color)'}`,
              backgroundColor: rangeType === 'range' ? 'rgba(37,99,235,0.04)' : 'var(--surface-color)',
              cursor: 'pointer', transition: 'all 0.2s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <input
                  type="radio"
                  name="rangeType"
                  value="range"
                  checked={rangeType === 'range'}
                  onChange={() => setRangeType('range')}
                />
                <div>
                  <strong style={{ fontSize: '1.05rem' }}>Theo khoảng thời gian (Từ ngày A đến ngày B)</strong>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Chỉ rà soát các từ vựng đã học/ôn tập trong khoảng thời gian chỉ định.
                  </div>
                </div>
              </div>

              {rangeType === 'range' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingLeft: '32px', flexWrap: 'wrap', marginTop: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Từ ngày:</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Đến ngày:</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
              )}
            </label>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleStartScreening}
            style={{ width: '100%', padding: '16px', fontSize: '1.1rem', fontWeight: 700, borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
          >
            Bắt đầu Rà soát Thẻ Flashcard <Layers size={20} />
          </button>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PHASE 1: MINIMALIST FLASHCARD SCREENING SCREEN
  // ───────────────────────────────────────────────────────────────────────────
  if (phase === 1) {
    const current = allWords[cardIndex];
    return (
      <div className="container animate-fade-in" style={{ padding: '36px 20px', maxWidth: '680px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <button className="btn btn-secondary" onClick={() => setPhase(0)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} /> Thoát rà soát
          </button>
          <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-secondary)' }}>
            Rà soát: {cardIndex + 1} / {allWords.length}
          </span>
          <span style={{ fontSize: '0.9rem', color: '#ef4444', fontWeight: 700 }}>
            Đã quên: {forgottenWords.length} từ
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ height: '8px', background: 'var(--surface-hover)', borderRadius: '4px', marginBottom: '28px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${((cardIndex + 1) / allWords.length) * 100}%`,
            background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
            borderRadius: '4px', transition: 'width 0.3s ease',
          }} />
        </div>

        {/* Minimalist Flashcard */}
        <div
          onClick={() => setIsFlipped(!isFlipped)}
          className="card animate-fade-in"
          style={{
            padding: '60px 32px',
            textAlign: 'center',
            borderRadius: '24px',
            cursor: 'pointer',
            minHeight: '260px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
            border: '2px solid var(--border-color)',
            marginBottom: '32px',
            userSelect: 'none',
            transition: 'transform 0.2s ease',
          }}
        >
          {!isFlipped ? (
            <>
              <p className="jp-text" style={{ fontSize: '3.6rem', margin: '0 0 12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {current.kanji || current.hiragana}
              </p>
              {current.kanji && (
                <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', margin: 0 }}>
                  ({current.hiragana})
                </p>
              )}
              <span style={{ marginTop: '24px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                (Bấm để lật xem nghĩa)
              </span>
            </>
          ) : (
            <>
              <p style={{ fontSize: '2.2rem', margin: '0 0 12px', fontWeight: 700, color: 'var(--accent-color)' }}>
                {current.meaning}
              </p>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                (Mặt sau: Nghĩa từ vựng)
              </span>
            </>
          )}
        </div>

        {/* Action Buttons: Nhớ vs Quên */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
          <button
            onClick={() => handleFlashcardRating(false)}
            style={{
              padding: '20px',
              borderRadius: '16px',
              border: '2px solid #ef4444',
              backgroundColor: 'rgba(239,68,68,0.08)',
              color: '#ef4444',
              fontSize: '1.2rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.2s ease'
            }}
          >
            <XCircle size={24} /> ❌ QUÊN
          </button>
          <button
            onClick={() => handleFlashcardRating(true)}
            style={{
              padding: '20px',
              borderRadius: '16px',
              border: '2px solid #10b981',
              backgroundColor: 'rgba(16,185,129,0.08)',
              color: '#10b981',
              fontSize: '1.2rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.2s ease'
            }}
          >
            <CheckCircle size={24} /> ✓ NHỚ
          </button>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PHASE 2: FORGOTTEN WORDS REVIEW TABLE SCREEN
  // ───────────────────────────────────────────────────────────────────────────
  if (phase === 2) {
    return (
      <div className="container animate-fade-in" style={{ padding: '36px 20px', maxWidth: '920px', margin: '0 auto' }}>
        <MascotCorners rightMascot="mascot_siro_reading.png" />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <button className="btn btn-secondary" onClick={() => setPhase(0)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} /> Chọn lại phạm vi
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <RotateCcw size={24} color="#ef4444" />
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Danh sách từ cần học lại</h2>
          </div>
        </div>

        {/* Warning persistent state notification banner */}
        <div style={{ padding: '16px 20px', backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid #f59e0b', color: '#b45309', borderRadius: '14px', marginBottom: '24px', fontSize: '0.95rem', lineHeight: 1.5 }}>
          ⚠️ <strong>Yêu cầu hoàn thành:</strong> Bạn đã đánh dấu <strong>{forgottenWords.length} từ quên</strong>. Trạng thái này sẽ được bảo toàn cho tới khi bạn hoàn thành bài Quiz kiểm tra đạt kết quả <strong>&gt; 90%</strong>.
        </div>

        {/* Forgotten Words Table */}
        <div className="card" style={{ padding: '24px', borderRadius: '18px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Chi tiết {forgottenWords.length} từ vựng</h3>
            <button className="btn btn-primary" onClick={handleStartQuiz} style={{ padding: '12px 24px', fontSize: '1rem', fontWeight: 700, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileQuestion size={18} /> Bắt đầu Quiz Kiểm tra (&gt; 90%)
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  <th style={{ padding: '12px 16px' }}>#</th>
                  <th style={{ padding: '12px 16px' }}>Từ vựng</th>
                  <th style={{ padding: '12px 16px' }}>Cách đọc</th>
                  <th style={{ padding: '12px 16px' }}>Ý nghĩa</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {forgottenWords.map((word, idx) => (
                  <tr key={word.id || idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{idx + 1}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, fontSize: '1.2rem' }} className="jp-text">
                      {word.kanji || word.hiragana}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }} className="jp-text">
                      {word.hiragana}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 500 }}>
                      {word.meaning}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setSelectedModalVocab(word)}
                        style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                      >
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Kanji Detail Modal popup */}
        {selectedModalVocab && (
          <KanjiDetailModal
            vocab={selectedModalVocab}
            onClose={() => setSelectedModalVocab(null)}
          />
        )}
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PHASE 3: MANDATORY MASTERY QUIZ SCREEN
  // ───────────────────────────────────────────────────────────────────────────
  if (phase === 3) {
    // Finished Quiz Sub-Screen
    if (quizFinished) {
      const accuracy = Math.round((quizScore / quizWords.length) * 100);
      const isPassed = accuracy > 90;

      if (isPassed) {
        // Passed > 90%: Clear session!
        clearSession();
      }

      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '75vh', gap: '24px', textAlign: 'center', padding: '20px' }}>
          <div style={{
            width: '90px', height: '90px', borderRadius: '50%',
            background: isPassed ? 'linear-gradient(135deg, #10b981, #3b82f6)' : 'linear-gradient(135deg, #ef4444, #f59e0b)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
          }}>
            {isPassed ? <Trophy size={46} color="white" /> : <XCircle size={46} color="white" />}
          </div>

          <div>
            <h1 style={{ margin: '0 0 8px', fontSize: '2.2rem' }}>
              {isPassed ? 'Xuất sắc! Đã hoàn thành! 🎉' : 'Chưa đạt chỉ tiêu (&gt; 90%) ⚠️'}
            </h1>
            <p style={{ fontSize: '2.6rem', fontWeight: 800, margin: '0 0 6px', color: isPassed ? '#10b981' : '#ef4444' }}>
              {accuracy}%
            </p>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 12px', fontSize: '1.1rem' }}>
              Đúng {quizScore}/{quizWords.length} câu • Sai {quizMistakes} câu
            </p>
            <p style={{ color: 'var(--text-secondary)', margin: 0, maxWidth: '460px', lineHeight: 1.5 }}>
              {isPassed
                ? 'Chúc mừng bạn! Bạn đã đạt trên 90% và hoàn thành bài Tổng ôn tập này.'
                : 'Bạn cần đạt kết quả > 90% để hoàn thành. Trạng thái các từ chưa thuộc sẽ được giữ nguyên để bạn luyện tiếp.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '14px', marginTop: '12px' }}>
            {isPassed ? (
              <button className="btn btn-primary" onClick={() => setPhase(0)} style={{ padding: '14px 28px', fontSize: '1.05rem' }}>
                Quay về trang chủ Tổng ôn
              </button>
            ) : (
              <>
                <button className="btn btn-secondary" onClick={() => setPhase(2)} style={{ padding: '12px 20px' }}>
                  Xem lại danh sách từ
                </button>
                <button className="btn btn-primary" onClick={handleStartQuiz} style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RotateCcw size={18} /> Thử lại Quiz (&gt; 90%)
                </button>
              </>
            )}
          </div>
        </div>
      );
    }

    const current = quizWords[quizIndex];
    const isJaToVi = questionType === 'ja-to-vi';

    return (
      <div className="container animate-fade-in" style={{ padding: '36px 20px', maxWidth: '840px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <button className="btn btn-secondary" onClick={() => setPhase(2)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} /> Thoát Quiz
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileQuestion size={22} color="var(--accent-color)" />
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Quiz Tổng ôn (Cần đạt &gt; 90%)</span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px', fontSize: '1.05rem' }}>
            <span style={{ color: '#10b981', fontWeight: 700 }}>✓ {quizScore}</span>
            <span style={{ color: '#ef4444', fontWeight: 700 }}>✗ {quizMistakes}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: '8px', background: 'var(--surface-hover)', borderRadius: '4px', marginBottom: '24px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${((quizIndex) / quizWords.length) * 100}%`,
            background: 'linear-gradient(90deg, #10b981, #3b82f6)',
            borderRadius: '4px', transition: 'width 0.3s ease',
          }} />
        </div>

        {/* Format & Direction Toggles */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'var(--surface-hover)', padding: '4px', borderRadius: '24px', gap: '4px' }}>
            <button
              onClick={() => setQuizFormat('choice')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '20px', fontSize: '0.88rem', border: 'none', cursor: 'pointer', fontWeight: 600,
                background: quizFormat === 'choice' ? 'var(--card-bg)' : 'transparent',
                color: quizFormat === 'choice' ? 'var(--accent-color)' : 'var(--text-secondary)',
                boxShadow: quizFormat === 'choice' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <ListFilter size={16} /> Trắc nghiệm
            </button>
            <button
              onClick={() => setQuizFormat('typing')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '20px', fontSize: '0.88rem', border: 'none', cursor: 'pointer', fontWeight: 600,
                background: quizFormat === 'typing' ? 'var(--card-bg)' : 'transparent',
                color: quizFormat === 'typing' ? 'var(--accent-color)' : 'var(--text-secondary)',
                boxShadow: quizFormat === 'typing' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <Keyboard size={16} /> Gõ chữ (Tự luận)
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setQuestionType('ja-to-vi')}
              style={{
                padding: '8px 16px', borderRadius: '20px', fontSize: '0.88rem', border: 'none', cursor: 'pointer', fontWeight: 600,
                background: isJaToVi ? 'var(--accent-color)' : 'var(--surface-hover)',
                color: isJaToVi ? 'white' : 'var(--text-secondary)',
              }}
            >🇯🇵 → 🇻🇳 Nhật → Việt</button>
            <button
              onClick={() => setQuestionType('vi-to-ja')}
              style={{
                padding: '8px 16px', borderRadius: '20px', fontSize: '0.88rem', border: 'none', cursor: 'pointer', fontWeight: 600,
                background: !isJaToVi ? 'var(--accent-color)' : 'var(--surface-hover)',
                color: !isJaToVi ? 'white' : 'var(--text-secondary)',
              }}
            >🇻🇳 → 🇯🇵 Việt → Nhật</button>
          </div>
        </div>

        {/* Question Card */}
        <div className="card" style={{ padding: '40px 28px', textAlign: 'center', marginBottom: '24px', borderRadius: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
              Câu {quizIndex + 1} / {quizWords.length}
            </span>
            <button
              onClick={() => speakWord(current)}
              style={{ background: 'var(--surface-hover)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--accent-color)' }}
            >
              <Volume2 size={18} />
            </button>
          </div>

          {isJaToVi ? (
            <>
              <p className="jp-text" style={{ fontSize: '2.8rem', margin: '0 0 10px', fontWeight: 700 }}>
                {current.kanji || current.hiragana}
              </p>
              {current.kanji && current.hiragana && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span 
                    onClick={() => setShowHiraganaHint(!showHiraganaHint)}
                    style={{ 
                      fontSize: '1.15rem', color: 'var(--text-secondary)',
                      filter: (showHiraganaHint || selectedChoice !== null || typingStatus !== 'idle') ? 'none' : 'blur(6px)',
                      cursor: 'pointer', userSelect: 'none'
                    }}
                  >
                    {current.hiragana}
                  </span>
                  {(selectedChoice === null && typingStatus === 'idle') && (
                    <button onClick={() => setShowHiraganaHint(!showHiraganaHint)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                      {showHiraganaHint ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <p style={{ fontSize: '1.8rem', margin: 0, fontWeight: 600 }}>{current.meaning}</p>
          )}
        </div>

        {/* Format A: Multiple Choice */}
        {quizFormat === 'choice' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {choices.map((choice, i) => {
              const isCorrect = choice.id === current.id;
              const isSelected = selectedChoice?.id === choice.id;
              let bg = 'var(--surface-color)';
              let border = '2px solid var(--border-color)';
              let color = 'var(--text-primary)';

              if (selectedChoice !== null) {
                if (isCorrect) {
                  bg = 'rgba(16,185,129,0.12)';
                  border = '2px solid #10b981';
                  color = '#10b981';
                } else if (isSelected && !isCorrect) {
                  bg = 'rgba(239,68,68,0.12)';
                  border = '2px solid #ef4444';
                  color = '#ef4444';
                } else {
                  color = 'var(--text-muted)';
                }
              }

              return (
                <button
                  key={choice.id || i}
                  onClick={() => handleQuizChoice(choice)}
                  disabled={selectedChoice !== null}
                  style={{
                    padding: '22px 24px', borderRadius: '16px', border, background: bg, color,
                    cursor: selectedChoice ? 'default' : 'pointer', textAlign: 'center', fontSize: isJaToVi ? '1.15rem' : '1.3rem', fontWeight: 600, minHeight: '75px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  {isJaToVi ? choice.meaning : <span className="jp-text">{choice.kanji || choice.hiragana}</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Format B: Typing Quiz */}
        {quizFormat === 'typing' && (
          <form onSubmit={handleQuizTypingCheck} style={{ width: '100%' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={isJaToVi ? "Nhập nghĩa tiếng Việt..." : "Nhập cách đọc Hiragana hoặc Kanji..."}
                disabled={typingStatus !== 'idle'}
                style={{
                  flex: 1, padding: '16px 20px', fontSize: '1.2rem', borderRadius: '14px',
                  border: typingStatus === 'correct' ? '2px solid #10b981' : typingStatus === 'incorrect' ? '2px solid #ef4444' : '2px solid var(--border-color)',
                  backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)', outline: 'none'
                }}
              />
              {typingStatus === 'idle' ? (
                <button type="submit" className="btn btn-primary" disabled={!userInput.trim()} style={{ padding: '0 28px', borderRadius: '14px' }}>
                  Kiểm tra <Send size={18} />
                </button>
              ) : (
                <button type="button" onClick={advanceQuizNext} className="btn btn-primary" style={{ padding: '0 28px', borderRadius: '14px' }}>
                  Tiếp theo →
                </button>
              )}
            </div>

            {typingStatus !== 'idle' && (
              <div className="animate-fade-in" style={{
                padding: '18px 24px', borderRadius: '14px',
                background: typingStatus === 'correct' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                border: typingStatus === 'correct' ? '1px solid #10b981' : '1px solid #ef4444',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div>
                  <h4 style={{ margin: '0 0 4px', color: typingStatus === 'correct' ? '#10b981' : '#ef4444' }}>
                    {typingStatus === 'correct' ? '🎉 Chính xác!' : '❌ Chưa chính xác'}
                  </h4>
                  <p style={{ margin: 0 }}>
                    <strong>Đáp án đúng:</strong> {isJaToVi ? current.meaning : (current.kanji ? `${current.kanji} (${current.hiragana})` : current.hiragana)}
                  </p>
                </div>
                <button type="button" onClick={advanceQuizNext} className="btn btn-secondary">
                  Nhấn Enter để tiếp tục ↵
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PHASE 4: 100% SUCCESS SCREEN (Screened & Remembered 100%)
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '75vh', gap: '24px', textAlign: 'center', padding: '20px' }}>
      <div style={{
        width: '90px', height: '90px', borderRadius: '50%',
        background: 'linear-gradient(135deg, #10b981, #3b82f6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
      }}>
        <Trophy size={46} color="white" />
      </div>
      <div>
        <h1 style={{ margin: '0 0 8px', fontSize: '2.2rem' }}>Tuyệt vời! 100% Nhớ tốt! 🎉</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '1.1rem', maxWidth: '480px', lineHeight: 1.5 }}>
          Bạn đã ghi nhớ hoàn hảo tất cả <strong>{allWords.length} từ vựng</strong> trong phạm vi tổng ôn này mà không bỏ sót từ nào!
        </p>
      </div>
      <button className="btn btn-primary" onClick={() => setPhase(0)} style={{ padding: '14px 32px', fontSize: '1.05rem', borderRadius: '14px' }}>
        Quay lại trang chủ Tổng ôn
      </button>
    </div>
  );
};

export default MasterReviewPage;
