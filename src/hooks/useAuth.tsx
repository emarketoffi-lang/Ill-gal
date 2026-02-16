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
  loading: true,
  role: null,
  username: null,
  signOut: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      // Check if Supabase is configured
      const supabaseConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      if (!supabaseConfigured) {
        // Fallback to localStorage if Supabase not configured
        const stored = localStorage.getItem("currentUser");
        if (stored) {
          try {
            setUser(JSON.parse(stored));
          } catch (e) {
            console.warn("Failed to parse stored user");
          }
        }
        setLoading(false);
        return;
      }

      // Check active sessions with Supabase
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Get profile data
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", session.user.id)
            .single();

          // Get role data
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id)
            .single();

          if (profile && roleData) {
            setUser({
              id: session.user.id,
              email: session.user.email || "",
              username: profile.username,
              discord_id: profile.discord_id || "",
              avatar_url: profile.avatar_url || undefined,
              role: (roleData.role as AppRole) || "assistant",
            });
          }
        }
      } catch (error) {
        console.warn("Supabase auth error, using localStorage fallback", error);
        const stored = localStorage.getItem("currentUser");
        if (stored) {
          try {
            setUser(JSON.parse(stored));
          } catch (e) {
            console.warn("Failed to parse stored user");
          }
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes (only if Supabase is configured)
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
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
          setUser({
            id: session.user.id,
            email: session.user.email || "",
            username: profile.username,
            discord_id: profile.discord_id || "",
            avatar_url: profile.avatar_url || undefined,
            role: (roleData.role as AppRole) || "assistant",
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
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
