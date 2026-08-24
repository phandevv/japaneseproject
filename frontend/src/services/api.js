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
// Automatically attach JWT/Session Token & Client Timezone to all requests if present
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) {
      config.headers['X-Timezone'] = tz;
    }
  } catch (e) {
    // fallback
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

export const clearAuthAndForceLogout = () => {
  if (typeof window === 'undefined') return;
  // 1. Clear all authentication storage
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('username');
  localStorage.removeItem('role');
  localStorage.removeItem('displayName');
  localStorage.removeItem('address');
  localStorage.removeItem('phone');
  localStorage.removeItem('occupation');
  localStorage.removeItem('avatar');
  localStorage.removeItem('coverPhoto');
  try {
    sessionStorage.clear();
  } catch (e) {}

  // 2. Remove default Authorization header
  delete axios.defaults.headers.common['Authorization'];

  // 3. Dispatch auth-logout event to reset AuthContext state instantly
  window.dispatchEvent(new Event('auth-logout'));

  // 4. Force redirect back to home / login view cleanly
  if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
    window.location.href = '/';
  } else {
    window.location.reload();
  }
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
      !originalRequest.url.includes('/auth/refresh') &&
      !originalRequest.url.includes('/auth/login')
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
    if (!refreshToken) {
      isRefreshing = false;
      clearAuthAndForceLogout();
      return Promise.reject(error);
    }

    return new Promise((resolve, reject) => {
      axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken })
        .then(({ data }) => {
          if (!data || !data.token) {
            throw new Error('Invalid refresh response: no token returned');
          }
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
          clearAuthAndForceLogout();
          reject(err);
        })
        .finally(() => {
          isRefreshing = false;
        });
    });
  }
  return Promise.reject(error);
});

// ── In-Flight Request Deduplicator & Short-Lived SWR Cache ──
const inFlightRequests = new Map();
const responseCache = new Map();

export const cachedGet = async (url, config = {}, ttlMs = 15000) => {
  const cacheKey = `GET:${url}:${JSON.stringify(config.params || {})}`;
  const now = Date.now();

  // 1. Check valid memory cache
  const cached = responseCache.get(cacheKey);
  if (cached && (now - cached.timestamp < ttlMs)) {
    return cached.data;
  }

  // 2. Check in-flight pending promise
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  // 3. Make HTTP request
  const requestPromise = axios.get(url, config)
    .then(res => {
      responseCache.set(cacheKey, { data: res.data, timestamp: Date.now() });
      inFlightRequests.delete(cacheKey);
      return res.data;
    })
    .catch(err => {
      inFlightRequests.delete(cacheKey);
      throw err;
    });

  inFlightRequests.set(cacheKey, requestPromise);
  return requestPromise;
};

export const clearApiCache = (urlPrefix = '') => {
  if (!urlPrefix) {
    responseCache.clear();
    return;
  }
  for (const key of responseCache.keys()) {
    if (key.includes(urlPrefix)) {
      responseCache.delete(key);
    }
  }
};

export const authApi = {
  register: async (username, password) => {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, { username, password });
    return response.data;
  },
  login: async (username, password) => {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, { username, password });
    clearApiCache();
    return response.data;
  },
  logout: async () => {
    const response = await axios.post(`${API_BASE_URL}/auth/logout`);
    clearApiCache();
    return response.data;
  },
  updateProfile: async (profileData) => {
    const response = await axios.put(`${API_BASE_URL}/auth/profile`, profileData);
    clearApiCache('/users/');
    clearApiCache('/analytics/');
    return response.data;
  }
};

export const userSettingsApi = {
  getSetting: async (level) => {
    return cachedGet(`${API_BASE_URL}/user/settings/${level}`, {}, 30000);
  },
  saveSetting: async (level, wordsPerDay) => {
    const response = await axios.post(`${API_BASE_URL}/user/settings`, { level, wordsPerDay });
    clearApiCache('/user/settings');
    return response.data;
  },
  markDayCompleted: async (level, day) => {
    const response = await axios.post(`${API_BASE_URL}/user/settings/complete-day`, { level, day });
    clearApiCache('/user/settings');
    clearApiCache('/analytics/');
    return response.data;
  },
  completeDay: async (level, day) => {
    const response = await axios.post(`${API_BASE_URL}/user/settings/complete-day`, { level, day });
    clearApiCache('/user/settings');
    clearApiCache('/analytics/');
    return response.data;
  }
};

export const vocabApi = {
  // Get all vocabulary paginated
  getAll: async (page = 0, size = 20) => {
    return cachedGet(`${API_BASE_URL}/vocab`, { params: { page, size } }, 15000);
  },

  // Get overall stats
  getStats: async () => {
    return cachedGet(`${API_BASE_URL}/vocab/stats`, {}, 60000);
  },

  // Get paginated vocabulary for a specific level (Daily Mode / Admin Mode)
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
    clearApiCache('/jlpt-n3');
    clearApiCache('/vocab');
    return response.data;
  },

  // Enrich vocabulary word (lazy load examples and related Kanji words, supports force=true for admin)
  enrich: async (id, force = false) => {
    const response = await axios.post(`${API_BASE_URL}/vocab/${id}/enrich${force ? '?force=true' : ''}`);
    return response.data;
  },

  // Enrich a specific section/field of a vocabulary word via DeepSeek AI
  enrichSection: async (id, section) => {
    const response = await axios.post(`${API_BASE_URL}/vocab/${id}/enrich-section`, null, {
      params: { section }
    });
    clearApiCache('/vocab');
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
  reviewGrammar: async (grammarId, quality) => {
    const response = await axios.post(`${API_BASE_URL}/srs/review-grammar`, { grammarId, quality });
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
    return cachedGet(`${API_BASE_URL}/analytics/dashboard`, {}, 10000);
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
    clearApiCache('/analytics/dashboard');
    return response.data;
  },
  activateStreakFreeze: async () => {
    const response = await axios.post(`${API_BASE_URL}/analytics/streak-freeze`);
    clearApiCache('/analytics/dashboard');
    return response.data;
  }
};

export const feedbackApi = {
  submit: async (title, content, type) => {
    const response = await axios.post(`${API_BASE_URL}/feedbacks`, { title, content, type });
    clearApiCache('/feedbacks');
    return response.data;
  },
  getAll: async (page = 0, size = 20) => {
    return cachedGet(`${API_BASE_URL}/feedbacks`, { params: { page, size } }, 15000);
  },
  updateStatus: async (id, status) => {
    const response = await axios.put(`${API_BASE_URL}/feedbacks/${id}/status`, { status });
    clearApiCache('/feedbacks');
    return response.data;
  }
};

export const notificationApi = {
  getNotifications: async (page = 0, size = 20) => {
    return cachedGet(`${API_BASE_URL}/notifications`, { params: { page, size } }, 15000);
  },
  getUnreadCount: async () => {
    return cachedGet(`${API_BASE_URL}/notifications/unread-count`, {}, 20000);
  },
  markAsRead: async (id) => {
    const response = await axios.put(`${API_BASE_URL}/notifications/${id}/read`);
    clearApiCache('/notifications');
    return response.data;
  },
  markAllAsRead: async () => {
    const response = await axios.put(`${API_BASE_URL}/notifications/read-all`);
    clearApiCache('/notifications');
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
    clearApiCache('/knowledge/saved');
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
    return cachedGet(`${API_BASE_URL}/knowledge/saved/vocabulary`, {}, 20000);
  },
  /**
   * Get all grammar cards saved by the user.
   */
  getSavedGrammar: async () => {
    return cachedGet(`${API_BASE_URL}/knowledge/saved/grammar`, {}, 20000);
  },
  /**
   * Delete vocabulary card from personal knowledge base.
   */
  deleteSavedVocabulary: async (id) => {
    const response = await axios.delete(`${API_BASE_URL}/knowledge/saved/vocabulary/${id}`);
    clearApiCache('/knowledge/saved');
    return response.data;
  },
  /**
   * Delete grammar card from personal knowledge base.
   */
  deleteSavedGrammar: async (id) => {
    const response = await axios.delete(`${API_BASE_URL}/knowledge/saved/grammar/${id}`);
    clearApiCache('/knowledge/saved');
    return response.data;
  }
};

export const usersApi = {
  getOnlineUsers: async () => {
    return cachedGet(`${API_BASE_URL}/users/online`, {}, 15000);
  },
  getUserProfile: async (username) => {
    return cachedGet(`${API_BASE_URL}/users/${username}`, {}, 20000);
  },
  studyHistoryDetails: async (range, tab = 'all', page = 0, size = 30) => {
    return cachedGet(`${API_BASE_URL}/users/me/study-history-details?range=${range}&tab=${tab}&page=${page}&size=${size}`, {}, 15000);
  }
};

export const achievementApi = {
  getAchievements: async () => {
    return cachedGet(`${API_BASE_URL}/achievements`, {}, 30000);
  },
  checkAchievements: async () => {
    const response = await axios.post(`${API_BASE_URL}/achievements/check`);
    clearApiCache('/achievements');
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
    return cachedGet(`${API_BASE_URL}/grammar?${params.toString()}`, {}, 30000);
  },
  getNavigation: async (jlpt = 'N3') => {
    return cachedGet(`${API_BASE_URL}/grammar/navigation?jlpt=${jlpt}`, {}, 60000);
  },
  getGrammarDetail: async (id) => {
    return cachedGet(`${API_BASE_URL}/grammar/${id}`, {}, 60000);
  },
  getById: async (id) => {
    return cachedGet(`${API_BASE_URL}/grammar/${id}`, {}, 60000);
  },
  enrich: async (id, force = false) => {
    const response = await axios.post(`${API_BASE_URL}/grammar/${id}/enrich`, null, {
      params: { force }
    });
    clearApiCache('/grammar');
    return response.data;
  }
};

export const jlptN3Api = {
  getCourseOverview: async () => {
    return cachedGet(`${API_BASE_URL}/jlpt-n3/overview`, {}, 30000);
  },
  getLessonData: async (chapter, lesson) => {
    return cachedGet(`${API_BASE_URL}/jlpt-n3/chapter/${chapter}/lesson/${lesson}`, {}, 60000);
  },
  submitQuiz: async (chapter, lesson, quizCategory, score, total) => {
    const response = await axios.post(`${API_BASE_URL}/jlpt-n3/chapter/${chapter}/lesson/${lesson}/submit-quiz`, {
      quizCategory,
      score,
      total
    });
    clearApiCache('/jlpt-n3/overview');
    clearApiCache('/analytics/dashboard');
    return response.data;
  },
  getGrammarQuiz: async (chapter, lesson) => {
    return cachedGet(`${API_BASE_URL}/jlpt-n3/chapter/${chapter}/lesson/${lesson}/grammar-quiz`, {}, 60000);
  },
  regenerateGrammarQuiz: async (chapter, lesson) => {
    const response = await axios.post(`${API_BASE_URL}/jlpt-n3/chapter/${chapter}/lesson/${lesson}/grammar-quiz/regenerate`);
    clearApiCache('/jlpt-n3/chapter');
    return response.data;
  },
  importData: async () => {
    const response = await axios.post(`${API_BASE_URL}/jlpt-n3/import`);
    clearApiCache('/jlpt-n3');
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
      },
      timeout: 120000
    });
    clearApiCache('/jlpt-n3');
    clearApiCache('/vocab');
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
