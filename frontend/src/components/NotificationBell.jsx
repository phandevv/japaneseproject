import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCircle2, Info } from 'lucide-react';
import { notificationApi } from '../services/api';
import '../styles/NotificationBell.css';

const NotificationBell = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const fetchUnreadCount = async () => {
    try {
      const data = await notificationApi.getUnreadCount();
      setUnreadCount(data.count || 0);
    } catch (error) {
      console.error("Failed to fetch unread count", error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const data = await notificationApi.getNotifications(0, 10);
      setNotifications(data.content || []);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchUnreadCount();
      }
    };

    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchUnreadCount();
      }
    }, 45000); // Smart Poll every 45s

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark as read", error);
    }
  };

  const handleNotificationClick = (notif) => {
    if (!notif.read) {
      handleMarkAsRead(notif.id);
    }
    if (notif.type === 'FEEDBACK') {
      navigate('/admin-feedback');
      setIsOpen(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read", error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN', { 
      hour: '2-digit', minute: '2-digit', 
      day: '2-digit', month: '2-digit' 
    }).format(date);
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button 
        onClick={toggleDropdown}
        className="notification-bell-btn"
        title="Thông báo"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3 className="notification-title">Thông báo</h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllAsRead}
                className="notification-mark-all"
                title="Đánh dấu tất cả đã đọc"
              >
                <Check size={14} />
                Đã đọc tất cả
              </button>
            )}
          </div>
          
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <Bell size={36} opacity={0.3} />
                <p style={{ margin: 0 }}>Bạn không có thông báo nào</p>
              </div>
            ) : (
              <div>
                {notifications.map(notif => (
                  <div 
                    key={notif.id} 
                    className={`notification-item ${!notif.read ? 'unread' : ''}`}
                    onClick={() => handleNotificationClick(notif)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="notification-icon-wrapper">
                      {notif.type === 'FEEDBACK_PROCESSED' || notif.type === 'FEEDBACK' ? (
                        <CheckCircle2 size={18} color={!notif.read ? 'var(--accent-color)' : 'var(--text-secondary)'} />
                      ) : (
                        <Info size={18} color={!notif.read ? 'var(--accent-color)' : 'var(--text-secondary)'} />
                      )}
                    </div>
                    
                    <div className="notification-content-wrapper">
                      <div className="notification-item-header">
                        <h4 className="notification-item-title">{notif.title}</h4>
                        <span className="notification-item-time">{formatDate(notif.createdAt)}</span>
                      </div>
                      <p className="notification-item-message">{notif.message}</p>
                    </div>

                    {!notif.read && (
                      <button 
                        onClick={(e) => handleMarkAsRead(notif.id, e)}
                        className="notification-read-btn"
                        title="Đánh dấu đã đọc"
                      >
                        <span className="notification-read-dot"></span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
