import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { User, Lock, ArrowRight, BookOpen, AlertCircle } from 'lucide-react';

const AuthPage = ({ onCancel }) => {
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
      setError(isLogin ? 'Vui lòng nhập tài khoản và mật khẩu' : 'Fields cannot be empty');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError(t.auth?.passwordsNotMatch || 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const res = await login(username, password);
        if (res.success) {
          if (onCancel) onCancel(); // Close modal or go back
        } else {
          setError(res.error);
        }
      } else {
        const res = await register(username, password);
        if (res.success) {
          setSuccess(t.auth?.successRegister || 'Registered successfully! Please log in.');
          setIsLogin(true);
          setPassword('');
          setConfirmPassword('');
        } else {
          setError(res.error);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-center animate-fade-in" style={{ minHeight: '80vh', padding: '20px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '40px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div className="flex-center" style={{ 
            width: '60px', 
            height: '60px', 
            borderRadius: '16px', 
            backgroundColor: 'rgba(239, 68, 68, 0.1)', 
            color: 'var(--accent-color)',
            margin: '0 auto 15px'
          }}>
            <BookOpen size={30} />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>
            {isLogin ? (t.auth?.loginTitle || 'Đăng nhập') : (t.auth?.registerTitle || 'Đăng ký')}
          </h2>
        </div>

        {error && (
          <div className="flex-center" style={{ 
            backgroundColor: 'rgba(239, 68, 68, 0.1)', 
            color: 'var(--accent-color)', 
            padding: '12px', 
            borderRadius: '8px', 
            marginBottom: '20px', 
            gap: '8px',
            fontSize: '0.9rem',
            fontWeight: 500
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex-center" style={{ 
            backgroundColor: 'rgba(16, 185, 129, 0.1)', 
            color: 'var(--success-color)', 
            padding: '12px', 
            borderRadius: '8px', 
            marginBottom: '20px', 
            gap: '8px',
            fontSize: '0.9rem',
            fontWeight: 500
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ position: 'relative' }}>
            <User size={18} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder={t.auth?.username || 'Tên đăng nhập'}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 14px 14px 42px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--surface-color)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-secondary)' }} />
            <input 
              type="password" 
              placeholder={t.auth?.password || 'Mật khẩu'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 14px 14px 42px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--surface-color)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {!isLogin && (
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-secondary)' }} />
              <input 
                type="password" 
                placeholder={t.auth?.confirmPassword || 'Xác nhận mật khẩu'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 14px 14px 42px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--surface-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-primary flex-center" 
            style={{ padding: '14px', fontSize: '1rem', gap: '8px', cursor: 'pointer' }}
          >
            {loading ? '...' : (isLogin ? (t.auth?.loginBtn || 'Đăng nhập') : (t.auth?.registerBtn || 'Đăng ký'))}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <div style={{ marginTop: '25px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
              fontSize: '0.9rem'
            }}
          >
            {isLogin ? (t.auth?.toggleToRegister || 'Chưa có tài khoản? Đăng ký') : (t.auth?.toggleToLogin || 'Đã có tài khoản? Đăng nhập')}
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
                fontSize: '0.85rem'
              }}
            >
              {t.auth?.guestMode || 'Học với tư cách Khách'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
