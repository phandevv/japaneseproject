import axios from 'axios';

const getApiBaseUrl = () => {
  const host = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
  return `http://${host}:8080/api`;
};

const API_BASE_URL = getApiBaseUrl();

// Automatically attach JWT/Session Token to all requests if present
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// Intercept authentication errors (401/403) to automatically clear stale session data and log out
axios.interceptors.response.use(response => {
  return response;
}, error => {
  if (error.response && (error.response.status === 401 || error.response.status === 403)) {
    const token = localStorage.getItem('token');
    if (token) {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
  }
  return Promise.reject(error);
});

export const authApi = {
  register: async (username, password) => {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, { username, password });
    return response.data;
  },
  login: async (username, password) => {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, { username, password });
    return response.data;
  },
  logout: async () => {
    const response = await axios.post(`${API_BASE_URL}/auth/logout`);
    return response.data;
  }
};

export const userSettingsApi = {
  getSetting: async (level) => {
    const response = await axios.get(`${API_BASE_URL}/user/settings/${level}`);
    return response.data;
  },
  saveSetting: async (level, wordsPerDay) => {
    const response = await axios.post(`${API_BASE_URL}/user/settings`, { level, wordsPerDay });
    return response.data;
  }
};

export const vocabApi = {
  // Get overall stats
  getStats: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/vocab/stats`);
      return response.data;
    } catch (error) {
      console.error("Error fetching stats:", error);
      throw error;
    }
  },

  // Get paginated vocabulary for a specific level (Daily Mode)
  getByLevelPaginated: async (level, page = 0, size = 20) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/vocab/level/${level}?page=${page}&size=${size}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching paginated vocab for level ${level}:`, error);
      throw error;
    }
  },

  // Get random vocabulary for a specific level
  getRandomByLevel: async (level, count = 20) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/vocab/random?level=${level}&count=${count}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching random vocab for level ${level}:`, error);
      throw error;
    }
  },

  // Search vocabulary
  search: async (keyword, page = 0, size = 20) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/vocab/search?q=${encodeURIComponent(keyword)}&page=${page}&size=${size}`);
      return response.data;
    } catch (error) {
      console.error("Error searching vocab:", error);
      throw error;
    }
  },

  // Import Excel file
  importExcel: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axios.post(`${API_BASE_URL}/import/excel`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error importing excel:", error);
      throw error;
    }
  },

  // Create new vocabulary
  create: async (vocabData) => {
    const response = await axios.post(`${API_BASE_URL}/vocab`, vocabData);
    return response.data;
  },

  // Update vocabulary
  update: async (id, vocabData) => {
    const response = await axios.put(`${API_BASE_URL}/vocab/${id}`, vocabData);
    return response.data;
  },

  // Delete vocabulary
  delete: async (id) => {
    const response = await axios.delete(`${API_BASE_URL}/vocab/${id}`);
    return response.data;
  }
};

export const srsApi = {
  getDueWords: async () => {
    const response = await axios.get(`${API_BASE_URL}/srs/due`);
    return response.data;
  },
  reviewWord: async (vocabularyId, quality) => {
    const response = await axios.post(`${API_BASE_URL}/srs/review`, { vocabularyId, quality });
    return response.data;
  }
};

export const analyticsApi = {
  getDashboard: async () => {
    const response = await axios.get(`${API_BASE_URL}/analytics/dashboard`);
    return response.data;
  },
  logSession: async (wordsStudied, correctAnswers, totalQuestions) => {
    const response = await axios.post(`${API_BASE_URL}/analytics/session`, {
      wordsStudied,
      correctAnswers,
      totalQuestions
    });
    return response.data;
  }
};

