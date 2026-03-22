import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { School } from "@/types/school";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserCheck, Users, Send, Search, CheckCircle } from "lucide-react";

interface TeamMember {
  id: string;
  member_email: string;
  member_name: string | null;
  role: string;
}

interface AdminLeadAssignmentProps {
  schools: School[];
  onAssignLead: (schoolId: string, assignedTo: string, assignedName: string) => void;
}

export function AdminLeadAssignment({ schools, onAssignLead }: AdminLeadAssignmentProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState("");
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [filterAssigned, setFilterAssigned] = useState("unassigned");

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    const { data } = await (supabase as any)
      .from('team_members')
      .select('id, member_email, member_name, role')
      .order('invited_at', { ascending: true });
    if (data) setMembers(data);
  };

  const filteredSchools = schools.filter(s => {
    const matchesSearch = !search || 
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.phone && s.phone.includes(search));
    
    if (filterAssigned === "unassigned") return matchesSearch && !s.assignedTo;
    if (filterAssigned === "assigned") return matchesSearch && !!s.assignedTo;
    return matchesSearch;
  });

  const toggleAll = () => {
    if (selectedLeads.size === filteredSchools.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(filteredSchools.map(s => s.id)));
    }
  };

  const toggleLead = (id: string) => {
    const next = new Set(selectedLeads);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedLeads(next);
  };

  const bulkAssign = async () => {
    if (!selectedMember || selectedLeads.size === 0) {
      toast.error("Select a team member and leads to assign");
      return;
    }

    const member = members.find(m => m.member_email === selectedMember);
    if (!member) return;

    setAssigning(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setAssigning(false); return; }

    let count = 0;
    for (const leadId of selectedLeads) {
      onAssignLead(leadId, member.member_email, member.member_name || member.member_email);
      
      // Create lead_assignment record
      await (supabase as any).from('lead_assignments').insert({
        school_id: leadId,
        assigned_to: member.member_user_id || user.id,
        assigned_by: user.id,
        status: 'pending',
        priority: 'medium',
        progress_percentage: 0,
      }).then(() => {}).catch(() => {});

      count++;
    }

    toast.success(`Assigned ${count} leads to ${member.member_name || member.member_email}`);
    setSelectedLeads(new Set());
    setAssigning(false);
  };

  // Stats per member
  const memberAssignmentCounts = members.map(m => ({
    ...m,
    count: schools.filter(s => s.assignedTo === m.member_email).length,
    completed: schools.filter(s => s.assignedTo === m.member_email && s.callStatus === 'completed').length,
  }));

  return (
    <div className="space-y-4">
      {/* Member overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {memberAssignmentCounts.map(m => (
          <Card key={m.id} className={`border-2 cursor-pointer transition-colors ${selectedMember === m.member_email ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/30'}`}
            onClick={() => setSelectedMember(m.member_email)}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm truncate">{m.member_name || m.member_email}</p>
                  <p className="text-[9px] font-mono text-muted-foreground">{m.role}</p>
                </div>
                {selectedMember === m.member_email && (
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                )}
              </div>
              <div className="flex gap-3 mt-2">
                <div className="text-center">
                  <p className="text-lg font-bold font-mono">{m.count}</p>
                  <p className="text-[8px] font-mono text-muted-foreground">ASSIGNED</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold font-mono text-green-600">{m.completed}</p>
                  <p className="text-[8px] font-mono text-muted-foreground">DONE</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bulk assignment toolbar */}
      <Card className="border-2">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Select value={selectedMember} onValueChange={setSelectedMember}>
              <SelectTrigger className="w-[220px] font-mono text-xs border-2">
                <Users className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                {members.map(m => (
                  <SelectItem key={m.id} value={m.member_email} className="font-mono text-xs">
                    {m.member_name || m.member_email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 font-mono text-xs border-2 h-9"
              />
            </div>

            <Select value={filterAssigned} onValueChange={setFilterAssigned}>
              <SelectTrigger className="w-[150px] font-mono text-xs border-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-mono text-xs">All Leads</SelectItem>
                <SelectItem value="unassigned" className="font-mono text-xs">Unassigned</SelectItem>
                <SelectItem value="assigned" className="font-mono text-xs">Assigned</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={bulkAssign}
              disabled={!selectedMember || selectedLeads.size === 0 || assigning}
              className="font-mono text-xs uppercase shrink-0"
              size="sm"
            >
              <Send className="h-3 w-3 mr-1" />
              Assign {selectedLeads.size > 0 ? `(${selectedLeads.size})` : ""}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Leads table with checkboxes */}
      <Card className="border-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-mono uppercase flex items-center gap-2">
            <UserCheck className="h-4 w-4" /> Select Leads to Assign ({filteredSchools.length} shown)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 overflow-auto max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow className="border-b-2">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedLeads.size === filteredSchools.length && filteredSchools.length > 0}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead className="font-mono text-[10px] uppercase">Name</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase">Phone</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase">Location</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase">Call Status</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase">Assigned To</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSchools.slice(0, 200).map((school) => (
                  <TableRow key={school.id} className="border-b">
                    <TableCell>
                      <Checkbox
                        checked={selectedLeads.has(school.id)}
                        onCheckedChange={() => toggleLead(school.id)}
                      />
                    </TableCell>
                    <TableCell className="text-xs font-semibold">{school.name}</TableCell>
                    <TableCell className="text-xs font-mono">{school.phone || "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{school.location || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px] font-mono">
                        {school.callStatus || "pending"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {school.assignedName ? (
                        <Badge variant="secondary" className="text-[9px] font-mono">{school.assignedName}</Badge>
                      ) : (
                        <span className="text-[10px] text-muted-foreground font-mono">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
