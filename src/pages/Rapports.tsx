import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, FileText, Pencil, Trash2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

export default function Rapports() {
  const { user, role } = useAuth();
  const [items, setItems] = useState<Tables<"rapports">[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tables<"rapports"> | null>(null);
  const [authorName, setAuthorName] = useState("");
  const [summary, setSummary] = useState("");

  const fetch_ = async () => {
    const { data } = await supabase.from("rapports").select("*").order("created_at", { ascending: false });
    if (data) setItems(data);
  };
  useEffect(() => { fetch_(); }, []);

  const handleSubmit = async () => {
    if (!authorName.trim() || !summary.trim()) { toast.error("Tous les champs sont requis"); return; }
    if (editing) {
      const { error } = await supabase.from("rapports").update({ author_name: authorName, summary }).eq("id", editing.id);
      if (error) toast.error(error.message); else { toast.success("Mis à jour"); reset(); fetch_(); }
    } else {
      const { error } = await supabase.from("rapports").insert({ author_name: authorName, summary, user_id: user!.id });
      if (error) toast.error(error.message); else { toast.success("Rapport ajouté"); reset(); fetch_(); }
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("rapports").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Supprimé"); fetch_(); }
  };

  const reset = () => { setOpen(false); setEditing(null); setAuthorName(""); setSummary(""); };
  const openEdit = (r: Tables<"rapports">) => { setEditing(r); setAuthorName(r.author_name); setSummary(r.summary); setOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-['Rajdhani'] tracking-wider flex items-center gap-2"><FileText className="h-7 w-7 text-green-400" />Rapports de session</h1>
          <p className="text-muted-foreground">Historique des rapports</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Ajouter</Button></DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle className="font-['Rajdhani'] text-xl">{editing ? "Modifier" : "Nouveau rapport"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Auteur" value={authorName} onChange={(e) => setAuthorName(e.target.value)} className="bg-muted/50" />
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
                <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("fr-FR")}</p>
              </div>
              {(r.user_id === user?.id || role === "admin") && (
                <div className="flex gap-1">
                  {r.user_id === user?.id && <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-3 w-3" /></Button>}
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
