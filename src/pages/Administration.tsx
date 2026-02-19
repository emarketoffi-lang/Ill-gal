import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Shield, Crown, User, X, Plus } from "lucide-react";
import { useState } from "react";
import type { Database } from "@/integrations/supabase/types";
import { getGroupsFromSupabase, addMemberToGroupSupabase, removeMemberFromGroupSupabase, type GroupsData } from "@/lib/groups";

type AppRole = Database["public"]["Enums"]["app_role"];

const roleConfig: Record<AppRole, { label: string; icon: typeof Shield; color: string; badge: string }> = {
  admin: { label: "Référent", icon: Shield, color: "text-primary", badge: "destructive" },
  responsable: { label: "Responsable", icon: Crown, color: "text-yellow-500", badge: "secondary" },
  assistant: { label: "Assistant", icon: User, color: "text-muted-foreground", badge: "outline" },
};

export default function Administration() {
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedGroupForAdd, setSelectedGroupForAdd] = useState<string | null>(null);
  const [selectedUserForAdd, setSelectedUserForAdd] = useState<string | null>(null);

  const { data: groupMembers = {} } = useQuery({
    queryKey: ["gm-groups"],
    queryFn: getGroupsFromSupabase,
    enabled: role === "admin",
  });

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
        role: (rolesMap.get(p.user_id) ?? "assistant") as AppRole,
        isBanned: bannedMap.has(p.user_id),
        bannedReason: bannedMap.get(p.user_id)?.reason ?? null,
        bannedAt: bannedMap.get(p.user_id)?.banned_at ?? null,
      }));
    },
    enabled: role === "admin",
  });

  const handleAddUserToGroup = async (groupName: string) => {
    if (!selectedUserForAdd) return;
    const selectedUser = users?.find((u) => u.user_id === selectedUserForAdd);
    if (!selectedUser) return;
    
    try {
      await addMemberToGroupSupabase(groupName, { id: selectedUser.user_id, name: selectedUser.username });
      queryClient.invalidateQueries({ queryKey: ["gm-groups"] });
      queryClient.invalidateQueries({ queryKey: ["gm-groups-simple"] });
      setSelectedGroupForAdd(null);
      setSelectedUserForAdd(null);
      toast.success("Utilisateur ajouté au groupe");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRemoveUserFromGroup = async (groupName: string, userId: string) => {
    try {
      await removeMemberFromGroupSupabase(groupName, userId);
      queryClient.invalidateQueries({ queryKey: ["gm-groups"] });
      queryClient.invalidateQueries({ queryKey: ["gm-groups-simple"] });
      toast.success("Utilisateur retiré du groupe");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

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
        <p className="text-muted-foreground mt-1">Gérer les rôles, les bannissements et les groupes GM</p>
      </div>

      {/* Section Groupes GM */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold font-rajdhani">Gestion des groupes GM</h2>
        <div className="grid gap-4">
          {Object.entries(groupMembers).map(([groupName, members]) => (
            <Card key={groupName} className="border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-primary">{groupName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Liste des membres */}
                {members.length > 0 && (
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <span className="text-sm">{member.name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => handleRemoveUserFromGroup(groupName, member.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Ajouter un utilisateur */}
                {selectedGroupForAdd === groupName ? (
                  <div className="flex gap-2 pt-2 border-t">
                    <Select value={selectedUserForAdd || ""} onValueChange={setSelectedUserForAdd}>
                      <SelectTrigger className="flex-1 h-8 text-xs">
                        <SelectValue placeholder="Sélectionner un utilisateur" />
                      </SelectTrigger>
                      <SelectContent>
                        {users
                          ?.filter((u) => {
                            // Exclure les utilisateurs déjà dans un groupe
                            return !Object.values(groupMembers).some((members) =>
                              members.some((m) => m.id === u.user_id)
                            );
                          })
                          .map((u) => (
                            <SelectItem key={u.user_id} value={u.user_id}>
                              {u.username}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="default"
                      className="h-8"
                      onClick={() => handleAddUserToGroup(groupName)}
                    >
                      ✓
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        setSelectedGroupForAdd(null);
                        setSelectedUserForAdd(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full h-8 text-xs"
                    onClick={() => setSelectedGroupForAdd(groupName)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Ajouter un utilisateur
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="border-t pt-6">
        <h2 className="text-xl font-bold font-rajdhani mb-4">Gestion des utilisateurs</h2>
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
                          <SelectItem value="assistant">Assistant</SelectItem>
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
    </div>
  );
}
