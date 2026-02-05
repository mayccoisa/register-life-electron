import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type Task } from '../services/api';
import styles from './EditTask.module.css';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

export const EditTask = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Task['status']>('pending');

  useEffect(() => {
    const fetchTask = async () => {
      try {
        if (id) {
          const found = await api.getTask(id);
          if (found) {
            setTitle(found.title);
            setDescription(found.description ?? '');
            setStatus(found.status);
          } else {
            setError('Tarefa não encontrada');
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar tarefa');
      } finally {
        setLoading(false);
      }
    };
    fetchTask();
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setSaving(true);
    try {
      await api.updateTask(id, { title, description, status });
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar');
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className={styles.loading}>
        <Loader2 size={32} className={styles.spinner} />
      </div>
    );
  if (error)
    return (
      <div className={styles.errorState}>
        {error}
        <button onClick={() => navigate('/')} className={styles.backBtn}>
          Voltar
        </button>
      </div>
    );

  return (
    <div className={styles.editContainer}>
      <button
        onClick={() => navigate('/')}
        className={styles.backBtn}
      >
        <ArrowLeft size={16} /> Voltar ao Dashboard
      </button>

      <div className={styles.editCard}>
        <div className={styles.header}>
          <h2>Editar Tarefa</h2>
        </div>

        <form onSubmit={handleSave} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="title">
              Título
            </label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="status">
              Status
            </label>
            <select
              id="status"
              className={styles.select}
              value={status}
              onChange={(e) => setStatus(e.target.value as Task['status'])}
            >
              <option value="pending">Pendente</option>
              <option value="in-progress">Em andamento</option>
              <option value="completed">Concluída</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="description">
              Descrição
            </label>
            <textarea
              id="description"
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={() => navigate('/')}>
              Cancelar
            </button>
            <button type="submit" className={styles.saveBtn} disabled={saving}>
              {saving ? (
                <span className={styles.btnContent}>
                  <Loader2 size={16} className={styles.spinner} /> Salvando...
                </span>
              ) : (
                <span className={styles.btnContent}>
                  <Save size={16} /> Salvar
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
