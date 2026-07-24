import React, { useState, useEffect } from 'react';
import { Sun, RefreshCw, Layers, FileQuestion, Bot, ArrowLeft, Loader, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { studyApi, srsApi } from '../services/api';
import FlashcardPage from './FlashcardPage';
import AiTranslationStudy from './AiTranslationStudy';
import ReviewQuizPage from './ReviewQuizPage';
import MascotCorners from '../components/MascotCorners';
import SakuraPetals from '../components/SakuraPetals';

const MODES = {
  FLASHCARD: 'flashcard',
  QUIZ: 'quiz',
  AI: 'ai',
};

const ReviewHubPage = ({ mode = 'morning', goBack }) => {
  const { user } = useAuth();
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [queueSize, setQueueSize] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [selectedMode, setSelectedMode] = useState(null);
  const [words, setWords] = useState([]);

  const isMorning = mode === 'morning';

  // Fetch the relevant word count for the badge
  useEffect(() => {
    const load = async () => {
      setLoadingQueue(true);
      try {
        if (isMorning) {
          const resp = await studyApi.getQueue();
          setQueueSize(resp.queueSize || 0);
        } else {
          const resp = await srsApi.getTodayReviewed();
          setTodayCount(Array.isArray(resp) ? resp.length : 0);
          setWords(Array.isArray(resp) ? resp : []);
        }
      } catch (e) {
        console.error('Failed to load review queue:', e);
      } finally {
        setLoadingQueue(false);
      }
    };
    load();
  }, [isMorning]);

  // Render sub-mode pages
  if (selectedMode === MODES.FLASHCARD) {
    return (
      <FlashcardPage
        level={isMorning ? 'SRS' : 'TODAY'}
        isSrs={isMorning}
        isLearnedStudy={!isMorning}
        goBack={() => setSelectedMode(null)}
      />
    );
  }

  if (selectedMode === MODES.QUIZ) {
    return (
      <ReviewQuizPage
        mode={mode}
        goBack={() => setSelectedMode(null)}
      />
    );
  }

  if (selectedMode === MODES.AI) {
    return (
      <AiTranslationStudy
        mode={mode}
        goBack={() => setSelectedMode(null)}
      />
    );
  }

  const count = isMorning ? queueSize : todayCount;
  const label = isMorning ? 'thẻ cần ôn hôm nay' : 'từ đã học hôm nay';

  return (
    <div className="container animate-fade-in" style={{ padding: '40px 20px', minHeight: '100vh' }}>
      <MascotCorners
        leftMascot={null}
        rightMascot="mascot_siro_reading.png"
      />
      <SakuraPetals />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isMorning
            ? <Sun size={28} color="var(--accent-color)" />
            : <RefreshCw size={28} color="var(--success-color)" />
          }
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem' }}>
              {isMorning ? 'Ôn tập buổi sáng' : 'Ôn lại hôm nay'}
            </h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {isMorning
                ? 'Ôn lại kiến thức cũ dựa trên thuật toán FSRS thông minh'
                : 'Củng cố các từ bạn vừa học trong ngày hôm nay'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '10px',
        padding: '12px 24px',
        background: isMorning
          ? 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.1))'
          : 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(59,130,246,0.1))',
        border: `1px solid ${isMorning ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`,
        borderRadius: '50px',
        marginBottom: '40px',
      }}>
        {loadingQueue
          ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
          : <Sparkles size={16} color={isMorning ? '#f59e0b' : '#10b981'} />
        }
        <span style={{ fontWeight: 600, fontSize: '1rem' }}>
          {loadingQueue ? 'Đang tải...' : `${count} ${label}`}
        </span>
      </div>

      {/* Mode selection cards */}
      <h2 style={{ marginBottom: '24px', fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
        Chọn hình thức ôn tập
      </h2>
      <div className="grid grid-cols-3 home-level-grid" style={{ maxWidth: '900px' }}>

        {/* Flashcard */}
        <div
          className="card"
          onClick={() => setSelectedMode(MODES.FLASHCARD)}
          style={{
            cursor: 'pointer', padding: '32px 24px', textAlign: 'center',
            transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '16px',
            background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(59,130,246,0.05))',
            border: '1px solid rgba(139,92,246,0.25)',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Layers size={28} color="white" />
          </div>
          <div>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem' }}>Flashcard</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Lật thẻ + đánh giá mức độ nhớ theo FSRS. Hiển thị khoảng cách ôn tiếp theo.
            </p>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 'auto', width: '100%' }}>
            Bắt đầu →
          </button>
        </div>

        {/* Quiz */}
        <div
          className="card"
          onClick={() => setSelectedMode(MODES.QUIZ)}
          style={{
            cursor: 'pointer', padding: '32px 24px', textAlign: 'center',
            transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '16px',
            background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(6,182,212,0.05))',
            border: '1px solid rgba(16,185,129,0.25)',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FileQuestion size={28} color="white" />
          </div>
          <div>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem' }}>Trắc nghiệm</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              4 đáp án lựa chọn. Kiểm tra nhanh khả năng nhận diện từ vựng.
            </p>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 'auto', width: '100%', background: 'linear-gradient(135deg, #10b981, #06b6d4)', borderColor: 'transparent' }}>
            Bắt đầu →
          </button>
        </div>

        {/* AI Translation */}
        <div
          className="card"
          onClick={() => setSelectedMode(MODES.AI)}
          style={{
            cursor: 'pointer', padding: '32px 24px', textAlign: 'center',
            transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '16px',
            background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(245,158,11,0.05))',
            border: '1px solid rgba(239,68,68,0.25)',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #ef4444, #f59e0b)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Bot size={28} color="white" />
          </div>
          <div>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem' }}>🤖 Thử thách AI</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              AI sinh câu/đoạn văn Nhật. Bạn dịch → AI chấm điểm chi tiết & cập nhật SRS.
            </p>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 'auto', width: '100%', background: 'linear-gradient(135deg, #ef4444, #f59e0b)', borderColor: 'transparent' }}>
            Bắt đầu →
          </button>
        </div>

      </div>
    </div>
  );
};

export default ReviewHubPage;
