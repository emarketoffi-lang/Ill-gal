import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "responsable" | "assistant";

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
    // Check active sessions
    supabase.auth.getSession().then(async ({ data: { session } }) => {
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
            avatar_url: profile.avatar_url,
            role: (roleData.role as AppRole) || "assistant",
          });
        }
      }
      setLoading(false);
    });

    // Listen for auth state changes
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
            avatar_url: profile.avatar_url,
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
