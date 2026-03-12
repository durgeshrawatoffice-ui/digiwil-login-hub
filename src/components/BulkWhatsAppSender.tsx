import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { School } from "@/types/school";
import { MessageSquare, Send, Users, Check, Phone, ExternalLink, Loader2, Play, Pause, SkipForward, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { whatsappService } from "@/lib/whatsapp-service";

interface BulkWhatsAppSenderProps {
  schools: School[];
}

const DEFAULT_TEMPLATES = [
  {
    name: "Introduction",
    message: `Hi {{name}}! 👋

I'm reaching out from [Your Company]. We help schools like yours with [service].

Would you be interested in a quick chat?`
  },
  {
    name: "Follow-up",
    message: `Hi {{name}},

Just following up on my previous message. We'd love to help {{name}} with [service].

Let me know if you have 5 minutes for a call!`
  },
  {
    name: "Special Offer",
    message: `Hi {{name}}! 🎉

We have a special offer for schools in {{location}}!

[Offer details]

Reply to learn more!`
  }
];

export function BulkWhatsAppSender({ schools }: BulkWhatsAppSenderProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState(DEFAULT_TEMPLATES[0].message);
  const [filter, setFilter] = useState<string>("all");
  const [sending, setSending] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLead, setPreviewLead] = useState<School | null>(null);
  const [sendMode, setSendMode] = useState<"link" | "api">("api");
  const [apiReady, setApiReady] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ sent: number; failed: number; total: number } | null>(null);

  // Check if WhatsApp API is connected
  useEffect(() => {
    const checkApi = async () => {
      const status = await whatsappService.getStatus();
      setApiReady(status.ready);
    };
    checkApi();
    const interval = setInterval(checkApi, 10000);
    return () => clearInterval(interval);
  }, []);

  const leadsWithPhone = useMemo(() => {
    return schools.filter(s => s.phone);
  }, [schools]);

  const filteredLeads = useMemo(() => {
    if (filter === "all") return leadsWithPhone;
    if (filter === "new") return leadsWithPhone.filter(s => s.pipelineStage === "new");
    if (filter === "contacted") return leadsWithPhone.filter(s => s.pipelineStage === "contacted");
    if (filter === "call_needed") return leadsWithPhone.filter(s => s.pipelineStage === "call_needed");
    if (filter === "no_website") return leadsWithPhone.filter(s => s.websiteType === "no_website");
    return leadsWithPhone;
  }, [leadsWithPhone, filter]);

  const selectedLeads = useMemo(() => {
    return filteredLeads.filter(l => selectedIds.has(l.id));
  }, [filteredLeads, selectedIds]);

  const handleSelectAll = () => {
    if (selectedIds.size === filteredLeads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLeads.map(l => l.id)));
    }
  };

  const handleToggle = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const personalizeMessage = (template: string, lead: School) => {
    return template
      .replace(/\{\{name\}\}/g, lead.name || "there")
      .replace(/\{\{location\}\}/g, lead.location || "your area")
      .replace(/\{\{phone\}\}/g, lead.phone || "")
      .replace(/\{\{category\}\}/g, lead.category || "education");
  };

  const handlePreview = (lead: School) => {
    setPreviewLead(lead);
    setPreviewOpen(true);
  };

  const formatPhoneForWhatsApp = (phone: string) => {
    // Remove all non-numeric except + at start
    let cleaned = phone.replace(/[^\d+]/g, "");
    // If starts with 0, assume India and add 91
    if (cleaned.startsWith("0")) {
      cleaned = "91" + cleaned.slice(1);
    }
    // Remove + if present
    cleaned = cleaned.replace(/^\+/, "");
    return cleaned;
  };

  const openWhatsApp = (lead: School) => {
    if (!lead.phone) return;
    const phone = formatPhoneForWhatsApp(lead.phone);
    const text = encodeURIComponent(personalizeMessage(message, lead));
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
  };

  const handleStartBulkSend = async () => {
    if (selectedLeads.length === 0) {
      toast.error("Select at least one lead");
      return;
    }

    setSending(true);
    setCurrentIndex(0);
    setPaused(false);
    setBulkProgress(null);

    if (sendMode === "api") {
      // Use backend API for direct WhatsApp sending
      try {
        const messages = selectedLeads.map(lead => ({
          number: formatPhoneForWhatsApp(lead.phone!),
          message: personalizeMessage(message, lead),
        }));

        toast.info(`Sending ${messages.length} messages via WhatsApp API...`);
        const result = await whatsappService.sendBulk(messages, 3000);

        setBulkProgress(result.summary);

        if (result.summary.sent > 0) {
          toast.success(`✅ Sent ${result.summary.sent}/${result.summary.total} messages`);
        }
        if (result.summary.failed > 0) {
          toast.error(`❌ Failed: ${result.summary.failed} messages`);
        }
      } catch (error: any) {
        toast.error(`Error: ${error.message}`);
      } finally {
        setSending(false);
      }
    } else {
      // Fallback: Open wa.me links in browser
      for (let i = 0; i < selectedLeads.length; i++) {
        if (paused) {
          setCurrentIndex(i);
          break;
        }

        setCurrentIndex(i);
        const lead = selectedLeads[i];
        openWhatsApp(lead);

        if (i < selectedLeads.length - 1) {
          await new Promise(r => setTimeout(r, 3000));
        }
      }

      if (!paused) {
        setSending(false);
        toast.success(`Opened WhatsApp for ${selectedLeads.length} leads`);
      }
    }
  };

  const handlePause = () => {
    setPaused(true);
    setSending(false);
    toast.info("Paused. Click Resume to continue.");
  };

  const handleResume = () => {
    setPaused(false);
    handleStartBulkSend();
  };

  const handleSkip = () => {
    if (currentIndex < selectedLeads.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs font-mono text-muted-foreground">With Phone</p>
                <p className="text-2xl font-bold">{leadsWithPhone.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-chart-2" />
              <div>
                <p className="text-xs font-mono text-muted-foreground">Filtered</p>
                <p className="text-2xl font-bold">{filteredLeads.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-chart-1" />
              <div>
                <p className="text-xs font-mono text-muted-foreground">Selected</p>
                <p className="text-2xl font-bold">{selectedIds.size}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-chart-3" />
              <div>
                <p className="text-xs font-mono text-muted-foreground">Ready to Send</p>
                <p className="text-2xl font-bold">{selectedLeads.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Message Template */}
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Message Template
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {DEFAULT_TEMPLATES.map((t, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="font-mono text-xs"
                  onClick={() => setMessage(t.message)}
                >
                  {t.name}
                </Button>
              ))}
            </div>

            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              className="font-mono text-sm"
              placeholder="Write your message..."
            />

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs cursor-pointer" onClick={() => setMessage(m => m + "{{name}}")}>
                {"{{name}}"}
              </Badge>
              <Badge variant="outline" className="text-xs cursor-pointer" onClick={() => setMessage(m => m + "{{location}}")}>
                {"{{location}}"}
              </Badge>
              <Badge variant="outline" className="text-xs cursor-pointer" onClick={() => setMessage(m => m + "{{category}}")}>
                {"{{category}}"}
              </Badge>
            </div>

            {/* Send Mode Toggle */}
            <div className="flex items-center gap-2 p-2 border rounded-lg bg-secondary/30">
              <button
                onClick={() => setSendMode("api")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors ${sendMode === "api" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                  }`}
              >
                {apiReady ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                API Send
              </button>
              <button
                onClick={() => setSendMode("link")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors ${sendMode === "link" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                  }`}
              >
                <ExternalLink className="h-3 w-3" />
                Link Mode
              </button>
              {sendMode === "api" && !apiReady && (
                <span className="text-[10px] text-destructive font-mono">Not connected</span>
              )}
            </div>

            {bulkProgress && (
              <div className="p-2 border rounded-lg bg-secondary/30 text-xs font-mono space-y-1">
                <p>Last Bulk Send: {bulkProgress.sent} sent, {bulkProgress.failed} failed / {bulkProgress.total} total</p>
              </div>
            )}

            <div className="flex gap-2">
              {!sending ? (
                <Button
                  onClick={handleStartBulkSend}
                  className="flex-1 font-mono uppercase"
                  disabled={selectedLeads.length === 0 || (sendMode === "api" && !apiReady)}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sendMode === "api" ? "Send via API" : "Open Links"} ({selectedLeads.length})
                </Button>
              ) : (
                <>
                  <Button variant="destructive" onClick={handlePause} className="flex-1 font-mono uppercase">
                    <Pause className="h-4 w-4 mr-2" />
                    Pause ({currentIndex + 1}/{selectedLeads.length})
                  </Button>
                  <Button variant="outline" onClick={handleSkip}>
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </>
              )}
              {paused && (
                <Button onClick={handleResume} className="flex-1 font-mono uppercase">
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lead Selection */}
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Select Leads
              </span>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="call_needed">Call Needed</SelectItem>
                  <SelectItem value="no_website">No Website</SelectItem>
                </SelectContent>
              </Select>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <Button variant="outline" size="sm" onClick={handleSelectAll} className="font-mono text-xs">
                {selectedIds.size === filteredLeads.length ? "Deselect All" : "Select All"}
              </Button>
              <span className="text-xs text-muted-foreground">
                {selectedIds.size} of {filteredLeads.length} selected
              </span>
            </div>

            <div className="max-h-[400px] overflow-auto space-y-2">
              {filteredLeads.map(lead => (
                <div
                  key={lead.id}
                  className={`p-3 border rounded-lg flex items-center gap-3 cursor-pointer hover:bg-secondary/50 ${selectedIds.has(lead.id) ? "bg-primary/5 border-primary" : ""}`}
                  onClick={() => handleToggle(lead.id)}
                >
                  <Checkbox checked={selectedIds.has(lead.id)} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">{lead.phone}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handlePreview(lead); }}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {filteredLeads.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No leads with phone numbers</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono uppercase">Message Preview</DialogTitle>
          </DialogHeader>
          {previewLead && (
            <div className="space-y-4">
              <div className="p-3 bg-secondary rounded-lg">
                <p className="font-semibold">{previewLead.name}</p>
                <p className="text-xs text-muted-foreground">{previewLead.phone}</p>
              </div>

              <div className="p-4 bg-[#DCF8C6] dark:bg-[#005C4B] rounded-lg">
                <p className="text-sm whitespace-pre-wrap">
                  {personalizeMessage(message, previewLead)}
                </p>
              </div>

              <Button onClick={() => openWhatsApp(previewLead)} className="w-full font-mono uppercase">
                <Send className="h-4 w-4 mr-2" />
                Open in WhatsApp
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
