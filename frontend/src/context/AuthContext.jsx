import React, { createContext, useState, useContext, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUsername = localStorage.getItem('username');
    const savedRole = localStorage.getItem('role');
    const savedDisplayName = localStorage.getItem('displayName');
    const savedAddress = localStorage.getItem('address');
    const savedPhone = localStorage.getItem('phone');
    const savedOccupation = localStorage.getItem('occupation');
    const savedAvatar = localStorage.getItem('avatar');
    if (savedToken && savedUsername) {
      setToken(savedToken);
      setUser({ 
        username: savedUsername,
        role: savedRole || "USER",
        displayName: savedDisplayName || "",
        address: savedAddress || "",
        phone: savedPhone || "",
        occupation: savedOccupation || "",
        avatar: savedAvatar || ""
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const handleTokenRefresh = () => {
      const newToken = localStorage.getItem('token');
      setToken(newToken);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('token-refreshed', handleTokenRefresh);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('token-refreshed', handleTokenRefresh);
      }
    };
  }, []);

  const login = async (username, password) => {
    try {
      const data = await authApi.login(username, password);
      setToken(data.token);
      setUser({ 
        username: data.username,
        role: data.role || "USER",
        displayName: data.displayName || "",
        address: data.address || "",
        phone: data.phone || "",
        occupation: data.occupation || "",
        avatar: data.avatar || ""
      });
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('username', data.username);
      localStorage.setItem('role', data.role || "USER");
      localStorage.setItem('displayName', data.displayName || "");
      localStorage.setItem('address', data.address || "");
      localStorage.setItem('phone', data.phone || "");
      localStorage.setItem('occupation', data.occupation || "");
      localStorage.setItem('avatar', data.avatar || "");
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.error || "Login failed";
      return { success: false, error: errorMsg };
    }
  };

  const register = async (username, password) => {
    try {
      await authApi.register(username, password);
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.error || "Registration failed";
      return { success: false, error: errorMsg };
    }
  };

  const updateProfileState = (profileData) => {
    setUser(prev => prev ? { ...prev, ...profileData } : null);
    Object.entries(profileData).forEach(([key, val]) => {
      localStorage.setItem(key, val || "");
    });
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      // Ignore network errors on logout
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('displayName');
    localStorage.removeItem('address');
    localStorage.removeItem('phone');
    localStorage.removeItem('occupation');
    localStorage.removeItem('avatar');
    sessionStorage.removeItem('streakModalShown');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading, isAuthenticated: !!token, updateAvatar: updateProfileState }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
