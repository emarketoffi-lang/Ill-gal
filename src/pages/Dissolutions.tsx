import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Search } from "lucide-react";

interface Dissolution {
  id: string;
  group_name: string;
  reason: string;
  responsible_name: string;
  user_id: string;
  dissolution_date: string;
}

export default function Dissolutions() {
  const { user, role } = useAuth();
  const [items, setItems] = useState<Dissolution[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [reason, setReason] = useState("");
  const [responsibleName, setResponsibleName] = useState("");

  const canCreate = role === "admin" || role === "responsable";

  const loadItems = () => {
    const saved = localStorage.getItem("underworld_dissolutions");
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading dissolutions:", e);
      }
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleSubmit = () => {
    if (!groupName.trim() || !reason.trim() || !responsibleName.trim()) {
      toast.error("Champs requis");
      return;
    }

    const newDissolution: Dissolution = {
      id: Date.now().toString(),
      group_name: groupName,
      reason,
      responsible_name: responsibleName,
      user_id: user!.id,
      dissolution_date: new Date().toISOString(),
    };

    const updated = [...items, newDissolution];
    setItems(updated);
    localStorage.setItem("underworld_dissolutions", JSON.stringify(updated));

    toast.success("Dissolution enregistrée");
    setOpen(false);
    setGroupName("");
    setReason("");
    setResponsibleName("");
  };

  const handleDelete = (id: string) => {
    const updated = items.filter((d) => d.id !== id);
    setItems(updated);
    localStorage.setItem("underworld_dissolutions", JSON.stringify(updated));
    toast.success("Supprimé");
  };

  const filtered = items.filter((i) =>
    i.group_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-['Rajdhani'] tracking-wider flex items-center gap-2">
            <Trash2 className="h-7 w-7 text-orange-400" />
            Dissolutions
          </h1>
          <p className="text-muted-foreground">Historique des dissolutions de groupe</p>
        </div>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-1" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-['Rajdhani'] text-xl">Nouvelle dissolution</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  placeholder="Nom du groupe"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="bg-muted/50"
                />
                <Input
                  placeholder="Responsable"
                  value={responsibleName}
                  onChange={(e) => setResponsibleName(e.target.value)}
                  className="bg-muted/50"
                />
                <Textarea
                  placeholder="Motif RP"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="bg-muted/50"
                />
                <Button onClick={handleSubmit} className="w-full">
                  Enregistrer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filtrer par nom de groupe..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-muted/50"
        />
      </div>

      <div className="space-y-3">
        {filtered
          .sort(
            (a, b) =>
              new Date(b.dissolution_date).getTime() -
              new Date(a.dissolution_date).getTime()
          )
          .map((d) => (
            <Card key={d.id} className="border-border/50 bg-card/80">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="font-['Rajdhani'] text-lg text-primary">
                    {d.group_name}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    📅 {new Date(d.dissolution_date).toLocaleDateString("fr-FR")} •
                    Responsable: {d.responsible_name}
                  </p>
                </div>
                {(d.user_id === user?.id || role === "admin") && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => handleDelete(d.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{d.reason}</p>
              </CardContent>
            </Card>
          ))}
        {filtered.length === 0 && (
          <p className="text-muted-foreground text-center py-12">
            Aucune dissolution enregistrée
          </p>
        )}
      </div>
    </div>
  );
}
