import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { User, LogOut, Mail, Hash } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  const getRoleBadge = (roleStr: string | null) => {
    switch (roleStr) {
      case "admin":
        return <Badge variant="destructive">Référents</Badge>;
      case "responsable":
        return <Badge variant="secondary">Responsable</Badge>;
      case "assistant":
        return <Badge variant="outline">Assistant</Badge>;
      default:
        return <Badge variant="outline">Utilisateur</Badge>;
    }
  };

  const handleLogout = () => {
    signOut();
    toast.success("Déconnecté");
    navigate("/auth");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/15 border border-primary/30">
          <User className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-wider font-['Rajdhani']">MON PROFIL</h1>
          <p className="text-sm text-muted-foreground">Vos informations personnelles</p>
        </div>
      </div>

      <Card className="border-border/50 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle>Informations du compte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-4 pb-6 border-b border-border/50">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.username}
                className="h-24 w-24 rounded-full border-2 border-primary/30"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-muted border-2 border-primary/30 flex items-center justify-center">
                <User className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
            <div className="text-center">
              <h2 className="text-xl font-bold">{user.username}</h2>
              {getRoleBadge(role)}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-mono">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
              <Hash className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">ID Discord</p>
                <p className="text-sm font-mono">{user.discord_id}</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/50">
            <Button
              onClick={handleLogout}
              variant="destructive"
              className="w-full flex items-center justify-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
