import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Shield, Crown, User } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const roleConfig: Record<AppRole, { label: string; icon: typeof Shield; color: string; badge: string }> = {
  admin: { label: "Référent", icon: Shield, color: "text-primary", badge: "destructive" },
  responsable: { label: "Responsable", icon: Crown, color: "text-yellow-500", badge: "secondary" },
  membre: { label: "Assistant", icon: User, color: "text-muted-foreground", badge: "outline" },
};

export default function Administration() {
  const { role, user } = useAuth();
  const queryClient = useQueryClient();

  const isMissingBannedUsersTable = (message?: string) =>
    typeof message === "string" &&
    (message.includes("public.banned_users") || message.includes("relation \"banned_users\" does not exist"));

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [profilesRes, rolesRes, bannedRes] = await Promise.all([
        supabase.from("profiles").select("user_id, username, avatar_url"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("banned_users").select("user_id, reason, banned_at"),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (bannedRes.error && !isMissingBannedUsersTable(bannedRes.error.message)) throw bannedRes.error;

      const rolesMap = new Map(rolesRes.data.map((r) => [r.user_id, r.role]));
      const bannedMap = new Map((bannedRes.data ?? []).map((b) => [b.user_id, b]));
      return profilesRes.data.map((p) => ({
        user_id: p.user_id,
        username: p.username,
        role: (rolesMap.get(p.user_id) ?? "membre") as AppRole,
        isBanned: bannedMap.has(p.user_id),
        bannedReason: bannedMap.get(p.user_id)?.reason ?? null,
        bannedAt: bannedMap.get(p.user_id)?.banned_at ?? null,
      }));
    },
    enabled: role === "admin",
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Rôle mis à jour");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const banUser = useMutation({
    mutationFn: async ({ targetUserId, reason }: { targetUserId: string; reason: string | null }) => {
      const { error } = await supabase.from("banned_users").upsert({
        user_id: targetUserId,
        reason,
        banned_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Utilisateur banni");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const unbanUser = useMutation({
    mutationFn: async (targetUserId: string) => {
      const { error } = await supabase.from("banned_users").delete().eq("user_id", targetUserId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Utilisateur débanni");
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Accès réservé aux administrateurs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-wider font-rajdhani">
          <Shield className="inline h-7 w-7 text-primary mr-2" />
          Administration
        </h1>
        <p className="text-muted-foreground mt-1">Gérer les rôles et les bannissements des membres</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-3">
          {users?.map((u) => {
            const cfg = roleConfig[u.role];
            return (
              <Card key={u.user_id} className="border-border/50 bg-card/80">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-muted/50 ${cfg.color}`}>
                      <cfg.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold font-rajdhani text-lg">{u.username}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant={cfg.badge as any} className="text-[10px] uppercase tracking-widest">
                          {cfg.label}
                        </Badge>
                        {u.isBanned && (
                          <Badge variant="destructive" className="text-[10px] uppercase tracking-widest">
                            Banni
                          </Badge>
                        )}
                      </div>
                      {u.isBanned && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {u.bannedReason ? `Raison: ${u.bannedReason}` : "Aucune raison"}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={u.role}
                      onValueChange={(val) => updateRole.mutate({ userId: u.user_id, newRole: val as AppRole })}
                    >
                      <SelectTrigger className="w-[160px] bg-muted/50 border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Référent</SelectItem>
                        <SelectItem value="responsable">Responsable</SelectItem>
                        <SelectItem value="membre">Assistant</SelectItem>
                      </SelectContent>
                    </Select>
                    {u.user_id !== user?.id && !u.isBanned && (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          const reason = window.prompt("Raison du ban (optionnel):")?.trim() ?? null;
                          banUser.mutate({ targetUserId: u.user_id, reason: reason || null });
                        }}
                      >
                        Ban
                      </Button>
                    )}
                    {u.user_id !== user?.id && u.isBanned && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => unbanUser.mutate(u.user_id)}
                      >
                        Unban
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
