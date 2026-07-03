import React, { useState, useEffect } from 'react';
import { vocabApi, userSettingsApi, srsApi, analyticsApi } from '../services/api';
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
  const [quizQuestionType, setQuizQuestionType] = useState('vi-to-ja'); // 'vi-to-ja' or 'ja-to-vi'

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
        if (level === 'LEARNED_REVIEW') {
          // Bypass settings and jump straight to Quiz Setup
          setPhase(4);
          setLoadingSetting(false);
          return;
        }
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

  const handleStartLearnedQuiz = async () => {
    setLoading(true);
    setQuizSetupError('');
    try {
      const count = parseInt(quizOptRandomCount, 10);
      if (isNaN(count) || count < 5 || count > 100) {
        setQuizSetupError("Vui lòng nhập số câu hợp lệ (5 - 100)");
        return;
      }
      const data = await srsApi.getRandomLearnedWords(count);
      if (data.length === 0) {
        setQuizSetupError("Bạn chưa có từ vựng nào trong danh sách Đã học!");
        return;
      }
      const shuffled = shuffleArray(data);
      setQuizWords(shuffled);
      setOriginalQuizLength(shuffled.length);
      setFailedWordIds(new Set());
      setQuizIndex(0);
      setScore(0);
      setUserInput('');
      setQuizStatus('idle');
      setMistakes([]);
      setPhase(3);
    } catch (error) {
      console.error("Failed to load learned words for quiz", error);
      setQuizSetupError(error.response?.data?.error || "Không thể tải danh sách từ đã học.");
    } finally {
      setLoading(false);
    }
  };

  const checkAnswer = (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const currentWord = quizWords[quizIndex];
    const inputClean = userInput.trim().toLowerCase();
    
    let isCorrect = false;

    if (quizQuestionType === 'vi-to-ja') {
      const kanjiClean = currentWord.kanji ? currentWord.kanji.trim().toLowerCase() : '';
      const hiraganaClean = currentWord.hiragana ? currentWord.hiragana.trim().toLowerCase() : '';
      isCorrect = (inputClean === kanjiClean || inputClean === hiraganaClean);
    } else {
      // ja-to-vi mode: compare input with meaning parts
      const meaning = currentWord.meaning || '';
      const delimiters = /[,;\/()]/;
      const parts = meaning.split(delimiters)
        .map(p => p.trim().toLowerCase())
        .filter(p => p.length > 0);
      isCorrect = parts.some(p => p === inputClean) || inputClean === meaning.trim().toLowerCase();
    }

    if (isCorrect) {
      setQuizStatus('correct');
      if (!failedWordIds.has(currentWord.id)) {
        setScore(s => s + 1);
        // Correct on first try: add to studied count & learned list (SRS) in background
        if (isAuthenticated) {
          srsApi.reviewWord(currentWord.id, 3).catch(console.error);
          analyticsApi.logSession(1, 1, 1).catch(console.error);
        }
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

      // Failed: mark in SRS as Again in background
      if (isAuthenticated) {
        srsApi.reviewWord(currentWord.id, 1).catch(console.error);
        analyticsApi.logSession(1, 0, 1).catch(console.error);
      }

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

  // Loading state
  if (loading) {
    return (
      <div className="flex-center" style={{ height: '70vh', flexDirection: 'column', gap: '20px' }}>
        <Loader size={40} className="animate-spin" style={{ color: 'var(--accent-color)' }} />
        <p>{t.daily.loading(selectedDay)}</p>
      </div>
    );
  }

  // Phase 2: Review Table
  if (phase === 2) {
    return (
      <div style={{ width: '100%', position: 'relative' }}>
        {/* Kanji Detail Page */}
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
          className="container animate-fade-in" 
          style={{ 
            padding: '20px', 
            maxWidth: '1000px', 
            display: modalIndex !== null ? 'none' : 'block' 
          }}
        >
          <div className="flex-between" style={{ 
            position: 'sticky', 
            top: '0px', 
            zIndex: 100, 
            backgroundColor: 'var(--bg-color)', 
            padding: '15px 0', 
            borderBottom: '1px solid var(--border-color)',
            marginBottom: '20px' 
          }}>
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
            <button className="btn btn-primary" onClick={openQuizSetup}>
              <Play size={18} /> {t.daily.startQuiz}
            </button>
          </div>
        </div>

        {/* Hint */}
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
    );
  }

  // Phase 3: Quiz Mode
  if (phase === 3) {
    if (quizStatus === 'finished') {
      return (
        <div className="container flex-center animate-fade-in" style={{ height: '70vh', flexDirection: 'column', gap: '30px' }}>
          <h1 style={{ fontSize: '3rem', color: score === originalQuizLength ? 'var(--success-color)' : 'var(--text-primary)' }}>
            {t.daily.quizDone}
          </h1>
          <div className="card flex-center" style={{ padding: '40px 60px', flexDirection: 'column', gap: '15px' }}>
            <h2 style={{ fontSize: '2rem' }}>{t.daily.yourScore}</h2>
            <div style={{ fontSize: '4rem', fontWeight: 900, color: 'var(--accent-color)' }}>
              {score} <span style={{ fontSize: '2rem', color: 'var(--text-secondary)' }}>/ {originalQuizLength}</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>
              {score === originalQuizLength ? t.daily.perfectMsg : t.daily.goodMsg}
            </p>
          </div>
          <div className="flex-center" style={{ gap: '20px' }}>
            <button className="btn btn-secondary" onClick={() => setPhase(2)}>
              <BookOpen size={18} /> {t.daily.reviewAgain}
            </button>
            <button className="btn btn-primary" onClick={() => setPhase(1)}>
              <ArrowRight size={18} /> {t.daily.nextDay}
            </button>
          </div>
        </div>
      );
    }

    const currentWord = quizWords[quizIndex];

    return (
      <div className="container flex-center animate-fade-in" style={{ height: '70vh', flexDirection: 'column' }}>
        <div style={{ width: '100%', maxWidth: '600px' }}>

          <div className="flex-between" style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
            <span>{t.daily.question} {quizIndex + 1} / {quizWords.length}</span>
            <span>{t.daily.score}: {score}</span>
          </div>

          <div className="progress-bg" style={{ marginBottom: '40px' }}>
            <div className="progress-fill" style={{ width: `${((quizIndex) / quizWords.length) * 100}%` }}></div>
          </div>

          <div className="card" style={{ padding: '40px', textAlign: 'center', marginBottom: '30px' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '15px' }}>
              {quizQuestionType === 'vi-to-ja' ? t.daily.quizPrompt : 'Hãy điền nghĩa Tiếng Việt của từ sau:'}
            </p>
            <h2 className={quizQuestionType === 'ja-to-vi' ? 'jp-text' : ''} style={{ fontSize: quizQuestionType === 'ja-to-vi' ? '2.8rem' : '2.2rem', marginBottom: '20px', color: 'var(--text-primary)' }}>
              {quizQuestionType === 'vi-to-ja' ? currentWord.meaning : (currentWord.kanji || currentWord.hiragana)}
            </h2>
            {quizQuestionType === 'ja-to-vi' && currentWord.kanji && (
              <p style={{ color: 'var(--accent-color)', fontSize: '1.2rem', marginBottom: '10px' }}>({currentWord.hiragana})</p>
            )}
            {quizQuestionType === 'vi-to-ja' && currentWord.hanViet && (
              <p style={{ color: 'var(--text-secondary)' }}>【{currentWord.hanViet}】</p>
            )}
          </div>

          {quizStatus === 'idle' && (
            <form onSubmit={checkAnswer} className="flex-center" style={{ gap: '10px' }}>
              <input
                type="text"
                autoFocus
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={quizQuestionType === 'vi-to-ja' ? t.daily.inputPlaceholder : 'Nhập nghĩa dịch Tiếng Việt...'}
                className={quizQuestionType === 'vi-to-ja' ? 'jp-text' : ''}
                style={{
                  flex: 1,
                  padding: '16px 20px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--surface-color)',
                  color: 'var(--text-primary)',
                  fontSize: '1.2rem',
                }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '16px 30px' }}>
                {t.daily.checkBtn}
              </button>
            </form>
          )}

          {quizStatus === 'correct' && (
            <div className="card animate-fade-in" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'var(--success-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="flex-center" style={{ gap: '15px' }}>
                <CheckCircle size={32} color="var(--success-color)" />
                <div>
                  <h3 style={{ color: 'var(--success-color)' }}>{t.daily.correct}</h3>
                  <p className="jp-text" style={{ fontSize: '1.2rem', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                  <p style={{ marginTop: '6px', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                    <strong>Nghĩa:</strong> {currentWord.meaning}
                  </p>
                </div>
              </div>
              <button className="btn btn-primary" onClick={nextQuestion} autoFocus>
                {t.daily.nextBtn} <ArrowRight size={18} />
              </button>
            </div>
          )}

          {quizStatus === 'incorrect' && (
            <div className="card animate-fade-in" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'var(--accent-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="flex-center" style={{ gap: '15px' }}>
                <XCircle size={32} color="var(--accent-color)" />
                <div>
                  <h3 style={{ color: 'var(--accent-color)' }}>{t.daily.incorrect}</h3>
                  <p style={{ marginTop: '5px' }}>{t.daily.correctAnswerIs}</p>
                  <p className="jp-text" style={{ fontSize: '1.2rem', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                  <p style={{ marginTop: '6px', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                    <strong>Nghĩa:</strong> {currentWord.meaning}
                  </p>
                </div>
              </div>
              <button className="btn btn-primary" onClick={nextQuestion} autoFocus>
                {t.daily.continueBtn} <ArrowRight size={18} />
              </button>
            </div>
          )}

        </div>
      </div>
    );
  }

  // Phase 4: Quiz Setup UI
  if (phase === 4) {
    return (
      <div className="container animate-fade-in" style={{ padding: '20px', maxWidth: '600px', margin: '40px auto' }}>
        <button className="btn btn-secondary" onClick={level === 'LEARNED_REVIEW' ? goBack : () => setPhase(2)} style={{ marginBottom: '20px' }}>
          <CornerUpLeft size={18} /> {level === 'LEARNED_REVIEW' ? 'Quay lại Trang chủ' : (t.daily.backToList || 'Quay lại danh sách')}
        </button>
        <div className="card" style={{ padding: '40px' }}>
          <h2 style={{ marginBottom: '10px', textAlign: 'center' }}>
            {level === 'LEARNED_REVIEW' ? 'Cấu hình Quiz ôn tập' : t.daily.quizSetupTitle}
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', textAlign: 'center' }}>
            {level === 'LEARNED_REVIEW' 
              ? 'Hệ thống sẽ lấy ngẫu nhiên các từ bạn đã thuộc để làm bài kiểm tra.'
              : t.daily.quizSetupPrompt(selectedDay, words.length)}
          </p>

          {/* Question Direction Selection */}
          <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '12px', fontSize: '1rem' }}>
              Dạng câu hỏi Quiz:
            </label>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button 
                type="button"
                className={`btn ${quizQuestionType === 'vi-to-ja' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '10px 6px', fontSize: '0.9rem' }}
                onClick={() => setQuizQuestionType('vi-to-ja')}
              >
                Nghĩa Việt → Tiếng Nhật
              </button>
              <button 
                type="button"
                className={`btn ${quizQuestionType === 'ja-to-vi' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '10px 6px', fontSize: '0.9rem' }}
                onClick={() => setQuizQuestionType('ja-to-vi')}
              >
                Tiếng Nhật → Nghĩa Việt
              </button>
            </div>
          </div>

          {quizSetupError && (
            <div style={{ 
              backgroundColor: 'rgba(239, 68, 68, 0.1)', 
              color: 'var(--accent-color)', 
              padding: '12px', 
              borderRadius: '8px', 
              marginBottom: '20px', 
              fontSize: '0.9rem',
              fontWeight: 500
            }}>
              {quizSetupError}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '30px' }}>
            {level === 'LEARNED_REVIEW' ? (
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '10px' }}>
                  Số câu hỏi ôn tập:
                </label>
                <input 
                  type="number" 
                  min="5" 
                  max="100"
                  value={quizOptRandomCount}
                  onChange={(e) => setQuizOptRandomCount(e.target.value)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--surface-color)',
                    color: 'var(--text-primary)',
                    width: '120px',
                    fontSize: '1rem'
                  }}
                />
                <span style={{ marginLeft: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  từ (Đề xuất: 20 từ)
                </span>
              </div>
            ) : (
              <>
                {/* Option: All */}
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  padding: '15px', 
                  borderRadius: '10px', 
                  border: `1px solid ${quizOptType === 'all' ? 'var(--accent-color)' : 'var(--border-color)'}`,
                  backgroundColor: quizOptType === 'all' ? 'rgba(239,68,68,0.04)' : 'transparent',
                  cursor: 'pointer'
                }}>
                  <input 
                    type="radio" 
                    name="quizOptType" 
                    value="all" 
                    checked={quizOptType === 'all'} 
                    onChange={() => setQuizOptType('all')} 
                  />
                  <div>
                    <strong>{t.daily.quizOptAll}</strong>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {t.daily.quizOptAllDesc(words.length)}
                    </div>
                  </div>
                </label>

                {/* Option: Random */}
                <label style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  gap: '12px', 
                  padding: '15px', 
                  borderRadius: '10px', 
                  border: `1px solid ${quizOptType === 'random' ? 'var(--accent-color)' : 'var(--border-color)'}`,
                  backgroundColor: quizOptType === 'random' ? 'rgba(239,68,68,0.04)' : 'transparent',
                  cursor: 'pointer'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input 
                      type="radio" 
                      name="quizOptType" 
                      value="random" 
                      checked={quizOptType === 'random'} 
                      onChange={() => setQuizOptType('random')} 
                    />
                    <div>
                      <strong>{t.daily.quizOptRandom}</strong>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {t.daily.quizOptRandomDesc}
                      </div>
                    </div>
                  </div>
                  {quizOptType === 'random' && (
                    <div style={{ paddingLeft: '28px' }}>
                      <input 
                        type="number" 
                        min="1" 
                        max={words.length}
                        value={quizOptRandomCount}
                        onChange={(e) => setQuizOptRandomCount(e.target.value)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--surface-color)',
                          color: 'var(--text-primary)',
                          width: '100px'
                        }}
                      />
                      <span style={{ marginLeft: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        {t.daily.words || 'từ'} {t.daily.quizRangeMax(words.length)}
                      </span>
                    </div>
                  )}
                </label>

                {/* Option: Range */}
                <label style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  gap: '12px', 
                  padding: '15px', 
                  borderRadius: '10px', 
                  border: `1px solid ${quizOptType === 'range' ? 'var(--accent-color)' : 'var(--border-color)'}`,
                  backgroundColor: quizOptType === 'range' ? 'rgba(239,68,68,0.04)' : 'transparent',
                  cursor: 'pointer'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input 
                      type="radio" 
                      name="quizOptType" 
                      value="range" 
                      checked={quizOptType === 'range'} 
                      onChange={() => setQuizOptType('range')} 
                    />
                    <div>
                      <strong>{t.daily.quizOptRange}</strong>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {t.daily.quizOptRangeDesc}
                      </div>
                    </div>
                  </div>
                  {quizOptType === 'range' && (
                    <div style={{ paddingLeft: '28px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span>{t.daily.quizRangeFrom}</span>
                      <input 
                        type="number" 
                        min="1" 
                        max={words.length}
                        value={quizOptRangeStart}
                        onChange={(e) => setQuizOptRangeStart(e.target.value)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--surface-color)',
                          color: 'var(--text-primary)',
                          width: '80px'
                        }}
                      />
                      <span>{t.daily.quizRangeTo}</span>
                      <input 
                        type="number" 
                        min="1" 
                        max={words.length}
                        value={quizOptRangeEnd}
                        onChange={(e) => setQuizOptRangeEnd(e.target.value)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--surface-color)',
                          color: 'var(--text-primary)',
                          width: '80px'
                        }}
                      />
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        {t.daily.quizRangeMax(words.length)}
                      </span>
                    </div>
                  )}
                </label>
              </>
            )}
          </div>

          <button 
            className="btn btn-primary" 
            style={{ padding: '14px', fontSize: '1.1rem', width: '100%' }}
            onClick={level === 'LEARNED_REVIEW' ? handleStartLearnedQuiz : handleConfirmStartQuiz}
          >
            {t.daily.quizStartBtn}
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default DailyStudyPage;
