import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { School } from "@/types/school";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, UserPlus, Users, Phone, CheckCircle, Clock, UserCheck } from "lucide-react";

interface TeamMember {
  id: string;
  member_email: string;
  member_name: string | null;
  role: string;
  invited_at: string;
  accepted: boolean;
}

interface CallLog {
  id: string;
  school_id: string;
  caller_name: string | null;
  call_status: string;
  call_notes: string | null;
  duration_seconds: number | null;
  created_at: string;
}

interface TeamManagementProps {
  schools: School[];
  onAssignLead: (schoolId: string, assignedTo: string, assignedName: string) => void;
}

export function TeamManagement({ schools, onAssignLead }: TeamManagementProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("member");

  useEffect(() => {
    loadTeam();
    loadCallLogs();
  }, []);

  const loadTeam = async () => {
    const { data, error } = await (supabase as any)
      .from("team_members")
      .select("*")
      .order("invited_at", { ascending: true });
    if (data) setMembers(data);
  };

  const loadCallLogs = async () => {
    const { data } = await (supabase as any)
      .from("call_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setCallLogs(data);
  };

  const inviteMember = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { error } = await (supabase as any).from("team_members").insert({
      owner_id: userData.user.id,
      member_email: newEmail,
      member_name: newName || null,
      role: newRole,
    });

    if (error) {
      toast.error("Failed to invite: " + error.message);
      return;
    }

    // Send actual invitation email via Edge Function
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        "send-team-invite",
        {
          body: {
            memberEmail: newEmail,
            memberName: newName || null,
            role: newRole,
            inviterName: userData.user.email,
          },
        }
      );

      if (fnError) {
        console.error("Email send error:", fnError);
        toast.success(`Added ${newEmail} to team (email delivery pending)`);
      } else if (fnData?.emailSent) {
        toast.success(`Invitation email sent to ${newEmail}! 📧`);
      } else {
        toast.success(`Added ${newEmail} to team. ${fnData?.message || ""}`);
      }
    } catch (emailErr) {
      console.error("Email function error:", emailErr);
      toast.success(`Added ${newEmail} to team (email sending unavailable)`);
    }

    setShowInvite(false);
    setNewEmail("");
    setNewName("");
    loadTeam();
  };

  const removeMember = async (id: string) => {
    const { error } = await (supabase as any).from("team_members").delete().eq("id", id);
    if (!error) {
      toast.success("Team member removed");
      loadTeam();
    }
  };

  // Stats per member
  const memberStats = members.map((m) => {
    const assigned = schools.filter((s) => s.assignedTo === m.member_email);
    const memberLogs = callLogs.filter((l) => l.caller_name === m.member_name || l.caller_name === m.member_email);
    const completed = memberLogs.filter((l) => l.call_status === "completed").length;
    return {
      ...m,
      assignedCount: assigned.length,
      callsMade: memberLogs.length,
      callsCompleted: completed,
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Users className="h-5 w-5" /> Team
          </h2>
          <p className="text-xs text-muted-foreground font-mono">{members.length} members</p>
        </div>
        <Dialog open={showInvite} onOpenChange={setShowInvite}>
          <DialogTrigger asChild>
            <Button size="sm" className="font-mono text-xs uppercase">
              <UserPlus className="h-3 w-3 mr-1" /> Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-mono text-sm uppercase">Invite Team Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="text-sm font-mono border-2"
              />
              <Input
                placeholder="Email address"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="text-sm font-mono border-2"
              />
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="text-xs font-mono border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin" className="text-xs font-mono">Admin</SelectItem>
                  <SelectItem value="member" className="text-xs font-mono">Member</SelectItem>
                  <SelectItem value="caller" className="text-xs font-mono">Caller</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={inviteMember} disabled={!newEmail} className="w-full font-mono text-xs uppercase">
                <UserPlus className="h-3 w-3 mr-1" /> Send Invite
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {memberStats.map((m) => (
          <Card key={m.id} className="border-2">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm">{m.member_name || m.member_email}</p>
                  <p className="text-[10px] font-mono text-muted-foreground">{m.member_email}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant={m.role === "admin" ? "default" : "secondary"} className="text-[9px] font-mono">
                    {m.role.toUpperCase()}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeMember(m.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="text-center">
                  <p className="text-lg font-bold font-mono">{m.assignedCount}</p>
                  <p className="text-[9px] font-mono text-muted-foreground">Assigned</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold font-mono">{m.callsMade}</p>
                  <p className="text-[9px] font-mono text-muted-foreground">Calls</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold font-mono">{m.callsCompleted}</p>
                  <p className="text-[9px] font-mono text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {members.length === 0 && (
        <Card className="border-2">
          <CardContent className="py-12 text-center text-muted-foreground font-mono text-sm">
            No team members yet. Invite your first team member to start collaborating!
          </CardContent>
        </Card>
      )}

      {/* Lead Assignment */}
      {members.length > 0 && schools.length > 0 && (
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase flex items-center gap-2">
              <UserCheck className="h-4 w-4" /> Lead Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2">
                    <TableHead className="font-mono text-xs uppercase">Lead</TableHead>
                    <TableHead className="font-mono text-xs uppercase">Stage</TableHead>
                    <TableHead className="font-mono text-xs uppercase">Assigned To</TableHead>
                    <TableHead className="font-mono text-xs uppercase">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schools.slice(0, 50).map((school) => (
                    <TableRow key={school.id} className="border-b">
                      <TableCell className="text-xs font-semibold">{school.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[9px] font-mono">{school.pipelineStage}</Badge>
                      </TableCell>
                      <TableCell>
                        {school.assignedName ? (
                          <Badge variant="secondary" className="text-[9px] font-mono">{school.assignedName}</Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-mono">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={school.assignedTo || "unassigned"}
                          onValueChange={(v) => {
                            if (v === "unassigned") {
                              onAssignLead(school.id, "", "");
                            } else {
                              const member = members.find((m) => m.member_email === v);
                              onAssignLead(school.id, v, member?.member_name || v);
                            }
                          }}
                        >
                          <SelectTrigger className="h-7 text-[10px] font-mono border w-[140px]">
                            <SelectValue placeholder="Assign" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned" className="text-xs font-mono">Unassigned</SelectItem>
                            {members.map((m) => (
                              <SelectItem key={m.id} value={m.member_email} className="text-xs font-mono">
                                {m.member_name || m.member_email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Call Activity */}
      {callLogs.length > 0 && (
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase flex items-center gap-2">
              <Phone className="h-4 w-4" /> Recent Call Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {callLogs.slice(0, 15).map((log) => {
                const school = schools.find((s) => s.id === log.school_id);
                return (
                  <div key={log.id} className="flex items-center justify-between p-2 border bg-secondary/20 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      {log.call_status === "completed" ? (
                        <CheckCircle className="h-3 w-3 text-chart-2" />
                      ) : (
                        <Clock className="h-3 w-3 text-muted-foreground" />
                      )}
                      <span className="font-semibold">{log.caller_name || "Unknown"}</span>
                      <span className="text-muted-foreground">→</span>
                      <span>{school?.name || "Unknown Lead"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px]">{log.call_status}</Badge>
                      <span className="text-[9px] text-muted-foreground">
                        {new Date(log.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
