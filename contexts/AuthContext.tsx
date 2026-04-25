import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";
import type { User } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  setSession: (token: string, user: User | null) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  setSession: async () => {},
  logout: async () => {},
});

const TOKEN_KEY = "scouta_token";
const USER_KEY = "scouta_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function restore() {
      try {
        const savedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        const savedUser = await SecureStore.getItemAsync(USER_KEY);
        if (!cancelled && savedToken) {
          setToken(savedToken);
          if (savedUser) {
            try {
              setUser(JSON.parse(savedUser));
            } catch {}
          }
        }
      } catch {}
      if (!cancelled) setLoading(false);
    }
    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const setSession = useCallback(
    async (newToken: string, newUser: User | null) => {
      setToken(newToken);
      setUser(newUser);
      try {
        await SecureStore.setItemAsync(TOKEN_KEY, newToken);
        if (newUser) {
          await SecureStore.setItemAsync(USER_KEY, JSON.stringify(newUser));
        }
      } catch {}
    },
    []
  );

  const logout = useCallback(async () => {
    setToken(null);
    setUser(null);
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch {}
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, setSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
