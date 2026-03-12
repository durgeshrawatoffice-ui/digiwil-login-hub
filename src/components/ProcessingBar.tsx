import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Play, Loader2 } from "lucide-react";

interface ProcessingBarProps {
  processing: boolean;
  progress: number;
  pendingCount: number;
  onProcess: () => void;
}

export function ProcessingBar({ processing, progress, pendingCount, onProcess }: ProcessingBarProps) {
  return (
    <div className="w-full flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-4 border-2 bg-secondary/50">
      <Button
        onClick={onProcess}
        disabled={processing || pendingCount === 0}
        className="font-mono text-xs uppercase"
      >
        {processing ? (
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        ) : (
          <Play className="h-3 w-3 mr-1" />
        )}
        {processing ? "Processing..." : `Detect Websites (${pendingCount})`}
      </Button>
      {processing && (
        <div className="flex-1 flex items-center gap-3">
          <Progress value={progress} className="flex-1 h-3" />
          <span className="font-mono text-sm">{Math.round(progress)}%</span>
        </div>
      )}
    </div>
  );
}
