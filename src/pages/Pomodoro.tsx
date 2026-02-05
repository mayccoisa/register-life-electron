import { useEffect, useState } from 'react';
import { useApiConfig } from '../context/ApiConfigContext';
import { api, type Pomodoro as PomodoroType, type Task } from '../services/api';
import styles from './Pomodoro.module.css';
import { Loader2, Plus, Trash2, Clock, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Pomodoro = () => {
  const { isConfigured } = useApiConfig();
  const [pomodoros, setPomodoros] = useState<PomodoroType[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [duration, setDuration] = useState(25);
  const [taskId, setTaskId] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (showRefreshing = false) => {
    if (!isConfigured) {
      setLoading(false);
      setError('Configure a chave API em Configurações.');
      return;
    }
    try {
      setError(null);
      if (showRefreshing) setRefreshing(true);
      const [pomData, taskData] = await Promise.all([api.getPomodoros(), api.getTasks()]);
      setPomodoros(pomData);
      setTasks(taskData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar dados');
      setPomodoros([]);
      setTasks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isConfigured]);

  const handleRefresh = () => fetchData(true);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const pom = await api.createPomodoro({
        duration,
        task_id: taskId || undefined,
        status: 'completed',
      });
      setPomodoros((prev) => [pom, ...prev]);
      setDuration(25);
      setTaskId('');
      setShowModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao registrar pomodoro');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Excluir esta sessão de pomodoro?')) return;
    try {
      await api.deletePomodoro(id);
      setPomodoros((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir');
    }
  };

  const getDate = (p: PomodoroType) => p.completed_at || p.created_at || p.createdAt || '';
  const getTaskName = (taskId?: string) =>
    tasks.find((t) => t.id === taskId)?.title ?? (taskId ? 'Tarefa removida' : '—');

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-indigo-500" size={48} />
      </div>
    );
  }

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h2>Sessões de Pomodoro</h2>
          <p className={styles.subtitle}>
            Registre e acompanhe suas sessões de foco
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.refreshBtn}
            onClick={handleRefresh}
            disabled={!isConfigured || refreshing}
            title="Atualizar pomodoros"
          >
            <RefreshCw size={18} className={refreshing ? styles.spin : ''} />
            Atualizar
          </button>
          <button
            className={styles.newBtn}
            onClick={() => setShowModal(true)}
            disabled={!isConfigured}
          >
            <Plus size={18} /> Nova Sessão
          </button>
        </div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <motion.div
        className={styles.list}
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: { staggerChildren: 0.05 },
          },
        }}
      >
        <AnimatePresence mode="popLayout">
          {pomodoros.map((pom) => (
            <motion.div
              key={pom.id}
              className={styles.card}
              variants={{
                hidden: { opacity: 0, y: 10 },
                show: { opacity: 1, y: 0 },
              }}
              layout
            >
              <div className={styles.cardIcon}>
                <Clock size={24} />
              </div>
              <div className={styles.cardContent}>
                <div className={styles.cardHeader}>
                  <span className={styles.duration}>{pom.duration} min</span>
                  {pom.task_id && (
                    <span className={styles.taskTag}>{getTaskName(pom.task_id)}</span>
                  )}
                </div>
                <span className={styles.date}>
                  {getDate(pom)
                    ? new Date(getDate(pom)).toLocaleString('pt-BR')
                    : '—'}
                </span>
              </div>
              <button
                className={styles.deleteBtn}
                onClick={(e) => handleDelete(pom.id, e)}
                title="Excluir"
              >
                <Trash2 size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {pomodoros.length === 0 && !error && (
          <div className={styles.empty}>
            <Clock size={48} className={styles.emptyIcon} />
            <p>Nenhuma sessão de pomodoro registrada.</p>
            <p className={styles.emptyHint}>Clique em &quot;Nova Sessão&quot; para registrar.</p>
          </div>
        )}
      </motion.div>

      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Registrar Pomodoro</h3>
            <form onSubmit={handleCreate}>
              <div className={styles.formGroup}>
                <label>Duração (minutos)</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value) || 25)}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Tarefa (opcional)</label>
                <select
                  value={taskId}
                  onChange={(e) => setTaskId(e.target.value)}
                  className={styles.select}
                >
                  <option value="">Nenhuma</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" disabled={creating} className={styles.saveBtn}>
                  {creating ? 'Registrando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
