import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { vocabApi } from '../services/api';
import { ArrowLeft, RefreshCw, Trophy, Heart, Play } from 'lucide-react';
import MascotCorners from '../components/MascotCorners';
import { useAuth } from '../context/AuthContext';
import PodiumLeaderboard from '../components/PodiumLeaderboard';

const normalizeString = (str) => {
  if (!str) return '';
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];
const WORD_COUNTS = [10, 20, 50];

const FallingWordsGame = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [gameState, setGameState] = useState('lobby'); // lobby, loading, playing, gameover, won
  const [selectedLevel, setSelectedLevel] = useState('N5');
  const [wordCount, setWordCount] = useState(20);
  
  const [wordsQueue, setWordsQueue] = useState([]);
  const [activeWords, setActiveWords] = useState([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [inputValue, setInputValue] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  
  const containerRef = useRef(null);
  const requestRef = useRef();
  const lastSpawnTime = useRef(0);
  
  const baseSpeed = selectedLevel === 'N1' || selectedLevel === 'N2' ? 1.5 : 1;
  const spawnRate = 2500; 

  // Load leaderboard
  useEffect(() => {
    if (gameState === 'lobby') {
      const key = `nihongo-falling-leaderboard-${selectedLevel}-${wordCount}`;
      const scores = JSON.parse(localStorage.getItem(key) || '[]');
      setLeaderboard(scores);
    }
  }, [gameState, selectedLevel, wordCount]);

  const startGame = async () => {
    setGameState('loading');
    try {
      const data = await vocabApi.getRandomByLevel(selectedLevel, wordCount);
      setWordsQueue(data);
      setActiveWords([]);
      setScore(0);
      setLives(3);
      setInputValue('');
      setGameState('playing');
    } catch (err) {
      console.error(err);
      setGameState('lobby');
    }
  };

  const handleEndGame = (won) => {
    setGameState(won ? 'won' : 'gameover');
    
    // Save Leaderboard
    const key = `nihongo-falling-leaderboard-${selectedLevel}-${wordCount}`;
    const scores = JSON.parse(localStorage.getItem(key) || '[]');
    if (score > 0) {
      scores.push({ 
        score, 
        date: new Date().toISOString(),
        username: user?.username || 'Khách'
      });
      scores.sort((a, b) => b.score - a.score); // Highest score first
      const top10 = scores.slice(0, 10);
      localStorage.setItem(key, JSON.stringify(top10));
      setLeaderboard(top10);
    }
  };

  const gameLoop = useCallback((time) => {
    if (gameState !== 'playing') return;

    setActiveWords(prevWords => {
      let nextWords = prevWords.map(w => ({
        ...w,
        y: w.y + (baseSpeed + (score * 0.05)) 
      }));

      const containerHeight = containerRef.current ? containerRef.current.clientHeight : 600;
      const missedWords = nextWords.filter(w => w.y > containerHeight - 50);
      
      if (missedWords.length > 0) {
        setLives(l => {
          const newLives = l - missedWords.length;
          if (newLives <= 0) {
            handleEndGame(false);
          }
          return newLives;
        });
        nextWords = nextWords.filter(w => w.y <= containerHeight - 50);
      }

      return nextWords;
    });

    setWordsQueue(prevQueue => {
      if (prevQueue.length > 0 && time - lastSpawnTime.current > spawnRate) {
        lastSpawnTime.current = time;
        const newWord = prevQueue[0];
        const containerWidth = containerRef.current ? containerRef.current.clientWidth : 800;
        
        setActiveWords(prevActive => [
          ...prevActive, 
          { 
            ...newWord, 
            id: Date.now() + Math.random(), 
            x: Math.max(50, Math.random() * (containerWidth - 150)), 
            y: -50 
          }
        ]);
        
        return prevQueue.slice(1);
      }
      return prevQueue;
    });

    if (wordsQueue.length === 0 && activeWords.length === 0 && gameState === 'playing' && lives > 0) {
      handleEndGame(true);
    }

    if (gameState === 'playing' && lives > 0) {
      requestRef.current = requestAnimationFrame(gameLoop);
    }
  }, [gameState, score, wordsQueue.length, activeWords.length, lives, baseSpeed]);

  useEffect(() => {
    if (gameState === 'playing') {
      requestRef.current = requestAnimationFrame(gameLoop);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameState, gameLoop]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);

    const normalizedInput = normalizeString(val);
    if (!normalizedInput) return;

    const matchedIndex = activeWords.findIndex(w => {
      const matchMeaning = normalizeString(w.meaning).includes(normalizedInput) && normalizedInput.length > 2;
      const matchExactMeaning = normalizeString(w.meaning) === normalizedInput;
      const matchHiragana = w.hiragana && w.hiragana === val;
      return matchExactMeaning || matchMeaning || matchHiragana;
    });

    if (matchedIndex !== -1) {
      const newActive = [...activeWords];
      newActive.splice(matchedIndex, 1);
      setActiveWords(newActive);
      setScore(s => s + 10);
      setInputValue('');
    }
  };

  return (
    <div className="daily-study-page-bg animate-fade-in" style={{ height: 'calc(100vh - 64px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
        <button className="btn" onClick={() => {
          if (gameState === 'lobby') navigate('/games');
          else setGameState('lobby');
        }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ArrowLeft size={18} /> {gameState === 'lobby' ? 'Sảnh Trò Chơi' : 'Thoát Trò Chơi'}
        </button>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Mưa Từ Vựng {gameState !== 'lobby' && `- ${selectedLevel}`}</h2>
        
        {gameState === 'playing' ? (
          <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>Điểm: <span style={{ color: 'var(--accent-color)' }}>{score}</span></div>
            <div style={{ display: 'flex', gap: '5px' }}>
              {[...Array(3)].map((_, i) => (
                <Heart key={i} size={24} fill={i < lives ? "#ef4444" : "transparent"} color={i < lives ? "#ef4444" : "#ccc"} />
              ))}
            </div>
          </div>
        ) : <div></div>}
      </div>

      {/* Game Area */}
      <div 
        ref={containerRef} 
        style={{ 
          flex: 1, 
          position: 'relative', 
          overflow: gameState === 'playing' ? 'hidden' : 'auto', 
          background: 'rgba(0,0,0,0.02)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: gameState === 'playing' ? 'stretch' : 'flex-start',
          padding: gameState !== 'playing' ? '20px' : 0
        }}
      >
        {gameState === 'lobby' && (
          <div className="animate-fade-in" style={{ margin: 'auto', display: 'flex', gap: '30px', width: '100%', maxWidth: '1000px', flexWrap: 'wrap', justifyContent: 'center', zIndex: 20 }}>
            
            {/* Left Column: Config & Guide */}
            <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '20px', color: 'var(--text-primary)' }}>Chọn Cấp Độ</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginBottom: '30px' }}>
                  {LEVELS.map(lvl => (
                    <button 
                      key={lvl}
                      className={`btn ${selectedLevel === lvl ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setSelectedLevel(lvl)}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>

                <h3 style={{ fontSize: '1.5rem', marginBottom: '20px', color: 'var(--text-primary)' }}>Số Lượng Từ Vựng</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginBottom: '40px' }}>
                  {WORD_COUNTS.map(count => (
                    <button 
                      key={count}
                      className={`btn ${wordCount === count ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setWordCount(count)}
                    >
                      {count} Từ
                    </button>
                  ))}
                </div>

                <button className="btn btn-primary" onClick={startGame} style={{ fontSize: '1.3rem', padding: '15px 40px', display: 'flex', alignItems: 'center', gap: '10px', margin: '0 auto' }}>
                  <Play size={24} /> Bắt Đầu Chơi
                </button>
              </div>

              <div className="glass-card" style={{ padding: '30px', textAlign: 'left' }}>
                <h3 style={{ fontSize: '1.3rem', marginBottom: '15px', color: 'var(--text-primary)' }}>📖 Hướng dẫn chơi</h3>
                <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.6', paddingLeft: '20px', margin: 0, fontSize: '1rem' }}>
                  <li style={{ marginBottom: '8px' }}>Các chữ Kanji sẽ rơi liên tục từ trên xuống.</li>
                  <li style={{ marginBottom: '8px' }}>Hãy nhanh tay gõ <strong>nghĩa tiếng Việt (không dấu)</strong> hoặc <strong>Hiragana</strong> tương ứng vào ô nhập liệu bên dưới.</li>
                  <li style={{ marginBottom: '8px' }}>Bạn có 3 sinh mệnh (❤️). Mỗi từ rơi chạm đáy bạn sẽ mất 1 sinh mệnh.</li>
                  <li>Cố gắng sống sót và đạt điểm số cao nhất!</li>
                </ul>
              </div>
            </div>

            {/* Right Column: Leaderboard */}
            <div style={{ flex: '1 1 400px' }}>
              <PodiumLeaderboard data={leaderboard} type="score" />
            </div>
          </div>
        )}

        {gameState === 'loading' && <div style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>Đang chuẩn bị...</div>}
        
        {gameState === 'playing' && activeWords.map(word => (
          <div 
            key={word.id}
            className="glass-card"
            style={{
              position: 'absolute',
              left: `${word.x}px`,
              top: `${word.y}px`,
              padding: '10px 20px',
              fontSize: '1.5rem',
              fontWeight: 800,
              fontFamily: 'var(--font-jp)',
              pointerEvents: 'none',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
              border: '2px solid rgba(255,255,255,0.5)',
              transition: 'none' 
            }}
          >
            {word.kanji || word.hiragana}
          </div>
        ))}

        {(gameState === 'gameover' || gameState === 'won') && (
          <div className="glass-card animate-fade-in" style={{ margin: 'auto', padding: '40px', width: '100%', maxWidth: '600px', textAlign: 'center', zIndex: 20 }}>
            {gameState === 'won' ? (
              <Trophy size={80} color="#f59e0b" style={{ margin: '0 auto 20px' }} />
            ) : (
              <div style={{ fontSize: '4rem', marginBottom: '20px' }}>💥</div>
            )}
            <h2 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>{gameState === 'won' ? 'Chiến Thắng!' : 'Game Over'}</h2>
            
            <PodiumLeaderboard data={leaderboard} type="score" />

            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setGameState('lobby')}>Trở về sảnh</button>
              <button className="btn btn-primary" onClick={startGame} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RefreshCw size={18} /> Chơi lại
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      {gameState === 'playing' && (
        <div style={{ padding: '20px', display: 'flex', justifyContent: 'center', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', borderTop: '1px solid rgba(255,255,255,0.3)', zIndex: 10 }}>
          <input 
            type="text" 
            value={inputValue}
            onChange={handleInputChange}
            disabled={gameState !== 'playing'}
            placeholder="Nhập nghĩa tiếng Việt (không dấu) hoặc Hiragana..."
            style={{
              width: '100%',
              maxWidth: '600px',
              padding: '15px 24px',
              fontSize: '1.2rem',
              borderRadius: '30px',
              border: '2px solid var(--accent-color)',
              outline: 'none',
              boxShadow: '0 4px 16px rgba(37,99,235,0.2)',
              textAlign: 'center'
            }}
            autoFocus
          />
        </div>
      )}
    </div>
  );
};

export default FallingWordsGame;
