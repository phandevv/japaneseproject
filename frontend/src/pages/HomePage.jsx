import React, { useState, useEffect } from 'react';
import { vocabApi, analyticsApi } from '../services/api';
import { Play, Loader, Sparkles, Brain, Flame, CheckCircle2, BarChart2, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import ExcelImport from '../components/ExcelImport';

const HomePage = ({ startStudy, user, streak, onLoginClick, onLogout, onAdminClick }) => {
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const vocabStats = await vocabApi.getStats();
        setStats(vocabStats);
        
        if (user) {
          const dash = await analyticsApi.getDashboard();
          setDashboardData(dash);
        }
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '70vh', flexDirection: 'column', gap: '20px' }}>
        <Loader size={40} className="animate-spin" style={{ color: 'var(--accent-color)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>{t.home.loading}</p>
      </div>
    );
  }

  const levelColors = {
    "N5": "#3b82f6",
    "N4": "#10b981",
    "N3": "#f59e0b",
    "N2": "#ef4444",
    "N1": "#8b5cf6",
    "TU_LAY": "#ec4899",
    "TRO_TU": "#06b6d4"
  };

  // Generate last 30 days list for graph
  const renderActivityGraph = () => {
    if (!dashboardData || !dashboardData.history) return null;

    const historyMap = {};
    dashboardData.history.forEach(session => {
      historyMap[session.studyDate] = session.wordsStudied;
    });

    const dates = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateString = d.toISOString().split('T')[0];
      dates.push({
        dateStr: dateString,
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        words: historyMap[dateString] || 0
      });
    }

    const maxWords = Math.max(...dates.map(d => d.words), 10);

    return (
      <div className="card" style={{ marginTop: '24px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <BarChart2 size={20} color="var(--accent-color)" />
          <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Lịch sử học tập 30 ngày qua</h3>
        </div>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'flex-end', 
          justifyContent: 'space-between', 
          height: '150px', 
          paddingBottom: '20px',
          borderBottom: '1px solid var(--border-color)',
          overflowX: 'auto',
          gap: '4px'
        }}>
          {dates.map((d, index) => {
            const pct = (d.words / maxWords) * 100;
            return (
              <div key={index} style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                flex: 1, 
                minWidth: '16px' 
              }}>
                <div 
                  title={`${d.dateStr}: Học ${d.words} từ`}
                  style={{ 
                    width: '100%', 
                    height: `${Math.max(pct, 4)}%`, 
                    backgroundColor: d.words > 0 ? 'var(--accent-color)' : 'var(--border-color)', 
                    borderRadius: '3px 3px 0 0',
                    transition: 'all 0.3s ease',
                    opacity: d.words > 0 ? 0.85 : 0.3,
                    cursor: 'pointer'
                  }}
                  onMouseEnter={e => e.target.style.opacity = 1}
                  onMouseLeave={e => e.target.style.opacity = d.words > 0 ? 0.85 : 0.3}
                />
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '6px', transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const isAdmin = user && user.username === 'admin';

  return (
    <div className="container animate-fade-in" style={{ padding: '40px 20px' }}>
      
      {/* Streak / Login Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px', padding: '18px 22px', borderRadius: '18px', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.14), rgba(14, 165, 233, 0.12))', border: '1px solid var(--border-color)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', color: 'var(--accent-color)' }}>
            <Sparkles size={18} />
            <strong>{t.home.streakTitle}</strong>
          </div>
          {user ? (
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              {t.home.streakMsg(user.username, dashboardData?.streak !== undefined ? dashboardData.streak : (streak || 0))}
            </p>
          ) : (
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              {t.home.loginPrompt}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {isAdmin && (
            <button className="btn btn-secondary" style={{ borderColor: 'var(--warning-color)', color: 'var(--warning-color)' }} onClick={onAdminClick}>
              <ShieldAlert size={18} /> Quản lý từ vựng
            </button>
          )}
          {user ? (
            <button className="btn btn-secondary" onClick={onLogout}>
              {t.home.logout}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={onLoginClick}>
              {t.auth?.loginTitle || 'Đăng nhập'}
            </button>
          )}
        </div>
      </div>

      {/* SRS Dashboard for Logged-In Users */}
      {user && dashboardData && (
        <div style={{ marginBottom: '32px' }}>
          <div className="grid grid-cols-3" style={{ gap: '16px' }}>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
              <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-color)' }}>
                <Brain size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Cần ôn hôm nay</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{dashboardData.dueCount}</div>
              </div>
            </div>
            
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
              <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                <Play size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Đã học hôm nay</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{dashboardData.wordsStudiedToday || 0}</div>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
              <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--success-color)' }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Tổng số từ đã học</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{dashboardData.learnedCount}</div>
              </div>
            </div>
          </div>

          <div className="card" style={{ 
            marginTop: '16px', 
            padding: '18px 24px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            borderColor: 'rgba(239, 68, 68, 0.3)'
          }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Hệ thống Ôn tập Ngắt quãng (SRS)</h4>
              <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {dashboardData.dueCount > 0 
                  ? `Bạn có ${dashboardData.dueCount} từ cần ôn tập. Hãy luyện tập để không bị quên!` 
                  : 'Luyện tập ngắt quãng giúp bạn ghi nhớ từ vựng lâu hơn gấp 5 lần.'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              {dashboardData.dueCount > 0 && (
                <button className="btn btn-primary" onClick={() => startStudy(null, 'srs-review')}>
                  <Brain size={18} /> Học Flashcard ({dashboardData.dueCount})
                </button>
              )}
              {dashboardData.learnedCount > 0 && (
                <button className="btn btn-secondary" onClick={() => startStudy('LEARNED_REVIEW', 'daily')}>
                  <Play size={18} /> Làm Quiz ôn tập (Đã học)
                </button>
              )}
            </div>
          </div>

          {renderActivityGraph()}
        </div>
      )}

      {/* Hero Section */}
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '15px' }}>
          {t.home.heroTitle} <span style={{ color: 'var(--accent-color)' }}>NihongoCards</span>
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
          {t.home.heroSub}
        </p>
      </div>

      {/* Level Selection */}
      <h2 style={{ fontSize: '1.8rem', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        {t.home.studyByLevel}
      </h2>

      <div className="grid grid-cols-3">
        {stats && stats.levels && Object.entries(stats.levels).map(([level, count]) => (
          <div key={level} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div className="flex-between">
              <h3 style={{ fontSize: '1.5rem', color: levelColors[level] || 'var(--text-primary)' }}>
                {t.home.levelLabels[level] || level}
              </h3>
              <span style={{ backgroundColor: 'var(--surface-hover)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.9rem' }}>
                {count} {t.home.words}
              </span>
            </div>

            <p style={{ color: 'var(--text-secondary)', flex: 1 }}>
              {t.home.levelDesc(t.home.levelLabels[level] || level)}
            </p>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1, padding: '10px 5px', fontSize: '0.9rem' }}
                onClick={() => startStudy(level, 'daily')}
              >
                {t.home.dailyStudy}
              </button>
              <button
                className="btn btn-secondary"
                style={{ flex: 1, padding: '10px 5px', fontSize: '0.9rem' }}
                onClick={() => startStudy(level, 'flashcard')}
              >
                {t.home.flashcard}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HomePage;

