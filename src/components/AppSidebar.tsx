import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  Target,
  Users,
  FileText,
  Vote,
  ArrowLeftRight,
  MessageCircle,
  Trash2,
  LogOut,
  Shield,
  Bell,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Mission", url: "/operations", icon: Target },
  { title: "Réunions", url: "/reunions", icon: Users },
  { title: "Récapitulatif", url: "/rapports", icon: FileText },
  { title: "Entretiens", url: "/entretiens", icon: Vote },
  { title: "Give", url: "/echanges", icon: ArrowLeftRight },
  { title: "COM DE 3ARBI", url: "/discussion", icon: MessageCircle },
  { title: "Dissolutions", url: "/dissolutions", icon: Trash2 },
  { title: "Administration", url: "/administration", icon: Shield, adminOnly: true },
];

export function AppSidebar() {
  const { username, role, signOut } = useAuth();

  const roleColor = role === "admin" ? "text-primary" : role === "responsable" ? "text-yellow-500" : "text-muted-foreground";
  const roleBadge = role === "admin" ? "destructive" : role === "responsable" ? "secondary" : "outline";

  return (
    <Sidebar className="border-r border-border/50 bg-sidebar">
      <div className="flex items-center gap-3 p-4 border-b border-border/50">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 border border-primary/30">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
           <p className="text-sm font-semibold truncate font-['Rajdhani'] text-lg tracking-wide">{username ?? "Assistant"}</p>
          <Badge variant={roleBadge as any} className="text-[10px] uppercase tracking-widest">
            {role === "admin" ? "Référent" : role === "responsable" ? "Responsable" : "Assistant"}
          </Badge>
        </div>
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground/60 uppercase text-[10px] tracking-widest">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems
                .filter((item) => !('adminOnly' in item && item.adminOnly) || role === "admin")
                .map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === "/"} className="hover:bg-accent/50" activeClassName="bg-accent text-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <div className="mt-auto p-4 border-t border-border/50">
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </Sidebar>
  );
}
