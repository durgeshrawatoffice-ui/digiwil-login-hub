import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { School } from "@/types/school";
import { calculateLeadScore } from "@/lib/lead-scoring";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Award, TrendingUp } from "lucide-react";

interface LeadScoringWidgetProps {
  schools: School[];
}

export function LeadScoringWidget({ schools }: LeadScoringWidgetProps) {
  const scoredLeads = useMemo(() => {
    return schools.map(s => {
      const result = calculateLeadScore(s);
      return { ...s, score: result.total, grade: result.grade };
    }).sort((a, b) => b.score - a.score);
  }, [schools]);

  const gradeDistribution = useMemo(() => {
    const grades = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    scoredLeads.forEach(l => { grades[l.grade as keyof typeof grades]++; });
    return [
      { grade: "A", count: grades.A, color: "hsl(var(--chart-1))", label: "Excellent" },
      { grade: "B", count: grades.B, color: "hsl(var(--chart-2))", label: "Good" },
      { grade: "C", count: grades.C, color: "hsl(var(--chart-3))", label: "Average" },
      { grade: "D", count: grades.D, color: "hsl(var(--chart-4))", label: "Below Avg" },
      { grade: "F", count: grades.F, color: "hsl(var(--chart-5))", label: "Poor" },
    ];
  }, [scoredLeads]);

  const avgScore = useMemo(() => {
    if (scoredLeads.length === 0) return 0;
    return Math.round(scoredLeads.reduce((a, l) => a + l.score, 0) / scoredLeads.length);
  }, [scoredLeads]);

  const hotLeads = scoredLeads.filter(l => l.grade === "A" || l.grade === "B").length;
  const topLeads = scoredLeads.slice(0, 5);

  if (schools.length === 0) return null;

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {/* Grade Pie Chart */}
      <Card className="border-2">
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-mono uppercase flex items-center gap-2">
            <Award className="h-3.5 w-3.5" /> Grade Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gradeDistribution.filter(g => g.count > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={60}
                  paddingAngle={2}
                  dataKey="count"
                >
                  {gradeDistribution.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number, _: any, props: any) => [value, `Grade ${props.payload.grade}`]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-1.5 flex-wrap">
            {gradeDistribution.filter(g => g.count > 0).map(g => (
              <Badge key={g.grade} variant="outline" className="font-mono text-[10px] px-1.5" style={{ borderColor: g.color, color: g.color }}>
                {g.grade}:{g.count}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Score Stats */}
      <Card className="border-2">
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-mono uppercase flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5" /> Score Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pb-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Average Score</span>
            <div className="flex items-center gap-2">
              <Progress value={avgScore} className="w-20 h-2" />
              <span className="font-mono text-sm font-bold">{avgScore}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Hot Leads (A+B)</span>
            <span className="font-mono text-sm font-bold text-chart-1">{hotLeads}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Need Attention (D+F)</span>
            <span className="font-mono text-sm font-bold text-destructive">
              {scoredLeads.filter(l => l.grade === "D" || l.grade === "F").length}
            </span>
          </div>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gradeDistribution}>
                <XAxis dataKey="grade" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 9 }} width={25} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {gradeDistribution.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top 5 Leads */}
      <Card className="border-2">
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-mono uppercase flex items-center gap-2">
            🏆 Top 5 Leads
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="space-y-2">
            {topLeads.map((lead, idx) => (
              <div key={lead.id} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-4">#{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{lead.name}</p>
                </div>
                <Progress value={lead.score} className="w-14 h-1.5" />
                <Badge variant="outline" className="font-mono text-[10px] px-1.5 h-5">
                  {lead.grade}·{lead.score}
                </Badge>
              </div>
            ))}
            {topLeads.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No leads yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
