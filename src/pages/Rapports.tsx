import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, FileText, Trash2 } from "lucide-react";

interface Rapport {
  id: string;
  author_name: string;
  summary: string;
  rapport_date: string;
  created_by: string;
  created_at: string;
}

export default function Rapports() {
  const { user, role } = useAuth();
  const [items, setItems] = useState<Rapport[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Rapport | null>(null);
  const [authorName, setAuthorName] = useState("");
  const [summary, setSummary] = useState("");
  const [rapportDate, setRapportDate] = useState(new Date().toISOString().split("T")[0]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("underworld_rapports");
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading rapports:", e);
      }
    }
  }, []);

  const handleSubmit = () => {
    if (!authorName.trim() || !summary.trim() || !rapportDate) {
      toast.error("Tous les champs sont requis");
      return;
    }

    if (editing) {
      const updated = items.map(r => r.id === editing.id ? { ...r, author_name: authorName, summary, rapport_date: rapportDate } : r);
      setItems(updated);
      localStorage.setItem("underworld_rapports", JSON.stringify(updated));
      toast.success("Mis à jour");
    } else {
      const newRapport: Rapport = {
        id: Date.now().toString(),
        author_name: authorName,
        summary,
        rapport_date: rapportDate,
        created_by: user!.username,
        created_at: new Date().toISOString(),
      };
      const updated = [newRapport, ...items];
      setItems(updated);
      localStorage.setItem("underworld_rapports", JSON.stringify(updated));
      toast.success("Rapport ajouté");
    }
    reset();
  };

  const handleDelete = (id: string) => {
    const updated = items.filter(r => r.id !== id);
    setItems(updated);
    localStorage.setItem("underworld_rapports", JSON.stringify(updated));
    toast.success("Supprimé");
  };

  const reset = () => {
    setOpen(false);
    setEditing(null);
    setAuthorName("");
    setSummary("");
    setRapportDate(new Date().toISOString().split("T")[0]);
  };

  const openEdit = (r: Rapport) => {
    setEditing(r);
    setAuthorName(r.author_name);
    setSummary(r.summary);
    setRapportDate(r.rapport_date);
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-['Rajdhani'] tracking-wider flex items-center gap-2"><FileText className="h-7 w-7 text-green-400" />Récapitulatif</h1>
          <p className="text-muted-foreground">Historique des récapitulatifs</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Ajouter</Button></DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle className="font-['Rajdhani'] text-xl">{editing ? "Modifier" : "Nouveau rapport"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Auteur" value={authorName} onChange={(e) => setAuthorName(e.target.value)} className="bg-muted/50" />
              <Input type="date" value={rapportDate} onChange={(e) => setRapportDate(e.target.value)} className="bg-muted/50" />
              <Textarea placeholder="Résumé détaillé" value={summary} onChange={(e) => setSummary(e.target.value)} className="bg-muted/50 min-h-[150px]" />
              <Button onClick={handleSubmit} className="w-full">{editing ? "Modifier" : "Ajouter"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {items.map((r) => (
          <Card key={r.id} className="border-border/50 bg-card/80">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div>
                <CardTitle className="font-['Rajdhani'] text-lg">{r.author_name}</CardTitle>
                <p className="text-xs text-muted-foreground">{r.created_by} • {new Date(r.rapport_date).toLocaleDateString("fr-FR")}</p>
              </div>
              {role === "admin" && (
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(r.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              )}
            </CardHeader>
            <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{r.summary}</p></CardContent>
          </Card>
        ))}
        {items.length === 0 && <p className="text-muted-foreground text-center py-12">Aucun rapport</p>}
      </div>
    </div>
  );
}
