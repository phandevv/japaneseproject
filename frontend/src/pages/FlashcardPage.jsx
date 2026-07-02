import React, { useState, useEffect, useCallback } from 'react';
import { vocabApi } from '../services/api';
import FlashcardCard from '../components/FlashcardCard';
import { ArrowLeft, ArrowRight, Shuffle, Loader, CornerUpLeft } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const FlashcardPage = ({ level, goBack }) => {
  const { t } = useLanguage();
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [flipped, setFlipped] = useState(false);

  const fetchWords = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vocabApi.getRandomByLevel(level, 50);
      setWords(data);
      setCurrentIndex(0);
      setFlipped(false);
    } catch (error) {
      console.error("Failed to fetch words", error);
    } finally {
      setLoading(false);
    }
  }, [level]);

  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  // Keyboard navigation
  useEffect(() => {
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
      setCurrentIndex(prev => prev + 1);
      setFlipped(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setFlipped(false);
    }
  };

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
        <h2>{t.flashcard.noWords}</h2>
        <button className="btn btn-primary" onClick={goBack}>{t.flashcard.backDashboard}</button>
      </div>
    );
  }

  const progressPercentage = ((currentIndex + 1) / words.length) * 100;
  const currentWord = words[currentIndex];

  return (
    <div className="container animate-fade-in" style={{ padding: '20px', maxWidth: '800px' }}>

      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '30px' }}>
        <button className="btn btn-secondary" style={{ padding: '8px 15px' }} onClick={goBack}>
          <CornerUpLeft size={18} /> {t.flashcard.backDashboard}
        </button>

        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '5px' }}>
            {t.flashcard.level}: <span style={{ color: 'var(--accent-color)' }}>{level}</span>
          </h2>
        </div>

        <button className="btn btn-secondary" style={{ padding: '8px 15px' }} onClick={fetchWords}>
          <Shuffle size={18} /> {t.flashcard.shuffleNew}
        </button>
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
          word={currentWord}
          flipped={flipped}
          onFlip={() => setFlipped(!flipped)}
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
