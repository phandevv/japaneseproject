import React, { useState, useEffect } from 'react';
import { vocabApi } from '../services/api';
import { CornerUpLeft, BookOpen, CheckCircle, XCircle, ArrowRight, Loader, Play } from 'lucide-react';

const DailyStudyPage = ({ level, stats, goBack }) => {
  const [phase, setPhase] = useState(1); // 1: Select Day, 2: Review Table, 3: Quiz
  const [selectedDay, setSelectedDay] = useState(1);
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(false);
  
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
      // API page is 0-indexed, so Day 1 is page 0
      const data = await vocabApi.getByLevelPaginated(level, day - 1, 20);
      setWords(data.content || []);
      setSelectedDay(day);
      setPhase(2); // Go to review phase
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
    
    // Accept answer if it matches Kanji or Hiragana
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
            <CornerUpLeft size={18} /> Back to Dashboard
          </button>
          <h2>Level <span style={{ color: 'var(--accent-color)' }}>{level}</span> - Daily Study</h2>
          <div style={{ width: '150px' }}></div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <p style={{ color: 'var(--text-secondary)' }}>
            This level has {totalWords} words, divided into {totalDays} days (20 words/day).
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
              <h3 style={{ fontSize: '1.2rem' }}>Day {day}</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>20 words</p>
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
        <p>Loading words for Day {selectedDay}...</p>
      </div>
    );
  }

  // Phase 2: Review Table
  if (phase === 2) {
    return (
      <div className="container animate-fade-in" style={{ padding: '20px', maxWidth: '1000px' }}>
        <div className="flex-between" style={{ marginBottom: '20px' }}>
          <button className="btn btn-secondary" onClick={() => setPhase(1)}>
            <CornerUpLeft size={18} /> Choose Another Day
          </button>
          <h2>Day {selectedDay} - Study Review</h2>
          <button className="btn btn-primary" onClick={startQuiz}>
            <Play size={18} /> Start Quiz
          </button>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-secondary)' }}>
              <tr>
                <th style={{ padding: '15px 20px', width: '50px' }}>#</th>
                <th style={{ padding: '15px 20px' }}>Kanji</th>
                <th style={{ padding: '15px 20px' }}>Hiragana</th>
                <th style={{ padding: '15px 20px' }}>Vietnamese Meaning</th>
                <th style={{ padding: '15px 20px' }}>Han Viet</th>
              </tr>
            </thead>
            <tbody>
              {words.map((word, index) => (
                <tr key={word.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '15px 20px', color: 'var(--text-secondary)' }}>{index + 1}</td>
                  <td className="jp-text" style={{ padding: '15px 20px', fontSize: '1.2rem' }}>{word.kanji}</td>
                  <td className="jp-text" style={{ padding: '15px 20px', color: 'var(--accent-color)' }}>{word.hiragana}</td>
                  <td style={{ padding: '15px 20px', fontWeight: 500 }}>{word.meaning}</td>
                  <td style={{ padding: '15px 20px', color: 'var(--text-secondary)' }}>{word.hanViet}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
            Quiz Completed!
          </h1>
          <div className="card flex-center" style={{ padding: '40px 60px', flexDirection: 'column', gap: '15px' }}>
            <h2 style={{ fontSize: '2rem' }}>Your Score</h2>
            <div style={{ fontSize: '4rem', fontWeight: 900, color: 'var(--accent-color)' }}>
              {score} <span style={{ fontSize: '2rem', color: 'var(--text-secondary)' }}>/ {words.length}</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>
              {score === words.length ? "Perfect score! You're amazing! 🎉" : "Great job! Keep practicing to get a perfect score."}
            </p>
          </div>
          <div className="flex-center" style={{ gap: '20px' }}>
            <button className="btn btn-secondary" onClick={() => setPhase(2)}>
              <BookOpen size={18} /> Review List Again
            </button>
            <button className="btn btn-primary" onClick={() => setPhase(1)}>
              <ArrowRight size={18} /> Next Day
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
            <span>Question {quizIndex + 1} of {words.length}</span>
            <span>Score: {score}</span>
          </div>

          <div className="progress-bg" style={{ marginBottom: '40px' }}>
            <div className="progress-fill" style={{ width: `${((quizIndex) / words.length) * 100}%` }}></div>
          </div>

          <div className="card" style={{ padding: '40px', textAlign: 'center', marginBottom: '30px' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '15px' }}>What is the Japanese word for:</p>
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
                placeholder="Type in Hiragana or Kanji..."
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
                Check
              </button>
            </form>
          )}

          {quizStatus === 'correct' && (
            <div className="card animate-fade-in" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'var(--success-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="flex-center" style={{ gap: '15px' }}>
                <CheckCircle size={32} color="var(--success-color)" />
                <div>
                  <h3 style={{ color: 'var(--success-color)' }}>Correct!</h3>
                  <p className="jp-text" style={{ fontSize: '1.2rem', marginTop: '5px' }}>
                    {currentWord.kanji && <span>{currentWord.kanji} </span>}
                    <span style={{ color: 'var(--text-secondary)' }}>({currentWord.hiragana})</span>
                  </p>
                </div>
              </div>
              <button className="btn btn-primary" onClick={nextQuestion} autoFocus>
                Next <ArrowRight size={18} />
              </button>
            </div>
          )}

          {quizStatus === 'incorrect' && (
            <div className="card animate-fade-in" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'var(--accent-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="flex-center" style={{ gap: '15px' }}>
                <XCircle size={32} color="var(--accent-color)" />
                <div>
                  <h3 style={{ color: 'var(--accent-color)' }}>Incorrect</h3>
                  <p style={{ marginTop: '5px' }}>The correct answer is:</p>
                  <p className="jp-text" style={{ fontSize: '1.2rem', marginTop: '5px' }}>
                    {currentWord.kanji && <span style={{ color: 'var(--success-color)' }}>{currentWord.kanji} </span>}
                    <span style={{ color: 'var(--success-color)' }}>({currentWord.hiragana})</span>
                  </p>
                </div>
              </div>
              <button className="btn btn-primary" onClick={nextQuestion} autoFocus>
                Continue <ArrowRight size={18} />
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
