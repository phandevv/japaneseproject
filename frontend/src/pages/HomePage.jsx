import React, { useState, useEffect } from 'react';
import { vocabApi, analyticsApi } from '../services/api';
import { Sparkles, Play, BookOpen, Globe, Users, Video, ShieldCheck, Loader, Brain, Flame, CheckCircle2, BarChart2, ShieldAlert, Trophy, Snowflake } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import '../styles/HomePage.css';

const serviceItems = [
  {
    icon: BookOpen,
    title: 'ONLINE',
    description: 'Tiếng Nhật online cho người bận rộn.',
  },
  {
    icon: Globe,
    title: 'OFFLINE',
    description: 'Lớp học trực tiếp cùng Top Sensei.',
  },
  {
    icon: Video,
    title: 'TRỰC TUYẾN',
    description: 'Giáo viên qua Zoom, học tại nhà.',
  },
  {
    icon: Users,
    title: 'KAIWA',
    description: 'Tự tin giao tiếp dù ngữ pháp còn yếu.',
  },
];

const differenceItems = [
  {
    icon: ShieldCheck,
    title: 'Sự đa dạng - cập nhật nhu cầu',
    description: 'SIRO NIHONGO đổi mới chương trình liên tục phù hợp người Việt và mục tiêu JLPT.',
  },
  {
    icon: Sparkles,
    title: 'Lộ trình nhanh - mạnh - chuẩn',
    description: 'Lộ trình dễ tiếp nhận, ôn tập nhịp nhàng, chuẩn đề thi.',
  },
  {
    icon: Play,
    title: 'Đội ngũ trợ giảng',
    description: 'Trợ giảng theo sát từng bước học viên ngoài giờ học.',
  },
  {
    icon: BookOpen,
    title: 'Đội ngũ giáo viên',
    description: 'Giáo viên N2-N1 giàu kinh nghiệm thực chiến.',
  },
];

const HomePage = ({ startStudy, user, streak, onLoginClick, onLogout, onAdminClick, onDailyClick }) => {
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

  const [leaderboardType, setLeaderboardType] = useState('words'); // 'words' or 'streak'

  const handleActivateFreeze = async () => {
    try {
      await analyticsApi.activateStreakFreeze();
      const dash = await analyticsApi.getDashboard();
      setDashboardData(dash);
      alert("Đã kích hoạt Khiên Băng bảo vệ chuỗi học hôm nay! ❄️");
    } catch (e) {
      console.error(e);
      alert("Không thể kích hoạt giữ chuỗi. Vui lòng thử lại!");
    }
  };

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

  const renderActivityGraph = () => {
    if (!dashboardData || !dashboardData.history) return null;

    const historyMap = {};
    dashboardData.history.forEach(session => {
      historyMap[session.studyDate] = session.wordsStudied;
    });

    const dates = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const dateVal = String(d.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${dateVal}`;
      dates.push({
        dateStr: dateString,
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        words: historyMap[dateString] || 0
      });
    }

    const maxWords = Math.max(...dates.map(d => d.words), 10);

    return (
      <div className="card" style={{ padding: '24px', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <BarChart2 size={20} color="var(--accent-color)" />
          <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Lịch sử học tập 7 ngày qua</h3>
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
    <div className="home-page">
      {user ? (
        // Logged-in Dashboard Workspace
        <div className="container animate-fade-in" style={{ padding: '40px 20px' }}>
          {/* Streak / Login Banner */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px', padding: '18px 22px', borderRadius: '18px', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.14), rgba(14, 165, 233, 0.12))', border: '1px solid var(--border-color)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', color: 'var(--accent-color)' }}>
                <Sparkles size={18} />
                <strong>{t.home.streakTitle}</strong>
              </div>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                {t.home.streakMsg(user.username, dashboardData?.streak !== undefined ? dashboardData.streak : (streak || 0))}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {dashboardData?.streakFrozenToday ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(6, 182, 212, 0.15)',
                  border: '1px solid rgba(6, 182, 212, 0.4)',
                  color: '#06b6d4',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}>
                  <Snowflake size={15} /> Đang giữ chuỗi ❄️
                </div>
              ) : (
                <button 
                  className="btn btn-secondary" 
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', borderColor: 'rgba(59, 130, 246, 0.4)', color: '#3b82f6' }}
                  onClick={handleActivateFreeze}
                >
                  <Snowflake size={16} /> Giữ chuỗi
                </button>
              )}
              {isAdmin && (
                <button className="btn btn-secondary" style={{ borderColor: 'var(--warning-color)', color: 'var(--warning-color)' }} onClick={onAdminClick}>
                  <ShieldAlert size={18} /> Quản lý từ vựng
                </button>
              )}
              <button className="btn btn-secondary" onClick={onLogout}>
                {t.home.logout}
              </button>
            </div>
          </div>

          {/* SRS Dashboard for Logged-In Users */}
          {dashboardData && (
            <div style={{ marginBottom: '32px' }}>
              <div className="grid grid-cols-4" style={{ gap: '16px' }}>
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

                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
                  <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>
                    <Users size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Đang online</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{dashboardData.onlineCount || 1}</div>
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginTop: '24px' }}>
                {renderActivityGraph()}

                <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Trophy size={20} color="var(--accent-color)" />
                      <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Bảng xếp hạng</h3>
                    </div>
                    
                    <div style={{ display: 'flex', backgroundColor: 'var(--surface-hover)', borderRadius: '12px', padding: '2px' }}>
                      <button 
                        onClick={() => setLeaderboardType('words')}
                        style={{
                          border: 'none',
                          backgroundColor: leaderboardType === 'words' ? 'var(--card-bg)' : 'transparent',
                          color: leaderboardType === 'words' ? 'var(--text-primary)' : 'var(--text-secondary)',
                          padding: '6px 12px',
                          borderRadius: '10px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          boxShadow: leaderboardType === 'words' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        Số từ học
                      </button>
                      <button 
                        onClick={() => setLeaderboardType('streak')}
                        style={{
                          border: 'none',
                          backgroundColor: leaderboardType === 'streak' ? 'var(--card-bg)' : 'transparent',
                          color: leaderboardType === 'streak' ? 'var(--text-primary)' : 'var(--text-secondary)',
                          padding: '6px 12px',
                          borderRadius: '10px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          boxShadow: leaderboardType === 'streak' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        Chuỗi ngày (Streak)
                      </button>
                    </div>
                  </div>
                  
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {leaderboardType === 'words' ? (
                      (!dashboardData.leaderboard || dashboardData.leaderboard.length === 0) ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                          Chưa có hoạt động học tập nào hôm nay.
                        </div>
                      ) : (
                        dashboardData.leaderboard.map((item, index) => (
                          <div key={index} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            backgroundColor: index === 0 ? 'rgba(245, 158, 11, 0.1)' : 'var(--surface-hover)',
                            border: index === 0 ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid transparent',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                backgroundColor: index === 0 ? '#f59e0b' : index === 1 ? '#cbd5e1' : index === 2 ? '#b45309' : 'rgba(255,255,255,0.08)',
                                color: index < 3 ? '#1e293b' : 'var(--text-secondary)'
                              }}>
                                {index + 1}
                              </span>
                              <span style={{ fontWeight: index === 0 ? 600 : 500, color: 'var(--text-primary)' }}>
                                {item.username} {item.username === user.username && <span style={{ fontSize: '0.75rem', color: 'var(--accent-color)', marginLeft: '4px' }}>(Bạn)</span>}
                              </span>
                            </div>
                            <span style={{ fontWeight: 'bold', color: 'var(--success-color)' }}>
                              {item.wordsStudied || 0} từ
                            </span>
                          </div>
                        ))
                      )
                    ) : (
                      (!dashboardData.streakLeaderboard || dashboardData.streakLeaderboard.length === 0) ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                          Chưa có dữ liệu chuỗi ngày.
                        </div>
                      ) : (
                        dashboardData.streakLeaderboard.map((item, index) => (
                          <div key={index} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            backgroundColor: index === 0 ? 'rgba(245, 158, 11, 0.1)' : 'var(--surface-hover)',
                            border: index === 0 ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid transparent',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                backgroundColor: index === 0 ? '#f59e0b' : index === 1 ? '#cbd5e1' : index === 2 ? '#b45309' : 'rgba(255,255,255,0.08)',
                                color: index < 3 ? '#1e293b' : 'var(--text-secondary)'
                              }}>
                                {index + 1}
                              </span>
                              <span style={{ fontWeight: index === 0 ? 600 : 500, color: 'var(--text-primary)' }}>
                                {item.username} {item.username === user.username && <span style={{ fontSize: '0.75rem', color: 'var(--accent-color)', marginLeft: '4px' }}>(Bạn)</span>}
                              </span>
                            </div>
                            <span style={{ fontWeight: 'bold', color: 'var(--success-color)' }}>
                              {item.streak || 0} ngày
                            </span>
                          </div>
                        ))
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Level Selection Section */}
          <h2 style={{ fontSize: '1.8rem', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginTop: '40px' }}>
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
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => startStudy(level, 'flashcard')}>
                    Flashcard
                  </button>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => startStudy(level, 'daily')}>
                    Daily Study
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Brand Landing Page for Logged-Out Users
        <div className="animate-fade-in">
          <section className="home-top-banner">
            <div className="container home-banner-inner" style={{ padding: 0 }}>
              <div className="home-banner-copy">
                <span className="home-badge">SIRO NIHONGO</span>
                <h1>{t.home.heroMainTitle || 'SIRO NIHONGO - Học tiếng Nhật đỉnh cao'}</h1>
                <p className="home-subtitle">
                  {t.home.heroDescription || 'Học tiếng Nhật hiệu quả, tự tin chinh phục JLPT với phương pháp hiện đại và bài học ngắn gọn mỗi ngày.'}
                </p>

                <div className="home-actions">
                  <button
                    className="btn btn-primary btn-xl"
                    onClick={onLoginClick}
                  >
                    HỌC NGAY
                  </button>
                  <button className="btn btn-secondary btn-xl" onClick={onLoginClick}>
                    {t.auth.loginTitle}
                  </button>
                </div>

                <div className="hero-pill-grid">
                  <div className="hero-pill">15’ mỗi ngày đỗ JLPT</div>
                  <div className="hero-pill">Lộ trình nhanh - mạnh - chuẩn</div>
                  <div className="hero-pill">Giáo viên N1, chuyên sâu</div>
                </div>

                <p className="home-hero-meta">
                  {t.home.loginPrompt}
                </p>
              </div>

              <div className="home-banner-visual">
                <div className="home-banner-slider">
                  <div className="slide slide-1" />
                  <div className="slide slide-2" />
                  <div className="slide slide-3" />
                  <div className="slide-overlay">
                    <span className="slide-chip">SIRO NIHONGO</span>
                    <h3>{t.home.slideTitle}</h3>
                    <p>{t.home.slideText}</p>
                  </div>
                </div>
                <div className="hero-slider-controls">
                  <span className="control active" />
                  <span className="control" />
                  <span className="control" />
                </div>
              </div>
            </div>
          </section>

          <section className="home-category-section container" style={{ padding: '40px 0' }}>
            <div className="category-intro">
              <p className="section-label">Dành cho bạn</p>
              <h2>Những lộ trình phù hợp mọi phong cách học</h2>
            </div>
            <div className="category-grid">
              {serviceItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="service-card">
                    <div className="service-icon">
                      <Icon size={22} />
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="home-difference-section container" style={{ padding: '40px 0' }}>
            <div className="difference-grid">
              <div className="difference-copy">
                <p className="section-label">SIRO NIHONGO khác biệt</p>
                <h2>SIRO NIHONGO là SỰ KHÁC BIỆT</h2>
                <p>
                  Giải pháp học tiếng Nhật toàn diện với nội dung cập nhật, lộ trình rõ ràng và trợ giảng tận tâm.
                </p>
                <div className="difference-stats">
                  <div>
                    <strong>Học hiệu quả</strong>
                    <span>Lộ trình được tối ưu cho người bận rộn.</span>
                  </div>
                  <div>
                    <strong>Giáo viên chuyên sâu</strong>
                    <span>Đội ngũ hướng dẫn trình độ cao, phương pháp thực chiến.</span>
                  </div>
                  <div>
                    <strong>Hỗ trợ 24/7</strong>
                    <span>Trợ giảng đồng hành cùng học viên mọi lúc.</span>
                  </div>
                </div>
              </div>

              <div className="difference-cards">
                {differenceItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="difference-card">
                      <div className="difference-card-top">
                        <Icon size={20} />
                        <h3>{item.title}</h3>
                      </div>
                      <p>{item.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="home-feature-section container" style={{ padding: '40px 0' }}>
            <h2>{t.home.featuresTitle}</h2>
            <div className="home-feature-grid">
              <div className="feature-card">
                <h3>{t.home.guestFeature1}</h3>
                <p>{t.home.featureDesc1}</p>
              </div>
              <div className="feature-card">
                <h3>{t.home.guestFeature2}</h3>
                <p>{t.home.featureDesc2}</p>
              </div>
              <div className="feature-card">
                <h3>{t.home.guestFeature3}</h3>
                <p>{t.home.featureDesc3}</p>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default HomePage;
