import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (email, password) =>
    api.post('/users/register', { email, password }),

  login: (email, password) =>
    api.post('/users/login', { email, password }),
};

// Event APIs
export const eventAPI = {
  createEvent: (eventData) =>
    api.post('/events', eventData),

  getMyEvents: () =>
    api.get('/events'),

  getEventById: (eventId) =>
    api.get(`/events/${eventId}`),

  getEventByQRCode: (qrCode) =>
    api.get(`/events/qr/${qrCode}`),

  updateEvent: (eventId, updates) =>
    api.put(`/events/${eventId}`, updates),

  deleteEvent: (eventId) =>
    api.delete(`/events/${eventId}`),

  getPublicEvent: (code) =>
    api.get(`/events/public/${code}`),

  getEventByQRCode: (qrCode) => 
    api.get(`/events/qr/${qrCode}`),

};

export const mediaAPI = {
  uploadGuestMedia: (formData) =>
    api.post("/media/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
};




export default api;