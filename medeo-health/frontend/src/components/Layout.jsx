import './Layout.css';

const doctorNav = [
  { id: 'dashboard',     icon: '⊞',  label: 'Dashboard' },
  { id: 'prescriptions', icon: '💊',  label: 'Prescriptions' },
  { id: 'diagnostics',   icon: '🔬',  label: 'Diagnostics' },
  { id: 'refills',       icon: '🔄',  label: 'Refill Requests' },
  { id: 'messages',      icon: '💬',  label: 'Messages' },
];

const patientNav = [
  { id: 'dashboard',     icon: '⊞',  label: 'My Health' },
  { id: 'prescriptions', icon: '💊',  label: 'Prescriptions' },
  { id: 'queue',         icon: '📡',  label: 'My Queue' },
  { id: 'results',       icon: '📋',  label: 'Results' },
  { id: 'messages',      icon: '💬',  label: 'Messages' },
];

export default function Layout({
  currentUser, page, setPage,
  showRolePicker, setShowRolePicker,
  demoUsers, switchUser, isDoctor, children
}) {
  const nav = isDoctor ? doctorNav : patientNav;

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-mark">
            <span>🏥</span>
          </div>
          <div>
            <div className="logo-name">Medeo</div>
            <div className="logo-tagline">Health Platform</div>
          </div>
        </div>

        {/* Role Banner */}
        <div className={`role-banner role-banner-${isDoctor ? 'doctor' : 'patient'}`}>
          <span className="role-dot" />
          <span>{isDoctor ? 'Doctor View' : 'Patient View'}</span>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {nav.map(item => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? 'nav-item-active' : ''}`}
              onClick={() => setPage(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Demo User Switcher */}
        <div className="user-switcher">
          <button
            className="user-profile-btn"
            onClick={() => setShowRolePicker(!showRolePicker)}
          >
            <div className={`avatar avatar-md avatar-${isDoctor ? 'blue' : 'teal'}`}>
              {currentUser.initials}
            </div>
            <div className="user-info">
              <div className="user-name">{currentUser.name}</div>
              <div className="user-role">
                {isDoctor ? currentUser.specialty || 'Doctor' : 'Patient'}
              </div>
            </div>
            <span className="chevron">{showRolePicker ? '▲' : '▼'}</span>
          </button>

          {showRolePicker && (
            <div className="role-picker">
              <div className="role-picker-title">Switch Demo User</div>
              {demoUsers.map(user => (
                <button
                  key={user.id}
                  className={`role-picker-item ${currentUser.id === user.id ? 'role-picker-item-active' : ''}`}
                  onClick={() => switchUser(user)}
                >
                  <div className={`avatar avatar-sm avatar-${user.role === 'doctor' ? 'blue' : 'teal'}`}>
                    {user.initials}
                  </div>
                  <div>
                    <div className="picker-name">{user.name}</div>
                    <div className="picker-role">
                      {user.role === 'doctor' ? `🩺 ${user.specialty}` : '👤 Patient'}
                    </div>
                  </div>
                  {currentUser.id === user.id && <span className="picker-check">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <div className="content-area">
          {children}
        </div>
      </main>
    </div>
  );
}
