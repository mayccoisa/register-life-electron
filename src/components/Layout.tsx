import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, ListTodo, Clock, Settings } from 'lucide-react';
import styles from './Layout.module.css';

const navItems = [
  { path: '/', icon: ListTodo, label: 'Tarefas' },
  { path: '/pomodoro', icon: Clock, label: 'Pomodoro' },
  { path: '/settings', icon: Settings, label: 'Config' },
];

export const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div className={styles.brand} onClick={() => navigate('/')}>
          <span className={styles.logo}>RL</span>
          <span className={styles.title}>Register Life</span>
        </div>

        <nav className={styles.nav}>
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive =
              path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                title={label}
              >
                <Icon size={16} />
                <span className={styles.navLabel}>{label}</span>
              </button>
            );
          })}
        </nav>

        <div className={styles.actions}>
          <button
            onClick={handleLogout}
            className={styles.logoutBtn}
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
};
