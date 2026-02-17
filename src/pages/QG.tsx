import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, RotateCcw, Trash2, MapPin, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Tables } from "@/integrations/supabase/types";

/* ─────────────────────────────────────────────
   Constants
   ───────────────────────────────────────────── */

const QG_TYPES = ["Gang", "Orga", "PF", "Special", "MC"] as const;
const QG_STATUSES = ["Actif", "Inactif"] as const;

const TYPE_COLORS: Record<string, string> = {
  Gang: "bg-red-500",
  Orga: "bg-red-400",
  PF: "bg-yellow-500",
  Special: "bg-blue-500",
  MC: "bg-purple-500",
};

const MAP_STYLES = {
  satellite: {
    label: "Basique (jeu)",
    url: "https://cdn.jsdelivr.net/gh/42Courage/Storage@main/styleSatelite/{z}/{x}/{y}.webp",
  },
  atlas: {
    label: "Atlas",
    url: "https://cdn.jsdelivr.net/gh/42Courage/Storage@main/styleAtlas/{z}/{x}/{y}.webp",
  },
  grid: {
    label: "Grid",
    url: "https://cdn.jsdelivr.net/gh/42Courage/Storage@main/styleGrid/{z}/{x}/{y}.webp",
  },
} as const;

type MapStyleKey = keyof typeof MAP_STYLES;

/* ─────────────────────────────────────────────
   Leaflet Icons (SVG inline)
   ───────────────────────────────────────────── */

const makeIcon = (fill: string, stroke: string, innerPath: string, animate = false) => {
  const animTag = animate
    ? `<animate attributeName="opacity" values="1;0.5;1" dur="1.2s" repeatCount="indefinite"/>`
    : "";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 52" width="36" height="46">
      <defs><filter id="ds"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity=".4"/></filter></defs>
      <path d="M20 0C9 0 0 9 0 20c0 15 20 32 20 32s20-17 20-32C40 9 31 0 20 0z"
            fill="${fill}" stroke="${stroke}" stroke-width="1.5" filter="url(#ds)">${animTag}</path>
      <circle cx="20" cy="18" r="11" fill="rgba(0,0,0,.2)"/>
      ${innerPath}
    </svg>`;
  return L.divIcon({
    html: svg,
    className: "gta-blip",
    iconSize: [36, 46],
    iconAnchor: [18, 46],
    popupAnchor: [0, -46],
  });
};

const BLIP_ICON = makeIcon("#dc2626", "#7f1d1d", `<path d="M20 10l-8 7h3v6h10v-6h3z" fill="#fff"/>`);
const PENDING_ICON = makeIcon("#f59e0b", "#92400e", `<path d="M16 22v-4h-3l7-8 7 8h-3v4z" fill="#fff"/>`, true);

/* ─────────────────────────────────────────────
   Map helpers
   ───────────────────────────────────────────── */

const MAP_BOUNDS: L.LatLngBoundsExpression = [[0, 0], [256, 256]];

// transparent 1x1 fallback tile to avoid broken-image icons
const EMPTY_TILE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

const createTileLayer = (style: MapStyleKey) =>
  L.tileLayer(MAP_STYLES[style].url, {
    minZoom: 0,
    maxZoom: 5,
    tms: false,
    noWrap: true,
    errorTileUrl: EMPTY_TILE,
  });

const SUPABASE_PROJECT_REF = (() => {
  try {
    return new URL(import.meta.env.VITE_SUPABASE_URL).hostname.split(".")[0] ?? "unknown";
  } catch {
    return "unknown";
  }
})();

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.length > 0) return maybeMessage;
  }
  return "Erreur inconnue";
};

/* ─────────────────────────────────────────────
   Component
   ───────────────────────────────────────────── */

export default function QG() {
  const { role, user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const canManage = role === "admin" || role === "responsable";

  /* ── State ── */
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [mapStyle, setMapStyle] = useState<MapStyleKey>("satellite");
  const [addMode, setAddMode] = useState(false);
  const [pendingPos, setPendingPos] = useState<{ lat: number; lng: number } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "Gang", responsible_name: "" });

  /* ── Leaflet refs ── */
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const pendingRef = useRef<L.Marker | null>(null);
  const addModeRef = useRef(addMode);

  useEffect(() => {
    addModeRef.current = addMode;
    if (!addMode) clearPending();
  }, [addMode]);

  /* ── Data ── */
  const { data: qgs = [], error: qgError } = useQuery<Tables<"qg">[]>({
    queryKey: ["qg"],
    queryFn: async () => {
      const { data, error } = await supabase.from("qg").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    retry: false,
  });

  useEffect(() => {
    if (!qgError) return;
    const message = getErrorMessage(qgError);
    console.error("[QG] query error", qgError);
    toast({
      title: "Erreur QG",
      description: `${message} (projet: ${SUPABASE_PROJECT_REF})`,
      variant: "destructive",
    });
  }, [qgError, toast]);

  const createMutation = useMutation({
    mutationFn: async (p: { name: string; type: string; responsible_name: string; pos_x: number; pos_y: number }) => {
      const { error } = await supabase.from("qg").insert({ ...p, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["qg"] });
      toast({ title: "QG ajouté avec succès" });
      resetAll();
    },
    onError: (e) => {
      console.error("[QG] create error", e);
      toast({
        title: "Erreur",
        description: `${getErrorMessage(e)} (projet: ${SUPABASE_PROJECT_REF})`,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("qg").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["qg"] }); toast({ title: "QG supprimé" }); },
    onError: (e) => {
      console.error("[QG] delete error", e);
      toast({
        title: "Erreur",
        description: `${getErrorMessage(e)} (projet: ${SUPABASE_PROJECT_REF})`,
        variant: "destructive",
      });
    },
  });

  /* ── Derived ── */
  const filtered = useMemo(() =>
    qgs.filter((q) =>
      (filterType === "all" || q.type === filterType) &&
      (filterStatus === "all" || q.status === filterStatus)
    ), [qgs, filterType, filterStatus]);

  const typeCounts = useMemo(() => {
    const c: Record<string, number> = {};
    QG_TYPES.forEach((t) => (c[t] = 0));
    qgs.forEach((q) => (c[q.type] = (c[q.type] || 0) + 1));
    return c;
  }, [qgs]);

  /* ── Helpers ── */
  const clearPending = useCallback(() => {
    pendingRef.current?.remove();
    pendingRef.current = null;
    setPendingPos(null);
  }, []);

  const resetAll = useCallback(() => {
    clearPending();
    setAddMode(false);
    setDialogOpen(false);
    setForm({ name: "", type: "Gang", responsible_name: "" });
  }, [clearPending]);

  /* ── Map click ── */
  const onMapClick = useCallback((e: L.LeafletMouseEvent) => {
    if (!addModeRef.current || !mapRef.current) return;
    pendingRef.current?.remove();
    const { lat, lng } = e.latlng;
    pendingRef.current = L.marker([lat, lng], { icon: PENDING_ICON }).addTo(mapRef.current);
    setPendingPos({ lat, lng });
  }, []);

  const confirmPosition = () => setDialogOpen(true);
  const cancelPosition = () => clearPending();

  const handleSubmit = () => {
    if (!pendingPos || !form.name.trim() || !form.responsible_name.trim()) {
      toast({ title: "Remplissez tous les champs", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      name: form.name.trim(),
      type: form.type,
      responsible_name: form.responsible_name.trim(),
      pos_x: pendingPos.lat,
      pos_y: pendingPos.lng,
    });
  };

  const changeStyle = (style: MapStyleKey) => {
    setMapStyle(style);
    if (!mapRef.current) return;
    if (tileRef.current) mapRef.current.removeLayer(tileRef.current);
    tileRef.current = createTileLayer(style).addTo(mapRef.current);
  };

  /* ── Init map ── */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      crs: L.CRS.Simple,
      minZoom: 0,
      maxZoom: 5,
      zoom: 2,
      center: [128, 128],
      zoomControl: true,
      scrollWheelZoom: true,
      attributionControl: false,
      zoomSnap: 0,
      wheelPxPerZoomLevel: 100,
    });

    tileRef.current = createTileLayer("satellite").addTo(map);
    map.fitBounds(MAP_BOUNDS, { animate: false, maxZoom: 2 });
    markersRef.current = L.layerGroup().addTo(map);
    map.on("click", onMapClick);
    mapRef.current = map;

    requestAnimationFrame(() => {
      map.invalidateSize();
    });

    return () => {
      map.off("click", onMapClick);
      map.remove();
      mapRef.current = null;
      tileRef.current = null;
      markersRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !containerRef.current) return;

    const map = mapRef.current;
    const refresh = () => map.invalidateSize();
    window.addEventListener("resize", refresh);
    const timeoutId = window.setTimeout(refresh, 80);

    return () => {
      window.removeEventListener("resize", refresh);
      window.clearTimeout(timeoutId);
    };
  }, []);

  /* ── Sync markers ── */
  useEffect(() => {
    if (!markersRef.current) return;
    markersRef.current.clearLayers();
    filtered.forEach((q) => {
      L.marker([q.pos_x, q.pos_y], { icon: BLIP_ICON })
        .bindPopup(`
          <div style="font-family:'Rajdhani',sans-serif;min-width:140px">
            <p style="margin:0;font-size:15px;font-weight:700;color:#f5f5f5">${q.name}</p>
            <p style="margin:2px 0 0;font-size:12px;color:#a3a3a3">${q.type} · ${q.status}</p>
            <p style="margin:2px 0 0;font-size:12px;color:#a3a3a3">Resp: ${q.responsible_name}</p>
          </div>`)
        .addTo(markersRef.current!);
    });
  }, [filtered]);

  /* ─────────────────────────────────────────────
     Render
     ───────────────────────────────────────────── */
  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 -m-6 overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-72 h-full min-h-0 shrink-0 border-r border-border/50 bg-card/80 flex flex-col overflow-y-auto">
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
                  <span className={`h-2.5 w-2.5 rounded-full ${TYPE_COLORS[t]}`} />
                  <span>{t}</span>
                </div>
                <span className="font-mono text-muted-foreground">{typeCounts[t]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions & Filters */}
        <div className="p-4 border-b border-border/50 space-y-3">
          <h3 className="text-sm font-semibold">Filtres & Actions</h3>

          {canManage && (
            <Button
              size="sm"
              variant={addMode ? "destructive" : "default"}
              className="w-full"
              onClick={() => setAddMode((p) => !p)}
            >
              <Plus className="h-4 w-4 mr-1" />
              {addMode ? "Annuler ajout" : "Ajouter un QG"}
            </Button>
          )}

          <div>
            <Label className="text-xs text-muted-foreground">Version de carte</Label>
            <Select value={mapStyle} onValueChange={(v) => changeStyle(v as MapStyleKey)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(MAP_STYLES) as MapStyleKey[]).map((k) => (
                  <SelectItem key={k} value={k}>{MAP_STYLES[k].label}</SelectItem>
                ))}
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
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">QG Enregistrés</h3>
            <Badge variant="secondary" className="text-[10px]">{filtered.length} visibles</Badge>
          </div>
          <div className="space-y-2">
            {filtered.map((q) => (
              <div
                key={q.id}
                className="rounded-md border border-border/50 p-3 relative bg-background/50 cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => mapRef.current?.flyTo([q.pos_x, q.pos_y], 4, { duration: 0.6 })}
              >
                <span className={`absolute top-2 right-2 h-2.5 w-2.5 rounded-full ${TYPE_COLORS[q.type] ?? "bg-muted"}`} />
                <p className="text-sm font-semibold">{q.name}</p>
                <p className="text-xs text-muted-foreground">{q.type} | {q.status}</p>
                <p className="text-xs text-muted-foreground">Resp: {q.responsible_name}</p>
                {canManage && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute bottom-1 right-1 h-6 w-6 p-0 text-destructive hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(q.id); }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
            {filtered.length === 0 && <p className="text-xs text-muted-foreground italic">Aucun QG</p>}
          </div>
        </div>
      </aside>

      {/* ── Map area ── */}
      <div className="flex-1 h-full min-h-0 flex flex-col overflow-hidden bg-black">
        <div className="p-4 border-b border-border/50 bg-card/80 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold font-['Rajdhani'] tracking-wider">Carte Opérationnelle Los Santos</h2>
            <p className="text-xs text-muted-foreground">
              {addMode ? "Cliquez sur la carte pour placer un QG" : "Passez en mode ajout puis cliquez sur la carte pour placer un QG"}
            </p>
          </div>
          {addMode && pendingPos && (
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" variant="default" onClick={confirmPosition}>
                <Check className="h-4 w-4 mr-1" /> Valider position
              </Button>
              <Button size="sm" variant="outline" onClick={cancelPosition}>
                <X className="h-4 w-4 mr-1" /> Annuler
              </Button>
            </div>
          )}
        </div>

        <div className="flex-1 relative min-h-0 overflow-hidden bg-black">
          <div ref={containerRef} className="absolute inset-0" />
        </div>
      </div>

      {/* ── Dialog – new QG form ── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setDialogOpen(false); }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-['Rajdhani'] text-xl flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" /> Nouveau QG
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <Label>Nom du QG</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: Planque Grove Street" className="bg-muted/50" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {QG_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Responsable</Label>
              <Input value={form.responsible_name} onChange={(e) => setForm((f) => ({ ...f, responsible_name: e.target.value }))} placeholder="Nom du responsable" className="bg-muted/50" />
            </div>
            {pendingPos && (
              <p className="text-xs text-muted-foreground font-mono">
                Coordonnées : {pendingPos.lat.toFixed(1)}, {pendingPos.lng.toFixed(1)}
              </p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Retour</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Enregistrement…" : "Confirmer le QG"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
