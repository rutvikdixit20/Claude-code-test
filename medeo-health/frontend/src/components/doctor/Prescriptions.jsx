import { useState, useEffect } from 'react';
import { useApp } from '../../App.jsx';
import { api } from '../../lib/api.js';

const COMMON_MEDS = [
  'Metformin', 'Atorvastatin', 'Lisinopril', 'Amoxicillin', 'Omeprazole',
  'Levothyroxine', 'Amlodipine', 'Albuterol Inhaler', 'Sertraline', 'Gabapentin'
];

const STATUS_CONFIG = {
  active:            { cls: 'badge-success', label: '● Active' },
  sent_to_pharmacy:  { cls: 'badge-info',    label: '→ Sent to Pharmacy' },
  ready_for_pickup:  { cls: 'badge-warning', label: '🔔 Ready for Pickup' },
  filled:            { cls: 'badge-neutral', label: '✓ Filled' },
  expired:           { cls: 'badge-neutral', label: 'Expired' },
};

function StatusBadge({ status }) {
  const { cls, label } = STATUS_CONFIG[status] || { cls: 'badge-neutral', label: status };
  return <span className={`badge ${cls}`}>{label}</span>;
}

function NewRxModal({ patients, doctorId, onClose, onCreated }) {
  const [form, setForm] = useState({
    patient_id: patients[0]?.id || '',
    medication: '',
    dosage: '',
    frequency: '',
    duration: '30 days',
    instructions: '',
    refills_total: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.medication || !form.dosage || !form.frequency) {
      setError('Please fill in all required fields.');
      return;
    }
    setLoading(true);
    try {
      const rx = await api.createPrescription({ ...form, doctor_id: doctorId });
      onCreated(rx);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div>
            <div className="modal-title">✍️ Write Prescription</div>
            <div className="modal-subtitle">Create a new prescription for your patient</div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={submit}>
          <div className="modal-body">
            {error && (
              <div style={{ padding: '10px 14px', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius)', fontSize: '0.875rem', color: 'var(--danger)' }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Patient *</label>
              <select className="form-select" value={form.patient_id} onChange={e => set('patient_id', e.target.value)}>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label">Medication *</label>
                <input
                  className="form-input"
                  list="med-list"
                  placeholder="e.g. Metformin"
                  value={form.medication}
                  onChange={e => set('medication', e.target.value)}
                />
                <datalist id="med-list">
                  {COMMON_MEDS.map(m => <option key={m} value={m} />)}
                </datalist>
              </div>
              <div className="form-group">
                <label className="form-label">Dosage *</label>
                <input className="form-input" placeholder="e.g. 500mg" value={form.dosage} onChange={e => set('dosage', e.target.value)} />
              </div>
            </div>

            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label">Frequency *</label>
                <select className="form-select" value={form.frequency} onChange={e => set('frequency', e.target.value)}>
                  <option value="">Select frequency</option>
                  <option>Once daily</option>
                  <option>Twice daily</option>
                  <option>Three times daily</option>
                  <option>Four times daily</option>
                  <option>Once daily at bedtime</option>
                  <option>As needed</option>
                  <option>Once weekly</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Duration</label>
                <select className="form-select" value={form.duration} onChange={e => set('duration', e.target.value)}>
                  <option>7 days</option>
                  <option>10 days</option>
                  <option>14 days</option>
                  <option>30 days</option>
                  <option>60 days</option>
                  <option>90 days</option>
                  <option>Until further notice</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Special Instructions</label>
              <textarea
                className="form-textarea"
                placeholder="e.g. Take with food. Avoid grapefruit juice."
                value={form.instructions}
                onChange={e => set('instructions', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Refills Authorized</label>
              <input
                className="form-input"
                type="number"
                min="0"
                max="12"
                value={form.refills_total}
                onChange={e => set('refills_total', parseInt(e.target.value) || 0)}
                style={{ maxWidth: 100 }}
              />
              <span className="form-hint">Patient can request refills up to this many times.</span>
            </div>

            {/* Preview */}
            {form.medication && (
              <div style={{ background: 'var(--primary-light)', border: '1px solid var(--primary-muted)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Prescription Preview</div>
                <div style={{ fontSize: '1rem', fontWeight: 700 }}>{form.medication} {form.dosage}</div>
                {form.frequency && <div style={{ fontSize: '0.875rem', color: 'var(--text-2)', marginTop: 2 }}>{form.frequency} · {form.duration}</div>}
                {form.instructions && <div style={{ fontSize: '0.8125rem', color: 'var(--text-2)', marginTop: 6 }}>{form.instructions}</div>}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '⏳ Sending…' : '✓ Issue Prescription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DoctorPrescriptions() {
  const { currentUser } = useApp();
  const [prescriptions, setPrescriptions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    Promise.all([
      api.getPrescriptions({ doctor_id: currentUser.id }),
      api.getPatients()
    ]).then(([rxs, pts]) => {
      setPrescriptions(rxs);
      setPatients(pts);
    }).finally(() => setLoading(false));
  }, [currentUser.id]);

  const filtered = filter === 'all' ? prescriptions : prescriptions.filter(rx => rx.status === filter);

  const formatDate = (iso) => new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">💊 Prescriptions</h1>
          <p className="page-subtitle">{prescriptions.length} prescription{prescriptions.length !== 1 ? 's' : ''} issued</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Write Prescription</button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {[
          ['all', 'All'],
          ['active', '● Active'],
          ['sent_to_pharmacy', 'Sent'],
          ['ready_for_pickup', '🔔 Ready'],
          ['filled', 'Filled'],
        ].map(([val, label]) => (
          <button
            key={val}
            className={`btn btn-sm ${filter === val ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(val)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /> Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">💊</div>
            <div className="empty-state-title">No prescriptions found</div>
            <div className="empty-state-text">Write a prescription to get started.</div>
            <button className="btn btn-primary mt-2" onClick={() => setShowModal(true)}>+ Write Prescription</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map(rx => (
            <div key={rx.id} className="rx-card">
              <div className="rx-card-header">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="rx-med-name">{rx.medication}</div>
                    <div className="rx-dosage">{rx.dosage}</div>
                    <StatusBadge status={rx.status} />
                  </div>
                  <div className="rx-frequency" style={{ marginTop: 4 }}>{rx.frequency} · {rx.duration}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{rx.patient_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{formatDate(rx.created_at)}</div>
                </div>
              </div>

              {rx.instructions && (
                <div className="rx-instructions">{rx.instructions}</div>
              )}

              <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
                {rx.pharmacy_name && (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>🏪</span>
                    <span>{rx.pharmacy_name}</span>
                    {rx.status === 'ready_for_pickup' && (
                      <span className="animate-pulse" style={{ color: 'var(--warning)', fontWeight: 700 }}>● READY</span>
                    )}
                  </div>
                )}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                  {rx.refills_remaining > 0 && (
                    <span className="badge badge-neutral">
                      {rx.refills_remaining} refill{rx.refills_remaining !== 1 ? 's' : ''} left
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <NewRxModal
          patients={patients}
          doctorId={currentUser.id}
          onClose={() => setShowModal(false)}
          onCreated={rx => setPrescriptions(prev => [rx, ...prev])}
        />
      )}
    </div>
  );
}
