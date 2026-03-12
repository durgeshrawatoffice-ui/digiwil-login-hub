import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Building2, Mail, Save, Loader2, RotateCw, Shield } from "lucide-react";
import { resetTour } from "./FeatureTour";
import { ThemeToggle } from "./ThemeToggle";

interface UserProfile {
  id: string;
  fullName: string;
  companyName: string;
  email: string;
  avatarUrl: string;
}

export function ProfileSettings() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Try to get the profile
      let { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userData.user.id)
        .maybeSingle();

      // If no profile exists, create one
      if (!data && !error) {
        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .insert({ id: userData.user.id })
          .select()
          .single();
        
        if (insertError) {
          console.error("Failed to create profile:", insertError);
        } else {
          data = newProfile;
        }
      }

      if (error) {
        console.error("Profile load error:", error);
        // Don't throw, just use defaults
      }

      const p: UserProfile = {
        id: userData.user.id,
        fullName: data?.full_name || "",
        companyName: data?.company_name || "",
        email: userData.user.email || "",
        avatarUrl: data?.avatar_url || "",
      };
      setProfile(p);
      setFullName(p.fullName);
      setCompanyName(p.companyName);
    } catch (err: any) {
      console.error("Profile error:", err);
      // Set basic profile from auth user
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        setProfile({
          id: userData.user.id,
          fullName: "",
          companyName: "",
          email: userData.user.email || "",
          avatarUrl: "",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: profile.id,
        full_name: fullName || null,
        company_name: companyName || null,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      toast.success("Profile updated");
    } catch (err: any) {
      toast.error("Update failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };


  const handleResetOnboarding = () => {
    localStorage.removeItem("leadradar_onboarded");
    resetTour();
    toast.success("Onboarding reset. Refresh to see the wizard.");
  };

  const handleChangePassword = async () => {
    if (!profile?.email) return;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset email sent");
    } catch (err: any) {
      toast.error("Failed: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Card */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-mono text-sm uppercase">
            <User className="h-4 w-4" /> Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 border-2 flex items-center justify-center text-xl font-bold text-primary">
              {fullName ? fullName[0].toUpperCase() : profile?.email?.[0]?.toUpperCase() || "?"}
            </div>
            <div>
              <p className="font-semibold">{fullName || "No name set"}</p>
              <p className="text-sm text-muted-foreground font-mono">{profile?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase">Full Name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                className="border-2 font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase">Email</Label>
              <Input value={profile?.email || ""} disabled className="border-2 font-mono bg-secondary/30" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-mono text-xs uppercase flex items-center gap-1">
              <Building2 className="h-3 w-3" /> Company Name
            </Label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Your company"
              className="border-2 font-mono"
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="font-mono text-xs uppercase">
            {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-mono text-sm uppercase">
            <Shield className="h-4 w-4" /> Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Change Password</p>
              <p className="text-xs text-muted-foreground">Receive a password reset email</p>
            </div>
            <Button variant="outline" size="sm" className="font-mono text-xs" onClick={handleChangePassword}>
              <Mail className="h-3 w-3 mr-1" /> Send Reset Email
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="font-mono text-sm uppercase">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-xs text-muted-foreground">Toggle dark/light mode</p>
            </div>
            <ThemeToggle />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Reset Onboarding</p>
              <p className="text-xs text-muted-foreground">Show setup wizard and feature tour again</p>
            </div>
            <Button variant="outline" size="sm" className="font-mono text-xs" onClick={handleResetOnboarding}>
              <RotateCw className="h-3 w-3 mr-1" /> Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
