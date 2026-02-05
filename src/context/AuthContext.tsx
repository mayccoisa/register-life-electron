import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api, type User } from '../services/api';

interface AuthContextType {
    user: User | null;
    login: (email: string, pass: string, rememberMe?: boolean) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const REMEMBER_EMAIL = 'register-life-remember-email';
const REMEMBER_PASSWORD = 'register-life-remember-password';

export function getRememberedCredentials(): { email: string; password: string } {
    return {
        email: localStorage.getItem(REMEMBER_EMAIL) || '',
        password: localStorage.getItem(REMEMBER_PASSWORD) || '',
    };
}

export function setRememberedCredentials(email: string, password: string) {
    localStorage.setItem(REMEMBER_EMAIL, email);
    localStorage.setItem(REMEMBER_PASSWORD, password);
}

export function clearRememberedCredentials() {
    localStorage.removeItem(REMEMBER_EMAIL);
    localStorage.removeItem(REMEMBER_PASSWORD);
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('register-life-user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch {
                localStorage.removeItem('register-life-user');
            }
        }
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
