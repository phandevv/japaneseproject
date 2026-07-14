import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import { X, Save, Camera } from 'lucide-react';

const VIETNAM_PROVINCES = [
  "An Giang", "Bà Rịa – Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu",
  "Bắc Ninh", "Bến Tre", "Bình Định", "Bình Dương", "Bình Phước",
  "Bình Thuận", "Cà Mau", "Cần Thơ", "Cao Bằng", "Đà Nẵng",
  "Đắk Lắk", "Đắk Nông", "Điện Biên", "Đồng Nai", "Đồng Tháp",
  "Gia Lai", "Hà Giang", "Hà Nam", "Hà Nội", "Hà Tĩnh",
  "Hải Dương", "Hải Phòng", "Hậu Giang", "Hòa Bình", "Hưng Yên",
  "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu", "Lâm Đồng",
  "Lạng Sơn", "Lào Cai", "Long An", "Nam Định", "Nghệ An",
  "Ninh Bình", "Ninh Thuận", "Phú Thọ", "Phú Yên", "Quảng Bình",
  "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị", "Sóc Trăng",
  "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên", "Thanh Hóa",
  "Thừa Thiên Huế", "Tiền Giang", "TP Hồ Chí Minh", "Trà Vinh",
  "Tuyên Quang", "Vĩnh Long", "Vĩnh Phúc", "Yên Bái"
];

const AVATAR_PRESETS = [
  '🦊', '🐼', '🐨', '🐯', '🦁', '🐱', '🐶', '🐰', 
  '🐸', '🐵', '🐔', '🦄', '🐙', '👾', '🤖', '👻'
];

const ProfileModal = ({ onClose }) => {
  const { user, updateAvatar } = useAuth();
  const fileInputRef = useRef(null);
  
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [address, setAddress] = useState(user?.address || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [occupation, setOccupation] = useState(user?.occupation || '');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || '');
  const [saving, setSaving] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1.5 * 1024 * 1024) {
        alert("Kích thước ảnh đại diện phải nhỏ hơn 1.5MB để đảm bảo hiệu năng!");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedAvatar(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        displayName,
        address,
        phone,
        occupation,
        avatar: selectedAvatar
      };
      await authApi.updateProfile(payload);
      updateAvatar(payload);
      alert('Cập nhật thông tin cá nhân thành công!');
      onClose();
    } catch (e) {
      console.error(e);
      alert('Cập nhật thất bại: ' + (e.response?.data?.error || e.message));
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
      backdropFilter: 'blur(4px)',
      padding: '20px'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '460px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '30px',
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
            top: '20px', right: '20px',
            background: 'none', border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Thông tin cá nhân</h3>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Quản lý và cập nhật thông tin tài khoản của bạn
          </p>
        </div>

        {/* Avatar Section */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', margin: '10px 0' }}>
          <div 
            onClick={triggerFileUpload}
            style={{
              width: '90px',
              height: '90px',
              borderRadius: '50%',
              backgroundColor: 'var(--surface-hover)',
              border: '2px dashed var(--accent-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
              transition: 'all 0.2s ease'
            }}
          >
            {selectedAvatar && selectedAvatar.startsWith('data:image') ? (
              <img 
                src={selectedAvatar} 
                alt="Avatar Preview" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : selectedAvatar ? (
              <div style={{ fontSize: '3rem' }}>{selectedAvatar}</div>
            ) : (
              <div style={{ fontSize: '2.5rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                {(displayName ? displayName[0] : user?.username?.[0] || '?').toUpperCase()}
              </div>
            )}
            <div style={{
              position: 'absolute',
              bottom: 0, left: 0, right: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              color: '#fff',
              fontSize: '0.65rem',
              textAlign: 'center',
              padding: '2px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px'
            }}>
              <Camera size={10} /> Đổi ảnh
            </div>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            style={{ display: 'none' }} 
          />
        </div>

        {/* Input Form Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '14px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Tên hiển thị
              </label>
              <input 
                type="text" 
                value={displayName} 
                onChange={(e) => setDisplayName(e.target.value)} 
                placeholder="Tên hiển thị..."
                style={{ 
                  width: '100%', 
                  padding: '10px 14px', 
                  borderRadius: '12px', 
                  border: '1px solid var(--border-color)', 
                  backgroundColor: 'var(--surface-color)', 
                  color: 'var(--text-primary)',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Tên đăng nhập
              </label>
              <input 
                type="text" 
                value={user?.username || ''} 
                disabled
                style={{ 
                  width: '100%', 
                  padding: '10px 14px', 
                  borderRadius: '12px', 
                  border: '1px solid var(--border-color)', 
                  backgroundColor: 'var(--surface-hover)', 
                  color: 'var(--text-secondary)',
                  cursor: 'not-allowed',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '14px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Số điện thoại
              </label>
              <input 
                type="text" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                placeholder="09xx..."
                style={{ 
                  width: '100%', 
                  padding: '10px 14px', 
                  borderRadius: '12px', 
                  border: '1px solid var(--border-color)', 
                  backgroundColor: 'var(--surface-color)', 
                  color: 'var(--text-primary)',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Ngành nghề
              </label>
              <input 
                type="text" 
                value={occupation} 
                onChange={(e) => setOccupation(e.target.value)} 
                placeholder="IT, Sinh viên..."
                style={{ 
                  width: '100%', 
                  padding: '10px 14px', 
                  borderRadius: '12px', 
                  border: '1px solid var(--border-color)', 
                  backgroundColor: 'var(--surface-color)', 
                  color: 'var(--text-primary)',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Địa chỉ (Tỉnh / Thành phố)
            </label>
            <select 
              value={address} 
              onChange={(e) => setAddress(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '10px 14px', 
                borderRadius: '12px', 
                border: '1px solid var(--border-color)', 
                backgroundColor: 'var(--surface-color)', 
                color: 'var(--text-primary)',
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
            >
              <option value="" style={{ backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)' }}>
                -- Chọn Tỉnh / Thành phố --
              </option>
              {VIETNAM_PROVINCES.map((prov, idx) => (
                <option 
                  key={idx} 
                  value={prov} 
                  style={{ backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)' }}
                >
                  {prov}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
              Hoặc chọn nhanh Avatar nhân vật:
            </label>
            <div style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              padding: '6px 2px',
              whiteSpace: 'nowrap'
            }}>
              {AVATAR_PRESETS.map((av, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedAvatar(av)}
                  style={{
                    fontSize: '1.5rem',
                    padding: '6px 12px',
                    borderRadius: '10px',
                    border: selectedAvatar === av ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                    backgroundColor: selectedAvatar === av ? 'var(--accent-light)' : 'var(--surface-color)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    flexShrink: 0
                  }}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
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
