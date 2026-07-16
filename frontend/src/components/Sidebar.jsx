import { BookOpen, ChevronLeft, ChevronRight, Cpu, Database, Home, Layers, Loader, LogIn, LogOut, MessageSquare, Palette, Search, ShieldCheck, Upload, LifeBuoy } from "lucide-react";
import { useRef, useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import { vocabApi } from "../services/api";

import { useAuth } from "../context/AuthContext";

const Sidebar = ({ isCollapsed, onToggleCollapse, currentPage, setCurrentPage, onLoginClick, user: propUser, onLogout, onProfileClick, onFeedbackClick }) => {
  const { t } = useLanguage();
  const { theme, changeTheme } = useTheme();
  const { user: contextUser } = useAuth();
  const user = propUser || contextUser;
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);

  const isAdmin = user && (user.username === "admin" || user.role === "ADMIN" || user.roles?.includes("ADMIN") || user.roles?.includes("ROLE_ADMIN"));

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      await vocabApi.importExcel(file);
      alert("Nhập Excel thành công!");
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Nhập Excel thất bại: " + (err.response?.data?.message || err.message));
    } finally {
      setImporting(false);
    }
  };

  const displayName = user?.displayName || user?.username || "Learner";
  const avatarContent = user?.avatar
    ? (user.avatar.startsWith("data:image") 
        ? <img src={user.avatar} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
        : user.avatar)
    : displayName.substring(0, 2).toUpperCase();

  return (
    <aside className="app-sidebar">
      {/* Logo */}
      <div className="sidebar-header" style={{ position: 'relative' }}>
        <div className="sidebar-logo" onClick={() => setCurrentPage(user ? "home" : "landing")}>
          <div className="sidebar-logo-icon" style={{ background:'transparent', padding:0, overflow:'hidden' }}><img src="/assets/siro_logo.png" alt="Siro" style={{ width:'100%', height:'100%', objectFit:'contain' }} /></div>
          <div className="sidebar-logo-text">
            <h1>SIRO NIHONGO</h1>
            <span>Học tiếng Nhật thông minh</span>
          </div>
        </div>
        <button 
          type="button"
          onClick={onToggleCollapse}
          className="sidebar-toggle-btn"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">General</div>
        <button
          className={`sidebar-link${currentPage === "home" ? " active" : ""}`}
          onClick={() => setCurrentPage("home")}
        >
          <Home size={17} />
          <span>Trang chủ</span>
        </button>
        <button
          className={`sidebar-link${currentPage === "search" ? " active" : ""}`}
          onClick={() => setCurrentPage("search")}
        >
          <Search size={17} />
          <span>Tra cứu từ điển</span>
        </button>
        <button
          className={`sidebar-link${currentPage === "daily" ? " active" : ""}`}
          onClick={() => {
            setCurrentPage("daily", true);
          }}
        >
          <BookOpen size={17} />
          <span>Học hàng ngày</span>
        </button>
        <button
          className={`sidebar-link${currentPage === "flashcard" ? " active" : ""}`}
          onClick={() => {
            setCurrentPage("flashcard", true);
          }}
        >
          <Layers size={17} />
          <span>Thẻ ghi nhớ</span>
        </button>
        <button
          className={`sidebar-link${currentPage === "knowledge" ? " active" : ""}`}
          onClick={() => setCurrentPage("knowledge")}
        >
          <Database size={17} />
          <span>Kho tri thức AI</span>
        </button>
        <button
          className={`sidebar-link${currentPage === "conversation-tutor" ? " active" : ""}`}
          onClick={() => setCurrentPage("conversation-tutor")}
        >
          <MessageSquare size={17} />
          <span>Gia sư AI</span>
        </button>
        <button
          className="sidebar-link"
          onClick={onFeedbackClick}
        >
          <LifeBuoy size={17} />
          <span>Góp ý & Báo lỗi</span>
        </button>

        {isAdmin && (
          <>
            <div className="sidebar-section-label">Admin Control</div>
            <button
              className={`sidebar-link${currentPage === "admin-vocab" ? " active" : ""}`}
              onClick={() => setCurrentPage("admin-vocab")}
            >
              <ShieldCheck size={17} />
              <span>Quản lý từ vựng</span>
            </button>
            <button
              className={`sidebar-link${currentPage === "admin-feedback" ? " active" : ""}`}
              onClick={() => setCurrentPage("admin-feedback")}
            >
              <MessageSquare size={17} />
              <span>Quản lý góp ý</span>
            </button>
            <button
              className={`sidebar-link${currentPage === "admin-ai" ? " active" : ""}`}
              onClick={() => setCurrentPage("admin-ai")}
            >
              <Cpu size={17} />
              <span>Làm giàu AI</span>
            </button>
            <button
              className="sidebar-link"
              onClick={handleImportClick}
              disabled={importing}
              style={{ color: importing ? "var(--sidebar-icon)" : undefined }}
            >
              {importing ? <Loader size={17} className="animate-spin" /> : <Upload size={17} />}
              <span>Nhập Excel</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </>
        )}
      </nav>

      {/* Theme Selector */}
      <div className="sidebar-theme-selector" style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        {isCollapsed ? (
          <button 
            type="button"
            className="sidebar-btn" 
            title="Đổi giao diện" 
            onClick={() => {
              const themes = ['light', 'dark', 'sepia', 'sakura'];
              const nextIdx = (themes.indexOf(theme) + 1) % themes.length;
              changeTheme(themes[nextIdx]);
            }}
            style={{ padding: '10px', justifyContent: 'center', width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--sidebar-icon)' }}
          >
            <Palette size={16} />
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--sidebar-text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Giao diện</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button 
                type="button"
                onClick={() => changeTheme('light')} 
                style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#ffffff', border: theme === 'light' ? '2px solid var(--accent-color)' : '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', padding: 0 }}
                title="Sáng"
              />
              <button 
                type="button"
                onClick={() => changeTheme('dark')} 
                style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#0f172a', border: theme === 'dark' ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', padding: 0 }}
                title="Tối"
              />
              <button 
                type="button"
                onClick={() => changeTheme('sepia')} 
                style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#f4ecd8', border: theme === 'sepia' ? '2px solid var(--accent-color)' : '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', padding: 0 }}
                title="Hoài cổ"
              />
              <button 
                type="button"
                onClick={() => changeTheme('sakura')} 
                style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#fff0f3', border: theme === 'sakura' ? '2px solid var(--accent-color)' : '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', padding: 0 }}
                title="Hoa anh đào"
              />
            </div>
          </div>
        )}
      </div>

      {/* User / Login */}
      <div className="sidebar-footer">
        {user ? (
          <>
            <div className="sidebar-user" onClick={onProfileClick}>
              <div className="sidebar-avatar">{avatarContent}</div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{displayName}</div>
                <div className="sidebar-user-role">{isAdmin ? "Admin" : "Học viên"}</div>
              </div>
            </div>
            <button className="sidebar-btn" onClick={onLogout}>
              <LogOut size={16} />
              <span>Đăng xuất</span>
            </button>
          </>
        ) : (
          <button className="sidebar-btn" onClick={onLoginClick} style={{ background: "rgba(37,99,235,0.25)", color: "#93c5fd" }}>
            <LogIn size={16} />
            <span>Đăng nhập</span>
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
