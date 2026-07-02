import axios from 'axios';

const getApiBaseUrl = () => {
  const host = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
  return `http://${host}:8080/api/vocab`;
};

const API_BASE_URL = getApiBaseUrl();

export const vocabApi = {
  // Get overall stats
  getStats: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/stats`);
      return response.data;
    } catch (error) {
      console.error("Error fetching stats:", error);
      throw error;
    }
  },

  // Get paginated vocabulary for a specific level (Daily Mode)
  getByLevelPaginated: async (level, page = 0, size = 20) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/level/${level}?page=${page}&size=${size}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching paginated vocab for level ${level}:`, error);
      throw error;
    }
  },

  // Get random vocabulary for a specific level
  getRandomByLevel: async (level, count = 20) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/random?level=${level}&count=${count}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching random vocab for level ${level}:`, error);
      throw error;
    }
  },

  // Search vocabulary
  search: async (keyword, page = 0, size = 20) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/search?q=${encodeURIComponent(keyword)}&page=${page}&size=${size}`);
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
      // The endpoint is /api/import/excel, not /api/vocab/import/excel
      // API_BASE_URL is /api/vocab, so we need to construct it manually or change the controller route.
      // Let's use the explicit path relative to API_BASE_URL's host
      const baseUrl = API_BASE_URL.replace('/api/vocab', '/api/import');
      const response = await axios.post(`${baseUrl}/excel`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error importing excel:", error);
      throw error;
    }
  }
};
