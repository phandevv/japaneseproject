import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import { X, Save } from 'lucide-react';

const AVATAR_PRESETS = [
  '🦊', '🐼', '🐨', '🐯', '🦁', '🐱', '🐶', '🐰', 
  '🐸', '🐵', '🐔', '🦄', '🐙', '👾', '🤖', '👻',
  '🌸', '🍀', '🍕', '🍣', '🎮', '📚', '🚀', '⭐'
];

const ProfileModal = ({ onClose }) => {
  const { user, updateAvatar } = useAuth();
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await authApi.updateProfile(selectedAvatar);
      updateAvatar(selectedAvatar);
      alert('Cập nhật ảnh đại diện thành công!');
      onClose();
    } catch (e) {
      console.error(e);
      alert('Cập nhật thất bại. Vui lòng thử lại!');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      backdropFilter: 'blur(4px)'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '400px',
        padding: '28px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        animation: 'fadeInUp 0.3s ease'
      }}>
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px', right: '16px',
            background: 'none', border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>Thông tin cá nhân</h3>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Thiết lập ảnh đại diện của bạn
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: 'var(--surface-hover)',
            border: '2px solid var(--accent-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '3rem',
            boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
          }}>
            {selectedAvatar ? selectedAvatar : (user?.username ? user.username[0].toUpperCase() : '?')}
          </div>
          <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{user?.username}</span>
        </div>

        <div>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
            Chọn Avatar cá tính của bạn:
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: '10px',
            maxHeight: '180px',
            overflowY: 'auto',
            padding: '4px'
          }}>
            {AVATAR_PRESETS.map((av, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedAvatar(av)}
                style={{
                  fontSize: '1.8rem',
                  padding: '8px',
                  borderRadius: '12px',
                  border: selectedAvatar === av ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                  backgroundColor: selectedAvatar === av ? 'rgba(99, 102, 241, 0.1)' : 'var(--card-bg)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  transform: selectedAvatar === av ? 'scale(1.05)' : 'none'
                }}
              >
                {av}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={onClose} 
            style={{ flex: 1 }}
          >
            Hủy
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSave} 
            disabled={saving}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Save size={16} /> Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
