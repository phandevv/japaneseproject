import React, { useState, useEffect } from 'react';
import { vocabApi, analyticsApi } from '../services/api';
import { Sparkles, Play, BookOpen, Globe, Users, Video, ShieldCheck, Loader, Brain, Flame, CheckCircle2, BarChart2, ShieldAlert, Trophy, Snowflake, Calendar, List, Check, Star } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { OnlineUsersWidget } from '../components/OnlineUsersWidget';
import { UserProfileModal } from '../components/UserProfileModal';
import StudyHistoryDetailsWidget from '../components/StudyHistoryDetailsWidget';
import SakuraPetals from '../components/SakuraPetals';
import AuthPage from './AuthPage';
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

const HomePage = ({ user: propUser, startStudy, streak, onLoginClick, onLogout, onAdminClick, onDailyClick, isAuthView, onAuthSuccess, onAuthCancel, forceLanding }) => {
  const { t } = useLanguage();
  const { user: contextUser } = useAuth();
  const user = propUser || contextUser;
  const [stats, setStats] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leaderboardType, setLeaderboardType] = useState('words');
  const [selectedProfileUsername, setSelectedProfileUsername] = useState(null);
  const [showStreakModal, setShowStreakModal] = useState(false);

  useEffect(() => {
    const initData = async () => {
      try {
        const vocabStats = await vocabApi.getStats();
        setStats(vocabStats);

        if (user) {
          const dash = await analyticsApi.getDashboard();
          setDashboardData(dash);

          // Show streak modal once per day or per new session (app open / login)
          const todayStr = new Date().toLocaleDateString('vi-VN');
          const lastShown = localStorage.getItem(`lastStreakDate_${user.username}`);
          const sessionShown = sessionStorage.getItem('streakModalShown');

          if (lastShown !== todayStr || !sessionShown) {
            try {
              // Log an empty session to maintain streak just by opening the app
              await analyticsApi.logSession(0);
              const updatedDash = await analyticsApi.getDashboard();
              setDashboardData(updatedDash);

              if (updatedDash.streak > 0) {
                setShowStreakModal(true);
                localStorage.setItem(`lastStreakDate_${user.username}`, todayStr);
                sessionStorage.setItem('streakModalShown', 'true');
              }
            } catch (err) {
              console.error("Error logging daily visit:", err);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [user]);

  const handleUseFreeze = async () => {
    try {
      await analyticsApi.useFreeze();
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
    const histMap = {};
    if (Array.isArray(dashboardData.history)) {
      dashboardData.history.forEach(session => {
        histMap[session.studyDate] = session;
      });
    }
    const now = new Date();
    const cells = [];

    // Create 364 real days of history (from 364 days ago to today)
    for (let i = 364; i >= 0; i--) {
      const current = new Date(now);
      current.setDate(now.getDate() - i);
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const dateVal = String(current.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${dateVal}`;

      const session = histMap[dateString];
      cells.push({
        date: current,
        dateStr: dateString,
        wordsLearned: session?.wordsStudied || 0,
        wordsReviewed: session?.streakFrozen ? 1 : 0,
        duration: session?.wordsStudied || (session?.streakFrozen ? 1 : 0)
      });
    }

    // Align grid by weekday (Monday to Sunday)
    const startDate = cells[0].date;
    const startDay = startDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const startDayOfWeek = startDay === 0 ? 7 : startDay;
    const paddingStartCount = startDayOfWeek - 1; // Empty slots at the start of the first week

    const allGridCells = [];
    for (let i = 0; i < paddingStartCount; i++) {
      allGridCells.push({ isEmpty: true });
    }

    allGridCells.push(...cells);

    const totalCells = allGridCells.length;
    const remainder = totalCells % 7;
    if (remainder > 0) {
      const paddingEndCount = 7 - remainder;
      for (let i = 0; i < paddingEndCount; i++) {
        allGridCells.push({ isEmpty: true });
      }
    }

    const getIntensityColor = (duration) => {
      if (duration === 0) return 'var(--surface-hover)';
      if (duration < 10) return '#a7f3d0';
      if (duration < 30) return '#34d399';
      if (duration < 60) return '#10b981';
      return '#059669';
    };

    // Calculate month labels dynamically
    const monthStarts = [];
    allGridCells.forEach((c, idx) => {
      if (c.isEmpty) return;
      const colIndex = Math.floor(idx / 7);
      const m = c.date.getMonth();
      if (monthStarts.length === 0 || monthStarts[monthStarts.length - 1].m !== m) {
        monthStarts.push({ m, colIndex, label: `T${m + 1}` });
      }
    });

    const monthLabels = [];
    for (let i = 0; i < monthStarts.length; i++) {
      const current = monthStarts[i];
      const next = monthStarts[i + 1];

      // If it's the very first month and the next month starts too soon, skip the first month
      if (i === 0 && next && next.colIndex - current.colIndex < 3) {
        continue;
      }

      const lastAdded = monthLabels[monthLabels.length - 1];
      if (!lastAdded || current.colIndex - lastAdded.colIndex >= 3) {
        monthLabels.push(current);
      }
    }

    return (
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
          <Calendar size={18} color="var(--accent-color)" />
          <h4 style={{ margin: 0, fontSize: '1rem' }}>Mức độ chăm chỉ (12 tháng qua)</h4>
        </div>

        {/* Scrollable Container for GitHub Heatmap */}
        <div style={{ overflowX: 'auto', width: '100%', paddingBottom: '10px' }} className="custom-scrollbar">
          <div style={{ display: 'flex', gap: '8px', minWidth: '830px', padding: '10px 0' }}>

            {/* Weekdays Labels */}
            <div style={{
              display: 'grid',
              gridTemplateRows: 'repeat(7, 12px)',
              gridGap: '3px',
              paddingTop: '24px', // 20px height + 4px margin of month labels
              width: '24px',
              fontSize: '0.7rem',
              color: 'var(--text-secondary)',
              alignItems: 'center'
            }}>
              <span style={{ gridRow: 1 }}>T2</span>
              <span style={{ gridRow: 2 }}>T3</span>
              <span style={{ gridRow: 3 }}>T4</span>
              <span style={{ gridRow: 4 }}>T5</span>
              <span style={{ gridRow: 5 }}>T6</span>
              <span style={{ gridRow: 6 }}>T7</span>
              <span style={{ gridRow: 7 }}>CN</span>
            </div>

            {/* Calendar Grid + Month Headers Column */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>

              {/* Month Labels row */}
              <div style={{
                position: 'relative',
                height: '20px',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                marginBottom: '4px'
              }}>
                {monthLabels.map((m, idx) => (
                  <span
                    key={idx}
                    style={{
                      position: 'absolute',
                      left: `${m.colIndex * 15}px`,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {m.label}
                  </span>
                ))}
              </div>

              {/* Heatmap Grid */}
              <div style={{
                display: 'grid',
                gridTemplateRows: 'repeat(7, 12px)',
                gridAutoFlow: 'column',
                gridGap: '3px',
                width: 'fit-content'
              }}>
                {allGridCells.map((day, idx) => {
                  if (day.isEmpty) {
                    return (
                      <div
                        key={idx}
                        style={{
                          width: '12px',
                          height: '12px',
                          backgroundColor: 'transparent',
                          borderRadius: '2px'
                        }}
                      />
                    );
                  }
                  return (
                    <div
                      key={idx}
                      title={`${day.dateStr}: Học ${day.duration} phút (${day.wordsLearned} từ mới, ${day.wordsReviewed} ôn tập)`}
                      style={{
                        width: '12px',
                        height: '12px',
                        backgroundColor: getIntensityColor(day.duration),
                        borderRadius: '2px',
                        cursor: 'pointer'
                      }}
                    />
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '5px' }}>
          <span>Lười</span>
          <div style={{ width: '12px', height: '12px', backgroundColor: 'var(--surface-hover)', borderRadius: '2px' }} />
          <div style={{ width: '12px', height: '12px', backgroundColor: '#a7f3d0', borderRadius: '2px' }} />
          <div style={{ width: '12px', height: '12px', backgroundColor: '#34d399', borderRadius: '2px' }} />
          <div style={{ width: '12px', height: '12px', backgroundColor: '#10b981', borderRadius: '2px' }} />
          <div style={{ width: '12px', height: '12px', backgroundColor: '#059669', borderRadius: '2px' }} />
          <span>Chăm</span>
        </div>
      </div>
    );
  };

  const SakuraFlower = ({ size = '100%', filled = true, color = '#2dd4bf', className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M50,10 C60,0 75,5 80,15 C85,25 75,40 50,50 C75,40 95,45 95,60 C95,75 80,85 70,80 C60,75 50,50 50,50 C50,50 40,75 30,80 C20,85 5,75 5,60 C5,45 25,40 50,50 C25,40 15,25 20,15 C25,5 40,0 50,10 Z"
        fill={filled ? color : '#ccfbf1'}
        stroke={color}
        strokeWidth="3" />
      {filled && <circle cx="50" cy="50" r="8" fill="#ffffff" opacity="0.4" />}
    </svg>
  );

  const CoinIcon = ({ className = '', style = {} }) => (
    <svg viewBox="0 0 100 100" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="45" fill="#fde047" stroke="#fbbf24" strokeWidth="6" />
      <circle cx="50" cy="50" r="32" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="4 4" />
      <path d="M45,35 L45,65 M55,35 L55,65" stroke="#d97706" strokeWidth="4" strokeLinecap="round" />
      <path d="M40,45 C40,40 50,35 60,40 C65,45 60,55 50,55 L40,55 C30,55 35,65 40,70 C50,75 60,70 60,65" stroke="#d97706" strokeWidth="4" strokeLinecap="round" fill="none" />
    </svg>
  );

  const getLast7DaysData = () => {
    const days = [];
    const historyMap = {};
    if (dashboardData && Array.isArray(dashboardData.history)) {
      dashboardData.history.forEach(session => {
        const dateStr = session.studyDate; // YYYY-MM-DD
        historyMap[dateStr] = true;
      });
    }

    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayOfWeek = d.getDay();
      days.push({
        name: dayNames[dayOfWeek],
        dateStr: dateStr,
        completed: historyMap[dateStr] === true || i === 0,
        isToday: i === 0
      });
    }
    return days;
  };

  return (
    <div className="home-page">
      <SakuraPetals count={15} />
      {(user && !isAuthView && !forceLanding) ? (
        // Logged-in Dashboard Workspace
        <div className="dashboard-wrapper animate-fade-in">
          {/* Streak Banner */}
          <div className="streak-banner star-streak-banner">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div className="star-streak-info">
                <div className="star-streak-title">
                  <span className="streak-fire">🔥</span>
                  <span>{t.home.streakTitle} - {dashboardData?.streak !== undefined ? dashboardData.streak : (streak || 0)} ngày</span>
                </div>
                <div className="star-streak-row">
                  {getLast7DaysData().map((day, i) => (
                    <div key={i} className="star-streak-item">
                      <span className="star-day-name">{day.name}</span>
                      {day.completed ? (
                        <Star className="star-icon completed" size={32} fill="#fde047" color="#facc15" strokeWidth={1.5} />
                      ) : (
                        <Star className="star-icon" size={24} color="#94a3b8" strokeWidth={1.5} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="streak-banner-mascot" style={{ marginLeft: '20px', flexShrink: 0 }}>
                <img src="/assets/mascot_siro_kimono_nobg.png" alt="Siro Mascot" style={{ height: '110px', objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' }} />
              </div>
            </div>
          </div>

          {selectedProfileUsername && (
            <UserProfileModal username={selectedProfileUsername} onClose={() => setSelectedProfileUsername(null)} />
          )}

          {/* SRS Dashboard for Logged-In Users */}
          {dashboardData && (
            <div style={{ marginBottom: '24px' }}>
              <div className="dashboard-grid">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {renderActivityGraph()}
                  <StudyHistoryDetailsWidget />

                  {/* Compact Stats Row */}
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--surface-color)', padding: '16px 20px', borderRadius: '14px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(37,99,235,0.1)', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Brain size={24} /></div>
                      <div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Cần ôn hôm nay</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, lineHeight: 1, marginTop: '4px' }}>{dashboardData.dueCount}</div>
                      </div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--surface-color)', padding: '16px 20px', borderRadius: '14px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', color: 'var(--success-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Play size={24} /></div>
                      <div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Đã học hôm nay</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, lineHeight: 1, marginTop: '4px' }}>{dashboardData.wordsStudiedToday || 0}</div>
                      </div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--surface-color)', padding: '16px 20px', borderRadius: '14px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', color: 'var(--success-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle2 size={24} /></div>
                      <div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Tổng đã học</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, lineHeight: 1, marginTop: '4px' }}>{dashboardData.learnedCount}</div>
                      </div>
                    </div>
                  </div>

                  {/* Promotional Banner */}
                  <div style={{
                    marginTop: '8px',
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, var(--accent-hover), var(--accent-color))',
                    color: 'white',
                    padding: '24px',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 15px 35px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.1)';
                  }}
                  >
                    <div style={{ zIndex: 1 }}>
                      <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, marginBottom: '10px', backdropFilter: 'blur(4px)' }}>
                        🚀 ƯU ĐÃI ĐẶC BIỆT
                      </div>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 800, fontFamily: "'Quicksand', sans-serif" }}>Nâng cấp Premium ngay!</h3>
                      <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9, maxWidth: '280px', lineHeight: 1.5 }}>
                        Mở khóa toàn bộ bài học, luyện tập giao tiếp không giới hạn với AI và gỡ bỏ quảng cáo.
                      </p>
                    </div>
                    <div style={{ zIndex: 1, paddingLeft: '16px' }}>
                      <button style={{
                        background: 'white',
                        color: 'var(--accent-color)',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '12px',
                        fontWeight: 800,
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        transition: 'transform 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                      onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        Khám phá
                      </button>
                    </div>
                    
                    {/* Decorative Elements */}
                    <div style={{ position: 'absolute', right: '-30px', top: '-30px', width: '160px', height: '160px', background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }}></div>
                    <div style={{ position: 'absolute', right: '40px', bottom: '-40px', width: '120px', height: '120px', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }}></div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <OnlineUsersWidget onUserClick={username => setSelectedProfileUsername(username)} />

                  <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Trophy size={20} color="var(--accent-color)" />
                        <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Bảng xếp hạng</h3>
                      </div>

                      <div style={{ display: 'flex', backgroundColor: 'var(--surface-hover)', borderRadius: '8px', padding: '3px', gap: '2px' }}>
                        <button
                          onClick={() => setLeaderboardType('words')}
                          className={`lb-tab${leaderboardType === 'words' ? ' active' : ''}`}
                        >Hôm nay</button>
                        <button
                          onClick={() => setLeaderboardType('learned')}
                          className={`lb-tab${leaderboardType === 'learned' ? ' active' : ''}`}
                        >Tổng học</button>
                        <button
                          onClick={() => setLeaderboardType('streak')}
                          className={`lb-tab${leaderboardType === 'streak' ? ' active' : ''}`}
                        >Chuỗi ngày</button>
                      </div>
                    </div>

                    <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '6px' }} className="custom-scrollbar">
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

                                <div style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  backgroundColor: 'var(--surface-hover)',
                                  border: '1.5px solid var(--border-color)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '1.1rem',
                                  fontWeight: 'bold',
                                  overflow: 'hidden'
                                }}>
                                  {item.avatar && item.avatar.startsWith('data:image') ? (
                                    <img
                                      src={item.avatar}
                                      alt="avatar"
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                  ) : (
                                    item.avatar ? item.avatar : item.username[0].toUpperCase()
                                  )}
                                </div>

                                <span style={{ fontWeight: index === 0 ? 600 : 500, color: 'var(--text-primary)' }}>
                                  {item.username} {user && item.username === user.username && <span style={{ fontSize: '0.75rem', color: 'var(--accent-color)', marginLeft: '4px' }}>(Bạn)</span>}
                                </span>
                              </div>
                              <span style={{ fontWeight: 'bold', color: 'var(--success-color)' }}>
                                {item.wordsStudied || 0} từ
                              </span>
                            </div>
                          ))
                        )
                      ) : leaderboardType === 'learned' ? (
                        (!dashboardData.learnedLeaderboard || dashboardData.learnedLeaderboard.length === 0) ? (
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Chưa có dữ liệu học tập.
                          </div>
                        ) : (
                          dashboardData.learnedLeaderboard.map((item, index) => (
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

                                <div style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  backgroundColor: 'var(--surface-hover)',
                                  border: '1.5px solid var(--border-color)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '1.1rem',
                                  fontWeight: 'bold',
                                  overflow: 'hidden'
                                }}>
                                  {item.avatar && item.avatar.startsWith('data:image') ? (
                                    <img
                                      src={item.avatar}
                                      alt="avatar"
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                  ) : (
                                    item.avatar ? item.avatar : item.username[0].toUpperCase()
                                  )}
                                </div>

                                <span style={{ fontWeight: index === 0 ? 600 : 500, color: 'var(--text-primary)' }}>
                                  {item.username} {user && item.username === user.username && <span style={{ fontSize: '0.75rem', color: 'var(--accent-color)', marginLeft: '4px' }}>(Bạn)</span>}
                                </span>
                              </div>
                              <span style={{ fontWeight: 'bold', color: 'var(--success-color)' }}>
                                {item.learnedCount || 0} từ
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

                                <div style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  backgroundColor: 'var(--surface-hover)',
                                  border: '1.5px solid var(--border-color)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '1.1rem',
                                  fontWeight: 'bold',
                                  overflow: 'hidden'
                                }}>
                                  {item.avatar && item.avatar.startsWith('data:image') ? (
                                    <img
                                      src={item.avatar}
                                      alt="avatar"
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                  ) : (
                                    item.avatar ? item.avatar : item.username[0].toUpperCase()
                                  )}
                                </div>

                                <span style={{ fontWeight: index === 0 ? 600 : 500, color: 'var(--text-primary)' }}>
                                  {item.username} {user && item.username === user.username && <span style={{ fontSize: '0.75rem', color: 'var(--accent-color)', marginLeft: '4px' }}>(Bạn)</span>}
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
            </div>
          )}
        </div>
      ) : (
        // Landing page for guest — full redesign
        <div className="landing-page-root" style={{ minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* ═══ Inline Keyframes ═══ */}
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Quicksand:wght@500;700;900&display=swap');
            .landing-page-root { font-family: 'Nunito', sans-serif; }
            .landing-page-root h1, .landing-page-root h2, .landing-page-root h3, .landing-page-root h4 { font-family: 'Quicksand', sans-serif; }
            @keyframes lp-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-18px)} }
            @keyframes lp-float-slow { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
            @keyframes lp-bounce { 0%,100%{transform:translateY(0) rotate(-2deg)} 50%{transform:translateY(-22px) rotate(2deg)} }
            @keyframes lp-wiggle { 0%,100%{transform:rotate(0)} 25%{transform:rotate(-4deg)} 75%{transform:rotate(4deg)} }
            @keyframes lp-pulse { 0%,100%{opacity:.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.05)} }
            @keyframes lp-slide-up { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
            @keyframes lp-slide-left { from{opacity:0;transform:translateX(-40px)} to{opacity:1;transform:translateX(0)} }
            @keyframes lp-slide-right { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
            @keyframes lp-sparkle { 0%,100%{opacity:0;transform:scale(0)} 50%{opacity:1;transform:scale(1)} }
            @keyframes lp-gradient-shift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
            .lp-header-link { text-decoration:none; color:rgba(255,255,255,.8); font-weight:600; transition:color .2s, transform .2s; position:relative; }
            .lp-header-link:hover { color:#fde047; transform:translateY(-1px); }
            .lp-header-link.active { color:white; }
            .lp-header-link.active::after { content:''; position:absolute; bottom:-6px; left:0; right:0; height:2px; background:#fde047; border-radius:2px; }
            .lp-feat-card { transition:transform .3s, box-shadow .3s; cursor:default; }
            .lp-feat-card:hover { transform:translateY(-8px); box-shadow:0 20px 40px rgba(30,58,95,.15) !important; }
            .lp-cta-btn { transition:all .3s; position:relative; overflow:hidden; }
            .lp-cta-btn::after {
              content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
              background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
              transition: left 0.6s ease; transform: skewX(-20deg);
            }
            .lp-cta-btn:hover { transform:translateY(-3px); box-shadow:0 15px 35px rgba(245,158,11,.5) !important; }
            .lp-cta-btn:hover::after { left: 150%; }
            .lp-header-btn {
              padding: 9px 26px;
              background: linear-gradient(135deg, #f59e0b, #d97706);
              color: white;
              font-weight: 800;
              font-size: 0.95rem;
              border: none;
              border-radius: 24px;
              cursor: pointer;
              box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);
              transition: all 0.3s ease;
              font-family: 'Quicksand', sans-serif;
              position: relative;
              overflow: hidden;
            }
            .lp-header-btn::after {
              content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
              background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
              transition: left 0.5s ease; transform: skewX(-20deg);
            }
            .lp-header-btn:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 25px rgba(245, 158, 11, 0.6);
              background: linear-gradient(135deg, #fbbf24, #f59e0b);
            }
            .lp-header-btn:hover::after { left: 150%; }
            @keyframes sakura-fall {
              0% { transform: translateY(-10vh) translateX(0) rotate(0deg); opacity:0; }
              10% { opacity:1; }
              90% { opacity:1; }
              100% { transform: translateY(110vh) translateX(80px) rotate(720deg); opacity:0; }
            }
            @keyframes sakura-sway {
              0%,100% { margin-left: 0; }
              25% { margin-left: 30px; }
              50% { margin-left: -20px; }
              75% { margin-left: 15px; }
            }
            .sakura-petal {
              position: fixed;
              top: -5vh;
              z-index: 9999;
              pointer-events: none;
              user-select: none;
              font-size: 1.2rem;
              color: #f9a8d4;
              text-shadow: 0 0 4px rgba(244,114,182,.4);
              animation: sakura-fall linear infinite, sakura-sway ease-in-out infinite;
            }
            @media (max-width:768px) {
              .lp-hide-mobile { display:none !important; }
              .lp-hero-grid { flex-direction:column !important; text-align:center !important; }
              .lp-hero-text h1 { font-size:2.2rem !important; }
              .lp-mascot-area { height:300px !important; }
            }
          `}</style>

          {/* ═══ SAKURA PETALS — Falling cherry blossoms ═══ */}
          {Array.from({ length: 20 }).map((_, i) => {
            const left = Math.random() * 100;
            const dur = 8 + Math.random() * 10;
            const delay = Math.random() * 12;
            const size = 0.8 + Math.random() * 1.2;
            const sway = 3 + Math.random() * 4;
            const opacity = 0.4 + Math.random() * 0.5;
            const symbols = ['🌸', '✿', '❀'];
            const sym = symbols[i % symbols.length];
            return (
              <span key={`sakura-${i}`} className="sakura-petal" style={{
                left: `${left}%`,
                fontSize: `${size}rem`,
                opacity,
                animationDuration: `${dur}s, ${sway}s`,
                animationDelay: `${delay}s, ${delay}s`,
              }}>{sym}</span>
            );
          })}

          {/* ═══ HEADER — Dark Navy ═══ */}
          <header style={{ width: '100%', background: 'linear-gradient(90deg, #0f2744, #1e3a5f)', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 20px rgba(0,0,0,.3)' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => onAuthCancel && onAuthCancel()}>
                <img src="/assets/siro_logo.png" alt="Siro" style={{ width: 48, height: 48, objectFit: 'contain' }} />
                <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'white', letterSpacing: '.5px' }}>SIRO NIHONGO</span>
              </div>
              <nav className="lp-hide-mobile" style={{ display: 'flex', gap: 28, alignItems: 'center', fontSize: '.92rem' }}>
                <a href="#" className="lp-header-link active">Trang chủ</a>
                <a href="#" className="lp-header-link">Khóa học</a>
                <a href="#" className="lp-header-link">Tài liệu</a>
                <a href="#" className="lp-header-link">Giới thiệu</a>
              </nav>
              <div style={{ display: 'flex', gap: 10 }}>
                {!isAuthView && <button className="lp-header-btn" onClick={onLoginClick}>Học online</button>}
              </div>
            </div>
          </header>

          {isAuthView ? (
            <div style={{ flex: 1, display: 'flex', position: 'relative', zIndex: 10 }}>
              <AuthPage onSuccess={onAuthSuccess} onCancel={onAuthCancel} />
            </div>
          ) : (
            <>
              {/* ═══ HERO — Gradient + Mascots freely placed ═══ */}
              <section style={{ position: 'relative', width: '100%', minHeight: '85vh', background: 'linear-gradient(135deg, #0f2744 0%, #1e3a5f 40%, #2563eb 100%)', backgroundSize: '200% 200%', animation: 'lp-gradient-shift 8s ease infinite', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                {/* Floating particles / circles */}
                <div style={{ position: 'absolute', top: '10%', left: '8%', width: 120, height: 120, borderRadius: '50%', background: 'rgba(96,165,250,.12)', animation: 'lp-pulse 4s ease-in-out infinite' }} />
                <div style={{ position: 'absolute', top: '60%', left: '3%', width: 60, height: 60, borderRadius: '50%', background: 'rgba(253,224,71,.08)', animation: 'lp-pulse 5s ease-in-out infinite 1s' }} />
                <div style={{ position: 'absolute', top: '20%', right: '12%', width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,.06)', animation: 'lp-pulse 6s ease-in-out infinite 2s' }} />
                <div style={{ position: 'absolute', bottom: '15%', right: '5%', width: 150, height: 150, borderRadius: '50%', background: 'rgba(96,165,250,.08)', animation: 'lp-pulse 4.5s ease-in-out infinite .5s' }} />
                {/* Sparkles */}
                {[{ t: '15%', l: '20%', d: 0 }, { t: '30%', l: '75%', d: 1 }, { t: '70%', l: '45%', d: 2 }, { t: '80%', l: '85%', d: .5 }, { t: '50%', l: '10%', d: 1.5 }].map((s, i) => (
                  <div key={i} style={{ position: 'absolute', top: s.t, left: s.l, width: 6, height: 6, borderRadius: '50%', background: 'white', animation: `lp-sparkle 3s ease-in-out infinite ${s.d}s` }} />
                ))}

                <div className="lp-hero-grid" style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 24px', display: 'flex', alignItems: 'center', gap: 40, position: 'relative', zIndex: 1, width: '100%' }}>
                  {/* Left: Text */}
                  <div className="lp-hero-text" style={{ flex: '1 1 50%', animation: 'lp-slide-left .8s ease-out both' }}>
                    <div style={{ display: 'inline-block', padding: '8px 20px', background: 'rgba(253,224,71,.15)', border: '1px solid rgba(253,224,71,.3)', borderRadius: 30, color: '#fde047', fontWeight: 700, fontSize: '.85rem', marginBottom: 24, backdropFilter: 'blur(4px)' }}>
                      🌸 Nền tảng #1 Học Tiếng Nhật
                    </div>
                    <h1 style={{ fontSize: '3.6rem', fontWeight: 900, color: 'white', lineHeight: 1.15, marginBottom: 16, textShadow: '0 4px 20px rgba(0,0,0,.3)' }}>
                      Chinh Phục JLPT<br /><span style={{ color: '#fde047' }}>Dễ Dàng</span> Cùng SIRO
                    </h1>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <button onClick={onLoginClick} className="lp-cta-btn" style={{ padding: '16px 44px', fontSize: '1.15rem', fontWeight: 800, background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', border: 'none', borderRadius: 30, cursor: 'pointer', boxShadow: '0 8px 24px rgba(245,158,11,.45)', fontFamily: "'Quicksand', sans-serif" }}>
                        BẮT ĐẦU HỌC NGAY
                      </button>
                      <button onClick={onLoginClick} style={{ padding: '16px 32px', fontSize: '1.05rem', fontWeight: 700, background: 'rgba(255,255,255,.05)', color: 'white', border: '2px solid rgba(255,255,255,.2)', borderRadius: 30, cursor: 'pointer', backdropFilter: 'blur(8px)', transition: 'all .3s', fontFamily: "'Quicksand', sans-serif" }} onMouseOver={e => { e.target.style.borderColor = 'rgba(255,255,255,.5)'; e.target.style.background = 'rgba(255,255,255,.15)'; e.target.style.transform = 'translateY(-2px)'; }} onMouseOut={e => { e.target.style.borderColor = 'rgba(255,255,255,.2)'; e.target.style.background = 'rgba(255,255,255,.05)'; e.target.style.transform = 'translateY(0)'; }}>
                        Tìm hiểu thêm
                      </button>
                    </div>
                  </div>

                  {/* Right: Mascots floating freely */}
                  <div className="lp-mascot-area" style={{ flex: '1 1 45%', position: 'relative', height: 460, minWidth: 320 }}>
                    {/* Siro Crying — bottom left */}
                    <img src="/assets/mascot_siro_crying.png" alt="Siro Crying" style={{ position: 'absolute', bottom: 0, left: 0, height: 200, objectFit: 'contain', filter: 'drop-shadow(0 8px 24px rgba(0,0,0,.35))', animation: 'lp-float-slow 4s ease-in-out infinite', zIndex: 1 }} />
                    {/* Siro Studying — center, dominant */}
                    <img src="/assets/mascot_siro_studying.png" alt="Siro Studying" style={{ position: 'absolute', bottom: '5%', left: '50%', transform: 'translateX(-50%)', height: 340, objectFit: 'contain', filter: 'drop-shadow(0 12px 32px rgba(0,0,0,.4))', animation: 'lp-bounce 5s ease-in-out infinite', zIndex: 3 }} />
                    {/* Siro Laughing — top right */}
                    <img src="/assets/mascot_siro_laughing.png" alt="Siro Laughing" style={{ position: 'absolute', top: 0, right: 0, height: 190, objectFit: 'contain', filter: 'drop-shadow(0 8px 24px rgba(0,0,0,.35))', animation: 'lp-float 3.5s ease-in-out infinite .5s', zIndex: 2 }} />
                    {/* Glow behind center mascot */}
                    <div style={{ position: 'absolute', bottom: '15%', left: '50%', transform: 'translateX(-50%)', width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle, rgba(96,165,250,.25) 0%, transparent 70%)', zIndex: 0 }} />
                  </div>
                </div>
                {/* Wave divider */}
                <svg style={{ position: 'absolute', bottom: -2, left: 0, width: '100%', height: 80 }} viewBox="0 0 1440 80" preserveAspectRatio="none">
                  <path d="M0,60 C360,0 720,80 1080,30 C1260,10 1380,50 1440,40 L1440,80 L0,80 Z" fill="#ffffff" />
                </svg>
              </section>

              {/* ═══ MASCOT STORY 1 — Siro Crying (Light bg) ═══ */}
              <section style={{ background: '#f8fafc', width: '100%', padding: '100px 20px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: 300, height: 300, borderRadius: '50%', background: 'rgba(239,68,68,.04)', filter: 'blur(60px)' }} />
                <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 60, flexWrap: 'wrap' }}>
                  {/* Image */}
                  <div style={{ flex: '1 1 360px', display: 'flex', justifyContent: 'center', position: 'relative' }}>
                    <div style={{ position: 'absolute', width: 280, height: 280, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(239,68,68,.08), rgba(251,191,36,.08))', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', animation: 'lp-pulse 5s ease-in-out infinite' }} />
                    <img src="/assets/mascot_siro_crying.png" alt="Siro Crying" style={{ height: 320, objectFit: 'contain', position: 'relative', zIndex: 1, animation: 'lp-float-slow 4s ease-in-out infinite', filter: 'drop-shadow(0 12px 28px rgba(0,0,0,.12))' }} />
                  </div>
                  {/* Text */}
                  <div style={{ flex: '1 1 400px' }}>
                    <div style={{ display: 'inline-block', padding: '6px 16px', background: '#fef2f2', borderRadius: 20, color: '#ef4444', fontWeight: 700, fontSize: '.82rem', marginBottom: 16, border: '1px solid #fecaca' }}>😢 Giai đoạn 1</div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#1e293b', lineHeight: 1.3, marginBottom: 16 }}>Học trước quên sau?<br /><span style={{ color: '#ef4444' }}>Bạn không đơn độc!</span></h2>
                    <p style={{ color: '#475569', lineHeight: 1.8, fontSize: '1rem', marginBottom: 24 }}>Hầu hết người học tiếng Nhật đều gặp phải vấn đề quên từ vựng. Bạn dành hàng giờ để học nhưng chỉ sau vài ngày, mọi thứ đã bay đi mất. Siro cũng từng như vậy — khóc vì nản lòng, vì không biết phải làm sao.</p>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {['Quên từ vựng liên tục', 'Mất động lực học', 'Không có phương pháp'].map((tag, i) => (
                        <span key={i} style={{ padding: '8px 16px', background: 'white', borderRadius: 10, fontSize: '.85rem', fontWeight: 600, color: '#64748b', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,.03)' }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* ═══ MASCOT STORY 2 — Siro Studying (Blue bg) ═══ */}
              <section style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)', width: '100%', padding: '100px 20px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '20%', left: '5%', width: 200, height: 200, borderRadius: '50%', background: 'rgba(96,165,250,.1)', animation: 'lp-pulse 6s ease-in-out infinite' }} />
                <div style={{ position: 'absolute', bottom: '10%', right: '8%', width: 120, height: 120, borderRadius: '50%', background: 'rgba(253,224,71,.06)', animation: 'lp-pulse 4s ease-in-out infinite 1s' }} />
                <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 60, flexWrap: 'wrap-reverse' }}>
                  {/* Text (left on desktop) */}
                  <div style={{ flex: '1 1 400px' }}>
                    <div style={{ display: 'inline-block', padding: '6px 16px', background: 'rgba(96,165,250,.15)', borderRadius: 20, color: '#93c5fd', fontWeight: 700, fontSize: '.82rem', marginBottom: 16, border: '1px solid rgba(96,165,250,.25)' }}>📚 Giai đoạn 2</div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'white', lineHeight: 1.3, marginBottom: 16 }}>Luyện tập mỗi ngày<br /><span style={{ color: '#fde047' }}>chỉ 15 phút với SRS</span></h2>
                    <p style={{ color: 'rgba(255,255,255,.7)', lineHeight: 1.8, fontSize: '1rem', marginBottom: 24 }}>Siro bắt đầu hành trình mới với phương pháp SRS — hệ thống sẽ tự động nhắc bạn ôn tập đúng lúc trước khi quên. Không cần học nhiều, chỉ cần học đúng cách. Mỗi ngày 15 phút, kiến thức sẽ được ghi nhớ sâu và lâu dài.</p>
                    {/* Mini chat simulation */}
                    <div style={{ background: 'rgba(255,255,255,.08)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,.12)', backdropFilter: 'blur(8px)' }}>
                      <div style={{ fontSize: '.8rem', color: 'rgba(255,255,255,.4)', marginBottom: 12, fontWeight: 600 }}>💬 Trò chuyện với Gia sư AI</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ alignSelf: 'flex-end', background: '#2563eb', padding: '10px 16px', borderRadius: '14px 14px 4px 14px', color: 'white', fontSize: '.9rem', maxWidth: '75%' }}>「食べる」nghĩa là gì ạ?</div>
                        <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,.12)', padding: '10px 16px', borderRadius: '14px 14px 14px 4px', color: 'rgba(255,255,255,.9)', fontSize: '.9rem', maxWidth: '75%' }}>「食べる」(taberu) nghĩa là "ăn" 🍙. Ví dụ: ごはんを食べる = Ăn cơm</div>
                        <div style={{ alignSelf: 'flex-end', background: '#2563eb', padding: '10px 16px', borderRadius: '14px 14px 4px 14px', color: 'white', fontSize: '.9rem', maxWidth: '75%' }}>Cảm ơn! Cho mình thêm ví dụ nha! 🙏</div>
                      </div>
                    </div>
                  </div>
                  {/* Image */}
                  <div style={{ flex: '1 1 360px', display: 'flex', justifyContent: 'center', position: 'relative' }}>
                    <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(96,165,250,.2) 0%, transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
                    <img src="/assets/mascot_siro_studying.png" alt="Siro Studying" style={{ height: 380, objectFit: 'contain', position: 'relative', zIndex: 1, animation: 'lp-bounce 5s ease-in-out infinite', filter: 'drop-shadow(0 16px 36px rgba(0,0,0,.3))' }} />
                  </div>
                </div>
              </section>

              {/* ═══ MASCOT STORY 3 — Siro Laughing (Light warm bg) ═══ */}
              <section style={{ background: 'linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%)', width: '100%', padding: '100px 20px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', bottom: '-5%', left: '-3%', width: 250, height: 250, borderRadius: '50%', background: 'rgba(245,158,11,.08)', filter: 'blur(50px)' }} />
                <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 60, flexWrap: 'wrap' }}>
                  {/* Image */}
                  <div style={{ flex: '1 1 360px', display: 'flex', justifyContent: 'center', position: 'relative' }}>
                    <div style={{ position: 'absolute', width: 280, height: 280, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(245,158,11,.1), rgba(234,179,8,.1))', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', animation: 'lp-pulse 4s ease-in-out infinite' }} />
                    <img src="/assets/mascot_siro_laughing.png" alt="Siro Laughing" style={{ height: 320, objectFit: 'contain', position: 'relative', zIndex: 1, animation: 'lp-float 3.5s ease-in-out infinite', filter: 'drop-shadow(0 12px 28px rgba(0,0,0,.12))' }} />
                  </div>
                  {/* Text */}
                  <div style={{ flex: '1 1 400px' }}>
                    <div style={{ display: 'inline-block', padding: '6px 16px', background: '#fef3c7', borderRadius: 20, color: '#d97706', fontWeight: 700, fontSize: '.82rem', marginBottom: 16, border: '1px solid #fde68a' }}>🏆 Giai đoạn 3</div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#1e293b', lineHeight: 1.3, marginBottom: 16 }}>Đỗ JLPT dễ dàng!<br /><span style={{ color: '#d97706' }}>Siro tự hào về bạn!</span></h2>
                    <p style={{ color: '#475569', lineHeight: 1.8, fontSize: '1rem', marginBottom: 24 }}>Sau hành trình kiên trì cùng SIRO NIHONGO, bạn đã chinh phục được kỳ thi JLPT. Siro cười tươi rạng rỡ, tay cầm chứng chỉ — đó chính là thành quả của sự nỗ lực mỗi ngày. Bạn hoàn toàn có thể làm được!</p>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {[
                        { n: 'N5 → N1', l: 'Lộ trình đầy đủ' },
                        { n: '15 phút/ngày', l: 'Học không áp lực' },
                        { n: 'AI 24/7', l: 'Hỗ trợ liên tục' },
                      ].map((stat, i) => (
                        <div key={i} style={{ padding: '16px 20px', background: 'white', borderRadius: 14, boxShadow: '0 4px 12px rgba(0,0,0,.05)', border: '1px solid #fde68a', textAlign: 'center', flex: '1 1 120px' }}>
                          <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#d97706', marginBottom: 4 }}>{stat.n}</div>
                          <div style={{ fontSize: '.8rem', color: '#92400e', fontWeight: 500 }}>{stat.l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* ═══ TESTIMONIALS — Light navy bg ═══ */}
              <section style={{ background: 'linear-gradient(180deg, #f0f4f8 0%, #e2e8f0 100%)', width: '100%', padding: '80px 20px' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
                  <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0f172a', marginBottom: 50 }}>Học viên nói gì?</h2>

                  <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {[
                      { name: 'Nam Lê', level: 'Đỗ N3', quote: '"Mình đã đỗ N3 cực kỳ nhẹ nhàng nhờ lộ trình học từ vựng SRS hàng ngày!"', img: '11' },
                      { name: 'Nguyên Nguyễn', level: 'Đỗ N4', quote: '"Các bé linh vật dễ thương quá, học không biết chán. Tính năng ôn tập cực kỳ hiệu quả."', img: '5' },
                    ].map((t, i) => (
                      <div key={i} style={{ flex: '1 1 400px', textAlign: 'left', padding: 36, background: 'white', borderRadius: 20, boxShadow: '0 8px 24px rgba(0,0,0,.06)', animation: `lp-slide-up .6s ease-out both ${.2 + i * .15}s`, position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: 'linear-gradient(180deg, #2563eb, #60a5fa)' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                          <div style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', border: '3px solid #dbeafe' }}>
                            <img src={`https://i.pravatar.cc/150?img=${t.img}`} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                          <div>
                            <h4 style={{ fontWeight: 800, color: '#1e293b', margin: 0, fontSize: '1rem' }}>{t.name}</h4>
                            <span style={{ fontSize: '.82rem', color: '#2563eb', fontWeight: 700 }}>{t.level}</span>
                          </div>
                        </div>
                        <p style={{ fontSize: '1.05rem', color: '#334155', fontStyle: 'italic', fontWeight: 500, lineHeight: 1.6 }}>{t.quote}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* ═══ CTA Banner ═══ */}
              <section style={{ width: '100%', background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', padding: '60px 20px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-30%', right: '-5%', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,.05)' }} />
                <div style={{ position: 'absolute', bottom: '-20%', left: '-3%', width: 150, height: 150, borderRadius: '50%', background: 'rgba(96,165,250,.1)' }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'white', marginBottom: 12 }}>Sẵn sàng chinh phục tiếng Nhật?</h2>
                  <p style={{ color: 'rgba(255,255,255,.7)', marginBottom: 28, fontSize: '1rem' }}>Đăng ký ngay hôm nay — hoàn toàn miễn phí!</p>
                  <button onClick={onLoginClick} className="lp-cta-btn" style={{ padding: '16px 48px', fontSize: '1.15rem', fontWeight: 800, background: '#f59e0b', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', boxShadow: '0 8px 24px rgba(245,158,11,.45)', fontFamily: "'Quicksand', sans-serif" }}>
                    ĐĂNG KÝ MIỄN PHÍ
                  </button>
                </div>
              </section>
            </>
          )}

          {/* ═══ FOOTER — Dark Navy ═══ */}
          <footer style={{ width: '100%', background: 'linear-gradient(180deg, #0f2744, #091b30)', color: 'white', padding: '60px 24px 24px' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 40, paddingBottom: 40, borderBottom: '1px solid rgba(255,255,255,.1)', marginBottom: 24 }}>
                <div style={{ flex: '1 1 280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <img src="/assets/siro_logo.png" alt="Siro" style={{ width: 48, height: 48, objectFit: 'contain' }} />
                    <span style={{ fontSize: '1.3rem', fontWeight: 900, letterSpacing: '.5px', fontFamily: "'Quicksand', sans-serif" }}>SIRO NIHONGO</span>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,.55)', lineHeight: 1.7, fontSize: '.9rem' }}>Nền tảng học Tiếng Nhật thông minh với phương pháp Lặp lại ngắt quãng (SRS) và Gia sư AI 24/7.</p>
                </div>
                {[
                  { title: 'Khóa học', links: ['JLPT N5', 'JLPT N4', 'JLPT N3', 'Giao tiếp'] },
                  { title: 'Hỗ trợ', links: ['Hướng dẫn', 'Liên hệ', 'Chính sách', 'FAQ'] },
                  { title: 'Liên kết', links: ['Trang chủ', 'Blog', 'Về chúng tôi', 'Cộng đồng'] },
                ].map((col, ci) => (
                  <div key={ci} style={{ flex: '1 1 140px' }}>
                    <h4 style={{ fontSize: '.95rem', fontWeight: 700, color: 'rgba(255,255,255,.45)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 20 }}>{col.title}</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {col.links.map((lk, li) => (
                        <a key={li} href="#" style={{ color: 'rgba(255,255,255,.7)', textDecoration: 'none', fontSize: '.9rem', fontWeight: 500, transition: 'color .2s' }} onMouseOver={e => e.target.style.color = '#fde047'} onMouseOut={e => e.target.style.color = 'rgba(255,255,255,.7)'}>{lk}</a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, color: 'rgba(255,255,255,.35)', fontSize: '.82rem' }}>
                <span>&copy; {new Date().getFullYear()} SIRO NIHONGO. All rights reserved.</span>
                <span style={{ fontWeight: 600, color: 'rgba(255,255,255,.5)' }}>Made with ❤️ for Japanese learners</span>
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* Streak Modal overlay */}
      {showStreakModal && (
        <div className="streak-modal-overlay" onClick={() => setShowStreakModal(false)}>
          <div className="streak-modal-content" onClick={e => e.stopPropagation()}>
            <button className="streak-modal-close" onClick={() => setShowStreakModal(false)}>×</button>
            <div className="streak-visual-container" style={{ margin: 0, boxShadow: 'none' }}>
              <div className="streak-visual-header">
                <img src="/assets/mascot_siro_kimono_nobg.png" alt="Siro Mascot" style={{ height: '110px', objectFit: 'contain', marginRight: '10px', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' }} />
                <div className="streak-flower-main">
                  <SakuraFlower filled={true} size={80} />
                </div>
                <div className="streak-count-text">
                  <span className="streak-number">{dashboardData?.streak !== undefined ? dashboardData.streak : (streak || 0)}</span>
                  <span className="streak-label">
                    <span>ngày</span>
                    <span>streak !</span>
                  </span>
                </div>
              </div>

              <div className="streak-week-card">
                <div className="streak-days-row">
                  {getLast7DaysData().map((day, i) => (
                    <div key={i} className="streak-day-col">
                      <span className={`streak-day-name ${day.isToday ? 'is-today' : ''}`}>{day.name}</span>
                      <div className="streak-day-flower">
                        <SakuraFlower filled={day.completed} color={day.completed ? '#2dd4bf' : '#ccfbf1'} />
                        {day.completed && <Check className="streak-day-check" size={20} strokeWidth={3.5} />}
                      </div>
                    </div>
                  ))}

                </div>
                <div className="streak-message">
                  Chúc mừng! Bạn đã duy trì Day Streak thành công!
                </div>
              </div>

              <div className="streak-footer">
                <div className="streak-freeze-status">
                  <div className="freeze-icon-wrap">
                    <CoinIcon style={{ width: '36px', height: '36px' }} />
                  </div>
                  <span className="freeze-text">x1 lần</span>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button className="btn-details" onClick={() => setShowStreakModal(false)}>Đóng</button>
                  {dashboardData?.streakFrozenToday ? (
                    <button className="modal-freeze-btn" style={{ opacity: 0.6, cursor: 'default' }}>
                      Đang giữ chuỗi ❄️
                    </button>
                  ) : (
                    <button className="modal-freeze-btn" onClick={handleUseFreeze}>
                      <Snowflake size={18} /> Giữ chuỗi
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
