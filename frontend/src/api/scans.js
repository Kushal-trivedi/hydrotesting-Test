const BASE_URL = import.meta.env.VITE_API_URL || '';

async function scanFetch(path, options = {}) {
  const url = `${BASE_URL}/api${path}`;
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.isFormData ? {} : { 'Content-Type': 'application/json' }),
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

export const scansApi = {
  uploadMedia: async (file, stationId = null) => {
    const formData = new FormData();
    formData.append('file', file);
    if (stationId) {
      formData.append('station_id', stationId);
    }
    return scanFetch('/scans', {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
  },

  confirmPlate: (scanId, confirmedPlate) =>
    scanFetch(`/scans/${scanId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ confirmed_plate: confirmedPlate }),
    }),

  manualCheck: (plate, stationId = null) =>
    scanFetch('/scans/manual', {
      method: 'POST',
      body: JSON.stringify({ plate, station_id: stationId }),
    }),

  getScans: (params = {}) => {
    const q = new URLSearchParams();
    if (params.result) q.append('result_filter', params.result);
    if (params.stationId) q.append('station_id', params.stationId);
    if (params.limit) q.append('limit', params.limit);
    if (params.offset) q.append('offset', params.offset);
    const qs = q.toString();
    return scanFetch(`/scans${qs ? `?${qs}` : ''}`);
  },

  getScanDetail: (scanId) => scanFetch(`/scans/${scanId}`),

  getFrameUrl: (scanId) => `${BASE_URL}/api/scans/${scanId}/frame`,
};
