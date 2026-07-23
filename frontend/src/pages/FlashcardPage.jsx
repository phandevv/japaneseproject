import React, { useState, useEffect, useCallback } from 'react';
import { vocabApi, srsApi, analyticsApi, userSettingsApi, studyApi } from '../services/api';
import FlashcardCard from '../components/FlashcardCard';
import ShojiScreen from '../components/ShojiScreen';
import { ArrowLeft, ArrowRight, Shuffle, Loader, CornerUpLeft, Settings, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import MascotCorners from '../components/MascotCorners';
import SakuraPetals from '../components/SakuraPetals';

const levelColors = {
  N5: '#3b82f6',
  N4: '#10b981',
  N3: '#f59e0b',
  N2: '#ef4444',
  N1: '#8b5cf6',
  TU_LAY: '#ec4899',
  TRO_TU: '#06b6d4',
};

const FlashcardPage = ({ level: initialLevel, isSrs = false, stats, goBack, onDailyStudy, isLearnedStudy = false }) => {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [activeLevel, setActiveLevel] = useState(initialLevel);
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [seenWordIds, setSeenWordIds] = useState(new Set());
  const [showShoji, setShowShoji] = useState(false);

  // Day Selection States
  const [selectedDay, setSelectedDay] = useState(null);
  const [wordsPerDay, setWordsPerDay] = useState(20);
  const [completedDays, setCompletedDays] = useState(new Set());
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [phase, setPhase] = useState(1); // 0: Settings, 1: Day selection, 2: Study
  const [customInput, setCustomInput] = useState('');

  useEffect(() => {
    setActiveLevel(initialLevel);
  }, [initialLevel]);

  const handleSaveSettings = async (value) => {
    const val = parseInt(value, 10);
    if (!val || val <= 0) return;
    
    setLoadingSettings(true);
    try {
      if (isAuthenticated) {
        await userSettingsApi.saveSetting(activeLevel, val);
      } else {
        localStorage.setItem(`wordsPerDay_${activeLevel}`, val.toString());
        localStorage.setItem('wordsPerDay', val.toString());
      }
      setWordsPerDay(val);
      setPhase(1);
    } catch (error) {
      console.error("Failed to save settings in FlashcardPage:", error);
    } finally {
      setLoadingSettings(false);
    }
  };

  // Load level settings (words per day & completed days)
  useEffect(() => {
    const loadSettings = async () => {
      if (!activeLevel) return;
      setLoadingSettings(true);
      try {
        if (isAuthenticated) {
          const setting = await userSettingsApi.getSetting(activeLevel);
          if (setting && setting.wordsPerDay) {
            setWordsPerDay(setting.wordsPerDay);
          }
          if (setting && setting.completedDays) {
            const days = setting.completedDays.split(',')
              .filter(d => d.trim().length > 0)
              .map(d => parseInt(d, 10));
            setCompletedDays(new Set(days));
          } else {
            setCompletedDays(new Set());
          }
        } else {
          const savedWpd = localStorage.getItem(`wordsPerDay_${activeLevel}`) || localStorage.getItem('wordsPerDay');
          const savedCompleted = localStorage.getItem(`completedDays_${activeLevel}`);
          if (savedCompleted) {
            const days = savedCompleted.split(',').map(d => parseInt(d, 10));
            setCompletedDays(new Set(days));
          } else {
            setCompletedDays(new Set());
          }
          if (savedWpd) {
            setWordsPerDay(parseInt(savedWpd, 10));
          }
        }
      } catch (error) {
        console.error("Failed to load settings in FlashcardPage:", error);
      } finally {
        setLoadingSettings(false);
      }
    };
    loadSettings();
    setSelectedDay(null);
    setPhase(1);
  }, [activeLevel, isAuthenticated]);

  // Fetch words for immediate SRS or Learned study
  const fetchSrsOrLearnedWords = useCallback(async () => {
    if (!isSrs && !isLearnedStudy) return;
    setLoading(true);
    try {
      let data = [];
      if (isSrs) {
        // Use the new Gamified Priority Queue API for SRS
        const response = await studyApi.getQueue(activeLevel || 'N5');
        // Map WordReviewDto to what the UI expects (vocabulary + projections)
        data = response.queue.map(item => ({
          ...item.vocabulary,
          projections: item.projectedIntervals,
          wordReviewId: item.id
        }));
      } else if (isLearnedStudy) {
        if (activeLevel === 'TODAY') {
          data = await srsApi.getTodayReviewed();
        } else {
          data = await srsApi.getRandomLearnedWords(50);
        }
      }
      setWords(data);
      setCurrentIndex(0);
      setFlipped(false);
      setSeenWordIds(new Set());
    } catch (error) {
      console.error("Failed to fetch srs/learned words:", error);
      setWords([]);
    } finally {
      setLoading(false);
    }
  }, [isSrs, isLearnedStudy, activeLevel]);

  useEffect(() => {
    if (isSrs || isLearnedStudy) {
      fetchSrsOrLearnedWords();
    }
  }, [isSrs, isLearnedStudy, fetchSrsOrLearnedWords]);

  // Fetch words for specific day of selected level
  const fetchWordsForDay = useCallback(async (day) => {
    if (!activeLevel) return;
    setLoading(true);
    try {
      const totalWords = stats?.levels?.[activeLevel] || 0;
      const totalDays = Math.max(1, Math.floor(totalWords / wordsPerDay));
      let data = [];
      if (day === totalDays && totalWords > totalDays * wordsPerDay) {
        let currentDayPage = day - 1;
        while (true) {
          const paginated = await vocabApi.getByLevelPaginated(activeLevel, currentDayPage, wordsPerDay);
          if (!paginated || !paginated.content || paginated.content.length === 0) break;
          data = [...data, ...paginated.content];
          if (paginated.last) break;
          currentDayPage++;
        }
      } else {
        const paginated = await vocabApi.getByLevelPaginated(activeLevel, day - 1, wordsPerDay);
        data = paginated.content || [];
      }
      setWords(data);
      setSelectedDay(day);
      setCurrentIndex(0);
      setFlipped(false);
      setSeenWordIds(new Set());
    } catch (error) {
      console.error("Failed to fetch words for day:", error);
      setWords([]);
    } finally {
      setLoading(false);
    }
  }, [activeLevel, wordsPerDay, stats]);

  useEffect(() => {
    if (currentIndex !== null) {
      setFlipped(false);
    }
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (words.length === 0) return;
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable) return;
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

  const handleSessionComplete = async () => {
    setShowShoji(true);
  };

  const handleNext = () => {
    if (currentIndex < words.length - 1) {
      setFlipped(false);
      setCurrentIndex(prev => prev + 1);
    } else {
      handleSessionComplete();
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
      handleSessionComplete();
    }
  };

  const handleBack = () => {
    if (phase === 0) {
      setPhase(1);
    } else if (selectedDay !== null) {
      setSelectedDay(null);
      setPhase(1);
      setWords([]);
    } else if (!initialLevel && activeLevel) {
      setActiveLevel(null);
      setWords([]);
    } else {
      goBack();
    }
  };

  if (!activeLevel && !isSrs) {
    return (
      <div className="container animate-fade-in" style={{ padding: '40px 20px' }}>
        <MascotCorners leftMascot="mascot_siro_ninja.png" rightMascot="mascot_siro_studying.png" />
        <SakuraPetals />
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

  // Phase 0: Settings View
  if (activeLevel && !isSrs && !isLearnedStudy && phase === 0) {
    return (
      <div className="container animate-fade-in" style={{ padding: '20px', maxWidth: '600px', margin: '40px auto' }}>
        <button className="btn btn-secondary" onClick={() => setPhase(1)} style={{ marginBottom: '20px' }}>
          <CornerUpLeft size={18} /> Quay lại
        </button>
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '10px' }}>Cấu hình học tập</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>Số từ vựng học mỗi ngày:</p>
          
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
              placeholder="Nhập số từ khác"
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
            Lưu cài đặt
          </button>
        </div>
      </div>
    );
  }

  // Day Selection Screen (Skip for SRS and Learned Study modes)
  if (activeLevel && !isSrs && !isLearnedStudy && selectedDay === null && phase === 1) {
    if (loadingSettings) {
      return (
        <div className="flex-center" style={{ height: '70vh', flexDirection: 'column', gap: '20px' }}>
          <Loader size={40} className="animate-spin" style={{ color: 'var(--accent-color)' }} />
          <p>Loading settings...</p>
        </div>
      );
    }

    const totalWords = stats?.levels?.[activeLevel] || 0;
    const totalDays = Math.max(1, Math.floor(totalWords / wordsPerDay));

    const getWordCountForDay = (day) => {
      if (day === totalDays) {
        return Math.max(0, totalWords - ((totalDays - 1) * wordsPerDay));
      }
      return wordsPerDay;
    };

    return (
      <div className="container animate-fade-in" style={{ padding: '20px', maxWidth: '1000px' }}>
        <div className="flex-between" style={{ marginBottom: '30px' }}>
          <button className="btn btn-secondary" onClick={() => {
            if (!initialLevel) {
              setActiveLevel(null);
            } else {
              goBack();
            }
          }}>
            <CornerUpLeft size={18} /> {t.flashcard.backSelection || "Quay lại chọn cấp độ"}
          </button>
          <h2>Học Flashcard - <span style={{ color: 'var(--accent-color)' }}>{t.home.levelLabels[activeLevel] || activeLevel}</span></h2>
          <button className="btn btn-secondary" onClick={() => setPhase(0)}>
            <Settings size={18} /> Thay đổi cài đặt
          </button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <p style={{ color: 'var(--text-secondary)' }}>
            Chọn ngày học để bắt đầu luyện tập Flashcard. Mỗi ngày gồm {wordsPerDay} từ.
          </p>
        </div>

        <div className="grid grid-cols-4" style={{ gap: '15px' }}>
          {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
            const isDone = completedDays.has(day);
            return (
              <button
                key={day}
                className="card flex-center"
                style={{ 
                  padding: '20px', 
                  cursor: 'pointer', 
                  flexDirection: 'column', 
                  gap: '10px',
                  backgroundColor: isDone ? 'rgba(16, 185, 129, 0.1)' : 'var(--surface-color)',
                  borderColor: isDone ? 'var(--success-color)' : 'var(--border-color)',
                  borderWidth: '1.5px',
                  borderStyle: 'solid',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => fetchWordsForDay(day)}
              >
                <h3 style={{ fontSize: '1.2rem', color: isDone ? 'var(--success-color)' : 'var(--text-primary)' }}>
                  Ngày {day} {isDone && '✓'}
                </h3>
                <p style={{ fontSize: '0.9rem', color: isDone ? 'rgba(16, 185, 129, 0.85)' : 'var(--text-secondary)' }}>
                  {getWordCountForDay(day)} từ
                </p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }


  if (words.length === 0) {
    return (
      <div className="container flex-center" style={{ height: '70vh', flexDirection: 'column', gap: '20px' }}>
      <h2>
        {isSrs 
          ? "Bạn không có từ nào đến hạn ôn tập hôm nay! 🎉" 
          : isLearnedStudy 
            ? "Bạn chưa có từ đã học nào để học flashcard! Hãy hoàn thành bài học trước." 
            : t.flashcard.noWords}
      </h2>
      <button className="btn btn-primary" onClick={handleBack}>
        {isSrs || isLearnedStudy ? t.flashcard.backDashboard : (!initialLevel ? t.flashcard.backSelection : t.flashcard.backDashboard)}
      </button>
      </div>
    );
  }

  const progressPercentage = ((currentIndex + 1) / words.length) * 100;
  const currentWord = words[currentIndex];

  return (
    <div className="flashcard-page-premium-bg animate-fade-in">
      <MascotCorners leftMascot="mascot_siro_ninja.png" rightMascot="mascot_siro_studying.png" />
      <SakuraPetals />

      <div className="flashcard-content-wrapper">
        {/* Header */}
      <div className="flex-between" style={{ marginBottom: '30px' }}>
        <button className="btn btn-secondary" style={{ padding: '8px 15px' }} onClick={handleBack}>
          <CornerUpLeft size={18} /> {selectedDay !== null ? "Chọn ngày khác" : ((!initialLevel && activeLevel) ? t.flashcard.backSelection : t.flashcard.backDashboard)}
        </button>

        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '5px' }}>
            {isSrs ? "Ôn tập SRS" : isLearnedStudy ? "Flashcard từ đã học" : `${t.flashcard.level}: `}
            {!isSrs && !isLearnedStudy && <span style={{ color: 'var(--accent-color)' }}>{t.home.levelLabels[activeLevel] || activeLevel} (Ngày {selectedDay})</span>}
          </h2>
        </div>

        {!isSrs && !isLearnedStudy ? (
          <button className="btn btn-secondary" style={{ padding: '8px 15px' }} onClick={() => fetchWordsForDay(selectedDay)}>
            <Shuffle size={18} /> Trộn / Tải lại
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
          style={{
            width: '60px', height: '60px',
            backgroundColor: currentIndex === words.length - 1 ? 'var(--success-color)' : 'var(--accent-color)',
            color: currentIndex === words.length - 1 ? 'white' : 'white',
            border: currentIndex === words.length - 1 ? 'none' : 'none',
            cursor: 'pointer',
            boxShadow: currentIndex !== words.length - 1 ? '0 4px 14px 0 rgba(239, 68, 68, 0.39)' : '0 4px 14px 0 rgba(16, 185, 129, 0.39)'
          }}
        >
          {currentIndex === words.length - 1 ? <Check size={28} /> : <ArrowRight size={28} />}
        </button>
      </div>
      </div>
      
      <ShojiScreen 
        isOpen={showShoji} 
        onClose={() => {
          setShowShoji(false);
          handleBack();
        }}
        onRetry={() => {
          setShowShoji(false);
          setCurrentIndex(0);
          setFlipped(false);
        }}
        onNextDay={(!isSrs && selectedDay !== null) ? () => {
          setShowShoji(false);
          const nextDay = selectedDay + 1;
          setSelectedDay(nextDay);
          fetchWordsForDay(nextDay);
        } : null}
        message={isSrs ? "Chúc mừng! Bạn đã hoàn thành tất cả các từ cần ôn hôm nay." : "Bạn đã xem hết từ vựng ngày này! Hãy hoàn thành bài Quiz ở mục Học Hàng Ngày để tính hoàn thành ngày học."} 
      />
    </div>
  );
};

export default FlashcardPage;

