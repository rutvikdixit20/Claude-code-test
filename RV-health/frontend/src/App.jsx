import { useState, createContext, useContext, useEffect } from 'react';
import Layout from './components/Layout.jsx';
import DoctorDashboard from './components/doctor/Dashboard.jsx';
import DoctorPrescriptions from './components/doctor/Prescriptions.jsx';
import DoctorDiagnostics from './components/doctor/Diagnostics.jsx';
import RefillRequests from './components/doctor/RefillRequests.jsx';
import PatientDashboard from './components/patient/Dashboard.jsx';
import PatientPrescriptions from './components/patient/Prescriptions.jsx';
import PatientQueue from './components/patient/Queue.jsx';
import PatientResults from './components/patient/Results.jsx';
import Messages from './components/Messages.jsx';
import { api } from './lib/api.js';

export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

// Demo users
const DEMO_USERS = [
  { id: 1, name: 'Dr. Sarah Mitchell', role: 'doctor', specialty: 'Family Medicine', initials: 'SM' },
  { id: 3, name: 'Emma Rodriguez', role: 'patient', initials: 'ER' },
  { id: 4, name: 'Michael Chen', role: 'patient', initials: 'MC' },
];

export default function App() {
  const [currentUser, setCurrentUser] = useState(DEMO_USERS[0]);
  const [page, setPage] = useState('dashboard');
  const [showRolePicker, setShowRolePicker] = useState(false);

  // Reset page when switching users
  const switchUser = (user) => {
    setCurrentUser(user);
    setPage('dashboard');
    setShowRolePicker(false);
  };

  const isDoctor = currentUser.role === 'doctor';

  return (
    <AppContext.Provider value={{ currentUser, setPage, page }}>
      <Layout
        currentUser={currentUser}
        page={page}
        setPage={setPage}
        showRolePicker={showRolePicker}
        setShowRolePicker={setShowRolePicker}
        demoUsers={DEMO_USERS}
        switchUser={switchUser}
        isDoctor={isDoctor}
      >
        {isDoctor ? (
          <>
            {page === 'dashboard'     && <DoctorDashboard />}
            {page === 'prescriptions' && <DoctorPrescriptions />}
            {page === 'diagnostics'   && <DoctorDiagnostics />}
            {page === 'refills'       && <RefillRequests />}
            {page === 'messages'      && <Messages />}
          </>
        ) : (
          <>
            {page === 'dashboard'     && <PatientDashboard />}
            {page === 'prescriptions' && <PatientPrescriptions />}
            {page === 'queue'         && <PatientQueue />}
            {page === 'results'       && <PatientResults />}
            {page === 'messages'      && <Messages />}
          </>
        )}
      </Layout>
    </AppContext.Provider>
  );
}
