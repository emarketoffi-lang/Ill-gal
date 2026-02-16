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

  useEffect(() => {
    let mounted = true;

    const loadUser = async (session: any) => {
      if (!session?.user?.id) {
        console.log("❌ No authenticated user");
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        console.log("📡 [AUTH] Loading user:", session.user.id);

        // Charger profil + rôle en parallèle
        let { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle();

        let { data: role } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle();

        // Créer profile si manquant
        if (!profile) {
          console.log("⚠️ [AUTH] Creating missing profile");
          await supabase.from("profiles").insert({
            user_id: session.user.id,
            username: session.user.email?.split("@")[0] || "user",
          });
          
          const { data: newProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", session.user.id)
            .maybeSingle();
          profile = newProfile;

          // Recharger aussi le rôle car le trigger l'a peut-être créé
          const { data: newRole } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id)
            .maybeSingle();
          role = newRole;
        }

        // Créer rôle si manquant
        if (!role) {
          console.log("⚠️ [AUTH] Creating missing role");
          await supabase.rpc("create_user_role", {
            p_user_id: session.user.id,
            p_role: "assistant",
          });
          
          const { data: newRole } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id)
            .maybeSingle();
          role = newRole;
        }

        if (mounted && profile && role) {
          const userData: LocalUser = {
            id: session.user.id,
            email: session.user.email || "",
            username: profile.username,
            discord_id: profile.discord_id || "",
            avatar_url: profile.avatar_url || undefined,
            role: (role.role as AppRole) || "assistant",
          };
          console.log("✅ [AUTH] User loaded:", userData.username);
          setUser(userData);
        } else if (mounted) {
          console.log("❌ [AUTH] Profile or role still missing");
          setUser(null);
        }
      } catch (err) {
        console.error("❌ [AUTH] Error:", err);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // Écouter les changements
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("📡 [AUTH] Event:", event);
      
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
        loadUser(session);
      } else if (event === "SIGNED_OUT") {
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
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
