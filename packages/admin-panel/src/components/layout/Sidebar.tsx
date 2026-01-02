import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  UserCog,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bot,
  GitBranch,
  Brain,
  ClipboardCheck,
  Building2,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Conversations", icon: MessageSquare, path: "/conversations" },
  { label: "Coda Revisione", icon: ClipboardCheck, path: "/review" },
  { label: "Contacts", icon: Users, path: "/contacts" },
  { label: "Tenants", icon: Building2, path: "/tenants" },
  { label: "Channels", icon: Radio, path: "/channels" },
  { label: "Agents", icon: Bot, path: "/agents" },
  { label: "Pipeline", icon: GitBranch, path: "/pipeline" },
  { label: "Memory", icon: Brain, path: "/memory" },
  { label: "Users", icon: UserCog, path: "/users" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex h-screen flex-col border-r bg-background transition-all duration-300",
          collapsed ? "w-16" : "w-64",
          className
        )}
      >
        {/* Logo Section */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
                L
              </div>
              <span className="text-xl font-semibold">LEO</span>
            </div>
          )}
          {collapsed && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold mx-auto">
              L
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return collapsed ? (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg transition-colors mx-auto",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )
                    }
                  >
                    <Icon className="h-5 w-5" />
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex h-10 items-center gap-3 rounded-lg px-3 transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )
                }
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Collapse Button */}
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "w-full justify-center",
              !collapsed && "justify-start"
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                <span>Collapse</span>
              </>
            )}
          </Button>
        </div>

        {/* User Avatar Section */}
        <div className="border-t p-4">
          <div
            className={cn(
              "flex items-center gap-3",
              collapsed && "justify-center"
            )}
          >
            <Avatar className="h-9 w-9">
              <AvatarImage src="/avatar.png" alt="User" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-medium">Admin User</span>
                <span className="text-xs text-muted-foreground">
                  admin@leo.it
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}

export default Sidebar;
