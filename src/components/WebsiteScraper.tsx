import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { School } from "@/types/school";
import {
  Globe, Download, Copy, Trash2, Loader2, Upload, ChevronLeft, ChevronRight,
  Mail, Phone, Eye, ArrowUpDown, Filter
} from "lucide-react";
import { AutoMatchPreview, MatchChange } from "./AutoMatchPreview";

interface ScrapedResult {
  url: string;
  title: string;
  email1: string;
  email2: string;
  phone1: string;
  phone2: string;
  aboutPage: string;
  contactPage: string;
  facebook: string;
  instagram: string;
  linkedin: string;
  tiktok: string;
  youtube: string;
  whatsapp: string;
  telegram: string;
  pinterest: string;
  twitter: string;
  snapchat: string;
  skype: string;
}

type SortKey = keyof ScrapedResult;
type SortDir = "asc" | "desc";
type FilterType = "all" | "withEmail" | "withPhone" | "withSocial" | "noData";

interface WebsiteScraperProps {
  schools?: School[];
}

const COLUMNS: { key: SortKey; label: string; minW: string }[] = [
  { key: "url", label: "Website", minW: "200px" },
  { key: "title", label: "Title", minW: "150px" },
  { key: "email1", label: "Email 1", minW: "180px" },
  { key: "email2", label: "Email 2", minW: "180px" },
  { key: "phone1", label: "Phone 1", minW: "130px" },
  { key: "phone2", label: "Phone 2", minW: "130px" },
  { key: "aboutPage", label: "About", minW: "100px" },
  { key: "contactPage", label: "Contact", minW: "100px" },
  { key: "facebook", label: "FB", minW: "80px" },
  { key: "instagram", label: "IG", minW: "80px" },
  { key: "linkedin", label: "LinkedIn", minW: "80px" },
  { key: "tiktok", label: "TikTok", minW: "80px" },
  { key: "youtube", label: "YT", minW: "80px" },
  { key: "whatsapp", label: "WhatsApp", minW: "80px" },
  { key: "telegram", label: "Telegram", minW: "80px" },
  { key: "pinterest", label: "Pinterest", minW: "80px" },
  { key: "twitter", label: "Twitter", minW: "80px" },
  { key: "snapchat", label: "Snapchat", minW: "80px" },
  { key: "skype", label: "Skype", minW: "80px" },
];

export function WebsiteScraper({ schools = [] }: WebsiteScraperProps) {
  const queryClient = useQueryClient();
  const [urlInput, setUrlInput] = useState("");
  const [results, setResults] = useState<ScrapedResult[]>([]);
  const [scraping, setScraping] = useState(false);
  const [progress, setProgress] = useState(0);
  const [batchSize, setBatchSize] = useState("10");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState("10");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewChanges, setPreviewChanges] = useState<MatchChange[]>([]);
  const [confirming, setConfirming] = useState(false);

  // Sorting & Filtering
  const [sortKey, setSortKey] = useState<SortKey>("url");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const discoveredUrls = useMemo(() => {
    return schools.filter(s => s.discovered && s.detectedWebsite).map(s => s.detectedWebsite!);
  }, [schools]);

  const loadDiscoveredUrls = () => {
    if (discoveredUrls.length === 0) {
      toast.info("No discovered websites found. Run website detection first.");
      return;
    }
    setUrlInput(discoveredUrls.join("\n"));
    toast.success(`Loaded ${discoveredUrls.length} discovered URLs`);
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n");
      const header = lines[0]?.toLowerCase() || "";
      const colIdx = header.split(",").findIndex(c => c.trim().includes("website") || c.trim().includes("url"));
      if (colIdx === -1) { toast.error("CSV must have a column named 'website' or 'url'"); return; }
      const urls = lines.slice(1).map(l => l.split(",")[colIdx]?.trim().replace(/^["']|["']$/g, "")).filter(u => u && u.length > 3);
      setUrlInput(prev => prev ? prev + "\n" + urls.join("\n") : urls.join("\n"));
      toast.success(`Loaded ${urls.length} URLs from CSV`);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleScrape = async () => {
    const urls = urlInput.split("\n").map(u => u.trim()).filter(u => u.length > 3);
    if (urls.length === 0) { toast.error("Enter at least one URL"); return; }
    setScraping(true); setProgress(0);
    const batch = parseInt(batchSize);
    const allResults: ScrapedResult[] = [];
    try {
      for (let i = 0; i < urls.length; i += batch) {
        const batchUrls = urls.slice(i, i + batch);
        const { data, error } = await supabase.functions.invoke("scrape-website-details", { body: { urls: batchUrls, batchSize: batch } });
        if (error) throw error;
        if (data?.results) allResults.push(...data.results);
        if (data?.errors?.length) data.errors.forEach((e: any) => console.warn(`Failed: ${e.url} - ${e.error}`));
        setProgress(Math.round(((i + batch) / urls.length) * 100));
      }
      const existing = new Set(results.map(r => r.url.toLowerCase().replace(/\/$/, "")));
      const newResults = allResults.filter(r => !existing.has(r.url.toLowerCase().replace(/\/$/, "")));
      const dupeCount = allResults.length - newResults.length;
      setResults(prev => [...prev, ...newResults]);
      toast.success(`Scraped ${newResults.length} websites successfully`);
      if (dupeCount > 0) toast.info(`${dupeCount} duplicates removed`);
    } catch (err: any) {
      console.error("Scrape error:", err);
      toast.error(err.message || "Scraping failed");
    } finally {
      setScraping(false); setProgress(100);
    }
  };

  const stats = useMemo(() => ({
    total: results.length,
    withEmail: results.filter(r => r.email1).length,
    withPhone: results.filter(r => r.phone1).length,
    withSocial: results.filter(r => r.facebook || r.instagram || r.linkedin || r.twitter || r.youtube).length,
  }), [results]);

  // Filtering
  const filteredResults = useMemo(() => {
    let data = [...results];

    // Apply filter type
    switch (filterType) {
      case "withEmail": data = data.filter(r => r.email1); break;
      case "withPhone": data = data.filter(r => r.phone1); break;
      case "withSocial": data = data.filter(r => r.facebook || r.instagram || r.linkedin || r.twitter || r.youtube); break;
      case "noData": data = data.filter(r => !r.email1 && !r.phone1 && !r.facebook && !r.instagram && !r.linkedin); break;
    }

    // Apply search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(r =>
        r.url.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.email1?.toLowerCase().includes(q) ||
        r.phone1?.toLowerCase().includes(q)
      );
    }

    // Apply sort
    data.sort((a, b) => {
      const aVal = (a[sortKey] || "").toLowerCase();
      const bVal = (b[sortKey] || "").toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return data;
  }, [results, filterType, searchQuery, sortKey, sortDir]);

  // Pagination on filtered results
  const perPage = parseInt(itemsPerPage);
  const totalPages = Math.max(1, Math.ceil(filteredResults.length / perPage));
  const paginatedResults = filteredResults.slice((currentPage - 1) * perPage, currentPage * perPage);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  const copyData = () => {
    if (results.length === 0) return;
    const headers = COLUMNS.map(c => c.label);
    const rows = filteredResults.map(r => COLUMNS.map(c => r[c.key]).join("\t"));
    navigator.clipboard.writeText([headers.join("\t"), ...rows].join("\n"));
    toast.success("Data copied to clipboard");
  };

  const downloadCSV = () => {
    if (results.length === 0) return;
    const headers = COLUMNS.map(c => c.label);
    const rows = filteredResults.map(r => COLUMNS.map(c => `"${(r[c.key] || "").replace(/"/g, '""')}"`).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `website-scrape-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  };

  const downloadExcel = () => {
    if (results.length === 0) return;
    const headers = COLUMNS.map(c => c.label);
    const rows = filteredResults.map(r => COLUMNS.map(c => r[c.key]).join("\t"));
    const tsv = [headers.join("\t"), ...rows].join("\n");
    const blob = new Blob([tsv], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `website-scrape-${new Date().toISOString().slice(0, 10)}.xls`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Excel downloaded");
  };

  const normalizeUrl = (url: string) =>
    url.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "");

  const buildMatchChanges = (forceOverwrite: boolean): MatchChange[] => {
    const changes: MatchChange[] = [];
    for (const result of results) {
      const resultUrl = normalizeUrl(result.url);
      const matchingSchool = schools.find(s => {
        const sWeb = s.detectedWebsite || s.website;
        return sWeb && normalizeUrl(sWeb) === resultUrl;
      });
      if (!matchingSchool) continue;

      const fields: MatchChange["fields"] = [];
      const check = (field: string, scraped: string, existing: string | null | undefined) => {
        if (scraped && (forceOverwrite || !existing)) {
          fields.push({ field, oldValue: existing || "", newValue: scraped });
        }
      };

      check("Emails", [result.email1, result.email2].filter(Boolean).join(", "), matchingSchool.emails);
      check("Phone", result.phone1, matchingSchool.phone);
      check("Facebook", result.facebook, matchingSchool.facebook);
      check("Instagram", result.instagram, matchingSchool.instagram);
      check("Twitter", result.twitter, matchingSchool.twitter);

      const socials = [
        result.linkedin && `LinkedIn: ${result.linkedin}`,
        result.tiktok && `TikTok: ${result.tiktok}`,
        result.youtube && `YouTube: ${result.youtube}`,
        result.whatsapp && `WhatsApp: ${result.whatsapp}`,
        result.telegram && `Telegram: ${result.telegram}`,
        result.pinterest && `Pinterest: ${result.pinterest}`,
        result.snapchat && `Snapchat: ${result.snapchat}`,
        result.skype && `Skype: ${result.skype}`,
      ].filter(Boolean).join(" | ");
      check("Social Medias", socials, matchingSchool.socialMedias);

      if (fields.length > 0) {
        changes.push({ schoolId: matchingSchool.id, schoolName: matchingSchool.name, url: result.url, fields });
      }
    }
    return changes;
  };

  const handleAutoMatch = () => {
    if (results.length === 0) { toast.error("No scraped data to match"); return; }
    const changes = buildMatchChanges(false);
    setPreviewChanges(changes);
    setPreviewOpen(true);
    if (changes.length === 0) toast.info("No matching schools with new data found");
  };

  const handleRecalculate = (forceOverwrite: boolean) => {
    const changes = buildMatchChanges(forceOverwrite);
    setPreviewChanges(changes);
  };

  const handleConfirmAutoMatch = async () => {
    setConfirming(true);
    let matched = 0;
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not logged in");
      for (const change of previewChanges) {
        const updates: Record<string, any> = { updated_at: new Date().toISOString() };
        for (const f of change.fields) {
          const key = f.field === "Emails" ? "emails" : f.field === "Phone" ? "phone" : f.field === "Social Medias" ? "social_medias" : f.field.toLowerCase();
          updates[key] = f.newValue;
        }
        const { error } = await (supabase as any).from("schools").update(updates).eq("id", change.schoolId);
        if (error) console.warn(`Failed to update ${change.schoolName}:`, error);
        else matched++;
      }
      toast.success(`Updated ${matched} school${matched !== 1 ? "s" : ""} successfully`);
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      setPreviewOpen(false);
    } catch (err: any) {
      console.error("Auto-match error:", err);
      toast.error(err.message || "Auto-match failed");
    } finally {
      setConfirming(false);
    }
  };

  const renderCellValue = (r: ScrapedResult, key: SortKey) => {
    const val = r[key];
    if (key === "url") return <a href={val} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{val}</a>;
    if (key === "aboutPage" || key === "contactPage") return val ? <a href={val} target="_blank" className="text-primary hover:underline">Link</a> : "—";
    if (["facebook", "instagram", "linkedin", "tiktok", "youtube", "whatsapp", "telegram", "pinterest", "twitter", "snapchat", "skype"].includes(key)) return val ? "✓" : "—";
    return val || "";
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-mono uppercase">
            <Globe className="h-5 w-5" /> Website Scraper
          </CardTitle>
          <p className="text-xs text-muted-foreground font-mono">
            Scrape discovered school websites to extract 18 fields — emails, phones, social links & more
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea placeholder="Enter Website URLs (one per line)" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} rows={6} className="font-mono text-sm" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 border rounded-md bg-secondary/30">
            <Badge variant="destructive" className="font-mono text-xs">
              Total URLs: {urlInput.split("\n").filter(u => u.trim().length > 3).length}
            </Badge>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">CSV File:</span>
              <label className="cursor-pointer">
                <Input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
                <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                  <Upload className="h-3 w-3 mr-1" /> Choose CSV File
                </Badge>
              </label>
            </div>
            {discoveredUrls.length > 0 && (
              <Button variant="outline" size="sm" className="font-mono text-xs" onClick={loadDiscoveredUrls}>
                Load Discovered ({discoveredUrls.length})
              </Button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs font-mono text-muted-foreground">Scrape at once:</span>
              <Select value={batchSize} onValueChange={setBatchSize}>
                <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground italic font-mono">
            Note: CSV file must have a column named 'website' or 'url'. Other columns are allowed.
          </p>
          {scraping && (
            <div className="flex items-center gap-3">
              <Progress value={progress} className="flex-1 h-3" />
              <span className="font-mono text-sm">{progress}%</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
        <Button onClick={handleScrape} disabled={scraping} className="font-mono text-xs uppercase">
          {scraping ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Globe className="h-4 w-4 mr-1" />}
          Scrape
        </Button>
        <Button variant="outline" onClick={handleAutoMatch} disabled={results.length === 0} className="font-mono text-xs uppercase">
          <Eye className="h-4 w-4 mr-1" /> Preview Match
        </Button>
        <Button variant="secondary" onClick={copyData} disabled={results.length === 0} className="font-mono text-xs uppercase">
          <Copy className="h-4 w-4 mr-1" /> Copy Data
        </Button>
        <Button variant="secondary" onClick={downloadCSV} disabled={results.length === 0} className="font-mono text-xs uppercase">
          <Download className="h-4 w-4 mr-1" /> Download CSV
        </Button>
        <Button variant="secondary" onClick={downloadExcel} disabled={results.length === 0} className="font-mono text-xs uppercase">
          <Download className="h-4 w-4 mr-1" /> Download Excel
        </Button>
        <Button variant="destructive" onClick={() => { setResults([]); setCurrentPage(1); }} disabled={results.length === 0} className="font-mono text-xs uppercase">
          <Trash2 className="h-4 w-4 mr-1" /> Clear Data
        </Button>
      </div>

      {/* Stats */}
      {results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Card className="p-3">
            <div className="text-xs text-muted-foreground font-mono">Total Scraped</div>
            <div className="text-2xl font-bold font-mono">{stats.total}</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground font-mono flex items-center gap-1"><Mail className="h-3 w-3" /> Emails Found</div>
            <div className="text-2xl font-bold font-mono">{stats.withEmail}</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground font-mono flex items-center gap-1"><Phone className="h-3 w-3" /> Phones Found</div>
            <div className="text-2xl font-bold font-mono">{stats.withPhone}</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground font-mono flex items-center gap-1"><Globe className="h-3 w-3" /> Social Links</div>
            <div className="text-2xl font-bold font-mono">{stats.withSocial}</div>
          </Card>
        </div>
      )}

      {/* Filter & Search Bar */}
      {results.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 border rounded-md bg-secondary/30">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterType} onValueChange={(v) => { setFilterType(v as FilterType); setCurrentPage(1); }}>
              <SelectTrigger className="w-[140px] h-8 text-xs font-mono"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Results</SelectItem>
                <SelectItem value="withEmail">Has Email</SelectItem>
                <SelectItem value="withPhone">Has Phone</SelectItem>
                <SelectItem value="withSocial">Has Social</SelectItem>
                <SelectItem value="noData">No Data</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input
            placeholder="Search URL, title, email, phone..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="h-8 text-xs font-mono max-w-xs"
          />
          <span className="text-xs text-muted-foreground font-mono ml-auto">
            {filteredResults.length} of {results.length} results
          </span>
        </div>
      )}

      {/* Results Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {COLUMNS.map(col => (
                  <TableHead
                    key={col.key}
                    className="font-mono text-xs cursor-pointer hover:bg-accent/50 select-none"
                    style={{ minWidth: col.minW }}
                    onClick={() => handleSort(col.key)}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {sortKey === col.key && (
                        <ArrowUpDown className="h-3 w-3 text-primary" />
                      )}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedResults.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={19} className="text-center text-muted-foreground text-sm py-8">
                    No results to display
                  </TableCell>
                </TableRow>
              ) : (
                paginatedResults.map((r, i) => (
                  <TableRow key={i}>
                    {COLUMNS.map(col => (
                      <TableCell key={col.key} className={`text-xs ${col.key === "url" || col.key === "email1" || col.key === "email2" || col.key === "phone1" || col.key === "phone2" ? "font-mono" : ""} ${col.key === "url" || col.key === "title" ? "max-w-[200px] truncate" : ""}`}>
                        {renderCellValue(r, col.key)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-3 border-t">
          <span className="text-xs text-muted-foreground font-mono">
            {filteredResults.length > 0 ? `Showing ${(currentPage - 1) * perPage + 1}-${Math.min(currentPage * perPage, filteredResults.length)} of ${filteredResults.length}` : "No results"}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <span className="text-xs font-mono">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">Items per page:</span>
            <Select value={itemsPerPage} onValueChange={(v) => { setItemsPerPage(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <AutoMatchPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        changes={previewChanges}
        onConfirm={handleConfirmAutoMatch}
        confirming={confirming}
        onRecalculate={handleRecalculate}
      />
    </div>
  );
}
