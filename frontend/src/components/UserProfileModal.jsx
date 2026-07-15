import React, { useState, useEffect } from 'react';
import { usersApi } from '../services/api';
import { X, MapPin, Briefcase, User as UserIcon } from 'lucide-react';
import '../styles/HomePage.css'; // Or a new css file, but we can reuse

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

  return (
    <div className="streak-modal-overlay" onClick={onClose}>
      <div className="streak-modal-content profile-modal" onClick={e => e.stopPropagation()} style={{ width: '400px', padding: '32px', background: '#fff' }}>
        <button className="streak-modal-close" onClick={onClose}>
          <X size={20} />
        </button>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Đang tải...</div>
        ) : profile ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {profile.avatar ? (
              <img src={profile.avatar} alt="Avatar" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', marginBottom: 16 }} />
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, color: '#94a3b8' }}>
                <UserIcon size={40} />
              </div>
            )}
            <h2 style={{ margin: '0 0 8px 0', fontSize: '1.5rem', color: '#1e293b' }}>{profile.displayName || profile.username}</h2>
            <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '0.95rem' }}>@{profile.username}</p>
            
            <div style={{ width: '100%', background: '#f8fafc', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#475569' }}>
                <Briefcase size={18} color="#94a3b8" />
                <span>{profile.occupation || 'Chưa cập nhật nghề nghiệp'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#475569' }}>
                <MapPin size={18} color="#94a3b8" />
                <span>{profile.address || 'Chưa cập nhật địa chỉ'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px' }}>Không tìm thấy người dùng.</div>
        )}
      </div>
    </div>
  );
};
