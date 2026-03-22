import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSchools } from "@/hooks/use-schools";
import { useUserRole } from "@/hooks/use-user-role";
import { StatsCards } from "@/components/StatsCards";
import { LeadChart } from "@/components/LeadChart";
import { SchoolImport } from "@/components/SchoolImport";
import { SchoolTable } from "@/components/SchoolTable";
import { ProcessingBar } from "@/components/ProcessingBar";
import { CallQueue } from "@/components/CallQueue";
import { PipelineBoard } from "@/components/PipelineBoard";
import { OutreachTemplates } from "@/components/OutreachTemplates";
import { GoogleMapsScraper } from "@/components/GoogleMapsScraper";
import { WebsiteScraper } from "@/components/WebsiteScraper";
import { TeamManagement } from "@/components/TeamManagement";
import { AdminLeadAssignment } from "@/components/AdminLeadAssignment";
import { PerformanceLeaderboard } from "@/components/PerformanceLeaderboard";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { ReportsDashboard } from "@/components/ReportsDashboard";
import { ExportDialog } from "@/components/ExportDialog";
import { ProfileSettings } from "@/components/ProfileSettings";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { FeatureTour } from "@/components/FeatureTour";
import { AppSidebar } from "@/components/AppSidebar";
import { LeadEnrichment } from "@/components/LeadEnrichment";
import { EmailFinder } from "@/components/EmailFinder";
import { NurtureSequences } from "@/components/NurtureSequences";
import { LandingPageBuilder } from "@/components/LandingPageBuilder";
import { DuplicateDetector } from "@/components/DuplicateDetector";
import { CompetitorAnalysis } from "@/components/CompetitorAnalysis";
import { DirectOutreach } from "@/components/DirectOutreach";
import { LeadScoringDashboard } from "@/components/LeadScoringDashboard";
import { FollowUpReminders } from "@/components/FollowUpReminders";
import { BulkWhatsAppSender } from "@/components/BulkWhatsAppSender";
import { WhatsAppConfig } from "@/components/WhatsAppConfig";
import { LeadScoringWidget } from "@/components/LeadScoringWidget";
import { QuickActions } from "@/components/QuickActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, Loader2, Download, FileDown } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useUserRole();
  const {
    schools, stats, processing, processProgress, validating, validateProgress,
    needsValidationCount, addSchools, processSchools, validateDomains,
    revalidateSchoolDomain, retryFailed, updateSchoolWebsite, updateSchoolField,
    updateCallStatus, updatePipelineStage, assignLead, deleteSchool, deleteSchools,
    bulkUpdatePipelineStage, bulkAssignLeads, exportToCSV, isLoading,
  } = useSchools();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [filter, setFilter] = useState<string>("all");
  const [exportOpen, setExportOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem("leadradar_onboarded");
  });

  if (showOnboarding) {
    return <OnboardingWizard onComplete={() => setShowOnboarding(false)} />;
  }

  const filteredSchools = schools.filter(s => {
    if (filter === "all") return true;
    if (filter === "govt") return s.schoolType === "government";
    if (filter === "private") return s.schoolType === "private";
    if (filter === "no_website") return s.websiteType === "no_website";
    if (filter === "social_only") return s.websiteType === "social_only";
    if (filter === "discovered") return s.discovered;
    if (filter === "has_website") return s.status === "found";
    if (filter === "verified") return s.domainValidated && s.websiteType === "verified_website";
    if (filter === "dead") return s.websiteType === "dead";
    if (filter === "call_ready") return s.phone && (s.websiteType === "no_website" || s.websiteType === "social_only");
    return true;
  });

  const needsDetectionCount = schools.filter(s =>
    (s.status === "pending" || s.status === "error" || s.websiteType === "no_website" || s.websiteType === "social_only") &&
    (!s.detectedWebsite || s.websiteType === "no_website" || s.websiteType === "social_only")
  ).length;

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      );
    }

    switch (activeTab) {
      case "dashboard":
        return (
          <div className="space-y-5">
            <QuickActions schools={schools} onNavigate={setActiveTab} onProcess={processSchools} processing={processing} />
            <StatsCards stats={stats} />
            <LeadScoringWidget schools={schools} />
            <LeadChart stats={stats} schools={schools} />
            <div className="flex flex-col md:flex-row flex-wrap gap-3 w-full">
              <ProcessingBar processing={processing} progress={processProgress} pendingCount={needsDetectionCount} onProcess={processSchools} />
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 border-2 bg-secondary/50 flex-1 w-full rounded-lg">
                <Button onClick={validateDomains} disabled={validating || needsValidationCount === 0} className="font-mono text-xs uppercase" variant="outline" size="sm">
                  {validating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <ShieldCheck className="h-3 w-3 mr-1" />}
                  {validating ? "Validating..." : `Validate (${needsValidationCount})`}
                </Button>
                {validating && (
                  <div className="w-full sm:flex-1 flex items-center gap-3">
                    <Progress value={validateProgress} className="flex-1 h-2" />
                    <span className="font-mono text-xs">{Math.round(validateProgress)}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case "analytics":
        return <AnalyticsDashboard schools={schools} />;
      case "reports":
        return <ReportsDashboard schools={schools} />;
      case "pipeline":
        return <PipelineBoard schools={schools} onUpdatePipeline={updatePipelineStage} onUpdateWebsite={updateSchoolWebsite} />;
      case "leads":
        return (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <ProcessingBar processing={processing} progress={processProgress} pendingCount={needsDetectionCount} onProcess={processSchools} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: "all", label: "All", count: schools.length },
                { key: "govt", label: "🏛 Govt", count: stats.government },
                { key: "private", label: "🏫 Private", count: stats.private },
                { key: "has_website", label: "🌐 Has Website", count: stats.found },
                { key: "no_website", label: "🚫 No Website", count: stats.noWebsite },
                { key: "social_only", label: "📱 Social Only", count: stats.socialOnly },
                { key: "discovered", label: "✨ Discovered", count: stats.discovered },
                { key: "verified", label: "✅ Verified", count: stats.verified },
                { key: "dead", label: "💀 Dead", count: stats.deadDomains },
                { key: "call_ready", label: "📞 Call Ready", count: stats.callReady },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-3 py-1.5 text-xs font-mono border-2 transition-colors ${filter === tab.key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary border-border hover:bg-accent"}`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
            <SchoolTable schools={filteredSchools} onUpdateWebsite={updateSchoolWebsite} onUpdateField={updateSchoolField} onDelete={deleteSchool} onDeleteBulk={deleteSchools} onBulkPipelineChange={bulkUpdatePipelineStage} onBulkAssign={bulkAssignLeads} onRetry={retryFailed} onRevalidate={revalidateSchoolDomain} validating={validating} />
          </div>
        );
      case "calls":
        return <CallQueue schools={schools} onUpdateWebsite={updateSchoolWebsite} onUpdateCallStatus={updateCallStatus} />;
      case "outreach":
        return <OutreachTemplates schools={schools} />;
      case "team":
        return <TeamManagement schools={schools} onAssignLead={assignLead} />;
      case "scraper":
        return <GoogleMapsScraper onImportLeads={addSchools} />;
      case "website-scraper":
        return <WebsiteScraper schools={schools} />;
      case "enrichment":
        return <LeadEnrichment schools={schools} onUpdateField={updateSchoolField} />;
      case "email-finder":
        return <EmailFinder schools={schools} onUpdateField={updateSchoolField} />;
      case "sequences":
        return <NurtureSequences schools={schools} />;
      case "landing-pages":
        return <LandingPageBuilder />;
      case "duplicates":
        return <DuplicateDetector schools={schools} onDeleteBulk={deleteSchools} onUpdateField={updateSchoolField} />;
      case "competitors":
        return <CompetitorAnalysis schools={schools} />;
      case "direct-outreach":
        return <DirectOutreach schools={schools} />;
      case "scoring":
        return <LeadScoringDashboard schools={schools} />;
      case "reminders":
        return <FollowUpReminders schools={schools} onUpdateField={updateSchoolField} />;
      case "bulk-whatsapp":
        return <BulkWhatsAppSender schools={schools} />;
      case "whatsapp-config":
        return <WhatsAppConfig />;
      case "import":
        return (
          <div className="space-y-4">
            <SchoolImport onImport={addSchools} />
            {schools.length > 0 && (
              <SchoolTable schools={schools} onUpdateWebsite={updateSchoolWebsite} onUpdateField={updateSchoolField} onDelete={deleteSchool} onDeleteBulk={deleteSchools} onBulkPipelineChange={bulkUpdatePipelineStage} onBulkAssign={bulkAssignLeads} onRetry={retryFailed} onRevalidate={revalidateSchoolDomain} validating={validating} />
            )}
          </div>
        );
      case "settings":
        return <ProfileSettings />;
      default:
        return null;
    }
  };

  const tabLabels: Record<string, string> = {
    dashboard: "Dashboard",
    analytics: "Analytics",
    reports: "Reports",
    pipeline: "Pipeline",
    leads: "Leads",
    calls: "Calls",
    outreach: "Outreach",
    team: "Team",
    scraper: "Map Scraper",
    "website-scraper": "Web Scraper",
    enrichment: "AI Lead Enrichment",
    "email-finder": "Email Finder & Verifier",
    sequences: "Nurture Sequences",
    "landing-pages": "Landing Pages",
    duplicates: "Duplicate Detection",
    competitors: "AI Competitor Analysis",
    "direct-outreach": "Direct Outreach",
    scoring: "Lead Scoring",
    reminders: "Follow-up Reminders",
    "bulk-whatsapp": "Bulk WhatsApp",
    "whatsapp-config": "WhatsApp Config",
    import: "Import",
    settings: "Settings",
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} stats={stats} />

      <main className="flex-1 min-w-0 overflow-auto">
        <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur px-4 md:px-6 py-2.5">
          <div className="flex items-center justify-between">
            <div className="pl-10 md:pl-0 flex items-center gap-3">
              <h1 className="text-base font-bold tracking-tight">{tabLabels[activeTab]}</h1>
              {activeTab === "leads" && (
                <Badge variant="outline" className="font-mono text-[10px]">{filteredSchools.length} of {schools.length}</Badge>
              )}
              {activeTab === "pipeline" && (
                <Badge variant="outline" className="font-mono text-[10px]">{stats.pipelineWon} won</Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="sm" className="font-mono text-[10px] hidden sm:flex h-7" onClick={exportToCSV} disabled={schools.length === 0}>
                <Download className="h-3 w-3 mr-1" /> CSV
              </Button>
              <Button variant="ghost" size="sm" className="font-mono text-[10px] hidden sm:flex h-7" onClick={() => setExportOpen(true)} disabled={schools.length === 0}>
                <FileDown className="h-3 w-3 mr-1" /> Export
              </Button>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-6 space-y-6">
          {renderContent()}
        </div>

        <ExportDialog schools={schools} open={exportOpen} onClose={() => setExportOpen(false)} />
      </main>

      <FeatureTour onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
