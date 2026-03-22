import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const AuthPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const redirectByRole = async (userId: string) => {
    const { data } = await supabase.rpc('get_user_role', { _user_id: userId });
    if (data === 'team_member') {
      navigate("/team", { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        await redirectByRole(session.user.id);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        await redirectByRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 bg-card p-6 md:p-8 border-2 shadow-sm rounded-xl">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">LeadRadar</h1>
          <p className="text-sm text-muted-foreground font-mono">
            AI-Powered Lead Intelligence Platform
          </p>
        </div>

        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: "hsl(var(--primary))",
                  brandAccent: "hsl(var(--primary) / 0.9)",
                },
              },
            },
            className: {
              button: "font-mono uppercase text-xs border-2 shadow-none rounded-none",
              input: "font-mono text-sm border-2 rounded-none",
              label: "font-mono uppercase text-[10px]",
            },
          }}
          theme="light"
          providers={[]}
          redirectTo={window.location.origin}
        />
      </div>
    </div>
  );
};

export default AuthPage;
