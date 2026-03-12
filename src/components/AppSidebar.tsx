import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  LayoutDashboard, Table, Phone, LogOut, Kanban, MessageSquare,
  Users, BarChart3, MapPin, Globe, ChevronLeft, ChevronRight, Menu, X, Sparkles, FileBarChart, UserCog, Upload,
  Mail, Zap, FileText, AlertTriangle, Swords, Send, Calendar, ChevronDown, Search, Target, Wifi
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface NavItem {
  key: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  stats: {
    total: number;
    found: number;
    discovered: number;
    callReady: number;
    pipelineWon: number;
  };
}

export function AppSidebar({ activeTab, onTabChange, stats }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("leadradar_collapsed_groups");
    return saved ? new Set(JSON.parse(saved)) : new Set<string>();
  });
  const navigate = useNavigate();

  const toggleGroup = (label: string) => {
    const next = new Set(collapsedGroups);
    if (next.has(label)) next.delete(label);
    else next.add(label);
    setCollapsedGroups(next);
    localStorage.setItem("leadradar_collapsed_groups", JSON.stringify([...next]));
  };

  const navGroups: NavGroup[] = [
    {
      label: "Overview",
      items: [
        { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        { key: "analytics", label: "Analytics", icon: BarChart3 },
        { key: "reports", label: "Reports", icon: FileBarChart },
      ]
    },
    {
      label: "Lead Management",
      items: [
        { key: "leads", label: "All Leads", icon: Table },
        { key: "pipeline", label: "Pipeline", icon: Kanban },
        { key: "scoring", label: "Lead Scoring", icon: Target },
        { key: "duplicates", label: "Duplicates", icon: AlertTriangle },
      ]
    },
    {
      label: "Outreach",
      items: [
        { key: "calls", label: "Calls", icon: Phone, badge: stats.callReady > 0 ? stats.callReady : undefined },
        { key: "reminders", label: "Follow-ups", icon: Calendar },
        { key: "outreach", label: "Templates", icon: MessageSquare },
        { key: "bulk-whatsapp", label: "Bulk WhatsApp", icon: Send },
        { key: "direct-outreach", label: "Direct Send", icon: Send },
        { key: "sequences", label: "Sequences", icon: Zap },
      ]
    },
    {
      label: "Research",
      items: [
        { key: "scraper", label: "Map Scraper", icon: MapPin },
        { key: "website-scraper", label: "Web Scraper", icon: Globe },
        { key: "enrichment", label: "AI Enrichment", icon: Sparkles },
        { key: "email-finder", label: "Email Finder", icon: Mail },
        { key: "competitors", label: "Competitors", icon: Swords },
      ]
    },
    {
      label: "Tools",
      items: [
        { key: "landing-pages", label: "Landing Pages", icon: FileText },
        { key: "whatsapp-config", label: "WhatsApp", icon: Wifi },
        { key: "team", label: "Team", icon: Users },
        { key: "import", label: "Import", icon: Upload },
        { key: "settings", label: "Settings", icon: UserCog },
      ]
    },
  ];

  // Flat list for collapsed mode tooltips
  const allItems = navGroups.flatMap(g => g.items);

  const handleNav = (key: string) => {
    onTabChange(key);
    setMobileOpen(false);
  };

  // Find which group the active tab belongs to
  const activeGroup = navGroups.find(g => g.items.some(i => i.key === activeTab))?.label;

  const renderNavButton = (item: NavItem) => {
    const isActive = activeTab === item.key;
    return (
      <button
        key={item.key}
        onClick={() => handleNav(item.key)}
        className={cn(
          "w-full flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          isActive && "bg-sidebar-primary text-sidebar-primary-foreground",
          !isActive && "text-sidebar-foreground",
          collapsed && "justify-center px-2"
        )}
      >
        <item.icon className="h-3.5 w-3.5 shrink-0" />
        {!collapsed && (
          <>
            <span className="font-mono text-[11px] uppercase tracking-wide flex-1 text-left">{item.label}</span>
            {item.badge && (
              <Badge variant="destructive" className="text-[9px] font-mono h-4 px-1 rounded-full">
                {item.badge}
              </Badge>
            )}
          </>
        )}
      </button>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-2 px-4 py-4 border-b border-sidebar-border",
        collapsed && "justify-center px-2"
      )}>
        <Sparkles className="h-5 w-5 text-primary shrink-0" />
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold tracking-tight text-sidebar-foreground leading-none">LeadRadar</h1>
            <p className="text-[8px] font-mono uppercase text-muted-foreground tracking-wider">AI Lead Intelligence</p>
          </div>
        )}
      </div>

      {/* Compact stats */}
      {!collapsed && (
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-sidebar-border">
          <Badge variant="outline" className="font-mono text-[9px] h-5 px-1.5">{stats.total}</Badge>
          <Badge variant="default" className="font-mono text-[9px] h-5 px-1.5">{stats.found} ✓</Badge>
          {stats.discovered > 0 && (
            <Badge variant="outline" className="font-mono text-[9px] h-5 px-1.5 border-chart-2 text-chart-2">
              {stats.discovered} ✨
            </Badge>
          )}
          {stats.pipelineWon > 0 && (
            <Badge variant="outline" className="font-mono text-[9px] h-5 px-1.5 border-primary text-primary">
              {stats.pipelineWon} 🏆
            </Badge>
          )}
        </div>
      )}

      {/* Grouped nav items */}
      <nav className="flex-1 overflow-y-auto py-1.5 px-2">
        {collapsed ? (
          // Collapsed: show flat icon list with tooltips
          <div className="space-y-0.5">
            {allItems.map(item => (
              <Tooltip key={item.key} delayDuration={0}>
                <TooltipTrigger asChild>{renderNavButton(item)}</TooltipTrigger>
                <TooltipContent side="right" className="font-mono text-xs uppercase">
                  {item.label}
                  {item.badge ? ` (${item.badge})` : ""}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        ) : (
          // Expanded: show grouped sections
          <div className="space-y-1">
            {navGroups.map(group => {
              const isGroupCollapsed = collapsedGroups.has(group.label);
              const hasActiveItem = group.items.some(i => i.key === activeTab);

              return (
                <div key={group.label}>
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-1 text-[9px] font-mono uppercase tracking-widest text-muted-foreground hover:text-sidebar-foreground transition-colors rounded-md",
                      hasActiveItem && "text-sidebar-foreground"
                    )}
                  >
                    <span>{group.label}</span>
                    <ChevronDown className={cn(
                      "h-3 w-3 transition-transform",
                      isGroupCollapsed && "-rotate-90"
                    )} />
                  </button>
                  {!isGroupCollapsed && (
                    <div className="space-y-0.5 mt-0.5">
                      {group.items.map(item => renderNavButton(item))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </nav>

      {/* Bottom actions */}
      <div className={cn(
        "border-t border-sidebar-border p-2 flex items-center",
        collapsed ? "flex-col gap-2" : "justify-between"
      )}>
        <ThemeToggle />
        <Button
          variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"
          onClick={async () => { await supabase.auth.signOut(); navigate("/auth"); }}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-3 left-3 z-[60] md:hidden h-9 w-9 bg-background/80 backdrop-blur border border-border"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-60 bg-sidebar border-r border-sidebar-border transform transition-transform md:hidden",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col h-screen sticky top-0 bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-14" : "w-52"
      )}>
        {sidebarContent}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-7 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>
    </>
  );
}
