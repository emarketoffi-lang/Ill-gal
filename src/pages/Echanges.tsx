import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, ArrowLeftRight, Search, Trash2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

export default function Echanges() {
  const { user, role } = useAuth();
  const [items, setItems] = useState<Tables<"echanges">[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [donorName, setDonorName] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  const fetch_ = async () => {
    const { data } = await supabase.from("echanges").select("*").order("created_at", { ascending: false });
    if (data) setItems(data);
  };
  useEffect(() => { fetch_(); }, []);

  const handleSubmit = async () => {
    if (!donorName.trim() || !receiverName.trim() || !description.trim()) { toast.error("Champs requis"); return; }
    const { error } = await supabase.from("echanges").insert({ donor_name: donorName, receiver_name: receiverName, description, amount: amount || null, user_id: user!.id });
    if (error) toast.error(error.message); else { toast.success("Échange enregistré"); setOpen(false); setDonorName(""); setReceiverName(""); setDescription(""); setAmount(""); fetch_(); }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("echanges").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Supprimé"); fetch_(); }
  };

  const filtered = items.filter(i =>
    i.donor_name.toLowerCase().includes(search.toLowerCase()) ||
    i.receiver_name.toLowerCase().includes(search.toLowerCase()) ||
    i.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-rajdhani tracking-wider flex items-center gap-2"><ArrowLeftRight className="h-7 w-7 text-purple-400" />Registre des Give</h1>
          <p className="text-muted-foreground">Historique des transferts Give</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Ajouter</Button></DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle className="font-rajdhani text-xl">Nouvel échange</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Auteur / Donneur" value={donorName} onChange={(e) => setDonorName(e.target.value)} className="bg-muted/50" />
              <Input placeholder="Destinataire" value={receiverName} onChange={(e) => setReceiverName(e.target.value)} className="bg-muted/50" />
              <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-muted/50" />
              <Input placeholder="Montant / Quantité (optionnel)" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-muted/50" />
              <Button onClick={handleSubmit} className="w-full">Enregistrer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-muted/50" />
      </div>

      <div className="space-y-3">
        {filtered.map((e) => (
          <Card key={e.id} className="border-border/50 bg-card/80">
            <CardContent className="flex items-center justify-between py-4">
              <div className="space-y-1">
                <p className="text-sm font-medium"><span className="text-primary">{e.donor_name}</span> → <span className="text-green-400">{e.receiver_name}</span></p>
                <p className="text-sm text-muted-foreground">{e.description}</p>
                <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString("fr-FR")}{e.amount && ` • ${e.amount}`}</p>
              </div>
              {(e.user_id === user?.id || role === "admin") && (
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(e.id)}><Trash2 className="h-3 w-3" /></Button>
              )}
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-muted-foreground text-center py-12">Aucun échange trouvé</p>}
      </div>
    </div>
  );
}
