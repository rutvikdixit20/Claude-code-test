import { useState, useEffect } from 'react';
import { useApp } from '../../App.jsx';
import { api } from '../../lib/api.js';

const STATUS_CONFIG = {
  active:           { cls: 'badge-success', label: '● Active',           color: 'var(--success)' },
  sent_to_pharmacy: { cls: 'badge-info',    label: '→ Sent to Pharmacy', color: 'var(--info)' },
  ready_for_pickup: { cls: 'badge-warning', label: '🔔 Ready for Pickup', color: 'var(--warning)' },
  filled:           { cls: 'badge-neutral', label: '✓ Filled',           color: 'var(--text-3)' },
  expired:          { cls: 'badge-neutral', label: 'Expired',            color: 'var(--text-3)' },
};

function PharmacyModal({ prescription, onClose, onSent }) {
  const [pharmacies, setPharmacies] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.getPharmacies().then(p => { setPharmacies(p); setLoading(false); });
  }, []);

  const send = async () => {
    if (!selected) return;
    setSending(true);
    try {
      const updated = await api.sendToPharmacy(prescription.id, selected);
      onSent(updated);
      onClose();
    } finally {
      setSending(false);
    }
  };

  const renderStars = (rating) => '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div>
            <div className="modal-title">🏪 Send to Pharmacy</div>
            <div className="modal-subtitle">
              {prescription.medication} {prescription.dosage} — select your nearest pharmacy
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading"><div className="spinner" /> Finding nearby pharmacies…</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pharmacies.map(ph => (
                <button
                  key={ph.id}
                  onClick={() => setSelected(ph.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '16px 18px',
                    background: selected === ph.id ? 'var(--primary-light)' : 'var(--surface-2)',
                    border: `2px solid ${selected === ph.id ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-lg)',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'var(--transition)',
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 'var(--radius)', flexShrink: 0,
                    background: selected === ph.id ? 'var(--primary)' : 'var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem'
                  }}>
                    🏪
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: selected === ph.id ? 'var(--primary)' : 'var(--text)' }}>
                      {ph.name}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-2)', marginTop: 2 }}>{ph.address}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 2 }}>
                      {ph.hours} · {ph.phone}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      background: 'var(--primary-light)', color: 'var(--primary)',
                      border: '1px solid var(--primary-muted)', borderRadius: 999,
                      padding: '3px 10px', fontSize: '0.8125rem', fontWeight: 700
                    }}>
                      📍 {ph.distance_km} km
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: 4 }}>
                      {renderStars(ph.rating)} {ph.rating}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: 2 }}>
                      Est. ready in ~30 min
                    </div>
                  </div>
                  {selected === ph.id && (
                    <div style={{ color: 'var(--primary)', fontSize: '1.25rem', fontWeight: 700 }}>✓</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={!selected || sending}
            onClick={send}
          >
            {sending ? '⏳ Sending…' : '📤 Send Prescription'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PatientPrescriptions() {
  const { currentUser } = useApp();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingFor, setSendingFor] = useState(null);
  const [requestingRefill, setRequestingRefill] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    api.getPrescriptions({ patient_id: currentUser.id })
      .then(setPrescriptions)
      .finally(() => setLoading(false));
  }, [currentUser.id]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const onSent = (updated) => {
    setPrescriptions(prev => prev.map(rx => rx.id === updated.id ? { ...rx, ...updated } : rx));
    showToast('✓ Prescription sent! You\'ll be notified when it\'s ready for pickup.');
  };

  const handleRefill = async (rx) => {
    setRequestingRefill(rx.id);
    try {
      await api.requestRefill(rx.id);
      showToast('✓ Refill request sent to Dr. ' + rx.doctor_name.split(' ').slice(1).join(' ') + '!');
    } catch (e) {
      showToast('⚠️ ' + e.message);
    } finally {
      setRequestingRefill(null);
    }
  };

  const formatDate = (iso) => new Date(iso).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--text)', color: '#fff', padding: '12px 24px',
          borderRadius: 999, fontSize: '0.875rem', fontWeight: 500,
          boxShadow: 'var(--shadow-lg)', zIndex: 200, animation: 'slideUp 0.2s ease',
          whiteSpace: 'nowrap'
        }}>
          {toast}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">💊 My Prescriptions</h1>
          <p className="page-subtitle">Manage your medications and pharmacy requests</p>
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /> Loading your prescriptions…</div>
      ) : prescriptions.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">💊</div>
            <div className="empty-state-title">No prescriptions yet</div>
            <div className="empty-state-text">Your doctor's prescriptions will appear here.</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {prescriptions.map(rx => {
            const { cls, label } = STATUS_CONFIG[rx.status] || STATUS_CONFIG.active;
            const isReady = rx.status === 'ready_for_pickup';

            return (
              <div key={rx.id} className="rx-card" style={{
                borderLeft: isReady ? '4px solid var(--warning)' : '1px solid var(--border)',
                borderRadius: isReady ? 'var(--radius-lg)' : 'var(--radius-lg)',
                boxShadow: isReady ? '0 4px 20px rgba(217,119,6,0.12)' : 'var(--shadow)',
              }}>
                {isReady && (
                  <div style={{ background: 'var(--warning-bg)', borderRadius: 'var(--radius)', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className="animate-pulse">🔔</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--warning)' }}>
                      Your prescription is ready for pickup at {rx.pharmacy_name}!
                    </span>
                  </div>
                )}

                <div className="rx-card-header">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="rx-med-name">{rx.medication}</div>
                      <div className="rx-dosage">{rx.dosage}</div>
                    </div>
                    <div className="rx-frequency" style={{ marginTop: 4 }}>
                      {rx.frequency} · {rx.duration}
                    </div>
                  </div>
                  <span className={`badge ${cls}`}>{label}</span>
                </div>

                {rx.instructions && (
                  <div className="rx-instructions">{rx.instructions}</div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-2)', display: 'flex', gap: 16 }}>
                    <span>👨‍⚕️ {rx.doctor_name}</span>
                    <span>📅 {formatDate(rx.created_at)}</span>
                    {rx.refills_remaining > 0 && (
                      <span>🔄 {rx.refills_remaining} refill{rx.refills_remaining !== 1 ? 's' : ''} left</span>
                    )}
                    {rx.pharmacy_name && (
                      <span>🏪 {rx.pharmacy_name}</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    {rx.status === 'active' && (
                      <button className="btn btn-primary btn-sm" onClick={() => setSendingFor(rx)}>
                        📤 Send to Pharmacy
                      </button>
                    )}
                    {rx.status === 'filled' && rx.refills_remaining > 0 && (
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={requestingRefill === rx.id}
                        onClick={() => handleRefill(rx)}
                      >
                        {requestingRefill === rx.id ? '⏳ Requesting…' : '🔄 Request Refill'}
                      </button>
                    )}
                    {rx.status === 'ready_for_pickup' && (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={async () => {
                          await api.markFilled(rx.id);
                          setPrescriptions(prev => prev.map(r => r.id === rx.id ? { ...r, status: 'filled' } : r));
                        }}
                      >
                        ✓ Mark as Picked Up
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {sendingFor && (
        <PharmacyModal
          prescription={sendingFor}
          onClose={() => setSendingFor(null)}
          onSent={onSent}
        />
      )}
    </div>
  );
}
