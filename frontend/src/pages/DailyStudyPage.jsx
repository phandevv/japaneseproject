import React, { useState, useEffect } from 'react';
import { vocabApi } from '../services/api';
import { CornerUpLeft, BookOpen, CheckCircle, XCircle, ArrowRight, Loader, Play, ChevronRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import KanjiDetailModal from '../components/KanjiDetailModal';

const DailyStudyPage = ({ level, stats, goBack }) => {
  const { t } = useLanguage();
  const [phase, setPhase] = useState(1); // 1: Select Day, 2: Review Table, 3: Quiz
  const [selectedDay, setSelectedDay] = useState(1);
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal state
  const [modalIndex, setModalIndex] = useState(null); // null = closed, number = open at that index

  // Quiz states
  const [quizIndex, setQuizIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [quizStatus, setQuizStatus] = useState('idle'); // idle, correct, incorrect, finished
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState([]);

  // Calculate total days for this level (20 words per day)
  const totalWords = stats?.levels?.[level] || 0;
  const totalDays = Math.ceil(totalWords / 20);

  const fetchWordsForDay = async (day) => {
    setLoading(true);
    try {
      const data = await vocabApi.getByLevelPaginated(level, day - 1, 20);
      setWords(data.content || []);
      setSelectedDay(day);
      setPhase(2);
    } catch (error) {
      console.error("Failed to fetch words for day", error);
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = () => {
    setPhase(3);
    setQuizIndex(0);
    setScore(0);
    setUserInput('');
    setQuizStatus('idle');
    setMistakes([]);
  };

  const checkAnswer = (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const currentWord = words[quizIndex];
    const inputClean = userInput.trim().toLowerCase();
    const kanjiClean = currentWord.kanji ? currentWord.kanji.trim().toLowerCase() : '';
    const hiraganaClean = currentWord.hiragana ? currentWord.hiragana.trim().toLowerCase() : '';

    if (inputClean === kanjiClean || inputClean === hiraganaClean) {
      setQuizStatus('correct');
      setScore(s => s + 1);
    } else {
      setQuizStatus('incorrect');
      setMistakes(prev => [...prev, currentWord]);
    }
  };

  const nextQuestion = () => {
    if (quizIndex < words.length - 1) {
      setQuizIndex(quizIndex + 1);
      setUserInput('');
      setQuizStatus('idle');
    } else {
      setQuizStatus('finished');
    }
  };

  // Phase 1: Select Day
  if (phase === 1) {
    return (
      <div className="container animate-fade-in" style={{ padding: '20px', maxWidth: '1000px' }}>
        <div className="flex-between" style={{ marginBottom: '30px' }}>
          <button className="btn btn-secondary" onClick={goBack}>
            <CornerUpLeft size={18} /> {t.daily.backDashboard}
          </button>
          <h2>{t.daily.dailyStudy} - <span style={{ color: 'var(--accent-color)' }}>{level}</span></h2>
          <div style={{ width: '150px' }}></div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <p style={{ color: 'var(--text-secondary)' }}>
            {t.daily.levelInfo(totalWords, totalDays)}
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
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t.daily.wordsPerDay}</p>
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
          <div className="flex-between" style={{ marginBottom: '20px' }}>
          <button className="btn btn-secondary" onClick={() => setPhase(1)}>
            <CornerUpLeft size={18} /> {t.daily.chooseAnotherDay}
          </button>
          <h2>{t.daily.day} {selectedDay} - {t.daily.studyReview}</h2>
          <button className="btn btn-primary" onClick={startQuiz}>
            <Play size={18} /> {t.daily.startQuiz}
          </button>
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
                <th style={{ padding: '15px 20px' }}>{t.daily.colHiragana}</th>
                <th style={{ padding: '15px 20px' }}>{t.daily.colMeaning}</th>
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
                  <td className="jp-text" style={{ padding: '15px 20px', color: 'var(--accent-color)' }}>{word.hiragana}</td>
                  <td style={{ padding: '15px 20px', fontWeight: 500 }}>{word.meaning}</td>
                  <td style={{ padding: '15px 20px', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span>{word.hanViet}</span>
                      <ChevronRight size={14} style={{ opacity: 0.3, flexShrink: 0 }} />
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
          <h1 style={{ fontSize: '3rem', color: score === words.length ? 'var(--success-color)' : 'var(--text-primary)' }}>
            {t.daily.quizDone}
          </h1>
          <div className="card flex-center" style={{ padding: '40px 60px', flexDirection: 'column', gap: '15px' }}>
            <h2 style={{ fontSize: '2rem' }}>{t.daily.yourScore}</h2>
            <div style={{ fontSize: '4rem', fontWeight: 900, color: 'var(--accent-color)' }}>
              {score} <span style={{ fontSize: '2rem', color: 'var(--text-secondary)' }}>/ {words.length}</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>
              {score === words.length ? t.daily.perfectMsg : t.daily.goodMsg}
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

    const currentWord = words[quizIndex];

    return (
      <div className="container flex-center animate-fade-in" style={{ height: '70vh', flexDirection: 'column' }}>
        <div style={{ width: '100%', maxWidth: '600px' }}>

          <div className="flex-between" style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
            <span>{t.daily.question} {quizIndex + 1} / {words.length}</span>
            <span>{t.daily.score}: {score}</span>
          </div>

          <div className="progress-bg" style={{ marginBottom: '40px' }}>
            <div className="progress-fill" style={{ width: `${((quizIndex) / words.length) * 100}%` }}></div>
          </div>

          <div className="card" style={{ padding: '40px', textAlign: 'center', marginBottom: '30px' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '15px' }}>{t.daily.quizPrompt}</p>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '20px', color: 'var(--text-primary)' }}>
              {currentWord.meaning}
            </h2>
            {currentWord.hanViet && (
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
                placeholder={t.daily.inputPlaceholder}
                className="jp-text"
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
                  <p className="jp-text" style={{ fontSize: '1.2rem', marginTop: '5px' }}>
                    {currentWord.kanji && <span>{currentWord.kanji} </span>}
                    <span style={{ color: 'var(--text-secondary)' }}>({currentWord.hiragana})</span>
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
                  <p className="jp-text" style={{ fontSize: '1.2rem', marginTop: '5px' }}>
                    {currentWord.kanji && <span style={{ color: 'var(--success-color)' }}>{currentWord.kanji} </span>}
                    <span style={{ color: 'var(--success-color)' }}>({currentWord.hiragana})</span>
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

  return null;
};

export default DailyStudyPage;
