
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchGroups, type GroupsData } from "@/lib/groups";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import OrgChart from "@/components/OrgChart";

export default function GM() {
  const { data: groups = {} as GroupsData, isLoading } = useQuery({
    queryKey: ["gm-groups"],
    queryFn: fetchGroups,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <OrgChart />
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-rajdhani">GM</h1>
        <p className="text-muted-foreground mt-2">Gestion des groupes et leurs membres</p>
      </div>

      <div className="grid gap-6">
        {Object.entries(groups).map(([groupName, members]) => (
          <Card key={groupName} className="border-primary/20 bg-card/80">
            <CardHeader className="border-b border-primary/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl text-primary font-rajdhani">{groupName}</CardTitle>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span className="text-sm font-medium">{members.length}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {members.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">Aucun membre</p>
              ) : (
                <div className="space-y-2">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-md bg-accent/50 border border-primary/20"
                    >
                      <span className="font-medium">{member.name}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        Membre
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
