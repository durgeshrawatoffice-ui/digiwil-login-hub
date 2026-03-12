import { School } from "@/types/school";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, MessageCircle, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OutreachDialogProps {
  school: School;
  open: boolean;
  onClose: () => void;
}

export function OutreachDialog({ school, open, onClose }: OutreachDialogProps) {
  const { toast } = useToast();

  const whatsappMessage = `Hi! 👋

I noticed ${school.name}'s website and wanted to reach out. We help schools improve their online presence with modern, mobile-friendly websites that load fast and rank well on Google.

${school.qualityScore ? `Based on our analysis, your current site scores ${school.qualityScore.overall}% on our quality index${!school.qualityScore.ssl ? " and is missing SSL security" : ""}. We can help improve that significantly.` : ""}

Would you be open to a quick 15-minute call to discuss how we can help?

Best regards`;

  const emailTemplate = `Subject: Improve ${school.name}'s Online Presence

Dear School Administrator,

I hope this message finds you well. I'm reaching out because we specialize in helping educational institutions like ${school.name} enhance their digital presence.

${school.qualityScore ? `After reviewing your current website, we identified some areas for improvement:
${school.qualityScore.mobile < 70 ? "• Mobile responsiveness could be improved\n" : ""}${school.qualityScore.speed < 70 ? "• Page loading speed needs optimization\n" : ""}${!school.qualityScore.ssl ? "• SSL certificate is missing (security concern)\n" : ""}
Your current quality score is ${school.qualityScore.overall}% — we typically help schools reach 90%+.` : ""}

We'd love to offer a free website audit and consultation. Would you be available for a brief call this week?

Looking forward to hearing from you.

Best regards,
[Your Name]
[Your Company]`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard` });
  };

  const openWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg border-2 shadow-md">
        <DialogHeader>
          <DialogTitle className="font-mono uppercase text-sm tracking-wide">
            Outreach — {school.name}
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="whatsapp">
          <TabsList className="w-full border-2">
            <TabsTrigger value="whatsapp" className="flex-1 font-mono text-xs uppercase">
              <MessageCircle className="h-3 w-3 mr-1" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="email" className="flex-1 font-mono text-xs uppercase">
              <Mail className="h-3 w-3 mr-1" />
              Email
            </TabsTrigger>
          </TabsList>
          <TabsContent value="whatsapp" className="space-y-3">
            <pre className="text-xs font-mono bg-secondary p-3 border-2 whitespace-pre-wrap max-h-64 overflow-auto">
              {whatsappMessage}
            </pre>
            <div className="flex gap-2">
              <Button onClick={() => copyToClipboard(whatsappMessage, "WhatsApp message")} className="font-mono text-xs uppercase flex-1">
                <Copy className="h-3 w-3 mr-1" />
                Copy Message
              </Button>
              <Button variant="outline" onClick={openWhatsApp} className="font-mono text-xs uppercase">
                <MessageCircle className="h-3 w-3 mr-1" />
                Open WhatsApp
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="email" className="space-y-3">
            <pre className="text-xs font-mono bg-secondary p-3 border-2 whitespace-pre-wrap max-h-64 overflow-auto">
              {emailTemplate}
            </pre>
            <Button onClick={() => copyToClipboard(emailTemplate, "Email template")} className="font-mono text-xs uppercase w-full">
              <Copy className="h-3 w-3 mr-1" />
              Copy Email
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
