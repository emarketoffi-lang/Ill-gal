import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Lightbulb } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

export default function PropositionMissions() {
  const { user, role } = useAuth();
  const [items, setItems] = useState<Tables<"mission_proposals">[]>([]);
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tables<"mission_proposals"> | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("en_attente");

  const fetch_ = async () => {
    const { data } = await supabase.from("mission_proposals").select("*").order("created_at", { ascending: false });
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
    if (!title.trim() || !description.trim()) { toast.error("Tous les champs sont requis"); return; }
    if (editing) {
      const { error } = await supabase.from("mission_proposals").update({ title, description, status }).eq("id", editing.id);
      if (error) toast.error(error.message); else { toast.success("Mise à jour"); reset(); fetch_(); }
    } else {
      const { error } = await supabase.from("mission_proposals").insert({ title, description, status, user_id: user!.id });
      if (error) toast.error(error.message); else { toast.success("Proposition ajoutée"); reset(); fetch_(); }
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("mission_proposals").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Supprimé"); fetch_(); }
  };

  const reset = () => { setOpen(false); setEditing(null); setTitle(""); setDescription(""); setStatus("en_attente"); };
  const openEdit = (r: Tables<"mission_proposals">) => { setEditing(r); setTitle(r.title); setDescription(r.description); setStatus(r.status); setOpen(true); };

  const statusColor: Record<string, string> = {
    en_attente: "bg-yellow-500/20 text-yellow-400",
    approuvee: "bg-green-500/20 text-green-400",
    rejetee: "bg-red-500/20 text-red-400",
    effectuee: "bg-blue-500/20 text-blue-400",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-rajdhani tracking-wider flex items-center gap-2"><Lightbulb className="h-7 w-7 text-yellow-400" />Proposition Mission</h1>
          <p className="text-muted-foreground">Proposez et suivez les idées de missions</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Nouvelle</Button></DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle className="font-rajdhani text-xl">{editing ? "Modifier" : "Nouvelle proposition"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Titre de la mission" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-muted/50" />
              <Textarea placeholder="Description détaillée" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-muted/50 min-h-[150px]" />
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en_attente">En attente</SelectItem>
                  <SelectItem value="approuvee">Approuvée</SelectItem>
                  <SelectItem value="rejetee">Rejetée</SelectItem>
                  <SelectItem value="effectuee">Effectuée</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleSubmit} className="w-full">{editing ? "Modifier" : "Ajouter"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {(() => {
          // Group proposals by user_id
          const groupedByUser = items.reduce<Record<string, typeof items>>((acc, r) => {
            if (!acc[r.user_id]) acc[r.user_id] = [];
            acc[r.user_id].push(r);
            return acc;
          }, {});

          const userGroups = Object.entries(groupedByUser).sort((a, b) => {
            // Your own proposals first
            if (a[0] === user?.id) return -1;
            if (b[0] === user?.id) return 1;
            return 0;
          });

          if (userGroups.length === 0) {
            return <p className="text-muted-foreground text-center py-12">Aucune proposition</p>;
          }

          return (
            <Accordion type="single" collapsible className="space-y-2">
              {userGroups.map(([userId, userItems]) => (
                <AccordionItem key={userId} value={userId} className="border-border/50 bg-card/50 rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      <div>
                        <p className="font-semibold">{getCreatorLabel(userId)}</p>
                        <p className="text-xs text-muted-foreground">{userItems.length} proposition{userItems.length > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 mt-4">
                      {userItems.map((r) => (
                        <Card key={r.id} className="border-border/50 bg-card/80">
                          <CardHeader className="flex flex-row items-start justify-between pb-2">
                            <div>
                              <CardTitle className="font-rajdhani text-lg">{r.title}</CardTitle>
                              <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("fr-FR")}</p>
                            </div>
                            <Badge className={statusColor[r.status] ?? ""}>{r.status.replace("_", " ")}</Badge>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-3">{r.description}</p>
                            {(r.user_id === user?.id || role === "admin") && (
                              <div className="flex gap-1">
                                {r.user_id === user?.id && <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-3 w-3" /></Button>}
                                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(r.id)}><Trash2 className="h-3 w-3" /></Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          );
        })()}
      </div>
    </div>
  );
}
