import React, { useState, useEffect } from 'react';
import { usersApi, getMediaUrl } from '../services/api';
import { User as UserIcon } from 'lucide-react';

export const OnlineUsersWidget = ({ onUserClick }) => {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOnlineUsers = async () => {
      try {
        const users = await usersApi.getOnlineUsers();
        setOnlineUsers(users);
      } catch (error) {
        console.error("Failed to fetch online users", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOnlineUsers();
    // Poll every 60 seconds
    const interval = setInterval(fetchOnlineUsers, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return null;

  const displayedUsers = onlineUsers.slice(0, 5);
  const remainingCount = onlineUsers.length - 5;

  return (
    <div style={{ background: 'var(--surface-color)', borderRadius: 16, border: '1px solid var(--border-color)', padding: 20, marginTop: 24, boxShadow: 'var(--shadow-sm)' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
        Đang trực tuyến ({onlineUsers.length})
      </h3>
      <div 
        style={{ display: 'flex', alignItems: 'center' }}
        title={onlineUsers.length > 0 ? `Đang trực tuyến: ${onlineUsers.map(u => u.displayName || u.username).join(', ')}` : ''}
      >
        {onlineUsers.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Không có ai đang online.</p>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {displayedUsers.map((u, index) => (
                <div 
                  key={u.username}
                  onClick={() => onUserClick(u.username)}
                  style={{
                    position: 'relative',
                    marginLeft: index === 0 ? 0 : -10,
                    zIndex: 5 - index,
                    cursor: 'pointer',
                    transition: 'transform 0.2s, z-index 0.2s',
                    borderRadius: '50%',
                    border: '2px solid var(--surface-color)',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.zIndex = 10;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.zIndex = 5 - index;
                  }}
                  title={u.displayName || u.username}
                >
                  {u.avatar ? (
                    <img src={getMediaUrl(u.avatar)} alt="avatar" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                      <UserIcon size={16} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            {remainingCount > 0 && (
              <div 
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'var(--border-color)',
                  border: '2px solid var(--surface-color)',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  marginLeft: -10,
                  zIndex: 0,
                  boxShadow: 'var(--shadow-sm)',
                  cursor: 'help'
                }}
                title={`Và ${remainingCount} người khác: ${onlineUsers.slice(5).map(u => u.displayName || u.username).join(', ')}`}
              >
                +{remainingCount}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
