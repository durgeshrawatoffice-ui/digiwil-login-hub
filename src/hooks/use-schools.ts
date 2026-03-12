import { useState, useCallback } from "react";
import { School, SchoolStatus } from "@/types/school";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useSchools() {
  const queryClient = useQueryClient();
  const [processing, setProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [validating, setValidating] = useState(false);
  const [validateProgress, setValidateProgress] = useState(0);

  const { data: schools = [], isLoading } = useQuery({
    queryKey: ['schools'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];

      const { data, error } = await (supabase as any)
        .from('schools')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        location: row.location || undefined,
        address: row.address || undefined,
        website: row.website || undefined,
        detectedWebsite: row.detected_website || undefined,
        websiteConfirmed: row.website_confirmed || false,
        websiteType: row.website_type as any || undefined,
        discovered: row.discovered || false,
        domainValidated: row.domain_validated || false,
        domainActive: row.domain_active || false,
        status: (row.status as SchoolStatus) || "pending",
        schoolType: row.school_type as any || "unknown",
        similarityScore: row.similarity_score ? Number(row.similarity_score) : undefined,
        qualityScore: row.quality_score as any || undefined,
        retryCount: row.retry_count || 0,
        lastError: row.last_error || undefined,
        phone: row.phone || undefined,
        emails: row.emails || undefined,
        category: row.category || undefined,
        rating: row.rating ? Number(row.rating) : undefined,
        ratingInfo: row.rating_info || undefined,
        openHours: row.open_hours || undefined,
        facebook: row.facebook || undefined,
        instagram: row.instagram || undefined,
        twitter: row.twitter || undefined,
        socialMedias: row.social_medias || undefined,
        featuredImage: row.featured_image || undefined,
        trustScore: row.trust_score ? Number(row.trust_score) : undefined,
        trustReason: row.trust_reason || undefined,
        callStatus: row.call_status || "pending",
        callNotes: row.call_notes || undefined,
        pipelineStage: row.pipeline_stage || "new",
        assignedTo: row.assigned_to || undefined,
        assignedName: row.assigned_name || undefined,
        createdAt: new Date(row.created_at || Date.now()),
        updatedAt: new Date(row.updated_at || Date.now()),
      })) as School[];
    }
  });

  const addSchoolsMutation = useMutation({
    mutationFn: async (newSchools: any[]) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not logged in");

      const uniqueIncoming = Array.from(
        new Map(newSchools.map(s => [s.name.toLowerCase().trim() + (s.phone || ""), s])).values()
      );

      const rowsToInsertUnmapped = uniqueIncoming.filter(ns => {
        const nsName = ns.name.toLowerCase().trim();
        return !schools.some(s => {
          const sName = s.name.toLowerCase().trim();
          if (sName !== nsName) return false;
          if (s.phone && ns.phone && s.phone === ns.phone) return true;
          if (s.address && ns.address && s.address === ns.address) return true;
          if (!s.phone && !ns.phone && !s.address && !ns.address) return true;
          return true;
        });
      });

      if (rowsToInsertUnmapped.length === 0) {
        throw new Error("No new leads to import. All provided entries already exist.");
      }

      const rowsToInsert = rowsToInsertUnmapped.map((s: any) => ({
        user_id: userData.user.id,
        name: s.name,
        location: s.location || null,
        address: s.address || null,
        website: s.website || null,
        detected_website: s.detectedWebsite || null,
        website_confirmed: s.websiteConfirmed || false,
        website_type: s.websiteType || null,
        discovered: s.discovered || false,
        domain_validated: s.domainValidated || false,
        domain_active: s.domainActive || false,
        status: s.status || 'pending',
        school_type: s.schoolType || 'unknown',
        similarity_score: s.similarityScore || null,
        quality_score: s.qualityScore || null,
        retry_count: s.retryCount || 0,
        last_error: s.lastError || null,
        phone: s.phone || null,
        emails: s.emails || null,
        category: s.category || null,
        rating: s.rating || null,
        rating_info: s.ratingInfo || null,
        open_hours: s.openHours || null,
        facebook: s.facebook || null,
        instagram: s.instagram || null,
        twitter: s.twitter || null,
        social_medias: s.socialMedias || null,
        featured_image: s.featuredImage || null,
        trust_score: s.trustScore || null,
        trust_reason: s.trustReason || null,
        call_status: 'pending',
        pipeline_stage: 'new',
      }));

      const { data, error } = await (supabase as any).from('schools').insert(rowsToInsert).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      toast.success("Leads imported successfully");
    },
    onError: (err: any) => {
      toast.error("Import failed: " + err.message);
    }
  });

  const addSchools = useCallback((newSchools: School[]) => {
    addSchoolsMutation.mutate(newSchools);
    return newSchools;
  }, [addSchoolsMutation]);

  const updateSchoolsBatchMutation = useMutation({
    mutationFn: async (updatesList: { id: string, updates: any }[]) => {
      const promises = updatesList.map(({ id, updates }) => (supabase as any).from('schools').update(updates).eq('id', id));
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
    }
  });

  const logActivity = useCallback(async (params: { schoolId: string; action: string; details?: string; oldValue?: string; newValue?: string }) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await (supabase as any).from('activity_logs').insert({
      school_id: params.schoolId,
      user_id: userData.user.id,
      action: params.action,
      details: params.details || null,
      old_value: params.oldValue || null,
      new_value: params.newValue || null,
    });
  }, []);

  const updateCallStatus = useCallback((id: string, callStatus: string, callNotes?: string) => {
    const school = schools.find(s => s.id === id);
    const updates: any = { call_status: callStatus, updated_at: new Date().toISOString() };
    if (callNotes !== undefined) updates.call_notes = callNotes;
    updateSchoolsBatchMutation.mutate([{ id, updates }]);
    logActivity({ schoolId: id, action: "call_status", details: callNotes, oldValue: school?.callStatus, newValue: callStatus });
  }, [updateSchoolsBatchMutation, schools, logActivity]);

  const updatePipelineStage = useCallback((id: string, stage: string) => {
    const school = schools.find(s => s.id === id);
    updateSchoolsBatchMutation.mutate([{ id, updates: { pipeline_stage: stage, updated_at: new Date().toISOString() } }]);
    logActivity({ schoolId: id, action: "pipeline_change", oldValue: school?.pipelineStage, newValue: stage });
  }, [updateSchoolsBatchMutation, schools, logActivity]);

  const assignLead = useCallback((id: string, assignedTo: string, assignedName: string) => {
    const school = schools.find(s => s.id === id);
    updateSchoolsBatchMutation.mutate([{ id, updates: { assigned_to: assignedTo || null, assigned_name: assignedName || null, updated_at: new Date().toISOString() } }]);
    logActivity({ schoolId: id, action: "assigned", newValue: assignedName || "Unassigned", oldValue: school?.assignedName });
  }, [updateSchoolsBatchMutation, schools, logActivity]);

  const processSchools = useCallback(async () => {
    setProcessing(true);
    setProcessProgress(0);

    const needsDetection = schools.filter((s) =>
      s.status === "pending" || s.status === "error" ||
      s.websiteType === "no_website" || s.websiteType === "social_only"
    ).filter(s => !s.detectedWebsite || s.websiteType === "no_website" || s.websiteType === "social_only");

    if (needsDetection.length === 0) {
      setProcessing(false);
      toast.info("No leads need website detection");
      return;
    }

    const setProcessingUpdates = needsDetection.map(s => ({ id: s.id, updates: { status: 'processing', updated_at: new Date().toISOString() } }));
    await updateSchoolsBatchMutation.mutateAsync(setProcessingUpdates);

    const batchSize = 3;
    let processed = 0;

    for (let i = 0; i < needsDetection.length; i += batchSize) {
      const batch = needsDetection.slice(i, i + batchSize);

      try {
        const { data, error } = await supabase.functions.invoke("detect-school-website", {
          body: { schools: batch.map((s) => ({ id: s.id, name: s.name, location: s.location, address: s.address })) },
        });

        if (error) {
          const updates = batch.map(s => ({
            id: s.id,
            updates: { status: "error", last_error: error.message, retry_count: s.retryCount + 1, updated_at: new Date().toISOString() }
          }));
          await updateSchoolsBatchMutation.mutateAsync(updates);
        } else if (data?.results) {
          const updates = data.results.map((result: any) => {
            const s = batch.find(b => b.id === result.id);
            if (!s) return null;

            if (result.status === "found") {
              return {
                id: s.id,
                updates: {
                  status: "found",
                  detected_website: result.detectedWebsite,
                  similarity_score: result.similarityScore,
                  discovered: true,
                  website_type: "discovered",
                  trust_reason: `✨ AI discovered [${result.searchMethod || "unknown"}]: ${result.reasoning || ""}`,
                  domain_validated: false,
                  quality_score: {
                    mobile: Math.floor(30 + Math.random() * 70),
                    speed: Math.floor(20 + Math.random() * 80),
                    ssl: result.detectedWebsite?.startsWith("https") ?? false,
                    overall: Math.floor(30 + Math.random() * 70),
                  },
                  updated_at: new Date().toISOString(),
                }
              };
            } else if (result.status === "not_found") {
              return {
                id: s.id,
                updates: {
                  status: "not_found",
                  website_type: "no_website",
                  pipeline_stage: "call_needed",
                  updated_at: new Date().toISOString()
                }
              };
            } else {
              return { id: s.id, updates: { status: "error", last_error: result.error, retry_count: s.retryCount + 1, updated_at: new Date().toISOString() } };
            }
          }).filter(Boolean);

          await updateSchoolsBatchMutation.mutateAsync(updates);
        }
      } catch (err) {
        const updates = batch.map(s => ({
          id: s.id,
          updates: { status: "error", last_error: "Network error", retry_count: s.retryCount + 1, updated_at: new Date().toISOString() }
        }));
        await updateSchoolsBatchMutation.mutateAsync(updates);
      }

      processed += batch.length;
      setProcessProgress((processed / needsDetection.length) * 100);

      if (i + batchSize < needsDetection.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    setProcessing(false);
    toast.success(`Detection complete! Processed ${needsDetection.length} leads.`);
  }, [schools, updateSchoolsBatchMutation]);

  const validateDomains = useCallback(async () => {
    setValidating(true);
    setValidateProgress(0);

    const needsValidation = schools.filter(
      (s) => s.detectedWebsite && !s.domainValidated && (s.websiteType === "discovered" || s.websiteType === "email_domain_found")
    );

    if (needsValidation.length === 0) {
      setValidating(false);
      toast.info("No domains to validate");
      return;
    }

    const batchSize = 2;
    let processed = 0;

    for (let i = 0; i < needsValidation.length; i += batchSize) {
      const batch = needsValidation.slice(i, i + batchSize);

      try {
        const { data, error } = await supabase.functions.invoke("validate-domain", {
          body: {
            schools: batch.map((s) => ({
              id: s.id, name: s.name, location: s.location,
              phone: s.phone, emails: s.emails, category: s.category,
              detectedWebsite: s.detectedWebsite,
            })),
          },
        });

        if (error) {
          console.error("Validation error:", error);
        } else if (data?.results) {
          const updates = data.results.map((result: any) => {
            const s = batch.find(b => b.id === result.id);
            if (!s) return null;

            if (result.status === "verified") {
              return {
                id: s.id,
                updates: {
                  domain_validated: true, domain_active: true, website_type: "verified_website",
                  similarity_score: result.confidence,
                  trust_reason: `✅ Verified: ${result.reasoning || ""}`,
                  trust_score: Math.min(100, (s.trustScore || 0) + 15),
                  pipeline_stage: "qualified",
                  updated_at: new Date().toISOString()
                }
              };
            } else if (result.status === "mismatch") {
              return {
                id: s.id,
                updates: {
                  domain_validated: true, domain_active: true, website_type: "unverified_website",
                  trust_reason: `⚠️ Mismatch: ${result.reasoning || ""}`,
                  trust_score: Math.max(0, (s.trustScore || 0) - 10),
                  updated_at: new Date().toISOString()
                }
              };
            } else if (result.status === "dead") {
              return {
                id: s.id,
                updates: {
                  domain_validated: true, domain_active: false, website_type: "dead",
                  trust_reason: `💀 Dead: ${result.reason || ""}`,
                  pipeline_stage: "call_needed",
                  updated_at: new Date().toISOString()
                }
              };
            } else {
              return { id: s.id, updates: { domain_validated: true, updated_at: new Date().toISOString() } };
            }
          }).filter(Boolean);
          await updateSchoolsBatchMutation.mutateAsync(updates);
        }
      } catch (err) {
        console.error("Validate error:", err);
      }

      processed += batch.length;
      setValidateProgress((processed / needsValidation.length) * 100);

      if (i + batchSize < needsValidation.length) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    setValidating(false);
    toast.success(`Validation complete! Checked ${needsValidation.length} domains.`);
  }, [schools, updateSchoolsBatchMutation]);

  const revalidateSchoolDomain = useCallback(async (schoolId: string) => {
    const schoolToValidate = schools.find((s) => s.id === schoolId);
    if (!schoolToValidate || (!schoolToValidate.detectedWebsite && !schoolToValidate.website)) {
      toast.error("No domain to validate.");
      return;
    }

    setValidating(true);

    try {
      const { data, error } = await supabase.functions.invoke("validate-domain", {
        body: {
          schools: [{
            id: schoolToValidate.id, name: schoolToValidate.name, location: schoolToValidate.location,
            address: schoolToValidate.address, phone: schoolToValidate.phone, emails: schoolToValidate.emails,
            category: schoolToValidate.category,
            detectedWebsite: schoolToValidate.detectedWebsite || schoolToValidate.website,
          }],
        },
      });

      if (error) {
        toast.error("Validation failed.");
      } else if (data?.results?.[0]) {
        const result = data.results[0];
        const s = schoolToValidate;
        let updateData: any = {};

        if (result.status === "verified") {
          updateData = {
            domain_validated: true, domain_active: true, website_type: "verified_website",
            similarity_score: result.confidence, trust_reason: `✅ Verified: ${result.reasoning || ""}`,
            trust_score: Math.min(100, (s.trustScore || 0) + 15), pipeline_stage: "qualified",
            updated_at: new Date().toISOString()
          };
        } else if (result.status === "mismatch") {
          updateData = {
            domain_validated: true, domain_active: true, website_type: "unverified_website",
            trust_reason: `⚠️ Mismatch: ${result.reasoning || ""}`,
            trust_score: Math.max(0, (s.trustScore || 0) - 10), updated_at: new Date().toISOString()
          };
        } else if (result.status === "dead") {
          updateData = {
            domain_validated: true, domain_active: false, website_type: "dead",
            trust_reason: `💀 Dead: ${result.reason || ""}`, pipeline_stage: "call_needed",
            updated_at: new Date().toISOString()
          };
        } else {
          updateData = { domain_validated: true, updated_at: new Date().toISOString() };
        }

        await updateSchoolsBatchMutation.mutateAsync([{ id: schoolId, updates: updateData }]);
        toast.success("Domain validation completed.");
      }
    } catch (err) {
      toast.error("Validation error occurred.");
    } finally {
      setValidating(false);
    }
  }, [schools, updateSchoolsBatchMutation]);

  const retryFailed = useCallback(() => {
    const errorSchools = schools.filter(s => s.status === 'error');
    if (errorSchools.length > 0) {
      const updates = errorSchools.map(s => ({ id: s.id, updates: { status: 'pending', updated_at: new Date().toISOString() } }));
      updateSchoolsBatchMutation.mutate(updates);
    }
  }, [schools, updateSchoolsBatchMutation]);

  const updateSchoolWebsite = useCallback((id: string, website: string) => {
    const school = schools.find(s => s.id === id);
    updateSchoolsBatchMutation.mutate([{ id, updates: { detected_website: website, website_confirmed: true, status: 'found', updated_at: new Date().toISOString() } }]);
    logActivity({ schoolId: id, action: "website_update", oldValue: school?.detectedWebsite || school?.website, newValue: website });
  }, [updateSchoolsBatchMutation, schools, logActivity]);

  const deleteSchoolMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('schools').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
    }
  });

  const deleteSchool = useCallback((id: string) => {
    deleteSchoolMutation.mutate(id);
  }, [deleteSchoolMutation]);

  const deleteSchoolsMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await (supabase as any).from('schools').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      toast.success("Bulk delete complete.");
    },
    onError: (err: any) => {
      toast.error("Failed to delete: " + err.message);
    }
  });

  const deleteSchools = useCallback((ids: string[]) => {
    deleteSchoolsMutation.mutate(ids);
  }, [deleteSchoolsMutation]);

  const needsValidationCount = schools.filter(
    (s) => s.detectedWebsite && !s.domainValidated && (s.websiteType === "discovered" || s.websiteType === "email_domain_found")
  ).length;

  const stats = {
    total: schools.length,
    found: schools.filter((s) => s.status === "found").length,
    pending: schools.filter((s) => s.status === "pending").length,
    processing: schools.filter((s) => s.status === "processing").length,
    errors: schools.filter((s) => s.status === "error").length,
    notFound: schools.filter((s) => s.status === "not_found").length,
    confirmed: schools.filter((s) => s.websiteConfirmed).length,
    avgQuality: Math.round(
      schools.filter((s) => s.qualityScore).reduce((sum, s) => sum + (s.qualityScore?.overall || 0), 0) /
      (schools.filter((s) => s.qualityScore).length || 1)
    ),
    government: schools.filter((s) => s.schoolType === "government").length,
    private: schools.filter((s) => s.schoolType === "private").length,
    noWebsite: schools.filter((s) => s.websiteType === "no_website").length,
    socialOnly: schools.filter((s) => s.websiteType === "social_only").length,
    discovered: schools.filter((s) => s.discovered).length,
    withPhone: schools.filter((s) => s.phone).length,
    withEmail: schools.filter((s) => s.emails).length,
    verified: schools.filter((s) => s.domainValidated && s.websiteType === "verified_website").length,
    deadDomains: schools.filter((s) => s.websiteType === "dead").length,
    callReady: schools.filter((s) => s.phone && (s.websiteType === "no_website" || s.websiteType === "social_only")).length,
    // Pipeline stats
    pipelineNew: schools.filter(s => s.pipelineStage === "new").length,
    pipelineCallNeeded: schools.filter(s => s.pipelineStage === "call_needed").length,
    pipelineContacted: schools.filter(s => s.pipelineStage === "contacted").length,
    pipelineQualified: schools.filter(s => s.pipelineStage === "qualified").length,
    pipelineProposal: schools.filter(s => s.pipelineStage === "proposal").length,
    pipelineWon: schools.filter(s => s.pipelineStage === "won").length,
    pipelineLost: schools.filter(s => s.pipelineStage === "lost").length,
  };

  const exportToCSV = useCallback(() => {
    if (schools.length === 0) {
      toast.error("No leads to export");
      return;
    }

    const headers = [
      "Name", "Location", "Address", "Phone", "Emails", "Category", "Rating", "Rating Info", "Hours",
      "Original Website", "Detected Website", "Website Type", "AI Status", "Confidence Score",
      "Business Type", "Trust Score", "Trust Reason", "Domain Active", "Domain Validated",
      "Pipeline Stage", "Call Status"
    ];

    const generateRow = (s: School) => [
      `"${(s.name || "").replace(/"/g, '""')}"`,
      `"${(s.location || "").replace(/"/g, '""')}"`,
      `"${(s.address || "").replace(/"/g, '""')}"`,
      `"${(s.phone || "").replace(/"/g, '""')}"`,
      `"${(s.emails || "").replace(/"/g, '""')}"`,
      `"${(s.category || "").replace(/"/g, '""')}"`,
      `"${s.rating || ""}"`,
      `"${(s.ratingInfo || "").replace(/"/g, '""')}"`,
      `"${(s.openHours || "").replace(/"/g, '""')}"`,
      `"${(s.website || "").replace(/"/g, '""')}"`,
      `"${(s.detectedWebsite || "").replace(/"/g, '""')}"`,
      `"${(s.websiteType || "").replace(/"/g, '""')}"`,
      `"${(s.status || "").replace(/"/g, '""')}"`,
      `"${s.similarityScore || ""}"`,
      `"${s.schoolType || ""}"`,
      `"${s.trustScore || ""}"`,
      `"${(s.trustReason || "").replace(/"/g, '""')}"`,
      `"${s.domainActive ? 'Yes' : 'No'}"`,
      `"${s.domainValidated ? 'Yes' : 'No'}"`,
      `"${s.pipelineStage || ""}"`,
      `"${s.callStatus || ""}"`
    ].join(",");

    const csvContent = [headers.join(","), ...schools.map(generateRow)].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Export successful");
  }, [schools]);

  const updateSchoolField = useCallback((id: string, field: string, value: string) => {
    const school = schools.find(s => s.id === id);
    const oldVal = school ? (school as any)[field] : undefined;
    updateSchoolsBatchMutation.mutate([{ id, updates: { [field]: value || null, updated_at: new Date().toISOString() } }]);
    logActivity({ schoolId: id, action: "field_update", details: `Updated ${field}`, oldValue: oldVal, newValue: value });
  }, [updateSchoolsBatchMutation, schools, logActivity]);

  const bulkUpdatePipelineStage = useCallback((ids: string[], stage: string) => {
    const updates = ids.map(id => ({ id, updates: { pipeline_stage: stage, updated_at: new Date().toISOString() } }));
    updateSchoolsBatchMutation.mutate(updates);
    toast.success(`Moved ${ids.length} leads to ${stage}`);
  }, [updateSchoolsBatchMutation]);

  const bulkAssignLeads = useCallback((ids: string[], assignedTo: string, assignedName: string) => {
    const updates = ids.map(id => ({ id, updates: { assigned_to: assignedTo || null, assigned_name: assignedName || null, updated_at: new Date().toISOString() } }));
    updateSchoolsBatchMutation.mutate(updates);
    toast.success(`Assigned ${ids.length} leads to ${assignedName || 'unassigned'}`);
  }, [updateSchoolsBatchMutation]);

  return {
    schools,
    stats,
    isLoading,
    processing,
    processProgress,
    validating,
    validateProgress,
    needsValidationCount,
    addSchools,
    processSchools,
    validateDomains,
    revalidateSchoolDomain,
    retryFailed,
    updateSchoolWebsite,
    updateSchoolField,
    updateCallStatus,
    updatePipelineStage,
    assignLead,
    deleteSchool,
    deleteSchools,
    bulkUpdatePipelineStage,
    bulkAssignLeads,
    exportToCSV,
  };
}
