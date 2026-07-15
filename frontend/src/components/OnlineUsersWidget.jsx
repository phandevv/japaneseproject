import React, { useState, useEffect } from 'react';
import { usersApi } from '../services/api';
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

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 20, marginTop: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
        Đang trực tuyến ({onlineUsers.length})
      </h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {onlineUsers.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>Không có ai đang online.</p>
        ) : (
          onlineUsers.map(u => (
            <div 
              key={u.username} 
              onClick={() => onUserClick(u.username)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                padding: '6px 12px', 
                background: '#f8fafc', 
                borderRadius: 20, 
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
              onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
              title={u.displayName || u.username}
            >
              {u.avatar ? (
                <img src={u.avatar} alt="avatar" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <UserIcon size={14} />
                </div>
              )}
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
                {u.displayName || u.username}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
