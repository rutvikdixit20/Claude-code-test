import { useState, useEffect } from 'react';
import { useApp } from '../../App.jsx';
import { api } from '../../lib/api.js';

const DIAGNOSTIC_TYPES = ['MRI Scan', 'CT Scan', 'Blood Work', 'X-Ray', 'Ultrasound', 'ECG', 'Mammography', 'PET Scan'];
const FACILITIES = [
  'Toronto General Imaging', 'Sunnybrook Radiology', 'LifeLabs – King St',
  'Mount Sinai Diagnostics', 'St. Michael\'s Imaging', 'Women\'s College Imaging'
];

const STATUS_CONFIG = {
  scheduled:   { cls: 'badge-primary', label: '📅 Scheduled', icon: '📅' },
  in_queue:    { cls: 'badge-warning', label: '⏱ In Queue', icon: '⏱' },
  in_progress: { cls: 'badge-info',   label: '⚡ In Progress', icon: '⚡' },
  completed:   { cls: 'badge-success', label: '✓ Completed', icon: '✓' },
  cancelled:   { cls: 'badge-neutral', label: 'Cancelled', icon: '✗' },
};

function ScheduleModal({ patients, doctorId, onClose, onCreated }) {
  const [form, setForm] = useState({
    patient_id: patients[0]?.id || '',
    type: 'MRI Scan',
    facility: FACILITIES[0],
    scheduled_at: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.scheduled_at) return;
    setLoading(true);
    try {
      const d = await api.createDiagnostic({ ...form, doctor_id: doctorId });
      onCreated(d);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <div className="modal-title">🔬 Schedule Diagnostic</div>
            <div className="modal-subtitle">The patient will be notified immediately</div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Patient</label>
              <select className="form-select" value={form.patient_id} onChange={e => set('patient_id', e.target.value)}>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label">Diagnostic Type</label>
                <select className="form-select" value={form.type} onChange={e => set('type', e.target.value)}>
                  {DIAGNOSTIC_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Facility</label>
                <select className="form-select" value={form.facility} onChange={e => set('facility', e.target.value)}>
                  {FACILITIES.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Date & Time</label>
              <input
                className="form-input"
                type="datetime-local"
                value={form.scheduled_at}
                onChange={e => set('scheduled_at', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Clinical Notes</label>
              <textarea
                className="form-textarea"
                placeholder="e.g. Brain MRI without contrast. Rule out lesions."
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '⏳ Scheduling…' : '✓ Schedule Diagnostic'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResultsModal({ diagnostic, onClose, onSaved }) {
  const [results, setResults] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!results.trim()) return;
    setLoading(true);
    try {
      const d = await api.uploadResults(diagnostic.id, results);
      onSaved(d);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <div className="modal-title">📋 Upload Results</div>
            <div className="modal-subtitle">{diagnostic.type} · {diagnostic.patient_name}</div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Results / Findings</label>
              <textarea
                className="form-textarea"
                style={{ minHeight: 120 }}
                placeholder="Enter lab values, imaging findings, or clinical results…"
                value={results}
                onChange={e => setResults(e.target.value)}
                required
              />
              <span className="form-hint">An AI plain-English summary will be automatically generated for the patient.</span>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-success" disabled={loading || !results.trim()}>
              {loading ? '⏳ Uploading…' : '✓ Upload & Notify Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function QueueDots({ position, total }) {
  if (!position || !total) return null;
  return (
    <div className="queue-visual" style={{ marginTop: 8 }}>
      {Array.from({ length: total }, (_, i) => {
        const pos = i + 1;
        if (pos < position) return <div key={i} className="queue-dot queue-dot-done">✓</div>;
        if (pos === position) return <div key={i} className="queue-dot queue-dot-you">YOU</div>;
        return <div key={i} className="queue-dot queue-dot-ahead">{pos}</div>;
      })}
    </div>
  );
}

export default function DoctorDiagnostics() {
  const { currentUser } = useApp();
  const [diagnostics, setDiagnostics] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSchedule, setShowSchedule] = useState(false);
  const [resultsFor, setResultsFor] = useState(null);

  useEffect(() => {
    Promise.all([
      api.getDiagnostics({ doctor_id: currentUser.id }),
      api.getPatients()
    ]).then(([diags, pts]) => {
      setDiagnostics(diags);
      setPatients(pts);
    }).finally(() => setLoading(false));
  }, [currentUser.id]);

  // Live queue refresh
  useEffect(() => {
    const interval = setInterval(async () => {
      const diags = await api.getDiagnostics({ doctor_id: currentUser.id });
      setDiagnostics(diags);
    }, 15000);
    return () => clearInterval(interval);
  }, [currentUser.id]);

  const formatDateTime = (iso) => new Date(iso).toLocaleString('en-CA', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const update = (updated) => setDiagnostics(prev => prev.map(d => d.id === updated.id ? updated : d));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🔬 Diagnostics</h1>
          <p className="page-subtitle">Manage imaging, labs, and diagnostic procedures</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowSchedule(true)}>+ Schedule Diagnostic</button>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /> Loading…</div>
      ) : diagnostics.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🔬</div>
            <div className="empty-state-title">No diagnostics scheduled</div>
            <button className="btn btn-primary mt-2" onClick={() => setShowSchedule(true)}>+ Schedule Diagnostic</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {diagnostics.map(d => {
            const { cls, label } = STATUS_CONFIG[d.status] || STATUS_CONFIG.scheduled;
            return (
              <div key={d.id} className="card">
                <div className="card-body">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div style={{
                          width: 44, height: 44, borderRadius: 'var(--radius)', background: 'var(--purple-bg)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0
                        }}>🔬</div>
                        <div>
                          <div style={{ fontSize: '1.0625rem', fontWeight: 700 }}>{d.type}</div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--text-2)' }}>{d.facility}</div>
                        </div>
                        <span className={`badge ${cls}`}>{label}</span>
                      </div>

                      <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Patient</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 600, marginTop: 2 }}>{d.patient_name}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Scheduled</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 600, marginTop: 2 }}>{formatDateTime(d.scheduled_at)}</div>
                        </div>
                        {d.queue_position > 0 && (
                          <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Queue Position</div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--warning)', marginTop: 2 }}>
                              #{d.queue_position} of {d.queue_total}
                            </div>
                          </div>
                        )}
                      </div>

                      {d.status === 'in_queue' && (
                        <QueueDots position={d.queue_position} total={d.queue_total} />
                      )}

                      {d.notes && (
                        <div className="rx-instructions" style={{ marginTop: 12 }}>
                          <span style={{ fontWeight: 600 }}>Clinical notes: </span>{d.notes}
                        </div>
                      )}

                      {d.results && (
                        <div style={{ marginTop: 12, background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Results Uploaded</div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--text-2)' }}>{d.results}</div>
                          {d.ai_summary && (
                            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--success-border)' }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', marginBottom: 4 }}>✨ Patient Summary (AI Generated)</div>
                              <div style={{ fontSize: '0.8125rem', color: 'var(--text-2)', fontStyle: 'italic' }}>{d.ai_summary}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                      {d.status !== 'completed' && !d.results && (
                        <button className="btn btn-secondary btn-sm" onClick={() => setResultsFor(d)}>
                          📋 Upload Results
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showSchedule && (
        <ScheduleModal
          patients={patients}
          doctorId={currentUser.id}
          onClose={() => setShowSchedule(false)}
          onCreated={d => setDiagnostics(prev => [d, ...prev])}
        />
      )}

      {resultsFor && (
        <ResultsModal
          diagnostic={resultsFor}
          onClose={() => setResultsFor(null)}
          onSaved={update}
        />
      )}
    </div>
  );
}
