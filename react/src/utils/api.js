import axios from 'axios';
import { API_URL } from './auth';

const api = axios.create({ baseURL: API_URL });

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
};

export const booksAPI = {
  getAll: () => api.get('/books'),
  create: (data) => api.post('/books', data),
  update: (id, data) => api.put(`/books/${id}`, data),
  delete: (id) => api.delete(`/books/${id}`),
  getStats: () => api.get('/books/stats'),
};

export const usersAPI = {
  getAll: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

export const issuesAPI = {
  getAll: () => api.get('/issues'),
  issue: (data) => api.post('/issues', data),
  return: (id, data) => api.patch(`/issues/${id}/return`, data),
};

export const requestsAPI = {
  getAll: () => api.get('/requests'),
  create: (data) => api.post('/requests', data),
  approve: (id, data) => api.patch(`/requests/${id}/approve`, data),
  reject: (id, data) => api.patch(`/requests/${id}/reject`, data),
};

export const feedbackAPI = {
  getAll: () => api.get('/feedback'),
  create: (data) => api.post('/feedback', data),
};

export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
};

export const statsAPI = {
  get: () => api.get('/stats'),
};

export const notificationsAPI = {
  getByUser: (userId) => api.get(`/notifications/${userId}`),
  markRead: (notificationIds) => api.patch('/notifications/mark-read', { notificationIds }),
  create: (data) => api.post('/notifications', data),
};
