import React, { useState, useEffect } from 'react';
import { vocabApi, userSettingsApi } from '../services/api';
import { CornerUpLeft, BookOpen, CheckCircle, XCircle, ArrowRight, Loader, Play, ChevronRight, Settings, Download, Volume2, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import KanjiDetailModal from '../components/KanjiDetailModal';
import * as XLSX from 'xlsx';

const DailyStudyPage = ({ level, stats, goBack }) => {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  
  const [phase, setPhase] = useState(0); // 0: Settings, 1: Select Day, 2: Review Table, 3: Quiz, 4: Quiz Config
  const [wordsPerDay, setWordsPerDay] = useState(20);
  const [customInput, setCustomInput] = useState('');
  const [loadingSetting, setLoadingSetting] = useState(true);

  const [selectedDay, setSelectedDay] = useState(1);
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hideMeanings, setHideMeanings] = useState(false);

  // Modal state
  const [modalIndex, setModalIndex] = useState(null); // null = closed, number = open at that index

  // Quiz config & running states
  const [quizWords, setQuizWords] = useState([]);
  const [originalQuizLength, setOriginalQuizLength] = useState(0);
  const [failedWordIds, setFailedWordIds] = useState(new Set());
  
  const [quizIndex, setQuizIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [quizStatus, setQuizStatus] = useState('idle'); // idle, correct, incorrect, finished
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState([]);

  // Quiz setup form states
  const [quizOptType, setQuizOptType] = useState('all'); // all, random, range
  const [quizOptRandomCount, setQuizOptRandomCount] = useState('10');
  const [quizOptRangeStart, setQuizOptRangeStart] = useState('1');
  const [quizOptRangeEnd, setQuizOptRangeEnd] = useState('10');
  const [quizSetupError, setQuizSetupError] = useState('');

  // Shuffle helper function (Fisher-Yates)
  const shuffleArray = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Text-To-Speech Pronunciation utility
  const speakWord = (word) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const textToSpeak = word?.hiragana || word?.kanji || '';
    if (!textToSpeak) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.95;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  };

  // Load configuration from backend (if logged in) or localStorage (guest)
  useEffect(() => {
    const loadSettings = async () => {
      setLoadingSetting(true);
      try {
        if (isAuthenticated) {
          const setting = await userSettingsApi.getSetting(level);
          if (setting && setting.wordsPerDay) {
            setWordsPerDay(setting.wordsPerDay);
            setPhase(1);
          } else {
            setPhase(0);
          }
        } else {
          const savedWpd = localStorage.getItem(`wordsPerDay_${level}`) || localStorage.getItem('wordsPerDay');
          if (savedWpd) {
            setWordsPerDay(parseInt(savedWpd, 10));
            setPhase(1);
          } else {
            setPhase(0);
          }
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
        setPhase(0);
      } finally {
        setLoadingSetting(false);
      }
    };
    loadSettings();
  }, [level, isAuthenticated]);

  // Calculate total days for this level
  const totalWords = stats?.levels?.[level] || 0;
  // Use Math.floor to merge remainder into the last day
  const totalDays = Math.max(1, Math.floor(totalWords / wordsPerDay));

  const getWordCountForDay = (day) => {
    if (day === totalDays) {
      return Math.max(0, totalWords - ((totalDays - 1) * wordsPerDay));
    }
    return wordsPerDay;
  };

  const fetchWordsForDay = async (day) => {
    setLoading(true);
    try {
      if (day === totalDays && totalWords > totalDays * wordsPerDay) {
        // Last day and there is a remainder -> fetch current page and all remaining pages
        let currentDayPage = day - 1;
        let allWords = [];
        
        while (true) {
          const data = await vocabApi.getByLevelPaginated(level, currentDayPage, wordsPerDay);
          if (!data || !data.content || data.content.length === 0) break;
          allWords = [...allWords, ...data.content];
          if (data.last) break;
          currentDayPage++;
        }
        setWords(allWords);
      } else {
        const data = await vocabApi.getByLevelPaginated(level, day - 1, wordsPerDay);
        setWords(data.content || []);
      }
      setSelectedDay(day);
      setPhase(2);
    } catch (error) {
      console.error("Failed to fetch words for day", error);
    } finally {
      setLoading(false);
    }
  };

  const openQuizSetup = () => {
    setPhase(4);
    setQuizSetupError('');
    setQuizOptRandomCount(Math.min(10, words.length).toString());
    setQuizOptRangeStart('1');
    setQuizOptRangeEnd(Math.min(10, words.length).toString());
  };

  const handleConfirmStartQuiz = () => {
    setQuizSetupError('');
    let selected = [];

    if (quizOptType === 'all') {
      selected = [...words];
    } else if (quizOptType === 'random') {
      const count = parseInt(quizOptRandomCount, 10);
      if (isNaN(count) || count <= 0 || count > words.length) {
        setQuizSetupError(t.daily.quizInvalidRandomCount(words.length));
        return;
      }
      const shuffledAll = shuffleArray(words);
      selected = shuffledAll.slice(0, count);
    } else if (quizOptType === 'range') {
      const start = parseInt(quizOptRangeStart, 10);
      const end = parseInt(quizOptRangeEnd, 10);
      if (isNaN(start) || isNaN(end) || start <= 0 || end > words.length || start > end) {
        setQuizSetupError(t.daily.quizInvalidRange(words.length));
        return;
      }
      selected = words.slice(start - 1, end);
    }

    const shuffledSelected = shuffleArray(selected);
    
    setQuizWords(shuffledSelected);
    setOriginalQuizLength(shuffledSelected.length);
    setFailedWordIds(new Set());
    setQuizIndex(0);
    setScore(0);
    setUserInput('');
    setQuizStatus('idle');
    setMistakes([]);
    
    setPhase(3);
  };

  const checkAnswer = (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const currentWord = quizWords[quizIndex];
    const inputClean = userInput.trim().toLowerCase();
    const kanjiClean = currentWord.kanji ? currentWord.kanji.trim().toLowerCase() : '';
    const hiraganaClean = currentWord.hiragana ? currentWord.hiragana.trim().toLowerCase() : '';

    if (inputClean === kanjiClean || inputClean === hiraganaClean) {
      setQuizStatus('correct');
      if (!failedWordIds.has(currentWord.id)) {
        setScore(s => s + 1);
      }
      speakWord(currentWord);
    } else {
      setQuizStatus('incorrect');
      setFailedWordIds(prev => {
        const next = new Set(prev);
        next.add(currentWord.id);
        return next;
      });
      setMistakes(prev => {
        if (prev.some(m => m.id === currentWord.id)) return prev;
        return [...prev, currentWord];
      });

      const remainingCount = quizWords.length - (quizIndex + 1);
      let insertIndex;
      if (remainingCount <= 0) {
        insertIndex = quizIndex + 1;
      } else {
        const offset = Math.floor(Math.random() * (remainingCount + 1));
        insertIndex = quizIndex + 1 + offset;
      }
      const updated = [...quizWords];
      updated.splice(insertIndex, 0, currentWord);
      setQuizWords(updated);
      speakWord(currentWord);
    }
  };

  const nextQuestion = () => {
    if (quizIndex < quizWords.length - 1) {
      setQuizIndex(quizIndex + 1);
      setUserInput('');
      setQuizStatus('idle');
    } else {
      setQuizStatus('finished');
    }
  };

  const handleSaveSettings = async (value) => {
    const val = parseInt(value, 10);
    if (!val || val <= 0) return;
    
    setLoading(true);
    try {
      if (isAuthenticated) {
        await userSettingsApi.saveSetting(level, val);
      } else {
        localStorage.setItem(`wordsPerDay_${level}`, val.toString());
        localStorage.setItem('wordsPerDay', val.toString());
      }
      setWordsPerDay(val);
      setPhase(1);
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderRightPanel = () => {
    // Phase 2: Show Quiz Welcome Panel
    if (phase === 2) {
      return (
        <div className="card animate-fade-in" style={{ padding: '30px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <div className="flex-center" style={{ width: '50px', height: '50px', borderRadius: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-color)', margin: '0 auto 15px' }}>
            <Play size={24} />
          </div>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>{t.daily.startQuiz}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px', lineHeight: '1.5' }}>
            Bạn đã sẵn sàng kiểm tra trí nhớ? Nhấp vào nút bên dưới để chọn cấu hình bài Quiz cho ngày hôm nay.
          </p>
          <button className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: '0.95rem' }} onClick={openQuizSetup}>
            Bắt đầu Kiểm tra
          </button>
        </div>
      );
    }

    // Phase 4: Show Quiz Setup Panel
    if (phase === 4) {
      return (
        <div className="card animate-fade-in" style={{ padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '15px', textAlign: 'center' }}>{t.daily.quizSetupTitle}</h3>
          
          {quizSetupError && (
            <div style={{ 
              backgroundColor: 'rgba(239, 68, 68, 0.1)', 
              color: 'var(--accent-color)', 
              padding: '10px', 
              borderRadius: '8px', 
              marginBottom: '15px', 
              fontSize: '0.85rem',
              fontWeight: 500
            }}>
              {quizSetupError}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'start', 
              gap: '10px', 
              padding: '12px', 
              borderRadius: '8px', 
              border: `1px solid ${quizOptType === 'all' ? 'var(--accent-color)' : 'var(--border-color)'}`,
              backgroundColor: quizOptType === 'all' ? 'rgba(239,68,68,0.02)' : 'transparent',
              cursor: 'pointer'
            }}>
              <input 
                type="radio" 
                name="quizOptType" 
                value="all" 
                checked={quizOptType === 'all'} 
                onChange={() => setQuizOptType('all')} 
                style={{ marginTop: '4px' }}
              />
              <div>
                <strong style={{ fontSize: '0.9rem' }}>{t.daily.quizOptAll}</strong>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {t.daily.quizOptAllDesc(words.length)}
                </div>
              </div>
            </label>

            <label style={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: '8px', 
              padding: '12px', 
              borderRadius: '8px', 
              border: `1px solid ${quizOptType === 'random' ? 'var(--accent-color)' : 'var(--border-color)'}`,
              backgroundColor: quizOptType === 'random' ? 'rgba(239,68,68,0.02)' : 'transparent',
              cursor: 'pointer'
            }}>
              <div style={{ display: 'flex', alignItems: 'start', gap: '10px' }}>
                <input 
                  type="radio" 
                  name="quizOptType" 
                  value="random" 
                  checked={quizOptType === 'random'} 
                  onChange={() => setQuizOptType('random')} 
                  style={{ marginTop: '4px' }}
                />
                <div>
                  <strong style={{ fontSize: '0.9rem' }}>{t.daily.quizOptRandom}</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {t.daily.quizOptRandomDesc}
                  </div>
                </div>
              </div>
              {quizOptType === 'random' && (
                <div style={{ paddingLeft: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="number" 
                    min="1" 
                    max={words.length}
                    value={quizOptRandomCount}
                    onChange={(e) => setQuizOptRandomCount(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--surface-color)',
                      color: 'var(--text-primary)',
                      width: '70px',
                      fontSize: '0.85rem'
                    }}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    từ {t.daily.quizRangeMax(words.length)}
                  </span>
                </div>
              )}
            </label>

            <label style={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: '8px', 
              padding: '12px', 
              borderRadius: '8px', 
              border: `1px solid ${quizOptType === 'range' ? 'var(--accent-color)' : 'var(--border-color)'}`,
              backgroundColor: quizOptType === 'range' ? 'rgba(239,68,68,0.02)' : 'transparent',
              cursor: 'pointer'
            }}>
              <div style={{ display: 'flex', alignItems: 'start', gap: '10px' }}>
                <input 
                  type="radio" 
                  name="quizOptType" 
                  value="range" 
                  checked={quizOptType === 'range'} 
                  onChange={() => setQuizOptType('range')} 
                  style={{ marginTop: '4px' }}
                />
                <div>
                  <strong style={{ fontSize: '0.9rem' }}>{t.daily.quizOptRange}</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {t.daily.quizOptRangeDesc}
                  </div>
                </div>
              </div>
              {quizOptType === 'range' && (
                <div style={{ paddingLeft: '24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                  <span>{t.daily.quizRangeFrom}</span>
                  <input 
                    type="number" 
                    min="1" 
                    value={quizOptRangeStart}
                    onChange={(e) => setQuizOptRangeStart(e.target.value)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--surface-color)',
                      color: 'var(--text-primary)',
                      width: '60px'
                    }}
                  />
                  <span>{t.daily.quizRangeTo}</span>
                  <input 
                    type="number" 
                    min="1" 
                    value={quizOptRangeEnd}
                    onChange={(e) => setQuizOptRangeEnd(e.target.value)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--surface-color)',
                      color: 'var(--text-primary)',
                      width: '60px'
                    }}
                  />
                </div>
              )}
            </label>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="btn btn-secondary" 
              style={{ flex: 1, padding: '10px' }} 
              onClick={() => setPhase(2)}
            >
              Hủy
            </button>
            <button 
              className="btn btn-primary" 
              style={{ flex: 2, padding: '10px' }} 
              onClick={handleConfirmStartQuiz}
            >
              {t.daily.quizStartBtn}
            </button>
          </div>
        </div>
      );
    }

    // Phase 3: Show Active Quiz Panel
    if (phase === 3) {
      if (quizStatus === 'finished') {
        return (
          <div className="card animate-fade-in" style={{ padding: '30px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontSize: '1.2rem', color: score === originalQuizLength ? 'var(--success-color)' : 'var(--text-primary)', marginBottom: '15px' }}>
              {t.daily.quizDone}
            </h3>
            
            <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--accent-color)', marginBottom: '10px' }}>
              {score} <span style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>/ {originalQuizLength}</span>
            </div>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '25px' }}>
              {score === originalQuizLength ? t.daily.perfectMsg : t.daily.goodMsg}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button className="btn btn-primary" style={{ width: '100%', padding: '10px' }} onClick={() => setPhase(2)}>
                Thoát bài kiểm tra
              </button>
              <button className="btn btn-secondary" style={{ width: '100%', padding: '10px' }} onClick={openQuizSetup}>
                Làm lại Quiz mới
              </button>
            </div>
          </div>
        );
      }

      const currentWord = quizWords[quizIndex];

      return (
        <div className="card animate-fade-in" style={{ padding: '25px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Progress Header */}
          <div className="flex-between" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <span>{t.daily.question} {quizIndex + 1} / {quizWords.length}</span>
            <span>{t.daily.score}: {score}</span>
          </div>

          <div className="progress-bg" style={{ height: '6px' }}>
            <div className="progress-fill" style={{ width: `${((quizIndex) / quizWords.length) * 100}%` }}></div>
          </div>

          {/* Question Card */}
          <div style={{ textAlign: 'center', padding: '20px 10px', backgroundColor: 'var(--surface-hover)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '8px' }}>{t.daily.quizPrompt}</p>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '8px', color: 'var(--text-primary)', wordBreak: 'break-word' }}>
              {currentWord.meaning}
            </h2>
            {currentWord.hanViet && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>【{currentWord.hanViet}】</p>
            )}
          </div>

          {/* Input Form or Feedback */}
          {quizStatus === 'idle' && (
            <form onSubmit={checkAnswer} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                autoFocus
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={t.daily.inputPlaceholder}
                className="jp-text"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--surface-color)',
                  color: 'var(--text-primary)',
                  fontSize: '1.1rem',
                }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '12px', fontSize: '0.95rem' }}>
                {t.daily.checkBtn}
              </button>
            </form>
          )}

          {quizStatus === 'correct' && (
            <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', borderColor: 'var(--success-color)', border: '1px solid var(--success-color)', borderRadius: '10px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="flex-center" style={{ gap: '10px', justifyContent: 'flex-start' }}>
                <CheckCircle size={24} color="var(--success-color)" />
                <h4 style={{ color: 'var(--success-color)', margin: 0 }}>{t.daily.correct}</h4>
              </div>
              <p className="jp-text" style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                {currentWord.kanji && <span>{currentWord.kanji} </span>}
                <span style={{ color: 'var(--text-secondary)' }}>({currentWord.hiragana})</span>
                <button 
                  type="button" 
                  onClick={() => speakWord(currentWord)} 
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                >
                  <Volume2 size={16} />
                </button>
              </p>
              <button className="btn btn-primary" onClick={nextQuestion} autoFocus style={{ padding: '10px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                {t.daily.nextBtn} <ArrowRight size={16} />
              </button>
            </div>
          )}

          {quizStatus === 'incorrect' && (
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'var(--accent-color)', border: '1px solid var(--accent-color)', borderRadius: '10px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="flex-center" style={{ gap: '10px', justifyContent: 'flex-start' }}>
                <XCircle size={24} color="var(--accent-color)" />
                <h4 style={{ color: 'var(--accent-color)', margin: 0 }}>{t.daily.incorrect}</h4>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t.daily.correctAnswerIs}</p>
                <p className="jp-text" style={{ fontSize: '1.1rem', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {currentWord.kanji && <span style={{ color: 'var(--success-color)' }}>{currentWord.kanji} </span>}
                  <span style={{ color: 'var(--success-color)' }}>({currentWord.hiragana})</span>
                  <button 
                    type="button" 
                    onClick={() => speakWord(currentWord)} 
                    style={{ background: 'none', border: 'none', color: 'var(--success-color)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                  >
                    <Volume2 size={16} />
                  </button>
                </p>
              </div>
              <button className="btn btn-primary" onClick={nextQuestion} autoFocus style={{ padding: '10px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                {t.daily.continueBtn} <ArrowRight size={16} />
              </button>
            </div>
          )}

        </div>
      );
    }

    return null;
  };

  if (loadingSetting) {
    return (
      <div className="flex-center" style={{ height: '70vh', flexDirection: 'column', gap: '20px' }}>
        <Loader size={40} className="animate-spin" style={{ color: 'var(--accent-color)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading settings...</p>
      </div>
    );
  }

  // Phase 0: Settings
  if (phase === 0) {
    return (
      <div className="container animate-fade-in" style={{ padding: '20px', maxWidth: '600px', margin: '40px auto' }}>
        <button className="btn btn-secondary" onClick={goBack} style={{ marginBottom: '20px' }}>
          <CornerUpLeft size={18} /> {t.daily.backDashboard}
        </button>
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '10px' }}>{t.daily.settingsTitle}</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>{t.daily.wordsPerDayPrompt}</p>
          
          <div className="flex-center" style={{ gap: '15px', flexWrap: 'wrap', marginBottom: '25px' }}>
            {[10, 20, 30, 50].map(num => (
              <button 
                key={num}
                className="btn"
                style={{ 
                  backgroundColor: wordsPerDay === num ? 'var(--accent-color)' : 'var(--surface-hover)',
                  color: wordsPerDay === num ? 'white' : 'var(--text-primary)',
                  fontSize: '1.2rem',
                  padding: '12px 24px'
                }}
                onClick={() => setWordsPerDay(num)}
              >
                {num}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'center' }}>
            <input 
              type="number"
              placeholder={t.daily.customAmount}
              value={customInput}
              onChange={(e) => {
                setCustomInput(e.target.value);
                const val = parseInt(e.target.value, 10);
                if (val > 0) setWordsPerDay(val);
              }}
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--surface-color)',
                color: 'var(--text-primary)',
                width: '200px',
                textAlign: 'center'
              }}
            />
          </div>

          <button 
            className="btn btn-primary" 
            style={{ padding: '14px 40px', fontSize: '1.1rem', width: '100%' }}
            onClick={() => handleSaveSettings(wordsPerDay)}
          >
            {t.daily.saveSettings}
          </button>
        </div>
      </div>
    );
  }

  // Phase 1: Select Day
  if (phase === 1) {
    return (
      <div className="container animate-fade-in" style={{ padding: '20px', maxWidth: '1000px' }}>
        <div className="flex-between" style={{ marginBottom: '30px' }}>
          <button className="btn btn-secondary" onClick={goBack}>
            <CornerUpLeft size={18} /> {t.daily.backDashboard}
          </button>
          <h2>{t.daily.dailyStudy} - <span style={{ color: 'var(--accent-color)' }}>{level}</span></h2>
          <button className="btn btn-secondary" onClick={() => setPhase(0)}>
            <Settings size={18} /> {t.daily.changeSettings}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <p style={{ color: 'var(--text-secondary)' }}>
            {t.daily.levelInfo(totalWords, totalDays, wordsPerDay)}
          </p>
        </div>

        <div className="grid grid-cols-4" style={{ gap: '15px' }}>
          {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => (
            <button
              key={day}
              className="card flex-center"
              style={{ padding: '20px', cursor: 'pointer', flexDirection: 'column', gap: '10px' }}
              onClick={() => fetchWordsForDay(day)}
            >
              <h3 style={{ fontSize: '1.2rem' }}>{t.daily.day} {day}</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t.daily.wordsPerDay(getWordCountForDay(day))}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Phase >= 2: Unified Review Table and Sticky Quiz Column Layout
  if (phase >= 2) {
    return (
      <div className="container animate-fade-in" style={{ padding: '20px', maxWidth: '1200px' }}>
        {/* Header toolbar */}
        <div className="flex-between" style={{ marginBottom: '25px', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px' }}>
          <button className="btn btn-secondary" onClick={() => setPhase(1)}>
            <CornerUpLeft size={18} /> {t.daily.chooseAnotherDay}
          </button>
          <h2>{t.daily.day} {selectedDay} - {t.daily.studyReview}</h2>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => {
                const exportData = words.map((w, index) => ({
                  'No.': index + 1,
                  'Kanji': w.kanji || '',
                  'Hiragana': w.hiragana || '',
                  'Nghĩa tiếng Việt (Meaning)': w.meaning || '',
                  'Hán Việt': w.hanViet || '',
                  'Level': w.level || level
                }));
                const ws = XLSX.utils.json_to_sheet(exportData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, `Day ${selectedDay}`);
                XLSX.writeFile(wb, `Vocabulary_${level}_Day_${selectedDay}.xlsx`);
              }}
            >
              <Download size={18} /> {t.daily.exportBtn}
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => setHideMeanings(!hideMeanings)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {hideMeanings ? <Eye size={18} /> : <EyeOff size={18} />}
              {hideMeanings ? t.daily.showMeanings : t.daily.hideMeanings}
            </button>
          </div>
        </div>

        {/* Split Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '30px', alignItems: 'start' }}>
          
          {/* Left Column: Vocabulary List Table */}
          <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
            {/* Kanji Detail Page Overlay */}
            {modalIndex !== null && (
              <div className="animate-fade-in" style={{ width: '100%' }}>
                <KanjiDetailModal
                  words={words}
                  initialIndex={modalIndex}
                  onClose={() => setModalIndex(null)}
                />
              </div>
            )}

            {/* Word List Table (Hidden when showing Kanji Detail to act as separate page) */}
            <div 
              style={{ 
                display: modalIndex !== null ? 'none' : 'block' 
              }}
            >
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ChevronRight size={14} />
                Nhấn vào một từ để xem chi tiết và thứ tự nét viết
              </p>

              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-secondary)' }}>
                    <tr>
                      <th style={{ padding: '15px 20px', width: '50px' }}>{t.daily.colNo}</th>
                      <th style={{ padding: '15px 20px' }}>{t.daily.colKanji}</th>
                      {!hideMeanings && <th style={{ padding: '15px 20px' }}>{t.daily.colHiragana}</th>}
                      {!hideMeanings && <th style={{ padding: '15px 20px' }}>{t.daily.colMeaning}</th>}
                      <th style={{ padding: '15px 20px' }}>{t.daily.colHanViet}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {words.map((word, index) => (
                      <tr
                        key={word.id}
                        onClick={() => setModalIndex(index)}
                        style={{
                          borderBottom: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.06)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '15px 20px', color: 'var(--text-secondary)' }}>{index + 1}</td>
                        <td className="jp-text" style={{ padding: '15px 20px', fontSize: '1.2rem', fontWeight: 700 }}>{word.kanji}</td>
                        {!hideMeanings && <td className="jp-text" style={{ padding: '15px 20px', color: 'var(--accent-color)' }}>{word.hiragana}</td>}
                        {!hideMeanings && <td style={{ padding: '15px 20px', fontWeight: 500 }}>{word.meaning}</td>}
                        <td style={{ padding: '15px 20px', color: 'var(--text-secondary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <span>{word.hanViet}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  speakWord(word);
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--text-secondary)',
                                  cursor: 'pointer',
                                  padding: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  borderRadius: '4px',
                                  transition: 'color 0.15s ease'
                                }}
                                onMouseEnter={ev => ev.currentTarget.style.color = 'var(--accent-color)'}
                                onMouseLeave={ev => ev.currentTarget.style.color = 'var(--text-secondary)'}
                              >
                                <Volume2 size={16} />
                              </button>
                              <ChevronRight size={14} style={{ opacity: 0.3, flexShrink: 0 }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Quiz Control / Setup / Active Quiz (Sticky!) */}
          <div style={{ position: 'sticky', top: '20px', zIndex: 10 }}>
            {renderRightPanel()}
          </div>

        </div>
      </div>
    );
  }

  return null;
};

export default DailyStudyPage;
