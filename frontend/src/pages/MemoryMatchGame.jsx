import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { vocabApi } from '../services/api';
import { ArrowLeft, RefreshCw, Trophy, Clock, Play, Eye } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import PodiumLeaderboard from '../components/PodiumLeaderboard';
import MascotLoader from '../components/MascotLoader';

// Helper to spawn sakura particles
const spawnSakura = (x, y, burst = false) => {
  const count = burst ? 25 : 6;
  for (let i = 0; i < count; i++) {
    const petal = document.createElement('div');
    petal.className = 'sakura-petal-effect';
    document.body.appendChild(petal);
    
    const size = Math.random() * 8 + 8;
    const tx = (Math.random() - 0.5) * (burst ? 300 : 100);
    const ty = (Math.random() - 0.5) * (burst ? 300 : 100) + (burst ? 50 : 20); 
    const rot = Math.random() * 360 + 180;
    
    petal.style.left = `${x}px`;
    petal.style.top = `${y}px`;
    petal.style.width = `${size}px`;
    petal.style.height = `${size}px`;
    petal.style.setProperty('--tx', `${tx}px`);
    petal.style.setProperty('--ty', `${ty}px`);
    petal.style.setProperty('--rot', `${rot}deg`);
    
    setTimeout(() => petal.remove(), 900);
  }
};

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];
const WORD_COUNTS = [10, 20, 50];

const MemoryMatchGame = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [gameState, setGameState] = useState('lobby'); // lobby, playing, won
  const [selectedLevel, setSelectedLevel] = useState('N5');
  const [wordCount, setWordCount] = useState(10);
  
  const [cards, setCards] = useState([]);
  const [flippedIndices, setFlippedIndices] = useState([]);
  const [matchedIndices, setMatchedIndices] = useState([]);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  
  // Hint system
  const [hintsLeft, setHintsLeft] = useState(2);
  const [isHintActive, setIsHintActive] = useState(false);

  // Load leaderboard when level or word count changes in lobby
  useEffect(() => {
    if (gameState === 'lobby') {
      const key = `nihongo-memory-leaderboard-${selectedLevel}-${wordCount}`;
      const scores = JSON.parse(localStorage.getItem(key) || '[]');
      setLeaderboard(scores);
    }
  }, [gameState, selectedLevel, wordCount]);

  const startGame = async () => {
    setLoading(true);
    setGameState('playing');
    try {
      const words = await vocabApi.getRandomByLevel(selectedLevel, wordCount);
      
      const gameCards = [];
      words.forEach(word => {
        gameCards.push({
          id: `${word.id}-jp`,
          wordId: word.id,
          content: word.kanji || word.hiragana,
          type: 'jp'
        });
        gameCards.push({
          id: `${word.id}-vi`,
          wordId: word.id,
          content: word.meaning,
          type: 'vi'
        });
      });
      
      const shuffled = gameCards.sort(() => Math.random() - 0.5);
      
      setCards(shuffled);
      setFlippedIndices([]);
      setMatchedIndices([]);
      setMoves(0);
      setTime(0);
      setHintsLeft(2);
      setIsHintActive(false);
    } catch (error) {
      console.error("Failed to load words for game", error);
      setGameState('lobby');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let intv;
    if (gameState === 'playing' && !loading) {
      intv = setInterval(() => setTime(t => t + 1), 1000);
    }
    return () => clearInterval(intv);
  }, [gameState, loading]);

  const handleCardClick = (e, index) => {
    if (gameState !== 'playing' || isHintActive) return;
    if (flippedIndices.length === 2) return;
    if (flippedIndices.includes(index)) return;
    if (matchedIndices.includes(index)) return;

    // Normal click sakura effect
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    spawnSakura(cx, cy, false);

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const card1 = cards[newFlipped[0]];
      const card2 = cards[newFlipped[1]];

      if (card1.wordId === card2.wordId) {
        // Match!
        setMatchedIndices(prev => [...prev, newFlipped[0], newFlipped[1]]);
        setFlippedIndices([]);
        
        // Match burst effect
        setTimeout(() => {
          // Find the two cards on screen
          const cardElements = document.querySelectorAll('.memory-card');
          const el1 = cardElements[newFlipped[0]];
          const el2 = cardElements[newFlipped[1]];
          
          if (el1) {
            const r1 = el1.getBoundingClientRect();
            spawnSakura(r1.left + r1.width / 2, r1.top + r1.height / 2, true);
          }
          if (el2) {
            const r2 = el2.getBoundingClientRect();
            spawnSakura(r2.left + r2.width / 2, r2.top + r2.height / 2, true);
          }
        }, 100);
        
        if (matchedIndices.length + 2 === cards.length) {
          setGameState('won');
          setTimeout(() => handleWin(), 600);
        }
      } else {
        setTimeout(() => setFlippedIndices([]), 1000);
      }
    }
  };

  const useHint = () => {
    if (hintsLeft <= 0 || isHintActive || gameState !== 'playing') return;
    setHintsLeft(prev => prev - 1);
    setIsHintActive(true);
    
    // Auto flip back down after 1s
    setTimeout(() => {
      setIsHintActive(false);
    }, 1000);
  };

  const handleWin = () => {
    // Save Leaderboard
    const key = `nihongo-memory-leaderboard-${selectedLevel}-${wordCount}`;
    const scores = JSON.parse(localStorage.getItem(key) || '[]');
    // Only save if time > 0 to prevent glitch saves
    if (time > 0) {
      scores.push({ 
        moves: moves + 1, 
        time, 
        date: new Date().toISOString(),
        username: user?.username || 'Khách'
      });
      scores.sort((a, b) => a.time - b.time || a.moves - b.moves);
      const top10 = scores.slice(0, 10);
      localStorage.setItem(key, JSON.stringify(top10));
      setLeaderboard(top10);
    }
  };

  return (
    <div className="daily-study-page-bg animate-fade-in" style={{ padding: '20px', minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'auto' }}>
      
      <style>{`
        .sakura-petal-effect {
          position: fixed;
          pointer-events: none;
          background-color: #ffb7c5;
          border-radius: 4px 15px 4px 15px; 
          z-index: 9999;
          animation: sakura-burst 0.9s cubic-bezier(0.25, 1, 0.5, 1) forwards;
          box-shadow: 0 0 8px rgba(255, 183, 197, 0.9);
        }
        @keyframes sakura-burst {
          0% { transform: translate(0, 0) scale(0) rotate(0deg); opacity: 1; }
          10% { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0) rotate(var(--rot)); opacity: 0; }
        }
        @keyframes card-match-shatter {
          0% { transform: rotateY(180deg) scale(1); opacity: 1; filter: brightness(1); }
          20% { transform: rotateY(180deg) scale(1.1); filter: brightness(1.5); box-shadow: 0 0 30px rgba(255, 183, 197, 1); }
          100% { transform: rotateY(180deg) scale(0); opacity: 0; filter: brightness(2); }
        }
        .memory-card-front {
          background: var(--surface-color);
          box-shadow: 0 8px 24px rgba(0,0,0,0.25);
          border: 3px solid var(--accent-color);
          backdrop-filter: blur(8px);
        }
        /* Highlight hover */
        .memory-card:hover .memory-card-back {
          filter: brightness(1.1);
        }
      `}</style>

      {/* Header Shared */}
      <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <button className="btn" onClick={() => {
          if (gameState === 'lobby') navigate('/games');
          else setGameState('lobby');
        }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ArrowLeft size={18} /> {gameState === 'lobby' ? 'Sảnh Trò Chơi' : 'Thoát Trò Chơi'}
        </button>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Tìm Thẻ Cặp {gameState !== 'lobby' && `- ${selectedLevel}`}</h2>
        
        {gameState === 'playing' && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button 
              className="btn"
              onClick={useHint}
              disabled={hintsLeft === 0 || isHintActive}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: hintsLeft > 0 ? 'var(--accent-color)' : 'rgba(0,0,0,0.1)',
                color: hintsLeft > 0 ? 'white' : 'var(--text-secondary)',
                padding: '6px 12px', borderRadius: '20px',
                fontSize: '0.9rem', fontWeight: 600,
                cursor: (hintsLeft === 0 || isHintActive) ? 'not-allowed' : 'pointer'
              }}
            >
              <Eye size={16} /> Gợi ý: {hintsLeft}
            </button>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Lượt: <span style={{ color: 'var(--accent-color)', fontWeight: 800 }}>{moves}</span>
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: '20px' }}>
              <Clock size={16} /> <span style={{ fontFamily: 'monospace', fontSize: '1.1rem' }}>{formatTime(time)}</span>
            </div>
          </div>
        )}
        {gameState !== 'playing' && <div></div>}
      </div>

      {gameState === 'lobby' && (
        <div className="animate-fade-in" style={{ margin: 'auto', display: 'flex', gap: '24px', width: '100%', maxWidth: '1000px', flexWrap: 'wrap', justifyContent: 'center' }}>
          
          {/* Left Column: Config & Guide */}
          <div style={{ flex: '1 1 340px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="glass-card" style={{ padding: '30px 20px', textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '16px', color: 'var(--text-primary)' }}>Chọn Cấp Độ</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginBottom: '24px' }}>
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

              <h3 style={{ fontSize: '1.3rem', marginBottom: '16px', color: 'var(--text-primary)' }}>Số Lượng Từ Vựng</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginBottom: '32px' }}>
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

              <button className="btn btn-primary" onClick={startGame} style={{ fontSize: '1.15rem', padding: '12px 32px', display: 'flex', alignItems: 'center', gap: '10px', margin: '0 auto' }}>
                <Play size={20} /> Bắt Đầu Chơi
              </button>
            </div>

            <div className="glass-card" style={{ padding: '24px 20px', textAlign: 'left' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '12px', color: 'var(--text-primary)' }}>📖 Hướng dẫn chơi</h3>
              <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.6', paddingLeft: '20px', margin: 0, fontSize: '0.95rem' }}>
                <li style={{ marginBottom: '8px' }}>Lật 2 thẻ giống nhau (1 thẻ Kanji/Hiragana và 1 thẻ nghĩa Tiếng Việt) để ghép cặp.</li>
                <li style={{ marginBottom: '8px' }}>Bạn có <strong>2 lượt Gợi ý</strong> (biểu tượng con mắt) để xem lướt qua tất cả các thẻ trong 1 giây.</li>
                <li>Ghép đúng tất cả các thẻ trong thời gian ngắn nhất và số lượt lật ít nhất để leo lên Bảng xếp hạng!</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Leaderboard */}
          <div style={{ flex: '1 1 340px' }}>
            <PodiumLeaderboard data={leaderboard} type="time" />
          </div>
        </div>
      )}

      {gameState === 'playing' && (
        loading ? (
          <div style={{ margin: 'auto' }}><MascotLoader message="Đang xáo bài..." /></div>
        ) : (
          <div className="animate-fade-in" style={{ 
            display: 'grid', 
            gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, 105px), 1fr))`, 
            gap: '12px', 
            width: '100%', 
            maxWidth: '1000px',
            perspective: '1000px' 
          }}>
            {cards.map((card, index) => {
              const isFlipped = flippedIndices.includes(index) || matchedIndices.includes(index) || isHintActive;
              const isMatched = matchedIndices.includes(index);

              return (
                <div 
                  key={index}
                  className="memory-card"
                  style={{
                    height: '115px',
                    position: 'relative',
                    cursor: isMatched ? 'default' : 'pointer',
                    transformStyle: 'preserve-3d',
                    transition: isMatched ? 'none' : 'transform 0.5s cubic-bezier(0.4, 0.2, 0.2, 1)',
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    animation: isMatched ? 'card-match-shatter 0.5s ease forwards' : 'none',
                  }}
                  onClick={(e) => handleCardClick(e, index)}
                >
                  {/* Back of card (Hidden, waiting to be clicked) */}
                  <div 
                    className="memory-card-back"
                    style={{
                      position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden',
                      background: 'linear-gradient(135deg, var(--accent-color), var(--accent-hover))',
                      borderRadius: '12px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: '2rem', fontWeight: 'bold',
                      border: '3px solid white',
                      transition: 'filter 0.2s'
                    }}
                  >
                    🌸
                  </div>
                  
                  {/* Front of card (Revealed with Word) */}
                  <div 
                    className="memory-card-front"
                    style={{
                      position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden',
                      borderRadius: '12px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transform: 'rotateY(180deg)',
                      padding: '10px',
                      textAlign: 'center'
                    }}
                  >
                    <span style={{ 
                      fontSize: card.type === 'jp' ? (card.content.length > 3 ? '2rem' : '3rem') : '1.3rem',
                      fontWeight: card.type === 'jp' ? 900 : 700,
                      fontFamily: card.type === 'jp' ? 'var(--font-jp)' : 'var(--font-ui)',
                      color: 'var(--text-primary)',
                      wordBreak: 'break-word',
                      lineHeight: '1.1'
                    }}>
                      {card.content}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {gameState === 'won' && (
        <div className="glass-card animate-fade-in" style={{ margin: 'auto', padding: '40px', width: '100%', maxWidth: '600px', textAlign: 'center', marginTop: '20px' }}>
          <Trophy size={60} color="#f59e0b" style={{ margin: '0 auto 15px' }} />
          <h2 style={{ fontSize: '2.2rem', marginBottom: '10px' }}>Chiến Thắng!</h2>
          <p style={{ fontSize: '1.2rem', marginBottom: '30px', color: 'var(--text-secondary)' }}>
            Hoàn thành trong <strong>{formatTime(time)}</strong> với <strong>{moves}</strong> lượt lật.
          </p>
          
          <PodiumLeaderboard data={leaderboard} type="time" />

          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={() => setGameState('lobby')}>Trở về sảnh</button>
            <button className="btn btn-primary" onClick={startGame} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={18} /> Chơi lại
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemoryMatchGame;
