import React, { useState } from 'react';
import axios from 'axios';
import { ArrowLeft, Cpu, Play, CheckCircle, Loader } from 'lucide-react';

const AiEnrichmentAdminPage = ({ goBack }) => {
  const [runningLevel, setRunningLevel] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const getApiBaseUrl = () => {
    if (typeof window === 'undefined') return 'http://127.0.0.1:8080/api';
    const { hostname, protocol } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8080/api';
    }
    return `${protocol}//${hostname}/api`;
  };

  const triggerEnrichment = async (level) => {
    setRunningLevel(level);
    setMessage('');
    setError('');
    try {
      const response = await axios.post(`${getApiBaseUrl()}/vocab/enrich/level/${level}`);
      setMessage(response.data?.message || `Đã khởi chạy tiến trình làm giàu cấp độ ${level} thành công!`);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || `Khởi chạy thất bại: ${err.message}`);
    } finally {
      setRunningLevel(null);
    }
  };

  const levels = ['N5', 'N4', 'N3', 'N2', 'N1'];

  return (
    <div style={{ padding: '28px', animation: 'fadeIn 0.35s ease' }}>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button className="btn-icon" onClick={goBack}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="page-title" style={{ margin: 0 }}>Làm giàu từ vựng bằng AI (DeepSeek)</h2>
            <div className="page-subtitle">Tự động sinh câu ví dụ, âm đọc và từ liên quan theo cấp độ ngữ pháp</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px' }}>
        {/* Info Card */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '4px solid var(--accent-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, fontSize: '1.1rem' }}>
            <Cpu size={20} color="var(--accent-color)" />
            <span>Hướng dẫn & Quy tắc vận hành</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            <li>Tiến trình làm giàu chạy **hoàn toàn dưới nền (asynchronous)** trên máy chủ. Bạn có thể rời trang sau khi nhấn nút.</li>
            <li>Để tránh lỗi quá tải hoặc bị block bởi DeepSeek API, hệ thống thực hiện gọi **tuần tự từng từ** và giãn cách **1.5 giây** giữa mỗi lần gọi.</li>
            <li>Hệ thống chỉ làm giàu dữ liệu cho những từ **chưa có câu ví dụ**. Từ đã có dữ liệu sẽ tự động được bỏ qua.</li>
            <li>Vui lòng kiểm tra kỹ xem file cấu hình `.env` đã có chứa khóa `DEEPSEEK_API_KEY` hợp lệ hay chưa trước khi khởi chạy.</li>
          </ul>
        </div>

        {/* Status Messages */}
        {message && (
          <div style={{
            padding: '14px 18px',
            borderRadius: '12px',
            backgroundColor: 'var(--success-light)',
            color: 'var(--success-color)',
            fontSize: '0.9rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <CheckCircle size={18} />
            {message}
          </div>
        )}

        {error && (
          <div style={{
            padding: '14px 18px',
            borderRadius: '12px',
            backgroundColor: 'var(--danger-light)',
            color: 'var(--danger-color)',
            fontSize: '0.9rem',
            fontWeight: 600
          }}>
            {error}
          </div>
        )}

        {/* Levels Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
          {levels.map((level) => (
            <div key={level} className="card" style={{
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              textAlign: 'center',
              transition: 'transform 0.2s',
              cursor: 'default'
            }}>
              <div style={{
                fontSize: '2rem',
                fontWeight: 800,
                color: level === 'N3' ? 'var(--accent-color)' : 'var(--text-primary)'
              }}>
                {level}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {level === 'N3' ? '⭐ Đang ưu tiên học' : 'Cấp độ tiếng Nhật'}
              </div>
              <button
                className="btn btn-primary"
                disabled={runningLevel !== null}
                onClick={() => triggerEnrichment(level)}
                style={{
                  width: '100%',
                  gap: '8px',
                  backgroundColor: level === 'N3' ? 'var(--accent-color)' : undefined
                }}
              >
                {runningLevel === level ? (
                  <Loader size={16} className="animate-spin" />
                ) : (
                  <Play size={16} />
                )}
                Khởi chạy
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AiEnrichmentAdminPage;
