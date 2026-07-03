import { useCallback, useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApiConfig } from '../context/ApiConfigContext';
import { api, type Task } from '../services/api';
import styles from './Dashboard.module.css';
import { Edit2, Loader2, Plus, Trash2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const KANBAN_COLUMNS = [
  { id: 'pending', status: 'pending' as const, title: 'To Do' },
  { id: 'in-progress', status: 'in-progress' as const, title: 'Em andamento' },
  { id: 'completed', status: 'completed' as const, title: 'Concluídas' },
];

function getStartOfThisWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  return new Date(now.getFullYear(), now.getMonth(), diff);
}

function isCompletedThisWeek(task: Task): boolean {
  if (task.status !== 'completed') return false;
  const dateStr = task.updated_at || task.updatedAt || task.created_at || task.createdAt;
  if (!dateStr) return false;
  const date = new Date(dateStr);
  return date >= getStartOfThisWeek();
}

export const Dashboard = () => {
  const { isConfigured } = useApiConfig();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const fetchTasks = useCallback(async (showRefreshing = false) => {
    if (!isConfigured) {
      setLoading(false);
      setError('Configure a chave API em Configurações.');
      return;
    }
    try {
      setError(null);
      if (showRefreshing) setRefreshing(true);
      const data = await api.getTasks();
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar tarefas');
      setTasks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isConfigured]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (task.status === 'pending' || task.status === 'in-progress') return true;
      return isCompletedThisWeek(task);
    });
  }, [tasks]);

  const tasksByColumn = useMemo(() => {
    const map: Record<string, Task[]> = {
      pending: [],
      'in-progress': [],
      completed: [],
    };
    filteredTasks.forEach((t) => {
      if (map[t.status]) map[t.status].push(t);
    });
    return map;
  }, [filteredTasks]);

  const handleRefresh = () => fetchTasks(true);

  const handleEdit = (id: string) => navigate(`/edit-task/${id}`);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Excluir esta tarefa?')) return;
    try {
      await api.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir');
    }
  };

  const handleStatusChange = async (task: Task, newStatus: Task['status']) => {
    try {
      // Rota dedicada de status: o servidor move a tarefa para a coluna certa
      // do processo e registra o histórico.
      await api.updateTaskStatus(task.id, newStatus);
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao atualizar');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const task = await api.createTask({
        title: newTitle.trim(),
        description: newDescription.trim(),
        status: 'pending',
      });
      setTasks((prev) => [task, ...prev]);
      setNewTitle('');
      setNewDescription('');
      setShowModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao criar tarefa');
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (task: Task) => {
    const d = task.updated_at || task.updatedAt || task.created_at || task.createdAt;
    return d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <Loader2 size={28} className={styles.spinner} />
        <span>Carregando tarefas...</span>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>Tarefas</h1>
        <div className={styles.actions}>
          <button
            className={styles.refreshBtn}
            onClick={handleRefresh}
            disabled={!isConfigured || refreshing}
            title="Atualizar"
          >
            <RefreshCw size={14} className={refreshing ? styles.spin : ''} />
          </button>
          <button
            className={styles.addBtn}
            onClick={() => setShowModal(true)}
            disabled={!isConfigured}
            title="Nova tarefa"
          >
            <Plus size={14} /> Nova
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.kanban}>
        {KANBAN_COLUMNS.map((col) => (
          <div key={col.id} className={styles.column}>
            <div className={styles.columnHeader}>
              <span className={styles.columnTitle}>{col.title}</span>
              <span className={styles.columnCount}>{tasksByColumn[col.status]?.length ?? 0}</span>
            </div>
            <div className={styles.columnContent}>
              <AnimatePresence mode="popLayout">
                {(tasksByColumn[col.status] ?? []).map((task) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={styles.card}
                    onClick={() => handleEdit(task.id)}
                  >
                    <p className={styles.cardTitle}>{task.title}</p>
                    {task.description && (
                      <p className={styles.cardDesc}>{task.description}</p>
                    )}
                    <div className={styles.cardFooter}>
                      <span className={styles.cardDate}>{formatDate(task)}</span>
                      <div className={styles.cardActions} onClick={(e) => e.stopPropagation()}>
                        <select
                          value={task.status}
                          onChange={(e) => handleStatusChange(task, e.target.value as Task['status'])}
                          className={styles.statusSelect}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="pending">To Do</option>
                          <option value="in-progress">Em andamento</option>
                          <option value="completed">Concluída</option>
                        </select>
                        <button
                          className={styles.iconBtn}
                          onClick={(e) => handleDelete(task.id, e)}
                          title="Excluir"
                        >
                          <Trash2 size={12} />
                        </button>
                        <button
                          className={styles.iconBtn}
                          onClick={() => handleEdit(task.id)}
                          title="Editar"
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={styles.modalTitle}>Nova Tarefa</h3>
            <form onSubmit={handleCreate}>
              <div className={styles.formGroup}>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Título"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Descrição (opcional)"
                  className={styles.textarea}
                  rows={2}
                />
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" disabled={creating} className={styles.submitBtn}>
                  {creating ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
