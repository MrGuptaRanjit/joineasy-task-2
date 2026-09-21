const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export async function request(endpoint, options = {}) {
  const token = localStorage.getItem('nexus_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      // If token expired / unauthorized, trigger logout event if needed
      if (res.status === 401 && token) {
        localStorage.removeItem('nexus_token');
        localStorage.removeItem('nexus_user');
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
      const error = new Error(data.message || `Request failed with status ${res.status}`);
      error.status = res.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (!err.status) {
      err.message = 'Unable to connect to server. Please ensure the backend is running.';
    }
    throw err;
  }
}

export const api = {
  get: (url, options) => request(url, { ...options, method: 'GET' }),
  post: (url, body, options) => request(url, { ...options, method: 'POST', body }),
  put: (url, body, options) => request(url, { ...options, method: 'PUT', body }),
  delete: (url, options) => request(url, { ...options, method: 'DELETE' }),
};

export default api;
