import { Card, CardContent } from "@/components/ui/card";
import { Globe, Search, XCircle, Clock, Building2, Sparkles, Phone, Mail, Kanban, Trophy } from "lucide-react";

interface StatsCardsProps {
  stats: {
    total: number;
    found: number;
    pending: number;
    errors: number;
    notFound: number;
    confirmed: number;
    avgQuality: number;
    government: number;
    private: number;
    noWebsite: number;
    socialOnly: number;
    discovered: number;
    withPhone: number;
    withEmail: number;
    pipelineNew?: number;
    pipelineContacted?: number;
    pipelineQualified?: number;
    pipelineWon?: number;
  };
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    { label: "Total Leads", value: stats.total, icon: Globe },
    { label: "Websites Found", value: stats.found, icon: Search },
    { label: "✨ Discovered", value: stats.discovered, icon: Sparkles },
    { label: "🚫 No Website", value: stats.noWebsite, icon: XCircle },
    { label: "📱 Social Only", value: stats.socialOnly, icon: Clock },
    { label: "📞 Has Phone", value: stats.withPhone, icon: Phone },
    { label: "Pipeline", value: stats.pipelineContacted || 0, icon: Kanban },
    { label: "🏆 Won", value: stats.pipelineWon || 0, icon: Trophy },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      {cards.map((card) => (
        <Card key={card.label} className="border-2 shadow-xs hover:shadow-sm transition-all">
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <card.icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
                {card.label}
              </span>
            </div>
            <p className="text-xl font-bold font-mono">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
