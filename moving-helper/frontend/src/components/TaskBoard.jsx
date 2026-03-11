import { useState } from 'react';
import { useTasks } from '../hooks/useMove.js';
import styles from './TaskBoard.module.css';

const CATEGORY_COLORS = {
  Planning: '#5B6EF5',
  Sorting: '#F5A623',
  Packing: '#7ED321',
  Utilities: '#50E3C2',
  Admin: '#BD10E0',
  'Move Day': '#D0021B',
  Custom: '#888',
};

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function DueBadge({ date }) {
  const days = daysUntil(date);
  if (days === null) return null;
  const label = days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `${days}d left`;
  const cls = days < 0 ? styles.overdue : days <= 3 ? styles.urgent : styles.ok;
  return <span className={`${styles.badge} ${cls}`}>{label}</span>;
}

export function TaskBoard({ moveId }) {
  const { tasks, loading, createTask, toggleTask, deleteTask } = useTasks(moveId);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Custom');
  const [newDate, setNewDate] = useState('');
  const [filter, setFilter] = useState('all');

  const grouped = tasks.reduce((acc, t) => {
    const key = t.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await createTask({ title: newTitle.trim(), category: newCategory, due_date: newDate || null });
    setNewTitle('');
    setNewDate('');
  };

  const visibleGroups = Object.entries(grouped).filter(([, items]) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return items.some((t) => !t.completed);
    if (filter === 'done') return items.some((t) => t.completed);
    return true;
  });

  const total = tasks.length;
  const done = tasks.filter((t) => t.completed).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  if (loading) return <div className={styles.loading}>Loading tasks...</div>;

  return (
    <div className={styles.board}>
      {/* Progress bar */}
      <div className={styles.progress}>
        <div className={styles.progressLabel}>
          <span>{done} of {total} tasks complete</span>
          <span>{pct}%</span>
        </div>
        <div className={styles.bar}>
          <div className={styles.fill} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        {['all', 'pending', 'done'].map((f) => (
          <button
            key={f}
            className={`${styles.filterBtn} ${filter === f ? styles.active : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Add custom task */}
      <form className={styles.addForm} onSubmit={addTask}>
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a custom task..."
        />
        <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
          {Object.keys(CATEGORY_COLORS).map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
        <button type="submit">Add</button>
      </form>

      {/* Task groups */}
      {visibleGroups.map(([category, items]) => {
        const categoryTasks = filter === 'pending'
          ? items.filter((t) => !t.completed)
          : filter === 'done'
          ? items.filter((t) => t.completed)
          : items;

        return (
          <div key={category} className={styles.group}>
            <div className={styles.groupHeader}>
              <span
                className={styles.dot}
                style={{ background: CATEGORY_COLORS[category] || '#888' }}
              />
              <span className={styles.groupName}>{category}</span>
              <span className={styles.groupCount}>
                {items.filter((t) => t.completed).length}/{items.length}
              </span>
            </div>
            <ul className={styles.taskList}>
              {categoryTasks.map((task) => (
                <li key={task.id} className={`${styles.task} ${task.completed ? styles.done : ''}`}>
                  <button
                    className={styles.check}
                    onClick={() => toggleTask(task)}
                    aria-label="toggle complete"
                  >
                    {task.completed ? '✓' : ''}
                  </button>
                  <div className={styles.taskInfo}>
                    <span className={styles.taskTitle}>{task.title}</span>
                    {task.description && (
                      <span className={styles.taskDesc}>{task.description}</span>
                    )}
                  </div>
                  {!task.completed && <DueBadge date={task.due_date} />}
                  <button
                    className={styles.del}
                    onClick={() => deleteTask(task.id)}
                    aria-label="delete task"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {visibleGroups.length === 0 && (
        <p className={styles.empty}>No tasks to show.</p>
      )}
    </div>
  );
}
