// API base URL
export const API_URL = 'https://smart-library-backend-yibq.onrender.com/api';

// Session helpers (mirrors DB.setSession / getSession / clearSession)
export const setSession = (user) => {
  localStorage.setItem('sl_session', JSON.stringify(user));
};
export const getSession = () => {
  try {
    return JSON.parse(localStorage.getItem('sl_session'));
  } catch { return null; }
};
export const clearSession = () => {
  localStorage.removeItem('sl_session');
};
