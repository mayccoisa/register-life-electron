import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
  getApiKey,
  setApiKey as saveApiKey,
  hasApiKey,
  getApiKeyLastUpdated,
} from '../services/api';
import { useAuth } from './AuthContext';

interface ApiConfigContextType {
  apiKey: string;
  isConfigured: boolean;
  lastUpdated: string | null;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
}

const ApiConfigContext = createContext<ApiConfigContextType | undefined>(undefined);

export const ApiConfigProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [apiKey, setApiKeyState] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    setApiKeyState(getApiKey());
    setLastUpdated(getApiKeyLastUpdated());
  }, []);

  const setApiKey = (key: string) => {
    saveApiKey(key);
    setApiKeyState(key);
    setLastUpdated(getApiKeyLastUpdated());
  };

  const clearApiKey = () => {
    saveApiKey('');
    setApiKeyState('');
    setLastUpdated(null);
  };

  return (
    <ApiConfigContext.Provider
      value={{
        apiKey,
        // Autenticado por sessão (login) OU, no modo legado, por API key.
        isConfigured: isAuthenticated || hasApiKey(),
        lastUpdated,
        setApiKey,
        clearApiKey,
      }}
    >
      {children}
    </ApiConfigContext.Provider>
  );
};

export const useApiConfig = () => {
  const context = useContext(ApiConfigContext);
  if (!context) {
    throw new Error('useApiConfig must be used within an ApiConfigProvider');
  }
  return context;
};
