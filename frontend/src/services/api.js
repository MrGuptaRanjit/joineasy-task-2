// Central API Client Configuration
const rawApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api';

// Normalize API URL to ensure no trailing slash
export const API_URL = rawApiUrl.replace(/\/+$/, '');

/**
 * Universal request handler with automatic JWT token attachment and error extraction
 */
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

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${API_URL}${cleanEndpoint}`;

  try {
    const res = await fetch(fullUrl, config);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      // If token expired / unauthorized, clear session and dispatch notification
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
      err.message = 'Unable to connect to backend server. Please verify network connection or server status.';
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
