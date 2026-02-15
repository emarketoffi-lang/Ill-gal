import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type AppRole = "admin" | "responsable" | "membre";

interface LocalUser {
  id: string;
  email: string;
  username: string;
  discord_id: string;
  avatar_url?: string;
  role: AppRole;
}

interface AuthContextType {
  user: LocalUser | null;
  loading: boolean;
  role: AppRole | null;
  username: string | null;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  role: null,
  username: null,
  signOut: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize default admin user if no users exist
    const users = localStorage.getItem("underworld_users");
    if (!users || JSON.parse(users).length === 0) {
      const defaultAdmin: LocalUser = {
        id: "admin_default",
        email: "admin@underworld.local",
        username: "Admin",
        discord_id: "0",
        role: "admin",
      };
      localStorage.setItem("underworld_users", JSON.stringify([{ ...defaultAdmin, password_hash: btoa("admin123") }]));
      localStorage.setItem("underworld_current_user", JSON.stringify(defaultAdmin));
      setUser(defaultAdmin);
      setLoading(false);
      return;
    }

    const saved = localStorage.getItem("underworld_current_user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading user:", e);
      }
    }
    setLoading(false);
  }, []);

  const signOut = () => {
    setUser(null);
    localStorage.removeItem("underworld_current_user");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        role: user?.role || null,
        username: user?.username || null,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
