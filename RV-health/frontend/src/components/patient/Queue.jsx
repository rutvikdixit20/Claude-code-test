import { useState, useEffect } from 'react';
import { useApp } from '../../App.jsx';
import { api } from '../../lib/api.js';

const TYPE_ICONS = {
  'MRI Scan': '🧲', 'CT Scan': '💫', 'Blood Work': '🩸',
  'X-Ray': '☢️', 'Ultrasound': '〰️', 'ECG': '💓',
  'Mammography': '🔍', 'PET Scan': '🔬',
};

function LiveQueueCard({ diag }) {
  const isInQueue  = diag.status === 'in_queue';
  const isNext     = isInQueue && diag.queue_position === 1;
  const isProgress = diag.status === 'in_progress';
  const isDone     = diag.status === 'completed';
  const isScheduled = diag.status === 'scheduled';

  const pct = (diag.queue_total && diag.queue_position)
    ? Math.round(((diag.queue_total - diag.queue_position) / diag.queue_total) * 100)
    : 0;

  const estWait = isInQueue && diag.queue_position > 1
    ? `~${(diag.queue_position - 1) * 15} min`
    : isNext ? 'Head in now!' : null;

  const formatDT = (iso) => new Date(iso).toLocaleString('en-CA', {
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="card" style={{
      borderLeft: isNext ? '5px solid var(--warning)' :
                  isInQueue ? '5px solid var(--primary)' :
                  isProgress ? '5px solid var(--info)' :
                  isDone ? '5px solid var(--success)' : '1px solid var(--border)',
      boxShadow: isNext ? '0 4px 24px rgba(217,119,6,0.15)' : 'var(--shadow)',
    }}>
      <div className="card-body">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div style={{
            width: 56, height: 56, borderRadius: 'var(--radius-lg)',
            background: isNext ? 'var(--warning-bg)' : 'var(--primary-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', flexShrink: 0
          }}>
            {TYPE_ICONS[diag.type] || '🔬'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{diag.type}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>{diag.facility}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginTop: 2 }}>
              {diag.doctor_name} · {formatDT(diag.scheduled_at)}
            </div>
          </div>
          <div>
            {isNext      && <span className="badge badge-warning animate-pulse" style={{ fontSize: '0.8125rem', padding: '6px 14px' }}>🔔 You're Next!</span>}
            {isInQueue && !isNext && <span className="badge badge-primary">⏱ In Queue</span>}
            {isProgress  && <span className="badge badge-info">⚡ In Progress</span>}
            {isDone      && <span className="badge badge-success">✓ Completed</span>}
            {isScheduled && <span className="badge badge-neutral">📅 Scheduled</span>}
          </div>
        </div>

        {/* Queue Display */}
        {isInQueue && (
          <div style={{ display: 'flex', gap: 32, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: isNext ? 'var(--warning)' : 'var(--primary)', lineHeight: 1 }}>
                #{diag.queue_position}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 4 }}>Your position</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-2)', lineHeight: 1 }}>
                {diag.queue_total}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 4 }}>Total in queue</div>
            </div>
            {estWait && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: isNext ? 'var(--warning)' : 'var(--text)', lineHeight: 1 }}>
                  {estWait}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 4 }}>Estimated wait</div>
              </div>
            )}
          </div>
        )}

        {/* Progress bar */}
        {isInQueue && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 6 }}>
              <span>Start</span>
              <span>{pct}% through queue</span>
              <span>Your Turn</span>
            </div>
            <div className="progress-bar" style={{ height: 10 }}>
              <div className="progress-fill" style={{
                width: `${pct}%`,
                background: isNext ? 'var(--warning)' : 'var(--primary)',
              }} />
            </div>
          </div>
        )}

        {/* Queue dots */}
        {isInQueue && diag.queue_total <= 12 && (
          <div className="queue-visual" style={{ marginBottom: 20, gap: 8 }}>
            {Array.from({ length: diag.queue_total }, (_, i) => {
              const pos = i + 1;
              if (pos < diag.queue_position)
                return <div key={i} className="queue-dot queue-dot-done" style={{ width: 32, height: 32 }}>✓</div>;
              if (pos === diag.queue_position)
                return (
                  <div key={i} className="queue-dot queue-dot-you" style={{ width: 40, height: 40, fontSize: '0.6rem' }}>
                    YOU
                  </div>
                );
              return <div key={i} className="queue-dot queue-dot-ahead" style={{ width: 32, height: 32 }}>{pos}</div>;
            })}
          </div>
        )}

        {/* Status Messages */}
        {isNext && (
          <div style={{
            background: 'var(--warning-bg)', border: '1px solid var(--warning-border)',
            borderRadius: 'var(--radius)', padding: '14px 18px', marginBottom: 16
          }}>
            <div style={{ fontWeight: 700, color: 'var(--warning)', marginBottom: 4 }}>
              🔔 You're up next — head to the check-in desk now!
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>
              Please check in at {diag.facility} and let the receptionist know you've arrived.
            </div>
          </div>
        )}

        {isScheduled && (
          <div style={{
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '14px 18px'
          }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>📋 What to bring</div>
            <ul style={{ fontSize: '0.8125rem', color: 'var(--text-2)', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li>Health card / photo ID</li>
              <li>Referral from Dr. {diag.doctor_name}</li>
              <li>List of current medications</li>
              <li>Arrive 15 minutes early to complete intake forms</li>
            </ul>
          </div>
        )}

        {isDone && (
          <div style={{
            background: 'var(--success-bg)', border: '1px solid var(--success-border)',
            borderRadius: 'var(--radius)', padding: '14px 18px'
          }}>
            <div style={{ fontWeight: 600, color: 'var(--success)' }}>✓ Procedure completed</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-2)', marginTop: 4 }}>
              Your results will be available in the Results tab once reviewed by your doctor.
            </div>
          </div>
        )}

        {diag.notes && (
          <div className="rx-instructions" style={{ marginTop: 12 }}>
            <span style={{ fontWeight: 600 }}>Doctor's notes: </span>{diag.notes}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PatientQueue() {
  const { currentUser } = useApp();
  const [diagnostics, setDiagnostics] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => api.getDiagnostics({ patient_id: currentUser.id }).then(setDiagnostics).finally(() => setLoading(false));

  useEffect(() => { load(); }, [currentUser.id]);

  // Live refresh every 15s
  useEffect(() => {
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [currentUser.id]);

  const inQueue   = diagnostics.filter(d => d.status === 'in_queue');
  const scheduled = diagnostics.filter(d => d.status === 'scheduled');
  const past      = diagnostics.filter(d => ['completed', 'cancelled', 'in_progress'].includes(d.status));

  const Section = ({ title, items }) => items.length === 0 ? null : (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {items.map(d => <LiveQueueCard key={d.id} diag={d} />)}
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📡 My Queue & Diagnostics</h1>
          <p className="page-subtitle">
            Live updates every 15 seconds
            {inQueue.length > 0 && ` · ${inQueue.length} in queue`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem', color: 'var(--text-3)' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', animation: 'pulse 2s infinite' }} />
          Live
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /> Loading your diagnostics…</div>
      ) : diagnostics.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📡</div>
            <div className="empty-state-title">No diagnostics scheduled</div>
            <div className="empty-state-text">Your doctor will schedule diagnostics and they'll appear here.</div>
          </div>
        </div>
      ) : (
        <>
          <Section title="🔔 Currently In Queue" items={inQueue} />
          <Section title="📅 Upcoming" items={scheduled} />
          <Section title="✓ Past Diagnostics" items={past} />
        </>
      )}
    </div>
  );
}
