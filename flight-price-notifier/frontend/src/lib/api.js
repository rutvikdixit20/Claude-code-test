const BASE = '/api';

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export const api = {
  getTrips: () => req('/trips'),
  createTrip: (data) => req('/trips', { method: 'POST', body: JSON.stringify(data) }),
  deleteTrip: (id) => req(`/trips/${id}`, { method: 'DELETE' }),
  toggleTrip: (id, active) => req(`/trips/${id}`, { method: 'PATCH', body: JSON.stringify({ active }) }),
  checkTrip: (id) => req(`/trips/${id}/check`, { method: 'POST' }),
  getHistory: (id) => req(`/trips/${id}/history`),
  getRebooks: (id) => req(`/trips/${id}/rebooks`),
  getLogs: (id) => req(`/trips/${id}/logs`),
  getAllLogs: () => req('/logs'),
  getStats: () => req('/stats'),
  searchFlights: (data) => req('/search', { method: 'POST', body: JSON.stringify(data) }),
};
