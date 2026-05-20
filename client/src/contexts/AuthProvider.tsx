import { createContext, useState, type ReactNode } from 'react';

interface DiscordUser {
  id: string;
  username: string;
  avatar: string;
}

interface AuthContextType {
  userId: string;
  user: DiscordUser | null;
  setUserId: (id: string) => void;
  setUser: (user: DiscordUser) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = 'polly-user-id';
const USER_KEY = 'polly-user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserIdState] = useState<string>(() => localStorage.getItem(STORAGE_KEY) || '');
  const [user, setUserState] = useState<DiscordUser | null>(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  });

  const setUserId = (id: string) => {
    setUserIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  const setUser = (userData: DiscordUser) => {
    setUserState(userData);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setUserId(userData.id);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_KEY);
    setUserIdState('');
    setUserState(null);
  };

  return (
    <AuthContext.Provider value={{ userId, user, setUserId, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}