import { ActivityLog } from "@/hooks/use-activity-logs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Phone, ArrowRight, Pencil, Globe, UserPlus, MessageSquare, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityTimelineProps {
  logs: ActivityLog[];
  isLoading: boolean;
}

const ACTION_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  pipeline_change: { icon: <ArrowRight className="h-3 w-3" />, label: "Stage Changed", color: "bg-chart-4/20 text-chart-4" },
  call_status: { icon: <Phone className="h-3 w-3" />, label: "Call Update", color: "bg-chart-2/20 text-chart-2" },
  field_update: { icon: <Pencil className="h-3 w-3" />, label: "Field Updated", color: "bg-chart-5/20 text-chart-5" },
  website_update: { icon: <Globe className="h-3 w-3" />, label: "Website Updated", color: "bg-chart-3/20 text-chart-3" },
  assigned: { icon: <UserPlus className="h-3 w-3" />, label: "Assigned", color: "bg-primary/20 text-primary" },
  note_added: { icon: <MessageSquare className="h-3 w-3" />, label: "Note Added", color: "bg-muted text-muted-foreground" },
  created: { icon: <Plus className="h-3 w-3" />, label: "Lead Created", color: "bg-chart-2/20 text-chart-2" },
};

export function ActivityTimeline({ logs, isLoading }: ActivityTimelineProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm font-mono">
        No activity recorded yet
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[300px]">
      <div className="relative pl-6 space-y-4">
        {/* Vertical line */}
        <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />

        {logs.map((log) => {
          const config = ACTION_CONFIG[log.action] || ACTION_CONFIG.field_update;
          return (
            <div key={log.id} className="relative flex gap-3">
              {/* Dot */}
              <div className={`absolute -left-6 top-1 flex items-center justify-center h-[18px] w-[18px] rounded-full border ${config.color}`}>
                {config.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] font-mono py-0 h-4">
                    {config.label}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {formatDistanceToNow(log.createdAt, { addSuffix: true })}
                  </span>
                </div>
                {log.details && (
                  <p className="text-xs text-muted-foreground mt-0.5">{log.details}</p>
                )}
                {(log.oldValue || log.newValue) && (
                  <div className="flex items-center gap-1.5 text-[10px] font-mono mt-0.5">
                    {log.oldValue && <span className="line-through text-muted-foreground">{log.oldValue}</span>}
                    {log.oldValue && log.newValue && <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />}
                    {log.newValue && <span className="font-semibold">{log.newValue}</span>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
