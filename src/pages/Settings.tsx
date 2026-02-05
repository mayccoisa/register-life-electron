import React, { useState } from 'react';
import { useApiConfig } from '../context/ApiConfigContext';
import styles from './Settings.module.css';
import { Save, Key, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

function formatLastUpdated(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const Settings = () => {
  const { setApiKey, isConfigured, lastUpdated } = useApiConfig();
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);

    const value = (e.target as HTMLFormElement).apiKey?.value?.trim();
    if (!value) {
      if (isConfigured) {
        setMessage({ type: 'success', text: 'Chave API mantida.' });
      } else {
        setMessage({ type: 'error', text: 'Informe a chave API.' });
      }
      setSaving(false);
      return;
    }

    try {
      setApiKey(value);
      setMessage({ type: 'success', text: 'Chave API salva com sucesso!' });
      setInputValue('');
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao salvar. Tente novamente.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.iconWrap}>
            <Key size={28} />
          </div>
          <h2>Configurações da API</h2>
          <p className={styles.subtitle}>
            Conecte-se ao Register Life informando sua chave API. Ela é armazenada localmente no seu computador.
          </p>

          <div className={styles.statusSection}>
            <div className={isConfigured ? styles.statusOk : styles.statusNotConfigured}>
              {isConfigured ? <CheckCircle size={20} /> : <XCircle size={20} />}
              <span>{isConfigured ? 'Chave API configurada' : 'Chave API não configurada'}</span>
            </div>
            {isConfigured && lastUpdated && (
              <p className={styles.lastUpdated}>
                Última atualização: {formatLastUpdated(lastUpdated)}
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="apiKey">
              Chave API
            </label>
            <input
              id="apiKey"
              name="apiKey"
              type="password"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                isConfigured
                  ? 'Deixe em branco para manter a chave atual'
                  : 'Cole sua chave API aqui'
              }
              className={styles.input}
              autoComplete="off"
            />
          </div>

          {message && (
            <div
              className={
                message.type === 'success' ? styles.messageSuccess : styles.messageError
              }
            >
              {message.type === 'success' ? (
                <CheckCircle size={18} />
              ) : (
                <AlertCircle size={18} />
              )}
              <span>{message.text}</span>
            </div>
          )}

          <button type="submit" className={styles.saveBtn} disabled={saving}>
            {saving ? (
              'Salvando...'
            ) : (
              <>
                <Save size={18} /> Salvar chave API
              </>
            )}
          </button>
        </form>

        {isConfigured && (
          <p className={styles.hint}>
            ✓ Chave API configurada. Para alterar, digite a nova chave acima e salve.
          </p>
        )}
      </div>
    </motion.div>
  );
};
