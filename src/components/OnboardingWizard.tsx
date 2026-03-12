import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Building2, User, ArrowRight, ArrowLeft, Check, Rocket } from "lucide-react";

interface OnboardingWizardProps {
  onComplete: () => void;
}

const STEPS = [
  { title: "Welcome", icon: Sparkles },
  { title: "Your Profile", icon: User },
  { title: "Company", icon: Building2 },
  { title: "Ready!", icon: Rocket },
];

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [saving, setSaving] = useState(false);

  const progress = ((step + 1) / STEPS.length) * 100;

  const handleFinish = async () => {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not logged in");

      const { error } = await (supabase as any).from("profiles").update({
        full_name: fullName || null,
        company_name: companyName || null,
        updated_at: new Date().toISOString(),
      }).eq("id", userData.user.id);

      if (error) throw error;

      localStorage.setItem("leadradar_onboarded", "true");
      toast.success("Welcome to LeadRadar! 🚀");
      onComplete();
    } catch (err: any) {
      toast.error("Setup failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-2 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="flex items-center">
                  <div className={`flex items-center justify-center h-10 w-10 rounded-full border-2 transition-colors ${
                    i <= step ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-muted-foreground border-border"
                  }`}>
                    {i < step ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`w-8 h-0.5 ${i < step ? "bg-primary" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>
          <Progress value={progress} className="h-1 mb-2" />
          <CardTitle className="font-mono text-lg">{STEPS[step].title}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6 pt-4">
          {step === 0 && (
            <div className="text-center space-y-4">
              <Sparkles className="h-16 w-16 mx-auto text-primary" />
              <h2 className="text-2xl font-bold">Welcome to LeadRadar</h2>
              <p className="text-muted-foreground text-sm">
                Your AI-powered lead intelligence platform. Let's set up your workspace in under a minute.
              </p>
              <div className="grid grid-cols-2 gap-3 text-left pt-4">
                {[
                  { emoji: "🔍", text: "Scrape leads from Google Maps" },
                  { emoji: "🌐", text: "Auto-detect school websites" },
                  { emoji: "📊", text: "Score & qualify leads with AI" },
                  { emoji: "📞", text: "Manage calls & outreach" },
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 border rounded bg-secondary/30">
                    <span className="text-lg">{f.emoji}</span>
                    <span className="text-xs font-mono">{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <User className="h-12 w-12 mx-auto text-primary mb-2" />
                <p className="text-sm text-muted-foreground">Tell us about yourself</p>
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase">Full Name</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="border-2 font-mono"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <Building2 className="h-12 w-12 mx-auto text-primary mb-2" />
                <p className="text-sm text-muted-foreground">Your company details</p>
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase">Company Name</Label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme EdTech"
                  className="border-2 font-mono"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center space-y-4">
              <Rocket className="h-16 w-16 mx-auto text-primary" />
              <h2 className="text-xl font-bold">You're all set!</h2>
              <p className="text-muted-foreground text-sm">
                {fullName ? `Welcome, ${fullName}!` : "Welcome!"} Your workspace is ready.
                Start by importing leads or scraping from Google Maps.
              </p>
              <div className="text-left space-y-2 p-4 border-2 rounded bg-secondary/20">
                <p className="text-xs font-mono font-bold uppercase text-muted-foreground">Quick Start:</p>
                <ol className="text-sm space-y-1 list-decimal list-inside">
                  <li>Go to <strong>Map Scraper</strong> to find leads</li>
                  <li>Or <strong>Import</strong> a CSV file</li>
                  <li>Run <strong>Website Detection</strong> on Dashboard</li>
                  <li>Check <strong>Lead Scores</strong> and start outreach</li>
                </ol>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              className="font-mono text-xs"
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
            >
              <ArrowLeft className="h-3 w-3 mr-1" /> Back
            </Button>

            {step < STEPS.length - 1 ? (
              <Button
                size="sm"
                className="font-mono text-xs"
                onClick={() => setStep(s => s + 1)}
              >
                Next <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            ) : (
              <Button
                size="sm"
                className="font-mono text-xs"
                onClick={handleFinish}
                disabled={saving}
              >
                {saving ? "Setting up..." : "Launch LeadRadar"} <Rocket className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
