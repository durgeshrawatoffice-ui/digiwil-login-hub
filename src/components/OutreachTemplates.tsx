import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { School, PipelineStage } from "@/types/school";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Copy, MessageCircle, Mail, Trash2, Save, Sparkles, Phone } from "lucide-react";

interface Template {
  id: string;
  pipeline_stage: string;
  channel: string;
  name: string;
  subject?: string;
  body: string;
}

const MERGE_FIELDS = [
  { key: "{name}", label: "Business Name" },
  { key: "{location}", label: "Location" },
  { key: "{phone}", label: "Phone" },
  { key: "{email}", label: "Email" },
  { key: "{website}", label: "Website" },
  { key: "{category}", label: "Category" },
  { key: "{rating}", label: "Rating" },
  { key: "{quality_score}", label: "Quality Score" },
];

const STAGE_OPTIONS: { key: PipelineStage; label: string }[] = [
  { key: "new", label: "🆕 New Leads" },
  { key: "call_needed", label: "📞 Needs Call" },
  { key: "contacted", label: "💬 Contacted" },
  { key: "qualified", label: "✅ Qualified" },
  { key: "proposal", label: "📋 Proposal" },
  { key: "won", label: "🏆 Won" },
  { key: "lost", label: "❌ Lost" },
];

const DEFAULT_TEMPLATES: Omit<Template, "id">[] = [
  {
    pipeline_stage: "new",
    channel: "whatsapp",
    name: "Initial Outreach",
    body: "Hi! 👋 I noticed {name} in {location} and wanted to reach out. We help businesses like yours grow their online presence. Would you be open to a quick chat?",
  },
  {
    pipeline_stage: "new",
    channel: "email",
    name: "Introduction Email",
    subject: "Grow {name}'s Online Presence",
    body: "Dear Team at {name},\n\nI hope this finds you well. I'm reaching out because we specialize in helping businesses like {name} in {location} enhance their digital presence.\n\nWould you be available for a brief call this week?\n\nBest regards,\n[Your Name]",
  },
  {
    pipeline_stage: "call_needed",
    channel: "whatsapp",
    name: "Follow-up (No Website)",
    body: "Hi! We noticed {name} doesn't have a website yet. In today's digital world, a professional website can bring you 3x more customers. We'd love to help — interested in a free consultation?",
  },
  {
    pipeline_stage: "qualified",
    channel: "email",
    name: "Proposal Follow-up",
    subject: "Website Proposal for {name}",
    body: "Dear {name} Team,\n\nFollowing our conversation, I'm excited to share how we can transform your online presence.\n\nYour current quality score is {quality_score}% — we typically help businesses reach 95%+.\n\nLet's schedule a demo this week!\n\nBest regards,\n[Your Name]",
  },
];

function compileMergeFields(template: string, school: School): string {
  return template
    .replace(/{name}/g, school.name || "")
    .replace(/{location}/g, school.location || "")
    .replace(/{phone}/g, school.phone || "")
    .replace(/{email}/g, school.emails?.split(",")[0] || "")
    .replace(/{website}/g, school.detectedWebsite || school.website || "")
    .replace(/{category}/g, school.category || "")
    .replace(/{rating}/g, String(school.rating || ""))
    .replace(/{quality_score}/g, String(school.qualityScore?.overall || ""));
}

interface OutreachTemplatesProps {
  schools: School[];
}

export function OutreachTemplates({ schools }: OutreachTemplatesProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [previewSchool, setPreviewSchool] = useState<School | null>(null);
  const [newTemplate, setNewTemplate] = useState<Omit<Template, "id">>({
    pipeline_stage: "new",
    channel: "whatsapp",
    name: "",
    subject: "",
    body: "",
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data, error } = await (supabase as any)
      .from("outreach_templates")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading templates:", error);
      return;
    }

    if (data && data.length > 0) {
      setTemplates(data);
    } else {
      // Seed default templates
      const rows = DEFAULT_TEMPLATES.map((t) => ({
        ...t,
        user_id: userData.user.id,
      }));
      const { data: inserted } = await (supabase as any)
        .from("outreach_templates")
        .insert(rows)
        .select();
      if (inserted) setTemplates(inserted);
    }
  };

  const saveTemplate = async (template: Template) => {
    const { error } = await (supabase as any)
      .from("outreach_templates")
      .update({
        name: template.name,
        subject: template.subject,
        body: template.body,
        pipeline_stage: template.pipeline_stage,
        channel: template.channel,
        updated_at: new Date().toISOString(),
      })
      .eq("id", template.id);

    if (error) {
      toast.error("Failed to save template");
    } else {
      toast.success("Template saved");
      setEditingTemplate(null);
      loadTemplates();
    }
  };

  const createTemplate = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { error } = await (supabase as any)
      .from("outreach_templates")
      .insert({ ...newTemplate, user_id: userData.user.id });

    if (error) {
      toast.error("Failed to create template");
    } else {
      toast.success("Template created");
      setShowNewDialog(false);
      setNewTemplate({ pipeline_stage: "new", channel: "whatsapp", name: "", subject: "", body: "" });
      loadTemplates();
    }
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await (supabase as any).from("outreach_templates").delete().eq("id", id);
    if (!error) {
      toast.success("Template deleted");
      loadTemplates();
    }
  };

  const copyCompiled = (template: Template, school: School) => {
    const text = compileMergeFields(template.body, school);
    navigator.clipboard.writeText(text);
    toast.success("Message copied with merged fields");
  };

  const openWhatsApp = (template: Template, school: School) => {
    const text = compileMergeFields(template.body, school);
    const phone = school.phone?.replace(/[^0-9+]/g, "") || "";
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const openEmail = (template: Template, school: School) => {
    const body = compileMergeFields(template.body, school);
    const subject = compileMergeFields(template.subject || "", school);
    const email = school.emails?.split(",")[0] || "";
    window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
  };

  const filteredTemplates = selectedStage === "all"
    ? templates
    : templates.filter((t) => t.pipeline_stage === selectedStage);

  const sampleSchool = previewSchool || schools[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Outreach Templates</h2>
          <p className="text-xs text-muted-foreground font-mono">
            Customizable templates per pipeline stage with merge fields
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedStage} onValueChange={setSelectedStage}>
            <SelectTrigger className="w-[180px] h-8 text-xs font-mono border-2">
              <SelectValue placeholder="Filter by stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs font-mono">All Stages</SelectItem>
              {STAGE_OPTIONS.map((s) => (
                <SelectItem key={s.key} value={s.key} className="text-xs font-mono">{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="font-mono text-xs uppercase">
                <Plus className="h-3 w-3 mr-1" /> New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-mono text-sm uppercase">Create Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  placeholder="Template name"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  className="text-sm font-mono border-2"
                />
                <div className="flex gap-2">
                  <Select value={newTemplate.pipeline_stage} onValueChange={(v) => setNewTemplate({ ...newTemplate, pipeline_stage: v })}>
                    <SelectTrigger className="flex-1 text-xs font-mono border-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGE_OPTIONS.map((s) => (
                        <SelectItem key={s.key} value={s.key} className="text-xs font-mono">{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={newTemplate.channel} onValueChange={(v) => setNewTemplate({ ...newTemplate, channel: v })}>
                    <SelectTrigger className="flex-1 text-xs font-mono border-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp" className="text-xs font-mono">WhatsApp</SelectItem>
                      <SelectItem value="email" className="text-xs font-mono">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newTemplate.channel === "email" && (
                  <Input
                    placeholder="Email subject (merge fields supported)"
                    value={newTemplate.subject || ""}
                    onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                    className="text-sm font-mono border-2"
                  />
                )}
                <Textarea
                  placeholder="Message body..."
                  value={newTemplate.body}
                  onChange={(e) => setNewTemplate({ ...newTemplate, body: e.target.value })}
                  className="min-h-[120px] text-sm font-mono border-2"
                />
                <div className="flex flex-wrap gap-1">
                  {MERGE_FIELDS.map((f) => (
                    <Button
                      key={f.key}
                      variant="outline"
                      size="sm"
                      className="text-[10px] font-mono h-6 px-2"
                      onClick={() => setNewTemplate({ ...newTemplate, body: newTemplate.body + f.key })}
                    >
                      {f.key}
                    </Button>
                  ))}
                </div>
                <Button onClick={createTemplate} disabled={!newTemplate.name || !newTemplate.body} className="w-full font-mono text-xs uppercase">
                  <Save className="h-3 w-3 mr-1" /> Create Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Merge Fields Reference */}
      <Card className="border-2 bg-secondary/20">
        <CardContent className="p-3">
          <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1.5">Available Merge Fields</p>
          <div className="flex flex-wrap gap-1.5">
            {MERGE_FIELDS.map((f) => (
              <Badge key={f.key} variant="outline" className="text-[10px] font-mono">
                <Sparkles className="h-2 w-2 mr-0.5" /> {f.key} — {f.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Template Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="border-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-mono flex items-center gap-2">
                  {template.channel === "whatsapp" ? (
                    <MessageCircle className="h-3.5 w-3.5 text-chart-2" />
                  ) : (
                    <Mail className="h-3.5 w-3.5 text-chart-4" />
                  )}
                  {template.name}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-[9px] font-mono">
                    {STAGE_OPTIONS.find((s) => s.key === template.pipeline_stage)?.label || template.pipeline_stage}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteTemplate(template.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {editingTemplate?.id === template.id ? (
                <div className="space-y-2">
                  <Input
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                    className="text-xs font-mono border-2 h-7"
                  />
                  {editingTemplate.channel === "email" && (
                    <Input
                      value={editingTemplate.subject || ""}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                      placeholder="Subject"
                      className="text-xs font-mono border-2 h-7"
                    />
                  )}
                  <Textarea
                    value={editingTemplate.body}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                    className="min-h-[80px] text-xs font-mono border-2"
                  />
                  <div className="flex flex-wrap gap-1">
                    {MERGE_FIELDS.map((f) => (
                      <Button
                        key={f.key}
                        variant="outline"
                        size="sm"
                        className="text-[10px] font-mono h-5 px-1.5"
                        onClick={() => setEditingTemplate({ ...editingTemplate, body: editingTemplate.body + f.key })}
                      >
                        {f.key}
                      </Button>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" className="flex-1 font-mono text-xs" onClick={() => saveTemplate(editingTemplate)}>
                      <Save className="h-3 w-3 mr-1" /> Save
                    </Button>
                    <Button size="sm" variant="outline" className="font-mono text-xs" onClick={() => setEditingTemplate(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {template.subject && (
                    <p className="text-[10px] font-mono text-muted-foreground">Subject: {template.subject}</p>
                  )}
                  <pre className="text-[11px] font-mono bg-secondary/50 p-2 border whitespace-pre-wrap max-h-32 overflow-auto">
                    {sampleSchool ? compileMergeFields(template.body, sampleSchool) : template.body}
                  </pre>
                  <div className="flex gap-1 flex-wrap">
                    <Button size="sm" variant="outline" className="text-[10px] font-mono h-7" onClick={() => setEditingTemplate(template)}>
                      Edit
                    </Button>
                    {sampleSchool && (
                      <>
                        <Button size="sm" variant="outline" className="text-[10px] font-mono h-7" onClick={() => copyCompiled(template, sampleSchool)}>
                          <Copy className="h-2.5 w-2.5 mr-1" /> Copy
                        </Button>
                        {template.channel === "whatsapp" && (
                          <Button size="sm" variant="outline" className="text-[10px] font-mono h-7" onClick={() => openWhatsApp(template, sampleSchool)}>
                            <MessageCircle className="h-2.5 w-2.5 mr-1" /> Send
                          </Button>
                        )}
                        {template.channel === "email" && (
                          <Button size="sm" variant="outline" className="text-[10px] font-mono h-7" onClick={() => openEmail(template, sampleSchool)}>
                            <Mail className="h-2.5 w-2.5 mr-1" /> Send
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <Card className="border-2">
          <CardContent className="py-12 text-center text-muted-foreground font-mono text-sm">
            No templates for this stage. Create one to get started!
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export { compileMergeFields, MERGE_FIELDS };
export type { Template };
