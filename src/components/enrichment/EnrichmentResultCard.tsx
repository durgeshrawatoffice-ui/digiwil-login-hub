import { EnrichmentResult } from "@/components/LeadEnrichment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Building2, Users, Target, Globe, Phone, Mail, TrendingUp,
  Award, Copy, CheckCircle, ExternalLink, Sparkles, Lightbulb,
  MessageSquare, Calendar, Zap, Shield
} from "lucide-react";

function copyText(text: string) {
  navigator.clipboard.writeText(text);
  toast.success("Copied!");
}

function ConfidenceBadge({ confidence }: { confidence?: number }) {
  if (confidence == null) return null;
  const pct = Math.round(confidence * 100);
  const variant = pct >= 70 ? "text-chart-2" : pct >= 40 ? "text-chart-5" : "text-destructive";
  const label = pct >= 70 ? "High" : pct >= 40 ? "Medium" : "Low";
  return (
    <Badge variant="outline" className={`font-mono text-[10px] ${variant}`}>
      <Shield className="h-2.5 w-2.5 mr-0.5" />
      {pct}% {label}
    </Badge>
  );
}

function SourceBadges({ meta }: { meta?: EnrichmentResult["data"]["_meta"] }) {
  if (!meta) return null;
  return (
    <div className="flex gap-1 flex-wrap">
      {meta.scraped_website && <Badge variant="secondary" className="text-[9px] font-mono">🌐 Website</Badge>}
      {(meta as any).scraped_contact_page && <Badge variant="secondary" className="text-[9px] font-mono">📋 Contact Page</Badge>}
      {meta.searched_internet && <Badge variant="secondary" className="text-[9px] font-mono">🔍 Web Search</Badge>}
      {meta.mode === "deep" && <Badge variant="secondary" className="text-[9px] font-mono">🧠 Deep</Badge>}
      {!meta.used_firecrawl && <Badge variant="outline" className="text-[9px] font-mono">⚡ AI Only</Badge>}
    </div>
  );
}

function DataCount({ data }: { data: EnrichmentResult["data"] }) {
  let count = 0;
  if (data.found_emails?.length) count += data.found_emails.length;
  if (data.found_phones?.length) count += data.found_phones.length;
  if (data.found_address) count++;
  if (data.found_website) count++;
  if (data.found_social_media) count += Object.values(data.found_social_media).filter(v => v).length;
  if (data.found_key_people?.length) count += data.found_key_people.length;
  return count > 0 ? (
    <Badge className="text-[9px] font-mono bg-chart-2/20 text-chart-2 border-chart-2/30">
      {count} data points found
    </Badge>
  ) : null;
}

export function EnrichmentResultCard({ result, onApplyData, onUpdateField }: {
  result: EnrichmentResult;
  onApplyData: () => void;
  onUpdateField?: (id: string, field: string, value: string) => void;
}) {
  const d = result.data;
  const hasFoundData = (d.found_emails?.length || 0) > 0 || (d.found_phones?.length || 0) > 0 ||
    d.found_address || d.found_website || Object.values(d.found_social_media || {}).some(v => v);

  return (
    <Card className="border-2 hover:border-primary/30 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="space-y-1">
            <CardTitle className="text-sm font-bold">{result.schoolName}</CardTitle>
            <div className="flex gap-2 flex-wrap items-center">
              <ConfidenceBadge confidence={d.confidence} />
              <DataCount data={d} />
              <SourceBadges meta={d._meta} />
            </div>
          </div>
          {hasFoundData && (
            <Button size="sm" onClick={onApplyData} className="font-mono text-[10px] uppercase">
              <CheckCircle className="h-3 w-3 mr-1" /> Apply Found Data
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="contacts" className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-8">
            <TabsTrigger value="contacts" className="text-[10px] font-mono">
              Contacts {hasFoundData && <span className="ml-1 text-chart-2">●</span>}
            </TabsTrigger>
            <TabsTrigger value="overview" className="text-[10px] font-mono">Overview</TabsTrigger>
            <TabsTrigger value="market" className="text-[10px] font-mono">Market</TabsTrigger>
            <TabsTrigger value="sales" className="text-[10px] font-mono">Sales Intel</TabsTrigger>
          </TabsList>

          <TabsContent value="contacts" className="mt-3 space-y-3 text-xs">
            {d.found_emails && d.found_emails.length > 0 && (
              <div className="space-y-1">
                <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> EMAILS FOUND</span>
                {d.found_emails.map((email, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-chart-2/10 border border-chart-2/20 rounded group">
                    <code className="text-xs font-medium flex-1">{email}</code>
                    <Button size="sm" variant="ghost" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyText(email)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    {onUpdateField && (
                      <Button size="sm" variant="ghost" className="h-5 text-[9px] font-mono opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { onUpdateField(result.schoolId, "emails", email); toast.success("Applied!"); }}>
                        Apply
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {d.found_phones && d.found_phones.length > 0 && (
              <div className="space-y-1">
                <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> PHONES FOUND</span>
                {d.found_phones.map((phone, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-chart-2/10 border border-chart-2/20 rounded group">
                    <code className="text-xs font-medium flex-1">{phone}</code>
                    <Button size="sm" variant="ghost" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyText(phone)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {d.found_address && (
              <div className="space-y-1">
                <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" /> ADDRESS</span>
                <div className="p-2 bg-chart-2/10 border border-chart-2/20 rounded text-xs">{d.found_address}</div>
              </div>
            )}

            {d.found_website && (
              <div className="space-y-1">
                <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1"><Globe className="h-3 w-3" /> DISCOVERED WEBSITE</span>
                <div className="flex items-center gap-2 p-2 bg-primary/10 border border-primary/20 rounded">
                  <a href={d.found_website} target="_blank" rel="noopener" className="text-xs text-primary underline flex items-center gap-1">
                    {d.found_website} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}

            {d.found_social_media && Object.entries(d.found_social_media).some(([, v]) => v) && (
              <div className="space-y-1">
                <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1"><MessageSquare className="h-3 w-3" /> SOCIAL MEDIA</span>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(d.found_social_media).filter(([, v]) => v).map(([platform, url]) => (
                    <a key={platform} href={url!} target="_blank" rel="noopener">
                      <Badge variant="secondary" className="text-[10px] cursor-pointer hover:bg-accent capitalize">
                        {platform} <ExternalLink className="h-2.5 w-2.5 ml-1" />
                      </Badge>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {d.found_key_people && d.found_key_people.length > 0 && (
              <div className="space-y-1">
                <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> KEY PEOPLE</span>
                {d.found_key_people.map((person, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 border rounded text-xs group">
                    <span className="font-medium">{person.name}</span>
                    <span className="text-muted-foreground">—</span>
                    <span className="text-muted-foreground">{person.title}</span>
                    {person.contact && (
                      <code className="text-[10px] ml-auto cursor-pointer hover:text-primary" onClick={() => copyText(person.contact!)}>{person.contact}</code>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!hasFoundData && (
              <p className="text-muted-foreground text-center py-4">No new contact data found from internet sources.</p>
            )}
          </TabsContent>

          <TabsContent value="overview" className="mt-3 space-y-3 text-xs">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <InfoItem icon={Building2} label="Industry" value={d.industry} />
              <InfoItem icon={Users} label="Size" value={d.estimated_size ? `${d.estimated_size} (${d.estimated_employees || "?"})` : undefined} />
              <InfoItem icon={Target} label="Decision Maker" value={d.decision_maker_title} />
              <div className="flex items-center gap-1.5">
                <Zap className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Tech:</span>
                <span className={`font-bold uppercase ${d.tech_readiness === "high" ? "text-chart-2" : d.tech_readiness === "medium" ? "text-chart-5" : "text-destructive"}`}>
                  {d.tech_readiness || "—"}
                </span>
              </div>
            </div>

            {d.services_offered && d.services_offered.length > 0 && (
              <div>
                <span className="text-muted-foreground font-mono text-[10px]">SERVICES:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {d.services_offered.map((s, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">{s}</Badge>
                  ))}
                </div>
              </div>
            )}

            {d.accreditations && d.accreditations.length > 0 && (
              <div className="flex items-start gap-1.5">
                <Award className="h-3 w-3 text-muted-foreground mt-0.5" />
                <div>
                  <span className="text-muted-foreground">Accreditations:</span>
                  <span className="font-medium ml-1">{d.accreditations.join(", ")}</span>
                </div>
              </div>
            )}

            {d.year_established && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Est.:</span>
                <span className="font-medium">{d.year_established}</span>
              </div>
            )}

            {d.data_sources && d.data_sources.length > 0 && (
              <div className="text-[10px] text-muted-foreground font-mono mt-2 p-2 bg-secondary/50 rounded">
                📎 Sources: {d.data_sources.join(" · ")}
              </div>
            )}
          </TabsContent>

          <TabsContent value="market" className="mt-3 space-y-3 text-xs">
            {d.market_position && (
              <div className="p-2 bg-secondary/50 border rounded">
                <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1 mb-1"><TrendingUp className="h-3 w-3" /> MARKET POSITION</span>
                <p>{d.market_position}</p>
              </div>
            )}

            {d.competitors && d.competitors.length > 0 && (
              <div>
                <span className="font-mono text-[10px] text-muted-foreground">COMPETITORS</span>
                <div className="space-y-1 mt-1">
                  {d.competitors.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 border rounded">
                      <span className="font-medium">{c.name}</span>
                      {c.website && (
                        <a href={c.website} target="_blank" rel="noopener" className="text-primary text-[10px]">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {c.relevance && <span className="text-muted-foreground text-[10px] ml-auto max-w-[200px] truncate">{c.relevance}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {d.recent_news && d.recent_news.length > 0 && (
              <div>
                <span className="font-mono text-[10px] text-muted-foreground">RECENT NEWS</span>
                <ul className="list-disc list-inside space-y-0.5 mt-1 text-muted-foreground">
                  {d.recent_news.map((news, i) => <li key={i}>{news}</li>)}
                </ul>
              </div>
            )}

            {!d.market_position && (!d.competitors || d.competitors.length === 0) && (
              <p className="text-muted-foreground text-center py-4">Use Deep Research mode for market intelligence.</p>
            )}
          </TabsContent>

          <TabsContent value="sales" className="mt-3 space-y-3 text-xs">
            {d.pain_points && d.pain_points.length > 0 && (
              <div>
                <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1"><Lightbulb className="h-3 w-3" /> PAIN POINTS</span>
                <ul className="space-y-1 mt-1">
                  {d.pain_points.map((p, j) => (
                    <li key={j} className="flex items-start gap-2 p-1.5 bg-destructive/5 border border-destructive/10 rounded text-muted-foreground">
                      <span className="text-destructive mt-0.5">•</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {d.recommended_approach && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded">
                <span className="font-semibold flex items-center gap-1 mb-1"><Target className="h-3 w-3" /> Recommended Approach</span>
                <p className="text-muted-foreground">{d.recommended_approach}</p>
              </div>
            )}

            {d.best_contact_time && (
              <div className="flex items-center gap-1.5 p-2 border rounded">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Best Contact Time:</span>
                <span className="font-medium">{d.best_contact_time}</span>
              </div>
            )}

            {d.talking_points && d.talking_points.length > 0 && (
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1"><MessageSquare className="h-3 w-3" /> TALKING POINTS</span>
                  <Button size="sm" variant="ghost" className="h-5 text-[10px] font-mono" onClick={() => copyText(d.talking_points!.join("\n"))}>
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                </div>
                <ol className="list-decimal list-inside space-y-1 mt-1">
                  {d.talking_points.map((tp, i) => (
                    <li key={i} className="p-1.5 border rounded text-muted-foreground">{tp}</li>
                  ))}
                </ol>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: any; label: string; value?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3 w-3 text-muted-foreground" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  );
}
