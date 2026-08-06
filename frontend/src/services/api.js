import axios from 'axios';

const getApiBaseUrl = () => {
  if (typeof window === 'undefined') return 'http://127.0.0.1:8080/api';
  const { hostname, protocol } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8080/api';
  }
  // On production, use relative /api so it maps to the same protocol (HTTPS) and port via Nginx
  return `${protocol}//${hostname}/api`;
};

const API_BASE_URL = getApiBaseUrl();

export const getMediaUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:image')) return path;
  if (path.startsWith('/')) {
    if (typeof window === 'undefined') return `http://127.0.0.1:8080${path}`;
    const { hostname, protocol } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `http://localhost:8080${path}`;
    }
    return `${protocol}//${hostname}${path}`;
  }
  return path;
};
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

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Intercept authentication errors (401/403) to automatically refresh access token or log out
axios.interceptors.response.use(response => {
  return response;
}, error => {
  const originalRequest = error.config;
  
  if (error.response && 
      (error.response.status === 401 || error.response.status === 403) && 
      !originalRequest._retry && 
      originalRequest.url && 
      !originalRequest.url.includes('/auth/refresh')
  ) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
      .then(token => {
        originalRequest.headers['Authorization'] = 'Bearer ' + token;
        return axios(originalRequest);
      })
      .catch(err => {
        return Promise.reject(err);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      return new Promise((resolve, reject) => {
        axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken })
          .then(({ data }) => {
            localStorage.setItem('token', data.token);
            axios.defaults.headers.common['Authorization'] = 'Bearer ' + data.token;
            originalRequest.headers['Authorization'] = 'Bearer ' + data.token;
            
            // Dispatch custom event to notify AuthContext to update token state
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('token-refreshed'));
            }

            processQueue(null, data.token);
            resolve(axios(originalRequest));
          })
          .catch((err) => {
            processQueue(err, null);
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('username');
            
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('token-refreshed'));
              window.location.reload();
            }
            reject(err);
          })
          .then(() => {
            isRefreshing = false;
          });
      });
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('token-refreshed'));
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
  },
  updateProfile: async (profileData) => {
    const response = await axios.put(`${API_BASE_URL}/auth/profile`, profileData);
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
  },
  markDayCompleted: async (level, day) => {
    const response = await axios.post(`${API_BASE_URL}/user/settings/complete-day`, { level, day });
    return response.data;
  },
  completeDay: async (level, day) => {
    const response = await axios.post(`${API_BASE_URL}/user/settings/complete-day`, { level, day });
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
  },

  // Enrich vocabulary word (lazy load examples and related Kanji words, supports force=true for admin)
  enrich: async (id, force = false) => {
    const response = await axios.post(`${API_BASE_URL}/vocab/${id}/enrich${force ? '?force=true' : ''}`);
    return response.data;
  },

  // Get vocabulary by ID
  getById: async (id) => {
    const response = await axios.get(`${API_BASE_URL}/vocab/${id}`);
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
  },
  getRandomLearnedWords: async (count = 20) => {
    const response = await axios.get(`${API_BASE_URL}/srs/learned/random?count=${count}`);
    return response.data;
  },
  getSrsList: async () => {
    const response = await axios.get(`${API_BASE_URL}/srs/list`);
    return response.data;
  },
  getTodayReviewed: async () => {
    const response = await axios.get(`${API_BASE_URL}/study/today-reviewed`);
    return response.data;
  }
};

export const masterReviewApi = {
  getWords: async (startDate = null, endDate = null) => {
    let url = `${API_BASE_URL}/master-review/words`;
    if (startDate && endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    }
    const response = await axios.get(url);
    return response.data;
  }
};

export const studyApi = {
  getQueue: async (level = 'N5') => {
    const response = await axios.get(`${API_BASE_URL}/study/queue?level=${level}`);
    return response.data; // { queue, newWordsLimit, queueSize }
  }
};

export const analyticsApi = {
  getDashboard: async () => {
    const response = await axios.get(`${API_BASE_URL}/analytics/dashboard`);
    return response.data;
  },
  logSession: async (wordsStudied, correctAnswers, totalQuestions) => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dateVal = String(d.getDate()).padStart(2, '0');
    const localDateStr = `${year}-${month}-${dateVal}`;

    const response = await axios.post(`${API_BASE_URL}/analytics/session`, {
      wordsStudied,
      correctAnswers,
      totalQuestions,
      date: localDateStr
    });
    return response.data;
  },
  activateStreakFreeze: async () => {
    const response = await axios.post(`${API_BASE_URL}/analytics/streak-freeze`);
    return response.data;
  }
};

export const feedbackApi = {
  submit: async (title, content, type) => {
    const response = await axios.post(`${API_BASE_URL}/feedbacks`, { title, content, type });
    return response.data;
  },
  getAll: async (page = 0, size = 20) => {
    const response = await axios.get(`${API_BASE_URL}/feedbacks?page=${page}&size=${size}`);
    return response.data;
  },
  updateStatus: async (id, status) => {
    const response = await axios.put(`${API_BASE_URL}/feedbacks/${id}/status`, { status });
    return response.data;
  }
};

export const notificationApi = {
  getNotifications: async (page = 0, size = 20) => {
    const response = await axios.get(`${API_BASE_URL}/notifications?page=${page}&size=${size}`);
    return response.data;
  },
  getUnreadCount: async () => {
    const response = await axios.get(`${API_BASE_URL}/notifications/unread-count`);
    return response.data;
  },
  markAsRead: async (id) => {
    const response = await axios.put(`${API_BASE_URL}/notifications/${id}/read`);
    return response.data;
  },
  markAllAsRead: async () => {
    const response = await axios.put(`${API_BASE_URL}/notifications/read-all`);
    return response.data;
  }
};

export const chatApi = {
  /**
   * Send a message to the Japanese AI tutor.
   * @param {string} message - The user's message
   * @param {Array} history  - Array of { role: 'user'|'assistant', content: string }
   */
  send: async (message, history = []) => {
    const response = await axios.post(`${API_BASE_URL}/chat`, { message, history });
    return response.data; // { reply: string }
  }
};

export const knowledgeApi = {
  /**
   * Normalize and enrich any raw input from the user.
   * @param {string} input - The raw text (e.g. Romaji, Kanji, meaning)
   */
  collect: async (input, fast = false) => {
    const response = await axios.post(`${API_BASE_URL}/knowledge/collect`, { input, fast });
    return response.data;
  },
  /**
   * Stream normalize and AI enrichment in real-time.
   */
  collectStream: async (input, { onStatus, onChunk, onComplete, onError }) => {
    let receivedComplete = false;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/knowledge/collect/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ input })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const block of lines) {
          if (!block.trim()) continue;
          let eventName = 'message';
          let dataStr = '';

          const blockLines = block.split('\n');
          for (const l of blockLines) {
            if (l.startsWith('event:')) {
              eventName = l.substring(6).trim();
            } else if (l.startsWith('data:')) {
              dataStr += l.substring(5).trim();
            }
          }

          if (dataStr) {
            try {
              const data = JSON.parse(dataStr);
              if (eventName === 'status' && onStatus) onStatus(data);
              else if (eventName === 'chunk' && onChunk) onChunk(data.content || '');
              else if (eventName === 'complete' && onComplete) {
                receivedComplete = true;
                onComplete(data);
              }
              else if (eventName === 'error' && onError) onError(data.error || 'Lỗi Streaming AI');
            } catch (e) {
              console.warn('JSON parse error in SSE chunk:', e);
            }
          }
        }
      }

      if (!receivedComplete) {
        console.warn('Stream connection ended without complete event. Executing fallback...');
        const fallbackData = await knowledgeApi.collect(input);
        if (onComplete) onComplete(fallbackData);
      }
    } catch (e) {
      console.warn('Streaming connection issue, executing fallback to standard collect API:', e);
      try {
        const fallbackData = await knowledgeApi.collect(input);
        if (onComplete) onComplete(fallbackData);
      } catch (fallbackErr) {
        if (onError) onError(fallbackErr?.response?.data?.error || fallbackErr.message || 'Lỗi kết nối AI');
      }
    }
  },
  /**
   * Save the finalized enriched knowledge card.
   * @param {string} type - 'vocabulary' or 'grammar'
   * @param {Object} data - The enriched JSON data
   */
  save: async (type, data) => {
    const response = await axios.post(`${API_BASE_URL}/knowledge/save`, { type, data });
    return response.data;
  },
  /**
   * Generate customized Japanese reading material based on user's personal corpus.
   */
  generateReading: async () => {
    const response = await axios.post(`${API_BASE_URL}/knowledge/corpus/generate-reading`);
    return response.data;
  },
  /**
   * Generate customized Japanese conversational dialogue based on user's personal corpus.
   */
  generateConversation: async () => {
    const response = await axios.post(`${API_BASE_URL}/knowledge/corpus/generate-conversation`);
    return response.data;
  },
  /**
   * Get all vocabulary words saved by the user.
   */
  getSavedVocabulary: async () => {
    const response = await axios.get(`${API_BASE_URL}/knowledge/saved/vocabulary`);
    return response.data;
  },
  /**
   * Get all grammar cards saved by the user.
   */
  getSavedGrammar: async () => {
    const response = await axios.get(`${API_BASE_URL}/knowledge/saved/grammar`);
    return response.data;
  },
  /**
   * Delete vocabulary card from personal knowledge base.
   */
  deleteSavedVocabulary: async (id) => {
    const response = await axios.delete(`${API_BASE_URL}/knowledge/saved/vocabulary/${id}`);
    return response.data;
  },
  /**
   * Delete grammar card from personal knowledge base.
   */
  deleteSavedGrammar: async (id) => {
    const response = await axios.delete(`${API_BASE_URL}/knowledge/saved/grammar/${id}`);
    return response.data;
  }
};

export const usersApi = {
  getOnlineUsers: async () => {
    const response = await axios.get(`${API_BASE_URL}/users/online`);
    return response.data;
  },
  getUserProfile: async (username) => {
    const response = await axios.get(`${API_BASE_URL}/users/${username}`);
    return response.data;
  },
  studyHistoryDetails: async (range, tab = 'all', page = 0, size = 30) => {
    const response = await axios.get(`${API_BASE_URL}/users/me/study-history-details?range=${range}&tab=${tab}&page=${page}&size=${size}`);
    return response.data;
  }
};

export const achievementApi = {
  getAchievements: async () => {
    const response = await axios.get(`${API_BASE_URL}/achievements`);
    return response.data;
  },
  checkAchievements: async () => {
    const response = await axios.post(`${API_BASE_URL}/achievements/check`);
    return response.data;
  }
};

export const grammarApi = {
  getGrammarCards: async ({ jlpt = 'N3', week, day, query, page = 0, size = 50 } = {}) => {
    const params = new URLSearchParams();
    if (jlpt) params.append('jlpt', jlpt);
    if (week) params.append('week', week);
    if (day) params.append('day', day);
    if (query) params.append('query', query);
    params.append('page', page);
    params.append('size', size);
    const response = await axios.get(`${API_BASE_URL}/grammar?${params.toString()}`);
    return response.data;
  },
  getNavigation: async (jlpt = 'N3') => {
    const response = await axios.get(`${API_BASE_URL}/grammar/navigation?jlpt=${jlpt}`);
    return response.data;
  },
  getGrammarDetail: async (id) => {
    const response = await axios.get(`${API_BASE_URL}/grammar/${id}`);
    return response.data;
  }
};

export const jlptN3Api = {
  getCourseOverview: async () => {
    const response = await axios.get(`${API_BASE_URL}/jlpt-n3/overview`);
    return response.data;
  },
  getLessonData: async (chapter, lesson) => {
    const response = await axios.get(`${API_BASE_URL}/jlpt-n3/chapter/${chapter}/lesson/${lesson}`);
    return response.data;
  },
  submitQuiz: async (chapter, lesson, score, total) => {
    const response = await axios.post(`${API_BASE_URL}/jlpt-n3/chapter/${chapter}/lesson/${lesson}/submit-quiz`, {
      score,
      total
    });
    return response.data;
  },
  importData: async () => {
    const response = await axios.post(`${API_BASE_URL}/jlpt-n3/import`);
    return response.data;
  },
  uploadJsonFiles: async (fileList) => {
    const formData = new FormData();
    for (let i = 0; i < fileList.length; i++) {
      formData.append('files', fileList[i]);
    }
    const response = await axios.post(`${API_BASE_URL}/jlpt-n3/upload-json`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },
  evaluateAnswer: async (targetAnswer, userAnswer, questionContext = '') => {
    const response = await axios.post(`${API_BASE_URL}/jlpt-n3/evaluate-answer`, {
      targetAnswer,
      userAnswer,
      questionContext
    });
    return response.data;
  }
};

export const api = axios;
