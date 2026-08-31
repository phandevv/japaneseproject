import { BookOpen, ChevronLeft, ChevronRight, Cpu, Database, Home, Layers, Loader, LogIn, LogOut, MessageSquare, Palette, Search, ShieldCheck, Upload, LifeBuoy, Gamepad2, Sun, RefreshCw, Trophy, FileText, Sparkles, GraduationCap, X } from "lucide-react";
import { useRef, useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import { vocabApi, getMediaUrl } from "../services/api";

import { useAuth } from "../context/AuthContext";

const Sidebar = ({ isCollapsed, onToggleCollapse, isMobileOpen, onCloseMobile, currentPage, setCurrentPage, onLoginClick, user: propUser, onLogout, onProfileClick, onFeedbackClick }) => {
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
    ? (user.avatar.startsWith("data:image") || user.avatar.startsWith("http") || user.avatar.startsWith("/")
        ? <img src={getMediaUrl(user.avatar)} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
        : user.avatar)
    : displayName.substring(0, 2).toUpperCase();

  const handleNavClick = (page, resetLevel = false) => {
    if (onCloseMobile) onCloseMobile();
    setCurrentPage(page, resetLevel);
  };

  return (
    <>
      <div 
        className={`sidebar-mobile-backdrop ${isMobileOpen ? 'active' : ''}`} 
        onClick={onCloseMobile} 
      />
      <aside className={`app-sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-header" style={{ position: 'relative' }}>
          <div className="sidebar-logo" onClick={() => handleNavClick(user ? "home" : "landing")}>
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
          <button
            type="button"
            onClick={onCloseMobile}
            className="sidebar-mobile-close-btn"
            title="Đóng menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">General</div>
          <button
            className={`sidebar-link${currentPage === "home" ? " active" : ""}`}
            onClick={() => handleNavClick("home")}
          >
            <Home size={17} />
            <span>Trang chủ</span>
          </button>
          <button
            className={`sidebar-link${currentPage === "jlpt-n3" ? " active" : ""}`}
            onClick={() => handleNavClick("jlpt-n3")}
          >
            <GraduationCap size={17} />
            <span>Ôn Luyện JLPT N3</span>
          </button>
          <button
            className={`sidebar-link${currentPage === "grammar" ? " active" : ""}`}
            onClick={() => handleNavClick("grammar")}
          >
            <FileText size={17} />
            <span>Ngữ pháp</span>
          </button>
          <button
            className={`sidebar-link${currentPage === "search" ? " active" : ""}`}
            onClick={() => handleNavClick("search")}
          >
            <Search size={17} />
            <span>Tra cứu từ điển</span>
          </button>
          <button
            className={`sidebar-link${currentPage === "daily" ? " active" : ""}`}
            onClick={() => handleNavClick("daily", true)}
          >
            <BookOpen size={17} />
            <span>Học hàng ngày</span>
          </button>
          <button
            className={`sidebar-link${currentPage === "flashcard" ? " active" : ""}`}
            onClick={() => handleNavClick("flashcard", true)}
          >
            <Layers size={17} />
            <span>Thẻ ghi nhớ</span>
          </button>

          <div className="sidebar-section-label" style={{ marginTop: '10px' }}>Ôn tập</div>
          <button
            className={`sidebar-link${currentPage === "review-morning" ? " active" : ""}`}
            onClick={() => handleNavClick("review-morning")}
          >
            <Sun size={17} />
            <span>Ôn tập buổi sáng</span>
          </button>
          <button
            className={`sidebar-link${currentPage === "review-today" ? " active" : ""}`}
            onClick={() => handleNavClick("review-today")}
          >
            <RefreshCw size={17} />
            <span>Ôn lại hôm nay</span>
          </button>
          <button
            className={`sidebar-link${currentPage === "master-review" ? " active" : ""}`}
            onClick={() => handleNavClick("master-review")}
          >
            <Sparkles size={17} />
            <span>Tổng ôn tập</span>
          </button>
          <button
            className={`sidebar-link${currentPage?.startsWith("game") ? " active" : ""}`}
            onClick={() => handleNavClick("games")}
          >
            <Gamepad2 size={17} />
            <span>Trò chơi</span>
          </button>
          <button
            className={`sidebar-link${currentPage === "knowledge" ? " active" : ""}`}
            onClick={() => handleNavClick("knowledge")}
          >
            <Database size={17} />
            <span>Kho tri thức AI</span>
          </button>
          <button
            className={`sidebar-link${currentPage === "achievements" ? " active" : ""}`}
            onClick={() => handleNavClick("achievements")}
          >
            <Trophy size={17} />
            <span>Thành tựu & Huy hiệu</span>
          </button>
          <button
            className={`sidebar-link${currentPage === "conversation-tutor" ? " active" : ""}`}
            onClick={() => handleNavClick("conversation-tutor")}
          >
            <MessageSquare size={17} />
            <span>Gia sư AI</span>
          </button>
          <button
            className="sidebar-link"
            onClick={() => {
              if (onCloseMobile) onCloseMobile();
              onFeedbackClick();
            }}
          >
            <LifeBuoy size={17} />
            <span>Góp ý & Báo lỗi</span>
          </button>

          {isAdmin && (
            <>
              <div className="sidebar-section-label">Admin Control</div>
              <button
                className={`sidebar-link${currentPage === "admin-vocab" ? " active" : ""}`}
                onClick={() => handleNavClick("admin-vocab")}
              >
                <ShieldCheck size={17} />
                <span>Quản lý từ vựng</span>
              </button>
              <button
                className={`sidebar-link${currentPage === "admin-feedback" ? " active" : ""}`}
                onClick={() => handleNavClick("admin-feedback")}
              >
                <MessageSquare size={17} />
                <span>Quản lý góp ý</span>
              </button>
              <button
                className={`sidebar-link${currentPage === "admin-ai" ? " active" : ""}`}
                onClick={() => handleNavClick("admin-ai")}
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
      </aside>
    </>
  );
};

export default Sidebar;
