import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

type AppRole = Database["public"]["Enums"]["app_role"];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: AppRole | null;
  username: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  role: null,
  username: null,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  const clearLocalAuthState = () => {
    setUser(null);
    setSession(null);
    setRole(null);
    setUsername(null);
  };

  const isMissingBannedUsersTable = (message?: string) =>
    typeof message === "string" &&
    (message.includes("public.banned_users") || message.includes("relation \"banned_users\" does not exist"));

  const enforceBanIfNeeded = async (userId: string) => {
    const { data, error } = await supabase
      .from("banned_users")
      .select("reason")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      if (isMissingBannedUsersTable(error.message)) return false;
      throw error;
    }

    if (!data) return false;

    await supabase.auth.signOut();
    clearLocalAuthState();
    toast.error(data.reason ? `Compte banni: ${data.reason}` : "Votre compte est banni.");
    return true;
  };

  const fetchUserData = async (userId: string) => {
    const banned = await enforceBanIfNeeded(userId);
    if (banned) return;

    const [roleRes, profileRes] = await Promise.all([
      supabase.rpc("get_user_role", { _user_id: userId }),
      supabase.from("profiles").select("username").eq("user_id", userId).single(),
    ]);
    if (roleRes.data) setRole(roleRes.data);
    if (profileRes.data) setUsername(profileRes.data.username);
  };

  useEffect(() => {
    const hydrateFromSession = async (nextSession: Session | null) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        try {
          await fetchUserData(nextSession.user.id);
        } catch (error: any) {
          toast.error(error?.message ?? "Erreur de chargement utilisateur");
        }
      } else {
        setRole(null);
        setUsername(null);
      }

      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setLoading(true);
      void hydrateFromSession(nextSession);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      void hydrateFromSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    clearLocalAuthState();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, role, username, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
