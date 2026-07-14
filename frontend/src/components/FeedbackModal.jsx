import React, { useState } from 'react';
import { X, Send, AlertCircle } from 'lucide-react';
import { feedbackApi } from '../services/api';

const FeedbackModal = ({ onClose }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('FEEDBACK');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Vui lòng điền đầy đủ tiêu đề và nội dung!');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await feedbackApi.submit(title.trim(), content.trim(), type);
      alert('Gửi góp ý / báo lỗi thành công! Cảm ơn sự đóng góp của bạn. ❤️');
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Có lỗi xảy ra khi gửi thông tin.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      backdropFilter: 'blur(4px)',
      padding: '20px'
    }}>
      <div className="card animate-fade-in" style={{
        width: '100%',
        maxWidth: '480px',
        padding: '28px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* Close Button */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px', right: '20px',
            background: 'none', border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={22} color="var(--accent-color)" />
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Góp ý & Báo lỗi</h3>
        </div>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>
          Bạn gặp lỗi kỹ thuật hay có đề xuất tính năng mới? Hãy gửi thông tin chi tiết để chúng tôi cải thiện hệ thống.
        </p>

        {error && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: 'var(--danger-light)',
            color: 'var(--danger-color)',
            fontSize: '0.85rem',
            fontWeight: 500
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Phân loại
            </label>
            <select 
              value={type} 
              onChange={(e) => setType(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--surface-color)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                boxSizing: 'border-box',
                outline: 'none'
              }}
            >
              <option value="ERROR">🐛 Báo lỗi hệ thống</option>
              <option value="FEEDBACK">💡 Góp ý trải nghiệm</option>
              <option value="SUGGESTION">🚀 Đề xuất tính năng</option>
              <option value="OTHER">❓ Khác</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Tiêu đề ngắn gọn
            </label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Ví dụ: Không tải được danh sách từ vựng..."
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--surface-color)',
                color: 'var(--text-primary)',
                boxSizing: 'border-box',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Nội dung mô tả chi tiết
            </label>
            <textarea 
              rows={4}
              value={content} 
              onChange={(e) => setContent(e.target.value)} 
              placeholder="Hãy mô tả chi tiết lỗi bạn gặp phải hoặc ý tưởng của bạn (ví dụ: các bước xảy ra lỗi, thiết bị dùng)..."
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--surface-color)',
                color: 'var(--text-primary)',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                lineHeight: 1.5,
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose} 
              style={{ flex: 1 }}
            >
              Hủy
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={submitting}
              style={{ flex: 1, gap: '6px' }}
            >
              <Send size={16} /> Gửi thông tin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackModal;
