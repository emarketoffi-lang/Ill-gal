import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, RotateCcw, Trash2, Map } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Custom GTA-style red blip marker with house icon
const createBlipIcon = (color = "#dc2626") => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 52" width="40" height="52">
    <defs>
      <filter id="shadow" x="-20%" y="-10%" width="140%" height="130%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.4"/>
      </filter>
    </defs>
    <path d="M20 0C9 0 0 9 0 20c0 15 20 32 20 32s20-17 20-32C40 9 31 0 20 0z" fill="${color}" stroke="#7f1d1d" stroke-width="1.5" filter="url(#shadow)"/>
    <circle cx="20" cy="18" r="12" fill="rgba(0,0,0,0.25)"/>
    <path d="M20 10l-8 7h3v6h10v-6h3l-8-7z" fill="white"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "gta-blip-icon",
    iconSize: [40, 52],
    iconAnchor: [20, 52],
    popupAnchor: [0, -52],
  });
};

const createPendingIcon = () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 52" width="40" height="52">
    <defs>
      <filter id="shadow2" x="-20%" y="-10%" width="140%" height="130%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.4"/>
      </filter>
    </defs>
    <path d="M20 0C9 0 0 9 0 20c0 15 20 32 20 32s20-17 20-32C40 9 31 0 20 0z" fill="#f59e0b" stroke="#92400e" stroke-width="1.5" filter="url(#shadow2)">
      <animate attributeName="opacity" values="1;0.5;1" dur="1.2s" repeatCount="indefinite"/>
    </path>
    <circle cx="20" cy="18" r="12" fill="rgba(0,0,0,0.25)"/>
    <path d="M16 22v-4h-3l7-8 7 8h-3v4h-8z" fill="white"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "gta-blip-icon pending",
    iconSize: [40, 52],
    iconAnchor: [20, 52],
    popupAnchor: [0, -52],
  });
};

const blipIcon = createBlipIcon();
const pendingIcon = createPendingIcon();

// GTA V Map Tile Layers with proper coordinates
// Reference: https://github.com/42Courage/Storage
const MAP_STYLES = {
  satellite: {
    name: "Satellite",
    url: "https://cdn.jsdelivr.net/gh/42Courage/Storage@main/styleSatelite/{z}/{x}/{y}.webp",
  },
  atlas: {
    name: "Atlas",
    url: "https://cdn.jsdelivr.net/gh/42Courage/Storage@main/styleAtlas/{z}/{x}/{y}.webp",
  },
  grid: {
    name: "Grid",
    url: "https://cdn.jsdelivr.net/gh/42Courage/Storage@main/styleGrid/{z}/{x}/{y}.webp",
  },
};

const QG_TYPES = ["Gang", "Orga", "PF", "Special", "MC"] as const;
const QG_STATUSES = ["Actif", "Inactif"] as const;
const TYPE_COLORS: Record<string, string> = {
  Gang: "bg-red-500",
  Orga: "bg-red-400",
  PF: "bg-yellow-500",
  Special: "bg-blue-500",
  MC: "bg-purple-500",
};

export default function QG() {
  const { role, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = role === "admin";
  const canManage = role === "admin" || role === "responsable";

  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [addMode, setAddMode] = useState(false);
  const [mapStyle, setMapStyle] = useState<keyof typeof MAP_STYLES>("satellite");
  const [newQG, setNewQG] = useState({ name: "", type: "Gang", responsible_name: "" });
  const [pendingPos, setPendingPos] = useState<{ lat: number; lng: number } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Leaflet refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const pendingMarkerRef = useRef<L.Marker | null>(null);
  const addModeRef = useRef(addMode);

  const { data: qgs = [] } = useQuery({
    queryKey: ["qg"],
    queryFn: async () => {
      const { data, error } = await supabase.from("qg").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (qg: { name: string; type: string; responsible_name: string; pos_x: number; pos_y: number }) => {
      const { error } = await supabase.from("qg").insert({ ...qg, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qg"] });
      toast({ title: "QG ajouté" });
      setAddMode(false);
      setPendingPos(null);
      setDialogOpen(false);
      setNewQG({ name: "", type: "Gang", responsible_name: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("qg").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qg"] });
      toast({ title: "QG supprimé" });
    },
  });

  const filtered = useMemo(() => {
    return qgs.filter((q) => {
      if (filterType !== "all" && q.type !== filterType) return false;
      if (filterStatus !== "all" && q.status !== filterStatus) return false;
      return true;
    });
  }, [qgs, filterType, filterStatus]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    QG_TYPES.forEach((t) => (counts[t] = 0));
    qgs.forEach((q) => (counts[q.type] = (counts[q.type] || 0) + 1));
    return counts;
  }, [qgs]);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (!addModeRef.current) return;
    setPendingPos({ lat, lng });
    setDialogOpen(true);
  }, []);

  // Keep addModeRef in sync
  useEffect(() => {
    addModeRef.current = addMode;
  }, [addMode]);

  // Change map style
  const changeMapStyle = (style: keyof typeof MAP_STYLES) => {
    setMapStyle(style);
    if (tileLayerRef.current && mapRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
      const newLayer = L.tileLayer(MAP_STYLES[style].url, {
        minZoom: 0,
        maxZoom: 5,
        tms: false,
        noWrap: true,
      }).addTo(mapRef.current);
      tileLayerRef.current = newLayer;
    }
  };

  // Init map with GTA V tile layer
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, {
      crs: L.CRS.Simple,
      minZoom: 0,
      maxZoom: 5,
      zoom: 1,
      center: [128, 128],
    });

    // Add GTA V tile layer
    const tileLayer = L.tileLayer(MAP_STYLES[mapStyle].url, {
      minZoom: 0,
      maxZoom: 5,
      tms: false,
      noWrap: true,
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    // Set bounds for GTA V map (0-256 units)
    const bounds: L.LatLngBoundsExpression = [[0, 0], [256, 256]];
    map.fitBounds(bounds);

    markersRef.current = L.layerGroup().addTo(map);
    map.on("click", (e: L.LeafletMouseEvent) => {
      handleMapClick(e.latlng.lat, e.latlng.lng);
    });
    mapRef.current = map;

    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when filtered data changes
  useEffect(() => {
    if (!markersRef.current) return;
    markersRef.current.clearLayers();
    filtered.forEach((q) => {
      L.marker([q.pos_x, q.pos_y], { icon: blipIcon })
        .bindPopup(`<strong>${q.name}</strong><br/>${q.type} — ${q.status}<br/>Resp: ${q.responsible_name}`)
        .addTo(markersRef.current!);
    });
  }, [filtered]);

  // Pending marker
  useEffect(() => {
    if (pendingMarkerRef.current) {
      pendingMarkerRef.current.remove();
      pendingMarkerRef.current = null;
    }
    if (pendingPos && mapRef.current) {
      pendingMarkerRef.current = L.marker([pendingPos.lat, pendingPos.lng], { icon: pendingIcon }).addTo(mapRef.current);
    }
  }, [pendingPos]);

  const handleSubmit = () => {
    if (!pendingPos || !newQG.name || !newQG.responsible_name) return;
    createMutation.mutate({
      name: newQG.name,
      type: newQG.type,
      responsible_name: newQG.responsible_name,
      pos_x: pendingPos.lat,
      pos_y: pendingPos.lng,
    });
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] gap-0 -m-6">
      {/* Sidebar panel */}
      <div className="w-72 border-r border-border/50 bg-card/80 flex flex-col overflow-y-auto shrink-0">
        <div className="p-4 border-b border-border/50">
          <h2 className="text-lg font-bold font-['Rajdhani'] tracking-wider">Dashboard QG</h2>
          <p className="text-xs text-muted-foreground">Gestion Staff RP</p>
        </div>

        {/* Stats */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Répartition des Types</h3>
            <Badge variant="destructive" className="text-[10px]">{qgs.length} QG</Badge>
          </div>
          <div className="space-y-2">
            {QG_TYPES.map((t) => (
              <div key={t} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${TYPE_COLORS[t]}`} />
                  <span>{t}</span>
                </div>
                <span className="font-mono text-muted-foreground">{typeCounts[t]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-border/50 space-y-3">
          <h3 className="text-sm font-semibold">Filtres & Actions</h3>
          {canManage && (
            <Button
              size="sm"
              variant={addMode ? "destructive" : "default"}
              className="w-full"
              onClick={() => setAddMode(!addMode)}
            >
              <Plus className="h-4 w-4 mr-1" />
              {addMode ? "Annuler" : "Ajouter un QG"}
            </Button>
          )}
          <div>
            <Label className="text-xs text-muted-foreground">Version de carte</Label>
            <Select value={mapStyle} onValueChange={(v) => changeMapStyle(v as keyof typeof MAP_STYLES)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="satellite">Basique (jeu)</SelectItem>
                <SelectItem value="atlas">Atlas</SelectItem>
                <SelectItem value="grid">Grid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Type</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {QG_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Statut</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {QG_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" variant="outline" className="w-full" onClick={() => { setFilterType("all"); setFilterStatus("all"); }}>
            <RotateCcw className="h-3 w-3 mr-1" /> Reset
          </Button>
        </div>

        {/* QG List */}
        <div className="p-4 flex-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">QG Enregistrés</h3>
            <Badge variant="secondary" className="text-[10px]">{filtered.length} visibles</Badge>
          </div>
          <div className="space-y-2">
            {filtered.map((q) => (
              <div key={q.id} className="rounded-md border border-border/50 p-3 relative bg-background/50">
                <div className={`absolute top-2 right-2 h-2.5 w-2.5 rounded-full ${TYPE_COLORS[q.type] || "bg-muted"}`} />
                <p className="text-sm font-semibold">{q.name}</p>
                <p className="text-xs text-muted-foreground">{q.type} | {q.status}</p>
                <p className="text-xs text-muted-foreground">Resp: {q.responsible_name}</p>
                {canManage && (
                  <Button size="sm" variant="ghost" className="absolute bottom-1 right-1 h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(q.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
            {filtered.length === 0 && <p className="text-xs text-muted-foreground italic">Aucun QG</p>}
          </div>
        </div>
      </div>

      {/* Map area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-card/80">
          <h2 className="text-lg font-bold font-['Rajdhani'] tracking-wider">Carte Opérationnelle Los Santos</h2>
          <p className="text-xs text-muted-foreground">
            {addMode ? "Cliquez sur la carte pour placer un QG" : "Passez en mode ajout puis cliquez sur la carte pour placer un QG"}
          </p>
        </div>
        <div className="flex-1 relative min-h-0">
          <div ref={mapContainerRef} className="absolute inset-0" />
        </div>
      </div>

      {/* Dialog for new QG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau QG</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nom</Label>
              <Input value={newQG.name} onChange={(e) => setNewQG({ ...newQG, name: e.target.value })} placeholder="Nom du QG" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={newQG.type} onValueChange={(v) => setNewQG({ ...newQG, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {QG_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Responsable</Label>
              <Input value={newQG.responsible_name} onChange={(e) => setNewQG({ ...newQG, responsible_name: e.target.value })} placeholder="Nom du responsable" />
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={createMutation.isPending}>
              Confirmer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
