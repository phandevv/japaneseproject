import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, FileQuestion, CheckCircle, XCircle, Eye, EyeOff, Keyboard, ListFilter, Send, RefreshCw, Volume2 } from 'lucide-react';
import MascotLoader from '../components/MascotLoader';
import { srsApi, studyApi, analyticsApi, vocabApi } from '../services/api';

// ── Smart Vietnamese Synonym Matching Helpers ─────────────────────────────────
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
  return VIETNAMESE_SYNONYMS.some(cluster => 
    cluster.includes(clean1) && cluster.includes(clean2)
  );
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
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
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
  const correctParts = meaningClean.split(delimiters)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  if (correctParts.includes(inputClean)) return true;

  for (const part of correctParts) {
    if (areVietnameseSynonyms(inputClean, part)) return true;
  }

  for (const part of correctParts) {
    if (part.length >= 4) {
      const dist = getLevenshteinDistance(inputClean, part);
      if (dist <= 1) return true;
    }
  }

  return false;
};

/**
 * ReviewQuizPage – Comprehensive Quiz supporting both Multiple Choice (Trắc nghiệm)
 * and Typing Quiz (Gõ chữ) modes for Morning Review & Today's Review.
 */
const ReviewQuizPage = ({ mode = 'default', words: propWords = null, goBack }) => {
  const [loading, setLoading] = useState(true);
  const [words, setWords] = useState([]);
  const [quizIndex, setQuizIndex] = useState(0);
  
  // Format mode: 'choice' (Trắc nghiệm) or 'typing' (Gõ chữ)
  const [quizFormat, setQuizFormat] = useState('choice'); 
  // Direction: 'ja-to-vi' or 'vi-to-ja'
  const [questionType, setQuestionType] = useState('ja-to-vi'); 

  // Multiple Choice state
  const [choices, setChoices] = useState([]);
  const [selectedChoice, setSelectedChoice] = useState(null);

  // Typing state
  const [userInput, setUserInput] = useState('');
  const [typingStatus, setTypingStatus] = useState('idle'); // idle, correct, incorrect
  const inputRef = useRef(null);

  // Stats
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [finished, setFinished] = useState(false);
  const [showHiragana, setShowHiragana] = useState(false);

  // Text-to-speech audio player
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
    } catch (err) {
      console.error("Audio playback error:", err);
    }
  };

  // 1. Fetch Words depending on mode / props
  useEffect(() => {
    const loadWords = async () => {
      setLoading(true);
      try {
        let rawData = [];
        if (propWords && propWords.length > 0) {
          rawData = propWords;
        } else if (mode === 'morning') {
          const resp = await studyApi.getQueue();
          if (resp && resp.queue && resp.queue.length > 0) {
            rawData = resp.queue.map(q => q.vocabulary || q).filter(Boolean);
          } else {
            rawData = await srsApi.getRandomLearnedWords(20);
          }
        } else if (mode === 'today') {
          rawData = await srsApi.getTodayReviewed();
          if (!rawData || rawData.length === 0) {
            rawData = await srsApi.getRandomLearnedWords(20);
          }
        } else {
          rawData = await srsApi.getRandomLearnedWords(20);
        }

        if (!rawData || rawData.length === 0) {
          const fallbackData = await vocabApi.getRandom('N5', 20).catch(() => []);
          rawData = Array.isArray(fallbackData) ? fallbackData : [];
        }

        if (!rawData || rawData.length === 0) {
          setWords([]);
        } else {
          const shuffled = [...rawData].sort(() => Math.random() - 0.5);
          setWords(shuffled);
        }
      } catch (e) {
        console.error('Failed to load words for ReviewQuizPage:', e);
        try {
          const fallbackData = await vocabApi.getRandom('N5', 20).catch(() => []);
          setWords(Array.isArray(fallbackData) ? fallbackData : []);
        } catch {
          setWords([]);
        }
      } finally {
        setLoading(false);
      }
    };
    loadWords();
  }, [mode, propWords]);

  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  // 2. Prepare Choices whenever quizIndex or words change
  useEffect(() => {
    if (words.length === 0) return;
    const current = words[quizIndex];
    if (!current) return;

    setQuestionStartTime(Date.now());

    if (quizFormat === 'choice') {
      const others = words.filter((_, i) => i !== quizIndex);
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
    setShowHiragana(false);
  }, [quizIndex, words, quizFormat]);

  // 3. Handle Multiple Choice selection
  const handleChoiceAnswer = (choice) => {
    if (selectedChoice !== null) return;
    setSelectedChoice(choice);
    const current = words[quizIndex];
    const isCorrect = choice.id === current.id;
    const elapsed = Math.min(30, (Date.now() - questionStartTime) / 1000);
    const quality = isCorrect ? (elapsed <= 3 ? 4 : elapsed <= 8 ? 3 : 2) : 1;

    if (isCorrect) {
      setScore(s => s + 1);
      srsApi.reviewWord(current.id, quality).catch(console.error);
      analyticsApi.logSession(1, 1, 1).catch(console.error);
      speakWord(current);
    } else {
      setMistakes(m => m + 1);
      srsApi.reviewWord(current.id, 1).catch(console.error);
      analyticsApi.logSession(0, 0, 1).catch(console.error);
    }

    setTimeout(() => {
      advanceNext();
    }, 1200);
  };

  // 4. Handle Typing Answer submit
  const handleTypingCheck = (e) => {
    if (e) e.preventDefault();
    if (typingStatus !== 'idle') {
      advanceNext();
      return;
    }

    if (!userInput.trim()) return;

    const current = words[quizIndex];
    const inputClean = userInput.trim().toLowerCase();
    let isCorrect = false;

    if (questionType === 'vi-to-ja') {
      const normInput = inputClean.replace(/[\s\u3000]+/g, '');
      const candidates = [
        current.kanji,
        current.hiragana,
        current.furigana,
        current.tu,
        current.tu_vung,
        current.reading,
        current.doc
      ].filter(Boolean).map(s => String(s).trim().toLowerCase().replace(/[\s\u3000]+/g, ''));

      isCorrect = candidates.some(c => c && normInput === c);
    } else {
      isCorrect = matchVietnameseAnswer(userInput, current.meaning || '');
    }

    const elapsed = Math.min(30, (Date.now() - questionStartTime) / 1000);
    const quality = isCorrect ? (elapsed <= 3 ? 4 : elapsed <= 8 ? 3 : 2) : 1;

    if (isCorrect) {
      setTypingStatus('correct');
      setScore(s => s + 1);
      srsApi.reviewWord(current.id, quality).catch(console.error);
      analyticsApi.logSession(1, 1, 1).catch(console.error);
      speakWord(current);
    } else {
      setTypingStatus('incorrect');
      setMistakes(m => m + 1);
      srsApi.reviewWord(current.id, 1).catch(console.error);
      analyticsApi.logSession(0, 0, 1).catch(console.error);
      speakWord(current);
    }
  };

  const advanceNext = () => {
    if (quizIndex + 1 >= words.length) {
      setFinished(true);
    } else {
      setQuizIndex(i => i + 1);
      setSelectedChoice(null);
      setUserInput('');
      setTypingStatus('idle');
    }
  };

  const restart = () => {
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    setWords(shuffled);
    setQuizIndex(0);
    setScore(0);
    setMistakes(0);
    setSelectedChoice(null);
    setUserInput('');
    setTypingStatus('idle');
    setFinished(false);
    setShowHiragana(false);
  };

  // ── Loading Screen ─────────────────────────────────────────────────────────
  if (loading) {
    return <MascotLoader message="Đang chuẩn bị bộ câu hỏi Quiz..." />;
  }

  // ── Empty Words ────────────────────────────────────────────────────────────
  if (words.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '20px', textAlign: 'center', padding: '20px' }}>
        <FileQuestion size={52} color="var(--text-secondary)" />
        <div>
          <h2 style={{ margin: '0 0 8px' }}>Chưa có câu hỏi</h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0, maxWidth: '420px', lineHeight: 1.5 }}>
            {mode === 'morning'
              ? 'Không có từ vựng nào cần ôn tập buổi sáng hôm nay! Bạn đã hoàn thành xuất sắc.'
              : mode === 'today'
              ? 'Bạn chưa học hoặc ôn tập từ vựng nào trong ngày hôm nay.'
              : 'Bạn cần ít nhất 1 từ vựng đã học để bắt đầu Quiz.'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={goBack}>Quay lại</button>
      </div>
    );
  }

  // ── Finished Screen ────────────────────────────────────────────────────────
  if (finished) {
    const accuracy = Math.round((score / words.length) * 100);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '70vh', gap: '24px', textAlign: 'center', padding: '20px' }}>
        <div style={{
          width: '84px', height: '84px', borderRadius: '50%',
          background: accuracy >= 70 ? 'linear-gradient(135deg, #10b981, #3b82f6)' : 'linear-gradient(135deg, #ef4444, #f59e0b)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
        }}>
          {accuracy >= 70 ? <CheckCircle size={40} color="white" /> : <XCircle size={40} color="white" />}
        </div>
        <div>
          <h1 style={{ margin: '0 0 8px', fontSize: '2rem' }}>Hoàn thành Quiz! 🎉</h1>
          <p style={{ fontSize: '2.4rem', fontWeight: 800, margin: '0 0 6px', color: accuracy >= 70 ? '#10b981' : '#ef4444' }}>
            {accuracy}%
          </p>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '1.05rem' }}>
            Đúng {score}/{words.length} câu • Sai {mistakes} câu
          </p>
        </div>
        <div style={{ display: 'flex', gap: '14px', marginTop: '10px' }}>
          <button className="btn btn-secondary" onClick={goBack} style={{ padding: '12px 24px' }}>Quay lại</button>
          <button className="btn btn-primary" onClick={restart} style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RefreshCw size={18} /> Làm lại Quiz
          </button>
        </div>
      </div>
    );
  }

  // ── Question Active View ───────────────────────────────────────────────────
  const current = words[quizIndex];
  const isJaToVi = questionType === 'ja-to-vi';

  return (
    <div className="container animate-fade-in" style={{ padding: '36px 20px', maxWidth: '840px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button className="btn btn-secondary" onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', fontSize: '0.95rem' }}>
          <ArrowLeft size={16} /> Quay lại
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileQuestion size={22} color="var(--accent-color)" />
          <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>
            {(() => {
              if (mode !== 'morning') {
                return mode === 'today' ? 'Quiz Ôn lại hôm nay' : 'Quiz Luyện tập';
              }
              const hour = new Date().getHours();
              if (hour >= 12 && hour < 18) return 'Quiz Ôn tập buổi chiều';
              if (hour >= 18 || hour < 5) return 'Quiz Ôn tập buổi tối';
              return 'Quiz Ôn tập buổi sáng';
            })()}
          </span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px', fontSize: '1.05rem' }}>
          <span style={{ color: '#10b981', fontWeight: 700 }}>✓ {score}</span>
          <span style={{ color: '#ef4444', fontWeight: 700 }}>✗ {mistakes}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: '8px', background: 'var(--surface-hover)', borderRadius: '4px', marginBottom: '24px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${((quizIndex) / words.length) * 100}%`,
          background: 'linear-gradient(90deg, #10b981, #3b82f6)',
          borderRadius: '4px', transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Toggles: Format (Trắc nghiệm vs Gõ chữ) & Direction (Nhật->Việt vs Việt->Nhật) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {/* Format Selector */}
        <div style={{ display: 'flex', background: 'var(--surface-hover)', padding: '4px', borderRadius: '24px', gap: '4px' }}>
          <button
            onClick={() => setQuizFormat('choice')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '20px', fontSize: '0.88rem', border: 'none', cursor: 'pointer', fontWeight: 600,
              background: quizFormat === 'choice' ? 'var(--card-bg)' : 'transparent',
              color: quizFormat === 'choice' ? 'var(--accent-color)' : 'var(--text-secondary)',
              boxShadow: quizFormat === 'choice' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s ease'
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
              transition: 'all 0.2s ease'
            }}
          >
            <Keyboard size={16} /> Gõ chữ (Tự luận)
          </button>
        </div>

        {/* Direction Selector */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setQuestionType('ja-to-vi')}
            style={{
              padding: '8px 16px', borderRadius: '20px', fontSize: '0.88rem', border: 'none', cursor: 'pointer', fontWeight: 600,
              background: isJaToVi ? 'var(--accent-color)' : 'var(--surface-hover)',
              color: isJaToVi ? 'white' : 'var(--text-secondary)',
              transition: 'all 0.2s ease',
            }}
          >🇯🇵 → 🇻🇳 Nhật → Việt</button>
          <button
            onClick={() => setQuestionType('vi-to-ja')}
            style={{
              padding: '8px 16px', borderRadius: '20px', fontSize: '0.88rem', border: 'none', cursor: 'pointer', fontWeight: 600,
              background: !isJaToVi ? 'var(--accent-color)' : 'var(--surface-hover)',
              color: !isJaToVi ? 'white' : 'var(--text-secondary)',
              transition: 'all 0.2s ease',
            }}
          >🇻🇳 → 🇯🇵 Việt → Nhật</button>
        </div>
      </div>

      {/* Main Question Card */}
      <div className="card" style={{ padding: '40px 28px', textAlign: 'center', marginBottom: '24px', borderRadius: '20px', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
            Câu {quizIndex + 1} / {words.length}
          </span>
          <button
            onClick={() => speakWord(current)}
            style={{ background: 'var(--surface-hover)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--accent-color)' }}
            title="Nghe phát âm"
          >
            <Volume2 size={18} />
          </button>
        </div>

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
                    fontSize: '1.15rem',
                    color: 'var(--text-secondary)',
                    filter: (showHiragana || selectedChoice !== null || typingStatus !== 'idle') ? 'none' : 'blur(6px)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'filter 0.25s ease',
                  }}
                  title={(showHiragana || selectedChoice !== null || typingStatus !== 'idle') ? '' : 'Bấm để xem cách đọc'}
                >
                  {current.hiragana}
                </span>
                {(selectedChoice === null && typingStatus === 'idle') && (
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
          <p style={{ fontSize: '1.8rem', margin: 0, fontWeight: 600, lineHeight: 1.4, color: 'var(--text-primary)' }}>
            {current.meaning || current.nghia || current.y_nghia || current.nghia_tieng_viet || (current.hanViet ? `【${current.hanViet}】` : '') || 'Gợi ý nghĩa Tiếng Việt'}
          </p>
        )}
      </div>

      {/* Mode A: Multiple Choice Grid */}
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
                bg = 'var(--surface-color)';
                border = '2px solid var(--border-color)';
                color = 'var(--text-muted)';
              }
            }

            return (
              <button
                key={choice.id || i}
                onClick={() => handleChoiceAnswer(choice)}
                disabled={selectedChoice !== null}
                style={{
                  padding: '22px 24px',
                  borderRadius: '16px',
                  border,
                  background: bg,
                  color,
                  cursor: selectedChoice ? 'default' : 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                  fontSize: isJaToVi ? '1.15rem' : '1.3rem',
                  fontWeight: 600,
                  minHeight: '75px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                }}
              >
                {isJaToVi ? choice.meaning : <span className="jp-text">{choice.kanji || choice.hiragana}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Mode B: Typing Input Form */}
      {quizFormat === 'typing' && (
        <form onSubmit={handleTypingCheck} style={{ width: '100%' }}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={isJaToVi ? "Nhập nghĩa tiếng Việt..." : "Nhập cách đọc Hiragana hoặc Kanji..."}
              disabled={typingStatus !== 'idle'}
              style={{
                flex: 1,
                padding: '16px 20px',
                fontSize: '1.2rem',
                borderRadius: '14px',
                border: typingStatus === 'correct' ? '2px solid #10b981' : typingStatus === 'incorrect' ? '2px solid #ef4444' : '2px solid var(--border-color)',
                backgroundColor: 'var(--surface-color)',
                color: 'var(--text-primary)',
                outline: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                transition: 'all 0.2s ease'
              }}
            />
            {typingStatus === 'idle' ? (
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!userInput.trim()}
                style={{ padding: '0 28px', fontSize: '1.05rem', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                Kiểm tra <Send size={18} />
              </button>
            ) : (
              <button
                type="button"
                onClick={advanceNext}
                className="btn btn-primary"
                style={{ padding: '0 28px', fontSize: '1.05rem', borderRadius: '14px' }}
              >
                Tiếp theo →
              </button>
            )}
          </div>

          {/* Typing Feedback Banner */}
          {typingStatus !== 'idle' && (
            <div className="animate-fade-in" style={{
              padding: '18px 24px',
              borderRadius: '14px',
              background: typingStatus === 'correct' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              border: typingStatus === 'correct' ? '1px solid #10b981' : '1px solid #ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px'
            }}>
              <div>
                <h4 style={{ margin: '0 0 4px', color: typingStatus === 'correct' ? '#10b981' : '#ef4444', fontSize: '1.1rem' }}>
                  {typingStatus === 'correct' ? '🎉 Chính xác!' : '❌ Chưa chính xác'}
                </h4>
                <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem' }}>
                  <strong>Đáp án đúng:</strong> {isJaToVi ? current.meaning : (current.kanji ? `${current.kanji} (${current.hiragana})` : current.hiragana)}
                </p>
              </div>
              <button
                type="button"
                onClick={advanceNext}
                className="btn btn-secondary"
                style={{ whiteSpace: 'nowrap' }}
              >
                Nhấn Enter để tiếp tục ↵
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );
};

export default ReviewQuizPage;
