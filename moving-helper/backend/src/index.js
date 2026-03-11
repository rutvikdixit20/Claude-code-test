import express from 'express';
import cors from 'cors';
import db from './db.js';
import { generateDefaultTasks } from './tasks.js';

const app = express();
app.use(cors());
app.use(express.json());

// --- Moves ---

app.get('/api/moves', (_req, res) => {
  const moves = db.prepare('SELECT * FROM moves ORDER BY created_at DESC').all();
  res.json(moves);
});

app.post('/api/moves', (req, res) => {
  const { name, from_address, to_address, move_date } = req.body;
  if (!name || !move_date) return res.status(400).json({ error: 'name and move_date required' });

  const result = db
    .prepare('INSERT INTO moves (name, from_address, to_address, move_date) VALUES (?, ?, ?, ?)')
    .run(name, from_address, to_address, move_date);

  const moveId = result.lastInsertRowid;

  // Seed default tasks
  const insert = db.prepare(
    'INSERT INTO tasks (move_id, category, title, due_date) VALUES (?, ?, ?, ?)'
  );
  const seedAll = db.transaction((tasks) => {
    for (const t of tasks) insert.run(moveId, t.category, t.title, t.due_date);
  });
  seedAll(generateDefaultTasks(move_date));

  res.json(db.prepare('SELECT * FROM moves WHERE id = ?').get(moveId));
});

app.delete('/api/moves/:id', (req, res) => {
  db.prepare('DELETE FROM tasks WHERE move_id = ?').run(req.params.id);
  db.prepare('DELETE FROM moves WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// --- Tasks ---

app.get('/api/moves/:id/tasks', (req, res) => {
  const tasks = db
    .prepare('SELECT * FROM tasks WHERE move_id = ? ORDER BY due_date ASC, category ASC')
    .all(req.params.id);
  res.json(tasks);
});

app.post('/api/moves/:id/tasks', (req, res) => {
  const { category, title, description, due_date } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });

  const result = db
    .prepare(
      'INSERT INTO tasks (move_id, category, title, description, due_date) VALUES (?, ?, ?, ?, ?)'
    )
    .run(req.params.id, category || 'Custom', title, description, due_date);

  res.json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid));
});

app.patch('/api/tasks/:id', (req, res) => {
  const { completed, title, due_date, description } = req.body;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'not found' });

  db.prepare(
    'UPDATE tasks SET completed = ?, title = ?, due_date = ?, description = ? WHERE id = ?'
  ).run(
    completed !== undefined ? (completed ? 1 : 0) : task.completed,
    title ?? task.title,
    due_date ?? task.due_date,
    description ?? task.description,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id));
});

app.delete('/api/tasks/:id', (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Moving Helper API running on :${PORT}`));
