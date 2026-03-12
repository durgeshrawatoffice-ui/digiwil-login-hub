import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { School } from "@/types/school";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Mail, Loader2, Search, CheckCircle, AlertCircle, Copy, Globe, Zap, CheckCheck } from "lucide-react";

interface EmailResult {
  schoolId: string;
  schoolName: string;
  data: {
    predicted_emails?: Array<{ email: string; confidence: number; type: string; source?: string }>;
    email_pattern?: string;
    domain_from_website?: string;
    verification_tips?: string;
    total_found?: number;
    _meta?: { scraped_website: boolean; searched_web: boolean };
  };
}

export function EmailFinder({ schools, onUpdateField }: {
  schools: School[];
  onUpdateField?: (id: string, field: string, value: string) => void;
}) {
  const [searching, setSearching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<EmailResult[]>([]);
  const [currentLead, setCurrentLead] = useState("");

  const leadsWithoutEmail = schools.filter(s => !s.emails);
  const leadsWithWebsite = leadsWithoutEmail.filter(s => s.website || s.detectedWebsite);

  const findEmails = async () => {
    // Prioritize leads with websites for better accuracy
    const prioritized = [
      ...leadsWithWebsite,
      ...leadsWithoutEmail.filter(s => !s.website && !s.detectedWebsite),
    ];
    const toSearch = prioritized.slice(0, 5);
    if (toSearch.length === 0) return;

    setSearching(true);
    setProgress(0);
    const newResults: EmailResult[] = [];

    for (let i = 0; i < toSearch.length; i++) {
      const school = toSearch[i];
      setCurrentLead(school.name);
      let retries = 0;
      const maxRetries = 3;
      let success = false;
      while (retries <= maxRetries && !success) {
        try {
          const { data, error } = await supabase.functions.invoke("find-emails", {
            body: {
              name: school.name,
              website: school.detectedWebsite || school.website,
              location: school.location,
              category: school.category,
            },
          });

          if (error) {
            const msg = error?.message || "";
            if (msg.includes("non-2xx") && retries < maxRetries) {
              retries++;
              await new Promise(r => setTimeout(r, 5000 * retries));
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
            await new Promise(r => setTimeout(r, 5000 * retries));
          } else {
            console.error(`Email search failed for ${school.name}:`, err);
            toast.error(`Failed for ${school.name}`);
            break;
          }
        }
      }
      setProgress(((i + 1) / toSearch.length) * 100);
      if (i < toSearch.length - 1) {
        await new Promise(r => setTimeout(r, 4000));
      }
    }

    setResults(prev => [...newResults, ...prev]);
    setSearching(false);
    setCurrentLead("");
    const extractedCount = newResults.filter(r => r.data.predicted_emails?.some(e => e.type === 'extracted')).length;
    toast.success(`Found emails for ${newResults.length} leads (${extractedCount} with verified extractions)`);
  };

  const applyEmail = (schoolId: string, email: string) => {
    if (onUpdateField) {
      onUpdateField(schoolId, "emails", email);
      toast.success(`Applied ${email}`);
    }
  };

  const applyAllBestEmails = () => {
    let applied = 0;
    results.forEach(r => {
      const bestEmail = r.data.predicted_emails?.find(e => e.confidence >= 0.7);
      if (bestEmail && onUpdateField) {
        onUpdateField(r.schoolId, "emails", bestEmail.email);
        applied++;
      }
    });
    toast.success(`Applied ${applied} high-confidence emails to leads`);
  };

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    toast.success("Copied!");
  };

  const confidenceColor = (c: number) => {
    if (c >= 0.8) return "text-chart-2";
    if (c >= 0.5) return "text-chart-5";
    return "text-destructive";
  };

  const typeIcon = (type: string) => {
    if (type === 'extracted') return <Globe className="h-3 w-3 text-chart-2" />;
    return <Zap className="h-3 w-3 text-chart-5" />;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-mono text-sm uppercase">
            <Mail className="h-4 w-4 text-primary" /> Email Finder & Verifier
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Scrapes actual websites and searches the internet to extract real email addresses. Leads with websites are prioritized for higher accuracy.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="flex items-center gap-2 p-2 border rounded text-xs">
              <Mail className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Missing Email:</span>
              <span className="font-bold">{leadsWithoutEmail.length}</span>
            </div>
            <div className="flex items-center gap-2 p-2 border rounded text-xs">
              <Globe className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">With Website:</span>
              <span className="font-bold text-chart-2">{leadsWithWebsite.length}</span>
            </div>
            <div className="flex items-center gap-2 p-2 border rounded text-xs">
              <CheckCircle className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Results:</span>
              <span className="font-bold">{results.length}</span>
            </div>
            <div className="flex items-center gap-2 p-2 border rounded text-xs">
              <Zap className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Extracted:</span>
              <span className="font-bold text-chart-2">{results.filter(r => r.data.predicted_emails?.some(e => e.type === 'extracted')).length}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={findEmails} disabled={searching || leadsWithoutEmail.length === 0} className="font-mono text-xs uppercase">
              {searching ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Search className="h-3 w-3 mr-1" />}
              {searching ? "Searching..." : `Find Emails (${Math.min(leadsWithoutEmail.length, 5)})`}
            </Button>
            {results.length > 0 && (
              <Button variant="outline" size="sm" onClick={applyAllBestEmails} className="font-mono text-[10px] uppercase">
                <CheckCheck className="h-3 w-3 mr-1" /> Apply All High-Confidence
              </Button>
            )}
          </div>

          {searching && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground font-mono animate-pulse">
                🔍 Scraping website & searching for: {currentLead}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono text-xs">BUSINESS</TableHead>
                  <TableHead className="font-mono text-xs">FOUND EMAILS</TableHead>
                  <TableHead className="font-mono text-xs">SOURCE</TableHead>
                  <TableHead className="font-mono text-xs">PATTERN</TableHead>
                  <TableHead className="font-mono text-xs">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div>
                        <span className="font-medium text-sm">{r.schoolName}</span>
                        {r.data._meta && (
                          <div className="flex gap-1 mt-0.5">
                            {r.data._meta.scraped_website && <Badge variant="secondary" className="text-[8px] font-mono">🌐 Scraped</Badge>}
                            {r.data._meta.searched_web && <Badge variant="secondary" className="text-[8px] font-mono">🔍 Searched</Badge>}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {r.data.predicted_emails?.slice(0, 4).map((e, j) => (
                          <div key={j} className="flex items-center gap-1.5 text-xs">
                            {typeIcon(e.type)}
                            <code className="text-xs">{e.email}</code>
                            <span className={`font-mono text-[10px] ${confidenceColor(e.confidence)}`}>
                              {Math.round(e.confidence * 100)}%
                            </span>
                            {e.type === 'extracted' && (
                              <Badge variant="outline" className="text-[8px] text-chart-2 border-chart-2/30">verified</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.data.predicted_emails?.[0]?.source || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {r.data.email_pattern || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {r.data.predicted_emails?.[0] && (
                          <>
                            <Button size="sm" variant="outline" className="h-6 text-[10px] font-mono" onClick={() => applyEmail(r.schoolId, r.data.predicted_emails![0].email)}>
                              Apply Best
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copyEmail(r.data.predicted_emails![0].email)}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
