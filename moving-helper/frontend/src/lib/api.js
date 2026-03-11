const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export const api = {
  getMoves: () => request('/moves'),
  createMove: (data) => request('/moves', { method: 'POST', body: JSON.stringify(data) }),
  deleteMove: (id) => request(`/moves/${id}`, { method: 'DELETE' }),

  getTasks: (moveId) => request(`/moves/${moveId}/tasks`),
  createTask: (moveId, data) =>
    request(`/moves/${moveId}/tasks`, { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (taskId, data) =>
    request(`/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTask: (taskId) => request(`/tasks/${taskId}`, { method: 'DELETE' }),
};
