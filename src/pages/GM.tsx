import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getGroupsSimple } from "@/lib/groups";
import { useState, useEffect } from "react";

export default function GM() {
  const [groups, setGroups] = useState<Record<string, string[]>>({});

  useEffect(() => {
    setGroups(getGroupsSimple());
  }, []);

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">GM</h1>
        <p className="text-muted-foreground mt-2">Gestion des groupes et leurs membres</p>
      </div>

      <div className="grid gap-6">
        {Object.entries(groups).map(([groupName, members]) => (
          <Card key={groupName} className="border-primary/20">
            <CardHeader className="border-b border-primary/20">
              <CardTitle className="text-xl text-primary">{groupName}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-2">
                {members.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Aucun membre</p>
                ) : (
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div key={member} className="flex items-center justify-between p-3 rounded-md bg-accent/50 border border-primary/20">
                        <span className="font-medium">{member}</span>
                        <Badge variant="secondary" className="text-[10px]">Membre</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
