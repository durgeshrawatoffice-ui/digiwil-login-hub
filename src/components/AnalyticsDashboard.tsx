import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { School, PipelineStage } from "@/types/school";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend, AreaChart, Area
} from "recharts";
import { TrendingUp, Target, Phone, Clock, ArrowRight, Trophy, BarChart3, Activity } from "lucide-react";

interface AnalyticsDashboardProps {
  schools: School[];
}

const PIPELINE_ORDER: PipelineStage[] = ["new", "call_needed", "contacted", "qualified", "proposal", "won", "lost"];
const PIPELINE_LABELS: Record<string, string> = {
  new: "New", call_needed: "Call Needed", contacted: "Contacted",
  qualified: "Qualified", proposal: "Proposal", won: "Won", lost: "Lost",
};

export function AnalyticsDashboard({ schools }: AnalyticsDashboardProps) {
  const analytics = useMemo(() => {
    const total = schools.length;
    if (total === 0) return null;

    // Pipeline distribution
    const pipelineCounts = PIPELINE_ORDER.map((stage) => ({
      name: PIPELINE_LABELS[stage],
      count: schools.filter((s) => (s.pipelineStage || "new") === stage).length,
      stage,
    }));

    // Conversion funnel
    const funnelStages = ["new", "call_needed", "contacted", "qualified", "proposal", "won"];
    const funnel = funnelStages.map((stage) => {
      const count = schools.filter((s) => {
        const idx = funnelStages.indexOf(s.pipelineStage || "new");
        return idx >= funnelStages.indexOf(stage);
      }).length;
      return { name: PIPELINE_LABELS[stage], count, rate: total > 0 ? Math.round((count / total) * 100) : 0 };
    });

    // Conversion rates
    const won = schools.filter((s) => s.pipelineStage === "won").length;
    const lost = schools.filter((s) => s.pipelineStage === "lost").length;
    const conversionRate = total > 0 ? Math.round((won / total) * 100) : 0;
    const winRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;

    // Call success rates
    const callStatuses = ["completed", "no_answer", "callback", "not_interested", "wrong_number", "pending"];
    const callData = callStatuses.map((status) => ({
      name: status.replace(/_/g, " "),
      count: schools.filter((s) => s.callStatus === status).length,
    })).filter((d) => d.count > 0);

    const totalCalls = schools.filter((s) => s.callStatus && s.callStatus !== "pending").length;
    const successfulCalls = schools.filter((s) => s.callStatus === "completed").length;
    const callSuccessRate = totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0;

    // Pipeline velocity (avg days per stage based on created/updated dates)
    const qualifiedLeads = schools.filter((s) => ["qualified", "proposal", "won"].includes(s.pipelineStage || ""));
    const avgDaysToQualify = qualifiedLeads.length > 0
      ? Math.round(qualifiedLeads.reduce((sum, s) => {
          const days = Math.max(1, Math.round((s.updatedAt.getTime() - s.createdAt.getTime()) / (1000 * 60 * 60 * 24)));
          return sum + days;
        }, 0) / qualifiedLeads.length)
      : 0;

    // Weekly trend (group by week of creation)
    const weekMap = new Map<string, { new: number; won: number; lost: number; contacted: number }>();
    schools.forEach((s) => {
      const week = getWeekLabel(s.createdAt);
      const entry = weekMap.get(week) || { new: 0, won: 0, lost: 0, contacted: 0 };
      entry.new++;
      if (s.pipelineStage === "won") entry.won++;
      if (s.pipelineStage === "lost") entry.lost++;
      if (["contacted", "qualified", "proposal", "won"].includes(s.pipelineStage || "")) entry.contacted++;
      weekMap.set(week, entry);
    });
    const weeklyTrend = Array.from(weekMap.entries())
      .map(([week, data]) => ({ week, ...data }))
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-8);

    // Website vs No Website
    const websiteBreakdown = [
      { name: "Has Website", value: schools.filter((s) => s.status === "found").length, color: "hsl(var(--chart-2))" },
      { name: "No Website", value: schools.filter((s) => s.websiteType === "no_website").length, color: "hsl(var(--destructive))" },
      { name: "Social Only", value: schools.filter((s) => s.websiteType === "social_only").length, color: "hsl(var(--chart-4))" },
      { name: "Dead Domain", value: schools.filter((s) => s.websiteType === "dead").length, color: "hsl(var(--muted-foreground))" },
    ].filter((d) => d.value > 0);

    // Assignment distribution
    const assigned = schools.filter((s) => s.assignedTo).length;
    const unassigned = total - assigned;

    return {
      total, won, lost, conversionRate, winRate, callSuccessRate, totalCalls, successfulCalls,
      avgDaysToQualify, pipelineCounts, funnel, callData, weeklyTrend, websiteBreakdown,
      assigned, unassigned,
    };
  }, [schools]);

  if (!analytics || analytics.total === 0) {
    return (
      <Card className="border-2">
        <CardContent className="py-16 text-center text-muted-foreground font-mono text-sm">
          Import leads to see analytics
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <KPICard icon={Target} label="Conversion Rate" value={`${analytics.conversionRate}%`} sub={`${analytics.won} won / ${analytics.total} total`} />
        <KPICard icon={Trophy} label="Win Rate" value={`${analytics.winRate}%`} sub={`${analytics.won}W / ${analytics.lost}L`} />
        <KPICard icon={Phone} label="Call Success" value={`${analytics.callSuccessRate}%`} sub={`${analytics.successfulCalls} / ${analytics.totalCalls} calls`} />
        <KPICard icon={Clock} label="Avg Days to Qualify" value={`${analytics.avgDaysToQualify}d`} sub="pipeline velocity" />
        <KPICard icon={Activity} label="Active Pipeline" value={String(analytics.total - analytics.won - analytics.lost)} sub="in progress" />
        <KPICard icon={TrendingUp} label="Total Leads" value={String(analytics.total)} sub={`${analytics.assigned} assigned`} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Pipeline Distribution */}
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase">Pipeline Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics.pipelineCounts}>
                <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--chart-2))" stroke="hsl(var(--border))" strokeWidth={2} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase">Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.funnel.map((stage, i) => (
                <div key={stage.name} className="flex items-center gap-2">
                  <span className="text-[10px] font-mono w-20 text-muted-foreground">{stage.name}</span>
                  <div className="flex-1 bg-secondary h-6 relative overflow-hidden border">
                    <div
                      className="h-full bg-primary/80 transition-all"
                      style={{ width: `${stage.rate}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold">
                      {stage.count} ({stage.rate}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Call Status Breakdown */}
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase">Call Results</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={analytics.callData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={70}
                  dataKey="count"
                  stroke="hsl(var(--border))"
                  strokeWidth={2}
                >
                  {analytics.callData.map((_, i) => (
                    <Cell key={i} fill={`hsl(var(--chart-${(i % 5) + 1}))`} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-1.5 mt-1 justify-center">
              {analytics.callData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1 text-[9px] font-mono">
                  <div className="w-2 h-2 border" style={{ backgroundColor: `hsl(var(--chart-${(i % 5) + 1}))` }} />
                  {d.name} ({d.count})
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Weekly Trend */}
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase">Weekly Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={analytics.weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 9 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Area type="monotone" dataKey="new" stackId="1" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.3} name="New" />
                <Area type="monotone" dataKey="contacted" stackId="2" stroke="hsl(var(--chart-4))" fill="hsl(var(--chart-4))" fillOpacity={0.3} name="Contacted" />
                <Area type="monotone" dataKey="won" stackId="3" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.3} name="Won" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Website Breakdown */}
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase">Website Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.websiteBreakdown} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
                <Tooltip />
                <Bar dataKey="value" stroke="hsl(var(--border))" strokeWidth={2}>
                  {analytics.websiteBreakdown.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub: string }) {
  return (
    <Card className="border-2 shadow-xs">
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[9px] font-mono uppercase tracking-wide text-muted-foreground">{label}</span>
        </div>
        <p className="text-xl font-bold font-mono">{value}</p>
        <p className="text-[9px] font-mono text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

function getWeekLabel(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
