import { useState } from 'react';
import styles from './AddTripModal.module.css';
import { api } from '../lib/api.js';

const CABINS = ['economy', 'premium_economy', 'business', 'first'];

export function AddTripModal({ onCreated, onClose }) {
  const [form, setForm] = useState({
    label: '', origin: '', destination: '', depart_date: '', return_date: '',
    cabin: 'economy', passengers: 1, booked_price: '', booking_ref: '',
    cancellation_fee: 0, refundable: true,
  });
  const [searching, setSearching] = useState(false);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setNum = (k) => (e) => setForm((f) => ({ ...f, [k]: Number(e.target.value) }));
  const setBool = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.checked }));

  const previewPrice = async () => {
    if (!form.origin || !form.destination || !form.depart_date) return;
    setSearching(true);
    try {
      const results = await api.searchFlights({
        origin: form.origin, destination: form.destination,
        depart_date: form.depart_date, return_date: form.return_date || undefined,
        cabin: form.cabin, passengers: form.passengers,
      });
      setPreview(results.fares);
    } catch {/* ignore */}
    setSearching(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const trip = await api.createTrip({
        ...form,
        passengers: Number(form.passengers),
        booked_price: Number(form.booked_price),
        cancellation_fee: Number(form.cancellation_fee),
      });
      onCreated(trip);
      onClose();
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2>Watch a New Flight</h2>
        <form onSubmit={submit}>
          <div className={styles.grid2}>
            <label>
              Trip name
              <input required value={form.label} onChange={set('label')} placeholder="NYC → Tokyo Jun" />
            </label>
            <label>
              Booking ref
              <input required value={form.booking_ref} onChange={set('booking_ref')} placeholder="ABC123" />
            </label>
          </div>

          <div className={styles.grid2}>
            <label>
              Origin (IATA)
              <input required value={form.origin} onChange={set('origin')} placeholder="JFK" maxLength={3} style={{ textTransform: 'uppercase' }} />
            </label>
            <label>
              Destination (IATA)
              <input required value={form.destination} onChange={set('destination')} placeholder="NRT" maxLength={3} style={{ textTransform: 'uppercase' }} />
            </label>
          </div>

          <div className={styles.grid2}>
            <label>
              Depart date
              <input required type="date" value={form.depart_date} onChange={set('depart_date')} />
            </label>
            <label>
              Return date (optional)
              <input type="date" value={form.return_date} onChange={set('return_date')} />
            </label>
          </div>

          <div className={styles.grid3}>
            <label>
              Cabin
              <select value={form.cabin} onChange={set('cabin')}>
                {CABINS.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
              </select>
            </label>
            <label>
              Passengers
              <input type="number" min={1} max={9} value={form.passengers} onChange={setNum('passengers')} />
            </label>
            <label>
              Booked price ($)
              <input required type="number" min={0} step="0.01" value={form.booked_price} onChange={set('booked_price')} placeholder="580.00" />
            </label>
          </div>

          <div className={styles.grid2}>
            <label>
              Cancellation fee ($)
              <input type="number" min={0} step="0.01" value={form.cancellation_fee} onChange={setNum('cancellation_fee')} />
            </label>
            <label className={styles.checkLabel}>
              <input type="checkbox" checked={form.refundable} onChange={setBool('refundable')} />
              Refundable ticket
            </label>
          </div>

          {/* Price preview */}
          <div className={styles.previewRow}>
            <button type="button" className={styles.previewBtn} onClick={previewPrice} disabled={searching}>
              {searching ? 'Searching…' : 'Preview current prices'}
            </button>
          </div>

          {preview && (
            <div className={styles.preview}>
              <p className={styles.previewTitle}>Current fares ({form.cabin}):</p>
              {preview.map((f) => (
                <div key={f.fare_id} className={styles.fare}>
                  <span>{f.airline}</span>
                  <span>${f.total_price.toFixed(2)}</span>
                  <span className={f.refundable ? styles.yes : styles.no}>
                    {f.refundable ? 'Refundable' : 'Non-refundable'}
                  </span>
                  <button
                    type="button"
                    className={styles.usePrice}
                    onClick={() => setForm((f2) => ({ ...f2, booked_price: String(f.total_price) }))}
                  >
                    Use as booked
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className={styles.actions}>
            <button type="button" className={styles.cancel} onClick={onClose}>Cancel</button>
            <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Watch this flight'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
