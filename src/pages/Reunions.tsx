import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Users, Trash2 } from "lucide-react";

interface Reunion {
  id: string;
  title: string;
  reunion_date: string;
  location?: string;
  participants?: string;
  summary?: string;
  user_id: string;
}

export default function Reunions() {
  const { user, role } = useAuth();
  const [items, setItems] = useState<Reunion[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [participants, setParticipants] = useState("");
  const [summary, setSummary] = useState("");

  const canCreate = role === "admin" || role === "responsable";

  const loadItems = () => {
    const saved = localStorage.getItem("underworld_reunions");
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading reunions:", e);
      }
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleSubmit = () => {
    if (!title.trim() || !date) {
      toast.error("Titre et date requis");
      return;
    }

    const newReunion: Reunion = {
      id: Date.now().toString(),
      title,
      reunion_date: date,
      location: location || undefined,
      participants: participants || undefined,
      summary: summary || undefined,
      user_id: user!.id,
    };

    const updated = [...items, newReunion];
    setItems(updated);
    localStorage.setItem("underworld_reunions", JSON.stringify(updated));

    toast.success("Réunion ajoutée");
    setOpen(false);
    setTitle("");
    setDate("");
    setLocation("");
    setParticipants("");
    setSummary("");
  };

  const handleDelete = (id: string) => {
    const updated = items.filter((r) => r.id !== id);
    setItems(updated);
    localStorage.setItem("underworld_reunions", JSON.stringify(updated));
    toast.success("Supprimé");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-['Rajdhani'] tracking-wider flex items-center gap-2">
            <Users className="h-7 w-7 text-blue-400" />
            Réunions
          </h1>
          <p className="text-muted-foreground">Historique des réunions du groupe</p>
        </div>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-1" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-['Rajdhani'] text-xl">Nouvelle réunion</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  placeholder="Titre"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-muted/50"
                />
                <Input
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-muted/50"
                />
                <Input
                  placeholder="Lieu"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="bg-muted/50"
                />
                <Input
                  placeholder="Participants (séparés par virgule)"
                  value={participants}
                  onChange={(e) => setParticipants(e.target.value)}
                  className="bg-muted/50"
                />
                <Textarea
                  placeholder="Compte rendu"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="bg-muted/50"
                />
                <Button onClick={handleSubmit} className="w-full">
                  Ajouter
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-4">
        {items
          .sort((a, b) => new Date(b.reunion_date).getTime() - new Date(a.reunion_date).getTime())
          .map((r) => (
            <Card key={r.id} className="border-border/50 bg-card/80">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="font-['Rajdhani'] text-lg">{r.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    📅 {new Date(r.reunion_date).toLocaleString("fr-FR")}
                  </p>
                </div>
                {(r.user_id === user?.id || role === "admin") && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => handleDelete(r.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {r.location && (
                  <p>
                    <span className="text-muted-foreground">Lieu:</span> {r.location}
                  </p>
                )}
                {r.participants && (
                  <p>
                    <span className="text-muted-foreground">Participants:</span> {r.participants}
                  </p>
                )}
                {r.summary && (
                  <p className="text-muted-foreground mt-2 whitespace-pre-wrap">{r.summary}</p>
                )}
              </CardContent>
            </Card>
          ))}
        {items.length === 0 && (
          <p className="text-muted-foreground text-center py-12">Aucune réunion enregistrée</p>
        )}
      </div>
    </div>
  );
}
