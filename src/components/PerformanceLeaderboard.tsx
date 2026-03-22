import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { School } from "@/types/school";
import { Trophy, Medal, Award, Phone, CheckCircle, TrendingUp } from "lucide-react";

interface TeamMemberPerformance {
  id: string;
  member_email: string;
  member_name: string | null;
  role: string;
  totalAssigned: number;
  completed: number;
  noAnswer: number;
  callback: number;
  notInterested: number;
  totalCalls: number;
  completionRate: number;
  score: number;
}

interface PerformanceLeaderboardProps {
  schools: School[];
}

export function PerformanceLeaderboard({ schools }: PerformanceLeaderboardProps) {
  const [performers, setPerformers] = useState<TeamMemberPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPerformance();
  }, [schools]);

  const loadPerformance = async () => {
    const { data: members } = await (supabase as any)
      .from('team_members')
      .select('*')
      .order('invited_at', { ascending: true });

    if (!members) {
      setLoading(false);
      return;
    }

    const { data: callLogs } = await (supabase as any)
      .from('call_logs')
      .select('*');

    const performanceData: TeamMemberPerformance[] = members.map((m: any) => {
      const assigned = schools.filter(s => s.assignedTo === m.member_email);
      const memberCalls = (callLogs || []).filter((l: any) => 
        l.caller_name === m.member_name || l.caller_name === m.member_email
      );
      
      const completed = assigned.filter(s => s.callStatus === 'completed').length;
      const noAnswer = assigned.filter(s => s.callStatus === 'no_answer').length;
      const callback = assigned.filter(s => s.callStatus === 'callback').length;
      const notInterested = assigned.filter(s => s.callStatus === 'not_interested').length;
      
      const totalProcessed = completed + noAnswer + callback + notInterested;
      const completionRate = assigned.length > 0 ? Math.round((totalProcessed / assigned.length) * 100) : 0;
      
      // Score: completed = 10pts, callback = 5pts, no_answer = 2pts, not_interested = 3pts
      const score = (completed * 10) + (callback * 5) + (notInterested * 3) + (noAnswer * 2);

      return {
        id: m.id,
        member_email: m.member_email,
        member_name: m.member_name,
        role: m.role,
        totalAssigned: assigned.length,
        completed,
        noAnswer,
        callback,
        notInterested,
        totalCalls: memberCalls.length,
        completionRate,
        score,
      };
    });

    // Sort by score descending
    performanceData.sort((a, b) => b.score - a.score);
    setPerformers(performanceData);
    setLoading(false);
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Award className="h-5 w-5 text-amber-600" />;
    return <span className="font-mono text-sm font-bold text-muted-foreground">#{index + 1}</span>;
  };

  const getRankBorder = (index: number) => {
    if (index === 0) return "border-yellow-500/50 bg-yellow-500/5";
    if (index === 1) return "border-gray-400/50 bg-gray-400/5";
    if (index === 2) return "border-amber-600/50 bg-amber-600/5";
    return "";
  };

  if (loading) {
    return (
      <Card className="border-2">
        <CardContent className="py-8 text-center">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-mono uppercase flex items-center gap-2">
          <Trophy className="h-4 w-4 text-yellow-500" /> Performance Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        {performers.length === 0 ? (
          <p className="text-center text-muted-foreground font-mono text-sm py-6">
            No team members to rank yet.
          </p>
        ) : (
          <div className="space-y-3">
            {performers.map((p, idx) => (
              <div
                key={p.id}
                className={`flex items-center gap-4 p-3 border-2 rounded-lg transition-colors ${getRankBorder(idx)}`}
              >
                <div className="flex items-center justify-center w-8">
                  {getRankIcon(idx)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate">{p.member_name || p.member_email}</p>
                    <Badge variant="outline" className="text-[8px] font-mono shrink-0">
                      {p.role.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {p.totalAssigned} assigned
                    </span>
                    <span className="text-[10px] font-mono text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> {p.completed} done
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> {p.totalCalls} calls
                    </span>
                  </div>
                  <div className="mt-2">
                    <Progress value={p.completionRate} className="h-1.5" />
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xl font-bold font-mono">{p.score}</p>
                  <p className="text-[9px] font-mono text-muted-foreground uppercase">Points</p>
                  <p className="text-[10px] font-mono text-muted-foreground">{p.completionRate}%</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
