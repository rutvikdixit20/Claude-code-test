import { useState, useEffect } from 'react';
import { useApp } from '../../App.jsx';
import { api } from '../../lib/api.js';

export default function RefillRequests() {
  const { currentUser } = useApp();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(null);

  useEffect(() => {
    api.getRefillRequests(currentUser.id)
      .then(setRequests)
      .finally(() => setLoading(false));
  }, [currentUser.id]);

  const respond = async (id, status) => {
    setResponding(id);
    try {
      const updated = await api.respondToRefill(id, status);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, ...updated } : r));
    } finally {
      setResponding(null);
    }
  };

  const pending = requests.filter(r => r.status === 'pending');
  const resolved = requests.filter(r => r.status !== 'pending');

  const formatDate = (iso) => new Date(iso).toLocaleDateString('en-CA', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🔄 Refill Requests</h1>
          <p className="page-subtitle">
            {pending.length > 0
              ? `${pending.length} pending request${pending.length !== 1 ? 's' : ''} awaiting review`
              : 'All caught up'}
          </p>
        </div>
        {pending.length > 0 && (
          <span className="badge badge-warning" style={{ fontSize: '0.875rem', padding: '6px 14px' }}>
            {pending.length} Pending
          </span>
        )}
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /> Loading…</div>
      ) : (
        <>
          {/* Pending */}
          {pending.length === 0 ? (
            <div className="card mb-6">
              <div className="empty-state">
                <div className="empty-state-icon">✅</div>
                <div className="empty-state-title">No pending refill requests</div>
                <div className="empty-state-text">All requests have been reviewed.</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {pending.map(r => (
                <div key={r.id} className="card" style={{ borderLeft: '4px solid var(--warning)' }}>
                  <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div className={`avatar avatar-md avatar-amber`}>{r.patient_initials}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: '1rem', fontWeight: 700 }}>{r.medication}</span>
                        <span style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 500 }}>{r.dosage}</span>
                        <span className="badge badge-warning">Pending</span>
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>
                        <strong>{r.patient_name}</strong> · {r.frequency}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 2 }}>
                        Requested {formatDate(r.requested_at)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-danger btn-sm"
                        disabled={responding === r.id}
                        onClick={() => respond(r.id, 'denied')}
                      >
                        ✗ Deny
                      </button>
                      <button
                        className="btn btn-success btn-sm"
                        disabled={responding === r.id}
                        onClick={() => respond(r.id, 'approved')}
                      >
                        {responding === r.id ? '⏳' : '✓ Approve'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Resolved */}
          {resolved.length > 0 && (
            <>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                Resolved
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {resolved.map(r => (
                  <div key={r.id} className="card" style={{
                    borderLeft: `4px solid ${r.status === 'approved' ? 'var(--success)' : 'var(--danger)'}`,
                    opacity: 0.75
                  }}>
                    <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div className="avatar avatar-md avatar-green">{r.patient_initials}</div>
                      <div style={{ flex: 1 }}>
                        <div className="flex items-center gap-2">
                          <span style={{ fontWeight: 700 }}>{r.medication}</span>
                          <span style={{ fontSize: '0.8125rem', color: 'var(--text-2)' }}>{r.dosage}</span>
                          <span className={`badge ${r.status === 'approved' ? 'badge-success' : 'badge-danger'}`}>
                            {r.status === 'approved' ? '✓ Approved' : '✗ Denied'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-3)' }}>
                          {r.patient_name} · {formatDate(r.responded_at || r.requested_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
