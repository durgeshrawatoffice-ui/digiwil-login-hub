import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Lock, CheckCircle2, XCircle } from "lucide-react";

const PASSWORD_MIN = 8;

function getPasswordStrength(pw: string): { label: string; color: string; percent: number } {
  let score = 0;
  if (pw.length >= PASSWORD_MIN) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { label: "Weak", color: "bg-destructive", percent: 20 };
  if (score <= 2) return { label: "Fair", color: "bg-chart-4", percent: 40 };
  if (score <= 3) return { label: "Good", color: "bg-chart-2", percent: 70 };
  return { label: "Strong", color: "bg-chart-1", percent: 100 };
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setReady(true);
    } else {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          setReady(true);
        } else {
          toast.error("Invalid or expired reset link");
          navigate("/auth", { replace: true });
        }
      });
    }
  }, [navigate]);

  const strength = getPasswordStrength(password);
  const passwordsMatch = password === confirm && confirm.length > 0;
  const canSubmit = password.length >= PASSWORD_MIN && passwordsMatch && !loading;

  const handleReset = async () => {
    if (password.length < PASSWORD_MIN) {
      toast.error(`Password must be at least ${PASSWORD_MIN} characters`);
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated successfully!");
      navigate("/", { replace: true });
    } catch (err: any) {
      toast.error("Failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-2">
        <CardHeader className="text-center">
          <Lock className="h-8 w-8 mx-auto text-primary mb-2" />
          <CardTitle className="font-mono">Reset Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="font-mono text-xs uppercase">New Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="border-2 font-mono"
              minLength={PASSWORD_MIN}
            />
            {password.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full ${strength.color} transition-all`} style={{ width: `${strength.percent}%` }} />
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">{strength.label}</span>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono">
                  Min {PASSWORD_MIN} chars. Mix uppercase, numbers & symbols for best strength.
                </p>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label className="font-mono text-xs uppercase">Confirm Password</Label>
            <div className="relative">
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="border-2 font-mono pr-8"
              />
              {confirm.length > 0 && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  {passwordsMatch ? (
                    <CheckCircle2 className="h-4 w-4 text-chart-2" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                </div>
              )}
            </div>
          </div>
          <Button onClick={handleReset} disabled={!canSubmit} className="w-full font-mono text-xs uppercase">
            {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
            Update Password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
