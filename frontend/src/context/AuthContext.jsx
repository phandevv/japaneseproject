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
    if (savedToken && savedUsername) {
      setToken(savedToken);
      setUser({ username: savedUsername });
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const data = await authApi.login(username, password);
      setToken(data.token);
      setUser({ username: data.username });
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
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

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      // Ignore network errors on logout
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('username');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading, isAuthenticated: !!token }}>
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
