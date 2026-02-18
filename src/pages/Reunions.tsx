import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Users, Trash2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

export default function Reunions() {
  const { user, role } = useAuth();
  const [items, setItems] = useState<Tables<"reunions">[]>([]);
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [participants, setParticipants] = useState("");
  const [summary, setSummary] = useState("");

  const canCreate = role === "admin" || role === "responsable";

  const fetch_ = async () => {
    const { data } = await supabase.from("reunions").select("*").order("reunion_date", { ascending: false });
    if (!data) return;

    setItems(data);

    const userIds = [...new Set(data.map((item) => item.user_id))];
    if (userIds.length === 0) {
      setCreatorNames({});
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id,username")
      .in("user_id", userIds);

    const names = (profiles ?? []).reduce<Record<string, string>>((acc, profile) => {
      acc[profile.user_id] = profile.username;
      return acc;
    }, {});

    setCreatorNames(names);
  };
  useEffect(() => { fetch_(); }, []);

  const getCreatorLabel = (creatorId: string) => {
    if (creatorId === user?.id) return "Vous";
    return creatorNames[creatorId] ?? `${creatorId.slice(0, 8)}...`;
  };

  const handleSubmit = async () => {
    if (!title.trim() || !date) { toast.error("Titre et date requis"); return; }
    const { error } = await supabase.from("reunions").insert({ title, reunion_date: date, location, participants, summary, user_id: user!.id });
    if (error) toast.error(error.message); else { toast.success("Réunion ajoutée"); setOpen(false); setTitle(""); setDate(""); setLocation(""); setParticipants(""); setSummary(""); fetch_(); }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("reunions").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Supprimé"); fetch_(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-rajdhani tracking-wider flex items-center gap-2"><Users className="h-7 w-7 text-blue-400" />Réunions</h1>
          <p className="text-muted-foreground">Historique des réunions du groupe</p>
        </div>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Ajouter</Button></DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle className="font-rajdhani text-xl">Nouvelle réunion</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Titre" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-muted/50" />
                <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="bg-muted/50" />
                <Input placeholder="Lieu" value={location} onChange={(e) => setLocation(e.target.value)} className="bg-muted/50" />
                <Input placeholder="Participants (séparés par virgule)" value={participants} onChange={(e) => setParticipants(e.target.value)} className="bg-muted/50" />
                <Textarea placeholder="Compte rendu" value={summary} onChange={(e) => setSummary(e.target.value)} className="bg-muted/50" />
                <Button onClick={handleSubmit} className="w-full">Ajouter</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-4">
        {items.map((r) => (
          <Card key={r.id} className="border-border/50 bg-card/80">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div>
                <CardTitle className="font-rajdhani text-lg">{r.title}</CardTitle>
                <p className="text-xs text-muted-foreground">📅 {new Date(r.reunion_date).toLocaleString("fr-FR")}</p>
                <p className="text-xs text-muted-foreground">Créée par: {getCreatorLabel(r.user_id)}</p>
              </div>
              {(r.user_id === user?.id || role === "admin") && (
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(r.id)}><Trash2 className="h-3 w-3" /></Button>
              )}
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {r.location && <p><span className="text-muted-foreground">Lieu:</span> {r.location}</p>}
              {r.participants && <p><span className="text-muted-foreground">Participants:</span> {r.participants}</p>}
              {r.summary && <p className="text-muted-foreground mt-2 whitespace-pre-wrap">{r.summary}</p>}
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && <p className="text-muted-foreground text-center py-12">Aucune réunion enregistrée</p>}
      </div>
    </div>
  );
}
