import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { School } from "@/types/school";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Swords, Loader2, Globe, TrendingUp, Target, ExternalLink, Copy } from "lucide-react";

interface CompetitorData {
  schoolId: string;
  schoolName: string;
  competitors: Array<{
    name: string;
    website?: string;
    strengths?: string[];
    weaknesses?: string[];
    relevance?: string;
    market_share?: string;
  }>;
  market_overview?: string;
  positioning_strategy?: string;
  differentiation_tips?: string[];
  pricing_insight?: string;
  confidence: number;
}

interface CompetitorAnalysisProps {
  schools: School[];
}

export function CompetitorAnalysis({ schools }: CompetitorAnalysisProps) {
  const [selectedId, setSelectedId] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<CompetitorData[]>([]);
  const [progress, setProgress] = useState(0);
  const [mode, setMode] = useState<"single" | "batch">("single");

  const analyze = async (school: School) => {
    const { data, error } = await supabase.functions.invoke("analyze-competitors", {
      body: {
        name: school.name,
        location: school.location,
        website: school.detectedWebsite || school.website,
        category: school.category,
        phone: school.phone,
      },
    });

    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || "Analysis failed");

    return {
      schoolId: school.id,
      schoolName: school.name,
      ...data.data,
    } as CompetitorData;
  };

  const runSingle = async () => {
    const school = schools.find(s => s.id === selectedId);
    if (!school) return;
    setAnalyzing(true);
    try {
      const result = await analyze(school);
      setResults(prev => [result, ...prev.filter(r => r.schoolId !== school.id)]);
      toast.success(`Competitor analysis complete for ${school.name}`);
    } catch (err: any) {
      toast.error(err.message || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const runBatch = async () => {
    const targets = schools.filter(s => s.category && (s.detectedWebsite || s.website)).slice(0, 10);
    if (targets.length === 0) {
      toast.error("No leads with category + website found");
      return;
    }
    setAnalyzing(true);
    setProgress(0);
    let done = 0;
    for (const school of targets) {
      try {
        const result = await analyze(school);
        setResults(prev => [result, ...prev.filter(r => r.schoolId !== school.id)]);
      } catch { /* skip */ }
      done++;
      setProgress((done / targets.length) * 100);
      if (done < targets.length) await new Promise(r => setTimeout(r, 3000));
    }
    setAnalyzing(false);
    toast.success(`Analyzed ${done} leads`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-mono flex items-center gap-2">
            <Swords className="h-4 w-4 text-chart-4" />
            AI Competitor Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="flex-1 font-mono text-xs">
                <SelectValue placeholder="Select a lead to analyze..." />
              </SelectTrigger>
              <SelectContent>
                {schools.map(s => (
                  <SelectItem key={s.id} value={s.id} className="font-mono text-xs">{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={runSingle} disabled={!selectedId || analyzing} size="sm" className="font-mono text-xs">
              {analyzing && mode === "single" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Target className="h-3 w-3 mr-1" />}
              Analyze
            </Button>
            <Button onClick={() => { setMode("batch"); runBatch(); }} disabled={analyzing} variant="outline" size="sm" className="font-mono text-xs">
              {analyzing && mode === "batch" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Swords className="h-3 w-3 mr-1" />}
              Batch (Top 10)
            </Button>
          </div>

          {analyzing && mode === "batch" && (
            <div className="flex items-center gap-3">
              <Progress value={progress} className="flex-1 h-2" />
              <span className="text-xs font-mono">{Math.round(progress)}%</span>
            </div>
          )}
        </CardContent>
      </Card>

      {results.map(r => (
        <Card key={r.schoolId}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-mono">{r.schoolName}</CardTitle>
              <Badge variant="outline" className="font-mono text-[10px]">
                {Math.round((r.confidence || 0) * 100)}% confidence
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {r.market_overview && (
              <div>
                <h4 className="text-xs font-mono uppercase text-muted-foreground mb-1">Market Overview</h4>
                <p className="text-sm">{r.market_overview}</p>
              </div>
            )}

            {r.competitors && r.competitors.length > 0 && (
              <div>
                <h4 className="text-xs font-mono uppercase text-muted-foreground mb-2">Competitors</h4>
                <div className="grid gap-2">
                  {r.competitors.map((c, i) => (
                    <div key={i} className="p-3 rounded border bg-secondary/30 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{c.name}</span>
                        {c.website && (
                          <a href={c.website.startsWith("http") ? c.website : `https://${c.website}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                          </a>
                        )}
                      </div>
                      {c.relevance && <p className="text-xs text-muted-foreground">{c.relevance}</p>}
                      {c.strengths && c.strengths.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {c.strengths.map((s, j) => (
                            <Badge key={j} variant="outline" className="text-[10px] font-mono border-chart-2/50 text-chart-2">{s}</Badge>
                          ))}
                        </div>
                      )}
                      {c.weaknesses && c.weaknesses.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {c.weaknesses.map((w, j) => (
                            <Badge key={j} variant="outline" className="text-[10px] font-mono border-destructive/50 text-destructive">{w}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {r.positioning_strategy && (
              <div className="p-3 rounded border bg-primary/5">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-mono uppercase text-muted-foreground">Positioning Strategy</h4>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(r.positioning_strategy!)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm">{r.positioning_strategy}</p>
              </div>
            )}

            {r.differentiation_tips && r.differentiation_tips.length > 0 && (
              <div>
                <h4 className="text-xs font-mono uppercase text-muted-foreground mb-1">Differentiation Tips</h4>
                <ul className="list-disc pl-4 space-y-1">
                  {r.differentiation_tips.map((t, i) => <li key={i} className="text-sm">{t}</li>)}
                </ul>
              </div>
            )}

            {r.pricing_insight && (
              <div>
                <h4 className="text-xs font-mono uppercase text-muted-foreground mb-1">Pricing Insight</h4>
                <p className="text-sm">{r.pricing_insight}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
