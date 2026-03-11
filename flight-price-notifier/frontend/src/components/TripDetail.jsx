import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';
import styles from './TripDetail.module.css';

const LOG_LEVEL_COLORS = {
  info: '#64748b',
  thinking: '#8b5cf6',
  analysis: '#38bdf8',
  tool: '#fb923c',
  tool_result: '#4ade80',
  rebook: '#f59e0b',
  error: '#f87171',
};

function PriceChart({ history }) {
  if (!history.length) return null;
  const prices = history.map((h) => h.price);
  const min = Math.min(...prices) * 0.95;
  const max = Math.max(...prices) * 1.05;
  const W = 400, H = 80;
  const points = prices.map((p, i) => {
    const x = (i / Math.max(prices.length - 1, 1)) * W;
    const y = H - ((p - min) / (max - min)) * H;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className={styles.chartWrap}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={styles.chart}>
        <polyline points={points} fill="none" stroke="#6366f1" strokeWidth="2" />
        {prices.map((p, i) => {
          const x = (i / Math.max(prices.length - 1, 1)) * W;
          const y = H - ((p - min) / (max - min)) * H;
          return <circle key={i} cx={x} cy={y} r={3} fill="#818cf8" />;
        })}
      </svg>
      <div className={styles.chartLabels}>
        <span>${min.toFixed(0)}</span>
        <span>${max.toFixed(0)}</span>
      </div>
    </div>
  );
}

export function TripDetail({ trip, onClose, onDeleted }) {
  const [history, setHistory] = useState([]);
  const [rebooks, setRebooks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [tab, setTab] = useState('logs');
  const [checking, setChecking] = useState(false);

  const refresh = useCallback(async () => {
    const [h, r, l] = await Promise.all([
      api.getHistory(trip.id),
      api.getRebooks(trip.id),
      api.getLogs(trip.id),
    ]);
    setHistory(h);
    setRebooks(r);
    setLogs(l);
  }, [trip.id]);

  useEffect(() => { refresh(); }, [refresh]);
  // Poll logs every 3s when checking is active
  useEffect(() => {
    if (!checking) return;
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [checking, refresh]);

  const handleCheck = async () => {
    setChecking(true);
    setTab('logs');
    await api.checkTrip(trip.id);
    // Keep polling for 30s then stop
    setTimeout(() => setChecking(false), 30000);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this watched flight?')) return;
    await api.deleteTrip(trip.id);
    onDeleted(trip.id);
    onClose();
  };

  const drop = trip.booked_price - trip.current_price;
  const savings = rebooks.reduce((s, r) => s + r.savings, 0);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h2>{trip.label}</h2>
            <p className={styles.route}>
              {trip.origin} → {trip.destination} · {trip.cabin} · {trip.passengers}p
            </p>
          </div>
          <div className={styles.headerActions}>
            <button
              className={`${styles.checkBtn} ${checking ? styles.checking : ''}`}
              onClick={handleCheck}
              disabled={checking}
            >
              {checking ? 'Analyzing…' : 'Check Now (Claude)'}
            </button>
            <button className={styles.closeBtn} onClick={onClose}>×</button>
          </div>
        </div>

        {/* Price cards */}
        <div className={styles.cards}>
          <div className={styles.card}>
            <div className={styles.cardLabel}>Booked at</div>
            <div className={styles.cardValue}>${trip.booked_price.toFixed(2)}</div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardLabel}>Current price</div>
            <div className={`${styles.cardValue} ${drop > 0 ? styles.green : drop < 0 ? styles.red : ''}`}>
              ${trip.current_price.toFixed(2)}
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardLabel}>Price drop</div>
            <div className={`${styles.cardValue} ${drop > 0 ? styles.green : styles.muted}`}>
              {drop > 0 ? `−$${drop.toFixed(2)}` : drop < 0 ? `+$${Math.abs(drop).toFixed(2)}` : '—'}
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardLabel}>Total saved</div>
            <div className={`${styles.cardValue} ${savings > 0 ? styles.gold : styles.muted}`}>
              {savings > 0 ? `$${savings.toFixed(2)}` : '—'}
            </div>
          </div>
        </div>

        <PriceChart history={history} />

        {/* Tabs */}
        <div className={styles.tabs}>
          {['logs', 'rebooks', 'history'].map((t) => (
            <button key={t} className={`${styles.tab} ${tab === t ? styles.active : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'rebooks' && rebooks.length > 0 && (
                <span className={styles.badge}>{rebooks.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className={styles.tabContent}>
          {tab === 'logs' && (
            <div className={styles.logList}>
              {logs.length === 0 && (
                <p className={styles.empty}>No logs yet. Click "Check Now" to run the Claude agent.</p>
              )}
              {logs.map((l) => (
                <div key={l.id} className={styles.logRow}>
                  <span className={styles.logTime}>{new Date(l.created_at).toLocaleTimeString()}</span>
                  <span
                    className={styles.logLevel}
                    style={{ color: LOG_LEVEL_COLORS[l.level] ?? '#64748b' }}
                  >
                    {l.level}
                  </span>
                  <span className={styles.logMsg}>{l.message}</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'rebooks' && (
            <div className={styles.rebookList}>
              {rebooks.length === 0 && <p className={styles.empty}>No rebookings yet.</p>}
              {rebooks.map((r) => (
                <div key={r.id} className={styles.rebookCard}>
                  <div className={styles.rebookHeader}>
                    <span className={styles.rebookSaved}>Saved ${r.savings.toFixed(2)}</span>
                    <span className={styles.rebookDate}>{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                  <div className={styles.rebookPrices}>
                    <span className={styles.oldPrice}>${r.old_price.toFixed(2)}</span>
                    <span className={styles.arrow}>→</span>
                    <span className={styles.newPrice}>${r.new_price.toFixed(2)}</span>
                  </div>
                  <p className={styles.rebookRef}>New booking: {r.new_booking_ref}</p>
                  {r.agent_reasoning && (
                    <p className={styles.rebookReason}>{r.agent_reasoning}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'history' && (
            <div className={styles.historyList}>
              {history.slice().reverse().map((h) => (
                <div key={h.id} className={styles.historyRow}>
                  <span>{new Date(h.checked_at).toLocaleString()}</span>
                  <span>${h.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <span className={styles.footerMeta}>
            Ref: {trip.booking_ref} · {trip.refundable ? '✓ Refundable' : '✗ Non-refundable'} · Cancel fee: ${trip.cancellation_fee}
          </span>
          <button className={styles.deleteBtn} onClick={handleDelete}>Delete</button>
        </div>
      </div>
    </div>
  );
}
