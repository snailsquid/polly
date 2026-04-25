import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface AuthContextType {
  userId: string;
  setUserId: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = 'polly-user-id';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserIdState] = useState<string>('');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setUserIdState(stored);
    }
  }, []);

  const setUserId = (id: string) => {
    setUserIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  return (
    <AuthContext.Provider value={{ userId, setUserId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}