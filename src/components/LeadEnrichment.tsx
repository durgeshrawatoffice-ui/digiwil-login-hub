import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { School } from "@/types/school";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles, Loader2, Building2, Users, Lightbulb, Target, Globe, Phone, Mail,
  TrendingUp, Calendar, Award, MessageSquare, Copy, CheckCircle, ExternalLink, Zap, CheckCheck
} from "lucide-react";
import { EnrichmentResultCard } from "@/components/enrichment/EnrichmentResultCard";

export interface EnrichmentResult {
  schoolId: string;
  schoolName: string;
  data: {
    industry?: string;
    estimated_size?: string;
    estimated_employees?: string;
    decision_maker_title?: string;
    tech_readiness?: string;
    found_emails?: string[];
    found_phones?: string[];
    found_address?: string;
    found_social_media?: Record<string, string | null>;
    found_website?: string;
    found_key_people?: Array<{ name: string; title: string; contact?: string }>;
    services_offered?: string[];
    year_established?: string;
    accreditations?: string[];
    competitors?: Array<{ name: string; website?: string; relevance?: string }>;
    market_position?: string;
    recent_news?: string[];
    pain_points?: string[];
    recommended_approach?: string;
    best_contact_time?: string;
    talking_points?: string[];
    confidence?: number;
    data_sources?: string[];
    _meta?: {
      used_firecrawl: boolean;
      scraped_website: boolean;
      searched_internet: boolean;
      mode: string;
    };
  };
}

export function LeadEnrichment({ schools, onUpdateField }: {
  schools: School[];
  onUpdateField?: (id: string, field: string, value: string) => void;
}) {
  const [enriching, setEnriching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<EnrichmentResult[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [mode, setMode] = useState<string>("standard");

  const filteredSchools = schools.filter(s => {
    if (filter === "no_website") return !s.website && !s.detectedWebsite;
    if (filter === "has_website") return s.website || s.detectedWebsite;
    if (filter === "no_email") return !s.emails;
    if (filter === "no_phone") return !s.phone;
    if (filter === "call_ready") return s.phone && (s.websiteType === "no_website" || s.websiteType === "social_only");
    return true;
  });

  const [currentLead, setCurrentLead] = useState("");

  const enrichLeads = async () => {
    const maxLeads = mode === "deep" ? 3 : 5;
    const toEnrich = filteredSchools.slice(0, maxLeads);
    if (toEnrich.length === 0) return;

    setEnriching(true);
    setProgress(0);
    const newResults: EnrichmentResult[] = [];

    for (let i = 0; i < toEnrich.length; i++) {
      const school = toEnrich[i];
      setCurrentLead(school.name);
      let retries = 0;
      const maxRetries = 3;
      let success = false;

      while (retries <= maxRetries && !success) {
        try {
          const { data, error } = await supabase.functions.invoke("enrich-lead", {
            body: {
              name: school.name,
              location: school.location,
              website: school.detectedWebsite || school.website,
              category: school.category,
              phone: school.phone,
              emails: school.emails,
              mode,
            },
          });

          if (error) {
            const msg = error?.message || "";
            if (msg.includes("non-2xx") && retries < maxRetries) {
              retries++;
              const wait = 6000 * retries;
              toast.info(`Rate limited, retrying in ${wait / 1000}s...`);
              await new Promise(r => setTimeout(r, wait));
              continue;
            }
            throw error;
          }
          if (data?.success) {
            newResults.push({ schoolId: school.id, schoolName: school.name, data: data.data });
          }
          success = true;
        } catch (err) {
          if (retries < maxRetries) {
            retries++;
            const wait = 6000 * retries;
            toast.info(`Rate limited, retrying in ${wait / 1000}s...`);
            await new Promise(r => setTimeout(r, wait));
          } else {
            console.error(`Enrich failed for ${school.name}:`, err);
            toast.error(`Failed to enrich ${school.name}`);
            break;
          }
        }
      }
      setProgress(((i + 1) / toEnrich.length) * 100);
      if (i < toEnrich.length - 1) {
        await new Promise(r => setTimeout(r, mode === "deep" ? 6000 : 4000));
      }
    }

    setResults(prev => [...newResults, ...prev]);
    setEnriching(false);
    setCurrentLead("");
    const dataPoints = newResults.reduce((sum, r) => {
      const d = r.data;
      return sum + (d.found_emails?.length || 0) + (d.found_phones?.length || 0) +
        (d.found_address ? 1 : 0) + Object.values(d.found_social_media || {}).filter(v => v).length;
    }, 0);
    toast.success(`Enriched ${newResults.length} leads — found ${dataPoints} new data points`);
  };

  const applyFoundData = (result: EnrichmentResult) => {
    if (!onUpdateField) return;
    const d = result.data;
    let applied = 0;

    if (d.found_emails?.length) {
      onUpdateField(result.schoolId, "emails", d.found_emails.join(", "));
      applied++;
    }
    if (d.found_phones?.length) {
      onUpdateField(result.schoolId, "phone", d.found_phones[0]);
      applied++;
    }
    if (d.found_address) {
      onUpdateField(result.schoolId, "address", d.found_address);
      applied++;
    }
    if (d.found_website) {
      onUpdateField(result.schoolId, "detected_website", d.found_website);
      applied++;
    }
    const socials = d.found_social_media;
    if (socials) {
      if (socials.facebook) onUpdateField(result.schoolId, "facebook", socials.facebook);
      if (socials.instagram) onUpdateField(result.schoolId, "instagram", socials.instagram);
      if (socials.twitter) onUpdateField(result.schoolId, "twitter", socials.twitter);
      applied++;
    }

    toast.success(`Applied ${applied} data updates to ${result.schoolName}`);
  };

  const missingFields = (school: School) => {
    const missing: string[] = [];
    if (!school.emails) missing.push("email");
    if (!school.phone) missing.push("phone");
    if (!school.address) missing.push("address");
    if (!school.website && !school.detectedWebsite) missing.push("website");
    if (!school.facebook && !school.instagram) missing.push("social");
    return missing;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-mono text-sm uppercase">
            <Sparkles className="h-4 w-4 text-primary" /> Deep Lead Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Scans the entire internet using web scraping + AI to find real contact info, social profiles, competitors, market intel, and sales insights for each lead.
          </p>

          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-mono text-muted-foreground">FILTER</label>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-40 font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ({schools.length})</SelectItem>
                  <SelectItem value="no_email">Missing Email</SelectItem>
                  <SelectItem value="no_phone">Missing Phone</SelectItem>
                  <SelectItem value="no_website">No Website</SelectItem>
                  <SelectItem value="has_website">Has Website</SelectItem>
                  <SelectItem value="call_ready">Call Ready</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-muted-foreground">RESEARCH DEPTH</label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger className="w-40 font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">
                    <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> Standard</span>
                  </SelectItem>
                  <SelectItem value="deep">
                    <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> Deep Research</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={enrichLeads} disabled={enriching || filteredSchools.length === 0} className="font-mono text-xs uppercase">
              {enriching ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Globe className="h-3 w-3 mr-1" />}
              {enriching ? "Researching..." : `Research ${Math.min(filteredSchools.length, mode === "deep" ? 3 : 5)} Leads`}
            </Button>
          </div>

          {enriching && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground font-mono animate-pulse">
                🔍 Scraping websites, searching the internet for: <span className="font-bold">{currentLead}</span>
              </p>
            </div>
          )}

          {/* Missing data summary */}
          {filteredSchools.length > 0 && !enriching && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {[
                { label: "Missing Email", count: schools.filter(s => !s.emails).length, icon: Mail },
                { label: "Missing Phone", count: schools.filter(s => !s.phone).length, icon: Phone },
                { label: "No Website", count: schools.filter(s => !s.website && !s.detectedWebsite).length, icon: Globe },
                { label: "No Social", count: schools.filter(s => !s.facebook && !s.instagram).length, icon: MessageSquare },
                { label: "No Address", count: schools.filter(s => !s.address).length, icon: Building2 },
              ].map(stat => (
                <div key={stat.label} className="flex items-center gap-2 p-2 border rounded text-xs">
                  <stat.icon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{stat.label}:</span>
                  <span className="font-bold">{stat.count}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-xs uppercase text-muted-foreground">
              Research Results ({results.length})
            </h3>
            <Button
              size="sm"
              onClick={() => {
                let totalApplied = 0;
                results.forEach(r => {
                  const d = r.data;
                  const hasData = (d.found_emails?.length || 0) > 0 || (d.found_phones?.length || 0) > 0 ||
                    d.found_address || d.found_website || Object.values(d.found_social_media || {}).some(v => v);
                  if (hasData) {
                    applyFoundData(r);
                    totalApplied++;
                  }
                });
                toast.success(`Applied data from ${totalApplied} results to your leads`);
              }}
              className="font-mono text-[10px] uppercase"
            >
              <CheckCircle className="h-3 w-3 mr-1" /> Apply All ({results.length})
            </Button>
          </div>
          {results.map((r, i) => (
            <EnrichmentResultCard
              key={i}
              result={r}
              onApplyData={() => applyFoundData(r)}
              onUpdateField={onUpdateField}
            />
          ))}
        </div>
      )}
    </div>
  );
}
