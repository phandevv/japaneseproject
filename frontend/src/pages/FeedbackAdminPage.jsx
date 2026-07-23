import React, { useState, useEffect } from 'react';
import { feedbackApi } from '../services/api';
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle, Clock, AlertTriangle, HelpCircle } from 'lucide-react';
import MascotLoader from '../components/MascotLoader';

const FeedbackAdminPage = ({ goBack }) => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const response = await feedbackApi.getAll(page, 12);
      setFeedbacks(response.content || []);
      setTotalPages(response.totalPages || 0);
    } catch (error) {
      console.error("Failed to fetch feedbacks", error);
      alert("Lỗi khi tải danh sách góp ý.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [page]);

  const handleStatusChange = async (id, newStatus) => {
    setUpdatingId(id);
    try {
      await feedbackApi.updateStatus(id, newStatus);
      setFeedbacks(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
    } catch (err) {
      console.error(err);
      alert("Cập nhật trạng thái thất bại: " + (err.response?.data?.error || err.message));
    } finally {
      setUpdatingId(null);
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'ERROR':
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--danger-light)', color: 'var(--danger-color)', padding: '3px 8px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}><AlertTriangle size={12} /> BÁO LỖI</span>;
      case 'SUGGESTION':
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--accent-light)', color: 'var(--accent-color)', padding: '3px 8px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}><HelpCircle size={12} /> ĐỀ XUẤT</span>;
      case 'FEEDBACK':
      default:
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--success-light)', color: 'var(--success-color)', padding: '3px 8px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}><CheckCircle size={12} /> GÓP Ý</span>;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'RESOLVED': return 'var(--success-color)';
      case 'INVESTIGATING': return 'var(--accent-color)';
      case 'REJECTED': return 'var(--danger-color)';
      case 'PENDING':
      default:
        return 'var(--warning-color)';
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case 'RESOLVED': return 'var(--success-light)';
      case 'INVESTIGATING': return 'var(--accent-light)';
      case 'REJECTED': return 'var(--danger-light)';
      case 'PENDING':
      default:
        return 'var(--warning-light)';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div style={{ padding: '28px', animation: 'fadeIn 0.35s ease' }}>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button className="btn-icon" onClick={goBack}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="page-title" style={{ margin: 0 }}>Quản lý Góp ý & Báo lỗi</h2>
            <div className="page-subtitle">Xem phản hồi từ người học và cập nhật tiến trình giải quyết</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '0px', overflow: 'hidden' }}>
        {loading ? (
          <MascotLoader message="Đang tải danh sách..." />
        ) : feedbacks.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '8px', color: 'var(--text-secondary)' }}>
            <Clock size={40} style={{ opacity: 0.5 }} />
            <span>Chưa có ý kiến đóng góp nào từ người dùng.</span>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table-clean" style={{ width: '100%', minWidth: '800px' }}>
              <thead>
                <tr>
                  <th style={{ width: '110px' }}>Phân loại</th>
                  <th style={{ width: '130px' }}>Người gửi</th>
                  <th>Góp ý / Báo lỗi</th>
                  <th style={{ width: '160px' }}>Ngày gửi</th>
                  <th style={{ width: '180px' }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {feedbacks.map((item) => (
                  <tr key={item.id} style={{ cursor: 'default' }}>
                    <td>{getTypeLabel(item.type)}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {item.user?.displayName || item.user?.username || 'Người dùng'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        @{item.user?.username || 'anonymous'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {item.title}
                      </div>
                      <div style={{ 
                        fontSize: '0.85rem', 
                        color: 'var(--text-secondary)', 
                        whiteSpace: 'pre-wrap', 
                        lineHeight: 1.5,
                        backgroundColor: 'var(--surface-hover)',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        marginTop: '6px'
                      }}>
                        {item.content}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {formatDate(item.createdAt)}
                    </td>
                    <td>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <select
                          value={item.status}
                          disabled={updatingId === item.id}
                          onChange={(e) => handleStatusChange(item.id, e.target.value)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            border: `1px solid ${getStatusColor(item.status)}`,
                            backgroundColor: getStatusBg(item.status),
                            color: getStatusColor(item.status),
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            outline: 'none',
                            width: '100%'
                          }}
                        >
                          <option value="PENDING" style={{ backgroundColor: 'var(--surface-color)', color: 'var(--warning-color)' }}>⏳ CHỜ XỬ LÝ</option>
                          <option value="INVESTIGATING" style={{ backgroundColor: 'var(--surface-color)', color: 'var(--accent-color)' }}>🔍 ĐANG XỬ LÝ</option>
                          <option value="RESOLVED" style={{ backgroundColor: 'var(--surface-color)', color: 'var(--success-color)' }}>✅ ĐÃ GIẢI QUYẾT</option>
                          <option value="REJECTED" style={{ backgroundColor: 'var(--surface-color)', color: 'var(--danger-color)' }}>❌ TỪ CHỐI</option>
                        </select>
                        {updatingId === item.id && (
                          <div style={{ position: 'absolute', right: '-24px' }}>
                            <Loader className="animate-spin" size={14} color="var(--accent-color)" />
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', marginTop: '20px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Trang {page + 1} / {totalPages}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button 
              className="btn-icon" 
              disabled={page === 0 || loading} 
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              className="btn-icon" 
              disabled={page === totalPages - 1 || loading} 
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackAdminPage;
