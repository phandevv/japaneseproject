import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('nihongo-theme') || 'light';
  });
  
  const [customBg, setCustomBg] = useState(() => {
    return localStorage.getItem('nihongo-custom-bg') || null;
  });

  const [sakuraPetalsEnabled, setSakuraPetalsEnabled] = useState(() => {
    const saved = localStorage.getItem('nihongo-sakura-petals');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    // Apply data-theme attribute to html element
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nihongo-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (customBg) {
      document.documentElement.style.setProperty('--custom-bg-image', `url(${customBg})`);
      document.documentElement.setAttribute('data-custom-bg', 'true');
    } else {
      document.documentElement.style.removeProperty('--custom-bg-image');
      document.documentElement.removeAttribute('data-custom-bg');
    }
  }, [customBg, theme]);

  const changeTheme = (newTheme) => {
    setTheme(newTheme);
    setCustomBg(null);
    localStorage.removeItem('nihongo-custom-bg');
  };
  
  const applyCustomBackground = (base64Image) => {
    setCustomBg(base64Image);
    localStorage.setItem('nihongo-custom-bg', base64Image);
  };

  const toggleSakuraPetals = () => {
    setSakuraPetalsEnabled(prev => {
      const next = !prev;
      localStorage.setItem('nihongo-sakura-petals', String(next));
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      changeTheme,
      customBg,
      applyCustomBackground,
      sakuraPetalsEnabled,
      toggleSakuraPetals
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
