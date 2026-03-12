import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ActivityLog {
  id: string;
  schoolId: string;
  userId: string;
  action: string;
  details?: string;
  oldValue?: string;
  newValue?: string;
  createdAt: Date;
}

export function useActivityLogs(schoolId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['activity_logs', schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await (supabase as any)
        .from('activity_logs')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        schoolId: row.school_id,
        userId: row.user_id,
        action: row.action,
        details: row.details || undefined,
        oldValue: row.old_value || undefined,
        newValue: row.new_value || undefined,
        createdAt: new Date(row.created_at),
      })) as ActivityLog[];
    }
  });

  const logActivityMutation = useMutation({
    mutationFn: async (params: { schoolId: string; action: string; details?: string; oldValue?: string; newValue?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { error } = await (supabase as any).from('activity_logs').insert({
        school_id: params.schoolId,
        user_id: userData.user.id,
        action: params.action,
        details: params.details || null,
        old_value: params.oldValue || null,
        new_value: params.newValue || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity_logs'] });
    }
  });

  const logActivity = (params: { schoolId: string; action: string; details?: string; oldValue?: string; newValue?: string }) => {
    logActivityMutation.mutate(params);
  };

  return { logs, isLoading, logActivity };
}
