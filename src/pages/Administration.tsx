import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
  const { role } = useAuth();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("user_id, username, avatar_url"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const rolesMap = new Map(rolesRes.data.map((r) => [r.user_id, r.role]));
      return profilesRes.data.map((p) => ({
        user_id: p.user_id,
        username: p.username,
        role: (rolesMap.get(p.user_id) ?? "membre") as AppRole,
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
        <h1 className="text-3xl font-bold tracking-wider font-['Rajdhani']">
          <Shield className="inline h-7 w-7 text-primary mr-2" />
          Administration
        </h1>
        <p className="text-muted-foreground mt-1">Gérer les rôles des membres</p>
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
                      <p className="font-semibold font-['Rajdhani'] text-lg">{u.username}</p>
                      <Badge variant={cfg.badge as any} className="text-[10px] uppercase tracking-widest">
                        {cfg.label}
                      </Badge>
                    </div>
                  </div>
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
