import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { School } from "@/types/school";
import { calculateLeadScore, getScoreGrade, getScoreColor } from "@/lib/lead-scoring";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Award, Target, Users } from "lucide-react";

interface LeadScoringDashboardProps {
  schools: School[];
}

export function LeadScoringDashboard({ schools }: LeadScoringDashboardProps) {
  const scoredLeads = useMemo(() => {
    return schools.map(s => {
      const scoreResult = calculateLeadScore(s);
      return {
        ...s,
        score: scoreResult.total,
        grade: scoreResult.grade
      };
    }).sort((a, b) => b.score - a.score);
  }, [schools]);

  const gradeDistribution = useMemo(() => {
    const grades = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    scoredLeads.forEach(lead => {
      grades[lead.grade as keyof typeof grades]++;
    });
    return [
      { grade: "A", count: grades.A, color: "hsl(var(--chart-1))" },
      { grade: "B", count: grades.B, color: "hsl(var(--chart-2))" },
      { grade: "C", count: grades.C, color: "hsl(var(--chart-3))" },
      { grade: "D", count: grades.D, color: "hsl(var(--chart-4))" },
      { grade: "F", count: grades.F, color: "hsl(var(--chart-5))" },
    ];
  }, [scoredLeads]);

  const scoreRanges = useMemo(() => {
    const ranges = [
      { range: "0-20", count: 0 },
      { range: "21-40", count: 0 },
      { range: "41-60", count: 0 },
      { range: "61-80", count: 0 },
      { range: "81-100", count: 0 },
    ];
    scoredLeads.forEach(lead => {
      if (lead.score <= 20) ranges[0].count++;
      else if (lead.score <= 40) ranges[1].count++;
      else if (lead.score <= 60) ranges[2].count++;
      else if (lead.score <= 80) ranges[3].count++;
      else ranges[4].count++;
    });
    return ranges;
  }, [scoredLeads]);

  const avgScore = useMemo(() => {
    if (scoredLeads.length === 0) return 0;
    return Math.round(scoredLeads.reduce((acc, l) => acc + l.score, 0) / scoredLeads.length);
  }, [scoredLeads]);

  const topLeads = scoredLeads.slice(0, 10);
  const hotLeads = scoredLeads.filter(l => l.grade === "A" || l.grade === "B").length;

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase">Avg Score</p>
                <p className="text-2xl font-bold">{avgScore}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-chart-1/10 rounded-lg">
                <Award className="h-5 w-5 text-chart-1" />
              </div>
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase">Hot Leads</p>
                <p className="text-2xl font-bold">{hotLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-chart-2/10 rounded-lg">
                <Target className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase">Grade A</p>
                <p className="text-2xl font-bold">{gradeDistribution[0].count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-chart-3/10 rounded-lg">
                <Users className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase">Total Leads</p>
                <p className="text-2xl font-bold">{schools.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Grade Distribution Pie */}
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase">Grade Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gradeDistribution.filter(g => g.count > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="count"
                    label={({ grade, count }) => `${grade}: ${count}`}
                  >
                    {gradeDistribution.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-3 mt-2">
              {gradeDistribution.map(g => (
                <Badge key={g.grade} variant="outline" className="font-mono text-xs" style={{ borderColor: g.color, color: g.color }}>
                  {g.grade}: {g.count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Score Range Bar Chart */}
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase">Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreRanges}>
                  <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top 10 Leads */}
      <Card className="border-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-mono uppercase flex items-center gap-2">
            <Award className="h-4 w-4" />
            Top 10 Leads by Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topLeads.map((lead, idx) => (
              <div key={lead.id} className="flex items-center gap-4 p-3 border rounded-lg">
                <div className="font-bold text-lg text-muted-foreground w-6">#{idx + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{lead.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{lead.location || lead.address || "No location"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24">
                    <Progress value={lead.score} className="h-2" />
                  </div>
                  <Badge className={`font-mono text-xs ${getScoreColor(lead.score)}`}>
                    {lead.grade} ({lead.score})
                  </Badge>
                </div>
              </div>
            ))}
            {topLeads.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No leads to display</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
