import { School, WebsiteType, PipelineStage } from "@/types/school";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import {
  ExternalLink, Copy, RefreshCw, Pencil, Trash2, Shield, ShieldOff,
  Smartphone, Zap, Phone, Mail, Sparkles, Globe, Search,
  Facebook, Instagram, Eye, RotateCw, ChevronDown, Save, BookmarkPlus, X, Check, ArrowUpDown
} from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { OutreachDialog } from "./OutreachDialog";
import { LeadCardDialog } from "./LeadCardDialog";
import { LeadScoreBadge } from "./LeadScoreBadge";
import { calculateLeadScore } from "@/lib/lead-scoring";
import { toast } from "sonner";

interface SchoolTableProps {
  schools: School[];
  onUpdateWebsite: (id: string, website: string) => void;
  onUpdateField?: (id: string, field: string, value: string) => void;
  onDelete: (id: string) => void;
  onRetry: () => void;
  onRevalidate?: (id: string) => void;
  onDeleteBulk?: (ids: string[]) => void;
  onBulkPipelineChange?: (ids: string[], stage: string) => void;
  onBulkAssign?: (ids: string[], assignedTo: string, assignedName: string) => void;
  validating?: boolean;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "PENDING", variant: "secondary" },
  processing: { label: "PROCESSING", variant: "outline" },
  found: { label: "FOUND", variant: "default" },
  not_found: { label: "NOT FOUND", variant: "secondary" },
  error: { label: "ERROR", variant: "destructive" },
};

const websiteTypeLabels: Record<WebsiteType, { label: string; color: string }> = {
  verified_website: { label: "✅ Verified", color: "text-chart-2" },
  unverified_website: { label: "❓ Unverified", color: "text-muted-foreground" },
  social_only: { label: "📱 Social Only", color: "text-chart-4" },
  no_website: { label: "🚫 No Website", color: "text-destructive" },
  email_domain_found: { label: "📧 Email Domain", color: "text-chart-5" },
  dead: { label: "💀 Dead", color: "text-muted-foreground" },
  discovered: { label: "✨ DISCOVERED", color: "text-chart-2" },
};

const PIPELINE_STAGES: { key: PipelineStage; label: string }[] = [
  { key: "new", label: "New" },
  { key: "call_needed", label: "Call Needed" },
  { key: "contacted", label: "Contacted" },
  { key: "qualified", label: "Qualified" },
  { key: "proposal", label: "Proposal" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];

interface FilterPreset {
  name: string;
  search: string;
  category: string;
  contact: string;
}

const STORAGE_KEY = "leadradar_filter_presets";

function loadPresets(): FilterPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function savePresets(presets: FilterPreset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

// Inline editable cell
function InlineEditCell({ value, field, schoolId, onSave, className = "" }: {
  value: string;
  field: string;
  schoolId: string;
  onSave: (id: string, field: string, value: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (!editing) {
    return (
      <span
        className={`cursor-pointer hover:bg-accent/50 px-1 py-0.5 rounded transition-colors ${className}`}
        onDoubleClick={() => { setEditVal(value); setEditing(true); }}
        title="Double-click to edit"
      >
        {value || <span className="text-muted-foreground italic">—</span>}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        ref={inputRef}
        value={editVal}
        onChange={(e) => setEditVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { onSave(schoolId, field, editVal); setEditing(false); }
          if (e.key === "Escape") setEditing(false);
        }}
        className="h-6 text-xs font-mono border px-1 min-w-[80px]"
      />
      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => { onSave(schoolId, field, editVal); setEditing(false); }}>
        <Check className="h-3 w-3" />
      </Button>
      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setEditing(false)}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function SchoolTable({ schools, onUpdateWebsite, onUpdateField, onDelete, onDeleteBulk, onBulkPipelineChange, onBulkAssign, onRetry, onRevalidate, validating }: SchoolTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [outreachSchool, setOutreachSchool] = useState<School | null>(null);
  const [selectedCardSchool, setSelectedCardSchool] = useState<School | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [contactFilter, setContactFilter] = useState("all");
  const [sortByScore, setSortByScore] = useState(false);
  const [presets, setPresets] = useState<FilterPreset[]>(loadPresets);
  const [presetName, setPresetName] = useState("");
  const [showSavePreset, setShowSavePreset] = useState(false);

  const categories = Array.from(new Set(schools.map(s => s.category).filter(Boolean))) as string[];

  const startEdit = (school: School) => {
    setEditingId(school.id);
    setEditValue(school.detectedWebsite || school.website || "");
  };

  const saveEdit = (id: string) => {
    onUpdateWebsite(id, editValue);
    setEditingId(null);
  };

  const handleFieldSave = (id: string, field: string, value: string) => {
    if (onUpdateField) onUpdateField(id, field, value);
  };

  const filteredSchools = useMemo(() => {
    let result = schools.filter(s => {
      if (categoryFilter !== "all" && s.category !== categoryFilter) return false;
      if (contactFilter !== "all") {
        if (contactFilter === "has_phone" && !s.phone) return false;
        if (contactFilter === "has_email" && !s.emails) return false;
        if (contactFilter === "has_social" && !s.facebook && !s.instagram && !s.twitter && !s.socialMedias) return false;
        if (contactFilter === "no_contact" && (s.phone || s.emails || s.facebook || s.instagram || s.twitter || s.socialMedias)) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!(s.name.toLowerCase().includes(q) || s.location?.toLowerCase().includes(q) || s.phone?.includes(q) || s.category?.toLowerCase().includes(q))) return false;
      }
      return true;
    });
    if (sortByScore) {
      result = [...result].sort((a, b) => calculateLeadScore(b).total - calculateLeadScore(a).total);
    }
    return result;
  }, [schools, categoryFilter, contactFilter, searchQuery, sortByScore]);

  const errorSchools = schools.filter((s) => s.status === "error");

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredSchools.length && filteredSchools.length > 0) setSelectedIds([]);
    else setSelectedIds(filteredSchools.map((s) => s.id));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (document.querySelector('[role="dialog"]')?.contains(event.target as Node)) return;
      if (tableRef.current && !tableRef.current.contains(event.target as Node) && selectedIds.length > 0) setSelectedIds([]);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedIds]);

  // Preset management
  const handleSavePreset = () => {
    if (!presetName.trim()) { toast.error("Enter a preset name"); return; }
    const newPreset: FilterPreset = { name: presetName.trim(), search: searchQuery, category: categoryFilter, contact: contactFilter };
    const updated = [...presets.filter(p => p.name !== newPreset.name), newPreset];
    setPresets(updated);
    savePresets(updated);
    setPresetName("");
    setShowSavePreset(false);
    toast.success(`Preset "${newPreset.name}" saved`);
  };

  const handleLoadPreset = (preset: FilterPreset) => {
    setSearchQuery(preset.search);
    setCategoryFilter(preset.category);
    setContactFilter(preset.contact);
    toast.success(`Loaded preset "${preset.name}"`);
  };

  const handleDeletePreset = (name: string) => {
    const updated = presets.filter(p => p.name !== name);
    setPresets(updated);
    savePresets(updated);
    toast.success(`Deleted preset "${name}"`);
  };

  return (
    <div ref={tableRef}>
      {/* Search, Filters & Presets */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center flex-wrap gap-2 mb-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name, address, phone, category..." className="pl-7 h-8 text-xs font-mono border-2" />
        </div>

        {categories.length > 0 && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px] h-8 text-xs font-mono border-2"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs font-mono">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c} className="text-xs font-mono">{c}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        <Select value={contactFilter} onValueChange={setContactFilter}>
          <SelectTrigger className="w-[140px] h-8 text-xs font-mono border-2"><SelectValue placeholder="Contact" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs font-mono">All Contacts</SelectItem>
            <SelectItem value="has_phone" className="text-xs font-mono">Has Phone</SelectItem>
            <SelectItem value="has_email" className="text-xs font-mono">Has Email</SelectItem>
            <SelectItem value="has_social" className="text-xs font-mono">Has Social</SelectItem>
            <SelectItem value="no_contact" className="text-xs font-mono">No Contact</SelectItem>
          </SelectContent>
        </Select>

        {/* Preset buttons */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs font-mono gap-1">
              <BookmarkPlus className="h-3 w-3" /> Presets <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {presets.length === 0 && <DropdownMenuItem disabled className="text-xs text-muted-foreground">No saved presets</DropdownMenuItem>}
            {presets.map(p => (
              <DropdownMenuItem key={p.name} className="text-xs font-mono flex justify-between" onSelect={() => handleLoadPreset(p)}>
                {p.name}
                <Button variant="ghost" size="icon" className="h-4 w-4 ml-2" onClick={(e) => { e.stopPropagation(); handleDeletePreset(p.name); }}>
                  <X className="h-3 w-3" />
                </Button>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              {showSavePreset ? (
                <div className="flex gap-1">
                  <Input value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder="Preset name" className="h-7 text-xs" onKeyDown={(e) => e.key === "Enter" && handleSavePreset()} />
                  <Button size="sm" className="h-7 text-xs" onClick={handleSavePreset}><Save className="h-3 w-3" /></Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" className="w-full h-7 text-xs font-mono" onClick={() => setShowSavePreset(true)}>
                  <BookmarkPlus className="h-3 w-3 mr-1" /> Save Current Filter
                </Button>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant={sortByScore ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs font-mono gap-1"
          onClick={() => setSortByScore(!sortByScore)}
        >
          <ArrowUpDown className="h-3 w-3" /> Score
        </Button>

        <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
          {filteredSchools.length}/{schools.length}
        </span>
      </div>

      {errorSchools.length > 0 && (
        <div className="flex items-center justify-between p-3 border-2 border-destructive bg-destructive/5 mb-4">
          <span className="font-mono text-sm">{errorSchools.length} failed — {errorSchools.filter((s) => s.retryCount > 0).length} retried</span>
          <Button variant="outline" size="sm" onClick={onRetry} className="font-mono text-xs uppercase"><RefreshCw className="h-3 w-3 mr-1" /> Retry All</Button>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center flex-wrap gap-2 p-3 border-2 border-primary bg-primary/5 mb-4">
          <span className="font-mono text-sm font-bold">{selectedIds.length} selected</span>

          {/* Bulk Pipeline Change */}
          {onBulkPipelineChange && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="font-mono text-xs h-7">
                  Move to Stage <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {PIPELINE_STAGES.map(s => (
                  <DropdownMenuItem key={s.key} className="text-xs font-mono" onSelect={() => { onBulkPipelineChange(selectedIds, s.key); setSelectedIds([]); }}>
                    {s.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Bulk Assign */}
          {onBulkAssign && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="font-mono text-xs h-7">
                  Assign <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem className="text-xs font-mono" onSelect={() => { onBulkAssign(selectedIds, "", ""); setSelectedIds([]); }}>
                  Unassign
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {onDeleteBulk && (
            <Button variant="destructive" size="sm" className="font-mono text-xs h-7 ml-auto" onClick={() => { onDeleteBulk(selectedIds); setSelectedIds([]); }}>
              <Trash2 className="h-3 w-3 mr-1" /> Delete
            </Button>
          )}
        </div>
      )}

      <div className="border-2 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b-2">
              <TableHead className="w-[40px] px-4">
                <Checkbox checked={filteredSchools.length > 0 && selectedIds.length === filteredSchools.length} onCheckedChange={toggleSelectAll} aria-label="Select all" />
              </TableHead>
              <TableHead className="font-mono text-xs uppercase">School</TableHead>
              <TableHead className="font-mono text-xs uppercase">Type</TableHead>
              <TableHead className="font-mono text-xs uppercase">Website Status</TableHead>
              <TableHead className="font-mono text-xs uppercase">Contact</TableHead>
              <TableHead className="font-mono text-xs uppercase">Trust</TableHead>
              <TableHead className="font-mono text-xs uppercase">Score</TableHead>
              <TableHead className="font-mono text-xs uppercase">Quality</TableHead>
              <TableHead className="font-mono text-xs uppercase">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSchools.map((school) => (
              <TableRow key={school.id} className={`border-b-2 ${selectedIds.includes(school.id) ? "bg-primary/5" : ""}`}>
                <TableCell className="px-4">
                  <Checkbox checked={selectedIds.includes(school.id)} onCheckedChange={() => toggleSelect(school.id)} aria-label={`Select ${school.name}`} />
                </TableCell>

                {/* School Info - Inline editable name */}
                <TableCell>
                  <div className="max-w-[250px]">
                    {onUpdateField ? (
                      <InlineEditCell value={school.name} field="name" schoolId={school.id} onSave={handleFieldSave} className="font-semibold text-sm text-primary" />
                    ) : (
                      <p className="font-semibold text-sm truncate hover:underline cursor-pointer text-primary" onClick={() => setSelectedCardSchool(school)}>{school.name}</p>
                    )}
                    {school.location && <p className="text-xs text-muted-foreground font-mono truncate">{school.location}</p>}
                    <div className="flex items-center gap-1 mt-1">
                      {school.category && <Badge variant="outline" className="text-[10px] font-mono py-0 h-4">{school.category}</Badge>}
                      {school.rating && <span className="text-[10px] font-mono text-muted-foreground">⭐ {school.rating}</span>}
                    </div>
                  </div>
                </TableCell>

                {/* School Type */}
                <TableCell>
                  <Badge variant={school.schoolType === "government" ? "default" : "secondary"} className="text-[10px] font-mono">
                    {school.schoolType === "government" ? "🏛 GOVT" : school.schoolType === "private" ? "🏫 PVT" : "—"}
                  </Badge>
                </TableCell>

                {/* Website Status */}
                <TableCell>
                  <div className="space-y-1">
                    {editingId === school.id ? (
                      <div className="flex gap-1">
                        <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="h-7 text-xs font-mono border-2" />
                        <Button size="sm" onClick={() => saveEdit(school.id)} className="h-7 text-xs font-mono">Save</Button>
                      </div>
                    ) : (
                      <>
                        {(school.detectedWebsite || school.website) && (
                          <a href={school.detectedWebsite || school.website} target="_blank" rel="noopener noreferrer" className="text-xs font-mono underline flex items-center gap-1 hover:text-muted-foreground">
                            <Globe className="h-3 w-3 shrink-0" />
                            {(school.detectedWebsite || school.website || "").replace(/https?:\/\//, "").slice(0, 28)}
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        )}
                        <div className="flex items-center gap-1">
                          <Badge variant={statusConfig[school.status]?.variant || "secondary"} className="font-mono text-[10px] py-0 h-4">
                            {statusConfig[school.status]?.label}
                          </Badge>
                          {school.discovered && (
                            <Badge variant="outline" className="font-mono text-[10px] py-0 h-4 border-chart-2 text-chart-2 bg-chart-2/10">
                              <Sparkles className="h-2.5 w-2.5 mr-0.5" /> DISCOVERED
                            </Badge>
                          )}
                          {school.discovered && school.trustReason && (() => {
                            const methodMatch = school.trustReason.match(/\[(clearbit|firecrawl\+ai|firecrawl|ddg|unknown)\]/i);
                            if (!methodMatch) return null;
                            const method = methodMatch[1].toLowerCase();
                            const methodConfig: Record<string, { label: string; className: string }> = {
                              clearbit: { label: "Clearbit", className: "border-chart-5 text-chart-5 bg-chart-5/10" },
                              "firecrawl+ai": { label: "Firecrawl+AI", className: "border-chart-4 text-chart-4 bg-chart-4/10" },
                              firecrawl: { label: "Firecrawl", className: "border-chart-4 text-chart-4 bg-chart-4/10" },
                              ddg: { label: "DDG", className: "border-muted-foreground text-muted-foreground bg-muted" },
                            };
                            const cfg = methodConfig[method];
                            if (!cfg) return null;
                            return (
                              <Badge variant="outline" className={`font-mono text-[10px] py-0 h-4 ${cfg.className}`}>
                                {cfg.label}
                              </Badge>
                            );
                          })()}
                          {school.websiteType && school.websiteType !== "verified_website" && (
                            <span className={`text-[10px] font-mono ${websiteTypeLabels[school.websiteType]?.color || ""}`}>
                              {websiteTypeLabels[school.websiteType]?.label}
                            </span>
                          )}
                        </div>
                        {school.trustReason && <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]">{school.trustReason}</p>}
                      </>
                    )}
                  </div>
                </TableCell>

                {/* Contact - Inline editable */}
                <TableCell>
                  <div className="space-y-0.5">
                    {onUpdateField ? (
                      <>
                        <div className="flex items-center gap-1 text-xs font-mono">
                          <Phone className="h-3 w-3 text-chart-2 shrink-0" />
                          <InlineEditCell value={school.phone || ""} field="phone" schoolId={school.id} onSave={handleFieldSave} className="text-xs font-mono" />
                        </div>
                        <div className="flex items-center gap-1 text-xs font-mono">
                          <Mail className="h-3 w-3 shrink-0" />
                          <InlineEditCell value={school.emails || ""} field="emails" schoolId={school.id} onSave={handleFieldSave} className="text-xs font-mono text-muted-foreground" />
                        </div>
                      </>
                    ) : (
                      <>
                        {school.phone && (
                          <a href={`tel:${school.phone}`} className="flex items-center gap-1 text-xs font-mono hover:underline">
                            <Phone className="h-3 w-3 text-chart-2 shrink-0" />
                            <span className="truncate max-w-[100px]">{school.phone}</span>
                          </a>
                        )}
                        {school.emails && (
                          <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[100px]">{school.emails.split(',')[0]}</span>
                          </div>
                        )}
                      </>
                    )}
                    <div className="flex gap-1 mt-0.5">
                      {school.facebook && <a href={school.facebook} target="_blank" rel="noopener noreferrer"><Facebook className="h-3 w-3 text-muted-foreground hover:text-foreground" /></a>}
                      {school.instagram && <a href={school.instagram} target="_blank" rel="noopener noreferrer"><Instagram className="h-3 w-3 text-muted-foreground hover:text-foreground" /></a>}
                    </div>
                  </div>
                </TableCell>

                {/* Trust Score */}
                <TableCell>
                  {school.trustScore !== undefined ? (
                    <div className="flex items-center gap-2">
                      <Progress value={school.trustScore} className="w-12 h-2" />
                      <span className="text-xs font-mono font-bold">{school.trustScore}</span>
                    </div>
                  ) : school.similarityScore !== undefined ? (
                    <div className="flex items-center gap-2">
                      <Progress value={school.similarityScore} className="w-12 h-2" />
                      <span className="text-xs font-mono">{school.similarityScore}%</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground font-mono">—</span>
                  )}
                </TableCell>

                {/* Lead Score */}
                <TableCell>
                  <LeadScoreBadge school={school} />
                </TableCell>

                {/* Quality */}
                <TableCell>
                  {school.qualityScore ? (
                    <div className="flex items-center gap-1.5">
                      <Smartphone className={`h-3 w-3 ${school.qualityScore.mobile > 60 ? "text-foreground" : "text-muted-foreground"}`} />
                      <Zap className={`h-3 w-3 ${school.qualityScore.speed > 60 ? "text-foreground" : "text-muted-foreground"}`} />
                      {school.qualityScore.ssl ? <Shield className="h-3 w-3 text-foreground" /> : <ShieldOff className="h-3 w-3 text-destructive" />}
                      <span className="text-xs font-mono ml-1">{school.qualityScore.overall}%</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground font-mono">—</span>
                  )}
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setSelectedCardSchool(school)} title="View Detail">
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => startEdit(school)} title="Edit Website">
                      <Pencil className="h-3 w-3" />
                    </Button>
                    {(school.detectedWebsite || school.website) && (
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setOutreachSchool(school)} title="Outreach">
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                    {school.phone && (
                      <Button variant="outline" size="icon" className="h-7 w-7" asChild title="Call">
                        <a href={`tel:${school.phone}`}><Phone className="h-3 w-3" /></a>
                      </Button>
                    )}
                    {(school.detectedWebsite || school.website) && onRevalidate && (
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onRevalidate(school.id)} disabled={validating} title="Re-validate">
                        <RotateCw className={`h-3 w-3 ${validating ? 'animate-spin' : ''}`} />
                      </Button>
                    )}
                    <Button variant="outline" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(school.id)} title="Delete">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredSchools.length === 0 && (
        <div className="text-center py-12 text-muted-foreground font-mono text-sm">
          No schools found. Import a CSV file to get started.
        </div>
      )}

      {outreachSchool && <OutreachDialog school={outreachSchool} open={!!outreachSchool} onClose={() => setOutreachSchool(null)} />}
      {selectedCardSchool && <LeadCardDialog school={selectedCardSchool} open={!!selectedCardSchool} onClose={() => setSelectedCardSchool(null)} />}
    </div>
  );
}
