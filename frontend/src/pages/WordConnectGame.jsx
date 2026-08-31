import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { vocabApi } from '../services/api';
import { ArrowLeft, RefreshCw, Trophy, Clock, Play, Check } from 'lucide-react';
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

const WordConnectGame = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [gameState, setGameState] = useState('lobby'); // lobby, playing, won
  const [selectedLevel, setSelectedLevel] = useState('N5');
  const [wordCount, setWordCount] = useState(10);
  
  const [cards, setCards] = useState([]);
  const [selectedCardIndex, setSelectedCardIndex] = useState(null);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [wrongIndices, setWrongIndices] = useState([]);

  // Load leaderboard when level or word count changes in lobby
  useEffect(() => {
    if (gameState === 'lobby') {
      const key = `nihongo-connect-leaderboard-${selectedLevel}-${wordCount}`;
      const scores = JSON.parse(localStorage.getItem(key) || '[]');
      setLeaderboard(scores);
    }
  }, [gameState, selectedLevel, wordCount]);

  const startGame = async () => {
    setLoading(true);
    setGameState('playing');
    try {
      const [words] = await Promise.all([
        vocabApi.getRandomByLevel(selectedLevel, wordCount),
        new Promise(resolve => setTimeout(resolve, 3000))
      ]);
      
      const gameCards = [];
      words.forEach(word => {
        gameCards.push({
          id: `${word.id}-jp`,
          wordId: word.id,
          content: word.kanji || word.hiragana,
          type: 'jp',
          isMatched: false
        });
        gameCards.push({
          id: `${word.id}-vi`,
          wordId: word.id,
          content: word.meaning,
          type: 'vi',
          isMatched: false
        });
      });
      
      const shuffled = gameCards.sort(() => Math.random() - 0.5);
      
      setCards(shuffled);
      setSelectedCardIndex(null);
      setWrongIndices([]);
      setMoves(0);
      setTime(0);
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
    if (gameState !== 'playing' || cards[index].isMatched) return;
    
    // Normal click sakura effect
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    spawnSakura(cx, cy, false);

    if (selectedCardIndex === null) {
      setSelectedCardIndex(index);
      return;
    }

    if (selectedCardIndex === index) {
      setSelectedCardIndex(null); // deselect
      return;
    }

    const card1 = cards[selectedCardIndex];
    const card2 = cards[index];

    if (card1.type === card2.type) {
      // Changed mind, select new card
      setSelectedCardIndex(index);
      return;
    }

    // Different types, check match
    setMoves(m => m + 1);

    if (card1.wordId === card2.wordId) {
      // Match!
      const newCards = [...cards];
      newCards[selectedCardIndex].isMatched = true;
      newCards[index].isMatched = true;
      setCards(newCards);
      setSelectedCardIndex(null);
      
      // Match burst effect
      setTimeout(() => {
        spawnSakura(cx, cy, true);
      }, 100);

      // Check win
      if (newCards.every(c => c.isMatched)) {
        setTimeout(() => handleWin(), 1000);
      }
    } else {
      // Wrong match
      setSelectedCardIndex(null);
      setWrongIndices([selectedCardIndex, index]);
      setTimeout(() => {
        setWrongIndices([]);
      }, 500); // clear red flash after 500ms
    }
  };

  const handleWin = () => {
    setGameState('won');
    // Save score
    const key = `nihongo-connect-leaderboard-${selectedLevel}-${wordCount}`;
    const scores = JSON.parse(localStorage.getItem(key) || '[]');
    const newScore = {
      id: Date.now(),
      playerName: user?.userName || 'Người chơi ẩn danh',
      time,
      moves,
      date: new Date().toISOString()
    };
    
    const updated = [...scores, newScore]
      .sort((a, b) => a.time - b.time || a.moves - b.moves)
      .slice(0, 10);
      
    localStorage.setItem(key, JSON.stringify(updated));
    setLeaderboard(updated);
  };

  const renderLobby = () => (
    <div className="flex-center flex-col animate-fade-in" style={{ padding: '40px 20px', minHeight: '60vh' }}>
      <div className="glass-card" style={{ maxWidth: '500px', width: '100%', padding: '40px' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '10px', textAlign: 'center' }}>Nối Từ</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '30px' }}>
          Tìm và nối các cặp từ Tiếng Nhật với Nghĩa Tiếng Việt tương ứng.
        </p>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Cấp độ JLPT</label>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {LEVELS.map(lvl => (
              <button
                key={lvl}
                className={`btn ${selectedLevel === lvl ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => setSelectedLevel(lvl)}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '40px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Số lượng từ</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            {WORD_COUNTS.map(count => (
              <button
                key={count}
                className={`btn ${wordCount === count ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => setWordCount(count)}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        <button 
          className="btn btn-primary" 
          style={{ width: '100%', padding: '15px', fontSize: '1.2rem', gap: '10px', display: 'flex', justifyContent: 'center' }}
          onClick={startGame}
        >
          <Play size={24} /> BẮT ĐẦU CHƠI
        </button>
      </div>

      <div style={{ marginTop: '40px', width: '100%', maxWidth: '800px' }}>
        <PodiumLeaderboard scores={leaderboard} />
      </div>
    </div>
  );

  const renderGame = () => {
    return (
      <div className="animate-fade-in" style={{ padding: '16px 12px', maxWidth: '1000px', margin: '0 auto' }}>
        <div className="flex-between" style={{ marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <button className="btn-icon" onClick={() => setGameState('lobby')} title="Thoát">
            <ArrowLeft size={22} />
          </button>
          
          <div className="glass-card" style={{ padding: '8px 16px', display: 'flex', gap: '16px' }}>
            <div className="flex-center" style={{ gap: '6px', fontWeight: 600, fontSize: '0.92rem' }}>
              <Clock size={16} color="var(--accent-color)" /> {formatTime(time)}
            </div>
            <div className="flex-center" style={{ gap: '6px', fontWeight: 600, fontSize: '0.92rem' }}>
              <RefreshCw size={16} color="var(--success-color)" /> {moves} bước
            </div>
          </div>
        </div>

        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 120px), 1fr))', 
            gap: '10px',
            marginTop: '16px'
          }}
        >
          {cards.map((card, index) => {
            const isSelected = selectedCardIndex === index;
            const isWrong = wrongIndices.includes(index);
            
            let bgColor = 'var(--surface-color)';
            let borderColor = 'var(--border-color)';
            let color = 'var(--text-primary)';
            
            if (card.isMatched) {
              bgColor = 'rgba(16, 185, 129, 0.1)';
              borderColor = 'var(--success-color)';
              color = 'var(--success-color)';
            } else if (isWrong) {
              bgColor = 'rgba(239, 68, 68, 0.1)';
              borderColor = '#ef4444';
              color = '#ef4444';
            } else if (isSelected) {
              bgColor = 'var(--accent-color)';
              borderColor = 'var(--accent-color)';
              color = 'white';
            }

            return (
              <button
                key={card.id}
                className="glass-card"
                disabled={card.isMatched}
                onClick={(e) => handleCardClick(e, index)}
                style={{
                  height: '100px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: card.type === 'vi' ? '1rem' : '1.5rem',
                  fontWeight: card.type === 'jp' ? 700 : 500,
                  padding: '10px',
                  cursor: card.isMatched ? 'default' : 'pointer',
                  backgroundColor: bgColor,
                  borderColor: borderColor,
                  color: color,
                  borderWidth: '2px',
                  borderStyle: 'solid',
                  transition: 'all 0.2s',
                  transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                  boxShadow: isSelected ? '0 10px 25px rgba(0,0,0,0.2)' : 'var(--shadow-sm)',
                  opacity: card.isMatched ? 0.4 : 1,
                  textAlign: 'center',
                  wordBreak: 'break-word',
                  fontFamily: card.type === 'jp' ? 'var(--font-jp)' : 'var(--font-sans)',
                  animation: isWrong ? 'shake 0.4s ease-in-out' : 'none'
                }}
              >
                {card.content}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWon = () => (
    <div className="flex-center flex-col animate-fade-in" style={{ padding: '40px 20px', minHeight: '60vh' }}>
      <div className="glass-card" style={{ maxWidth: '500px', width: '100%', padding: '40px', textAlign: 'center' }}>
        <div style={{ color: 'var(--warning-color)', marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
          <Trophy size={80} />
        </div>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Hoàn Thành!</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '30px', fontSize: '1.2rem' }}>
          Bạn đã nối đúng tất cả các từ.
        </p>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', marginBottom: '40px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>Thời gian</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-color)' }}>{formatTime(time)}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>Số bước</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success-color)' }}>{moves}</div>
          </div>
        </div>

        <button 
          className="btn btn-primary" 
          style={{ width: '100%', padding: '15px', fontSize: '1.2rem' }}
          onClick={() => setGameState('lobby')}
        >
          Chơi lại
        </button>
      </div>
      
      <div style={{ marginTop: '40px', width: '100%', maxWidth: '800px' }}>
        <PodiumLeaderboard scores={leaderboard} />
      </div>
    </div>
  );

  return (
    <div className="games-bg" style={{ minHeight: 'calc(100vh - 64px)' }}>
      {loading && <MascotLoader message="Đang xào bài..." />}
      {!loading && gameState === 'lobby' && renderLobby()}
      {!loading && gameState === 'playing' && renderGame()}
      {!loading && gameState === 'won' && renderWon()}
    </div>
  );
};

export default WordConnectGame;
