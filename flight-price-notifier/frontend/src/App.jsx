import { useState, useEffect, useCallback } from 'react';
import { api } from './lib/api.js';
import { AddTripModal } from './components/AddTripModal.jsx';
import { TripDetail } from './components/TripDetail.jsx';
import styles from './App.module.css';

function StatCard({ label, value, sub }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  );
}

function TripCard({ trip, onClick }) {
  const drop = trip.booked_price - trip.current_price;
  const dropPct = ((drop / trip.booked_price) * 100).toFixed(1);

  return (
    <div
      className={`${styles.tripCard} ${!trip.active ? styles.inactive : ''}`}
      onClick={onClick}
    >
      <div className={styles.tripRoute}>
        <span className={styles.airport}>{trip.origin}</span>
        <span className={styles.arrow}>✈</span>
        <span className={styles.airport}>{trip.destination}</span>
      </div>
      <div className={styles.tripLabel}>{trip.label}</div>
      <div className={styles.tripMeta}>{trip.depart_date} · {trip.cabin} · {trip.passengers}p</div>

      <div className={styles.tripPrices}>
        <div className={styles.tripPrice}>
          <div className={styles.priceLabel}>Booked</div>
          <div className={styles.priceVal}>${trip.booked_price.toFixed(2)}</div>
        </div>
        <div className={styles.tripPrice}>
          <div className={styles.priceLabel}>Current</div>
          <div className={`${styles.priceVal} ${drop > 0 ? styles.green : drop < 0 ? styles.red : ''}`}>
            ${trip.current_price.toFixed(2)}
          </div>
        </div>
        <div className={styles.tripPrice}>
          <div className={styles.priceLabel}>Drop</div>
          <div className={`${styles.priceVal} ${drop > 0 ? styles.green : styles.muted}`}>
            {drop > 0 ? `-${dropPct}%` : drop < 0 ? `+${Math.abs(dropPct)}%` : '—'}
          </div>
        </div>
      </div>

      <div className={styles.tripFooter}>
        <span className={trip.refundable ? styles.refundable : styles.nonRefundable}>
          {trip.refundable ? '✓ Refundable' : '✗ Non-refundable'}
        </span>
        <span className={trip.active ? styles.watching : styles.paused}>
          {trip.active ? '● Watching' : '○ Paused'}
        </span>
      </div>
    </div>
  );
}

export default function App() {
  const [trips, setTrips] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [t, s] = await Promise.all([api.getTrips(), api.getStats()]);
    setTrips(t);
    setStats(s);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCreated = (trip) => {
    setTrips((prev) => [trip, ...prev]);
    refresh();
  };

  const handleDeleted = (id) => {
    setTrips((prev) => prev.filter((t) => t.id !== id));
    refresh();
  };

  return (
    <div className={styles.app}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Flight Price Notifier</h1>
          <p>Claude auto-rebooks when prices drop</p>
        </div>
        <button className={styles.addBtn} onClick={() => setShowAdd(true)}>
          + Watch a Flight
        </button>
      </header>

      {/* Stats bar */}
      {stats && (
        <div className={styles.statsBar}>
          <StatCard label="Watched flights" value={stats.activeTrips} />
          <StatCard label="Total rebooks" value={stats.rebooks} />
          <StatCard
            label="Total saved"
            value={`$${stats.totalSavings.toFixed(2)}`}
            sub="via auto-rebook"
          />
          <div className={styles.agentNote}>
            Powered by Claude Opus 4.6<br />
            <span>Adaptive thinking + Tool use</span>
          </div>
        </div>
      )}

      {/* Trip grid */}
      <main className={styles.main}>
        {loading && <p className={styles.empty}>Loading…</p>}
        {!loading && trips.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>✈</div>
            <h2>No flights watched yet</h2>
            <p>Add a flight you've booked. Claude will monitor prices and automatically rebook if a cheaper refundable fare appears.</p>
            <button onClick={() => setShowAdd(true)}>Watch Your First Flight</button>
          </div>
        )}
        <div className={styles.grid}>
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onClick={() => setSelectedTrip(trip)}
            />
          ))}
        </div>
      </main>

      {showAdd && (
        <AddTripModal onCreated={handleCreated} onClose={() => setShowAdd(false)} />
      )}

      {selectedTrip && (
        <TripDetail
          trip={selectedTrip}
          onClose={() => setSelectedTrip(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
