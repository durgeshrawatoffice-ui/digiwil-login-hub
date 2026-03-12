import { School } from "@/types/school";
import { calculateLeadScore, getScoreBgClass } from "@/lib/lead-scoring";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";

interface LeadScoreBadgeProps {
  school: School;
  showDetails?: boolean;
}

export function LeadScoreBadge({ school, showDetails = false }: LeadScoreBadgeProps) {
  const score = calculateLeadScore(school);

  if (showDetails) {
    return (
      <div className={`border rounded-md p-3 space-y-2 ${getScoreBgClass(score.grade)}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Lead Score</span>
          <span className={`text-xl font-bold font-mono ${score.color}`}>
            {score.grade} · {score.total}
          </span>
        </div>
        <Progress value={score.total} className="h-2" />
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-mono">
          <div className="flex justify-between"><span>Website</span><span>{score.breakdown.website}/25</span></div>
          <div className="flex justify-between"><span>Contact</span><span>{score.breakdown.contact}/25</span></div>
          <div className="flex justify-between"><span>Social</span><span>{score.breakdown.social}/20</span></div>
          <div className="flex justify-between"><span>Data Quality</span><span>{score.breakdown.dataQuality}/15</span></div>
          <div className="flex justify-between"><span>Verification</span><span>{score.breakdown.verification}/15</span></div>
        </div>
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={`font-mono text-[10px] py-0 h-4 px-1.5 cursor-default ${getScoreBgClass(score.grade)} ${score.color}`}
        >
          {score.grade} · {score.total}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs font-mono p-2 space-y-1">
        <div>Website: {score.breakdown.website}/25</div>
        <div>Contact: {score.breakdown.contact}/25</div>
        <div>Social: {score.breakdown.social}/20</div>
        <div>Data: {score.breakdown.dataQuality}/15</div>
        <div>Verified: {score.breakdown.verification}/15</div>
      </TooltipContent>
    </Tooltip>
  );
}
