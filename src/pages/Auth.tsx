import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [discordId, setDiscordId] = useState("");
  const [loading, setLoading] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState("");

  // Try to fetch Discord avatar when discordId changes
  const fetchDiscordAvatar = async (id: string) => {
    if (!id.trim()) return;
    try {
      const discriminator = parseInt(id) % 5;
      setAvatar(`https://cdn.discordapp.com/embed/avatars/${discriminator}.png`);
    } catch (e) {
      console.log("Could not fetch Discord avatar");
    }
  };

  const handleAvatarUrlChange = (url: string) => {
    setAvatarUrl(url);
    if (url.trim()) {
      setAvatar(url);
    }
  };

  const handleDiscordIdChange = (value: string) => {
    setDiscordId(value);
    if (value.trim()) {
      fetchDiscordAvatar(value);
    } else {
      setAvatar(null);
    }
  };

  const reset = () => {
    setEmail("");
    setPassword("");
    setUsername("");
    setDiscordId("");
    setAvatar(null);
    setAvatarUrl("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // Login avec Supabase Auth
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (error) {
          toast.error(error.message || "Erreur de connexion");
          setLoading(false);
          return;
        }

        toast.success("Connexion réussie");
        reset();
        
        // Attendre que le AuthProvider charge les données utilisateur
        setTimeout(() => {
          navigate("/");
        }, 300);
      } else {
        // Signup
        if (!username.trim()) {
          toast.error("Le nom d'utilisateur est requis");
          setLoading(false);
          return;
        }
        if (!discordId.trim()) {
          toast.error("L'ID Discord est requis");
          setLoading(false);
          return;
        }
        if (!email.trim() || !password.trim()) {
          toast.error("Email et mot de passe requis");
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          toast.error("Le mot de passe doit faire au moins 6 caractères");
          setLoading(false);
          return;
        }

        // Créer le compte Supabase
        const { error: signUpError, data: signUpData } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              username: username.trim(),
            },
          },
        });

        if (signUpError) {
          toast.error(signUpError.message || "Erreur lors de la création du compte");
          setLoading(false);
          return;
        }

        if (!signUpData.user) {
          toast.error("Erreur: impossible de créer le compte");
          setLoading(false);
          return;
        }

        // Créer le profil
        const { error: profileError } = await supabase.from("profiles").insert({
          user_id: signUpData.user.id,
          username: username.trim(),
          avatar_url: avatarUrl.trim() || avatar || undefined,
          discord_id: discordId.trim(),
        });

        if (profileError) {
          toast.error("Erreur lors de la création du profil");
          setLoading(false);
          return;
        }

        // Créer le rôle par défaut (assistant) via fonction RPC
        const { error: roleError } = await supabase.rpc("create_user_role", {
          p_user_id: signUpData.user.id,
          p_role: "assistant",
        });

        if (roleError) {
          console.error("Erreur lors de la création du rôle:", roleError);
        }

        toast.success("Compte créé avec succès");
        reset();
        setIsLogin(true);
      }
    } catch (error: any) {
      console.error("Erreur:", error);
      toast.error(error.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(0_72%_50%_/_0.08)_0%,_transparent_70%)]" />
      <Card className="relative z-10 w-full max-w-md border-border/50 bg-card/80 backdrop-blur glow-red">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 border border-primary/30">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-wider text-foreground font-['Rajdhani']">
            PÔLE GESTION RP
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {isLogin ? "Connectez-vous à votre espace" : "Créer un nouveau compte"}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <Input
                  placeholder="Nom d'utilisateur"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-muted/50 border-border"
                />
                <div className="space-y-2">
                  <Input
                    placeholder="ID Discord (ex: 123456789)"
                    value={discordId}
                    onChange={(e) => handleDiscordIdChange(e.target.value)}
                    className="bg-muted/50 border-border"
                  />
                  {avatar && (
                    <div className="flex items-center gap-2 p-2 rounded bg-muted/30 border border-border/50">
                      <img src={avatar} alt="Discord avatar" className="w-8 h-8 rounded-full" onError={() => setAvatar(null)} />
                      <p className="text-xs text-muted-foreground">Photo Discord détectée</p>
                    </div>
                  )}
                </div>
                <Input
                  placeholder="URL de ta photo (optionnel)"
                  value={avatarUrl}
                  onChange={(e) => handleAvatarUrlChange(e.target.value)}
                  className="bg-muted/50 border-border"
                />
              </>
            )}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-muted/50 border-border"
            />
            <Input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="bg-muted/50 border-border"
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Chargement..." : isLogin ? "Se connecter" : "S'inscrire"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                reset();
                setIsLogin(!isLogin);
              }}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
