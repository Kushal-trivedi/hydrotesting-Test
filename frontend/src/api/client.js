const BASE_URL = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
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
      // fallback
    }
    throw new Error(errorMsg);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // Sites
  getSites: () => request('/sites'),
  createSite: (data) => request('/sites', { method: 'POST', body: JSON.stringify(data) }),

  // Dashboard
  getDashboard: (siteId) => {
    const q = siteId ? `?site_id=${siteId}` : '';
    return request(`/dashboard${q}`);
  },

  // Assets
  getAssets: (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '' && val !== 'ALL') {
        searchParams.append(key, val);
      }
    });
    const qs = searchParams.toString();
    return request(`/assets${qs ? `?${qs}` : ''}`);
  },

  getAssetDetail: (id) => request(`/assets/${id}`),

  createAsset: (data) => request('/assets', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  updateAsset: (id, data) => request(`/assets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  deleteAsset: (id) => request(`/assets/${id}`, { method: 'DELETE' }),

  // Hydrotests
  recordHydrotest: (data) => request('/hydrotests', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  verifyCertificate: (hydrotestId) => request(`/hydrotests/${hydrotestId}/verify`, {
    method: 'POST',
  }),

  uploadDocument: async (hydrotestId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE_URL}/api/hydrotests/${hydrotestId}/upload-document`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  getDocumentUrl: (hydrotestId) => `${BASE_URL}/api/hydrotests/${hydrotestId}/document`,

  // Vehicles
  lookupVehicle: (vehicleNumber) => request('/vehicles/lookup', {
    method: 'POST',
    body: JSON.stringify({ vehicle_number: vehicleNumber }),
  }),

  linkVehicleToAsset: (assetId, vehicleNumber) => request(`/vehicles/link-to-asset/${assetId}`, {
    method: 'POST',
    body: JSON.stringify({ vehicle_number: vehicleNumber }),
  }),
};
