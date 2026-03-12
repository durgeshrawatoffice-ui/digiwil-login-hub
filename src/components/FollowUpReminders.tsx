import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { School } from "@/types/school";
import { Bell, Calendar, Clock, Phone, Mail, CheckCircle, AlertCircle, Plus } from "lucide-react";
import { format, isToday, isTomorrow, isPast, addDays, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface FollowUpRemindersProps {
  schools: School[];
  onUpdateField: (id: string, field: string, value: any) => void;
}

export function FollowUpReminders({ schools, onUpdateField }: FollowUpRemindersProps) {
  const [filter, setFilter] = useState<"all" | "today" | "overdue" | "upcoming">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<School | null>(null);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [quickDays, setQuickDays] = useState("");

  const leadsWithFollowUp = useMemo(() => {
    return schools.filter(s => (s as any).follow_up_date || (s as any).followUpDate);
  }, [schools]);

  const filteredLeads = useMemo(() => {
    let leads = leadsWithFollowUp.map(s => ({
      ...s,
      followUpDate: (s as any).follow_up_date || (s as any).followUpDate,
      followUpNotes: (s as any).follow_up_notes || (s as any).followUpNotes || "",
    }));

    if (filter === "today") {
      leads = leads.filter(l => l.followUpDate && isToday(new Date(l.followUpDate)));
    } else if (filter === "overdue") {
      leads = leads.filter(l => l.followUpDate && isPast(new Date(l.followUpDate)) && !isToday(new Date(l.followUpDate)));
    } else if (filter === "upcoming") {
      leads = leads.filter(l => l.followUpDate && !isPast(new Date(l.followUpDate)));
    }

    return leads.sort((a, b) => {
      if (!a.followUpDate) return 1;
      if (!b.followUpDate) return -1;
      return new Date(a.followUpDate).getTime() - new Date(b.followUpDate).getTime();
    });
  }, [leadsWithFollowUp, filter]);

  const stats = useMemo(() => {
    const now = new Date();
    let today = 0, overdue = 0, upcoming = 0;
    leadsWithFollowUp.forEach(s => {
      const date = (s as any).follow_up_date || (s as any).followUpDate;
      if (!date) return;
      const d = new Date(date);
      if (isToday(d)) today++;
      else if (isPast(d)) overdue++;
      else upcoming++;
    });
    return { today, overdue, upcoming, total: leadsWithFollowUp.length };
  }, [leadsWithFollowUp]);

  const leadsWithoutFollowUp = schools.filter(s => !((s as any).follow_up_date || (s as any).followUpDate));

  const handleSetFollowUp = () => {
    if (!selectedLead) return;
    
    let dateToSet = followUpDate;
    if (quickDays) {
      dateToSet = addDays(new Date(), parseInt(quickDays)).toISOString().split("T")[0];
    }
    
    if (!dateToSet) {
      toast.error("Please select a date");
      return;
    }

    onUpdateField(selectedLead.id, "follow_up_date", dateToSet);
    if (followUpNotes) {
      onUpdateField(selectedLead.id, "follow_up_notes", followUpNotes);
    }
    
    toast.success(`Follow-up set for ${format(new Date(dateToSet), "MMM d, yyyy")}`);
    setDialogOpen(false);
    setSelectedLead(null);
    setFollowUpDate("");
    setFollowUpNotes("");
    setQuickDays("");
  };

  const handleClearFollowUp = (lead: School) => {
    onUpdateField(lead.id, "follow_up_date", null);
    onUpdateField(lead.id, "follow_up_notes", null);
    toast.success("Follow-up cleared");
  };

  const handleMarkComplete = (lead: School) => {
    onUpdateField(lead.id, "follow_up_date", null);
    onUpdateField(lead.id, "follow_up_notes", null);
    onUpdateField(lead.id, "call_status", "completed");
    toast.success("Marked as complete");
  };

  const getStatusBadge = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return <Badge variant="default" className="bg-chart-3 text-chart-3-foreground">Today</Badge>;
    }
    if (isTomorrow(date)) {
      return <Badge variant="outline" className="border-chart-2 text-chart-2">Tomorrow</Badge>;
    }
    if (isPast(date)) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    return <Badge variant="outline">{formatDistanceToNow(date, { addSuffix: true })}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-2 cursor-pointer hover:bg-secondary/50" onClick={() => setFilter("all")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs font-mono text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`border-2 cursor-pointer hover:bg-secondary/50 ${filter === "today" ? "ring-2 ring-primary" : ""}`} onClick={() => setFilter("today")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-chart-3" />
              <div>
                <p className="text-xs font-mono text-muted-foreground">Today</p>
                <p className="text-2xl font-bold">{stats.today}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`border-2 cursor-pointer hover:bg-secondary/50 ${filter === "overdue" ? "ring-2 ring-primary" : ""}`} onClick={() => setFilter("overdue")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-xs font-mono text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-destructive">{stats.overdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`border-2 cursor-pointer hover:bg-secondary/50 ${filter === "upcoming" ? "ring-2 ring-primary" : ""}`} onClick={() => setFilter("upcoming")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-chart-2" />
              <div>
                <p className="text-xs font-mono text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold">{stats.upcoming}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Follow-up Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono uppercase">Set Follow-up Reminder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedLead && (
              <div className="p-3 bg-secondary rounded-lg">
                <p className="font-semibold">{selectedLead.name}</p>
                <p className="text-xs text-muted-foreground">{selectedLead.phone || "No phone"}</p>
              </div>
            )}
            
            <div>
              <label className="text-xs font-mono uppercase text-muted-foreground">Quick Select</label>
              <div className="flex gap-2 mt-1">
                {[1, 3, 7, 14, 30].map(days => (
                  <Button
                    key={days}
                    variant={quickDays === String(days) ? "default" : "outline"}
                    size="sm"
                    className="font-mono text-xs"
                    onClick={() => { setQuickDays(String(days)); setFollowUpDate(""); }}
                  >
                    {days}d
                  </Button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-xs font-mono uppercase text-muted-foreground">Or Pick Date</label>
              <Input
                type="date"
                value={followUpDate}
                onChange={(e) => { setFollowUpDate(e.target.value); setQuickDays(""); }}
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-xs font-mono uppercase text-muted-foreground">Notes (optional)</label>
              <Textarea
                value={followUpNotes}
                onChange={(e) => setFollowUpNotes(e.target.value)}
                placeholder="What to discuss..."
                rows={2}
                className="mt-1"
              />
            </div>
            
            <Button onClick={handleSetFollowUp} className="w-full font-mono uppercase">
              Set Reminder
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Follow-up List */}
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Scheduled Follow-ups
              </span>
              <Button variant="ghost" size="sm" onClick={() => setFilter("all")} className="text-xs">
                {filter !== "all" && "Show All"}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[500px] overflow-auto">
            <div className="space-y-3">
              {filteredLeads.map(lead => (
                <div key={lead.id} className="p-3 border rounded-lg hover:bg-secondary/50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{lead.name}</p>
                      <p className="text-xs text-muted-foreground">{lead.phone || "No phone"}</p>
                      {lead.followUpNotes && (
                        <p className="text-xs mt-1 text-muted-foreground italic">📝 {lead.followUpNotes}</p>
                      )}
                    </div>
                    {lead.followUpDate && getStatusBadge(lead.followUpDate)}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-xs text-muted-foreground flex-1">
                      {lead.followUpDate && format(new Date(lead.followUpDate), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                    <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleMarkComplete(lead)}>
                      <CheckCircle className="h-3 w-3 mr-1" /> Done
                    </Button>
                    {lead.phone && (
                      <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
                        <a href={`tel:${lead.phone}`}>
                          <Phone className="h-3 w-3" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {filteredLeads.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No follow-ups scheduled</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Add Follow-up to Lead */}
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Follow-up
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[500px] overflow-auto">
            <div className="space-y-2">
              {leadsWithoutFollowUp.slice(0, 20).map(lead => (
                <div
                  key={lead.id}
                  className="p-3 border rounded-lg hover:bg-secondary/50 cursor-pointer flex items-center justify-between"
                  onClick={() => { setSelectedLead(lead); setDialogOpen(true); }}
                >
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">{lead.location || lead.phone || "No info"}</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Calendar className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {leadsWithoutFollowUp.length === 0 && (
                <p className="text-center text-muted-foreground py-8">All leads have follow-ups</p>
              )}
              {leadsWithoutFollowUp.length > 20 && (
                <p className="text-center text-xs text-muted-foreground">Showing first 20 of {leadsWithoutFollowUp.length}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
