import { useState } from 'react';
import { useMoves } from './hooks/useMove.js';
import { NewMoveModal } from './components/NewMoveModal.jsx';
import { TaskBoard } from './components/TaskBoard.jsx';
import styles from './App.module.css';

function daysUntil(dateStr) {
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function App() {
  const { moves, loading, createMove, deleteMove } = useMoves();
  const [activeMove, setActiveMove] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const currentMove = moves.find((m) => m.id === activeMove) ?? null;

  const handleCreate = async (data) => {
    const created = await createMove(data).catch(() => null);
    if (moves.length === 0 && created) {
      // auto-select first move
    }
  };

  const handleDelete = async (id) => {
    await deleteMove(id);
    if (activeMove === id) setActiveMove(null);
    setConfirmDelete(null);
  };

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span>Moving Helper</span>
        </div>

        <button className={styles.newBtn} onClick={() => setShowModal(true)}>
          + New Move
        </button>

        <nav className={styles.nav}>
          {loading && <p className={styles.sideNote}>Loading...</p>}
          {!loading && moves.length === 0 && (
            <p className={styles.sideNote}>No moves yet. Create one to get started.</p>
          )}
          {moves.map((m) => {
            const days = daysUntil(m.move_date);
            return (
              <div
                key={m.id}
                className={`${styles.moveItem} ${activeMove === m.id ? styles.active : ''}`}
                onClick={() => setActiveMove(m.id)}
              >
                <div className={styles.moveName}>{m.name}</div>
                <div className={styles.moveMeta}>
                  {days < 0
                    ? `Moved ${Math.abs(days)}d ago`
                    : days === 0
                    ? 'Move day!'
                    : `${days} days away`}
                </div>
                <button
                  className={styles.deleteMove}
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(m.id); }}
                  title="Delete move"
                >
                  ×
                </button>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <main className={styles.main}>
        {currentMove ? (
          <>
            <header className={styles.header}>
              <div>
                <h1>{currentMove.name}</h1>
                <p className={styles.addresses}>
                  {currentMove.from_address && <span>{currentMove.from_address}</span>}
                  {currentMove.from_address && currentMove.to_address && <span> → </span>}
                  {currentMove.to_address && <span>{currentMove.to_address}</span>}
                </p>
              </div>
              <div className={styles.moveDate}>
                <div className={styles.dateBig}>{new Date(currentMove.move_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                <div className={styles.dateSub}>Move date</div>
              </div>
            </header>
            <TaskBoard moveId={currentMove.id} />
          </>
        ) : (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🏠</div>
            <h2>Welcome to Moving Helper</h2>
            <p>Create a new move to generate your personalized checklist — utilities, admin, packing, and more — all organized by deadline.</p>
            <button onClick={() => setShowModal(true)}>Plan Your Move</button>
          </div>
        )}
      </main>

      {showModal && (
        <NewMoveModal onSubmit={handleCreate} onClose={() => setShowModal(false)} />
      )}

      {confirmDelete && (
        <div className={styles.overlay} onClick={() => setConfirmDelete(null)}>
          <div className={styles.confirmBox} onClick={(e) => e.stopPropagation()}>
            <h3>Delete this move?</h3>
            <p>All tasks will be permanently deleted.</p>
            <div className={styles.confirmActions}>
              <button onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className={styles.danger} onClick={() => handleDelete(confirmDelete)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
