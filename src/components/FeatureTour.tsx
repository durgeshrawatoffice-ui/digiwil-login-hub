import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, ArrowRight, ArrowLeft } from "lucide-react";

interface TourStep {
  title: string;
  description: string;
  targetTab: string;
  emoji: string;
}

const TOUR_STEPS: TourStep[] = [
  { title: "Dashboard", description: "See your lead stats, run website detection, and validate domains all from one place.", targetTab: "dashboard", emoji: "📊" },
  { title: "Map Scraper", description: "Search Google Maps to find schools and businesses. Import them as leads instantly.", targetTab: "scraper", emoji: "🗺️" },
  { title: "Leads Table", description: "View, search, filter, and inline-edit all your leads. Sort by Lead Score to prioritize.", targetTab: "leads", emoji: "📋" },
  { title: "Pipeline Board", description: "Drag-and-drop leads through your sales pipeline stages from New to Won.", targetTab: "pipeline", emoji: "🎯" },
  { title: "Reports", description: "Weekly/monthly reports with charts, PDF export, and advanced CSV exports.", targetTab: "reports", emoji: "📈" },
  { title: "Calls", description: "Manage your call queue. One-click calling, WhatsApp, and status tracking.", targetTab: "calls", emoji: "📞" },
];

const TOUR_KEY = "leadradar_tour_done";

interface FeatureTourProps {
  onTabChange: (tab: string) => void;
}

export function FeatureTour({ onTabChange }: FeatureTourProps) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(TOUR_KEY);
    if (!done) {
      // Show tour after a brief delay
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!visible) return null;

  const current = TOUR_STEPS[step];

  const handleNext = () => {
    if (step < TOUR_STEPS.length - 1) {
      const next = TOUR_STEPS[step + 1];
      onTabChange(next.targetTab);
      setStep(s => s + 1);
    } else {
      dismiss();
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      const prev = TOUR_STEPS[step - 1];
      onTabChange(prev.targetTab);
      setStep(s => s - 1);
    }
  };

  const dismiss = () => {
    localStorage.setItem(TOUR_KEY, "true");
    setVisible(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-xs animate-in slide-in-from-bottom-4">
      <Card className="border-2 border-primary/30 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{current.emoji}</span>
              <div>
                <p className="text-sm font-bold">{current.title}</p>
                <p className="text-[10px] font-mono text-muted-foreground">Step {step + 1}/{TOUR_STEPS.length}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-1" onClick={dismiss}>
              <X className="h-3 w-3" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mb-3">{current.description}</p>

          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" className="text-[10px] font-mono h-7" onClick={dismiss}>
              Skip Tour
            </Button>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="text-[10px] font-mono h-7" onClick={handlePrev} disabled={step === 0}>
                <ArrowLeft className="h-3 w-3" />
              </Button>
              <Button size="sm" className="text-[10px] font-mono h-7" onClick={handleNext}>
                {step < TOUR_STEPS.length - 1 ? (
                  <>Next <ArrowRight className="h-3 w-3 ml-0.5" /></>
                ) : "Finish"}
              </Button>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-1 mt-2">
            {TOUR_STEPS.map((_, i) => (
              <div key={i} className={`h-1.5 w-1.5 rounded-full transition-colors ${i === step ? "bg-primary" : i < step ? "bg-primary/40" : "bg-border"}`} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function resetTour() {
  localStorage.removeItem(TOUR_KEY);
}
