import React, { useState, useEffect } from 'react';
import { vocabApi, analyticsApi } from '../services/api';
import { Sparkles, Play, BookOpen, Globe, Users, Video, ShieldCheck, Loader, Brain, Flame, CheckCircle2, BarChart2, ShieldAlert, Trophy, Snowflake, Calendar, List, Check, Star } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { OnlineUsersWidget } from '../components/OnlineUsersWidget';
import { UserProfileModal } from '../components/UserProfileModal';
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

const HomePage = ({ startStudy, streak, onLoginClick, onLogout, onAdminClick, onDailyClick }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [selectedProfileUsername, setSelectedProfileUsername] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
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
              await analyticsApi.logSession({ wordsStudied: 0, correctAnswers: 0, totalQuestions: 0 });
              const newDash = await analyticsApi.getDashboard();
              setDashboardData(newDash);
            } catch (e) {
              console.error("Failed to log attendance session", e);
            }
            setShowStreakModal(true);
            localStorage.setItem(`lastStreakDate_${user.username}`, todayStr);
            sessionStorage.setItem('streakModalShown', 'true');
          }
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
    let totalWordsYear = 0;
    dashboardData.history.forEach(session => {
      historyMap[session.studyDate] = session.wordsStudied;
      totalWordsYear += session.wordsStudied;
    });

    // Generate grid cells for 53 weeks ending on current Saturday
    const today = new Date();
    const endOfWeek = new Date(today);
    const daysUntilSaturday = 6 - today.getDay();
    endOfWeek.setDate(today.getDate() + daysUntilSaturday);

    const cells = [];
    const startDay = new Date(endOfWeek);
    startDay.setDate(endOfWeek.getDate() - 370);

    for (let i = 0; i <= 370; i++) {
      const current = new Date(startDay);
      current.setDate(startDay.getDate() + i);
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const dateVal = String(current.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${dateVal}`;
      
      cells.push({
        date: current,
        dateStr: dateString,
        words: historyMap[dateString] || 0
      });
    }

    // Colors mapping helper
    const getCellColor = (words) => {
      if (words === 0) return 'var(--border-color)';
      if (words <= 5) return '#bfdbfe';
      if (words <= 15) return '#60a5fa';
      if (words <= 30) return '#2563eb';
      return '#1d4ed8';
    };

    // Row headers (Sun, Mon, Tue, Wed, Thu, Fri, Sat)
    // We only label Mon, Wed, Fri to match GitHub style
    const rowLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

    // Month headers
    // We want to find the columns where each month starts
    const monthLabels = [];
    let lastMonth = -1;
    for (let col = 0; col < 53; col++) {
      // Look at the first cell of the column
      const cellIndex = col * 7;
      if (cellIndex < cells.length) {
        const cellDate = cells[cellIndex].date;
        const currentMonth = cellDate.getMonth();
        if (currentMonth !== lastMonth) {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          monthLabels.push({ colIndex: col, name: monthNames[currentMonth] });
          lastMonth = currentMonth;
        }
      }
    }

    return (
      <div className="card" style={{ padding: '24px', width: '100%', boxSizing: 'border-box' }}>
        <div className="flex-between" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} color="var(--accent-color)" />
            <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Lịch sử học tập (365 ngày qua)</h3>
          </div>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Tổng cộng: <strong style={{ color: 'var(--text-primary)' }}>{totalWordsYear}</strong> từ đã học
          </span>
        </div>

        {/* Scrollable Container for GitHub Heatmap */}
        <div style={{ overflowX: 'auto', width: '100%', paddingBottom: '10px' }} className="custom-scrollbar">
          <div style={{ display: 'flex', gap: '8px', minWidth: '830px', padding: '10px 0' }}>
            
            {/* Weekdays Labels */}
            <div style={{ 
              display: 'grid', 
              gridTemplateRows: 'repeat(7, 12px)', 
              gridGap: '3px', 
              paddingTop: '20px', 
              width: '24px', 
              fontSize: '0.7rem', 
              color: 'var(--text-secondary)',
              alignItems: 'center'
            }}>
              {rowLabels.map((lbl, idx) => (
                <div key={idx} style={{ height: '12px', display: 'flex', alignItems: 'center' }}>
                  {lbl}
                </div>
              ))}
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
                    {m.name}
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
                {cells.map((cell, idx) => (
                  <div
                    key={idx}
                    title={`${cell.dateStr}: Học ${cell.words} từ`}
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '2px',
                      backgroundColor: getCellColor(cell.words),
                      cursor: 'pointer',
                      transition: 'transform 0.1s ease',
                    }}
                    onMouseEnter={e => {
                      e.target.style.transform = 'scale(1.25)';
                      e.target.style.zIndex = '1';
                    }}
                    onMouseLeave={e => {
                      e.target.style.transform = 'scale(1)';
                      e.target.style.zIndex = '0';
                    }}
                  />
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Legend bottom row */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px', marginTop: '12px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <span>Less</span>
          <div style={{ width: '10px', height: '10px', borderRadius: '1.5px', backgroundColor: 'var(--border-color)' }} />
          <div style={{ width: '10px', height: '10px', borderRadius: '1.5px', backgroundColor: '#bfdbfe' }} />
          <div style={{ width: '10px', height: '10px', borderRadius: '1.5px', backgroundColor: '#60a5fa' }} />
          <div style={{ width: '10px', height: '10px', borderRadius: '1.5px', backgroundColor: '#2563eb' }} />
          <div style={{ width: '10px', height: '10px', borderRadius: '1.5px', backgroundColor: '#1d4ed8' }} />
          <span>More</span>
        </div>
      </div>
    );
  };

  const isAdmin = user && (user.username === 'admin' || user.role === 'ADMIN');

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
      <circle cx="50" cy="50" r="45" fill="#fde047" stroke="#fbbf24" strokeWidth="6"/>
      <circle cx="50" cy="50" r="32" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="4 4"/>
      <path d="M45,35 L45,65 M55,35 L55,65" stroke="#d97706" strokeWidth="4" strokeLinecap="round" />
      <path d="M40,45 C40,40 50,35 60,40 C65,45 60,55 50,55 L40,55 C30,55 35,65 40,70 C50,75 60,70 60,65" stroke="#d97706" strokeWidth="4" strokeLinecap="round" fill="none"/>
    </svg>
  );

  const getLast7DaysData = () => {
    const days = [];
    const historyMap = {};
    if (dashboardData && dashboardData.history) {
      dashboardData.history.forEach(session => {
        historyMap[session.studyDate] = true;
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
      {user ? (
        // Logged-in Dashboard Workspace
        <div className="dashboard-wrapper animate-fade-in">
          {/* Streak Banner */}
          <div className="streak-banner star-streak-banner">
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
          </div>
          
          <OnlineUsersWidget onUserClick={username => setSelectedProfileUsername(username)} />

          {selectedProfileUsername && (
            <UserProfileModal username={selectedProfileUsername} onClose={() => setSelectedProfileUsername(null)} />
          )}

          {/* SRS Dashboard for Logged-In Users */}
          {dashboardData && (
            <div style={{ marginBottom: '24px' }}>
              {/* Stats Grid */}
              <div className="stats-grid">
                <div className="stat-card-inner">
                  <div className="stat-card-icon" style={{ background: 'rgba(37,99,235,0.1)', color: 'var(--accent-color)' }}><Brain size={20} /></div>
                  <div className="stat-card-text">
                    <div className="stat-name">Cần ôn hôm nay</div>
                    <div className="stat-number">{dashboardData.dueCount}</div>
                  </div>
                </div>
                <div className="stat-card-inner">
                  <div className="stat-card-icon" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success-color)' }}><Play size={20} /></div>
                  <div className="stat-card-text">
                    <div className="stat-name">Đã học hôm nay</div>
                    <div className="stat-number">{dashboardData.wordsStudiedToday || 0}</div>
                  </div>
                </div>
                <div className="stat-card-inner">
                  <div className="stat-card-icon" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success-color)' }}><CheckCircle2 size={20} /></div>
                  <div className="stat-card-text">
                    <div className="stat-name">Tổng đã học</div>
                    <div className="stat-number">{dashboardData.learnedCount}</div>
                  </div>
                </div>
                <div className="stat-card-inner">
                  <div className="stat-card-icon" style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4' }}><Users size={20} /></div>
                  <div className="stat-card-text">
                    <div className="stat-name">Đang online</div>
                    <div className="stat-number">{dashboardData.onlineCount || 1}/{dashboardData.totalUsers || 1}</div>
                  </div>
                </div>
              </div>

              <div className="srs-banner">
                <div className="srs-banner-text">
                  <h4>Hệ thống Ôn tập Ngắt quãng (SRS)</h4>
                  <p>{dashboardData.dueCount > 0 ? `Bạn có ${dashboardData.dueCount} từ cần ôn tập hôm nay.` : 'Luyện tập ngắt quãng giúp bạn ghi nhớ từ vựng lâu hơn gấp 5 lần.'}</p>
                </div>
                <div className="srs-actions">
                  {dashboardData.dueCount > 0 && (
                    <button className="btn btn-primary" onClick={() => startStudy(null, 'srs-review')}>
                      <Brain size={16} /> Ôn Flashcard ({dashboardData.dueCount})
                    </button>
                  )}
                  {dashboardData.learnedCount > 0 && (
                    <>
                      <button className="btn btn-secondary" onClick={() => startStudy(null, 'srs-learned')}>
                        <Brain size={16} /> Đã học ({dashboardData.learnedCount})
                      </button>
                      <button className="btn btn-ghost" onClick={() => startStudy('LEARNED_REVIEW', 'daily')}>
                        <Play size={16} /> Quiz ôn tập
                      </button>
                      <button className="btn btn-secondary" onClick={() => startStudy(null, 'srs-list')} style={{ borderColor: 'var(--accent-color)', color: 'var(--accent-color)' }}>
                        <List size={18} /> Xem danh sách SRS ({dashboardData.learnedCount})
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="srs-banner tutor-banner" style={{ marginTop: '20px', background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.15) 100%)', borderColor: 'var(--accent-color)' }}>
                <div className="srs-banner-text">
                  <h4 style={{ color: 'var(--accent-color)' }}>🤖 Gia sư Đóng vai Hội thoại AI (Visible & Invisible 2-Layer AI)</h4>
                  <p>Trò chuyện tiếng Nhật trực tiếp theo thời gian thực với Giáo viên AI bản xứ. Phân tích lỗi sai, gợi ý học tập và mini quiz tự động.</p>
                </div>
                <div className="srs-actions">
                  <button className="btn btn-primary" onClick={() => startStudy(null, 'conversation-tutor')} style={{ background: 'var(--accent-color)', borderColor: 'var(--accent-color)' }}>
                    <Users size={16} /> Bắt đầu Kaiwa
                  </button>
                </div>
              </div>

              <div className="dashboard-grid">
                {renderActivityGraph()}

                <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' }}>
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
          )}
        </div>
      ) : (
        // Landing page for guest
        <div className="landing-wrapper animate-fade-in">
          <div className="landing-hero">
            <div className="landing-badge">SIRO NIHONGO</div>
            <h1 className="landing-title">Học Tiếng Nhật<br />Thông Minh Cùng SIRO</h1>
            <p className="landing-sub">
              Phương pháp lập lại ngắt quãng và Flashcard sinh động. Chinh phục JLPT N5 - N1.
            </p>
            <div className="landing-cta">
              <button className="btn btn-primary btn-xl" onClick={onLoginClick}>HỌC NGAY</button>
              <button className="btn btn-secondary btn-xl" onClick={onLoginClick}>{t.auth.loginTitle}</button>
            </div>
            <div className="landing-pills">
              <span className="landing-pill">15' mỗi ngày đỗ JLPT</span>
              <span className="landing-pill">Lộ trình nhanh - mạnh - chuẩn</span>
              <span className="landing-pill">Giáo viên N1</span>
            </div>
          </div>

          <div className="service-grid">
            {serviceItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="service-card-item">
                  <div className="service-icon-wrap"><Icon size={20} /></div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: 'center', padding: '20px 0 40px' }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>{t.home.featuresTitle || 'Khám phá lộ trình học tập phù hợp của bạn'}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Học trọn vẹn, Tiếng Nhật Thông Minh đơn cùng SIRO</p>
          </div>
        </div>
      )}

      {/* Streak Modal overlay */}
      {showStreakModal && (
        <div className="streak-modal-overlay" onClick={() => setShowStreakModal(false)}>
          <div className="streak-modal-content" onClick={e => e.stopPropagation()}>
            <button className="streak-modal-close" onClick={() => setShowStreakModal(false)}>×</button>
            <div className="streak-visual-container" style={{ margin: 0, boxShadow: 'none' }}>
              <div className="streak-visual-header">
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
                    <button className="modal-freeze-btn" onClick={handleActivateFreeze}>
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
