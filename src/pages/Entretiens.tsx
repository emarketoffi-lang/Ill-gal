import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Vote, ThumbsUp, ThumbsDown, Trash2 } from "lucide-react";
import { syncToSupabase } from "@/lib/supabaseSync";

interface VoteRecord {
  id: string;
  entretien_id: string;
  user_id: string;
  vote: boolean;
}

interface Entretien {
  id: string;
  candidate_name: string;
  group_name?: string;
  summary: string;
  user_id: string;
  username: string;
  created_at: string;
  status: "en_attente" | "accepte" | "refuse";
  votes: VoteRecord[];
}

export default function Entretiens() {
  const { user, role } = useAuth();
  const [items, setItems] = useState<Entretien[]>([]);
  const [open, setOpen] = useState(false);
  const [candidateName, setCandidateName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [summary, setSummary] = useState("");

  const canCreate = role === "admin" || role === "responsable";
  const canVote = role === "admin" || role === "responsable";

  const loadItems = () => {
    const saved = localStorage.getItem("underworld_entretiens");
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading entretiens:", e);
      }
    }
  };

  useEffect(() => {
    loadItems();

    const handleEntretienUpdated = (event: any) => {
      setItems(event.detail);
    };

    window.addEventListener("entretienUpdated", handleEntretienUpdated);
    return () => window.removeEventListener("entretienUpdated", handleEntretienUpdated);
  }, []);

  const handleSubmit = () => {
    if (!candidateName.trim() || !summary.trim()) {
      toast.error("Champs requis");
      return;
    }

    const newEntretien: Entretien = {
      id: Date.now().toString(),
      candidate_name: candidateName,
      group_name: groupName || undefined,
      summary,
      user_id: user!.id,
      username: user!.username,
      created_at: new Date().toISOString(),
      status: "en_attente",
      votes: [],
    };

    const updated = [...items, newEntretien];
    setItems(updated);
    localStorage.setItem("underworld_entretiens", JSON.stringify(updated));    syncToSupabase(\"entretiens\", newEntretien);    window.dispatchEvent(new CustomEvent("entretienUpdated", { detail: updated }));

    toast.success("Entretien publié");
    setOpen(false);
    setCandidateName("");
    setGroupName("");
    setSummary("");
  };

  const handleVote = (entretienId: string, voteValue: boolean) => {
    const updated = items.map((e) => {
      if (e.id === entretienId) {
        const existing = e.votes.find((v) => v.user_id === user?.id);
        if (existing) {
          return {
            ...e,
            votes: e.votes.map((v) => (v.id === existing.id ? { ...v, vote: voteValue } : v)),
          };
        } else {
          return {
            ...e,
            votes: [...e.votes, { id: Date.now().toString(), entretien_id: entretienId, user_id: user!.id, vote: voteValue }],
          };
        }
      }
      return e;
    });

    setItems(updated);
    localStorage.setItem("underworld_entretiens", JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("entretienUpdated", { detail: updated }));
  };

  const handleDelete = (id: string) => {
    const entretienToDelete = items.find((e) => e.id === id);
    
    // Supprimer l'entretien
    const updated = items.filter((e) => e.id !== id);
    setItems(updated);
    localStorage.setItem("underworld_entretiens", JSON.stringify(updated));
    syncToSupabase("entretiens", { id, deleted: true });
    window.dispatchEvent(new CustomEvent("entretienUpdated", { detail: updated }));

    // Ajouter à la corbeille
    if (entretienToDelete) {
      const corbeille = JSON.parse(localStorage.getItem("underworld_corbeille") ?? "[]");
      const deletedItem = {
        ...entretienToDelete,
        deleted_at: new Date().toISOString(),
        deleted_by: user?.username || "Admin",
      };
      corbeille.push(deletedItem);
      localStorage.setItem("underworld_corbeille", JSON.stringify(corbeille));
      window.dispatchEvent(new CustomEvent("corbeilleUpdated", { detail: corbeille }));
    }

    toast.success("Entretien supprimé");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-['Rajdhani'] tracking-wider flex items-center gap-2"><Vote className="h-7 w-7 text-yellow-400" />Entretiens & Validation</h1>
          <p className="text-muted-foreground">Candidatures et votes internes</p>
        </div>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Publier</Button></DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle className="font-['Rajdhani'] text-xl">Nouvel entretien</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Nom du candidat" value={candidateName} onChange={(e) => setCandidateName(e.target.value)} className="bg-muted/50" />
                <Input placeholder="Groupe (optionnel)" value={groupName} onChange={(e) => setGroupName(e.target.value)} className="bg-muted/50" />
                <Textarea placeholder="Résumé du dossier" value={summary} onChange={(e) => setSummary(e.target.value)} className="bg-muted/50 min-h-[120px]" />
                <Button onClick={handleSubmit} className="w-full">Publier</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-4">
        {items.map((e) => {
          const yesCount = e.votes.filter((v) => v.vote).length;
          const noCount = e.votes.filter((v) => !v.vote).length;
          const myVote = e.votes.find((v) => v.user_id === user?.id);
          const statusLabel = e.status === "en_attente" ? "En attente" : e.status === "accepte" ? "Accepté" : "Refusé";
          const statusClass = e.status === "accepte" ? "bg-green-500/20 text-green-400" : e.status === "refuse" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400";

          return (
            <Card key={e.id} className="border-border/50 bg-card/80">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="font-['Rajdhani'] text-lg">{e.candidate_name}</CardTitle>
                  {e.group_name && <p className="text-xs text-muted-foreground">Groupe: {e.group_name}</p>}
                  <p className="text-xs text-muted-foreground">{e.username} • {new Date(e.created_at).toLocaleDateString("fr-FR")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={statusClass}>{statusLabel}</Badge>
                  {role === "admin" && (
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(e.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{e.summary}</p>
                <div className="flex items-center gap-4 pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={myVote?.vote === true ? "default" : "outline"}
                      onClick={() => canVote && handleVote(e.id, true)}
                      disabled={!canVote}
                      className="gap-1"
                    >
                      <ThumbsUp className="h-3 w-3" /> {yesCount}
                    </Button>
                    <Button
                      size="sm"
                      variant={myVote?.vote === false ? "destructive" : "outline"}
                      onClick={() => canVote && handleVote(e.id, false)}
                      disabled={!canVote}
                      className="gap-1"
                    >
                      <ThumbsDown className="h-3 w-3" /> {noCount}
                    </Button>
                  </div>
                  {!canVote && <span className="text-xs text-muted-foreground">Seuls les responsables peuvent voter</span>}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {items.length === 0 && <p className="text-muted-foreground text-center py-12">Aucun entretien</p>}
      </div>
    </div>
  );
}
