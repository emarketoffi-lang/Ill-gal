import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Target } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

export default function Operations() {
  const { user, role } = useAuth();
  const [ops, setOps] = useState<Tables<"operations">[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tables<"operations"> | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("en_cours");
  const [opDate, setOpDate] = useState("");

  const canCreate = role === "admin" || role === "responsable";

  const fetchOps = async () => {
    const { data } = await supabase.from("operations").select("*").order("created_at", { ascending: false });
    if (data) setOps(data);
  };

  useEffect(() => { fetchOps(); }, []);

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error("Titre requis"); return; }
    if (editing) {
      const { error } = await supabase.from("operations").update({ title, description, status, operation_date: opDate || null }).eq("id", editing.id);
      if (error) toast.error(error.message); else { toast.success("Mis à jour"); setOpen(false); resetForm(); fetchOps(); }
    } else {
      const { error } = await supabase.from("operations").insert({ title, description, status, operation_date: opDate || null, user_id: user!.id });
      if (error) toast.error(error.message); else { toast.success("Opération créée"); setOpen(false); resetForm(); fetchOps(); }
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("operations").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Supprimé"); fetchOps(); }
  };

  const resetForm = () => { setTitle(""); setDescription(""); setStatus("en_cours"); setOpDate(""); setEditing(null); };
  const openEdit = (op: Tables<"operations">) => { setEditing(op); setTitle(op.title); setDescription(op.description ?? ""); setStatus(op.status); setOpDate(op.operation_date?.split("T")[0] ?? ""); setOpen(true); };

  const statusColor: Record<string, string> = { en_cours: "bg-yellow-500/20 text-yellow-400", terminee: "bg-green-500/20 text-green-400", annulee: "bg-red-500/20 text-red-400" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-['Rajdhani'] tracking-wider flex items-center gap-2"><Target className="h-7 w-7 text-primary" />Missions</h1>
          <p className="text-muted-foreground">Gérez vos Mission</p>
        </div>
        {canCreate && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Nouvelle</Button></DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle className="font-['Rajdhani'] text-xl">{editing ? "Modifier" : "Nouvelle opération"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Titre" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-muted/50" />
                <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-muted/50" />
                <Input type="date" value={opDate} onChange={(e) => setOpDate(e.target.value)} className="bg-muted/50" />
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en_cours">En cours</SelectItem>
                    <SelectItem value="terminee">Terminée</SelectItem>
                    <SelectItem value="annulee">Annulée</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleSubmit} className="w-full">{editing ? "Modifier" : "Créer"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {ops.map((op) => (
          <Card key={op.id} className="border-border/50 bg-card/80">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div>
                <CardTitle className="font-['Rajdhani'] text-lg">{op.title}</CardTitle>
                <p className="text-xs text-muted-foreground">{new Date(op.created_at).toLocaleDateString("fr-FR")}</p>
              </div>
              <Badge className={statusColor[op.status] ?? ""}>{op.status.replace("_", " ")}</Badge>
            </CardHeader>
            <CardContent>
              {op.description && <p className="text-sm text-muted-foreground mb-3">{op.description}</p>}
              {op.operation_date && <p className="text-xs text-muted-foreground">📅 {new Date(op.operation_date).toLocaleDateString("fr-FR")}</p>}
              {op.user_id === user?.id && (
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(op)}><Pencil className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(op.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {ops.length === 0 && <p className="text-muted-foreground col-span-2 text-center py-12">Aucune opération pour le moment</p>}
      </div>
    </div>
  );
}
