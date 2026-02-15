import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Users, FileText, Vote, ArrowLeftRight, MessageCircle, Trash2, Shield, ChevronDown, Lock, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

type AppRole = "admin" | "responsable" | "membre";

interface Person {
  id: string;
  username: string;
  role: AppRole;
  discord_id?: string;
}

const cards = [
  { title: "Missions", desc: "Gérer vos Mission", icon: Target, url: "/mission", color: "text-primary" },
  { title: "Réunions", desc: "Dernières réunions du groupe", icon: Users, url: "/reunions", color: "text-blue-400" },
  { title: "Récapitulatif", desc: "Récapitulatif de session", icon: FileText, url: "/rapports", color: "text-green-400" },
  { title: "Entretiens", desc: "Candidatures & validation", icon: Vote, url: "/entretiens", color: "text-yellow-400" },
  { title: "Échanges", desc: "Registre des échanges", icon: ArrowLeftRight, url: "/echanges", color: "text-purple-400" },
  { title: "Discussion", desc: "Chat interne", icon: MessageCircle, url: "/discussion", color: "text-cyan-400" },
  { title: "Dissolutions", desc: "Historique des dissolutions", icon: Trash2, url: "/dissolutions", color: "text-orange-400" },
];

export default function Dashboard() {
  const { username, role } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("underworld_people");
    if (saved) {
      try {
        setPeople(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading people:", e);
      }
    }

    // Listen for custom updates from Admin component
    const handlePeopleUpdated = (event: Event) => {
      const customEvent = event as CustomEvent;
      setPeople(customEvent.detail);
    };

    window.addEventListener("peopleUpdated", handlePeopleUpdated);
    return () => window.removeEventListener("peopleUpdated", handlePeopleUpdated);
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-wider font-['Rajdhani']">
          Bienvenue, <span className="text-primary">{username}</span>
        </h1>
        <p className="text-muted-foreground mt-1">Tableau de bord — Pôle Gestion RP</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.title} to={c.url}>
            <Card className="border-border/50 bg-card/80 hover:bg-accent/30 hover:border-primary/30 transition-all cursor-pointer group">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className={`p-2 rounded-lg bg-muted/50 ${c.color} group-hover:scale-110 transition-transform`}>
                  <c.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg font-['Rajdhani']">{c.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{c.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="border-blue-500/30 bg-blue-500/5 backdrop-blur mt-8">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Hiérarchie des rôles
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
                  Gère les utilisateurs · Crée tout · Modifie tout · Supprime tout
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
                <p className="font-semibold text-sm">Créateur de contenu</p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <ClipboardList className="h-3 w-3" />
                  Crée Missions · Réunions · Entretiens · Récapitulatif
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
                  Visualise uniquement · Pas de création
                </p>
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                  {people.filter(p => p.role === "membre").length > 0 ? (
                    people.filter(p => p.role === "membre").map(p => (
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
