import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "team_member" | null;

export function useUserRole() {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);

      const { data, error } = await supabase.rpc('get_user_role', { _user_id: user.id });
      if (!error && data) {
        setRole(data as UserRole);
      } else {
        // Fallback: check if user is in team_members
        const { data: tmData } = await (supabase as any)
          .from('team_members')
          .select('id')
          .eq('member_email', user.email)
          .limit(1);
        
        if (tmData && tmData.length > 0) {
          setRole('team_member');
        } else {
          setRole('admin');
        }
      }
      setLoading(false);
    };

    fetchRole();
  }, []);

  return { role, loading, userId };
}
