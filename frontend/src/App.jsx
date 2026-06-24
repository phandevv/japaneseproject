import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import FlashcardPage from './pages/FlashcardPage';
import SearchPage from './pages/SearchPage';

import DailyStudyPage from './pages/DailyStudyPage';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [stats, setStats] = useState(null);

  // Fetch stats once at app level so DailyStudyPage knows the total days
  useEffect(() => {
    import('./services/api').then(({ vocabApi }) => {
      vocabApi.getStats().then(setStats).catch(console.error);
    });
  }, []);

  const startStudy = (level, mode = 'flashcard') => {
    setSelectedLevel(level);
    setCurrentPage(mode);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage startStudy={startStudy} />;
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
