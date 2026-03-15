import { useState, useEffect } from 'react';
import { useApp } from '../../App.jsx';
import { api } from '../../lib/api.js';

function QueueMiniCard({ diag, onViewQueue }) {
  const pct = diag.queue_position
    ? Math.round(((diag.queue_total - diag.queue_position) / diag.queue_total) * 100)
    : 0;
  const isNext = diag.queue_position === 1;

  return (
    <div style={{
      background: isNext ? 'var(--warning-bg)' : 'var(--surface)',
      border: `1px solid ${isNext ? 'var(--warning-border)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-lg)',
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      transition: 'var(--transition)',
      boxShadow: 'var(--shadow)',
    }}>
      <div className="flex items-center justify-between">
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {diag.status === 'in_queue' ? 'In Queue' : 'Scheduled'}
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: 2 }}>{diag.type}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-2)' }}>{diag.facility}</div>
        </div>
        {isNext && (
          <div style={{ textAlign: 'right' }}>
            <div className="badge badge-warning animate-pulse" style={{ fontSize: '0.8125rem', padding: '6px 12px' }}>
              🔔 You're Next!
            </div>
          </div>
        )}
        {!isNext && diag.queue_position && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>
              #{diag.queue_position}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>of {diag.queue_total}</div>
          </div>
        )}
      </div>

      {diag.queue_position && (
        <>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${pct}%`, background: isNext ? 'var(--warning)' : 'var(--primary)' }} />
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-2)', display: 'flex', justifyContent: 'space-between' }}>
            <span>{diag.queue_total - diag.queue_position} patients ahead finished</span>
            <span style={{ fontWeight: 600, color: isNext ? 'var(--warning)' : 'var(--primary)' }}>
              {isNext ? 'Head in now!' : `Est. ~${diag.queue_position * 15} min`}
            </span>
          </div>
        </>
      )}

      <button className="btn btn-secondary btn-sm" onClick={onViewQueue} style={{ alignSelf: 'flex-start' }}>
        View Full Queue →
      </button>
    </div>
  );
}

export default function PatientDashboard() {
  const { currentUser, setPage } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => api.getPatientDashboard(currentUser.id).then(setData).finally(() => setLoading(false));

  useEffect(() => { load(); }, [currentUser.id]);

  // Auto-refresh for queue
  useEffect(() => {
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, [currentUser.id]);

  if (loading) return <div className="loading"><div className="spinner" /> Loading your health dashboard…</div>;
  if (!data) return null;

  const formatDate = (iso) => new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const STATUS_MAP = {
    active: ['badge-success', '● Active'],
    sent_to_pharmacy: ['badge-info', '→ Sent'],
    ready_for_pickup: ['badge-warning', '🔔 Ready!'],
    filled: ['badge-neutral', '✓ Filled'],
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Hello, {currentUser.name.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">Here's your health summary for today.</p>
        </div>
        <button className="btn btn-secondary" onClick={() => setPage('messages')}>
          💬 Message My Doctor
          {data.unreadMessages > 0 && <span className="notif-dot">{data.unreadMessages}</span>}
        </button>
      </div>

      {/* Alert: Prescription Ready */}
      {data.recentPrescriptions.some(r => r.status === 'ready_for_pickup') && (
        <div style={{
          background: 'var(--warning-bg)', border: '1px solid var(--warning-border)',
          borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 12
        }}>
          <span style={{ fontSize: '1.5rem' }}>🔔</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: 'var(--warning)' }}>Prescription Ready for Pickup</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-2)', marginTop: 2 }}>
              {data.recentPrescriptions.filter(r => r.status === 'ready_for_pickup').map(r => r.medication).join(', ')} is ready at the pharmacy.
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage('prescriptions')}>View →</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-3 mb-6">
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setPage('prescriptions')}>
          <div className="stat-icon" style={{ background: 'var(--primary-light)' }}>💊</div>
          <div className="stat-value">{data.activePrescriptions}</div>
          <div className="stat-label">Active Prescriptions</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setPage('queue')}>
          <div className="stat-icon" style={{ background: 'var(--warning-bg)' }}>📡</div>
          <div className="stat-value">{data.upcomingDiagnostics.length}</div>
          <div className="stat-label">Upcoming Diagnostics</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setPage('results')}>
          <div className="stat-icon" style={{ background: data.unreadResults > 0 ? 'var(--danger-bg)' : 'var(--success-bg)' }}>📋</div>
          <div className="stat-value">{data.unreadResults}</div>
          <div className="stat-label">Results Available</div>
          {data.unreadResults > 0 && <span className="badge badge-danger">New</span>}
        </div>
      </div>

      {/* Queue Cards */}
      {data.upcomingDiagnostics.filter(d => d.status === 'in_queue').length > 0 && (
        <div className="mb-6">
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Live Queue
          </div>
          <div className="grid-2 grid">
            {data.upcomingDiagnostics.filter(d => d.status === 'in_queue').map(d => (
              <QueueMiniCard key={d.id} diag={d} onViewQueue={() => setPage('queue')} />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-2">
        {/* Upcoming Appointments */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📅 Upcoming Appointments</div>
          </div>
          {data.upcomingAppointments.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 24px' }}>
              <div className="empty-state-icon">📅</div>
              <div className="empty-state-title">No upcoming appointments</div>
            </div>
          ) : (
            <div>
              {data.upcomingAppointments.map(a => (
                <div key={a.id} className="list-item">
                  <div style={{
                    width: 40, height: 40, borderRadius: 'var(--radius)', background: 'var(--primary-light)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase' }}>
                      {new Date(a.scheduled_at).toLocaleDateString('en-CA', { month: 'short' })}
                    </span>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>
                      {new Date(a.scheduled_at).getDate()}
                    </span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{a.type}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-2)' }}>
                      {a.doctor_name} · {a.specialty}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                      {new Date(a.scheduled_at).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <span className="badge badge-primary">Upcoming</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Prescriptions */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">💊 My Prescriptions</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage('prescriptions')}>View all →</button>
          </div>
          <div>
            {data.recentPrescriptions.map(rx => {
              const [cls, label] = STATUS_MAP[rx.status] || ['badge-neutral', rx.status];
              return (
                <div key={rx.id} className="list-item">
                  <div style={{ width: 36, height: 36, borderRadius: 'var(--radius)', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.125rem', flexShrink: 0 }}>
                    💊
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{rx.medication} <span style={{ color: 'var(--primary)', fontWeight: 500 }}>{rx.dosage}</span></div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>{rx.frequency}</div>
                  </div>
                  <span className={`badge ${cls}`}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
