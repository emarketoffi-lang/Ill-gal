import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Vote, ThumbsUp, ThumbsDown } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type EntretienWithVotes = Tables<"entretiens"> & { votes: Tables<"votes">[] };

export default function Entretiens() {
  const { user, role } = useAuth();
  const [items, setItems] = useState<EntretienWithVotes[]>([]);
  const [open, setOpen] = useState(false);
  const [candidateName, setCandidateName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [summary, setSummary] = useState("");

  const canCreate = role === "admin" || role === "responsable";
  const canVote = role === "admin" || role === "responsable";

  const fetch_ = async () => {
    const { data } = await supabase.from("entretiens").select("*, votes(*)").order("created_at", { ascending: false });
    if (data) setItems(data as EntretienWithVotes[]);
  };
  useEffect(() => { fetch_(); }, []);

  const handleSubmit = async () => {
    if (!candidateName.trim() || !summary.trim()) { toast.error("Champs requis"); return; }
    const { error } = await supabase.from("entretiens").insert({ candidate_name: candidateName, group_name: groupName || null, summary, user_id: user!.id });
    if (error) toast.error(error.message); else { toast.success("Entretien publié"); setOpen(false); setCandidateName(""); setGroupName(""); setSummary(""); fetch_(); }
  };

  const handleVote = async (entretienId: string, voteValue: boolean) => {
    const existing = items.find(e => e.id === entretienId)?.votes.find(v => v.user_id === user?.id);
    if (existing) {
      const { error } = await supabase.from("votes").update({ vote: voteValue }).eq("id", existing.id);
      if (error) toast.error(error.message); else fetch_();
    } else {
      const { error } = await supabase.from("votes").insert({ entretien_id: entretienId, user_id: user!.id, vote: voteValue });
      if (error) toast.error(error.message); else fetch_();
    }
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
          const yesCount = e.votes.filter(v => v.vote).length;
          const noCount = e.votes.filter(v => !v.vote).length;
          const myVote = e.votes.find(v => v.user_id === user?.id);
          const statusLabel = e.status === "en_attente" ? "En attente" : e.status === "accepte" ? "Accepté" : "Refusé";
          const statusClass = e.status === "accepte" ? "bg-green-500/20 text-green-400" : e.status === "refuse" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400";

          return (
            <Card key={e.id} className="border-border/50 bg-card/80">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="font-['Rajdhani'] text-lg">{e.candidate_name}</CardTitle>
                  {e.group_name && <p className="text-xs text-muted-foreground">Groupe: {e.group_name}</p>}
                  <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString("fr-FR")}</p>
                </div>
                <Badge className={statusClass}>{statusLabel}</Badge>
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
