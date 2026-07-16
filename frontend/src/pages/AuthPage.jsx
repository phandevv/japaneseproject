import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { User, Lock, ArrowRight, AlertCircle } from 'lucide-react';

const AuthPage = ({ onCancel, onSuccess }) => {
  const { t } = useLanguage();
  const { login, register } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!username.trim() || !password.trim()) {
      setError(isLogin ? 'Vui lòng nhập tài khoản và mật khẩu' : 'Các trường không được để trống');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError(t.auth?.passwordsNotMatch || 'Mật khẩu không khớp');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const res = await login(username, password);
        if (res.success) {
          if (onSuccess) {
            onSuccess();
          } else if (onCancel) {
            onCancel();
          }
        } else {
          setError(res.error);
        }
      } else {
        const res = await register(username, password);
        if (res.success) {
          setSuccess(t.auth?.successRegister || 'Đăng ký thành công! Vui lòng đăng nhập.');
          setIsLogin(true);
          setPassword('');
          setConfirmPassword('');
        } else {
          setError(res.error);
        }
      }
    } catch (err) {
      setError('Đã xảy ra lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="flex-center animate-fade-in force-light-theme" 
      style={{ 
        flex: 1,
        padding: '40px 20px',
        background: 'transparent',
        position: 'relative',
        zIndex: 1,
        width: '100%'
      }}
    >
      <div 
        className="card" 
        style={{ 
          display: 'flex',
          flexDirection: 'row',
          width: '100%', 
          maxWidth: '900px', 
          padding: 0, 
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          border: 'none',
          backgroundColor: 'var(--surface-color)'
        }}
      >
        {/* Left Side: Mascot */}
        <div className="auth-mascot-container" style={{ 
          flex: '1', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--surface-color)', // match card background
          padding: '40px',
          position: 'relative',
          borderRight: '1px solid var(--border-color)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '10px', zIndex: 2 }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '8px', color: 'var(--accent-color)' }}>SIRO NIHONGO</h1>
            <p style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Học tiếng Nhật cùng Siro</p>
          </div>
          <img 
            src="/assets/mascot_siro_white.png" 
            alt="Mascot Siro" 
            style={{ 
              maxWidth: '100%', 
              height: 'auto', 
              maxHeight: '380px',
              objectFit: 'contain',
              mixBlendMode: 'multiply', // Removes the white background of the image to make it look transparent
              zIndex: 2,
              animation: 'float 3s ease-in-out infinite'
            }} 
          />
          {/* Add a keyframes style tag just for the float animation */}
          <style>{`
            @keyframes float {
              0% { transform: translateY(0px); }
              50% { transform: translateY(-10px); }
              100% { transform: translateY(0px); }
            }
            @media (max-width: 768px) {
              .auth-mascot-container { display: none !important; }
            }
          `}</style>
        </div>

        {/* Right Side: Form */}
        <div style={{ flex: '1', padding: '50px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
              {isLogin ? 'Chào mừng trở lại!' : 'Tạo tài khoản mới'}
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              {isLogin ? 'Vui lòng đăng nhập để tiếp tục học.' : 'Đăng ký miễn phí để bắt đầu học tiếng Nhật.'}
            </p>
          </div>

          {error && (
            <div className="flex-center animate-fade-in" style={{ 
              backgroundColor: 'var(--danger-light)', 
              color: 'var(--danger-color)', 
              padding: '12px 16px', 
              borderRadius: '10px', 
              marginBottom: '24px', 
              gap: '10px',
              fontSize: '0.9rem',
              fontWeight: 500,
              border: '1px solid rgba(239, 68, 68, 0.2)',
              justifyContent: 'flex-start'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex-center animate-fade-in" style={{ 
              backgroundColor: 'var(--success-light)', 
              color: 'var(--success-color)', 
              padding: '12px 16px', 
              borderRadius: '10px', 
              marginBottom: '24px', 
              gap: '10px',
              fontSize: '0.9rem',
              fontWeight: 500,
              border: '1px solid rgba(16, 185, 129, 0.2)',
              justifyContent: 'flex-start'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                placeholder={t.auth?.username || 'Tên đăng nhập'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  padding: '15px 15px 15px 46px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--surface-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--accent-color)'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-secondary)' }} />
              <input 
                type="password" 
                placeholder={t.auth?.password || 'Mật khẩu'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '15px 15px 15px 46px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--surface-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--accent-color)'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {!isLogin && (
              <div className="animate-fade-in" style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-secondary)' }} />
                <input 
                  type="password" 
                  placeholder={t.auth?.confirmPassword || 'Xác nhận mật khẩu'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '15px 15px 15px 46px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--surface-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    transition: 'all 0.2s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--accent-color)'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="btn btn-primary flex-center" 
              style={{ 
                padding: '15px', 
                fontSize: '1.05rem', 
                fontWeight: 700,
                gap: '8px', 
                cursor: 'pointer',
                borderRadius: '12px',
                marginTop: '10px'
              }}
            >
              {loading ? 'Đang xử lý...' : (isLogin ? (t.auth?.loginBtn || 'Đăng nhập') : (t.auth?.registerBtn || 'Đăng ký'))}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div style={{ marginTop: '30px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ height: '1px', backgroundColor: 'var(--border-color)', position: 'relative' }}>
              <span style={{ 
                position: 'absolute', 
                top: '-10px', 
                left: '50%', 
                transform: 'translateX(-50%)', 
                backgroundColor: 'var(--surface-color)', 
                padding: '0 10px',
                color: 'var(--text-muted)',
                fontSize: '0.85rem'
              }}>hoặc</span>
            </div>

            <button 
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setSuccess('');
              }}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'var(--accent-color)', 
                fontWeight: 600, 
                cursor: 'pointer',
                fontSize: '0.95rem',
                transition: 'color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.color = 'var(--accent-hover)'}
              onMouseOut={(e) => e.target.style.color = 'var(--accent-color)'}
            >
              {isLogin ? (t.auth?.toggleToRegister || 'Chưa có tài khoản? Đăng ký ngay') : (t.auth?.toggleToLogin || 'Đã có tài khoản? Đăng nhập')}
            </button>

            {onCancel && (
              <button 
                type="button"
                onClick={onCancel}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--text-secondary)', 
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  transition: 'color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.color = 'var(--text-primary)'}
                onMouseOut={(e) => e.target.style.color = 'var(--text-secondary)'}
              >
                {t.auth?.guestMode || 'Học thử với tư cách Khách'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

