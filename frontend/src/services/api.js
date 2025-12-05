import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);


// Auth APIs
export const authAPI = {
  register: (email, password) => api.post('/users/register', { email, password }),
  login: (email, password) => api.post('/users/login', { email, password }),
};


// Event APIs
export const eventAPI = {
  createEvent: (eventData) => api.post('/events', eventData),
  getMyEvents: () => api.get('/events'),
  getEventById: (eventId) => api.get(`/events/${encodeURIComponent(eventId)}`),
  getEventByQRCode: (qrCode) => api.get(`/events/qr/${encodeURIComponent(qrCode)}`),
  updateEvent: (eventId, updates) => api.put(`/events/${encodeURIComponent(eventId)}`, updates),
  deleteEvent: (eventId) => api.delete(`/events/${encodeURIComponent(eventId)}`),
  getPublicEvent: (code) => api.get(`/events/public/${encodeURIComponent(code)}`),
  getEventMedia: (eventId, { limit = 24, offset = 0 } = {}) =>
    api.get(`/events/${encodeURIComponent(eventId)}/media?limit=${limit}&offset=${offset}`),
};


// Media APIs
export const mediaAPI = {
  uploadGuestMedia: async (formData) => {
    try {
      return await api.post('/media/guest', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    } catch (err) {
      return api.post('/media/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    }
  },

  getMediaByEvent: async (eventId, { limit = 24, offset = 0 } = {}) => {
    const qs = `?limit=${limit}&offset=${offset}`;
    try {
      return await api.get(`/events/${encodeURIComponent(eventId)}/media${qs}`);
    } catch (err) {
      return api.get(`/media/${encodeURIComponent(eventId)}${qs}`);
    }
  },

  deleteMedia: (photoId) => {
    if (!photoId) return Promise.reject(new Error('photoId is required'));
    return api.delete(`/media/${encodeURIComponent(photoId)}`);
  },

  downloadMediaZip: (eventId) => {
    if (!eventId) return Promise.reject(new Error('eventId is required'));
    return api.get(`/media/${encodeURIComponent(eventId)}/zip`, { responseType: 'blob' });
  },
};

export default api;
