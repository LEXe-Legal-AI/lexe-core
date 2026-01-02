import { useState } from "react";
import {
  Search,
  Bell,
  ChevronDown,
  LogOut,
  User,
  Settings,
  Sun,
  Moon,
  Monitor,
  Check,
  Wifi,
  WifiOff,
  Loader2,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTheme } from "@/hooks/useTheme";
import { ThemePreference } from "@/stores/uiStore";
import {
  useRealtimeStore,
  useConnectionState,
  useNotifications,
  useUnreadCount,
  type RealtimeNotification,
} from "@/stores/realtimeStore";
import { useAuthStore } from "@/stores/authStore";

interface HeaderProps {
  title?: string;
  className?: string;
}

const themeOptions: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/**
 * Get icon for notification level
 */
function getNotificationIcon(level: RealtimeNotification["level"]) {
  switch (level) {
    case "critical":
    case "error":
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case "info":
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
}

/**
 * Format relative time
 */
function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "ora";
  if (diffMins < 60) return `${diffMins} min fa`;
  if (diffHours < 24) return `${diffHours} ore fa`;
  return `${diffDays} giorni fa`;
}

/**
 * Connection status indicator component
 */
function ConnectionIndicator() {
  const connectionState = useConnectionState();

  const statusConfig = {
    connected: {
      icon: Wifi,
      color: "text-green-500",
      bgColor: "bg-green-500",
      label: "Connesso",
      pulse: false,
    },
    connecting: {
      icon: Loader2,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500",
      label: "Connessione...",
      pulse: true,
      spin: true,
    },
    reconnecting: {
      icon: Loader2,
      color: "text-orange-500",
      bgColor: "bg-orange-500",
      label: "Riconnessione...",
      pulse: true,
      spin: true,
    },
    disconnected: {
      icon: WifiOff,
      color: "text-red-500",
      bgColor: "bg-red-500",
      label: "Disconnesso",
      pulse: false,
    },
  };

  const config = statusConfig[connectionState];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2" title={config.label}>
      <div className="relative">
        <Icon
          className={cn(
            "h-4 w-4",
            config.color,
            (config as { spin?: boolean }).spin && "animate-spin"
          )}
        />
        {config.pulse && (
          <div
            className={cn(
              "absolute -inset-1 rounded-full opacity-30 animate-ping",
              config.bgColor
            )}
          />
        )}
      </div>
      <span className="hidden md:inline text-xs text-muted-foreground">
        {config.label}
      </span>
    </div>
  );
}

export function Header({ title = "Dashboard", className }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { themePreference, setTheme } = useTheme();
  const { user, logout } = useAuthStore();

  // Real-time notifications from store
  const notifications = useNotifications();
  const unreadCount = useUnreadCount();
  const { markNotificationRead, markAllNotificationsRead, removeNotification } =
    useRealtimeStore();

  return (
    <header
      className={cn(
        "flex h-16 items-center justify-between border-b bg-background px-6",
        className
      )}
    >
      {/* Page Title */}
      <h1 className="text-xl font-semibold">{title}</h1>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* Connection Status */}
        <ConnectionIndicator />

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cerca..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 pl-9"
          />
        </div>

        {/* Theme Toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Cambia tema</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuLabel>Tema</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = themePreference === option.value;
              return (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span>{option.label}</span>
                  </div>
                  {isSelected && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-96">
            <div className="flex items-center justify-between px-2 py-1.5">
              <DropdownMenuLabel className="p-0">Notifiche</DropdownMenuLabel>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto py-1 px-2 text-xs"
                  onClick={(e) => {
                    e.preventDefault();
                    markAllNotificationsRead();
                  }}
                >
                  Segna tutte come lette
                </Button>
              )}
            </div>
            <DropdownMenuSeparator />

            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Nessuna notifica
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                {notifications.slice(0, 10).map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex items-start gap-3 px-2 py-3 hover:bg-accent cursor-pointer",
                      !notification.read && "bg-accent/50"
                    )}
                    onClick={() => markNotificationRead(notification.id)}
                  >
                    <div className="mt-0.5">
                      {getNotificationIcon(notification.level)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={cn(
                            "font-medium text-sm",
                            !notification.read && "text-foreground",
                            notification.read && "text-muted-foreground"
                          )}
                        >
                          {notification.title}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNotification(notification.id);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {notification.message}
                      </p>
                      <span className="text-xs text-muted-foreground mt-1 block">
                        {formatRelativeTime(notification.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            )}

            {notifications.length > 10 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="justify-center text-primary">
                  Vedi tutte le notifiche
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/avatar.png" alt="User" />
                <AvatarFallback>
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:inline-block">
                {user?.name || "Utente"}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.name || "Utente"}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.email || "user@leo.it"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profilo</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Impostazioni</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => logout()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Esci</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export default Header;
