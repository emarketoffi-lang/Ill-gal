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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Target } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const isMissingParticipantGroupColumn = (message?: string) =>
  typeof message === "string" &&
  message.includes("participant_group") &&
  message.includes("schema cache");

export default function Operations() {
  const { user, role } = useAuth();
  const [ops, setOps] = useState<Tables<"operations">[]>([]);
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tables<"operations"> | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [participantGroup, setParticipantGroup] = useState("");
  const [status, setStatus] = useState("en_cours");
  const [opDate, setOpDate] = useState("");

  const canCreate = role === "admin" || role === "responsable";

  const fetchOps = async () => {
    const { data } = await supabase.from("operations").select("*").order("created_at", { ascending: false });
    if (!data) return;

    setOps(data);

    const userIds = [...new Set(data.map((op) => op.user_id))];
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

  useEffect(() => { fetchOps(); }, []);

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error("Titre requis"); return; }
    if (editing) {
      const payload = {
        title,
        description,
        participant_group: participantGroup || null,
        status,
        operation_date: opDate || null,
      };

      const { error } = await supabase
        .from("operations")
        .update(payload)
        .eq("id", editing.id);

      if (error && isMissingParticipantGroupColumn(error.message)) {
        const { error: fallbackError } = await supabase
          .from("operations")
          .update({ title, description, status, operation_date: opDate || null })
          .eq("id", editing.id);

        if (fallbackError) {
          toast.error(fallbackError.message);
          return;
        }

        toast.success("Mis à jour (groupe participant en attente de migration DB)");
        setOpen(false);
        resetForm();
        fetchOps();
        return;
      }

      if (error) toast.error(error.message); else { toast.success("Mis à jour"); setOpen(false); resetForm(); fetchOps(); }
    } else {
      const payload = {
        title,
        description,
        participant_group: participantGroup || null,
        status,
        operation_date: opDate || null,
        user_id: user!.id,
      };

      const { error } = await supabase.from("operations").insert(payload);

      if (error && isMissingParticipantGroupColumn(error.message)) {
        const { error: fallbackError } = await supabase.from("operations").insert({
          title,
          description,
          status,
          operation_date: opDate || null,
          user_id: user!.id,
        });

        if (fallbackError) {
          toast.error(fallbackError.message);
          return;
        }

        toast.success("Opération créée (groupe participant en attente de migration DB)");
        setOpen(false);
        resetForm();
        fetchOps();
        return;
      }

      if (error) toast.error(error.message); else { toast.success("Opération créée"); setOpen(false); resetForm(); fetchOps(); }
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("operations").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Supprimé"); fetchOps(); }
  };

  const resetForm = () => { setTitle(""); setDescription(""); setParticipantGroup(""); setStatus("en_cours"); setOpDate(""); setEditing(null); };
  const openEdit = (op: Tables<"operations">) => {
    setEditing(op);
    setTitle(op.title);
    setDescription(op.description ?? "");
    setParticipantGroup(op.participant_group ?? "");
    setStatus(op.status);
    setOpDate(op.operation_date?.split("T")[0] ?? "");
    setOpen(true);
  };

  const statusColor: Record<string, string> = { en_cours: "bg-yellow-500/20 text-yellow-400", terminee: "bg-green-500/20 text-green-400", annulee: "bg-red-500/20 text-red-400" };
  const getCreatorLabel = (creatorId: string) => {
    if (creatorId === user?.id) return "Vous";
    return creatorNames[creatorId] ?? `${creatorId.slice(0, 8)}...`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-rajdhani tracking-wider flex items-center gap-2"><Target className="h-7 w-7 text-primary" />Mission</h1>
          <p className="text-muted-foreground">Gérez vos Mission</p>
        </div>
        {canCreate && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Nouvelle</Button></DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle className="font-rajdhani text-xl">{editing ? "Modifier" : "Nouvelle opération"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Titre" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-muted/50" />
                <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-muted/50" />
                <Input
                  placeholder="Groupe participant (ex: Families, Vagos...)"
                  value={participantGroup}
                  onChange={(e) => setParticipantGroup(e.target.value)}
                  className="bg-muted/50"
                />
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

      <div className="space-y-4">
        {(() => {
          // Group operations by user_id
          const groupedByUser = ops.reduce<Record<string, typeof ops>>((acc, op) => {
            if (!acc[op.user_id]) acc[op.user_id] = [];
            acc[op.user_id].push(op);
            return acc;
          }, {});

          const userGroups = Object.entries(groupedByUser).sort((a, b) => {
            // Your own operations first
            if (a[0] === user?.id) return -1;
            if (b[0] === user?.id) return 1;
            return 0;
          });

          if (userGroups.length === 0) {
            return <p className="text-muted-foreground text-center py-12">Aucune opération pour le moment</p>;
          }

          return (
            <Accordion type="single" collapsible className="space-y-2">
              {userGroups.map(([userId, userOps]) => (
                <AccordionItem key={userId} value={userId} className="border-border/50 bg-card/50 rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      <div>
                        <p className="font-semibold">{getCreatorLabel(userId)}</p>
                        <p className="text-xs text-muted-foreground">{userOps.length} opération{userOps.length > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-4 md:grid-cols-2 mt-4">
                      {userOps.map((op) => (
                        <Card key={op.id} className="border-border/50 bg-card/80">
                          <CardHeader className="flex flex-row items-start justify-between pb-2">
                            <div>
                              <CardTitle className="font-rajdhani text-lg">{op.title}</CardTitle>
                              <p className="text-xs text-muted-foreground">{new Date(op.created_at).toLocaleDateString("fr-FR")}</p>
                            </div>
                            <Badge className={statusColor[op.status] ?? ""}>{op.status.replace("_", " ")}</Badge>
                          </CardHeader>
                          <CardContent>
                            {op.description && <p className="text-sm text-muted-foreground mb-3">{op.description}</p>}
                            {op.participant_group && <p className="text-xs text-muted-foreground mb-1">👥 Groupe: {op.participant_group}</p>}
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
