import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import FlashcardPage from './pages/FlashcardPage';
import SearchPage from './pages/SearchPage';

import DailyStudyPage from './pages/DailyStudyPage';

const STORAGE_KEY = 'nihongo-streak-user';

const loadStoredUser = () => {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
};

const saveStoredUser = (userData) => {
  if (typeof window === 'undefined') return userData;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
  return userData;
};

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
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [stats, setStats] = useState(null);
  const [user, setUser] = useState(() => loadStoredUser());
  const [streak, setStreak] = useState(() => loadStoredUser()?.streak || 0);

  // Fetch stats once at app level so DailyStudyPage knows the total days
  useEffect(() => {
    import('./services/api').then(({ vocabApi }) => {
      vocabApi.getStats().then(setStats).catch(console.error);
    });
  }, []);

  const handleLogin = (name) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const existingUser = loadStoredUser();
    const nextUser = existingUser?.userName?.toLowerCase() === trimmedName.toLowerCase()
      ? existingUser
      : { userName: trimmedName, streak: 0, lastStudyDate: null };

    const persistedUser = saveStoredUser(nextUser);
    setUser(persistedUser);
    setStreak(persistedUser.streak || 0);
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    setUser(null);
    setStreak(0);
  };

  const startStudy = (level, mode = 'flashcard') => {
    setSelectedLevel(level);
    setCurrentPage(mode);

    if (user?.userName) {
      const updatedUser = updateStreakForToday(user);
      const persistedUser = saveStoredUser(updatedUser);
      setUser(persistedUser);
      setStreak(persistedUser.streak || 0);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage startStudy={startStudy} user={user} streak={streak} onLogin={handleLogin} onLogout={handleLogout} />;
      case 'flashcard':
        return <FlashcardPage level={selectedLevel} goBack={() => setCurrentPage('home')} />;
      case 'daily':
        return <DailyStudyPage level={selectedLevel} stats={stats} goBack={() => setCurrentPage('home')} />;
      case 'search':
        return <SearchPage />;
      default:
        return <HomePage startStudy={startStudy} />;
    }
  };

  return (
    <>
      <Navbar setCurrentPage={setCurrentPage} />
      <main>
        {renderPage()}
      </main>
    </>
  );
}

export default App;
