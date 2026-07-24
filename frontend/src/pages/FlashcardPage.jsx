import React, { useState, useEffect, useCallback } from 'react';
import { vocabApi, srsApi, analyticsApi, userSettingsApi, studyApi } from '../services/api';
import FlashcardCard from '../components/FlashcardCard';
import ShojiScreen from '../components/ShojiScreen';
import { ArrowLeft, ArrowRight, Shuffle, CornerUpLeft, Settings, Check, Loader, Sparkles, Play } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import MascotCorners from '../components/MascotCorners';
import SakuraPetals from '../components/SakuraPetals';
import MascotLoader from '../components/MascotLoader';

const levelColors = {
  N5: '#3b82f6',
  N4: '#10b981',
  N3: '#f59e0b',
  N2: '#ef4444',
  N1: '#8b5cf6',
  TU_LAY: '#ec4899',
  TRO_TU: '#06b6d4',
};

const DEFAULT_LEVEL_COUNTS = {
  N5: 600, N4: 700, N3: 800, N2: 900, N1: 1000, TU_LAY: 200, TRO_TU: 100
};

const FlashcardPage = ({ level: initialLevel, isSrs = false, stats, goBack, onDailyStudy, isLearnedStudy = false }) => {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [activeLevel, setActiveLevel] = useState(initialLevel);
  const [localStats, setLocalStats] = useState(stats);
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

  // Load stats if missing or empty
  useEffect(() => {
    if (stats && stats.levels) {
      setLocalStats(stats);
    } else {
      vocabApi.getStats()
        .then(data => {
          if (data && data.levels) setLocalStats(data);
        })
        .catch(err => console.error("Failed to fetch level stats in FlashcardPage:", err));
    }
  }, [stats]);

  const activeStatsLevels = stats?.levels || localStats?.levels || DEFAULT_LEVEL_COUNTS;

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
        try {
          const response = await studyApi.getQueue(activeLevel || 'N5');
          const rawItems = Array.isArray(response) ? response : (response?.queue || response?.content || []);
          data = rawItems.map(item => ({
            ...(item.vocabulary || item),
            projections: item.projectedIntervals || item.projections,
            wordReviewId: item.id
          }));
        } catch (queueErr) {
          console.warn("Queue API fallback to due words:", queueErr);
          const dueData = await srsApi.getDueWords();
          data = Array.isArray(dueData) ? dueData : (dueData?.content || []);
        }
      } else if (isLearnedStudy) {
        if (activeLevel === 'TODAY') {
          data = await srsApi.getTodayReviewed();
        } else {
          data = await srsApi.getRandomLearnedWords(50);
        }
      }
      setWords(data || []);
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
      const totalWords = activeStatsLevels[activeLevel] || DEFAULT_LEVEL_COUNTS[activeLevel] || 600;
      const totalDays = Math.max(1, Math.floor(totalWords / wordsPerDay));
      let data = [];
      if (day === totalDays && totalWords > totalDays * wordsPerDay) {
        let currentDayPage = day - 1;
        while (true) {
          const paginated = await vocabApi.getByLevelPaginated(activeLevel, currentDayPage, wordsPerDay);
          const pageItems = Array.isArray(paginated) ? paginated : (paginated?.content || []);
          if (pageItems.length === 0) break;
          data = [...data, ...pageItems];
          if (paginated?.last) break;
          currentDayPage++;
        }
      } else {
        const paginated = await vocabApi.getByLevelPaginated(activeLevel, day - 1, wordsPerDay);
        data = Array.isArray(paginated) ? paginated : (paginated?.content || []);
      }

      // Robust Fallback if backend returned empty array for page
      if (!data || data.length === 0) {
        const randomData = await vocabApi.getRandomByLevel(activeLevel, wordsPerDay);
        data = Array.isArray(randomData) ? randomData : [];
      }

      setWords(data || []);
      setSelectedDay(day);
      setCurrentIndex(0);
      setFlipped(false);
      setSeenWordIds(new Set());
    } catch (error) {
      console.error("Failed to fetch words for day, attempting random fallback:", error);
      try {
        const fallbackData = await vocabApi.getRandomByLevel(activeLevel, wordsPerDay);
        setWords(fallbackData || []);
        setSelectedDay(day);
      } catch (fbErr) {
        setWords([]);
      }
    } finally {
      setLoading(false);
    }
  }, [activeLevel, wordsPerDay, activeStatsLevels]);

  // Quick Start Handler: Learn random words directly
  const handleQuickStartRandom = async () => {
    if (!activeLevel) return;
    setLoading(true);
    try {
      const randomData = await vocabApi.getRandomByLevel(activeLevel, wordsPerDay || 20);
      const data = Array.isArray(randomData) ? randomData : [];
      setWords(data);
      setSelectedDay(1);
      setCurrentIndex(0);
      setFlipped(false);
      setSeenWordIds(new Set());
    } catch (e) {
      console.error("Failed to load quick start random words:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionComplete = useCallback(() => {
    setShowShoji(true);
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < words.length - 1) {
      setFlipped(false);
      setCurrentIndex(prev => prev + 1);
    } else {
      handleSessionComplete();
    }
  }, [currentIndex, words.length, handleSessionComplete]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setFlipped(false);
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const handleRateWord = useCallback(async (quality) => {
    if (words.length === 0) return;
    const currentWord = words[currentIndex];
    if (!currentWord) return;

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
        await analyticsApi.logSession(isNew ? 1 : 0, quality >= 3 ? 1 : 0, 1);
      } catch (error) {
        console.error("Failed to save SRS review:", error);
      }
    }

    if (currentIndex < words.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setFlipped(false);
    } else {
      handleSessionComplete();
    }
  }, [words, currentIndex, seenWordIds, isAuthenticated, handleSessionComplete]);

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
      } else if (e.key === '1') {
        e.preventDefault();
        handleRateWord(1);
      } else if (e.key === '2') {
        e.preventDefault();
        handleRateWord(2);
      } else if (e.key === '3') {
        e.preventDefault();
        handleRateWord(3);
      } else if (e.key === '4') {
        e.preventDefault();
        handleRateWord(4);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [words.length, handleNext, handlePrev, handleRateWord]);

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

  // ── Level Selection Screen (when level is not selected yet) ────────────────
  if (!activeLevel && !isSrs) {
    return (
      <div className="container animate-fade-in" style={{ padding: '40px 20px', maxWidth: '1000px', margin: '0 auto' }}>
        <MascotCorners leftMascot="mascot_siro_ninja.png" rightMascot="mascot_siro_studying.png" />
        <SakuraPetals />
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '12px', fontWeight: 800 }}>{t.flashcard.selectLevelTitle}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>{t.flashcard.selectLevelSubtitle}</p>
        </div>

        <div className="grid grid-cols-3 home-level-grid" style={{ gap: '20px' }}>
          {activeStatsLevels &&
            Object.entries(activeStatsLevels).map(([lvl, count]) => (
              <div
                key={lvl}
                className="card home-level-card"
                style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '220px', padding: '24px', borderRadius: '18px' }}
                onClick={() => setActiveLevel(lvl)}
              >
                <div className="home-level-card-title">
                  <div>
                    <p className="home-level-badge" style={{ backgroundColor: `${levelColors[lvl] || '#3b82f6'}22`, color: levelColors[lvl] || '#3b82f6', fontWeight: 700 }}>
                      {t.home.levelLabels[lvl] || lvl}
                    </p>
                    <h3 style={{ marginTop: '10px', fontSize: '1.4rem' }}>{t.home.levelLabels[lvl] || lvl}</h3>
                  </div>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{count} {t.home.words}</span>
                </div>
                <p style={{ margin: '15px 0', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {t.home.levelDescriptions?.[lvl] || t.home.levelDesc(t.home.levelLabels[lvl] || lvl)}
                </p>
                <div style={{ marginTop: 'auto', display: 'flex', gap: '10px' }} onClick={e => e.stopPropagation()}>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '10px 14px', fontSize: '0.9rem', fontWeight: 700 }}
                    onClick={() => setActiveLevel(lvl)}
                  >
                    {t.flashcard.startPractice}
                  </button>
                  {onDailyStudy && (
                    <button
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '10px 14px', fontSize: '0.9rem' }}
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
      <div className="container" style={{ padding: '20px', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <MascotLoader message={t.flashcard.loading || "Đang chuẩn bị thẻ Flashcard..."} />
      </div>
    );
  }

  // Phase 0: Settings View
  if (activeLevel && !isSrs && !isLearnedStudy && phase === 0) {
    return (
      <div className="container animate-fade-in" style={{ padding: '20px', maxWidth: '600px', margin: '40px auto' }}>
        <button className="btn btn-secondary" onClick={() => setPhase(1)} style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CornerUpLeft size={18} /> Quay lại
        </button>
        <div className="card" style={{ padding: '40px', textAlign: 'center', borderRadius: '20px' }}>
          <h2 style={{ marginBottom: '10px', fontSize: '1.6rem' }}>Cấu hình học tập</h2>
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
                  padding: '12px 24px',
                  borderRadius: '12px'
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
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--surface-color)',
                color: 'var(--text-primary)',
                width: '200px',
                textAlign: 'center',
                fontSize: '1rem'
              }}
            />
          </div>

          <button
            className="btn btn-primary"
            style={{ padding: '14px 40px', fontSize: '1.1rem', width: '100%', borderRadius: '12px', fontWeight: 700 }}
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
          <p>Tải cấu hình...</p>
        </div>
      );
    }

    const totalWords = activeStatsLevels[activeLevel] || DEFAULT_LEVEL_COUNTS[activeLevel] || 600;
    const totalDays = Math.max(1, Math.floor(totalWords / wordsPerDay));

    const getWordCountForDay = (day) => {
      if (day === totalDays) {
        return Math.max(0, totalWords - ((totalDays - 1) * wordsPerDay));
      }
      return wordsPerDay;
    };

    return (
      <div className="container animate-fade-in" style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
        <div className="flex-between" style={{ marginBottom: '24px' }}>
          <button className="btn btn-secondary" onClick={() => {
            if (!initialLevel) {
              setActiveLevel(null);
            } else {
              goBack();
            }
          }} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CornerUpLeft size={18} /> {t.flashcard.backSelection || "Quay lại chọn cấp độ"}
          </button>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>
            Học Flashcard - <span style={{ color: levelColors[activeLevel] || 'var(--accent-color)' }}>{t.home.levelLabels[activeLevel] || activeLevel}</span>
          </h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary" onClick={handleQuickStartRandom} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
              <Play size={16} /> Học ngẫu nhiên 20 từ
            </button>
            <button className="btn btn-secondary" onClick={() => setPhase(0)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Settings size={16} /> Cài đặt
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
            Chọn ngày học để bắt đầu luyện tập Flashcard. Mỗi ngày gồm <strong>{wordsPerDay} từ vựng</strong>.
          </p>
        </div>

        <div className="grid grid-cols-4" style={{ gap: '16px' }}>
          {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
            const isDone = completedDays.has(day);
            return (
              <button
                key={day}
                className="card"
                style={{
                  padding: '20px',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: isDone ? 'rgba(16, 185, 129, 0.1)' : 'var(--surface-color)',
                  borderColor: isDone ? 'var(--success-color)' : 'var(--border-color)',
                  borderWidth: '1.5px',
                  borderStyle: 'solid',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => fetchWordsForDay(day)}
              >
                <h3 style={{ fontSize: '1.25rem', margin: 0, color: isDone ? 'var(--success-color)' : 'var(--text-primary)' }}>
                  Ngày {day} {isDone && '✓'}
                </h3>
                <p style={{ fontSize: '0.9rem', margin: 0, color: isDone ? 'rgba(16, 185, 129, 0.85)' : 'var(--text-secondary)' }}>
                  {getWordCountForDay(day)} từ
                </p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Flashcard Viewer Screen ────────────────────────────────────────────────
  if (words.length === 0) {
    return (
      <div className="container flex-center animate-fade-in" style={{ height: '70vh', flexDirection: 'column', gap: '20px', textAlign: 'center' }}>
        <h2>
          {isSrs
            ? "Bạn không có từ nào đến hạn ôn tập hôm nay! 🎉"
            : isLearnedStudy
              ? "Bạn chưa có từ đã học nào để học flashcard! Hãy hoàn thành bài học trước."
              : t.flashcard.noWords || "Không tìm thấy từ vựng cho phạm vi này."}
        </h2>
        <button className="btn btn-primary" onClick={handleBack} style={{ padding: '12px 28px', borderRadius: '12px', fontWeight: 700 }}>
          {isSrs || isLearnedStudy ? t.flashcard.backDashboard || "Quay về trang chủ" : (!initialLevel ? t.flashcard.backSelection || "Quay lại chọn cấp độ" : t.flashcard.backDashboard || "Quay lại")}
        </button>
      </div>
    );
  }

  const progressPercentage = ((currentIndex + 1) / words.length) * 100;
  const currentWord = words[currentIndex];

  return (
    <div className="flashcard-page-premium-bg animate-fade-in" style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <MascotCorners leftMascot="mascot_siro_ninja.png" rightMascot="mascot_siro_studying.png" />
      <SakuraPetals />

      <div className="flashcard-content-wrapper">
        {/* Header */}
        <div className="flex-between" style={{ marginBottom: '24px' }}>
          <button className="btn btn-secondary" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={handleBack}>
            <CornerUpLeft size={18} /> {selectedDay !== null ? "Chọn ngày khác" : ((!initialLevel && activeLevel) ? t.flashcard.backSelection : t.flashcard.backDashboard)}
          </button>

          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.4rem', margin: 0 }}>
              {isSrs ? "Ôn tập SRS" : isLearnedStudy ? "Flashcard từ đã học" : `${t.flashcard.level}: `}
              {!isSrs && !isLearnedStudy && <span style={{ color: levelColors[activeLevel] || 'var(--accent-color)' }}>{t.home.levelLabels[activeLevel] || activeLevel} (Ngày {selectedDay})</span>}
            </h2>
          </div>

          {!isSrs && !isLearnedStudy ? (
            <button className="btn btn-secondary" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => fetchWordsForDay(selectedDay)}>
              <Shuffle size={18} /> Trộn từ
            </button>
          ) : (
            <div style={{ width: '100px' }}></div>
          )}
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: '32px' }}>
          <div className="flex-between" style={{ marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <span>Thẻ {currentIndex + 1} / {words.length}</span>
            <span>{Math.round(progressPercentage)}% hoàn thành</span>
          </div>
          <div className="progress-bg" style={{ height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
            <div className="progress-fill" style={{ width: `${progressPercentage}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #10b981)', borderRadius: '4px' }}></div>
          </div>
        </div>

        {/* Flashcard Area */}
        <div style={{ minHeight: '440px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FlashcardCard
            key={currentWord?.id || currentIndex}
            word={currentWord}
            flipped={flipped}
            onFlip={() => setFlipped(!flipped)}
            onRateWord={handleRateWord}
          />
        </div>

        {/* Navigation Controls */}
        <div className="flex-center" style={{ gap: '24px', marginTop: '32px' }}>
          <button
            className="btn-icon"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            style={{ width: '56px', height: '56px', borderRadius: '50%', opacity: currentIndex === 0 ? 0.4 : 1, cursor: currentIndex === 0 ? 'not-allowed' : 'pointer' }}
          >
            <ArrowLeft size={26} />
          </button>

          <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', textAlign: 'center', minWidth: '180px', lineHeight: 1.4 }}>
            Phím <strong>1-4</strong> hoặc <strong>Forgot/Good/Easy</strong> để đánh giá<br />
            Phím <strong>← →</strong> chuyển thẻ | <strong>Space</strong> lật thẻ
          </div>

          <button
            className="btn-icon"
            onClick={handleNext}
            style={{
              width: '56px', height: '56px', borderRadius: '50%',
              backgroundColor: currentIndex === words.length - 1 ? '#10b981' : 'var(--accent-color)',
              color: 'white', border: 'none', cursor: 'pointer',
              boxShadow: currentIndex !== words.length - 1 ? '0 4px 14px rgba(37,99,235,0.35)' : '0 4px 14px rgba(16,185,129,0.35)'
            }}
          >
            {currentIndex === words.length - 1 ? <Check size={26} /> : <ArrowRight size={26} />}
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
