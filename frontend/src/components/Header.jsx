import React, { useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { LogOut, Palette, Flame, User as UserIcon, Image as ImageIcon, Menu } from 'lucide-react';
import { getMediaUrl } from '../services/api';
import { useTheme } from '../context/ThemeContext';

import NotificationBell from './NotificationBell';

const Header = ({ user, streak = 0, onProfileClick, onLogout, onToggleMobileSidebar }) => {
  const { theme, changeTheme, customBg, applyCustomBackground, sakuraPetalsEnabled, toggleSakuraPetals } = useTheme();
  const bgInputRef = useRef(null);

  const handleBgUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        applyCustomBackground(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const isAdmin = user && (user.username === "admin" || user.role === "ADMIN" || user.roles?.includes("ADMIN") || user.roles?.includes("ROLE_ADMIN"));
  const displayName = user?.displayName || user?.username || "Learner";
  
  const avatarContent = user?.avatar
    ? (user.avatar.startsWith("data:image") || user.avatar.startsWith("http") || user.avatar.startsWith("/")
        ? <img src={getMediaUrl(user.avatar)} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
        : user.avatar)
    : displayName.substring(0, 2).toUpperCase();

  return (
    <header className="app-header">
      {/* Left section: Mobile Menu Toggle + Streak */}
      <div className="header-left">
        <button
          type="button"
          className="mobile-menu-toggle-btn"
          onClick={onToggleMobileSidebar}
          title="Mở menu"
          aria-label="Mở menu điều hướng"
        >
          <Menu size={22} />
        </button>
        {streak > 0 && (
          <div className="header-streak-badge" title="Chuỗi ngày học liên tục!">
            <span style={{ fontSize: '1.05rem', lineHeight: 1 }}>🌸</span>
            <span>{streak} ngày</span>
          </div>
        )}
      </div>

      {/* Right section: Theme Selector + User Info + Logout */}
      <div className="header-right">
        {/* Theme select buttons */}
        <div className="header-theme-selector">
          <Palette size={15} style={{ color: 'var(--text-secondary)', marginRight: '4px' }} />
          <button 
            type="button"
            onClick={() => changeTheme('light')} 
            className={`theme-dot light-dot ${theme === 'light' && !customBg ? 'active' : ''}`}
            title="Sáng"
          />
          <button 
            type="button"
            onClick={() => changeTheme('dark')} 
            className={`theme-dot dark-dot ${theme === 'dark' && !customBg ? 'active' : ''}`}
            title="Tối"
          />
          <button 
            type="button"
            onClick={() => changeTheme('sepia')} 
            className={`theme-dot sepia-dot ${theme === 'sepia' && !customBg ? 'active' : ''}`}
            title="Hoài cổ"
          />
          <button 
            type="button"
            onClick={() => changeTheme('sakura')} 
            className={`theme-dot sakura-dot ${theme === 'sakura' && !customBg ? 'active' : ''}`}
            title="Hoa anh đào"
          />
          <button
            type="button"
            onClick={() => bgInputRef.current?.click()}
            className={`theme-dot ${customBg ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
            title="Ảnh nền tùy chỉnh"
          >
            <ImageIcon size={12} />
          </button>

          {/* Global Toggle Sakura Petals falling */}
          <button
            type="button"
            onClick={toggleSakuraPetals}
            className={`theme-dot ${sakuraPetalsEnabled ? 'active' : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: sakuraPetalsEnabled ? 'rgba(244, 63, 94, 0.25)' : 'var(--surface-color)',
              border: `1.5px solid ${sakuraPetalsEnabled ? '#f43f5e' : 'var(--border-color)'}`,
              color: sakuraPetalsEnabled ? '#f43f5e' : 'var(--text-secondary)',
              fontSize: '0.8rem',
              marginLeft: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: sakuraPetalsEnabled ? '0 0 10px rgba(244,63,94,0.45)' : 'none'
            }}
            title={sakuraPetalsEnabled ? "Tắt hiệu ứng hoa anh đào rơi toàn trang web" : "Bật hiệu ứng hoa anh đào rơi toàn trang web"}
          >
            🌸
          </button>
          <input
            type="file"
            ref={bgInputRef}
            onChange={handleBgUpload}
            accept="image/*"
            style={{ display: 'none' }}
          />
        </div>

        {/* User Profile info */}
        {user && (
          <div className="header-profile-section flex items-center gap-3">
            <NotificationBell />
            <div className="header-user-info" onClick={onProfileClick} title="Xem trang cá nhân">
              <div className="header-avatar">{avatarContent}</div>
              <div className="header-user-details">
                <span className="header-username">{displayName}</span>
                <span className="header-role">{isAdmin ? "Admin" : "Học viên"}</span>
              </div>
            </div>
            
            <button className="header-logout-btn" onClick={onLogout} title="Đăng xuất">
              <LogOut size={16} />
              <span className="header-logout-text">Đăng xuất</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
