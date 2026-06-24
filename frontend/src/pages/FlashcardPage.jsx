import React, { useState, useEffect, useCallback } from 'react';
import { vocabApi } from '../services/api';
import FlashcardCard from '../components/FlashcardCard';
import { ArrowLeft, ArrowRight, Shuffle, Loader, CornerUpLeft } from 'lucide-react';

const FlashcardPage = ({ level, goBack }) => {
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [flipped, setFlipped] = useState(false);

  const fetchWords = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch 50 random words for the session
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
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
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
        <p>Preparing your flashcards...</p>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="container flex-center" style={{ height: '70vh', flexDirection: 'column', gap: '20px' }}>
        <h2>No words found for this level.</h2>
        <button className="btn btn-primary" onClick={goBack}>Go Back</button>
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
          <CornerUpLeft size={18} /> Back to Dashboard
        </button>
        
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '5px' }}>
            Level: <span style={{ color: 'var(--accent-color)' }}>{level}</span>
          </h2>
        </div>
        
        <button className="btn btn-secondary" style={{ padding: '8px 15px' }} onClick={fetchWords}>
          <Shuffle size={18} /> Shuffle New
        </button>
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: '40px' }}>
        <div className="flex-between" style={{ marginBottom: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          <span>Card {currentIndex + 1} of {words.length}</span>
          <span>{Math.round(progressPercentage)}% Complete</span>
        </div>
        <div className="progress-bg">
          <div className="progress-fill" style={{ width: `${progressPercentage}%` }}></div>
        </div>
      </div>

      {/* Flashcard Area */}
      <div style={{ minHeight: '450px', display: 'flex', alignItems: 'center' }}>
        <FlashcardCard 
          word={currentWord} 
          onFlip={setFlipped} 
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
          Use ← → to navigate<br/>Space to flip
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
