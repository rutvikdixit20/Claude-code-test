import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';

export function useMoves() {
  const [moves, setMoves] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setMoves(await api.getMoves());
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const createMove = async (data) => {
    await api.createMove(data);
    await refresh();
  };

  const deleteMove = async (id) => {
    await api.deleteMove(id);
    await refresh();
  };

  return { moves, loading, createMove, deleteMove, refresh };
}

export function useTasks(moveId) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!moveId) return;
    setLoading(true);
    setTasks(await api.getTasks(moveId));
    setLoading(false);
  }, [moveId]);

  useEffect(() => { refresh(); }, [refresh]);

  const createTask = async (data) => {
    await api.createTask(moveId, data);
    await refresh();
  };

  const toggleTask = async (task) => {
    await api.updateTask(task.id, { completed: !task.completed });
    await refresh();
  };

  const deleteTask = async (id) => {
    await api.deleteTask(id);
    await refresh();
  };

  return { tasks, loading, createTask, toggleTask, deleteTask, refresh };
}
