import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, getRememberedCredentials } from '../context/AuthContext';
import styles from './Login.module.css';
import { Hexagon } from 'lucide-react';
import { motion } from 'framer-motion';

export const Login = () => {
    const { login, isLoading } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const { email: savedEmail, password: savedPassword } = getRememberedCredentials();
        if (savedEmail) {
            setEmail(savedEmail);
            setPassword(savedPassword);
            setRememberMe(true);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            await login(email, password, rememberMe);
            navigate('/');
        } catch (err) {
            setError(err instanceof Error && err.message ? err.message : 'Email ou senha inválidos');
        }
    };

    return (
        <div className={styles.loginContainer}>
            <motion.div
                className={styles.loginCard}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className={styles.title}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                        <div style={{ background: 'var(--primary-color)', padding: '12px', borderRadius: '12px' }}>
                            <Hexagon size={32} color="white" fill="white" fillOpacity={0.2} />
                        </div>
                    </div>
                    <h2>Bem-vindo</h2>
                    <p>Acesse o Register Life</p>
                </div>

                {error && <div className={styles.error}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="email">E-mail</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="user@demo.com"
                            autoFocus
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="password">Senha</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                        />
                    </div>

                    <div className={styles.rememberRow}>
                        <label className={styles.rememberLabel}>
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            Lembrar de mim
                        </label>
                    </div>

                    <button
                        type="submit"
                        className={styles.submitBtn}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Entrando...' : 'Entrar'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <p>Entre com a mesma conta do Register Life</p>
                </div>
            </motion.div>
        </div>
    );
};
