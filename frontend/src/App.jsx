import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { useAuth } from './context/AuthContext';
import FeedbackModal from './components/FeedbackModal';
import AIChatWidget from './components/AIChatWidget';
import QuickSelectionTranslator from './components/QuickSelectionTranslator';

// Code Splitting via React.lazy
const HomePage = lazy(() => import('./pages/HomePage'));
const FlashcardPage = lazy(() => import('./pages/FlashcardPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const DailyStudyPage = lazy(() => import('./pages/DailyStudyPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const VocabAdminPage = lazy(() => import('./pages/VocabAdminPage'));
const StudyStatsPage = lazy(() => import('./pages/StudyStatsPage'));
const SrsListPage = lazy(() => import('./pages/SrsListPage'));
const FeedbackAdminPage = lazy(() => import('./pages/FeedbackAdminPage'));
const AiEnrichmentAdminPage = lazy(() => import('./pages/AiEnrichmentAdminPage'));
const KnowledgeBasePage = lazy(() => import('./pages/KnowledgeBasePage'));
const ConversationTutorPage = lazy(() => import('./pages/ConversationTutorPage'));
const ReviewHubPage = lazy(() => import('./pages/ReviewHubPage'));
const GamesHubPage = lazy(() => import('./pages/GamesHubPage'));
const MemoryMatchGame = lazy(() => import('./pages/MemoryMatchGame'));
const FallingWordsGame = lazy(() => import('./pages/FallingWordsGame'));
const WordConnectGame = lazy(() => import('./pages/WordConnectGame'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));
const AchievementsPage = lazy(() => import('./pages/AchievementsPage'));
const GrammarPage = lazy(() => import('./pages/GrammarPage'));
const MasterReviewPage = lazy(() => import('./pages/MasterReviewPage'));
const JlptN3Page = lazy(() => import('./pages/JlptN3Page'));

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
  const navigate = useNavigate();
  const location = useLocation();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('nihongo-sidebarCollapsed') === 'true');
  const [selectedLevelState, setSelectedLevelState] = useState(() => {
    const val = localStorage.getItem('nihongo-selectedLevel');
    return val === 'null' ? null : val;
  });
  const [stats, setStats] = useState(null);
  const [showStudySection, setShowStudySection] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Extract level from pathname if it starts with /flashcard/ or /daily/
  const flashcardMatch = location.pathname.match(/^\/flashcard\/(.+)$/);
  const dailyMatch = location.pathname.match(/^\/daily\/(.+)$/);
  const currentLevelFromPath = flashcardMatch ? flashcardMatch[1] : (dailyMatch ? dailyMatch[1] : null);
  const selectedLevel = currentLevelFromPath || selectedLevelState;

  const getPageFromPath = (path) => {
    if (path === '/') return isAuthenticated ? 'home' : 'landing';
    if (path === '/landing') return 'landing';
    if (path === '/auth') return 'auth';
    if (path.startsWith('/flashcard')) return 'flashcard';
    if (path === '/srs-review') return 'srs-review';
    if (path === '/srs-learned') return 'srs-learned';
    if (path === '/srs-list') return 'srs-list';
    if (path.startsWith('/daily')) return 'daily';
    if (path === '/admin-vocab') return 'admin-vocab';
    if (path === '/admin-feedback') return 'admin-feedback';
    if (path === '/admin-ai') return 'admin-ai';
    if (path === '/search') return 'search';
    if (path === '/jlpt-n3') return 'jlpt-n3';
    if (path === '/grammar') return 'grammar';
    if (path === '/knowledge') return 'knowledge';
    if (path === '/achievements') return 'achievements';
    if (path === '/profile') return 'profile';
    if (path === '/conversation-tutor') return 'conversation-tutor';
    if (path === '/games') return 'games';
    if (path.startsWith('/games/memory')) return 'game-memory';
    if (path.startsWith('/games/falling')) return 'game-falling';
    if (path.startsWith('/games/connect')) return 'game-connect';

    if (path === '/study-stats') return 'study-stats';
    if (path === '/review/morning') return 'review-morning';
    if (path === '/review/today') return 'review-today';
    if (path === '/master-review') return 'master-review';

    return 'home';
  };

  const currentPage = getPageFromPath(location.pathname);

  const setCurrentPage = (page, resetLevel = false) => {
    if (resetLevel) {
      setSelectedLevelState(null);
    }
    switch (page) {
      case 'landing': navigate('/landing'); break;
      case 'home': navigate('/'); break;
      case 'auth': navigate('/auth'); break;
      case 'flashcard': navigate('/flashcard'); break;
      case 'srs-review': navigate('/srs-review'); break;
      case 'srs-learned': navigate('/srs-learned'); break;
      case 'srs-list': navigate('/srs-list'); break;
      case 'daily': navigate('/daily'); break;
      case 'admin-vocab': navigate('/admin-vocab'); break;
      case 'admin-feedback': navigate('/admin-feedback'); break;
      case 'admin-ai': navigate('/admin-ai'); break;
      case 'search': navigate('/search'); break;
      case 'jlpt-n3': navigate('/jlpt-n3'); break;
      case 'grammar': navigate('/grammar'); break;
      case 'knowledge': navigate('/knowledge'); break;
      case 'achievements': navigate('/achievements'); break;
      case 'conversation-tutor': navigate('/conversation-tutor'); break;
      case 'games': navigate('/games'); break;
      case 'game-memory': navigate('/games/memory'); break;
      case 'game-falling': navigate('/games/falling'); break;
      case 'game-connect': navigate('/games/connect'); break;

      case 'review-morning': navigate('/review/morning'); break;
      case 'review-today': navigate('/review/today'); break;
      case 'master-review': navigate('/master-review'); break;
      case 'study-stats': navigate('/study-stats'); break;
      default: navigate('/');
    }
  };

  useEffect(() => {
    localStorage.setItem('nihongo-currentPage', currentPage);
  }, [currentPage]);

  useEffect(() => {
    localStorage.setItem('nihongo-sidebarCollapsed', isSidebarCollapsed);
  }, [isSidebarCollapsed]);

  useEffect(() => {
    if (selectedLevel !== null) {
      localStorage.setItem('nihongo-selectedLevel', selectedLevel);
    } else {
      localStorage.removeItem('nihongo-selectedLevel');
    }
  }, [selectedLevel]);

  // Streak state associated with the active user (username or 'guest')
  const [userStreakData, setUserStreakData] = useState(null);
  const [dbStreak, setDbStreak] = useState(null);

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

  // Sync real database streak when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      import('./services/api').then(({ analyticsApi }) => {
        analyticsApi.getDashboard()
          .then(dash => setDbStreak(dash?.streak || 0))
          .catch(err => console.error("Failed to fetch DB streak:", err));
      });
    } else {
      setDbStreak(null);
    }
  }, [isAuthenticated, authUser]);

  // Redirect logged-in users away from guest pages
  useEffect(() => {
    if (isAuthenticated && (currentPage === 'landing' || currentPage === 'auth')) {
      navigate('/');
    }
  }, [isAuthenticated, currentPage, navigate]);

  // Fetch stats once at app level
  useEffect(() => {
    import('./services/api').then(({ vocabApi }) => {
      vocabApi.getStats().then(setStats).catch(console.error);
    });
  }, []);

  const handleLogout = async () => {
    await authLogout();
    navigate('/');
    setShowStudySection(false);
  };

  const handleLoginSuccess = () => {
    navigate('/');
    setShowStudySection(true);
  };

  const startStudy = (level, mode = 'flashcard') => {
    setSelectedLevelState(level);
    if (level) {
      navigate(`/${mode}/${level}`);
    } else {
      navigate(`/${mode}`);
    }
    setShowStudySection(false);

    if (userStreakData) {
      const updatedUser = updateStreakForToday(userStreakData);
      setUserStreakData(updatedUser);
      localStorage.setItem(streakStorageKey, JSON.stringify(updatedUser));
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'landing':
        return (
          <HomePage
            startStudy={startStudy}
            user={isAuthenticated ? authUser : null}
            streak={userStreakData?.streak || 0}
            forceLanding={true}
            onLoginClick={() => {
              if (isAuthenticated) {
                navigate('/');
                setShowStudySection(true);
              } else {
                navigate('/auth');
                setShowStudySection(false);
              }
            }}
            onDailyClick={() => {
              if (isAuthenticated) {
                setSelectedLevelState(null);
                navigate('/daily');
              } else {
                navigate('/auth');
              }
            }}
            onAdminClick={() => navigate('/admin-vocab')}
            showStudySection={showStudySection}
          />
        );
      case 'home':
        return (
          <HomePage
            startStudy={startStudy}
            user={isAuthenticated ? authUser : null}
            streak={userStreakData?.streak || 0}
            onLoginClick={() => {
              navigate('/auth');
              setShowStudySection(false);
            }}
            onDailyClick={() => {
              if (isAuthenticated) {
                setSelectedLevelState(null);
                navigate('/daily');
              } else {
                navigate('/auth');
              }
            }}
            onAdminClick={() => navigate('/admin-vocab')}
            showStudySection={showStudySection}
          />
        );
      case 'auth':
        return (
          <HomePage
            startStudy={startStudy}
            user={isAuthenticated ? authUser : null}
            streak={userStreakData?.streak || 0}
            isAuthView={true}
            forceLanding={true}
            onAuthCancel={() => navigate(isAuthenticated ? '/' : '/landing')}
            onAuthSuccess={handleLoginSuccess}
          />
        );
      case 'flashcard':
        return (
          <FlashcardPage
            level={selectedLevel}
            stats={stats}
            goBack={() => {
              setSelectedLevelState(null);
              navigate('/');
            }}
            onDailyStudy={(lvl) => {
              setSelectedLevelState(lvl);
              navigate(`/daily/${lvl}`);
            }}
          />
        );
      case 'srs-review':
        return <FlashcardPage level="SRS" isSrs={true} goBack={() => navigate('/')} />;
      case 'srs-learned':
        return <FlashcardPage level="LEARNED" isLearnedStudy={true} goBack={() => navigate('/')} />;
      case 'srs-list':
        return <SrsListPage goBack={() => navigate('/')} />;
      case 'daily':
        return <DailyStudyPage level={selectedLevel} stats={stats} goBack={() => navigate('/')} />;
      case 'admin-vocab':
        return <VocabAdminPage goBack={() => navigate('/')} />;
      case 'admin-feedback':
        return <FeedbackAdminPage goBack={() => navigate('/')} />;
      case 'admin-ai':
        return <AiEnrichmentAdminPage goBack={() => navigate('/')} />;
      case 'search':
        return <SearchPage />;
      case 'grammar':
        return <GrammarPage />;
      case 'knowledge':
        return <KnowledgeBasePage />;
      case 'conversation-tutor':
        return isAuthenticated ? (
          <ConversationTutorPage goBack={() => navigate('/')} />
        ) : (
          <AuthPage onCancel={() => navigate('/')} onSuccess={handleLoginSuccess} />
        );
      case 'games':
        return isAuthenticated ? <GamesHubPage /> : <AuthPage onCancel={() => navigate('/')} onSuccess={handleLoginSuccess} />;
      case 'game-memory':
        return isAuthenticated ? <MemoryMatchGame /> : <AuthPage onCancel={() => navigate('/')} onSuccess={handleLoginSuccess} />;
      case 'game-falling':
        return isAuthenticated ? <FallingWordsGame /> : <AuthPage onCancel={() => navigate('/')} onSuccess={handleLoginSuccess} />;
      case 'game-connect':
        return isAuthenticated ? <WordConnectGame /> : <AuthPage onCancel={() => navigate('/')} onSuccess={handleLoginSuccess} />;
      case 'review-morning':
        return isAuthenticated ? (
          <ReviewHubPage mode="morning" goBack={() => navigate('/')} />
        ) : (
          <AuthPage onCancel={() => navigate('/')} onSuccess={handleLoginSuccess} />
        );
      case 'review-today':
        return isAuthenticated ? (
          <ReviewHubPage mode="today" goBack={() => navigate('/')} />
        ) : (
          <AuthPage onCancel={() => navigate('/')} onSuccess={handleLoginSuccess} />
        );
      case 'master-review':
        return isAuthenticated ? (
          <MasterReviewPage goBack={() => navigate('/')} />
        ) : (
          <AuthPage onCancel={() => navigate('/')} onSuccess={handleLoginSuccess} />
        );
      case 'study-stats':
        return isAuthenticated ? (
          <StudyStatsPage />
        ) : (
          <AuthPage onCancel={() => navigate('/')} onSuccess={handleLoginSuccess} />
        );
      case 'profile':
        return isAuthenticated ? (
          <UserProfilePage />
        ) : (
          <AuthPage onCancel={() => navigate('/')} onSuccess={handleLoginSuccess} />
        );
      case 'achievements':
        return isAuthenticated ? (
          <AchievementsPage />
        ) : (
          <AuthPage onCancel={() => navigate('/')} onSuccess={handleLoginSuccess} />
        );
      case 'jlpt-n3':
        return <JlptN3Page />;
      default:
        return <HomePage startStudy={startStudy} user={isAuthenticated ? authUser : null} />;
    }
  };

  // Dynamic SEO Metadata and Open Graph tags
  const getSeoMetadata = (page) => {
    switch (page) {
      case 'home':
        return {
          title: 'SIRO NIHONGO - Học Tiếng Nhật Thông Minh',
          description: 'Học tiếng Nhật với phương pháp lặp lại ngắt quãng (SRS) và gia sư AI thông minh.',
          ogImage: 'https://phandeptrai.id.vn/assets/siro_logo.png'
        };
      case 'search':
        return {
          title: 'Tra Cứu Từ Điển Nhật - Việt | SIRO NIHONGO',
          description: 'Tra cứu từ vựng tiếng Nhật nhanh chóng với giải thích nghĩa, cách đọc Pitch Accent và ví dụ minh họa phong phú.',
          ogImage: 'https://phandeptrai.id.vn/assets/siro_logo.png'
        };
      case 'grammar':
        return {
          title: 'Ngữ Pháp Tiếng Nhật JLPT | SIRO NIHONGO',
          description: 'Hệ thống ngữ pháp JLPT N5 - N1 phân loại theo tuần đầy đủ cấu trúc, giải thích & phát âm ví dụ.',
          ogImage: 'https://phandeptrai.id.vn/assets/siro_logo.png'
        };
      case 'daily':
        return {
          title: 'Học Từ Vựng Hàng Ngày | SIRO NIHONGO',
          description: 'Luyện tập từ vựng tiếng Nhật N5 - N1 mỗi ngày với giáo trình chuẩn và thuật toán ghi nhớ thông minh.',
          ogImage: 'https://phandeptrai.id.vn/assets/siro_logo.png'
        };
      case 'knowledge':
        return {
          title: 'Kho Tri Thức Học Tiếng Nhật | SIRO NIHONGO',
          description: 'Tìm kiếm, tự ôn tập và khai thác kho ngữ pháp, hội thoại văn hóa Nhật Bản được trợ lý AI giải nghĩa sâu sắc.',
          ogImage: 'https://phandeptrai.id.vn/assets/siro_logo.png'
        };
      case 'conversation-tutor':
        return {
          title: 'Hội Thoại Với Gia Sư AI | SIRO NIHONGO',
          description: 'Luyện giao tiếp tiếng Nhật phản xạ tự nhiên như người bản xứ cùng trợ lý gia sư trí tuệ nhân tạo.',
          ogImage: 'https://phandeptrai.id.vn/assets/siro_logo.png'
        };
      default:
        return {
          title: 'SIRO NIHONGO - Chinh Phục Tiếng Nhật Dễ Dàng',
          description: 'Nền tảng học từ vựng JLPT hiệu quả hàng đầu qua thẻ ghi nhớ thông minh và hỗ trợ AI.',
          ogImage: 'https://phandeptrai.id.vn/assets/siro_logo.png'
        };
    }
  };

  const seoMeta = getSeoMetadata(currentPage);

  useEffect(() => {
    if (seoMeta.title) {
      document.title = seoMeta.title;
    }
    const updateMeta = (nameOrProperty, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[name="${nameOrProperty}"]`) ||
        document.querySelector(`meta[property="${nameOrProperty}"]`);
      if (!el) {
        el = document.createElement('meta');
        if (nameOrProperty.startsWith('og:')) {
          el.setAttribute('property', nameOrProperty);
        } else {
          el.setAttribute('name', nameOrProperty);
        }
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    updateMeta('description', seoMeta.description);
    updateMeta('og:title', seoMeta.title);
    updateMeta('og:description', seoMeta.description);
    if (seoMeta.ogImage) {
      updateMeta('og:image', seoMeta.ogImage);
    }
  }, [seoMeta]);

  return (
    <div className={`app-layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''} ${!isAuthenticated ? 'no-sidebar' : ''}`}>
      {isAuthenticated && (
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          currentPage={currentPage}
          setCurrentPage={(page, resetLevel) => {
            if (resetLevel || page === 'flashcard' || page === 'daily') {
              setSelectedLevelState(null);
            }
            setCurrentPage(page);
          }}
          onLoginClick={() => navigate('/auth')}
          user={isAuthenticated ? authUser : null}
          onLogout={handleLogout}
          onProfileClick={() => navigate('/profile')}
          onFeedbackClick={() => {
            if (isAuthenticated) {
              setShowFeedbackModal(true);
            } else {
              alert("Vui lòng đăng nhập để gửi góp ý & báo lỗi!");
              navigate('/auth');
            }
          }}
        />
      )}
      <main className="app-main">
        {isAuthenticated && (
          <Header
            user={isAuthenticated ? authUser : null}
            streak={dbStreak !== null ? dbStreak : (userStreakData?.streak || 0)}
            onProfileClick={() => navigate('/profile')}
            onLogout={handleLogout}
          />
        )}
        <Suspense fallback={
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
            <div style={{ width: '36px', height: '36px', border: '3px solid rgba(99, 102, 241, 0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        }>
          {renderPage()}
        </Suspense>
      </main>
      {showFeedbackModal && <FeedbackModal onClose={() => setShowFeedbackModal(false)} />}
      <AIChatWidget />
      <QuickSelectionTranslator />

    </div>
  );
}

export default App;
