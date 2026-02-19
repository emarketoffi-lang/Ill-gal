import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Users, FileText, Vote, ArrowLeftRight, MessageCircle, Trash2, Shield, Crown, User, MapPin, Lightbulb } from "lucide-react";
import { Link } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const allCards = [
  { title: "QG", desc: "Quartier Général", icon: MapPin, url: "/qg", color: "text-red-400" },
  { title: "Mission", desc: "Gérer vos Mission", icon: Target, url: "/operations", color: "text-primary" },
  { title: "Proposition Mission", desc: "Idées de missions", icon: Lightbulb, url: "/proposition-missions", color: "text-yellow-400" },
  { title: "Réunions", desc: "Dernières réunions du groupe", icon: Users, url: "/reunions", color: "text-blue-400" },
  { title: "Récapitulatif", desc: "Historique des Récapitulatif", icon: FileText, url: "/rapports", color: "text-green-400" },
  { title: "Entretiens", desc: "Candidatures & validation", icon: Vote, url: "/entretiens", color: "text-yellow-400" },
  { title: "Give", desc: "Historique des transferts Give", icon: ArrowLeftRight, url: "/echanges", color: "text-purple-400" },
  { title: "Discussion", desc: "COM DE 3ARBI", icon: MessageCircle, url: "/discussion", color: "text-cyan-400" },
  { title: "Dissolutions", desc: "Historique des dissolutions", icon: Trash2, url: "/dissolutions", color: "text-orange-400" },
  { title: "Administration", desc: "Gestion du système", icon: Shield, url: "/administration", color: "text-primary", adminOnly: true },
];

const roleIcon: Record<AppRole, typeof Shield> = { admin: Shield, responsable: Crown, assistant: User };
const roleColor: Record<AppRole, string> = { admin: "text-primary", responsable: "text-yellow-500", assistant: "text-muted-foreground" };
const roleBadge: Record<AppRole, string> = { admin: "destructive", responsable: "secondary", assistant: "outline" };
const roleOrder: AppRole[] = ["admin", "responsable", "assistant"];
const roleLabel: Record<AppRole, string> = { admin: "Référent", responsable: "Responsable", assistant: "Assistant" };

export default function Dashboard() {
  const { username, role } = useAuth();

  const { data: hierarchy } = useQuery({
    queryKey: ["hierarchy"],
    queryFn: async () => {
      const [profilesRes, rolesRes, bannedRes] = await Promise.all([
        supabase.from("profiles").select("user_id, username"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("banned_users").select("user_id"),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      // Collect banned user IDs (ignore error if table doesn't exist yet)
      const bannedIds = new Set(
        bannedRes.error ? [] : bannedRes.data.map((b) => b.user_id)
      );
      const rolesMap = new Map(rolesRes.data.map((r) => [r.user_id, r.role as AppRole]));
      const grouped: Record<AppRole, string[]> = { admin: [], responsable: [], assistant: [] };
      profilesRes.data
        .filter((p) => !bannedIds.has(p.user_id))
        .forEach((p) => {
          const r = rolesMap.get(p.user_id) ?? "assistant";
          grouped[r].push(p.username);
        });
      return grouped;
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-wider font-rajdhani">
          Bienvenue, <span className="text-primary">{username}</span>
        </h1>
        <p className="text-muted-foreground mt-1">Tableau de bord — Pôle Gestion RP</p>
      </div>

      {/* Hiérarchie */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <CardTitle className="text-xl font-rajdhani tracking-wider">Hiérarchie du Pôle</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {roleOrder.map((r) => {
              const Icon = roleIcon[r];
              const members = hierarchy?.[r] ?? [];
              return (
                <div key={r} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${roleColor[r]}`} />
                    <Badge variant={roleBadge[r] as any} className="text-[10px] uppercase tracking-widest">
                      {roleLabel[r]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">({members.length})</span>
                  </div>
                  <div className="space-y-1 pl-7">
                    {members.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">Aucun membre</p>
                    ) : (
                      members.map((name) => (
                        <p key={name} className="text-sm text-foreground">{name}</p>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {allCards
          .filter((c) => !('adminOnly' in c && c.adminOnly) || role === "admin")
          .map((c) => (
          <Link key={c.title} to={c.url}>
            <Card className="border-border/50 bg-card/80 hover:bg-accent/30 hover:border-primary/30 transition-all cursor-pointer group">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className={`p-2 rounded-lg bg-muted/50 ${c.color} group-hover:scale-110 transition-transform`}>
                  <c.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg font-rajdhani">{c.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{c.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
