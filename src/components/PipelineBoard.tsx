import { School, PipelineStage } from "@/types/school";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Phone, Globe, MapPin, Star, ChevronRight, Sparkles, Mail,
  ExternalLink, ArrowRight, GripVertical
} from "lucide-react";
import { useState, useRef, DragEvent } from "react";
import { LeadCardDialog } from "./LeadCardDialog";
import { LeadScoreBadge } from "./LeadScoreBadge";

const PIPELINE_STAGES: { key: PipelineStage; label: string; emoji: string; color: string }[] = [
  { key: "new", label: "New Leads", emoji: "🆕", color: "border-t-chart-3" },
  { key: "call_needed", label: "Needs Call", emoji: "📞", color: "border-t-chart-1" },
  { key: "contacted", label: "Contacted", emoji: "💬", color: "border-t-chart-4" },
  { key: "qualified", label: "Qualified", emoji: "✅", color: "border-t-chart-2" },
  { key: "proposal", label: "Proposal", emoji: "📋", color: "border-t-chart-5" },
  { key: "won", label: "Won", emoji: "🏆", color: "border-t-primary" },
  { key: "lost", label: "Lost", emoji: "❌", color: "border-t-destructive" },
];

interface PipelineBoardProps {
  schools: School[];
  onUpdatePipeline: (id: string, stage: string) => void;
  onUpdateWebsite: (id: string, website: string) => void;
}

export function PipelineBoard({ schools, onUpdatePipeline, onUpdateWebsite }: PipelineBoardProps) {
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<PipelineStage | null>(null);
  const [recentlyDropped, setRecentlyDropped] = useState<string | null>(null);

  const getNextStage = (current: PipelineStage): PipelineStage | null => {
    const order: PipelineStage[] = ["new", "call_needed", "contacted", "qualified", "proposal", "won"];
    const idx = order.indexOf(current);
    return idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;
  };

  const handleDragStart = (e: DragEvent, leadId: string) => {
    setDraggedId(leadId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", leadId);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  };

  const handleDragEnd = (e: DragEvent) => {
    setDraggedId(null);
    setDragOverStage(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
  };

  const handleDragOver = (e: DragEvent, stageKey: PipelineStage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stageKey);
  };

  const handleDragLeave = (e: DragEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (!e.currentTarget.contains(relatedTarget)) {
      setDragOverStage(null);
    }
  };

  const handleDrop = (e: DragEvent, stageKey: PipelineStage) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("text/plain");
    if (leadId) {
      const lead = schools.find(s => s.id === leadId);
      const currentStage = lead?.pipelineStage || "new";
      if (currentStage !== stageKey) {
        onUpdatePipeline(leadId, stageKey);
        // Trigger drop animation
        setRecentlyDropped(leadId);
        setTimeout(() => setRecentlyDropped(null), 700);
      }
    }
    setDraggedId(null);
    setDragOverStage(null);
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 min-h-[500px]">
        {PIPELINE_STAGES.map((stage) => {
          const stageLeads = schools.filter(s => (s.pipelineStage || "new") === stage.key);
          const isOver = dragOverStage === stage.key;
          return (
            <div key={stage.key} className="flex flex-col">
              <div
                className={`border-2 border-t-4 ${stage.color} flex flex-col h-full transition-colors ${
                  isOver ? "bg-accent/40 border-primary/50" : ""
                }`}
                onDragOver={(e) => handleDragOver(e, stage.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.key)}
              >
                <div className="p-2 border-b-2 bg-secondary/30">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase font-bold">
                      {stage.emoji} {stage.label}
                    </span>
                    <Badge variant="secondary" className="text-[10px] font-mono h-5 px-1.5">
                      {stageLeads.length}
                    </Badge>
                  </div>
                </div>
                <ScrollArea className="flex-1 max-h-[450px]">
                  <div className="p-1.5 space-y-1.5">
                    {stageLeads.map((lead) => {
                      const nextStage = getNextStage(stage.key);
                      const isDragging = draggedId === lead.id;
                      const justDropped = recentlyDropped === lead.id;
                      return (
                        <Card
                          key={lead.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          onDragEnd={handleDragEnd}
                          className={`border shadow-xs cursor-grab active:cursor-grabbing hover:shadow-sm transition-all duration-300 ${
                            isDragging ? "opacity-50 ring-2 ring-primary" : ""
                          } ${justDropped ? "animate-drop-in ring-2 ring-primary/60 shadow-md scale-[1.03]" : ""}`}
                          onClick={() => setSelectedSchool(lead)}
                        >
                          <CardContent className="p-2 space-y-1">
                            <div className="flex items-center gap-1">
                              <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
                              <p className="text-xs font-semibold truncate flex-1">{lead.name}</p>
                            </div>
                            {lead.location && (
                              <p className="text-[9px] text-muted-foreground truncate flex items-center gap-0.5">
                                <MapPin className="h-2.5 w-2.5 shrink-0" /> {lead.location}
                              </p>
                            )}
                            <div className="flex items-center gap-1 flex-wrap">
                              {lead.phone && (
                                <Badge variant="outline" className="text-[8px] font-mono py-0 h-3.5 px-1">
                                  <Phone className="h-2 w-2 mr-0.5" /> Phone
                                </Badge>
                              )}
                              {lead.discovered && (
                                <Badge variant="outline" className="text-[8px] font-mono py-0 h-3.5 px-1 border-chart-2 text-chart-2">
                                  <Sparkles className="h-2 w-2 mr-0.5" /> AI
                                </Badge>
                              )}
                              {(lead.detectedWebsite || lead.website) && (
                                <Badge variant="outline" className="text-[8px] font-mono py-0 h-3.5 px-1">
                                  <Globe className="h-2 w-2 mr-0.5" /> Web
                                </Badge>
                              )}
                              <LeadScoreBadge school={lead} />
                            </div>
                            {nextStage && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="w-full h-5 text-[9px] font-mono mt-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUpdatePipeline(lead.id, nextStage);
                                }}
                              >
                                Move <ArrowRight className="h-2.5 w-2.5 ml-0.5" />
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                    {stageLeads.length === 0 && (
                      <p className={`text-[10px] text-muted-foreground font-mono text-center py-6 ${
                        isOver ? "text-primary font-semibold" : ""
                      }`}>
                        {isOver ? "Drop here" : "No leads"}
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          );
        })}
      </div>
      <LeadCardDialog school={selectedSchool} open={!!selectedSchool} onClose={() => setSelectedSchool(null)} />
    </>
  );
}
