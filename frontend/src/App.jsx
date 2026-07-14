import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import HomePage from './pages/HomePage';
import FlashcardPage from './pages/FlashcardPage';
import SearchPage from './pages/SearchPage';
import ProfileModal from './components/ProfileModal';
import DailyStudyPage from './pages/DailyStudyPage';
import AuthPage from './pages/AuthPage';
import VocabAdminPage from './pages/VocabAdminPage';
import { useAuth } from './context/AuthContext';
import PomodoroTimer from './components/PomodoroTimer';
import SrsListPage from './pages/SrsListPage';
import FeedbackModal from './components/FeedbackModal';
import FeedbackAdminPage from './pages/FeedbackAdminPage';
import AiEnrichmentAdminPage from './pages/AiEnrichmentAdminPage';

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const updateStreakForToday = (currentUser) => {
  if (!currentUser?.userName) return currentUser;

  const today = getTodayKey();
  const lastStudyDate = currentUser.lastStudyDate;
  let streak = currentUser.streak || 0;

  if (lastStudyDate === today) return currentUser;

  if (lastStudyDate) {
    const lastDate = new Date(lastStudyDate);
    const todayDate = new Date(today);
    const diffDays = Math.round((todayDate - lastDate) / (1000 * 60 * 60 * 24));
    streak = diffDays === 1 ? streak + 1 : 1;
  } else {
    streak = 1;
  }

  return { ...currentUser, streak, lastStudyDate: today };
};

function App() {
  const { user: authUser, logout: authLogout, isAuthenticated } = useAuth();
  const [currentPage, setCurrentPage] = useState(() => localStorage.getItem('nihongo-currentPage') || 'home');
  const [selectedLevel, setSelectedLevel] = useState(() => {
    const val = localStorage.getItem('nihongo-selectedLevel');
    return val === 'null' ? null : val;
  });
  const [stats, setStats] = useState(null);
  const [showStudySection, setShowStudySection] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  useEffect(() => {
    localStorage.setItem('nihongo-currentPage', currentPage);
  }, [currentPage]);

  useEffect(() => {
    if (selectedLevel !== null) {
      localStorage.setItem('nihongo-selectedLevel', selectedLevel);
    } else {
      localStorage.removeItem('nihongo-selectedLevel');
    }
  }, [selectedLevel]);

  // Streak state associated with the active user (username or 'guest')
  const [userStreakData, setUserStreakData] = useState(null);

  const activeUsername = isAuthenticated ? authUser?.username : 'guest';
  const streakStorageKey = `nihongo-streak-${activeUsername}`;

  useEffect(() => {
    const stored = localStorage.getItem(streakStorageKey);
    if (stored) {
      try {
        setUserStreakData(JSON.parse(stored));
      } catch {
        setUserStreakData({ userName: activeUsername, streak: 0, lastStudyDate: null });
      }
    } else {
      setUserStreakData({ userName: activeUsername, streak: 0, lastStudyDate: null });
    }
  }, [activeUsername, streakStorageKey]);

  // Fetch stats once at app level
  useEffect(() => {
    import('./services/api').then(({ vocabApi }) => {
      vocabApi.getStats().then(setStats).catch(console.error);
    });
  }, []);

  const handleLogout = async () => {
    await authLogout();
    setCurrentPage('home');
    setShowStudySection(false);
  };

  const handleLoginSuccess = () => {
    setCurrentPage('home');
    setShowStudySection(true);
  };

  const startStudy = (level, mode = 'flashcard') => {
    setSelectedLevel(level);
    setCurrentPage(mode);
    setShowStudySection(false);

    if (userStreakData) {
      const updatedUser = updateStreakForToday(userStreakData);
      setUserStreakData(updatedUser);
      localStorage.setItem(streakStorageKey, JSON.stringify(updatedUser));
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <HomePage 
            startStudy={startStudy} 
            user={isAuthenticated ? authUser : null} 
            streak={userStreakData?.streak || 0} 
            onLoginClick={() => {
              setCurrentPage('auth');
              setShowStudySection(false);
            }}
            onDailyClick={() => {
              if (isAuthenticated) {
                setSelectedLevel(null);
                setCurrentPage('daily');
              } else {
                setCurrentPage('auth');
              }
            }}
            onAdminClick={() => setCurrentPage('admin-vocab')}
            showStudySection={showStudySection}
          />
        );
      case 'auth':
        return <AuthPage onCancel={() => setCurrentPage('home')} onSuccess={handleLoginSuccess} />;
      case 'flashcard':
        return (
          <FlashcardPage
            level={selectedLevel}
            stats={stats}
            goBack={() => {
              setSelectedLevel(null);
              setCurrentPage('home');
            }}
            onDailyStudy={(lvl) => {
              setSelectedLevel(lvl);
              setCurrentPage('daily');
            }}
          />
        );
      case 'srs-review':
        return <FlashcardPage level="SRS" isSrs={true} goBack={() => setCurrentPage('home')} />;
      case 'srs-learned':
        return <FlashcardPage level="LEARNED" isLearnedStudy={true} goBack={() => setCurrentPage('home')} />;
      case 'srs-list':
        return <SrsListPage goBack={() => setCurrentPage('home')} />;
      case 'daily':
        return <DailyStudyPage level={selectedLevel} stats={stats} goBack={() => setCurrentPage('home')} />;
      case 'admin-vocab':
        return <VocabAdminPage goBack={() => setCurrentPage('home')} />;
      case 'admin-feedback':
        return <FeedbackAdminPage goBack={() => setCurrentPage('home')} />;
      case 'admin-ai':
        return <AiEnrichmentAdminPage goBack={() => setCurrentPage('home')} />;
      case 'search':
        return <SearchPage />;
      default:
        return <HomePage startStudy={startStudy} />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={(page, resetLevel) => {
          if (resetLevel || page === 'flashcard' || page === 'daily') {
            setSelectedLevel(null);
          }
          setCurrentPage(page);
        }}
        onLoginClick={() => setCurrentPage('auth')}
        user={isAuthenticated ? authUser : null}
        onLogout={handleLogout}
        onProfileClick={() => setShowProfileModal(true)}
        onFeedbackClick={() => {
          if (isAuthenticated) {
            setShowFeedbackModal(true);
          } else {
            alert("Vui lòng đăng nhập để gửi góp ý & báo lỗi!");
            setCurrentPage("auth");
          }
        }}
      />
      <main className="app-main">
        {renderPage()}
      </main>
      {showProfileModal && <ProfileModal onClose={() => setShowProfileModal(false)} />}
      {showFeedbackModal && <FeedbackModal onClose={() => setShowFeedbackModal(false)} />}
      <PomodoroTimer />
    </div>
  );
}

export default App;
