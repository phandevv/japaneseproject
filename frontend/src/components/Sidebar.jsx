import { BookOpen, ChevronLeft, ChevronRight, Cpu, Database, Home, Layers, Loader, LogIn, LogOut, MessageSquare, Palette, Search, ShieldCheck, Upload, LifeBuoy, Gamepad2, Sun, RefreshCw, Trophy } from "lucide-react";
import { useRef, useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import { vocabApi, getMediaUrl } from "../services/api";

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
    ? (user.avatar.startsWith("data:image") || user.avatar.startsWith("http") || user.avatar.startsWith("/")
        ? <img src={getMediaUrl(user.avatar)} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
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

        <div className="sidebar-section-label" style={{ marginTop: '10px' }}>Ôn tập</div>
        <button
          className={`sidebar-link${currentPage === "review-morning" ? " active" : ""}`}
          onClick={() => setCurrentPage("review-morning")}
        >
          <Sun size={17} />
          <span>Ôn tập buổi sáng</span>
        </button>
        <button
          className={`sidebar-link${currentPage === "review-today" ? " active" : ""}`}
          onClick={() => setCurrentPage("review-today")}
        >
          <RefreshCw size={17} />
          <span>Ôn lại hôm nay</span>
        </button>
        <button
          className={`sidebar-link${currentPage?.startsWith("game") ? " active" : ""}`}
          onClick={() => setCurrentPage("games")}
        >
          <Gamepad2 size={17} />
          <span>Trò chơi</span>
        </button>
        <button
          className={`sidebar-link${currentPage === "knowledge" ? " active" : ""}`}
          onClick={() => setCurrentPage("knowledge")}
        >
          <Database size={17} />
          <span>Kho tri thức AI</span>
        </button>
        <button
          className={`sidebar-link${currentPage === "achievements" ? " active" : ""}`}
          onClick={() => setCurrentPage("achievements")}
        >
          <Trophy size={17} />
          <span>Thành tựu & Huy hiệu</span>
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

    </aside>
  );
};

export default Sidebar;
