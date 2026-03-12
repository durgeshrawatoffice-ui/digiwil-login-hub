import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { School, PipelineStage } from "@/types/school";
import { calculateLeadScore } from "@/lib/lead-scoring";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";

interface ExportDialogProps {
  schools: School[];
  open: boolean;
  onClose: () => void;
}

const ALL_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "location", label: "Location" },
  { key: "address", label: "Address" },
  { key: "phone", label: "Phone" },
  { key: "emails", label: "Emails" },
  { key: "category", label: "Category" },
  { key: "rating", label: "Rating" },
  { key: "website", label: "Original Website" },
  { key: "detectedWebsite", label: "Detected Website" },
  { key: "websiteType", label: "Website Type" },
  { key: "status", label: "AI Status" },
  { key: "schoolType", label: "School Type" },
  { key: "similarityScore", label: "Confidence Score" },
  { key: "trustScore", label: "Trust Score" },
  { key: "trustReason", label: "Trust Reason" },
  { key: "domainActive", label: "Domain Active" },
  { key: "domainValidated", label: "Domain Validated" },
  { key: "pipelineStage", label: "Pipeline Stage" },
  { key: "callStatus", label: "Call Status" },
  { key: "callNotes", label: "Call Notes" },
  { key: "assignedName", label: "Assigned To" },
  { key: "leadScore", label: "Lead Score" },
  { key: "leadGrade", label: "Lead Grade" },
  { key: "facebook", label: "Facebook" },
  { key: "instagram", label: "Instagram" },
  { key: "twitter", label: "Twitter" },
  { key: "openHours", label: "Hours" },
  { key: "createdAt", label: "Created Date" },
];

const PIPELINE_STAGES: PipelineStage[] = ["new", "call_needed", "contacted", "qualified", "proposal", "won", "lost"];

export function ExportDialog({ schools, open, onClose }: ExportDialogProps) {
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    ALL_COLUMNS.map(c => c.key)
  );
  const [pipelineFilter, setPipelineFilter] = useState<string>("all");
  const [scoreFilter, setScoreFilter] = useState<string>("all");
  const [format, setFormat] = useState<"csv" | "tsv">("csv");

  const toggleColumn = (key: string) => {
    setSelectedColumns(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const selectAllColumns = () => setSelectedColumns(ALL_COLUMNS.map(c => c.key));
  const clearAllColumns = () => setSelectedColumns(["name"]);

  const getFilteredSchools = () => {
    let filtered = [...schools];
    if (pipelineFilter !== "all") {
      filtered = filtered.filter(s => (s.pipelineStage || "new") === pipelineFilter);
    }
    if (scoreFilter !== "all") {
      filtered = filtered.filter(s => {
        const score = calculateLeadScore(s);
        return score.grade === scoreFilter;
      });
    }
    return filtered;
  };

  const getCellValue = (school: School, key: string): string => {
    switch (key) {
      case "leadScore": return String(calculateLeadScore(school).total);
      case "leadGrade": return calculateLeadScore(school).grade;
      case "domainActive": return school.domainActive ? "Yes" : "No";
      case "domainValidated": return school.domainValidated ? "Yes" : "No";
      case "createdAt": return school.createdAt.toISOString().split("T")[0];
      default: {
        const val = (school as any)[key];
        return val != null ? String(val) : "";
      }
    }
  };

  const handleExport = () => {
    const filtered = getFilteredSchools();
    if (filtered.length === 0) {
      toast.error("No leads match the current filters");
      return;
    }

    const separator = format === "csv" ? "," : "\t";
    const headers = selectedColumns.map(key => {
      const col = ALL_COLUMNS.find(c => c.key === key);
      return col?.label || key;
    });

    const rows = filtered.map(school =>
      selectedColumns.map(key => {
        const val = getCellValue(school, key);
        if (format === "csv") return `"${val.replace(/"/g, '""')}"`;
        return val.replace(/\t/g, " ");
      })
    );

    const content = [headers.join(separator), ...rows.map(r => r.join(separator))].join("\n");
    const mimeType = format === "csv" ? "text/csv" : "text/tab-separated-values";
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `leads_export_${new Date().toISOString().split("T")[0]}.${format}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} leads as ${format.toUpperCase()}`);
    onClose();
  };

  const filteredCount = getFilteredSchools().length;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono">
            <Download className="h-5 w-5" /> Advanced Export
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Format */}
          <div>
            <Label className="text-xs font-mono uppercase">Format</Label>
            <div className="flex gap-2 mt-1">
              <Button variant={format === "csv" ? "default" : "outline"} size="sm" className="font-mono text-xs gap-1" onClick={() => setFormat("csv")}>
                <FileSpreadsheet className="h-3 w-3" /> CSV
              </Button>
              <Button variant={format === "tsv" ? "default" : "outline"} size="sm" className="font-mono text-xs gap-1" onClick={() => setFormat("tsv")}>
                <FileText className="h-3 w-3" /> TSV (Excel)
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-mono uppercase">Pipeline Stage</Label>
              <Select value={pipelineFilter} onValueChange={setPipelineFilter}>
                <SelectTrigger className="h-8 text-xs font-mono mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs font-mono">All Stages</SelectItem>
                  {PIPELINE_STAGES.map(s => (
                    <SelectItem key={s} value={s} className="text-xs font-mono capitalize">{s.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-mono uppercase">Lead Grade</Label>
              <Select value={scoreFilter} onValueChange={setScoreFilter}>
                <SelectTrigger className="h-8 text-xs font-mono mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs font-mono">All Grades</SelectItem>
                  {["A", "B", "C", "D", "F"].map(g => (
                    <SelectItem key={g} value={g} className="text-xs font-mono">Grade {g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Columns */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs font-mono uppercase">Columns ({selectedColumns.length}/{ALL_COLUMNS.length})</Label>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="text-[10px] font-mono h-6" onClick={selectAllColumns}>All</Button>
                <Button variant="ghost" size="sm" className="text-[10px] font-mono h-6" onClick={clearAllColumns}>Min</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 max-h-[200px] overflow-y-auto border rounded p-2">
              {ALL_COLUMNS.map(col => (
                <label key={col.key} className="flex items-center gap-1.5 cursor-pointer hover:bg-accent/50 px-1 py-0.5 rounded text-xs font-mono">
                  <Checkbox
                    checked={selectedColumns.includes(col.key)}
                    onCheckedChange={() => toggleColumn(col.key)}
                    className="h-3 w-3"
                  />
                  {col.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <span className="text-xs text-muted-foreground font-mono mr-auto">{filteredCount} leads</span>
          <Button variant="outline" size="sm" onClick={onClose} className="font-mono text-xs">Cancel</Button>
          <Button size="sm" onClick={handleExport} className="font-mono text-xs gap-1" disabled={filteredCount === 0}>
            <Download className="h-3 w-3" /> Export {filteredCount} Leads
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
