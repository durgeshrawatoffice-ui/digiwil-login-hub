import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { School } from "@/types/school";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Play, Pause, Trash2, MessageSquare, Mail, Clock, Users, ArrowRight } from "lucide-react";

interface Sequence {
  id: string;
  name: string;
  description: string | null;
  channel: string;
  is_active: boolean;
  created_at: string;
  steps?: SequenceStep[];
  enrollmentCount?: number;
}

interface SequenceStep {
  id: string;
  step_order: number;
  delay_days: number;
  subject: string | null;
  body: string;
  channel: string;
}

export function NurtureSequences({ schools }: { schools: School[] }) {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newChannel, setNewChannel] = useState("whatsapp");
  const [editingSeq, setEditingSeq] = useState<Sequence | null>(null);
  const [newStep, setNewStep] = useState({ delay_days: 1, subject: "", body: "", channel: "whatsapp" });
  const [enrollDialogSeq, setEnrollDialogSeq] = useState<string | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSequences();
  }, []);

  const loadSequences = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: seqs } = await supabase
      .from("nurture_sequences")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (seqs) {
      const enriched: Sequence[] = [];
      for (const s of seqs) {
        const { data: steps } = await supabase
          .from("sequence_steps")
          .select("*")
          .eq("sequence_id", s.id)
          .order("step_order");
        const { count } = await supabase
          .from("sequence_enrollments")
          .select("*", { count: "exact", head: true })
          .eq("sequence_id", s.id)
          .eq("status", "active");
        enriched.push({ ...s, steps: steps || [], enrollmentCount: count || 0 });
      }
      setSequences(enriched);
    }
  };

  const createSequence = async () => {
    if (!newName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("nurture_sequences").insert({
      user_id: user.id,
      name: newName,
      description: newDesc || null,
      channel: newChannel,
    });

    if (error) { toast.error("Failed to create"); return; }
    toast.success("Sequence created");
    setNewName(""); setNewDesc(""); setCreating(false);
    loadSequences();
  };

  const toggleActive = async (seq: Sequence) => {
    await supabase.from("nurture_sequences").update({ is_active: !seq.is_active }).eq("id", seq.id);
    loadSequences();
  };

  const deleteSequence = async (id: string) => {
    await supabase.from("nurture_sequences").delete().eq("id", id);
    toast.success("Deleted");
    loadSequences();
  };

  const addStep = async () => {
    if (!editingSeq || !newStep.body.trim()) return;
    const nextOrder = (editingSeq.steps?.length || 0) + 1;

    await supabase.from("sequence_steps").insert({
      sequence_id: editingSeq.id,
      step_order: nextOrder,
      delay_days: newStep.delay_days,
      subject: newStep.subject || null,
      body: newStep.body,
      channel: newStep.channel,
    });

    setNewStep({ delay_days: 1, subject: "", body: "", channel: "whatsapp" });
    toast.success("Step added");
    loadSequences();
    // Refresh editing seq
    const updated = sequences.find(s => s.id === editingSeq.id);
    if (updated) setEditingSeq(updated);
  };

  const deleteStep = async (stepId: string) => {
    await supabase.from("sequence_steps").delete().eq("id", stepId);
    toast.success("Step removed");
    loadSequences();
  };

  const enrollLeads = async (seqId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || selectedLeads.size === 0) return;

    const inserts = Array.from(selectedLeads).map(schoolId => ({
      user_id: user.id,
      sequence_id: seqId,
      school_id: schoolId,
    }));

    const { error } = await supabase.from("sequence_enrollments").upsert(inserts, { onConflict: "sequence_id,school_id" });
    if (error) { toast.error("Some leads may already be enrolled"); return; }
    toast.success(`Enrolled ${selectedLeads.size} leads`);
    setSelectedLeads(new Set());
    setEnrollDialogSeq(null);
    loadSequences();
  };

  const channelIcon = (ch: string) => ch === "email" ? <Mail className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Nurture Sequences</h2>
          <p className="text-sm text-muted-foreground">Create automated follow-up sequences for your leads</p>
        </div>
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button className="font-mono text-xs uppercase"><Plus className="h-3 w-3 mr-1" /> New Sequence</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Sequence</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Sequence name" value={newName} onChange={e => setNewName(e.target.value)} />
              <Textarea placeholder="Description (optional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} />
              <Select value={newChannel} onValueChange={setNewChannel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={createSequence} className="w-full font-mono text-xs uppercase">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {sequences.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No sequences yet. Create one to start nurturing leads.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sequences.map(seq => (
            <Card key={seq.id} className="border-2">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold">{seq.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Switch checked={seq.is_active} onCheckedChange={() => toggleActive(seq)} />
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteSequence(seq.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
                {seq.description && <p className="text-xs text-muted-foreground">{seq.description}</p>}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {channelIcon(seq.channel)} {seq.channel}
                  </Badge>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {seq.steps?.length || 0} steps
                  </Badge>
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    <Users className="h-2.5 w-2.5 mr-1" /> {seq.enrollmentCount} enrolled
                  </Badge>
                </div>

                {/* Step timeline */}
                {seq.steps && seq.steps.length > 0 && (
                  <div className="flex items-center gap-1 overflow-x-auto py-1">
                    {seq.steps.map((step, i) => (
                      <div key={step.id} className="flex items-center gap-1">
                        <div className="flex flex-col items-center">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-mono font-bold text-primary">
                            {i + 1}
                          </div>
                          <span className="text-[9px] text-muted-foreground mt-0.5">
                            <Clock className="h-2 w-2 inline" /> {step.delay_days}d
                          </span>
                        </div>
                        {i < seq.steps!.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" className="font-mono text-[10px] flex-1" onClick={() => { setEditingSeq(seq); }}>
                    Edit Steps
                  </Button>
                  <Button variant="outline" size="sm" className="font-mono text-[10px] flex-1" onClick={() => setEnrollDialogSeq(seq.id)}>
                    <Users className="h-3 w-3 mr-1" /> Enroll Leads
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Steps Dialog */}
      <Dialog open={!!editingSeq} onOpenChange={(o) => { if (!o) { setEditingSeq(null); loadSequences(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Steps - {editingSeq?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {editingSeq?.steps?.map(step => (
              <div key={step.id} className="p-3 border rounded space-y-1">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="font-mono text-[10px]">Step {step.step_order} • Wait {step.delay_days} days</Badge>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => deleteStep(step.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
                {step.subject && <p className="text-xs font-medium">Subject: {step.subject}</p>}
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{step.body}</p>
              </div>
            ))}

            <div className="border-t pt-3 space-y-2">
              <p className="text-xs font-mono uppercase text-muted-foreground">Add New Step</p>
              <div className="flex gap-2">
                <Input type="number" min={0} placeholder="Delay (days)" className="w-28" value={newStep.delay_days} onChange={e => setNewStep(p => ({ ...p, delay_days: parseInt(e.target.value) || 0 }))} />
                <Select value={newStep.channel} onValueChange={v => setNewStep(p => ({ ...p, channel: v }))}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input placeholder="Subject (for email)" value={newStep.subject} onChange={e => setNewStep(p => ({ ...p, subject: e.target.value }))} />
              <Textarea placeholder="Message body. Use {{name}}, {{business}} as placeholders" value={newStep.body} onChange={e => setNewStep(p => ({ ...p, body: e.target.value }))} rows={3} />
              <Button onClick={addStep} size="sm" className="font-mono text-xs"><Plus className="h-3 w-3 mr-1" /> Add Step</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enroll Leads Dialog */}
      <Dialog open={!!enrollDialogSeq} onOpenChange={(o) => { if (!o) { setEnrollDialogSeq(null); setSelectedLeads(new Set()); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Enroll Leads</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {schools.filter(s => s.phone || s.emails).slice(0, 50).map(s => (
              <label key={s.id} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-accent/50">
                <input
                  type="checkbox"
                  checked={selectedLeads.has(s.id)}
                  onChange={e => {
                    const next = new Set(selectedLeads);
                    e.target.checked ? next.add(s.id) : next.delete(s.id);
                    setSelectedLeads(next);
                  }}
                  className="rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.name}</p>
                  <p className="text-[10px] text-muted-foreground">{s.phone || s.emails || "No contact"}</p>
                </div>
              </label>
            ))}
          </div>
          <Button onClick={() => enrollDialogSeq && enrollLeads(enrollDialogSeq)} disabled={selectedLeads.size === 0} className="w-full font-mono text-xs uppercase">
            Enroll {selectedLeads.size} Leads
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
