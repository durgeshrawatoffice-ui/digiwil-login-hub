import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ArrowRight, AlertTriangle } from "lucide-react";

export interface MatchChange {
  schoolId: string;
  schoolName: string;
  url: string;
  fields: { field: string; oldValue: string; newValue: string }[];
}

interface AutoMatchPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changes: MatchChange[];
  onConfirm: (forceOverwrite: boolean) => void;
  confirming: boolean;
  onRecalculate: (forceOverwrite: boolean) => void;
}

export function AutoMatchPreview({ open, onOpenChange, changes, onConfirm, confirming, onRecalculate }: AutoMatchPreviewProps) {
  const [forceOverwrite, setForceOverwrite] = useState(false);
  const totalFields = changes.reduce((sum, c) => sum + c.fields.length, 0);
  const overwriteCount = changes.reduce((sum, c) => sum + c.fields.filter(f => f.oldValue).length, 0);

  const handleToggle = (checked: boolean) => {
    setForceOverwrite(checked);
    onRecalculate(checked);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-mono uppercase text-base">
            Auto-Match Preview
          </DialogTitle>
          <p className="text-xs text-muted-foreground font-mono">
            {changes.length} school{changes.length !== 1 ? "s" : ""} will be updated across {totalFields} field{totalFields !== 1 ? "s" : ""}
          </p>
        </DialogHeader>

        <div className="flex items-center justify-between p-3 border rounded-md bg-secondary/30">
          <div className="flex items-center gap-2">
            <Switch id="force-overwrite" checked={forceOverwrite} onCheckedChange={handleToggle} />
            <Label htmlFor="force-overwrite" className="text-xs font-mono cursor-pointer">
              Force overwrite existing fields
            </Label>
          </div>
          {forceOverwrite && overwriteCount > 0 && (
            <Badge variant="destructive" className="text-[10px] font-mono flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> {overwriteCount} field{overwriteCount !== 1 ? "s" : ""} will be overwritten
            </Badge>
          )}
        </div>

        <ScrollArea className="flex-1 min-h-0 max-h-[50vh]">
          {changes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No matches found — no schools will be updated.</p>
          ) : (
            <div className="space-y-3 pr-3">
              {changes.map((change) => (
                <div key={change.schoolId} className="border rounded-md p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{change.schoolName}</span>
                    <Badge variant="outline" className="text-[10px] font-mono">{change.url}</Badge>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-mono text-xs w-[120px]">Field</TableHead>
                        <TableHead className="font-mono text-xs">Current</TableHead>
                        <TableHead className="font-mono text-xs w-8"></TableHead>
                        <TableHead className="font-mono text-xs">New Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {change.fields.map((f) => (
                        <TableRow key={f.field} className={f.oldValue ? "bg-destructive/5" : ""}>
                          <TableCell className="font-mono text-xs font-medium">
                            {f.field}
                            {f.oldValue && <AlertTriangle className="h-3 w-3 text-destructive inline ml-1" />}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{f.oldValue || "—"}</TableCell>
                          <TableCell><ArrowRight className="h-3 w-3 text-muted-foreground" /></TableCell>
                          <TableCell className="text-xs text-primary font-medium">{f.newValue}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={confirming} className="font-mono text-xs">
            Cancel
          </Button>
          <Button onClick={() => onConfirm(forceOverwrite)} disabled={confirming || changes.length === 0} className="font-mono text-xs">
            {confirming ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            Confirm & Update {changes.length} School{changes.length !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
