import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Search } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

export default function Dissolutions() {
  const { user, role } = useAuth();
  const [items, setItems] = useState<Tables<"dissolutions">[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [reason, setReason] = useState("");
  const [responsibleName, setResponsibleName] = useState("");

  const canCreate = role === "admin" || role === "responsable";

  const fetch_ = async () => {
    const { data } = await supabase.from("dissolutions").select("*").order("dissolution_date", { ascending: false });
    if (data) setItems(data);
  };
  useEffect(() => { fetch_(); }, []);

  const handleSubmit = async () => {
    if (!groupName.trim() || !reason.trim() || !responsibleName.trim()) { toast.error("Champs requis"); return; }
    const { error } = await supabase.from("dissolutions").insert({ group_name: groupName, reason, responsible_name: responsibleName, user_id: user!.id });
    if (error) toast.error(error.message); else { toast.success("Dissolution enregistrée"); setOpen(false); setGroupName(""); setReason(""); setResponsibleName(""); fetch_(); }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("dissolutions").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Supprimé"); fetch_(); }
  };

  const filtered = items.filter(i => i.group_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-rajdhani tracking-wider flex items-center gap-2"><Trash2 className="h-7 w-7 text-orange-400" />Dissolutions</h1>
          <p className="text-muted-foreground">Historique des dissolutions de groupe</p>
        </div>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Ajouter</Button></DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle className="font-rajdhani text-xl">Nouvelle dissolution</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Nom du groupe" value={groupName} onChange={(e) => setGroupName(e.target.value)} className="bg-muted/50" />
                <Input placeholder="Responsable" value={responsibleName} onChange={(e) => setResponsibleName(e.target.value)} className="bg-muted/50" />
                <Textarea placeholder="Motif RP" value={reason} onChange={(e) => setReason(e.target.value)} className="bg-muted/50" />
                <Button onClick={handleSubmit} className="w-full">Enregistrer</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Filtrer par nom de groupe..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-muted/50" />
      </div>

      <div className="space-y-3">
        {filtered.map((d) => (
          <Card key={d.id} className="border-border/50 bg-card/80">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div>
                <CardTitle className="font-rajdhani text-lg text-primary">{d.group_name}</CardTitle>
                <p className="text-xs text-muted-foreground">📅 {new Date(d.dissolution_date).toLocaleDateString("fr-FR")} • Responsable: {d.responsible_name}</p>
              </div>
              {(d.user_id === user?.id || role === "admin") && (
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(d.id)}><Trash2 className="h-3 w-3" /></Button>
              )}
            </CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">{d.reason}</p></CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-muted-foreground text-center py-12">Aucune dissolution enregistrée</p>}
      </div>
    </div>
  );
}
