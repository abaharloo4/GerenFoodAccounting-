import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types/user';
import { apiBridge } from '../services/apiBridge';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (phoneNumber: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiBridge.getCurrentUser().then((currentUser) => {
      setUser(currentUser as User | null);
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });
  }, []);

  const login = async (phoneNumber: string, password: string) => {
    const res = await apiBridge.login(phoneNumber, password);
    if (res.success && res.user) {
      setUser(res.user as User);
      return { success: true };
    }
    return { success: false, error: res.error || 'شماره تماس یا رمز عبور اشتباه است.' };
  };

  const logout = async () => {
    await apiBridge.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
