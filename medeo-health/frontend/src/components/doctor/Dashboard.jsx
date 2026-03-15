import { useState, useEffect } from 'react';
import { useApp } from '../../App.jsx';
import { api } from '../../lib/api.js';

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StatusBadge({ status }) {
  const map = {
    active: ['badge-success', '● Active'],
    sent_to_pharmacy: ['badge-info', '→ Sent to Pharmacy'],
    ready_for_pickup: ['badge-warning', '🔔 Ready for Pickup'],
    filled: ['badge-neutral', '✓ Filled'],
    expired: ['badge-neutral', 'Expired'],
    scheduled: ['badge-primary', '📅 Scheduled'],
    in_queue: ['badge-warning', '⏱ In Queue'],
    completed: ['badge-success', '✓ Completed'],
  };
  const [cls, label] = map[status] || ['badge-neutral', status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export default function DoctorDashboard() {
  const { currentUser, setPage } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDoctorDashboard(currentUser.id)
      .then(setData)
      .finally(() => setLoading(false));
  }, [currentUser.id]);

  if (loading) return <div className="loading"><div className="spinner" /> Loading dashboard…</div>;
  if (!data) return null;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Good morning, {currentUser.name.split(' ')[1]} 👋</h1>
          <p className="page-subtitle">
            {new Date().toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setPage('prescriptions')}>
          + New Prescription
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-4 mb-6">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--primary-light)' }}>👥</div>
          <div className="stat-value">{data.activePatients}</div>
          <div className="stat-label">Active Patients</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setPage('refills')}>
          <div className="stat-icon" style={{ background: data.pendingRefills > 0 ? 'var(--warning-bg)' : 'var(--success-bg)' }}>🔄</div>
          <div className="stat-value" style={{ color: data.pendingRefills > 0 ? 'var(--warning)' : 'inherit' }}>
            {data.pendingRefills}
          </div>
          <div className="stat-label">Pending Refills</div>
          {data.pendingRefills > 0 && <span className="badge badge-warning">Needs attention</span>}
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setPage('diagnostics')}>
          <div className="stat-icon" style={{ background: 'var(--purple-bg)' }}>🔬</div>
          <div className="stat-value">{data.todayDiagnostics}</div>
          <div className="stat-label">Today's Diagnostics</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setPage('messages')}>
          <div className="stat-icon" style={{ background: data.unreadMessages > 0 ? 'var(--danger-bg)' : 'var(--surface-2)' }}>💬</div>
          <div className="stat-value">{data.unreadMessages}</div>
          <div className="stat-label">Unread Messages</div>
          {data.unreadMessages > 0 && <span className="badge badge-danger">Unread</span>}
        </div>
      </div>

      <div className="grid grid-2">
        {/* Upcoming Diagnostics */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">📅 Upcoming Diagnostics</div>
              <div className="card-subtitle">Scheduled & in-progress</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage('diagnostics')}>View all →</button>
          </div>
          {data.upcomingDiagnostics.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📅</div>
              <div className="empty-state-title">No upcoming diagnostics</div>
            </div>
          ) : (
            <div>
              {data.upcomingDiagnostics.map(d => (
                <div key={d.id} className="list-item">
                  <div className="avatar avatar-sm avatar-purple">
                    {d.patient_name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{d.type}</span>
                      <StatusBadge status={d.status} />
                    </div>
                    <div className="text-xs text-secondary mt-1">
                      {d.patient_name} · {d.facility}
                    </div>
                    <div className="text-xs text-muted">{formatDate(d.scheduled_at)}</div>
                  </div>
                  {d.queue_position > 0 && (
                    <div style={{ textAlign: 'right' }}>
                      <div className="text-xs font-semibold text-primary">#{d.queue_position}</div>
                      <div className="text-xs text-muted">in queue</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Prescriptions */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">💊 Recent Prescriptions</div>
              <div className="card-subtitle">Latest written</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage('prescriptions')}>View all →</button>
          </div>
          {data.recentActivity.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💊</div>
              <div className="empty-state-title">No prescriptions yet</div>
            </div>
          ) : (
            <div>
              {data.recentActivity.map(rx => (
                <div key={rx.id} className="list-item">
                  <div className="avatar avatar-sm avatar-green">
                    {rx.patient_name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{rx.medication}</span>
                      <span className="text-xs text-muted">{rx.dosage}</span>
                    </div>
                    <div className="text-xs text-secondary mt-1">{rx.patient_name} · {rx.frequency}</div>
                  </div>
                  <StatusBadge status={rx.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <div className="card-title">⚡ Quick Actions</div>
        </div>
        <div className="card-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => setPage('prescriptions')}>
            💊 Write Prescription
          </button>
          <button className="btn btn-secondary" onClick={() => setPage('diagnostics')}>
            🔬 Schedule Diagnostic
          </button>
          <button className="btn btn-secondary" onClick={() => setPage('refills')}>
            🔄 Review Refill Requests
          </button>
          <button className="btn btn-secondary" onClick={() => setPage('messages')}>
            💬 Message a Patient
          </button>
        </div>
      </div>
    </div>
  );
}
