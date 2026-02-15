import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, RotateCcw } from "lucide-react";

interface DeletedEntretien {
  id: string;
  candidate_name: string;
  group_name?: string;
  summary: string;
  user_id: string;
  created_at: string;
  status: "en_attente" | "accepte" | "refuse";
  votes: any[];
  deleted_at: string;
  deleted_by: string;
}

export default function Corbeille() {
  const { user, role } = useAuth();
  const [items, setItems] = useState<DeletedEntretien[]>([]);

  const loadItems = () => {
    const saved = localStorage.getItem("underworld_corbeille");
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading corbeille:", e);
      }
    }
  };

  useEffect(() => {
    loadItems();

    const handleCorbeilleUpdated = (event: any) => {
      setItems(event.detail);
    };

    window.addEventListener("corbeilleUpdated", handleCorbeilleUpdated);
    return () => window.removeEventListener("corbeilleUpdated", handleCorbeilleUpdated);
  }, []);

  const handleRestore = (id: string) => {
    const itemToRestore = items.find((e) => e.id === id);
    if (!itemToRestore) return;

    // Restaurer dans Entretiens
    const entretiens = JSON.parse(localStorage.getItem("underworld_entretiens") ?? "[]");
    const restoredEntretien = {
      id: itemToRestore.id,
      candidate_name: itemToRestore.candidate_name,
      group_name: itemToRestore.group_name,
      summary: itemToRestore.summary,
      user_id: itemToRestore.user_id,
      created_at: itemToRestore.created_at,
      status: itemToRestore.status,
      votes: itemToRestore.votes,
    };
    entretiens.push(restoredEntretien);
    localStorage.setItem("underworld_entretiens", JSON.stringify(entretiens));
    window.dispatchEvent(new CustomEvent("entretienUpdated", { detail: entretiens }));

    // Supprimer de la corbeille
    const updated = items.filter((e) => e.id !== id);
    setItems(updated);
    localStorage.setItem("underworld_corbeille", JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("corbeilleUpdated", { detail: updated }));

    toast.success("Entretien restauré");
  };

  const handlePermanentDelete = (id: string) => {
    const updated = items.filter((e) => e.id !== id);
    setItems(updated);
    localStorage.setItem("underworld_corbeille", JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("corbeilleUpdated", { detail: updated }));
    toast.success("Suppression définitive");
  };

  const getStatusColor = (status: string) => {
    if (status === "accepte") return "bg-green-500/20 text-green-400";
    if (status === "refuse") return "bg-red-500/20 text-red-400";
    return "bg-yellow-500/20 text-yellow-400";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/15 border border-red-500/30">
          <Trash2 className="h-6 w-6 text-red-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-wider font-['Rajdhani']">CORBEILLE</h1>
          <p className="text-sm text-muted-foreground">Entretiens supprimés</p>
        </div>
      </div>

      <div className="space-y-4">
        {items.map((e) => (
          <Card key={e.id} className="border-border/50 bg-card/80">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div>
                <CardTitle className="font-['Rajdhani'] text-lg">{e.candidate_name}</CardTitle>
                {e.group_name && <p className="text-xs text-muted-foreground">Groupe: {e.group_name}</p>}
                <p className="text-xs text-muted-foreground">
                  Créé: {new Date(e.created_at).toLocaleDateString("fr-FR")} • Supprimé:
                  {new Date(e.deleted_at).toLocaleDateString("fr-FR")} par {e.deleted_by}
                </p>
              </div>
              <Badge className={getStatusColor(e.status)}>
                {e.status === "accepte" ? "Accepté" : e.status === "refuse" ? "Refusé" : "En attente"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{e.summary}</p>
              <div className="flex gap-2 pt-2 border-t border-border/50">
                {role === "admin" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => handleRestore(e.id)}>
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Restaurer
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handlePermanentDelete(e.id)}>
                      <Trash2 className="h-3 w-3 mr-1" />
                      Supprimer définitivement
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && <p className="text-muted-foreground text-center py-12">La corbeille est vide</p>}
      </div>
    </div>
  );
}
