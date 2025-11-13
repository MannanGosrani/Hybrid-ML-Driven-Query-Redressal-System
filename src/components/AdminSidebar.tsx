import { LayoutDashboard, Ticket, Building2, Users, Settings } from "lucide-react";
import { NavLink, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import nmimsLogo from '@/assets/nmims-logo.png';

const menuItems = [
  { title: "Dashboard", url: "/admin/overview", icon: LayoutDashboard },
  { title: "All Tickets", url: "/admin/tickets", icon: Ticket },
  { title: "Departments", url: "/admin/departments", icon: Building2 },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const { profile } = useAuth();
  const collapsed = state === "collapsed";

  const getHomeRoute = () => {
    switch (profile?.role) {
      case 'main_admin': return '/admin/overview';
      case 'dept_admin': return '/dept/inbox';
      default: return '/admin/overview';
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r bg-sidebar">
      <SidebarHeader className="border-b px-4 py-3">
        <Link to={getHomeRoute()} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img src={nmimsLogo} alt="NMIMS Logo" className="h-10" />
          {!collapsed && <span className="font-semibold text-lg">NMIMS</span>}
        </Link>
      </SidebarHeader>
      <SidebarContent className="bg-sidebar">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground font-semibold px-4 py-3">
            Admin Panel
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url}
                      className={({ isActive }) =>
                        isActive 
                          ? "bg-primary text-black hover:bg-primary/90 font-medium" 
                          : "text-black hover:bg-sidebar-accent"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
