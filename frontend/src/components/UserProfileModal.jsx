import React, { useState, useEffect } from 'react';
import { usersApi, getMediaUrl } from '../services/api';
import { X, MapPin, Briefcase, User as UserIcon, Flame, BookOpen, Medal } from 'lucide-react';
import '../styles/HomePage.css';

export const UserProfileModal = ({ username, onClose }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await usersApi.getUserProfile(username);
        setProfile(data);
      } catch (error) {
        console.error("Failed to fetch profile", error);
      } finally {
        setLoading(false);
      }
    };
    if (username) fetchProfile();
  }, [username]);

  // Generate a random gradient based on username for the cover banner
  const getGradient = (name) => {
    if (!name) return 'linear-gradient(135deg, #1e3a8a, #3b82f6)';
    const colors = [
      ['#f43f5e', '#fb923c'],
      ['#8b5cf6', '#d946ef'],
      ['#10b981', '#3b82f6'],
      ['#f59e0b', '#ef4444'],
      ['#0ea5e9', '#6366f1']
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) {
      sum += name.charCodeAt(i);
    }
    const pair = colors[sum % colors.length];
    return `linear-gradient(135deg, ${pair[0]}, ${pair[1]})`;
  };

  const getBadgeInfo = (learnedCount) => {
    if (learnedCount >= 1500) return { label: 'Thánh Kanji', color: '#fbbf24', icon: '👑' };
    if (learnedCount >= 500) return { label: 'Thông thái', color: '#a78bfa', icon: '🧠' };
    if (learnedCount >= 100) return { label: 'Chăm chỉ', color: '#60a5fa', icon: '📖' };
    return { label: 'Tân binh', color: '#34d399', icon: '🌱' };
  };

  return (
    <div className="streak-modal-overlay" onClick={onClose} style={{ zIndex: 1200, backdropFilter: 'blur(8px)' }}>
      <div
        className="card profile-modal-container"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'var(--surface-color)',
          borderRadius: '24px',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid var(--border-color)',
          animation: 'fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 10,
            background: 'rgba(0,0,0,0.3)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(4px)'
          }}
        >
          <X size={18} />
        </button>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>Đang tải thông tin...</div>
        ) : profile ? (
          <>
            {/* Cover Banner */}
            <div style={{
              height: '140px',
              width: '100%',
              background: profile.coverPhoto ? `url(${profile.coverPhoto}) center/cover no-repeat` : getGradient(profile.username)
            }} />

            <div style={{ padding: '0 24px 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '-45px' }}>

              {/* Avatar */}
              <div style={{
                width: '90px',
                height: '90px',
                borderRadius: '50%',
                background: 'var(--surface-color)',
                padding: '4px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}>
                {profile.avatar ? (
                  (profile.avatar.startsWith("data:image") || profile.avatar.startsWith("http") || profile.avatar.startsWith("/")) ? (
                    <img src={getMediaUrl(profile.avatar)} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>
                      {profile.avatar}
                    </div>
                  )
                ) : (
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                    <UserIcon size={40} />
                  </div>
                )}
              </div>

              {/* Name & Badge */}
              <div style={{ textAlign: 'center', marginTop: '12px' }}>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {profile.displayName || profile.username}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>@{profile.username}</p>

                  {/* Badge */}
                  {profile.learnedCount !== undefined && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      background: `${getBadgeInfo(profile.learnedCount).color}20`,
                      color: getBadgeInfo(profile.learnedCount).color,
                      padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700
                    }}>
                      <span>{getBadgeInfo(profile.learnedCount).icon}</span>
                      {getBadgeInfo(profile.learnedCount).label}
                    </div>
                  )}
                </div>
              </div>

              {/* Public Stats */}
              {(profile.streak !== undefined || profile.learnedCount !== undefined) && (
                <div style={{
                  display: 'flex', width: '100%', gap: '12px', marginTop: '24px',
                  padding: '16px', borderRadius: '16px', background: 'var(--bg-color)', border: '1px solid var(--border-color)'
                }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--warning-color)' }}>
                      <Flame size={18} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>STREAK</span>
                    </div>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{profile.streak || 0}</span>
                  </div>

                  <div style={{ width: '1px', background: 'var(--border-color)' }}></div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success-color)' }}>
                      <BookOpen size={18} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>TỪ VỰNG</span>
                    </div>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{profile.learnedCount || 0}</span>
                  </div>
                </div>
              )}

              {/* Info Details */}
              <div style={{ width: '100%', marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-primary)' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)' }}>
                    <Briefcase size={18} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Nghề nghiệp</span>
                    <span style={{ fontWeight: 600 }}>{profile.occupation || 'Chưa cập nhật'}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-primary)' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger-color)' }}>
                    <MapPin size={18} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Địa chỉ</span>
                    <span style={{ fontWeight: 600 }}>{profile.address || 'Chưa cập nhật'}</span>
                  </div>
                </div>
              </div>

            </div>
          </>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Không tìm thấy người dùng.</div>
        )}
      </div>
    </div>
  );
};
