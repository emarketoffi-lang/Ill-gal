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
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  role: null,
  username: null,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Load localStorage safely
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("currentUser");
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch {
          localStorage.removeItem("currentUser");
        }
      }
    }
  }, []);

  useEffect(() => {
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", session.user.id)
          .single();

        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .single();

        if (profile && roleData) {
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
      } catch (error) {
        console.warn("Auth sync error:", error);
      } finally {
        setLoading(false);
      }
    };

    initSession();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem("currentUser");
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
