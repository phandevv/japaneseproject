import React from 'react';
import { LogOut, Palette, Flame, User as UserIcon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const Header = ({ user, streak = 0, onProfileClick, onLogout }) => {
  const { theme, changeTheme } = useTheme();
  
  const isAdmin = user && (user.username === "admin" || user.role === "ADMIN" || user.roles?.includes("ADMIN") || user.roles?.includes("ROLE_ADMIN"));
  const displayName = user?.displayName || user?.username || "Learner";
  
  const avatarContent = user?.avatar
    ? (user.avatar.startsWith("data:image") 
        ? <img src={user.avatar} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
        : user.avatar)
    : displayName.substring(0, 2).toUpperCase();

  return (
    <header className="app-header">
      {/* Left section: Streak */}
      <div className="header-left">
        {streak > 0 && (
          <div className="header-streak-badge" title="Chuỗi ngày học liên tục!">
            <Flame size={18} className="streak-icon animate-pulse" />
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
            className={`theme-dot light-dot ${theme === 'light' ? 'active' : ''}`}
            title="Sáng"
          />
          <button 
            type="button"
            onClick={() => changeTheme('dark')} 
            className={`theme-dot dark-dot ${theme === 'dark' ? 'active' : ''}`}
            title="Tối"
          />
          <button 
            type="button"
            onClick={() => changeTheme('sepia')} 
            className={`theme-dot sepia-dot ${theme === 'sepia' ? 'active' : ''}`}
            title="Hoài cổ"
          />
          <button 
            type="button"
            onClick={() => changeTheme('sakura')} 
            className={`theme-dot sakura-dot ${theme === 'sakura' ? 'active' : ''}`}
            title="Hoa anh đào"
          />
        </div>

        {/* User Profile info */}
        {user && (
          <div className="header-profile-section">
            <div className="header-user-info" onClick={onProfileClick} title="Xem trang cá nhân">
              <div className="header-avatar">{avatarContent}</div>
              <div className="header-user-details">
                <span className="header-username">{displayName}</span>
                <span className="header-role">{isAdmin ? "Admin" : "Học viên"}</span>
              </div>
            </div>
            
            <button className="header-logout-btn" onClick={onLogout} title="Đăng xuất">
              <LogOut size={16} />
              <span>Đăng xuất</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
