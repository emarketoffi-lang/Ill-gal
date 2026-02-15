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
import { useNavigate } from "react-router-dom";
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
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Missions", url: "/operations", icon: Target },
  { title: "Réunions", url: "/reunions", icon: Users },
  { title: "Récapitulatif", url: "/rapports", icon: FileText },
  { title: "Entretiens", url: "/entretiens", icon: Vote },
  { title: "Échanges", url: "/echanges", icon: ArrowLeftRight },
  { title: "Discussion", url: "/discussion", icon: MessageCircle },
  { title: "Dissolutions", url: "/dissolutions", icon: Trash2 },
];

const adminItems = [
  { title: "Gestion des rôles", url: "/admin", icon: Shield },
];

export function AppSidebar() {
  const { username, role, signOut } = useAuth();
  const navigate = useNavigate();

  const roleColor = role === "admin" ? "text-primary" : role === "responsable" ? "text-yellow-500" : "text-muted-foreground";
  const roleBadge = role === "admin" ? "destructive" : role === "responsable" ? "secondary" : "outline";

  return (
    <Sidebar className="border-r border-border/50 bg-sidebar">
      <button
        onClick={() => navigate("/profile")}
        className="flex items-center gap-3 p-4 border-b border-border/50 hover:bg-accent/30 transition-colors w-full text-left"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 border border-primary/30">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate font-['Rajdhani'] text-lg tracking-wide">{username ?? "Membre"}</p>
          <Badge variant={roleBadge as any} className="text-[10px] uppercase tracking-widest">
            {role ?? "membre"}
          </Badge>
        </div>
      </button>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground/60 uppercase text-[10px] tracking-widest">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
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

        {role === "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-muted-foreground/60 uppercase text-[10px] tracking-widest">Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className="hover:bg-accent/50" activeClassName="bg-accent text-primary font-medium">
                        <item.icon className="mr-2 h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
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
