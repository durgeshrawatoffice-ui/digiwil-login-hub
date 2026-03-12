import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Copy, Download, FileJson, FileText, Globe, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { School } from "@/types/school";
import { parseCSVData } from "@/lib/csv-parser";

interface ScrapedLead {
  keyword: string;
  name: string;
  address?: string;
  website?: string;
  phone?: string;
  emails?: string;
  rating?: number;
  category?: string;
  source?: string;
}

interface ScrapeStats {
  keywords: number;
  totalLeads: number;
  phoneNumbers: number;
  websites: number;
  emails: number;
  scrapingTime: number;
}

interface GoogleMapsScraperProps {
  onImportLeads: (schools: School[]) => void;
}

export function GoogleMapsScraper({ onImportLeads }: GoogleMapsScraperProps) {
  const [keywords, setKeywords] = useState("");
  const [results, setResults] = useState<ScrapedLead[]>([]);
  const [stats, setStats] = useState<ScrapeStats | null>(null);
  const [scraping, setScraping] = useState(false);

  const handleScrape = useCallback(async () => {
    const lines = keywords.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      toast.error("Enter at least one keyword");
      return;
    }

    setScraping(true);
    setResults([]);
    setStats(null);

    try {
      const { data, error } = await supabase.functions.invoke("scrape-google-maps", {
        body: { keywords: lines },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Scraping failed");

      const newLeads: ScrapedLead[] = data.data || [];
      // Merge with existing results, dedup by normalized name+address
      setResults(prev => {
        const seen = new Set(prev.map(r => dedupKey(r)));
        const unique = newLeads.filter(r => {
          const key = dedupKey(r);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        const dupes = newLeads.length - unique.length;
        if (dupes > 0) toast.info(`${dupes} duplicate leads removed`);
        return [...prev, ...unique];
      });
      setStats(data.stats);
      toast.success(`Scraped ${newLeads.length} leads from ${lines.length} keywords`);
    } catch (err: any) {
      console.error("Scrape error:", err);
      toast.error(err.message || "Scraping failed");
    } finally {
      setScraping(false);
    }
  }, [keywords]);

  const handleCopyData = () => {
    const text = results.map(r =>
      `${r.name}\t${r.address || ""}\t${r.phone || ""}\t${r.emails || ""}\t${r.website || ""}\t${r.rating || ""}\t${r.category || ""}`
    ).join("\n");
    navigator.clipboard.writeText(`Name\tAddress\tPhone\tEmails\tWebsite\tRating\tCategory\n${text}`);
    toast.success("Data copied to clipboard");
  };

  const handleDownloadCSV = () => {
    const headers = "Name,Address,Phone,Emails,Website,Rating,Category,Keyword,Source";
    const rows = results.map(r =>
      [r.name, r.address, r.phone, r.emails, r.website, r.rating, r.category, r.keyword, r.source]
        .map(v => `"${(v || "").toString().replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [headers, ...rows].join("\n");
    downloadFile(csv, "leads.csv", "text/csv");
  };

  const handleDownloadJSON = () => {
    downloadFile(JSON.stringify(results, null, 2), "leads.json", "application/json");
  };

  const handleDownloadText = () => {
    const text = results.map(r => `${r.name} | ${r.address || "N/A"} | ${r.phone || "N/A"} | ${r.website || "N/A"}`).join("\n");
    downloadFile(text, "leads.txt", "text/plain");
  };

  const handleCopyWebsites = () => {
    const websites = results.filter(r => r.website).map(r => r.website).join("\n");
    navigator.clipboard.writeText(websites);
    toast.success(`${results.filter(r => r.website).length} websites copied`);
  };

  const handleClearResults = () => {
    setResults([]);
    setStats(null);
    toast.info("Results cleared");
  };

  const handleImportToLeads = () => {
    if (results.length === 0) return;
    const rows = results.map(r => ({
      Name: r.name,
      Address: r.address || "",
      Website: r.website || "",
      Phone: r.phone || "",
      Emails: r.emails || "",
      Rating: r.rating?.toString() || "",
      Category: r.category || "",
    }));
    const schools = parseCSVData(rows);
    onImportLeads(schools);
    toast.success(`Imported ${schools.length} leads to pipeline`);
  };

  return (
    <div className="space-y-4">
      {/* Keywords Input */}
      <Card className="border-2">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-xs uppercase tracking-wide font-semibold">Google Maps Lead Scraper</span>
          </div>
          <Textarea
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder={"schools in Vikas Nagar lucknow\nschools in Rajajipuram lucknow\nrestaurants in Gomti Nagar lucknow\nclinics in Hazratganj lucknow"}
            rows={6}
            className="font-mono text-sm border-2"
          />
          <p className="text-xs text-muted-foreground font-mono">Enter one search keyword per line. Works with any business type.</p>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {(stats || scraping) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { label: "KEYWORDS", value: stats?.keywords || 0, color: "text-chart-1" },
            { label: "TOTAL LEADS SCRAPED", value: stats?.totalLeads || 0, color: "text-chart-2" },
            { label: "PHONE NUMBERS", value: stats?.phoneNumbers || 0, color: "text-chart-3" },
            { label: "WEBSITES", value: stats?.websites || 0, color: "text-chart-4" },
            { label: "POTENTIAL EMAILS", value: stats?.emails || 0, color: "text-chart-5" },
            { label: "TOTAL SCRAPING TIME", value: stats ? `${stats.scrapingTime}s` : "...", color: "text-primary" },
          ].map((s) => (
            <Card key={s.label} className="border-2">
              <CardContent className="p-3 text-center">
                <p className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">{s.label}</p>
                <p className={`text-xl font-bold font-mono ${s.color}`}>
                  {scraping && !stats ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : s.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleScrape} disabled={scraping} className="font-mono text-xs uppercase">
          {scraping ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Search className="h-3 w-3 mr-1" />}
          {scraping ? "Scraping..." : "Scrape"}
        </Button>
        <Button variant="outline" onClick={handleCopyData} disabled={results.length === 0} className="font-mono text-xs uppercase">
          <Copy className="h-3 w-3 mr-1" /> Copy Data
        </Button>
        <Button variant="outline" onClick={handleDownloadCSV} disabled={results.length === 0} className="font-mono text-xs uppercase">
          <Download className="h-3 w-3 mr-1" /> Download CSV
        </Button>
        <Button variant="outline" onClick={handleDownloadJSON} disabled={results.length === 0} className="font-mono text-xs uppercase">
          <FileJson className="h-3 w-3 mr-1" /> Download JSON
        </Button>
        <Button variant="outline" onClick={handleDownloadText} disabled={results.length === 0} className="font-mono text-xs uppercase">
          <FileText className="h-3 w-3 mr-1" /> Download Plain Text
        </Button>
        <Button variant="outline" onClick={handleCopyWebsites} disabled={results.length === 0} className="font-mono text-xs uppercase">
          <Globe className="h-3 w-3 mr-1" /> Copy Websites
        </Button>
        <Button variant="outline" onClick={handleClearResults} disabled={results.length === 0} className="font-mono text-xs uppercase">
          <Trash2 className="h-3 w-3 mr-1" /> Clear Results
        </Button>
        {results.length > 0 && (
          <Button onClick={handleImportToLeads} className="font-mono text-xs uppercase ml-auto" variant="default">
            Import {results.length} to Pipeline
          </Button>
        )}
      </div>

      {/* Results Table */}
      {results.length > 0 && (
        <Card className="border-2">
          <ScrollArea className="max-h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono text-xs uppercase">#</TableHead>
                  <TableHead className="font-mono text-xs uppercase">Keyword</TableHead>
                  <TableHead className="font-mono text-xs uppercase">Name</TableHead>
                  <TableHead className="font-mono text-xs uppercase">Rating</TableHead>
                  <TableHead className="font-mono text-xs uppercase">Phone</TableHead>
                  <TableHead className="font-mono text-xs uppercase">Website</TableHead>
                  <TableHead className="font-mono text-xs uppercase">Category</TableHead>
                  <TableHead className="font-mono text-xs uppercase">Emails</TableHead>
                  <TableHead className="font-mono text-xs uppercase">Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                    <TableCell className="font-mono text-xs max-w-[120px] truncate">{r.keyword}</TableCell>
                    <TableCell className="font-mono text-xs font-semibold max-w-[180px] truncate">{r.name}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {r.rating ? <Badge variant="outline" className="text-xs">{r.rating}</Badge> : "N/A"}
                    </TableCell>
                    <TableCell className="font-mono text-xs max-w-[130px] truncate">{r.phone || "N/A"}</TableCell>
                    <TableCell className="font-mono text-xs max-w-[150px] truncate">
                      {r.website ? (
                        <a href={r.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {r.website.replace(/https?:\/\//, "").substring(0, 30)}
                        </a>
                      ) : "N/A"}
                    </TableCell>
                    <TableCell className="font-mono text-xs max-w-[120px] truncate">{r.category || "N/A"}</TableCell>
                    <TableCell className="font-mono text-xs max-w-[160px] truncate">{r.emails || "N/A"}</TableCell>
                    <TableCell className="font-mono text-xs max-w-[180px] truncate">{r.address || "N/A"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function dedupKey(r: { name: string; address?: string }): string {
  return (r.name + "|" + (r.address || "")).toLowerCase().replace(/[^a-z0-9|]/g, "").substring(0, 120);
}
