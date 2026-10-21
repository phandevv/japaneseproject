import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GraduationCap, Clock, CheckCircle2, AlertCircle, Play, 
  RotateCcw, History, ArrowRight, Award, Calendar, Search, 
  BarChart3, Sparkles, BookOpen, Volume2
} from 'lucide-react';
import { mockExamApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function MockExamListPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [exams, setExams] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('exams'); // 'exams' | 'history'
  
  // Filters
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, [isAuthenticated]);

  const loadData = async () => {
    setLoading(true);
    try {
      const examsData = await mockExamApi.getExams();
      setExams(examsData || []);

      if (isAuthenticated) {
        try {
          const historyData = await mockExamApi.getHistory();
          setHistory(historyData || []);
        } catch (err) {
          console.error("Failed to fetch exam history:", err);
        }
      }
    } catch (err) {
      console.error("Failed to load exams:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async (examId) => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    navigate(`/mock-exams/run/${examId}`);
  };

  const years = Array.from(new Set(exams.map(e => e.year))).sort((a, b) => b - a);

  const filteredExams = exams.filter(e => {
    if (selectedYear !== 'ALL' && e.year !== Number(selectedYear)) return false;
    if (selectedMonth !== 'ALL' && e.month !== Number(selectedMonth)) return false;
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'NOT_STARTED' && e.userAttemptStatus !== 'NOT_STARTED' && e.userAttemptStatus) return false;
      if (statusFilter === 'IN_PROGRESS' && e.userAttemptStatus !== 'IN_PROGRESS') return false;
      if (statusFilter === 'COMPLETED' && e.userAttemptStatus !== 'COMPLETED') return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = e.title?.toLowerCase().includes(q);
      const matchYear = String(e.year).includes(q);
      if (!matchTitle && !matchYear) return false;
    }
    return true;
  });

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px', minHeight: '85vh' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.95), rgba(79, 70, 229, 0.9))',
        borderRadius: 'var(--radius-xl)',
        padding: '36px 32px',
        color: '#ffffff',
        marginBottom: 32,
        boxShadow: 'var(--shadow-lg)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ maxWidth: 720, position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            background: 'rgba(255, 255, 255, 0.18)',
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 16,
            backdropFilter: 'blur(8px)'
          }}>
            <Sparkles size={16} />
            Bộ đề thi thật JLPT N3 (2010 – 2025)
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 12px 0', letterSpacing: '-0.5px' }}>
            Phòng Thi Thử Chuẩn JLPT N3
          </h1>
          <p style={{ fontSize: 16, opacity: 0.92, margin: 0, lineHeight: 1.6 }}>
            Tổng hợp 30 đợt thi thật đầy đủ 3 phần: Từ vựng (30p), Ngữ pháp & Đọc hiểu (70p), Nghe hiểu (40p) kèm Audio MP3 và tranh minh họa. Dữ liệu chuẩn lưu trực tiếp trong Database!
          </p>
        </div>

        {/* Quick stats badges */}
        <div style={{
          display: 'flex',
          gap: 16,
          marginTop: 24,
          flexWrap: 'wrap',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{
            padding: '10px 18px',
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: 'var(--radius-md)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <BookOpen size={20} />
            <div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Tổng số đề thi</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{exams.length} Bộ đề</div>
            </div>
          </div>

          <div style={{
            padding: '10px 18px',
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: 'var(--radius-md)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <Clock size={20} />
            <div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Thời gian thi thật</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>140 Phút / Đề</div>
            </div>
          </div>

          <div style={{
            padding: '10px 18px',
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: 'var(--radius-md)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <Volume2 size={20} />
            <div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Phần nghe Choukai</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>Audio 30 Năm</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: 12,
        marginBottom: 24,
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: 8
      }}>
        <button
          onClick={() => setActiveTab('exams')}
          style={{
            padding: '10px 20px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: activeTab === 'exams' ? 'var(--accent-color)' : 'transparent',
            color: activeTab === 'exams' ? '#ffffff' : 'var(--text-secondary)',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.2s'
          }}
        >
          <GraduationCap size={18} />
          Danh sách đề thi ({exams.length})
        </button>

        {isAuthenticated && (
          <button
            onClick={() => setActiveTab('history')}
            style={{
              padding: '10px 20px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: activeTab === 'history' ? 'var(--accent-color)' : 'transparent',
              color: activeTab === 'history' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s'
            }}
          >
            <History size={18} />
            Lịch sử thi của tôi ({history.length})
          </button>
        )}
      </div>

      {/* Tab: Exams List */}
      {activeTab === 'exams' && (
        <>
          {/* Filter Bar */}
          <div style={{
            display: 'flex',
            gap: 12,
            marginBottom: 24,
            flexWrap: 'wrap',
            alignItems: 'center',
            background: 'var(--surface-color)',
            padding: '16px 20px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            {/* Search */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--bg-color)',
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              flex: '1 1 240px'
            }}>
              <Search size={16} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Tìm theo năm hoặc tên đề..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  width: '100%',
                  color: 'var(--text-primary)',
                  fontSize: 14
                }}
              />
            </div>

            {/* Year filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Năm:</span>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-color)',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">Tất cả năm ({years.length})</option>
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Month filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Kỳ thi:</span>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-color)',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">Tất cả kỳ</option>
                <option value="7">Tháng 7 (Mùa hè)</option>
                <option value="12">Tháng 12 (Mùa đông)</option>
              </select>
            </div>

            {/* Status filter if logged in */}
            {isAuthenticated && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Trạng thái:</span>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-color)',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    cursor: 'pointer'
                  }}
                >
                  <option value="ALL">Tất cả</option>
                  <option value="NOT_STARTED">Chưa thi</option>
                  <option value="IN_PROGRESS">Đang làm dở</option>
                  <option value="COMPLETED">Đã hoàn thành</option>
                </select>
              </div>
            )}
          </div>

          {/* Exams Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
              Đang tải danh sách đề thi...
            </div>
          ) : filteredExams.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: 'var(--surface-color)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)'
            }}>
              <GraduationCap size={48} color="var(--text-muted)" style={{ marginBottom: 16 }} />
              <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>Không tìm thấy đề thi phù hợp</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 8 }}>Vui lòng thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: 20
            }}>
              {filteredExams.map(exam => {
                const isCompleted = exam.userAttemptStatus === 'COMPLETED';
                const isInProgress = exam.userAttemptStatus === 'IN_PROGRESS';

                return (
                  <div
                    key={exam.examId}
                    style={{
                      background: 'var(--surface-color)',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-color)',
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'all 0.25s ease',
                      position: 'relative'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                      e.currentTarget.style.borderColor = 'var(--accent-color)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                    }}
                  >
                    <div>
                      {/* Top tags */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{
                          padding: '4px 10px',
                          background: 'rgba(37, 99, 235, 0.1)',
                          color: 'var(--accent-color)',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 700
                        }}>
                          JLPT {exam.level}
                        </span>

                        {isCompleted && (
                          <span style={{
                            padding: '4px 10px',
                            background: 'var(--success-light)',
                            color: 'var(--success-color)',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}>
                            <CheckCircle2 size={13} />
                            Đã thi ({exam.userLastScore}%)
                          </span>
                        )}

                        {isInProgress && (
                          <span style={{
                            padding: '4px 10px',
                            background: 'var(--warning-light)',
                            color: 'var(--warning-color)',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}>
                            <Clock size={13} />
                            Đang làm dở
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 10px 0', color: 'var(--text-primary)' }}>
                        {exam.title}
                      </h3>

                      {/* Exam meta */}
                      <div style={{
                        display: 'flex',
                        gap: 16,
                        fontSize: 13,
                        color: 'var(--text-secondary)',
                        marginBottom: 16,
                        flexWrap: 'wrap'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Clock size={15} color="var(--text-muted)" />
                          <span>{Math.round((exam.totalTimeSec || 8400) / 60)} phút</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <BookOpen size={15} color="var(--text-muted)" />
                          <span>{exam.totalQuestions} câu hỏi</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Volume2 size={15} color="var(--text-muted)" />
                          <span>Audio Choukai</span>
                        </div>
                      </div>

                      {/* Section previews */}
                      <div style={{
                        background: 'var(--bg-color)',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                        marginBottom: 20
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span>1. Văn tự - Từ vựng</span>
                          <span style={{ fontWeight: 600 }}>30p / 35 câu</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span>2. Ngữ pháp - Đọc hiểu</span>
                          <span style={{ fontWeight: 600 }}>70p / 38 câu</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>3. Nghe hiểu (Choukai)</span>
                          <span style={{ fontWeight: 600 }}>40p / ~28 câu</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                      {isInProgress ? (
                        <button
                          onClick={() => handleStartExam(exam.examId)}
                          style={{
                            flex: 1,
                            padding: '10px 16px',
                            background: 'var(--warning-color)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            transition: 'background 0.2s'
                          }}
                        >
                          <Play size={16} />
                          Tiếp tục làm bài
                        </button>
                      ) : isCompleted ? (
                        <>
                          <button
                            onClick={() => navigate(`/mock-exams/result/${exam.userLastAttemptId}`)}
                            style={{
                              flex: 1,
                              padding: '10px 16px',
                              background: 'var(--bg-color)',
                              color: 'var(--accent-color)',
                              border: '1px solid var(--accent-color)',
                              borderRadius: 'var(--radius-md)',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6
                            }}
                          >
                            <BarChart3 size={16} />
                            Xem kết quả
                          </button>
                          <button
                            onClick={() => handleStartExam(exam.examId)}
                            style={{
                              padding: '10px 16px',
                              background: 'var(--accent-color)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: 'var(--radius-md)',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6
                            }}
                            title="Thi lại từ đầu"
                          >
                            <RotateCcw size={16} />
                            Thi lại
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleStartExam(exam.examId)}
                          style={{
                            flex: 1,
                            padding: '10px 16px',
                            background: 'var(--accent-color)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            transition: 'background 0.2s'
                          }}
                        >
                          <Play size={16} />
                          Bắt đầu thi thử
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Tab: History */}
      {activeTab === 'history' && (
        <div style={{
          background: 'var(--surface-color)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          padding: 24,
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 16px 0', color: 'var(--text-primary)' }}>
            Lịch Sử Các Lần Thi Thử
          </h2>

          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
              Bạn chưa tham gia lần thi thử nào. Hãy chọn một đề thi và bắt đầu thử sức!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {history.map(item => (
                <div
                  key={item.attemptId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    background: 'var(--bg-color)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    flexWrap: 'wrap',
                    gap: 12
                  }}
                >
                  <div style={{ minWidth: 240 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
                      {item.examTitle}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                      Bắt đầu: {item.startedAt ? new Date(item.startedAt).toLocaleString('vi-VN') : '—'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Kết quả</div>
                      <div style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color: item.percentage >= 60 ? 'var(--success-color)' : 'var(--danger-color)'
                      }}>
                        {item.totalCorrect} / {item.totalQuestions} ({item.percentage}%)
                      </div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Trạng thái</div>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        background: item.status === 'COMPLETED' ? 'var(--success-light)' : 'var(--warning-light)',
                        color: item.status === 'COMPLETED' ? 'var(--success-color)' : 'var(--warning-color)'
                      }}>
                        {item.status === 'COMPLETED' ? 'Hoàn thành' : 'Đang làm dở'}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        if (item.status === 'COMPLETED') {
                          navigate(`/mock-exams/result/${item.attemptId}`);
                        } else {
                          navigate(`/mock-exams/run/${item.examId}`);
                        }
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--accent-color)',
                        color: '#ffffff',
                        border: 'none',
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      {item.status === 'COMPLETED' ? 'Xem lại' : 'Tiếp tục'}
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
