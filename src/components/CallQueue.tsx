import { useState } from "react";
import { School } from "@/types/school";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Phone, PhoneCall, PhoneOff, PhoneMissed, Clock, CheckCircle,
  Globe, Mail, MapPin, Star, Sparkles, ExternalLink, Facebook,
  Instagram, Copy, MessageCircle, X, Shield, ShieldOff, Smartphone, Zap, ChevronLeft, Search
} from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

import { CallStatus } from "@/types/school";

interface CallQueueProps {
  schools: School[];
  onUpdateWebsite: (id: string, website: string) => void;
  onUpdateCallStatus?: (id: string, callStatus: string, callNotes?: string) => void;
}

export function CallQueue({ schools, onUpdateWebsite, onUpdateCallStatus }: CallQueueProps) {
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [template, setTemplate] = useState("Hi! I noticed {name} and wanted to reach out. Would you be interested in a quick call?");

  const callReady = schools
    .filter((s) => s.phone && (s.websiteType === "no_website" || s.websiteType === "social_only" || !s.detectedWebsite))
    .sort((a, b) => (b.trustScore || 0) - (a.trustScore || 0));

  const setStatus = (id: string, status: CallStatus) => {
    onUpdateCallStatus?.(id, status);
  };

  const getStatus = (id: string): CallStatus => {
    const school = schools.find(s => s.id === id);
    return (school?.callStatus as CallStatus) || "pending";
  };

  const statusIcon = (status: CallStatus) => {
    switch (status) {
      case "calling": return <PhoneCall className="h-3 w-3 text-chart-2 animate-pulse" />;
      case "completed": return <CheckCircle className="h-3 w-3 text-chart-2" />;
      case "no_answer": return <PhoneMissed className="h-3 w-3 text-destructive" />;
      case "callback": return <Clock className="h-3 w-3 text-chart-4" />;
      default: return <Phone className="h-3 w-3" />;
    }
  };

  const completed = callReady.filter(s => (s.callStatus as CallStatus) === "completed").length;
  const total = callReady.length;

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Queue List */}
      <div className={`lg:col-span-1 space-y-3 ${selectedSchool ? 'hidden lg:block' : 'block'}`}>
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Call Queue ({total})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="flex items-center gap-2 mb-3">
              <Progress value={total > 0 ? (completed / total) * 100 : 0} className="flex-1 h-2" />
              <span className="text-xs font-mono">{completed}/{total}</span>
            </div>
            <ScrollArea className="h-[500px]">
              <div className="space-y-1">
                {callReady.map((school) => {
                  const status = getStatus(school.id);
                  return (
                    <button
                      key={school.id}
                      onClick={() => setSelectedSchool(school)}
                      className={`w-full text-left p-2.5 border-2 transition-colors hover:bg-accent ${selectedSchool?.id === school.id ? "border-primary bg-accent" : "border-border"
                        } ${status === "completed" ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold truncate flex-1">{school.name}</span>
                        {statusIcon(status)}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono text-muted-foreground truncate">{school.phone}</span>
                        {school.trustScore !== undefined && (
                          <Badge variant="outline" className="text-[9px] font-mono py-0 h-3.5">
                            T:{school.trustScore}
                          </Badge>
                        )}
                        <Badge
                          variant={school.schoolType === "government" ? "default" : "secondary"}
                          className="text-[9px] font-mono py-0 h-3.5"
                        >
                          {school.schoolType === "government" ? "GOVT" : "PVT"}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
                {callReady.length === 0 && (
                  <p className="text-xs text-muted-foreground font-mono text-center py-8">
                    No schools in call queue
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Lead Detail Card */}
      <div className={`lg:col-span-2 ${!selectedSchool ? 'hidden lg:block' : 'block'}`}>
        {selectedSchool ? (
          <LeadCard
            school={selectedSchool}
            callStatus={getStatus(selectedSchool.id)}
            onStatusChange={(status) => setStatus(selectedSchool.id, status)}
            onCopy={copyText}
            onClose={() => setSelectedSchool(null)}
            template={template}
            setTemplate={setTemplate}
          />
        ) : (
          <Card className="border-2 h-full flex items-center justify-center">
            <CardContent className="text-center text-muted-foreground font-mono text-sm py-12">
              Select a school from the queue to see full details
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function LeadCard({
  school,
  callStatus,
  onStatusChange,
  onCopy,
  onClose,
  template,
  setTemplate,
}: {
  school: School;
  callStatus: CallStatus;
  onStatusChange: (s: CallStatus) => void;
  onCopy: (text: string, label: string) => void;
  onClose: () => void;
  template: string;
  setTemplate: (t: string) => void;
}) {
  const [showTemplate, setShowTemplate] = useState(false);
  const compiledMsg = template.replace(/{name}/g, school.name);

  return (
    <Card className="border-2">
      <CardHeader className="pb-2 flex flex-col items-start gap-4">
        <div className="flex items-start justify-between w-full">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden -ml-2 shrink-0" onClick={onClose}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              {school.name}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant={school.schoolType === "government" ? "default" : "secondary"} className="text-[10px] font-mono">
                {school.schoolType === "government" ? "🏛 GOVT" : "🏫 PRIVATE"}
              </Badge>
              {school.category && (
                <Badge variant="outline" className="text-[10px] font-mono">{school.category}</Badge>
              )}
              {school.discovered && (
                <Badge variant="outline" className="text-[10px] font-mono border-chart-2 text-chart-2 bg-chart-2/10">
                  <Sparkles className="h-2.5 w-2.5 mr-0.5" /> DISCOVERED
                </Badge>
              )}
              {school.websiteType && (
                <Badge variant="outline" className="text-[10px] font-mono">
                  {school.websiteType === "no_website" ? "🚫 No Website" :
                    school.websiteType === "social_only" ? "📱 Social Only" :
                      school.websiteType === "verified_website" ? "✅ Verified" :
                        school.websiteType === "dead" ? "💀 Dead Domain" :
                          school.websiteType}
                </Badge>
              )}
            </div>
          </div>
          <Button variant="outline" size="icon" className="h-7 w-7 shrink-0 hidden lg:flex absolute right-4 top-4" onClick={onClose}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contact & Call Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="text-xs font-mono uppercase text-muted-foreground">Contact Info</h4>
            {school.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-chart-2 shrink-0" />
                <a href={`tel:${school.phone}`} className="text-sm font-mono underline">{school.phone}</a>
                <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => onCopy(school.phone!, "Phone")}>
                  <Copy className="h-2.5 w-2.5" />
                </Button>
              </div>
            )}
            {school.emails && (
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="text-sm font-mono truncate">{school.emails}</span>
                <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => onCopy(school.emails!, "Email")}>
                  <Copy className="h-2.5 w-2.5" />
                </Button>
              </div>
            )}
            {school.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(`${school.name} ${school.location}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:underline hover:text-primary flex items-center gap-1"
                >
                  {school.location} <ExternalLink className="h-[10px] w-[10px]" />
                </a>
              </div>
            )}
            {school.rating && (
              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-chart-4 shrink-0" />
                <span className="text-sm font-mono">{school.rating}</span>
                {school.ratingInfo && <span className="text-[10px] text-muted-foreground">({school.ratingInfo})</span>}
              </div>
            )}
            {school.openHours && (
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span className="text-xs text-muted-foreground">{school.openHours}</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-mono uppercase text-muted-foreground mb-2">Call Actions</h4>
              <div className="grid grid-cols-3 gap-2">
                <Button size="sm" className="font-mono text-[10px]" asChild>
                  <a href={`tel:${school.phone}`} onClick={() => onStatusChange("calling")}>
                    <PhoneCall className="h-3 w-3 mr-1" /> Call Now
                  </a>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="font-mono text-[10px]"
                  onClick={() => window.open(`https://wa.me/${school.phone?.replace(/[^0-9+]/g, "")}?text=${encodeURIComponent(compiledMsg)}`, "_blank")}
                >
                  <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="font-mono text-[10px]"
                  disabled={!school.emails}
                  onClick={() => window.open(`mailto:${school.emails?.split(',')[0] || ''}?subject=${encodeURIComponent("Partnership Opportunity")}&body=${encodeURIComponent(compiledMsg)}`, "_blank")}
                >
                  <Mail className="h-3 w-3 mr-1" /> Email
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-[10px] font-mono text-muted-foreground w-full mt-1 h-6"
                onClick={() => setShowTemplate(!showTemplate)}
              >
                {showTemplate ? "Hide Template Editor" : "Edit Outreach Message Template"}
              </Button>
              {showTemplate && (
                <div className="mt-2 text-xs">
                  <Textarea
                    value={template}
                    onChange={(e) => setTemplate(e.target.value)}
                    className="min-h-[60px] text-xs font-mono"
                    placeholder="Use {name} to insert school name"
                  />
                  <p className="text-[9px] text-muted-foreground mt-1">Changes here will apply to all schools. Use {"{name}"} for the school's name.</p>
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-mono uppercase text-muted-foreground mb-2">Call Result</h4>
              <div className="flex flex-wrap gap-1.5">
                {(["completed", "no_answer", "callback", "not_interested", "wrong_number"] as CallStatus[]).map((s) => {
                  let label = "✅ Done";
                  if (s === "no_answer") label = "❌ No Answer";
                  if (s === "callback") label = "🔄 Callback";
                  if (s === "not_interested") label = "⛔ Not Interested";
                  if (s === "wrong_number") label = "📴 Wrong Number";

                  return (
                    <Button
                      key={s}
                      size="sm"
                      variant={callStatus === s ? "default" : "outline"}
                      className="font-mono text-[10px] h-7"
                      onClick={() => onStatusChange(s)}
                    >
                      {label}
                    </Button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Website & Quality */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="text-xs font-mono uppercase text-muted-foreground">Website</h4>
            {(school.detectedWebsite || school.website) ? (
              <div className="space-y-1">
                <a
                  href={school.detectedWebsite || school.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-mono underline flex items-center gap-1"
                >
                  <Globe className="h-3.5 w-3.5 shrink-0" />
                  {(school.detectedWebsite || school.website)!.replace(/https?:\/\//, "").slice(0, 40)}
                  <ExternalLink className="h-3 w-3" />
                </a>
                {school.trustReason && (
                  <p className="text-[10px] font-mono text-muted-foreground">{school.trustReason}</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground font-mono">No website found</p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-2 font-mono text-xs w-full"
              onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(`${school.name} ${school.location || ""}`.trim())}`, "_blank")}
            >
              <Search className="h-3 w-3 mr-2" /> Search on Google
            </Button>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-mono uppercase text-muted-foreground">Scores</h4>
            <div className="space-y-1.5">
              {school.trustScore !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono w-12">Trust</span>
                  <Progress value={school.trustScore} className="flex-1 h-2" />
                  <span className="text-xs font-mono font-bold w-8">{school.trustScore}</span>
                </div>
              )}
              {school.qualityScore && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono w-12">Quality</span>
                    <Progress value={school.qualityScore.overall} className="flex-1 h-2" />
                    <span className="text-xs font-mono w-8">{school.qualityScore.overall}%</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <Smartphone className="h-3 w-3" /> {school.qualityScore.mobile}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Zap className="h-3 w-3" /> {school.qualityScore.speed}
                    </span>
                    <span className="flex items-center gap-0.5">
                      {school.qualityScore.ssl ? <Shield className="h-3 w-3" /> : <ShieldOff className="h-3 w-3" />}
                      {school.qualityScore.ssl ? "SSL" : "No SSL"}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Social Links */}
        {(school.facebook || school.instagram || school.twitter || school.socialMedias) && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-mono uppercase text-muted-foreground">Social</h4>
            <div className="flex flex-wrap gap-2">
              {school.facebook && (
                <a href={school.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-mono underline">
                  <Facebook className="h-3 w-3" /> Facebook
                </a>
              )}
              {school.instagram && (
                <a href={school.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-mono underline">
                  <Instagram className="h-3 w-3" /> Instagram
                </a>
              )}
              {school.socialMedias && (
                <span className="text-[10px] font-mono text-muted-foreground">{school.socialMedias}</span>
              )}
            </div>
          </div>
        )}

        {school.featuredImage && (
          <div>
            <h4 className="text-xs font-mono uppercase text-muted-foreground mb-1">Image</h4>
            <img src={school.featuredImage} alt={school.name} className="w-full h-auto object-contain border-2" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
