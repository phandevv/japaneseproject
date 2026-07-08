import React, { useState, useEffect, useCallback } from 'react';
import { vocabApi, srsApi, analyticsApi } from '../services/api';
import FlashcardCard from '../components/FlashcardCard';
import { ArrowLeft, ArrowRight, Shuffle, Loader, CornerUpLeft } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

const levelColors = {
  N5: '#3b82f6',
  N4: '#10b981',
  N3: '#f59e0b',
  N2: '#ef4444',
  N1: '#8b5cf6',
  TU_LAY: '#ec4899',
  TRO_TU: '#06b6d4',
};

const FlashcardPage = ({ level: initialLevel, isSrs = false, stats, goBack, onDailyStudy }) => {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [activeLevel, setActiveLevel] = useState(initialLevel);
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [seenWordIds, setSeenWordIds] = useState(new Set());

  useEffect(() => {
    setActiveLevel(initialLevel);
  }, [initialLevel]);

  const fetchWords = useCallback(async () => {
    if (!isSrs && !activeLevel) return;
    setLoading(true);
    try {
      let data = [];
      if (isSrs) {
        data = await srsApi.getDueWords();
      } else {
        data = await vocabApi.getRandomByLevel(activeLevel, 50);
      }
      setWords(data);
      setCurrentIndex(0);
      setFlipped(false);
      setSeenWordIds(new Set());
    } catch (error) {
      console.error("Failed to fetch words", error);
      setWords([]);
    } finally {
      setLoading(false);
    }
  }, [activeLevel, isSrs]);

  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  useEffect(() => {
    if (currentIndex !== null) {
      setFlipped(false);
    }
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (words.length === 0) return;
    const handleKeyDown = (e) => {
      if (e.key === ' ') {
        e.preventDefault();
        setFlipped(prev => !prev);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFlipped(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, words.length]);

  const handleNext = () => {
    if (currentIndex < words.length - 1) {
      setFlipped(false);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setFlipped(false);
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleRateWord = async (quality) => {
    if (words.length === 0) return;
    const currentWord = words[currentIndex];

    const isNew = !seenWordIds.has(currentWord.id);
    if (isNew) {
      setSeenWordIds(prev => {
        const next = new Set(prev);
        next.add(currentWord.id);
        return next;
      });
    }

    if (isAuthenticated) {
      try {
        await srsApi.reviewWord(currentWord.id, quality);
        // Log study session: 1 word studied if new, 1 correct if quality is Good/Easy, total questions 1
        await analyticsApi.logSession(isNew ? 1 : 0, quality >= 3 ? 1 : 0, 1);
      } catch (error) {
        console.error("Failed to save SRS review:", error);
      }
    }

    // Advance to next word
    if (currentIndex < words.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setFlipped(false);
    } else {
      alert(isSrs ? "Chúc mừng! Bạn đã hoàn thành tất cả các từ cần ôn hôm nay." : "Bạn đã học hết xấp thẻ này!");
    }
  };

  const handleBack = () => {
    if (!initialLevel && activeLevel) {
      setActiveLevel(null);
      setWords([]);
    } else {
      goBack();
    }
  };

  if (!activeLevel && !isSrs) {
    return (
      <div className="container animate-fade-in" style={{ padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '15px' }}>{t.flashcard.selectLevelTitle}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{t.flashcard.selectLevelSubtitle}</p>
        </div>

          <div className="grid grid-cols-3 home-level-grid">
          {stats && stats.levels &&
            Object.entries(stats.levels).map(([lvl, count]) => (
              <div 
                key={lvl} 
                className="card home-level-card" 
                style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '220px' }} 
                onClick={() => setActiveLevel(lvl)}
              >
                <div className="home-level-card-title">
                  <div>
                    <p className="home-level-badge" style={{ backgroundColor: `${levelColors[lvl]}22`, color: levelColors[lvl] }}>
                      {t.home.levelLabels[lvl] || lvl}
                    </p>
                    <h3 style={{ marginTop: '10px' }}>{t.home.levelLabels[lvl] || lvl}</h3>
                  </div>
                  <span>{count} {t.home.words}</span>
                </div>
                <p style={{ margin: '15px 0' }}>{t.home.levelDescriptions?.[lvl] || t.home.levelDesc(t.home.levelLabels[lvl] || lvl)}</p>
                <div style={{ marginTop: 'auto', display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                  <button 
                    className="btn btn-primary" 
                    style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
                    onClick={() => setActiveLevel(lvl)}
                  >
                    {t.flashcard.startPractice}
                  </button>
                  {onDailyStudy && (
                    <button 
                      className="btn btn-secondary" 
                      style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
                      onClick={() => onDailyStudy(lvl)}
                    >
                      📅 Học hàng ngày
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="flex-center" style={{ height: '70vh', flexDirection: 'column', gap: '20px' }}>
        <Loader size={40} className="animate-spin" style={{ color: 'var(--accent-color)' }} />
        <p>{t.flashcard.loading}</p>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="container flex-center" style={{ height: '70vh', flexDirection: 'column', gap: '20px' }}>
      <h2>{isSrs ? "Bạn không có từ nào đến hạn ôn tập hôm nay! 🎉" : t.flashcard.noWords}</h2>
      <button className="btn btn-primary" onClick={handleBack}>
        {isSrs ? t.flashcard.backDashboard : (!initialLevel ? t.flashcard.backSelection : t.flashcard.backDashboard)}
      </button>
      </div>
    );
  }

  const progressPercentage = ((currentIndex + 1) / words.length) * 100;
  const currentWord = words[currentIndex];

  return (
    <div className="container animate-fade-in" style={{ padding: '20px', maxWidth: '800px' }}>

      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '30px' }}>
        <button className="btn btn-secondary" style={{ padding: '8px 15px' }} onClick={handleBack}>
          <CornerUpLeft size={18} /> {(!initialLevel && activeLevel) ? t.flashcard.backSelection : t.flashcard.backDashboard}
        </button>

        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '5px' }}>
            {isSrs ? "Ôn tập SRS" : `${t.flashcard.level}: `}
            {!isSrs && <span style={{ color: 'var(--accent-color)' }}>{t.home.levelLabels[activeLevel] || activeLevel}</span>}
          </h2>
        </div>

        {!isSrs ? (
          <button className="btn btn-secondary" style={{ padding: '8px 15px' }} onClick={fetchWords}>
            <Shuffle size={18} /> {t.flashcard.shuffleNew}
          </button>
        ) : (
          <div style={{ width: '100px' }}></div>
        )}
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: '40px' }}>
        <div className="flex-between" style={{ marginBottom: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          <span>{t.flashcard.card} {currentIndex + 1} {t.flashcard.of} {words.length}</span>
          <span>{Math.round(progressPercentage)}{t.flashcard.complete}</span>
        </div>
        <div className="progress-bg">
          <div className="progress-fill" style={{ width: `${progressPercentage}%` }}></div>
        </div>
      </div>

      {/* Flashcard Area */}
      <div style={{ minHeight: '450px', display: 'flex', alignItems: 'center' }}>
        <FlashcardCard
          key={currentWord?.id}
          word={currentWord}
          flipped={flipped}
          onFlip={() => setFlipped(!flipped)}
          onRateWord={isAuthenticated ? handleRateWord : null}
        />
      </div>

      {/* Controls */}
      <div className="flex-center" style={{ gap: '20px', marginTop: '40px' }}>
        <button
          className="btn-icon"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          style={{ width: '60px', height: '60px', opacity: currentIndex === 0 ? 0.5 : 1, cursor: currentIndex === 0 ? 'not-allowed' : 'pointer' }}
        >
          <ArrowLeft size={28} />
        </button>

        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', minWidth: '150px' }}>
          {t.flashcard.navigate}<br/>{t.flashcard.flip}
        </div>

        <button
          className="btn-icon"
          onClick={handleNext}
          disabled={currentIndex === words.length - 1}
          style={{
            width: '60px', height: '60px',
            backgroundColor: currentIndex === words.length - 1 ? 'var(--surface-color)' : 'var(--accent-color)',
            color: currentIndex === words.length - 1 ? 'var(--text-primary)' : 'white',
            border: currentIndex === words.length - 1 ? '1px solid var(--border-color)' : 'none',
            opacity: currentIndex === words.length - 1 ? 0.5 : 1,
            cursor: currentIndex === words.length - 1 ? 'not-allowed' : 'pointer',
            boxShadow: currentIndex !== words.length - 1 ? '0 4px 14px 0 rgba(239, 68, 68, 0.39)' : 'none'
          }}
        >
          <ArrowRight size={28} />
        </button>
      </div>

    </div>
  );
};

export default FlashcardPage;

