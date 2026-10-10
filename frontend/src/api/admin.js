const BASE_URL = import.meta.env.VITE_API_URL || '';

async function adminFetch(path, options = {}) {
  const url = `${BASE_URL}/api${path}`;
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
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

  return res.json();
}

export const adminApi = {
  getUsers: (status = '') => {
    const q = status ? `?status=${status}` : '';
    return adminFetch(`/admin/users${q}`);
  },

  createUser: (userData) =>
    adminFetch('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  approveUser: (userId, role, stationIds = []) =>
    adminFetch(`/admin/users/${userId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ role, station_ids: stationIds }),
    }),

  rejectUser: (userId, reason) =>
    adminFetch(`/admin/users/${userId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  updateUser: (userId, data) =>
    adminFetch(`/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getStations: () => adminFetch('/admin/stations'),

  createStation: (data) =>
    adminFetch('/admin/stations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateStation: (stationId, data) =>
    adminFetch(`/admin/stations/${stationId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getAuditLogs: (params = {}) => {
    const q = new URLSearchParams();
    if (params.action) q.append('action', params.action);
    if (params.userId) q.append('user_id', params.userId);
    if (params.targetType) q.append('target_type', params.targetType);
    if (params.limit) q.append('limit', params.limit);
    if (params.offset) q.append('offset', params.offset);
    const qs = q.toString();
    return adminFetch(`/audit-logs${qs ? `?${qs}` : ''}`);
  },
};
