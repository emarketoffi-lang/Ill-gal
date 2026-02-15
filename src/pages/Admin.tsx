import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, AlertCircle, ChevronDown, Lock, ClipboardList, Users, Trash2 } from "lucide-react";
import { Navigate } from "react-router-dom";

type AppRole = "admin" | "responsable" | "assistant";

interface Person {
  id: string;
  username: string;
  role: AppRole;
  discord_id?: string;
}

interface User {
  id: string;
  email: string;
  username: string;
  discord_id: string;
  avatar_url?: string;
  role: AppRole;
}

export default function Admin() {
  const { role } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("assistant");

  // Protection: only admins can access this page
  if (role !== "admin") {
    return <Navigate to="/" replace />;
  }

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("underworld_people");
    if (saved) {
      try {
        setPeople(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading people:", e);
      }
    }

    // Load users
    const savedUsers = localStorage.getItem("underworld_users");
    if (savedUsers) {
      try {
        setUsers(JSON.parse(savedUsers));
      } catch (e) {
        console.error("Error loading users:", e);
      }
    }
  }, []);

  // Save to localStorage whenever people changes
  useEffect(() => {
    localStorage.setItem("underworld_people", JSON.stringify(people));
  }, [people]);

  const addPerson = () => {
    if (!newUsername.trim()) {
      toast.error("Le nom est requis");
      return;
    }

    const newPerson: Person = {
      id: Date.now().toString(),
      username: newUsername,
      role: newRole,
    };

    const updated = [...people, newPerson];
    setPeople(updated);
    localStorage.setItem("underworld_people", JSON.stringify(updated));
    
    // Dispatch custom event for other components to listen
    window.dispatchEvent(new CustomEvent("peopleUpdated", { detail: updated }));
    
    setNewUsername("");
    setNewRole("assistant");
    toast.success(`"${newUsername}" ajouté au rôle "${newRole}"`);
  };

  const removePerson = (id: string) => {
    const updated = people.filter(p => p.id !== id);
    setPeople(updated);
    localStorage.setItem("underworld_people", JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("peopleUpdated", { detail: updated }));
    toast.success("Supprimé");
  };

  const updatePersonRole = (id: string, newRole: AppRole) => {
    const updated = people.map(p => p.id === id ? { ...p, role: newRole } : p);
    setPeople(updated);
    localStorage.setItem("underworld_people", JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("peopleUpdated", { detail: updated }));
  };

  const updatePersonDiscordId = (id: string, discordId: string) => {
    const updated = people.map(p => p.id === id ? { ...p, discord_id: discordId || undefined } : p);
    setPeople(updated);
    localStorage.setItem("underworld_people", JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("peopleUpdated", { detail: updated }));
  };

  const updateUserRole = (userId: string, newRole: AppRole) => {
    const updated = users.map(u => u.id === userId ? { ...u, role: newRole } : u);
    setUsers(updated);
    localStorage.setItem("underworld_users", JSON.stringify(updated));
    toast.success("Rôle mis à jour");
  };

  const getRoleBadge = (roleStr: string) => {
    switch (roleStr) {
      case "admin":
        return <Badge variant="destructive">Référents</Badge>;
      case "responsable":
        return <Badge variant="secondary">Responsable</Badge>;
      default:
        return <Badge variant="outline">Assistant</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/15 border border-primary/30">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-wider font-['Rajdhani']">GESTION DES RÔLES</h1>
          <p className="text-sm text-muted-foreground">Gérez vos équipes</p>
        </div>
      </div>

      <Card className="border-border/50 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Ajouter une personne
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="Nom"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addPerson()}
              className="flex-1"
            />
            <Select value={newRole} onValueChange={(value) => setNewRole(value as AppRole)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assistant">Assistant</SelectItem>
                <SelectItem value="responsable">Responsable</SelectItem>
                <SelectItem value="admin">Référents</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={addPerson}>Ajouter</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Liste des personnes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {people.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Aucune personne ajoutée
            </div>
          ) : (
            <div className="space-y-2">
              {people.map((person) => (
                <div key={person.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="font-medium">{person.username}</span>
                    {person.discord_id && (
                      <span className="text-xs text-muted-foreground">🎮 {person.discord_id}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={person.role} onValueChange={(value) => updatePersonRole(person.id, value as AppRole)}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="assistant">Assistant</SelectItem>
                        <SelectItem value="responsable">Responsable</SelectItem>
                        <SelectItem value="admin">Référents</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePerson(person.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Membres connectés
          </CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Aucun membre
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50">
                  <div className="flex items-center gap-3 flex-1">
                    {user.avatar_url && (
                      <img src={user.avatar_url} alt={user.username} className="h-8 w-8 rounded-full" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{user.username}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <Select value={user.role} onValueChange={(value) => updateUserRole(user.id, value as AppRole)}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assistant">Assistant</SelectItem>
                      <SelectItem value="responsable">Responsable</SelectItem>
                      <SelectItem value="admin">Référents</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-blue-500/30 bg-blue-500/5 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Hiérarchie
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col space-y-3">
            {/* Référents */}
            <div className="flex items-start gap-3 p-3 rounded-lg border border-red-500/20 bg-red-500/5">
              <Badge variant="destructive" className="mt-1">Référents</Badge>
              <div className="flex-1">
                <p className="font-semibold text-sm">Accès complet</p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Gère tout
                </p>
                <div className="mt-2 space-y-1">
                  {people.filter(p => p.role === "admin").length > 0 ? (
                    people.filter(p => p.role === "admin").map(p => (
                      <p key={p.id} className="text-xs bg-black/20 px-2 py-1 rounded">
                        {p.username}
                      </p>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Aucun</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <ChevronDown className="h-6 w-6 text-muted-foreground/50" />
            </div>

            {/* Responsable */}
            <div className="flex items-start gap-3 p-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
              <Badge variant="secondary" className="mt-1">Responsable</Badge>
              <div className="flex-1">
                <p className="font-semibold text-sm">Créateur</p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <ClipboardList className="h-3 w-3" />
                  Crée du contenu
                </p>
                <div className="mt-2 space-y-1">
                  {people.filter(p => p.role === "responsable").length > 0 ? (
                    people.filter(p => p.role === "responsable").map(p => (
                      <p key={p.id} className="text-xs bg-black/20 px-2 py-1 rounded">
                        {p.username}
                      </p>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Aucun</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <ChevronDown className="h-6 w-6 text-muted-foreground/50" />
            </div>

            {/* Assistant */}
            <div className="flex items-start gap-3 p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
              <Badge variant="outline" className="mt-1">Assistant</Badge>
              <div className="flex-1">
                <p className="font-semibold text-sm">Accès en lecture</p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Visualise
                </p>
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                  {people.filter(p => p.role === "assistant").length > 0 ? (
                    people.filter(p => p.role === "assistant").map(p => (
                      <p key={p.id} className="text-xs bg-black/20 px-2 py-1 rounded">
                        {p.username}
                      </p>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Aucun</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
