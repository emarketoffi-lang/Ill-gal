import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Vote, ThumbsUp, ThumbsDown, Trash2, RotateCcw, X, MessageSquare } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type EntretienWithVotes = Tables<"entretiens"> & { votes: Tables<"votes">[] };
type EntretienAvis = Tables<"entretien_avis"> & { username: string };

export default function Entretiens() {
  const { user, role } = useAuth();
  const [items, setItems] = useState<EntretienWithVotes[]>([]);
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [candidateName, setCandidateName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [summary, setSummary] = useState("");
  const [avisOpen, setAvisOpen] = useState(false);
  const [selectedEntretien, setSelectedEntretien] = useState<EntretienWithVotes | null>(null);
  const [avisItems, setAvisItems] = useState<EntretienAvis[]>([]);
  const [avisText, setAvisText] = useState("");
  const [avisLoading, setAvisLoading] = useState(false);

  const isAdmin = role === "admin";
  const canCreate = isAdmin || role === "responsable";
  const canVote = isAdmin || role === "responsable";

  const fetch_ = async () => {
    const { data } = await supabase.from("entretiens").select("*, votes(*)").order("created_at", { ascending: false });
    if (!data) return;

    const entretiens = data as EntretienWithVotes[];
    setItems(entretiens);

    const userIds = [...new Set(entretiens.map((entretien) => entretien.user_id))];
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

  const activeItems = items.filter((e) => !e.deleted_at);
  const trashedItems = items.filter((e) => !!e.deleted_at);

  const isMissingAvisTable = (message?: string) =>
    typeof message === "string" &&
    (message.includes("public.entretien_avis") || message.includes("relation \"entretien_avis\" does not exist"));

  const fetchAvis = async (entretienId: string) => {
    setAvisLoading(true);

    const { data, error } = await supabase
      .from("entretien_avis")
      .select("*")
      .eq("entretien_id", entretienId)
      .order("created_at", { ascending: true });

    if (error) {
      if (isMissingAvisTable(error.message)) {
        setAvisItems([]);
        toast.error("Le module Avis n'est pas encore migré en base");
      } else {
        toast.error(error.message);
      }
      setAvisLoading(false);
      return;
    }

    const userIds = [...new Set((data ?? []).map((a) => a.user_id))];
    const { data: profiles } = userIds.length
      ? await supabase.from("profiles").select("user_id,username").in("user_id", userIds)
      : { data: [] as { user_id: string; username: string }[] };

    const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p.username]));
    const withUsernames = (data ?? []).map((a) => ({
      ...a,
      username: a.user_id === user?.id ? "Vous" : profileMap.get(a.user_id) ?? "Inconnu",
    }));

    setAvisItems(withUsernames);
    setAvisLoading(false);
  };

  const openAvis = (entretien: EntretienWithVotes) => {
    setSelectedEntretien(entretien);
    setAvisText("");
    setAvisOpen(true);
    void fetchAvis(entretien.id);
  };

  const handleSendAvis = async () => {
    if (!selectedEntretien || !user?.id) return;
    if (!avisText.trim()) {
      toast.error("Votre avis est vide");
      return;
    }

    const { error } = await supabase.from("entretien_avis").insert({
      entretien_id: selectedEntretien.id,
      user_id: user.id,
      content: avisText.trim(),
    });

    if (error) {
      if (isMissingAvisTable(error.message)) {
        toast.error("Le module Avis n'est pas encore migré en base");
        return;
      }
      toast.error(error.message);
      return;
    }

    setAvisText("");
    void fetchAvis(selectedEntretien.id);
  };

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

  const handleSoftDelete = async (id: string) => {
    const { error } = await supabase.from("entretiens").update({ deleted_at: new Date().toISOString() } as any).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Mis à la corbeille"); fetch_(); }
  };

  const handleRestore = async (id: string) => {
    const { error } = await supabase.from("entretiens").update({ deleted_at: null } as any).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Restauré"); fetch_(); }
  };

  const handlePermanentDelete = async (id: string) => {
    const { error } = await supabase.from("entretiens").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Supprimé définitivement"); fetch_(); }
  };

  const renderCard = (e: EntretienWithVotes, isTrashed: boolean) => {
    const yesCount = e.votes.filter(v => v.vote).length;
    const noCount = e.votes.filter(v => !v.vote).length;
    const myVote = e.votes.find(v => v.user_id === user?.id);
    const statusLabel = e.status === "en_attente" ? "En attente" : e.status === "accepte" ? "Accepté" : "Refusé";
    const statusClass = e.status === "accepte" ? "bg-green-500/20 text-green-400" : e.status === "refuse" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400";

    return (
      <Card key={e.id} className={`border-border/50 bg-card/80 ${isTrashed ? "opacity-70" : ""}`}>
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div>
            <CardTitle className="font-['Rajdhani'] text-lg">{e.candidate_name}</CardTitle>
            {e.group_name && <p className="text-xs text-muted-foreground">Groupe: {e.group_name}</p>}
            <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString("fr-FR")}</p>
            <p className="text-xs text-muted-foreground">Créé par: {getCreatorLabel(e.user_id)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusClass}>{statusLabel}</Badge>
            {isAdmin && !isTrashed && (
              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleSoftDelete(e.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            {isAdmin && isTrashed && (
              <>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-green-400" onClick={() => handleRestore(e.id)} title="Restaurer">
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handlePermanentDelete(e.id)} title="Supprimer définitivement">
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{e.summary}</p>
          {!isTrashed && (
            <div className="flex items-center gap-4 pt-2 border-t border-border/50">
              <div className="flex items-center gap-2">
                <Button size="sm" variant={myVote?.vote === true ? "default" : "outline"} onClick={() => canVote && handleVote(e.id, true)} disabled={!canVote} className="gap-1">
                  <ThumbsUp className="h-3 w-3" /> {yesCount}
                </Button>
                <Button size="sm" variant={myVote?.vote === false ? "destructive" : "outline"} onClick={() => canVote && handleVote(e.id, false)} disabled={!canVote} className="gap-1">
                  <ThumbsDown className="h-3 w-3" /> {noCount}
                </Button>
                <Button size="sm" variant="outline" onClick={() => openAvis(e)} className="gap-1">
                  <MessageSquare className="h-3 w-3" /> Avis
                </Button>
              </div>
              {!canVote && <span className="text-xs text-muted-foreground">Seuls les responsables peuvent voter</span>}
            </div>
          )}
        </CardContent>
      </Card>
    );
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

      {isAdmin ? (
        <Tabs defaultValue="active">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="active">Actifs ({activeItems.length})</TabsTrigger>
            <TabsTrigger value="trash" className="gap-1"><Trash2 className="h-3 w-3" />Corbeille ({trashedItems.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="space-y-4 mt-4">
            {activeItems.map((e) => renderCard(e, false))}
            {activeItems.length === 0 && <p className="text-muted-foreground text-center py-12">Aucun entretien</p>}
          </TabsContent>
          <TabsContent value="trash" className="space-y-4 mt-4">
            {trashedItems.map((e) => renderCard(e, true))}
            {trashedItems.length === 0 && <p className="text-muted-foreground text-center py-12">Corbeille vide</p>}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-4">
          {activeItems.map((e) => renderCard(e, false))}
          {activeItems.length === 0 && <p className="text-muted-foreground text-center py-12">Aucun entretien</p>}
        </div>
      )}

      <Dialog open={avisOpen} onOpenChange={setAvisOpen}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-['Rajdhani'] text-xl">Avis – {selectedEntretien?.candidate_name ?? "Entretien"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="max-h-72 overflow-y-auto space-y-2 rounded-md border border-border/50 p-3 bg-muted/20">
              {avisLoading ? (
                <p className="text-sm text-muted-foreground">Chargement…</p>
              ) : avisItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun avis pour le moment.</p>
              ) : (
                avisItems.map((avis) => (
                  <div key={avis.id} className="rounded-md border border-border/50 p-2 bg-background/70">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{avis.username}</span> · {new Date(avis.created_at).toLocaleString("fr-FR")}
                    </p>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{avis.content}</p>
                  </div>
                ))
              )}
            </div>

            <Textarea
              placeholder="Donnez votre avis sur cet entretien..."
              value={avisText}
              onChange={(e) => setAvisText(e.target.value)}
              className="bg-muted/50 min-h-[100px]"
            />
            <Button onClick={handleSendAvis} className="w-full">Envoyer l'avis</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
