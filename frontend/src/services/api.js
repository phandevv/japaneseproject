import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/vocab';

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
  }
};
