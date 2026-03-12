import { useState, useMemo } from "react";
import { School } from "@/types/school";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { AlertTriangle, Merge, Trash2, Search, Loader2 } from "lucide-react";

interface DuplicateGroup {
  key: string;
  leads: School[];
  matchType: "name" | "phone" | "website";
  similarity: number;
}

interface DuplicateDetectorProps {
  schools: School[];
  onDeleteBulk: (ids: string[]) => void;
  onUpdateField: (id: string, field: string, value: string) => void;
}

function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b[i - 1] === a[j - 1]
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const maxLen = Math.max(na.length, nb.length);
  return 1 - levenshtein(na, nb) / maxLen;
}

export function DuplicateDetector({ schools, onDeleteBulk, onUpdateField }: DuplicateDetectorProps) {
  const [scanning, setScanning] = useState(false);
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set());
  const [scanned, setScanned] = useState(false);

  const scanForDuplicates = () => {
    setScanning(true);
    setSelectedForDelete(new Set());

    setTimeout(() => {
      const found: DuplicateGroup[] = [];
      const usedIds = new Set<string>();

      // Phone duplicates (exact match)
      const phoneMap = new Map<string, School[]>();
      schools.forEach(s => {
        if (s.phone) {
          const key = s.phone.replace(/\D/g, "");
          if (key.length >= 7) {
            if (!phoneMap.has(key)) phoneMap.set(key, []);
            phoneMap.get(key)!.push(s);
          }
        }
      });
      phoneMap.forEach((leads, key) => {
        if (leads.length > 1) {
          leads.forEach(l => usedIds.add(l.id));
          found.push({ key: `phone-${key}`, leads, matchType: "phone", similarity: 1 });
        }
      });

      // Website duplicates (exact domain match)
      const webMap = new Map<string, School[]>();
      schools.forEach(s => {
        const web = s.detectedWebsite || s.website;
        if (web) {
          const domain = web.replace(/https?:\/\//, "").replace(/^www\./, "").replace(/\/.*/, "").toLowerCase();
          if (domain) {
            if (!webMap.has(domain)) webMap.set(domain, []);
            webMap.get(domain)!.push(s);
          }
        }
      });
      webMap.forEach((leads, key) => {
        if (leads.length > 1 && !leads.every(l => usedIds.has(l.id))) {
          leads.forEach(l => usedIds.add(l.id));
          found.push({ key: `web-${key}`, leads, matchType: "website", similarity: 1 });
        }
      });

      // Name similarity duplicates (fuzzy)
      for (let i = 0; i < schools.length; i++) {
        if (usedIds.has(schools[i].id)) continue;
        const group: School[] = [schools[i]];
        let bestSim = 0;
        for (let j = i + 1; j < schools.length; j++) {
          if (usedIds.has(schools[j].id)) continue;
          const sim = similarity(schools[i].name, schools[j].name);
          if (sim >= 0.8) {
            group.push(schools[j]);
            bestSim = Math.max(bestSim, sim);
          }
        }
        if (group.length > 1) {
          group.forEach(l => usedIds.add(l.id));
          found.push({ key: `name-${schools[i].id}`, leads: group, matchType: "name", similarity: bestSim });
        }
      }

      setGroups(found);
      setScanned(true);
      setScanning(false);
      if (found.length === 0) toast.success("No duplicates found!");
      else toast.warning(`Found ${found.length} duplicate groups (${found.reduce((s, g) => s + g.leads.length, 0)} leads)`);
    }, 500);
  };

  const toggleSelect = (id: string) => {
    setSelectedForDelete(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const autoSelectDuplicates = () => {
    const toDelete = new Set<string>();
    groups.forEach(g => {
      // Keep the one with most data, delete the rest
      const scored = g.leads.map(l => ({
        id: l.id,
        score: (l.phone ? 1 : 0) + (l.emails ? 1 : 0) + (l.website || l.detectedWebsite ? 1 : 0) +
          (l.facebook ? 1 : 0) + (l.address ? 1 : 0) + (l.category ? 1 : 0)
      })).sort((a, b) => b.score - a.score);
      scored.slice(1).forEach(s => toDelete.add(s.id));
    });
    setSelectedForDelete(toDelete);
    toast.info(`Auto-selected ${toDelete.size} duplicates for removal`);
  };

  const deleteSelected = () => {
    if (selectedForDelete.size === 0) return;
    onDeleteBulk(Array.from(selectedForDelete));
    setGroups(prev => prev.map(g => ({
      ...g, leads: g.leads.filter(l => !selectedForDelete.has(l.id))
    })).filter(g => g.leads.length > 1));
    toast.success(`Removed ${selectedForDelete.size} duplicate leads`);
    setSelectedForDelete(new Set());
  };

  const matchBadge = (type: string) => {
    switch (type) {
      case "phone": return <Badge variant="outline" className="font-mono text-[10px] border-chart-2 text-chart-2">📞 Phone Match</Badge>;
      case "website": return <Badge variant="outline" className="font-mono text-[10px] border-chart-4 text-chart-4">🌐 Website Match</Badge>;
      case "name": return <Badge variant="outline" className="font-mono text-[10px] border-chart-5 text-chart-5">📝 Name Match</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base font-mono flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-chart-5" />
              Duplicate Detection
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={scanForDuplicates} disabled={scanning || schools.length < 2} size="sm" className="font-mono text-xs">
                {scanning ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Search className="h-3 w-3 mr-1" />}
                {scanning ? "Scanning..." : "Scan for Duplicates"}
              </Button>
              {groups.length > 0 && (
                <>
                  <Button onClick={autoSelectDuplicates} variant="outline" size="sm" className="font-mono text-xs">
                    <Merge className="h-3 w-3 mr-1" /> Auto-Select
                  </Button>
                  <Button onClick={deleteSelected} variant="destructive" size="sm" disabled={selectedForDelete.size === 0} className="font-mono text-xs">
                    <Trash2 className="h-3 w-3 mr-1" /> Delete ({selectedForDelete.size})
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!scanned && (
            <p className="text-sm text-muted-foreground font-mono">Click "Scan for Duplicates" to find leads with similar names, matching phone numbers, or shared websites.</p>
          )}
          {scanned && groups.length === 0 && (
            <p className="text-sm text-chart-2 font-mono">✅ No duplicates found — your database is clean!</p>
          )}
          {groups.length > 0 && (
            <div className="space-y-3">
              {groups.map(g => (
                <div key={g.key} className="border rounded-md p-3 space-y-2 bg-secondary/30">
                  <div className="flex items-center gap-2">
                    {matchBadge(g.matchType)}
                    <span className="text-xs font-mono text-muted-foreground">
                      {g.leads.length} leads • {Math.round(g.similarity * 100)}% match
                    </span>
                  </div>
                  {g.leads.map(l => (
                    <div key={l.id} className="flex items-center gap-3 p-2 rounded bg-background border">
                      <Checkbox
                        checked={selectedForDelete.has(l.id)}
                        onCheckedChange={() => toggleSelect(l.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{l.name}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {[l.phone, l.location, l.detectedWebsite || l.website].filter(Boolean).join(" • ")}
                        </p>
                      </div>
                      <Badge variant="outline" className="font-mono text-[10px]">{l.pipelineStage}</Badge>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
