import { useState, useMemo, useEffect } from "react";
import { School } from "@/types/school";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MessageCircle, Mail, Phone, ExternalLink, Send, Copy, Search, Wifi, WifiOff, Loader2 } from "lucide-react";
import { whatsappService } from "@/lib/whatsapp-service";

interface DirectOutreachProps {
  schools: School[];
}

export function DirectOutreach({ schools }: DirectOutreachProps) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [waMessage, setWaMessage] = useState(
    "Hi {{name}},\n\nI came across your business and wanted to reach out about how we can help you grow your online presence.\n\nWould you be available for a quick chat this week?"
  );
  const [emailSubject, setEmailSubject] = useState("Partnership Opportunity – {{name}}");
  const [emailBody, setEmailBody] = useState(
    "Dear Team,\n\nI noticed {{name}} and believe we could add value to your operations.\n\nI'd love to schedule a brief call to discuss how we might collaborate.\n\nBest regards"
  );

  const contactableLeads = useMemo(() => {
    return schools.filter(s => s.phone || s.emails).filter(s =>
      !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.location?.toLowerCase().includes(search.toLowerCase())
    );
  }, [schools, search]);

  const selected = selectedId ? schools.find(s => s.id === selectedId) : null;

  const fillTemplate = (template: string, school: School) => {
    return template
      .replace(/\{\{name\}\}/g, school.name)
      .replace(/\{\{location\}\}/g, school.location || "")
      .replace(/\{\{category\}\}/g, school.category || "")
      .replace(/\{\{phone\}\}/g, school.phone || "")
      .replace(/\{\{email\}\}/g, school.emails?.split(",")[0] || "");
  };

  const openWhatsApp = (school: School) => {
    if (!school.phone) { toast.error("No phone number"); return; }
    const phone = school.phone.replace(/[^0-9+]/g, "").replace(/^\+/, "");
    const msg = encodeURIComponent(fillTemplate(waMessage, school));
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  const openEmail = (school: School) => {
    const email = school.emails?.split(",")[0]?.trim();
    if (!email) { toast.error("No email address"); return; }
    const subject = encodeURIComponent(fillTemplate(emailSubject, school));
    const body = encodeURIComponent(fillTemplate(emailBody, school));
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
  };

  const openPhone = (school: School) => {
    if (!school.phone) return;
    window.open(`tel:${school.phone}`, "_blank");
  };

  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    toast.success("Phone copied!");
  };

  const [apiReady, setApiReady] = useState(false);
  const [apiSending, setApiSending] = useState(false);

  useEffect(() => {
    const check = async () => {
      const s = await whatsappService.getStatus();
      setApiReady(s.ready);
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  const sendViaApi = async (school: School) => {
    if (!school.phone) { toast.error("No phone number"); return; }
    setApiSending(true);
    try {
      const phone = school.phone.replace(/[^0-9+]/g, "").replace(/^\+/, "");
      const msg = fillTemplate(waMessage, school);
      const result = await whatsappService.sendMessage(phone, msg);
      if (result.success) {
        toast.success(`Message sent to ${school.name} ✅`);
      } else {
        toast.error(result.error || "Failed to send");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to send");
    } finally {
      setApiSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        {/* Templates */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-chart-2" />
              WhatsApp Template
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={waMessage}
              onChange={e => setWaMessage(e.target.value)}
              className="font-mono text-xs min-h-[120px]"
              placeholder="Use {{name}}, {{location}}, {{category}} as merge fields..."
            />
            <p className="text-[10px] text-muted-foreground mt-1 font-mono">
              Merge fields: {"{{name}}"}, {"{{location}}"}, {"{{category}}"}, {"{{phone}}"}, {"{{email}}"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono flex items-center gap-2">
              <Mail className="h-4 w-4 text-chart-4" />
              Email Template
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              value={emailSubject}
              onChange={e => setEmailSubject(e.target.value)}
              className="font-mono text-xs"
              placeholder="Subject line..."
            />
            <Textarea
              value={emailBody}
              onChange={e => setEmailBody(e.target.value)}
              className="font-mono text-xs min-h-[90px]"
              placeholder="Email body..."
            />
          </CardContent>
        </Card>
      </div>

      {/* Contact List */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-mono">
              Contactable Leads ({contactableLeads.length})
            </CardTitle>
            <div className="relative w-48">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-7 h-8 font-mono text-xs"
                placeholder="Search..."
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 max-h-[500px] overflow-y-auto">
            {contactableLeads.slice(0, 50).map(s => (
              <div
                key={s.id}
                className={`flex items-center gap-3 p-2 rounded border cursor-pointer transition-colors ${selectedId === s.id ? "bg-primary/10 border-primary/30" : "bg-background hover:bg-secondary/50"
                  }`}
                onClick={() => setSelectedId(s.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono truncate">
                    {[s.location, s.category].filter(Boolean).join(" • ")}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {s.phone && (
                    <>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); openWhatsApp(s); }}>
                        <MessageCircle className="h-3.5 w-3.5 text-chart-2" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); openPhone(s); }}>
                        <Phone className="h-3.5 w-3.5 text-chart-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); copyPhone(s.phone!); }}>
                        <Copy className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </>
                  )}
                  {s.emails && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); openEmail(s); }}>
                      <Mail className="h-3.5 w-3.5 text-chart-5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {contactableLeads.length === 0 && (
              <p className="text-sm text-muted-foreground font-mono text-center py-4">No contactable leads found. Import leads with phone or email first.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {selected && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono">Preview for: {selected.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selected.phone && (
              <div className="p-3 rounded border bg-chart-2/5">
                <p className="text-xs font-mono uppercase text-muted-foreground mb-1">WhatsApp Message</p>
                <p className="text-sm whitespace-pre-wrap">{fillTemplate(waMessage, selected)}</p>
                <Button size="sm" className="mt-2 font-mono text-xs" onClick={() => openWhatsApp(selected)}>
                  <Send className="h-3 w-3 mr-1" /> Open WhatsApp
                </Button>
                <Button
                  size="sm"
                  variant={apiReady ? "default" : "outline"}
                  className="mt-2 ml-1 font-mono text-xs"
                  onClick={() => sendViaApi(selected)}
                  disabled={!apiReady || apiSending}
                >
                  {apiSending ? (
                    <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Sending...</>
                  ) : (
                    <>{apiReady ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />} Send via API</>
                  )}
                </Button>
              </div>
            )}
            {selected.emails && (
              <div className="p-3 rounded border bg-chart-4/5">
                <p className="text-xs font-mono uppercase text-muted-foreground mb-1">Email</p>
                <p className="text-sm font-medium">{fillTemplate(emailSubject, selected)}</p>
                <p className="text-sm whitespace-pre-wrap mt-1">{fillTemplate(emailBody, selected)}</p>
                <Button size="sm" className="mt-2 font-mono text-xs" variant="outline" onClick={() => openEmail(selected)}>
                  <Mail className="h-3 w-3 mr-1" /> Send Email
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
