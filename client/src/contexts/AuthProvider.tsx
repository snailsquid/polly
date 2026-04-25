import { createContext, useState, type ReactNode } from 'react';

interface AuthContextType {
  userId: string;
  setUserId: (id: string) => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = 'polly-user-id';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserIdState] = useState<string>(() => localStorage.getItem(STORAGE_KEY) || '');

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