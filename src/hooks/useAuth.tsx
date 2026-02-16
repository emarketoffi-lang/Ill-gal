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

    const loadUser = async (session = null) => {
      try {
        // Si pas de session passéé, charger depuis Supabase
        if (!session) {
          const { data } = await supabase.auth.getSession();
          session = data.session;
        }
        
        console.log("📡 [AUTH] Session:", session?.user?.id || "none");

        if (!session?.user?.id) {
          console.log("❌ No authenticated user");
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        // Charger profil + rôle en parallèle
        let { data: profile, error: pErr } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle();

        let { data: role, error: rErr } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle();

        console.log("📡 [AUTH] Profile:", profile?.username, "Role:", role?.role, "Errors:", pErr, rErr);

        if (mounted) {
          if (!profile) {
            console.log("⚠️ [AUTH] Creating missing profile for:", session.user.email);
            const { error: createProfileErr } = await supabase.from("profiles").insert({
              user_id: session.user.id,
              username: session.user.email?.split("@")[0] || "user",
            });
            console.log("Result:", createProfileErr ? "Error: " + createProfileErr.message : "✅ Profile created");
            
            // Recharger après création
            const result = await supabase
              .from("profiles")
              .select("*")
              .eq("user_id", session.user.id)
              .maybeSingle();
            profile = result.data;
          }

          if (!role) {
            console.log("⚠️ [AUTH] Creating missing role for:", session.user.id);
            const { error: createRoleErr } = await supabase.rpc("create_user_role", {
              p_user_id: session.user.id,
              p_role: "assistant",
            });
            console.log("Result:", createRoleErr ? "Error: " + createRoleErr.message : "✅ Role created");
            
            // Recharger après création
            const result = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", session.user.id)
              .maybeSingle();
            role = result.data;
          }

          if (profile && role) {
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
          } else {
            console.log("❌ [AUTH] Still missing profile or role after creation");
            setUser(null);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error("❌ [AUTH] Error:", err);
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    // Charger immédiatement au montage
    loadUser();

    // Puis écouter les changements
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("📡 [AUTH] Event:", event);
      
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        await loadUser(session);
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
