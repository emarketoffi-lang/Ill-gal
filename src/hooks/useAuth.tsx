import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "responsable" | "assistant";

export interface LocalUser {
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
  loading: false,
  role: null,
  username: null,
  signOut: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  // Load from localStorage immediately (no loading needed)
  const [user, setUser] = useState<LocalUser | null>(() => {
    const stored = localStorage.getItem("currentUser");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    // Sync with Supabase if configured, but don't block rendering on it
    const supabaseConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    if (!supabaseConfigured) {
      return; // Just use localStorage
    }

    // Non-blocking Supabase sync
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Try to sync user data, but don't block if it fails
        supabase
          .from("profiles")
          .select("*")
          .eq("user_id", session.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile) {
              supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", session.user.id)
                .single()
                .then(({ data: roleData }) => {
                  if (roleData) {
                    const userData: LocalUser = {
                      id: session.user.id,
                      email: session.user.email || "",
                      username: profile.username,
                      discord_id: profile.discord_id || "",
                      avatar_url: profile.avatar_url || undefined,
                      role: (roleData.role as AppRole) || "assistant",
                    };
                    setUser(userData);
                    localStorage.setItem("currentUser", JSON.stringify(userData));
                  }
                })
                .catch((e) => console.warn("Role fetch error:", e));
            }
          })
          .catch((e) => console.warn("Profile fetch error:", e));
      }
    }).catch((e) => console.warn("Session fetch error:", e));
  }, []);

  const signOut = () => {
    setUser(null);
    localStorage.removeItem("currentUser");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading: false,
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
