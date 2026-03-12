import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { School } from "@/types/school";

interface LeadChartProps {
  stats: {
    found: number;
    pending: number;
    errors: number;
    notFound: number;
    government: number;
    private: number;
    noWebsite: number;
    socialOnly: number;
    discovered: number;
  };
  schools: School[];
}

export function LeadChart({ stats, schools }: LeadChartProps) {
  const pieData = [
    { name: "Has Website", value: stats.found, color: "hsl(var(--chart-2))" },
    { name: "No Website", value: stats.noWebsite, color: "hsl(var(--chart-1))" },
    { name: "Social Only", value: stats.socialOnly, color: "hsl(var(--chart-4))" },
    { name: "Discovered", value: stats.discovered, color: "hsl(var(--chart-5))" },
    { name: "Pending", value: stats.pending, color: "hsl(var(--chart-3))" },
  ].filter((d) => d.value > 0);

  const typeData = [
    { name: "Govt", count: stats.government },
    { name: "Private", count: stats.private },
    { name: "Other", count: schools.filter(s => s.schoolType === "unknown").length },
  ].filter(d => d.count > 0);

  const qualityBuckets = [
    { range: "0-25", count: 0 },
    { range: "26-50", count: 0 },
    { range: "51-75", count: 0 },
    { range: "76-100", count: 0 },
  ];

  schools.forEach((s) => {
    const score = s.trustScore || s.qualityScore?.overall;
    if (score === undefined) return;
    if (score <= 25) qualityBuckets[0].count++;
    else if (score <= 50) qualityBuckets[1].count++;
    else if (score <= 75) qualityBuckets[2].count++;
    else qualityBuckets[3].count++;
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="border-2 shadow-xs">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-mono uppercase tracking-wide">Website Status</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" stroke="hsl(var(--border))" strokeWidth={2}>
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center gap-1 text-[10px]">
                <div className="w-2.5 h-2.5 border border-border" style={{ backgroundColor: d.color }} />
                <span className="font-mono">{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 shadow-xs">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-mono uppercase tracking-wide">School Types</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={typeData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--chart-2))" stroke="hsl(var(--border))" strokeWidth={2} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-2 shadow-xs">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-mono uppercase tracking-wide">Trust Score Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={qualityBuckets}>
              <XAxis dataKey="range" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--chart-5))" stroke="hsl(var(--border))" strokeWidth={2} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
