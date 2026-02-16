import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield } from "lucide-react";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
      else toast.success("Connexion réussie");
    } else {
      if (!username.trim()) {
        toast.error("Le nom d'utilisateur est requis");
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { username: username.trim() },
        },
      });
      if (error) toast.error(error.message);
      else toast.success("Vérifiez votre email pour confirmer votre inscription");
    }
    setLoading(false);
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
              <Input
                placeholder="Nom d'utilisateur"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-muted/50 border-border"
              />
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
              onClick={() => setIsLogin(!isLogin)}
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
