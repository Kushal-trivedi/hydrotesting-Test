const BASE_URL = import.meta.env.VITE_API_URL || '';

async function authFetch(path, options = {}) {
  const url = `${BASE_URL}/api${path}`;
  const res = await fetch(url, {
    ...options,
    credentials: 'include', // Ensure cookies are sent
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}`;
    try {
      const err = await res.json();
      errorMsg = err.detail || err.message || errorMsg;
    } catch {
      // ignore
    }
    const error = new Error(errorMsg);
    error.status = res.status;
    throw error;
  }

  if (res.status === 204) return null;
  return res.json();
}

export const authApi = {
  signup: (data) => authFetch('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
  signin: (data) => authFetch('/auth/signin', { method: 'POST', body: JSON.stringify(data) }),
  signout: () => authFetch('/auth/signout', { method: 'POST' }),
  refresh: () => authFetch('/auth/refresh', { method: 'POST' }),
  getMe: () => authFetch('/auth/me'),
  forgotPassword: (email) => authFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (data) => authFetch('/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),
};
