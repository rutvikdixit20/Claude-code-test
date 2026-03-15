const BASE = '/api';

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  // Users
  getUsers: () => req('GET', '/users'),
  getUser: (id) => req('GET', `/users/${id}`),

  // Dashboard
  getDoctorDashboard: (id) => req('GET', `/dashboard/doctor/${id}`),
  getPatientDashboard: (id) => req('GET', `/dashboard/patient/${id}`),

  // Prescriptions
  getPrescriptions: (params) => req('GET', `/prescriptions?${new URLSearchParams(params)}`),
  createPrescription: (data) => req('POST', '/prescriptions', data),
  sendToPharmacy: (id, pharmacy_id) => req('POST', `/prescriptions/${id}/send-to-pharmacy`, { pharmacy_id }),
  requestRefill: (id) => req('POST', `/prescriptions/${id}/refill`),
  markFilled: (id) => req('PATCH', `/prescriptions/${id}/mark-filled`),

  // Refill Requests
  getRefillRequests: (doctor_id) => req('GET', `/refill-requests?doctor_id=${doctor_id}`),
  respondToRefill: (id, status) => req('PATCH', `/refill-requests/${id}`, { status }),

  // Diagnostics
  getDiagnostics: (params) => req('GET', `/diagnostics?${new URLSearchParams(params)}`),
  createDiagnostic: (data) => req('POST', '/diagnostics', data),
  uploadResults: (id, results) => req('PATCH', `/diagnostics/${id}/results`, { results }),
  generateSummary: (id) => req('POST', `/diagnostics/${id}/summarize`),

  // Pharmacies
  getPharmacies: () => req('GET', '/pharmacies'),

  // Messages
  getMessages: (user_id, other_id) => req('GET', `/messages?user_id=${user_id}&other_id=${other_id}`),
  sendMessage: (data) => req('POST', '/messages', data),
  getContacts: (userId) => req('GET', `/messages/contacts/${userId}`),

  // Patients
  getPatients: () => req('GET', '/patients'),

  // Appointments
  getAppointments: (params) => req('GET', `/appointments?${new URLSearchParams(params)}`),
};
