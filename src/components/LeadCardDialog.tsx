import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { School } from "@/types/school";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Phone, Mail, Globe, MapPin, Map, Building2, Facebook, Instagram, Twitter, Search, ExternalLink } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { LeadScoreBadge } from "./LeadScoreBadge";
import { ActivityTimeline } from "./ActivityTimeline";
import { useActivityLogs } from "@/hooks/use-activity-logs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LeadCardDialogProps {
    school: School | null;
    open: boolean;
    onClose: () => void;
}

export function LeadCardDialog({ school, open, onClose }: LeadCardDialogProps) {
    const { logs, isLoading: logsLoading } = useActivityLogs(school?.id);

    if (!school) return null;

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-2xl w-full h-full sm:h-auto max-h-[100dvh] sm:max-h-[85vh] p-4 sm:p-6 overflow-y-auto rounded-none sm:rounded-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 flex-wrap">
                        <span className="text-xl font-bold">{school.name}</span>
                        <Badge variant="outline" className="font-mono text-xs">
                            {school.category || "School"}
                        </Badge>
                        <LeadScoreBadge school={school} />
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="details" className="mt-2">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="details" className="text-xs font-mono">Details</TabsTrigger>
                        <TabsTrigger value="score" className="text-xs font-mono">Score</TabsTrigger>
                        <TabsTrigger value="activity" className="text-xs font-mono">Activity ({logs.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Main Info */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-2 border-b-2 pb-1">Basic Details</h3>
                                {(school.location || school.address) && (
                                    <div className="flex gap-2">
                                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                        <div className="text-sm">
                                            {school.address && <div>{school.address}</div>}
                                            {school.location && (
                                                <a href={`https://maps.google.com/?q=${encodeURIComponent(`${school.name} ${school.location}`)}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:underline hover:text-primary flex items-center gap-1 mt-1">
                                                    {school.location} <ExternalLink className="h-3 w-3" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <div className="text-sm">Type: <span className="font-medium capitalize">{school.schoolType || "Unknown"}</span></div>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <Map className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <div className="text-sm">Status: <span className="font-medium capitalize">{school.status}</span></div>
                                </div>
                                {school.rating !== undefined && (
                                    <div className="flex gap-2 items-center">
                                        <div className="text-sm">Rating: <span className="font-medium">⭐ {school.rating}</span></div>
                                        {school.ratingInfo && <div className="text-xs text-muted-foreground">({school.ratingInfo})</div>}
                                    </div>
                                )}
                                {school.openHours && <div className="text-sm"><span className="font-semibold">Hours:</span> {school.openHours}</div>}
                            </div>

                            {/* Contact Details */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-2 border-b-2 pb-1">Contact Information</h3>
                                {school.phone ? (
                                    <div className="flex gap-2 items-center">
                                        <Phone className="h-4 w-4 text-chart-2 shrink-0" />
                                        <a href={`tel:${school.phone}`} className="text-sm font-medium hover:underline text-primary">{school.phone}</a>
                                    </div>
                                ) : (
                                    <div className="flex gap-2 items-center text-muted-foreground text-sm"><Phone className="h-4 w-4 shrink-0" /> No Phone Available</div>
                                )}
                                {school.emails ? (
                                    <div className="flex gap-2 flex-col">
                                        {school.emails.split(',').map(email => (
                                            <div key={email.trim()} className="flex items-center gap-2">
                                                <Mail className="h-4 w-4 text-chart-4 shrink-0" />
                                                <a href={`mailto:${email.trim()}`} className="text-sm font-medium hover:underline text-primary">{email.trim()}</a>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex gap-2 items-center text-muted-foreground text-sm"><Mail className="h-4 w-4 shrink-0" /> No Email Available</div>
                                )}
                                <div className="flex gap-3 pt-2">
                                    {school.facebook && <a href={school.facebook} target="_blank" rel="noopener noreferrer" className="p-2 border rounded hover:bg-accent transition-colors"><Facebook className="h-4 w-4 text-muted-foreground" /></a>}
                                    {school.instagram && <a href={school.instagram} target="_blank" rel="noopener noreferrer" className="p-2 border rounded hover:bg-accent transition-colors"><Instagram className="h-4 w-4 text-muted-foreground" /></a>}
                                    {school.twitter && <a href={school.twitter} target="_blank" rel="noopener noreferrer" className="p-2 border rounded hover:bg-accent transition-colors"><Twitter className="h-4 w-4 text-muted-foreground" /></a>}
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 space-y-4">
                            <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-2 border-b-2 pb-1">Website Details</h3>
                            <div className="flex flex-col gap-3">
                                <div className="flex gap-2 items-center">
                                    <Globe className="h-5 w-5 text-chart-2 shrink-0" />
                                    {school.detectedWebsite || school.website ? (
                                        <a href={school.detectedWebsite || school.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono text-sm break-all">{school.detectedWebsite || school.website}</a>
                                    ) : (
                                        <span className="text-muted-foreground text-sm">No website reported</span>
                                    )}
                                </div>
                                <Button variant="outline" size="sm" className="font-mono text-xs w-full mt-2" onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(`${school.name} ${school.location || ""}`.trim())}`, "_blank")}>
                                    <Search className="h-3 w-3 mr-2" /> Search on Google
                                </Button>
                                {school.websiteType && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold">Type:</span>
                                        <Badge variant="outline" className="font-mono text-xs capitalize">{school.websiteType.replace(/_/g, " ")}</Badge>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-muted-foreground">Domain Active:</span>
                                    <span className="text-sm">{school.domainActive === false ? '❌ No' : school.domainActive === true ? '✅ Yes' : 'Unknown'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-muted-foreground">Domain Validated:</span>
                                    <span className="text-sm">{school.domainValidated ? '✅ Yes' : '—'}</span>
                                </div>
                                {school.qualityScore && (
                                    <div className="mt-2 space-y-3 border p-3 rounded bg-secondary/20">
                                        <div className="text-sm font-semibold flex items-center justify-between">Quality Score<span className="text-primary">{school.qualityScore.overall}%</span></div>
                                        <Progress value={school.qualityScore.overall} className="h-2" />
                                        <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                                            <div className="flex justify-between"><span>Mobile Optimization:</span><span className="font-mono">{school.qualityScore.mobile}%</span></div>
                                            <div className="flex justify-between"><span>Speed:</span><span className="font-mono">{school.qualityScore.speed}%</span></div>
                                            <div className="col-span-2 flex justify-between"><span>SSL Secured:</span><span>{school.qualityScore.ssl ? '✅ Yes' : '❌ No'}</span></div>
                                        </div>
                                    </div>
                                )}
                                {school.trustReason && (
                                    <div className="bg-muted p-3 text-sm font-mono border-l-4 border-chart-2">{school.trustReason}</div>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="score" className="mt-4">
                        <LeadScoreBadge school={school} showDetails />
                    </TabsContent>

                    <TabsContent value="activity" className="mt-4">
                        <ActivityTimeline logs={logs} isLoading={logsLoading} />
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
