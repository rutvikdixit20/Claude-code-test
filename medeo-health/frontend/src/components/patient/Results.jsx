import { useState, useEffect } from 'react';
import { useApp } from '../../App.jsx';
import { api } from '../../lib/api.js';

const TYPE_ICONS = {
  'MRI Scan': '🧲', 'CT Scan': '💫', 'Blood Work': '🩸',
  'X-Ray': '☢️', 'Ultrasound': '〰️', 'ECG': '💓',
  'Mammography': '🔍', 'PET Scan': '🔬',
};

function ResultCard({ diag, onSummarize }) {
  const [summarizing, setSummarizing] = useState(false);

  const handleSummarize = async () => {
    setSummarizing(true);
    try {
      await onSummarize(diag.id);
    } finally {
      setSummarizing(false);
    }
  };

  const formatDate = (iso) => new Date(iso).toLocaleDateString('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });

  return (
    <div className="card">
      <div className="card-body">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div style={{
            width: 52, height: 52, borderRadius: 'var(--radius-lg)',
            background: 'var(--primary-light)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0
          }}>
            {TYPE_ICONS[diag.type] || '📋'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1.125rem', fontWeight: 800 }}>{diag.type}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>{diag.facility}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginTop: 2 }}>
              {diag.doctor_name} · {formatDate(diag.scheduled_at)}
            </div>
          </div>
          <span className="badge badge-success">✓ Results Ready</span>
        </div>

        {/* AI Plain-English Summary — shown first, most prominent */}
        {diag.ai_summary ? (
          <div style={{
            background: 'linear-gradient(135deg, var(--primary-light) 0%, #f0f9ff 100%)',
            border: '1px solid var(--primary-muted)',
            borderRadius: 'var(--radius-lg)',
            padding: '18px 20px',
            marginBottom: 18,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{
                background: 'var(--primary)', color: '#fff', borderRadius: 6,
                padding: '3px 8px', fontSize: '0.7rem', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.06em'
              }}>
                ✨ Plain English Summary
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>AI-generated for you</span>
            </div>
            <p style={{ fontSize: '1rem', lineHeight: 1.7, color: 'var(--text)', fontWeight: 400 }}>
              {diag.ai_summary}
            </p>
          </div>
        ) : (
          <div style={{
            background: 'var(--surface-2)', border: '1px dashed var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '18px 20px', marginBottom: 18,
            display: 'flex', alignItems: 'center', gap: 14
          }}>
            <span style={{ fontSize: '1.5rem' }}>✨</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Get a plain-English summary</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-2)' }}>
                AI will translate your results into simple, easy-to-understand language.
              </div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleSummarize} disabled={summarizing}>
              {summarizing ? (
                <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Generating…</>
              ) : '✨ Generate Summary'}
            </button>
          </div>
        )}

        {/* Raw Results — collapsed under a disclosure */}
        <details style={{ marginTop: 4 }}>
          <summary style={{
            fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)',
            cursor: 'pointer', padding: '6px 0', listStyle: 'none',
            display: 'flex', alignItems: 'center', gap: 6
          }}>
            <span>🔬</span> View full lab values & clinical results
          </summary>
          <div style={{
            marginTop: 12, background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '14px 16px',
            fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--text-2)',
            whiteSpace: 'pre-wrap', lineHeight: 1.8
          }}>
            {diag.results}
          </div>
        </details>

        {diag.notes && (
          <div className="rx-instructions" style={{ marginTop: 14 }}>
            <span style={{ fontWeight: 600 }}>Doctor's clinical notes: </span>{diag.notes}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PatientResults() {
  const { currentUser } = useApp();
  const [diagnostics, setDiagnostics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDiagnostics({ patient_id: currentUser.id })
      .then(d => setDiagnostics(d.filter(x => x.status === 'completed' && x.results)))
      .finally(() => setLoading(false));
  }, [currentUser.id]);

  const handleSummarize = async (id) => {
    const { ai_summary } = await api.generateSummary(id);
    setDiagnostics(prev => prev.map(d => d.id === id ? { ...d, ai_summary } : d));
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📋 My Results</h1>
          <p className="page-subtitle">
            {diagnostics.length > 0
              ? `${diagnostics.length} result${diagnostics.length !== 1 ? 's' : ''} available`
              : 'Results from completed diagnostics'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /> Loading your results…</div>
      ) : diagnostics.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No results yet</div>
            <div className="empty-state-text">
              Results will appear here once your doctor uploads them after a completed diagnostic.
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Info banner */}
          <div style={{
            background: 'var(--info-bg)', border: '1px solid var(--info-border)',
            borderRadius: 'var(--radius-lg)', padding: '14px 18px',
            display: 'flex', gap: 12, alignItems: 'flex-start'
          }}>
            <span style={{ fontSize: '1.25rem' }}>ℹ️</span>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--info)', marginBottom: 2 }}>About your results</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>
                These results are from your completed diagnostics. The plain-English summaries are AI-generated to help you understand them — they are not medical advice. Always discuss your results with your doctor.
              </div>
            </div>
          </div>

          {diagnostics.map(d => (
            <ResultCard key={d.id} diag={d} onSummarize={handleSummarize} />
          ))}
        </div>
      )}
    </div>
  );
}
