import { useMemo, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { School, PipelineStage } from "@/types/school";
import { calculateLeadScore } from "@/lib/lead-scoring";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, Legend
} from "recharts";
import { Download, FileText, TrendingUp, Target, Trophy, Phone, Users, Calendar } from "lucide-react";

interface ReportsDashboardProps {
  schools: School[];
}

const PIPELINE_LABELS: Record<string, string> = {
  new: "New", call_needed: "Call Needed", contacted: "Contacted",
  qualified: "Qualified", proposal: "Proposal", won: "Won", lost: "Lost",
};

function getWeekLabel(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getMonthLabel(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function ReportsDashboard({ schools }: ReportsDashboardProps) {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const reportRef = useRef<HTMLDivElement>(null);

  const report = useMemo(() => {
    if (schools.length === 0) return null;

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const cutoff = period === "week" ? weekAgo : monthAgo;

    const recentLeads = schools.filter(s => s.createdAt >= cutoff);
    const total = schools.length;
    const won = schools.filter(s => s.pipelineStage === "won").length;
    const lost = schools.filter(s => s.pipelineStage === "lost").length;
    const recentWon = recentLeads.filter(s => s.pipelineStage === "won").length;
    const conversionRate = total > 0 ? Math.round((won / total) * 100) : 0;
    const winRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;

    // Score distribution
    const scoreDistribution = [
      { grade: "A (80-100)", count: 0, color: "hsl(var(--chart-2))" },
      { grade: "B (60-79)", count: 0, color: "hsl(var(--chart-4))" },
      { grade: "C (40-59)", count: 0, color: "hsl(var(--chart-5))" },
      { grade: "D (20-39)", count: 0, color: "hsl(var(--chart-1))" },
      { grade: "F (0-19)", count: 0, color: "hsl(var(--destructive))" },
    ];
    schools.forEach(s => {
      const score = calculateLeadScore(s);
      if (score.total >= 80) scoreDistribution[0].count++;
      else if (score.total >= 60) scoreDistribution[1].count++;
      else if (score.total >= 40) scoreDistribution[2].count++;
      else if (score.total >= 20) scoreDistribution[3].count++;
      else scoreDistribution[4].count++;
    });

    const avgScore = Math.round(schools.reduce((sum, s) => sum + calculateLeadScore(s).total, 0) / total);

    // Pipeline movement
    const pipelineStages: PipelineStage[] = ["new", "call_needed", "contacted", "qualified", "proposal", "won", "lost"];
    const pipelineData = pipelineStages.map(stage => ({
      name: PIPELINE_LABELS[stage],
      total: schools.filter(s => (s.pipelineStage || "new") === stage).length,
      recent: recentLeads.filter(s => (s.pipelineStage || "new") === stage).length,
    }));

    // Timeline data
    const timeMap = new Map<string, { added: number; won: number; contacted: number }>();
    schools.forEach(s => {
      const key = period === "week" ? getWeekLabel(s.createdAt) : getMonthLabel(s.createdAt);
      const entry = timeMap.get(key) || { added: 0, won: 0, contacted: 0 };
      entry.added++;
      if (s.pipelineStage === "won") entry.won++;
      if (["contacted", "qualified", "proposal", "won"].includes(s.pipelineStage || "")) entry.contacted++;
      timeMap.set(key, entry);
    });
    const timelineData = Array.from(timeMap.entries())
      .map(([period, data]) => ({ period: period.slice(5), ...data }))
      .sort((a, b) => a.period.localeCompare(b.period))
      .slice(-12);

    // Call stats
    const totalCalls = schools.filter(s => s.callStatus && s.callStatus !== "pending").length;
    const completedCalls = schools.filter(s => s.callStatus === "completed").length;
    const callSuccessRate = totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0;

    // Assignment stats
    const assignmentMap = new Map<string, number>();
    schools.forEach(s => {
      if (s.assignedName) {
        assignmentMap.set(s.assignedName, (assignmentMap.get(s.assignedName) || 0) + 1);
      }
    });
    const topAssignees = Array.from(assignmentMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total, won, lost, recentLeads: recentLeads.length, recentWon,
      conversionRate, winRate, avgScore, scoreDistribution,
      pipelineData, timelineData, totalCalls, completedCalls, callSuccessRate,
      topAssignees,
    };
  }, [schools, period]);

  const handleExportPDF = () => {
    if (!reportRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html><head><title>LeadRadar Report</title>
      <style>
        body { font-family: monospace; padding: 40px; color: #222; }
        h1 { font-size: 24px; border-bottom: 2px solid #222; padding-bottom: 8px; }
        h2 { font-size: 16px; margin-top: 24px; text-transform: uppercase; letter-spacing: 1px; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 16px 0; }
        .stat { border: 2px solid #ddd; padding: 12px; }
        .stat-value { font-size: 28px; font-weight: bold; }
        .stat-label { font-size: 11px; text-transform: uppercase; color: #666; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; font-size: 12px; }
        th { background: #f5f5f5; text-transform: uppercase; font-size: 10px; }
        .footer { margin-top: 40px; font-size: 10px; color: #999; border-top: 1px solid #ddd; padding-top: 8px; }
      </style></head><body>
      <h1>📊 LeadRadar — ${period === "week" ? "Weekly" : "Monthly"} Report</h1>
      <p style="font-size:12px;color:#666;">Generated: ${new Date().toLocaleDateString()} | Total Leads: ${report?.total || 0}</p>
      
      <h2>Key Metrics</h2>
      <div class="grid">
        <div class="stat"><div class="stat-value">${report?.total || 0}</div><div class="stat-label">Total Leads</div></div>
        <div class="stat"><div class="stat-value">${report?.conversionRate || 0}%</div><div class="stat-label">Conversion Rate</div></div>
        <div class="stat"><div class="stat-value">${report?.winRate || 0}%</div><div class="stat-label">Win Rate</div></div>
        <div class="stat"><div class="stat-value">${report?.avgScore || 0}</div><div class="stat-label">Avg Lead Score</div></div>
        <div class="stat"><div class="stat-value">${report?.callSuccessRate || 0}%</div><div class="stat-label">Call Success Rate</div></div>
        <div class="stat"><div class="stat-value">${report?.recentLeads || 0}</div><div class="stat-label">New This ${period === "week" ? "Week" : "Month"}</div></div>
      </div>

      <h2>Pipeline Distribution</h2>
      <table>
        <tr><th>Stage</th><th>Total</th><th>Recent</th></tr>
        ${(report?.pipelineData || []).map(p => `<tr><td>${p.name}</td><td>${p.total}</td><td>${p.recent}</td></tr>`).join("")}
      </table>

      <h2>Lead Score Distribution</h2>
      <table>
        <tr><th>Grade</th><th>Count</th></tr>
        ${(report?.scoreDistribution || []).map(s => `<tr><td>${s.grade}</td><td>${s.count}</td></tr>`).join("")}
      </table>

      ${(report?.topAssignees?.length || 0) > 0 ? `
      <h2>Top Assignees</h2>
      <table>
        <tr><th>Name</th><th>Leads</th></tr>
        ${(report?.topAssignees || []).map(a => `<tr><td>${a.name}</td><td>${a.count}</td></tr>`).join("")}
      </table>
      ` : ""}

      <div class="footer">LeadRadar AI Lead Intelligence • ${new Date().toISOString()}</div>
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  if (!report || report.total === 0) {
    return (
      <Card className="border-2">
        <CardContent className="py-16 text-center text-muted-foreground font-mono text-sm">
          Import leads to generate reports
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" ref={reportRef}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as "week" | "month")}>
            <SelectTrigger className="w-[140px] h-8 text-xs font-mono border-2">
              <Calendar className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week" className="text-xs font-mono">Weekly</SelectItem>
              <SelectItem value="month" className="text-xs font-mono">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground font-mono">
            {report.recentLeads} new leads this {period}
          </span>
        </div>
        <Button variant="outline" size="sm" className="font-mono text-xs gap-1" onClick={handleExportPDF}>
          <FileText className="h-3 w-3" /> Export PDF
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={Target} label="Total Leads" value={String(report.total)} />
        <StatCard icon={TrendingUp} label="Conversion" value={`${report.conversionRate}%`} />
        <StatCard icon={Trophy} label="Win Rate" value={`${report.winRate}%`} />
        <StatCard icon={Phone} label="Call Success" value={`${report.callSuccessRate}%`} />
        <StatCard icon={Users} label="Avg Score" value={String(report.avgScore)} />
        <StatCard icon={Calendar} label={`New (${period})`} value={String(report.recentLeads)} />
      </div>

      <Tabs defaultValue="pipeline" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pipeline" className="text-xs font-mono">Pipeline</TabsTrigger>
          <TabsTrigger value="scores" className="text-xs font-mono">Scores</TabsTrigger>
          <TabsTrigger value="trends" className="text-xs font-mono">Trends</TabsTrigger>
          <TabsTrigger value="team" className="text-xs font-mono">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline">
          <Card className="border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono uppercase">Pipeline Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={report.pipelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={50} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="total" fill="hsl(var(--chart-2))" name="Total" stroke="hsl(var(--border))" strokeWidth={1} />
                  <Bar dataKey="recent" fill="hsl(var(--chart-4))" name={`This ${period}`} stroke="hsl(var(--border))" strokeWidth={1} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scores">
          <Card className="border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono uppercase">Lead Score Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={report.scoreDistribution.filter(s => s.count > 0)} cx="50%" cy="50%" innerRadius={40} outerRadius={90} dataKey="count" nameKey="grade" stroke="hsl(var(--border))" strokeWidth={2}>
                      {report.scoreDistribution.filter(s => s.count > 0).map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3 flex flex-col justify-center">
                  {report.scoreDistribution.map(s => (
                    <div key={s.grade} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: s.color }} />
                      <span className="text-xs font-mono flex-1">{s.grade}</span>
                      <span className="text-sm font-bold font-mono">{s.count}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        ({report.total > 0 ? Math.round((s.count / report.total) * 100) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card className="border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono uppercase">{period === "week" ? "Weekly" : "Monthly"} Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={report.timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="period" tick={{ fontSize: 9 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Area type="monotone" dataKey="added" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.3} name="Added" />
                  <Area type="monotone" dataKey="contacted" stroke="hsl(var(--chart-4))" fill="hsl(var(--chart-4))" fillOpacity={0.3} name="Contacted" />
                  <Area type="monotone" dataKey="won" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.3} name="Won" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card className="border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono uppercase">Team Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {report.topAssignees.length > 0 ? (
                <div className="space-y-3">
                  {report.topAssignees.map((a, i) => (
                    <div key={a.name} className="flex items-center gap-3">
                      <span className="text-lg font-bold font-mono text-muted-foreground w-6">#{i + 1}</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{a.name}</p>
                        <div className="w-full bg-secondary h-2 mt-1 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${Math.round((a.count / report.total) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <Badge variant="outline" className="font-mono text-xs">{a.count} leads</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground font-mono text-sm py-8">No assignments yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card className="border-2 shadow-xs">
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[9px] font-mono uppercase tracking-wide text-muted-foreground">{label}</span>
        </div>
        <p className="text-xl font-bold font-mono">{value}</p>
      </CardContent>
    </Card>
  );
}
