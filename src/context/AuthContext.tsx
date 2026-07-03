import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api, hasApiKey, hasSession, type User } from '../services/api';

interface AuthContextType {
    user: User | null;
    login: (email: string, pass: string, rememberMe?: boolean) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const REMEMBER_EMAIL = 'register-life-remember-email';
// Legado: a senha não é mais persistida (a sessão se mantém via refresh
// token). A chave antiga é limpa para não deixar senha em texto puro.
const LEGACY_REMEMBER_PASSWORD = 'register-life-remember-password';

export function getRememberedCredentials(): { email: string; password: string } {
    return {
        email: localStorage.getItem(REMEMBER_EMAIL) || '',
        password: '',
    };
}

export function setRememberedCredentials(email: string, _password: string) {
    localStorage.setItem(REMEMBER_EMAIL, email);
    localStorage.removeItem(LEGACY_REMEMBER_PASSWORD);
}

export function clearRememberedCredentials() {
    localStorage.removeItem(REMEMBER_EMAIL);
    localStorage.removeItem(LEGACY_REMEMBER_PASSWORD);
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Só restaura o usuário se ainda existir uma sessão (JWT/refresh) ou,
        // no modo legado, uma API key — senão força novo login.
        const storedUser = localStorage.getItem('register-life-user');
        if (storedUser && (hasSession() || hasApiKey())) {
            try {
                setUser(JSON.parse(storedUser));
            } catch {
                localStorage.removeItem('register-life-user');
            }
        } else if (storedUser) {
            localStorage.removeItem('register-life-user');
        }
        // Higiene: remove senha persistida por versões antigas.
        localStorage.removeItem(LEGACY_REMEMBER_PASSWORD);
    }, []);

    const login = async (email: string, pass: string, rememberMe = false) => {
        setIsLoading(true);
        try {
            const userData = await api.login(email, pass);
            setUser(userData);
            localStorage.setItem('register-life-user', JSON.stringify(userData));
            if (rememberMe) {
                setRememberedCredentials(email, pass);
            } else {
                clearRememberedCredentials();
            }
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        api.logout().catch(() => {});
        setUser(null);
        localStorage.removeItem('register-life-user');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
