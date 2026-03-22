import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Phone, PhoneOff, CheckCircle, Clock, LogOut, Search, Filter,
  User, PhoneCall, PhoneForwarded, XCircle, AlertCircle, BarChart3
} from "lucide-react";

interface AssignedLead {
  id: string;
  name: string;
  location: string | null;
  phone: string | null;
  emails: string | null;
  website: string | null;
  call_status: string | null;
  call_notes: string | null;
  pipeline_stage: string | null;
  category: string | null;
  address: string | null;
  rating: number | null;
  assigned_name: string | null;
}

interface LeadAssignment {
  id: string;
  school_id: string;
  status: string;
  priority: string;
  progress_percentage: number;
  notes: string | null;
  created_at: string;
}

const callStatusOptions = [
  { value: "pending", label: "Pending", icon: Clock, color: "text-muted-foreground" },
  { value: "calling", label: "Calling", icon: PhoneCall, color: "text-blue-500" },
  { value: "completed", label: "Completed", icon: CheckCircle, color: "text-green-500" },
  { value: "no_answer", label: "No Answer", icon: PhoneOff, color: "text-orange-500" },
  { value: "callback", label: "Callback", icon: PhoneForwarded, color: "text-purple-500" },
  { value: "not_interested", label: "Not Interested", icon: XCircle, color: "text-red-500" },
  { value: "wrong_number", label: "Wrong Number", icon: AlertCircle, color: "text-destructive" },
];

const TeamDashboard = () => {
  const { role, loading: roleLoading, userId } = useUserRole();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<AssignedLead[]>([]);
  const [assignments, setAssignments] = useState<LeadAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState<AssignedLead | null>(null);
  const [callNotes, setCallNotes] = useState("");
  const [callStatus, setCallStatus] = useState("");
  const [memberName, setMemberName] = useState("");

  useEffect(() => {
    if (!roleLoading && role === "admin") {
      navigate("/", { replace: true });
    }
  }, [role, roleLoading, navigate]);

  useEffect(() => {
    if (userId) {
      loadAssignedLeads();
      loadMemberInfo();
    }
  }, [userId]);

  const loadMemberInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();
    
    if (profile?.full_name) {
      setMemberName(profile.full_name);
    } else {
      // Check team_members for name
      const { data: tm } = await (supabase as any)
        .from('team_members')
        .select('member_name')
        .eq('member_email', user.email)
        .limit(1);
      if (tm?.[0]?.member_name) {
        setMemberName(tm[0].member_name);
      } else {
        setMemberName(user.email || "Team Member");
      }
    }
  };

  const loadAssignedLeads = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get leads assigned to this team member (by email or by lead_assignments)
    const { data: assignedLeads, error } = await (supabase as any)
      .from('schools')
      .select('id, name, location, phone, emails, website, call_status, call_notes, pipeline_stage, category, address, rating, assigned_name')
      .or(`assigned_to.eq.${user.email},assigned_to.ilike.%${user.email}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error loading leads:", error);
    } else {
      setLeads(assignedLeads || []);
    }

    // Also get lead_assignments for this user
    const { data: assignmentData } = await (supabase as any)
      .from('lead_assignments')
      .select('*')
      .eq('assigned_to', user.id)
      .order('created_at', { ascending: false });

    if (assignmentData) {
      setAssignments(assignmentData);
    }

    setLoading(false);
  };

  const updateLeadCallStatus = async (leadId: string, newStatus: string, notes?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const updates: any = { 
      call_status: newStatus, 
      updated_at: new Date().toISOString() 
    };
    if (notes !== undefined) updates.call_notes = notes;

    const { error } = await (supabase as any)
      .from('schools')
      .update(updates)
      .eq('id', leadId);

    if (error) {
      toast.error("Failed to update: " + error.message);
      return;
    }

    // Log the call
    await (supabase as any).from('call_logs').insert({
      school_id: leadId,
      user_id: user.id,
      call_status: newStatus,
      call_notes: notes || null,
      caller_name: memberName || user.email,
    });

    // Log activity
    await (supabase as any).from('activity_logs').insert({
      school_id: leadId,
      user_id: user.id,
      action: 'call_status',
      new_value: newStatus,
      details: notes || null,
    });

    // Update lead_assignment progress if exists
    const assignment = assignments.find(a => a.school_id === leadId);
    if (assignment) {
      const newProgress = newStatus === 'completed' ? 100 : 
                          newStatus === 'not_interested' ? 100 :
                          newStatus === 'wrong_number' ? 100 : 50;
      await (supabase as any)
        .from('lead_assignments')
        .update({ 
          status: newStatus === 'completed' ? 'completed' : 'in_progress',
          progress_percentage: newProgress,
          updated_at: new Date().toISOString()
        })
        .eq('id', assignment.id);
    }

    toast.success(`Status updated to ${newStatus}`);
    loadAssignedLeads();
    setSelectedLead(null);
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = !search || 
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      (lead.phone && lead.phone.includes(search)) ||
      (lead.location && lead.location.toLowerCase().includes(search.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || lead.call_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: leads.length,
    pending: leads.filter(l => !l.call_status || l.call_status === 'pending').length,
    completed: leads.filter(l => l.call_status === 'completed').length,
    noAnswer: leads.filter(l => l.call_status === 'no_answer').length,
    callback: leads.filter(l => l.call_status === 'callback').length,
    notInterested: leads.filter(l => l.call_status === 'not_interested').length,
  };

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur px-4 md:px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-lg font-bold tracking-tight">Caller Dashboard</h1>
              <p className="text-[10px] font-mono text-muted-foreground uppercase">
                Welcome, {memberName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost" size="sm"
              onClick={async () => { await supabase.auth.signOut(); navigate("/auth"); }}
              className="font-mono text-xs"
            >
              <LogOut className="h-4 w-4 mr-1" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Card className="border-2">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold font-mono">{stats.total}</p>
              <p className="text-[10px] font-mono text-muted-foreground uppercase">Total Assigned</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-yellow-500/30">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold font-mono text-yellow-600">{stats.pending}</p>
              <p className="text-[10px] font-mono text-muted-foreground uppercase">Pending</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-green-500/30">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold font-mono text-green-600">{stats.completed}</p>
              <p className="text-[10px] font-mono text-muted-foreground uppercase">Completed</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-orange-500/30">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold font-mono text-orange-600">{stats.noAnswer}</p>
              <p className="text-[10px] font-mono text-muted-foreground uppercase">No Answer</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-purple-500/30">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold font-mono text-purple-600">{stats.callback}</p>
              <p className="text-[10px] font-mono text-muted-foreground uppercase">Callback</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-red-500/30">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold font-mono text-red-600">{stats.notInterested}</p>
              <p className="text-[10px] font-mono text-muted-foreground uppercase">Not Interested</p>
            </CardContent>
          </Card>
        </div>

        {/* Progress */}
        <Card className="border-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs uppercase text-muted-foreground">Overall Progress</span>
              <span className="font-mono text-sm font-bold">{completionRate}%</span>
            </div>
            <Progress value={completionRate} className="h-3" />
            <p className="text-[10px] font-mono text-muted-foreground mt-1">
              {stats.completed} of {stats.total} leads processed
            </p>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads by name, phone, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 font-mono text-sm border-2"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] font-mono text-xs border-2">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-mono text-xs">All Status</SelectItem>
              {callStatusOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="font-mono text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Leads Table */}
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase flex items-center gap-2">
              <Phone className="h-4 w-4" /> Assigned Leads ({filteredLeads.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredLeads.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground font-mono text-sm">
                {leads.length === 0 
                  ? "No leads assigned to you yet. Ask your admin to assign leads."
                  : "No leads match your filters."
                }
              </div>
            ) : (
              <div className="border-2 overflow-auto max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-2">
                      <TableHead className="font-mono text-[10px] uppercase">#</TableHead>
                      <TableHead className="font-mono text-[10px] uppercase">Name</TableHead>
                      <TableHead className="font-mono text-[10px] uppercase">Phone</TableHead>
                      <TableHead className="font-mono text-[10px] uppercase">Location</TableHead>
                      <TableHead className="font-mono text-[10px] uppercase">Category</TableHead>
                      <TableHead className="font-mono text-[10px] uppercase">Status</TableHead>
                      <TableHead className="font-mono text-[10px] uppercase">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead, idx) => {
                      const statusOpt = callStatusOptions.find(o => o.value === (lead.call_status || 'pending'));
                      const StatusIcon = statusOpt?.icon || Clock;
                      return (
                        <TableRow key={lead.id} className="border-b hover:bg-muted/50">
                          <TableCell className="font-mono text-[10px] text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-semibold text-xs">{lead.name}</TableCell>
                          <TableCell>
                            {lead.phone ? (
                              <a href={`tel:${lead.phone}`} className="text-xs font-mono text-primary hover:underline flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {lead.phone}
                              </a>
                            ) : (
                              <span className="text-[10px] text-muted-foreground font-mono">No phone</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{lead.location || lead.address || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[9px] font-mono">{lead.category || "-"}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={lead.call_status === 'completed' ? 'default' : 'secondary'} className="text-[9px] font-mono flex items-center gap-1 w-fit">
                              <StatusIcon className={`h-3 w-3 ${statusOpt?.color}`} />
                              {statusOpt?.label || 'Pending'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] font-mono"
                              onClick={() => {
                                setSelectedLead(lead);
                                setCallNotes(lead.call_notes || "");
                                setCallStatus(lead.call_status || "pending");
                              }}
                            >
                              <PhoneCall className="h-3 w-3 mr-1" /> Update
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Call Update Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm uppercase">
              Update Call — {selectedLead?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="font-mono text-muted-foreground uppercase text-[10px]">Phone</span>
                  <p className="font-semibold">{selectedLead.phone || "N/A"}</p>
                </div>
                <div>
                  <span className="font-mono text-muted-foreground uppercase text-[10px]">Email</span>
                  <p className="font-semibold truncate">{selectedLead.emails || "N/A"}</p>
                </div>
                <div>
                  <span className="font-mono text-muted-foreground uppercase text-[10px]">Location</span>
                  <p className="font-semibold">{selectedLead.location || selectedLead.address || "N/A"}</p>
                </div>
                <div>
                  <span className="font-mono text-muted-foreground uppercase text-[10px]">Website</span>
                  <p className="font-semibold truncate">{selectedLead.website || "N/A"}</p>
                </div>
              </div>

              {selectedLead.phone && (
                <a
                  href={`tel:${selectedLead.phone}`}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-green-600 text-white rounded-lg font-mono text-sm hover:bg-green-700 transition-colors"
                >
                  <Phone className="h-4 w-4" /> Call Now: {selectedLead.phone}
                </a>
              )}

              <div>
                <label className="font-mono text-[10px] uppercase text-muted-foreground">Call Status</label>
                <Select value={callStatus} onValueChange={setCallStatus}>
                  <SelectTrigger className="font-mono text-xs border-2 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {callStatusOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value} className="font-mono text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="font-mono text-[10px] uppercase text-muted-foreground">Call Notes</label>
                <Textarea
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="Add notes about this call..."
                  className="font-mono text-xs border-2 mt-1"
                  rows={3}
                />
              </div>

              <Button
                onClick={() => updateLeadCallStatus(selectedLead.id, callStatus, callNotes)}
                className="w-full font-mono text-xs uppercase"
              >
                <CheckCircle className="h-3 w-3 mr-1" /> Save & Update
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamDashboard;
