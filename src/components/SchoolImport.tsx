import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Upload, FileText, FileSpreadsheet, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { parseSimpleCSV, parseCSVData } from "@/lib/csv-parser";
import { School } from "@/types/school";

interface SchoolImportProps {
  onImport: (schools: School[], autoEnrich?: boolean) => void;
}

export function SchoolImport({ onImport }: SchoolImportProps) {
  const [input, setInput] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [autoEnrich, setAutoEnrich] = useState(() => {
    return localStorage.getItem("leadradar_auto_enrich") === "true";
  });
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAutoEnrichChange = (checked: boolean) => {
    setAutoEnrich(checked);
    localStorage.setItem("leadradar_auto_enrich", String(checked));
  };

  const handleImport = () => {
    if (!input.trim()) {
      toast.error("Enter school names or paste CSV data");
      return;
    }
    const rows = parseSimpleCSV(input);
    const schools = parseCSVData(rows);
    onImport(schools, autoEnrich);
    setInput("");
    toast.success(`Imported ${schools.length} schools${autoEnrich ? " – auto-enrichment starting..." : ""}`);
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseSimpleCSV(text);
      const schools = parseCSVData(rows);
      onImport(schools, autoEnrich);

      const govCount = schools.filter(s => s.schoolType === "government").length;
      const noSite = schools.filter(s => s.websiteType === "no_website").length;
      const discovered = schools.filter(s => s.discovered).length;

      toast.success(
        `Loaded ${schools.length} schools — ${govCount} govt, ${noSite} no website, ${discovered} discovered from email${autoEnrich ? " – enriching..." : ""}`
      );
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <Card className="border-2 shadow-xs">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-mono uppercase tracking-wide flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import Schools
          </span>
          <div className="flex items-center gap-2">
            <Switch
              id="auto-enrich"
              checked={autoEnrich}
              onCheckedChange={handleAutoEnrichChange}
            />
            <Label htmlFor="auto-enrich" className="text-xs font-mono cursor-pointer flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Auto-enrich
            </Label>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${dragActive ? "border-primary bg-secondary" : "border-muted-foreground/30 hover:border-primary"
            }`}
        >
          <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="font-mono text-sm font-semibold">Drop CSV/Excel file here</p>
          <p className="text-xs text-muted-foreground mt-1">
            Supports Outscraper and Bolts Scraper formats (Title, Address, Website, Phone, Timings)
          </p>
          <p className="text-xs text-muted-foreground">
            Auto-detects government schools & discovers websites from email domains
          </p>
          {autoEnrich && (
            <p className="text-xs text-primary mt-1 font-semibold">
              ✨ Auto-enrichment enabled – leads will be researched automatically
            </p>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt,.xlsx,.xls"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          className="hidden"
        />

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex-1 border-t border-muted-foreground/30" />
          <span className="font-mono uppercase">or paste manually</span>
          <div className="flex-1 border-t border-muted-foreground/30" />
        </div>

        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={"School Name, Location\nDelhi Public School, New Delhi\nKendriya Vidyalaya, Lucknow"}
          rows={4}
          className="font-mono text-sm border-2"
        />
        <Button onClick={handleImport} className="font-mono text-xs uppercase w-full">
          <FileText className="h-3 w-3 mr-1" />
          Import {autoEnrich && "& Enrich"}
        </Button>
      </CardContent>
    </Card>
  );
}
