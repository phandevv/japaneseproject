import React, { useRef, useState } from "react";
import { Home, Search, BookOpen, Layers, LogOut, LogIn, Upload, Loader, User, Settings, ShieldCheck, MessageSquare, Cpu, Database } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { vocabApi } from "../services/api";

const Sidebar = ({ currentPage, setCurrentPage, onLoginClick, user, onLogout, onProfileClick, onFeedbackClick }) => {
  const { t } = useLanguage();
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);

  const isAdmin = user && (user.username === "admin" || user.role === "ADMIN");

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setImporting(true);
      try {
        await vocabApi.importExcel(e.target.files[0]);
        alert("Nhập Excel thành công!");
        window.location.reload();
      } catch (err) {
        alert("Nhập Excel thất bại: " + (err.response?.data?.message || err.message));
      } finally {
        setImporting(false);
      }
    }
  };

  const navItems = [
    { key: "home",      icon: <Home size={17} />,     label: "Trang chủ" },
    { key: "search",    icon: <Search size={17} />,   label: "Tìm kiếm" },
    { key: "daily",     icon: <BookOpen size={17} />, label: "Học hàng ngày" },
    { key: "flashcard", icon: <Layers size={17} />,   label: "Flashcard" },
    { key: "knowledge", icon: <Database size={17} />, label: "Kho tri thức AI" },
  ];

  const displayName = user?.displayName || user?.username || "";
  const avatarContent = user?.avatar
    ? user.avatar.startsWith("data:image")
      ? <img src={user.avatar} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      : user.avatar
    : displayName?.[0]?.toUpperCase() || "?";

  return (
    <aside className="app-sidebar">
      {/* Logo */}
      <div className="sidebar-header">
        <div className="sidebar-logo" onClick={() => setCurrentPage("home")}>
          <div className="sidebar-logo-icon">S</div>
          <div className="sidebar-logo-text">
            <h1>SIRO NIHONGO</h1>
            <span>Học tiếng Nhật thông minh</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <span className="sidebar-section-label">Menu</span>
        {navItems.map((item) => (
          <button
            key={item.key}
            className={`sidebar-link${currentPage === item.key ? " active" : ""}`}
            onClick={() => {
              if (item.key === "flashcard" || item.key === "daily") {
                setCurrentPage(item.key, true); // signal reset level
              } else {
                setCurrentPage(item.key);
              }
            }}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
        
        <button
          className="sidebar-link"
          onClick={onFeedbackClick}
          style={{ borderTop: "1px dashed rgba(255,255,255,0.08)", marginTop: "6px", paddingTop: "12px" }}
        >
          <MessageSquare size={17} />
          <span>Góp ý & Báo lỗi</span>
        </button>

        {isAdmin && (
          <>
            <span className="sidebar-section-label" style={{ marginTop: 8 }}>Admin</span>
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
