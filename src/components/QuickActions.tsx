import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { School } from "@/types/school";
import {
  Upload, Search, Phone, Send, Sparkles, ArrowRight,
  AlertCircle, TrendingUp, Clock
} from "lucide-react";
import { useMemo } from "react";
import { isPast, isToday } from "date-fns";

interface QuickActionsProps {
  schools: School[];
  onNavigate: (tab: string) => void;
  onProcess: () => void;
  processing: boolean;
}

export function QuickActions({ schools, onNavigate, onProcess, processing }: QuickActionsProps) {
  const insights = useMemo(() => {
    const pending = schools.filter(s => s.status === "pending").length;
    const noWebsite = schools.filter(s => s.websiteType === "no_website" && s.phone).length;
    const uncontacted = schools.filter(s => s.pipelineStage === "new").length;
    const overdue = schools.filter(s => {
      const d = (s as any).follow_up_date;
      return d && isPast(new Date(d)) && !isToday(new Date(d));
    }).length;
    const todayFollowups = schools.filter(s => {
      const d = (s as any).follow_up_date;
      return d && isToday(new Date(d));
    }).length;
    const withEmail = schools.filter(s => s.emails).length;
    const withPhone = schools.filter(s => s.phone).length;

    return { pending, noWebsite, uncontacted, overdue, todayFollowups, withEmail, withPhone };
  }, [schools]);

  if (schools.length === 0) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="p-6 text-center">
          <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <h3 className="font-semibold mb-1">Get Started</h3>
          <p className="text-sm text-muted-foreground mb-4">Import leads to start building your pipeline</p>
          <div className="flex gap-2 justify-center">
            <Button size="sm" onClick={() => onNavigate("import")} className="font-mono text-xs">
              <Upload className="h-3 w-3 mr-1" /> Import CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => onNavigate("scraper")} className="font-mono text-xs">
              <Search className="h-3 w-3 mr-1" /> Map Scraper
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Build smart action cards based on current data state
  const actions: { icon: React.ElementType; label: string; description: string; action: () => void; variant: "default" | "outline" | "destructive"; priority: number }[] = [];

  if (insights.overdue > 0) {
    actions.push({
      icon: AlertCircle,
      label: `${insights.overdue} Overdue Follow-ups`,
      description: "These leads need attention now",
      action: () => onNavigate("reminders"),
      variant: "destructive",
      priority: 1,
    });
  }

  if (insights.todayFollowups > 0) {
    actions.push({
      icon: Clock,
      label: `${insights.todayFollowups} Due Today`,
      description: "Follow-ups scheduled for today",
      action: () => onNavigate("reminders"),
      variant: "default",
      priority: 2,
    });
  }

  if (insights.pending > 0) {
    actions.push({
      icon: Search,
      label: `Detect ${insights.pending} Websites`,
      description: "Run AI website detection on pending leads",
      action: onProcess,
      variant: "default",
      priority: 3,
    });
  }

  if (insights.noWebsite > 0) {
    actions.push({
      icon: Phone,
      label: `${insights.noWebsite} Ready to Call`,
      description: "Leads with no website but have phone numbers",
      action: () => onNavigate("calls"),
      variant: "outline",
      priority: 4,
    });
  }

  if (insights.uncontacted > 5) {
    actions.push({
      icon: Send,
      label: `${insights.uncontacted} New Leads`,
      description: "Uncontacted leads waiting for outreach",
      action: () => onNavigate("bulk-whatsapp"),
      variant: "outline",
      priority: 5,
    });
  }

  if (schools.length > 10 && insights.withEmail < schools.length * 0.3) {
    actions.push({
      icon: Sparkles,
      label: "Enrich Leads",
      description: `Only ${Math.round(insights.withEmail / schools.length * 100)}% have emails`,
      action: () => onNavigate("enrichment"),
      variant: "outline",
      priority: 6,
    });
  }

  const topActions = actions.sort((a, b) => a.priority - b.priority).slice(0, 4);

  if (topActions.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {topActions.map((action, idx) => (
        <Card
          key={idx}
          className={cn(
            "border-2 cursor-pointer hover:shadow-md transition-shadow",
            action.variant === "destructive" && "border-destructive/50 bg-destructive/5"
          )}
          onClick={action.action}
        >
          <CardContent className="p-3 flex items-start gap-3">
            <div className={cn(
              "p-1.5 rounded-md shrink-0",
              action.variant === "destructive" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
            )}>
              <action.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate">{action.label}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{action.description}</p>
            </div>
            <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
