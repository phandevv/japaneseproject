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
    const savedAvatar = localStorage.getItem('avatar');
    if (savedToken && savedUsername) {
      setToken(savedToken);
      setUser({ username: savedUsername, avatar: savedAvatar || "" });
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const data = await authApi.login(username, password);
      setToken(data.token);
      setUser({ username: data.username, avatar: data.avatar || "" });
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('username', data.username);
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

  const updateAvatarState = (newAvatar) => {
    setUser(prev => prev ? { ...prev, avatar: newAvatar } : null);
    localStorage.setItem('avatar', newAvatar);
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
    localStorage.removeItem('avatar');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading, isAuthenticated: !!token, updateAvatar: updateAvatarState }}>
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
