import { useState } from 'react';
import styles from './NewMoveModal.module.css';

export function NewMoveModal({ onSubmit, onClose }) {
  const [form, setForm] = useState({ name: '', from_address: '', to_address: '', move_date: '' });
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSubmit(form);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2>Plan a New Move</h2>
        <form onSubmit={submit}>
          <label>
            Move name (e.g. "Chicago to Austin")
            <input required value={form.name} onChange={set('name')} placeholder="My Big Move" />
          </label>
          <label>
            Moving from
            <input value={form.from_address} onChange={set('from_address')} placeholder="123 Old St, Chicago IL" />
          </label>
          <label>
            Moving to
            <input value={form.to_address} onChange={set('to_address')} placeholder="456 New Ave, Austin TX" />
          </label>
          <label>
            Move date
            <input required type="date" value={form.move_date} onChange={set('move_date')} />
          </label>
          <div className={styles.actions}>
            <button type="button" className={styles.cancel} onClick={onClose}>Cancel</button>
            <button type="submit" disabled={saving}>
              {saving ? 'Creating...' : 'Create Move Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
