import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
    MessageCircle, Wifi, WifiOff, RefreshCw, LogOut, Send,
    QrCode, CheckCircle2, AlertCircle, Loader2, Settings2, Smartphone
} from "lucide-react";
import { whatsappService, type WhatsAppStatus } from "@/lib/whatsapp-service";

export function WhatsAppConfig() {
    const [status, setStatus] = useState<WhatsAppStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [apiUrl, setApiUrl] = useState(whatsappService.getBaseUrl());
    const [editingUrl, setEditingUrl] = useState(false);
    const [testNumber, setTestNumber] = useState("");
    const [testMessage, setTestMessage] = useState("Hello from LeadRadar! 🚀 This is a test message.");
    const [sending, setSending] = useState(false);
    const [restarting, setRestarting] = useState(false);

    const fetchStatus = useCallback(async () => {
        const s = await whatsappService.getStatus();
        setStatus(s);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchStatus();
        // Poll status every 5 seconds when waiting for QR scan
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, [fetchStatus]);

    const handleSaveUrl = () => {
        const trimmed = apiUrl.trim().replace(/\/+$/, "");
        whatsappService.setBaseUrl(trimmed);
        setApiUrl(trimmed);
        setEditingUrl(false);
        // Persist in localStorage
        localStorage.setItem("leadradar_whatsapp_api_url", trimmed);
        toast.success("WhatsApp API URL updated");
        fetchStatus();
    };

    // Load persisted URL on mount
    useEffect(() => {
        const saved = localStorage.getItem("leadradar_whatsapp_api_url");
        if (saved) {
            whatsappService.setBaseUrl(saved);
            setApiUrl(saved);
        }
    }, []);

    const handleLogout = async () => {
        try {
            const result = await whatsappService.logout();
            if (result.success) {
                toast.success("Logged out of WhatsApp");
            } else {
                toast.error(result.error || "Failed to logout");
            }
            fetchStatus();
        } catch {
            toast.error("Failed to logout");
        }
    };

    const handleRestart = async () => {
        setRestarting(true);
        try {
            const result = await whatsappService.restart();
            if (result.success) {
                toast.success("WhatsApp client restarting...");
            } else {
                toast.error(result.error || "Failed to restart");
            }
            setTimeout(fetchStatus, 3000);
        } catch {
            toast.error("Failed to restart");
        } finally {
            setRestarting(false);
        }
    };

    const handleTestSend = async () => {
        if (!testNumber.trim() || !testMessage.trim()) {
            toast.error("Enter both number and message");
            return;
        }
        setSending(true);
        try {
            const result = await whatsappService.sendMessage(testNumber, testMessage);
            if (result.success) {
                toast.success("Test message sent successfully! ✅");
            } else {
                toast.error(result.error || "Failed to send");
            }
        } catch (e: any) {
            toast.error(e.message || "Failed to send");
        } finally {
            setSending(false);
        }
    };

    const isConnected = status?.ready === true;
    const showQR = !isConnected && !!status?.qr;
    const isWaiting = !isConnected && !status?.qr && !status?.error;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-chart-2" />
                    WhatsApp Configuration
                </h2>
                <p className="text-sm text-muted-foreground">
                    Manage your WhatsApp Web connection for automated outreach
                </p>
            </div>

            {/* Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-2">
                    <CardContent className="p-4 flex items-center gap-4">
                        {isConnected ? (
                            <div className="h-10 w-10 rounded-full bg-chart-2/10 flex items-center justify-center">
                                <Wifi className="h-5 w-5 text-chart-2" />
                            </div>
                        ) : (
                            <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                                <WifiOff className="h-5 w-5 text-destructive" />
                            </div>
                        )}
                        <div>
                            <p className="text-xs font-mono text-muted-foreground uppercase">Status</p>
                            <p className="text-lg font-bold">
                                {loading ? "Checking..." : isConnected ? "Connected" : "Disconnected"}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-2">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Smartphone className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs font-mono text-muted-foreground uppercase">Account</p>
                            <p className="text-sm font-bold truncate">
                                {status?.clientInfo?.pushname || "Not connected"}
                            </p>
                            {status?.clientInfo?.wid && (
                                <p className="text-[10px] text-muted-foreground font-mono">{status.clientInfo.wid}</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-2">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-chart-4/10 flex items-center justify-center">
                            <Settings2 className="h-5 w-5 text-chart-4" />
                        </div>
                        <div>
                            <p className="text-xs font-mono text-muted-foreground uppercase">Service</p>
                            <p className="text-xs font-mono truncate max-w-[160px]">{apiUrl}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Connection & QR */}
                <div className="space-y-4">
                    {/* API URL Config */}
                    <Card className="border-2">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-mono uppercase flex items-center gap-2">
                                <Settings2 className="h-4 w-4" />
                                Service URL
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex gap-2">
                                <Input
                                    value={apiUrl}
                                    onChange={(e) => {
                                        setApiUrl(e.target.value);
                                        setEditingUrl(true);
                                    }}
                                    placeholder="https://your-whatsapp-service.onrender.com"
                                    className="font-mono text-xs"
                                />
                                {editingUrl && (
                                    <Button size="sm" onClick={handleSaveUrl} className="font-mono text-xs shrink-0">
                                        Save
                                    </Button>
                                )}
                            </div>
                            <p className="text-[10px] text-muted-foreground font-mono">
                                Point this to your deployed WhatsApp service URL (e.g. Render)
                            </p>
                        </CardContent>
                    </Card>

                    {/* QR Code / Connection Status */}
                    <Card className="border-2">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-mono uppercase flex items-center gap-2">
                                <QrCode className="h-4 w-4" />
                                Connection
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {loading && (
                                <div className="text-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground mt-2 font-mono">Connecting to service...</p>
                                </div>
                            )}

                            {!loading && isConnected && (
                                <div className="text-center py-6 space-y-3">
                                    <div className="h-16 w-16 rounded-full bg-chart-2/10 flex items-center justify-center mx-auto">
                                        <CheckCircle2 className="h-8 w-8 text-chart-2" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-chart-2">Connected</p>
                                        <p className="text-sm text-muted-foreground">
                                            Logged in as <span className="font-semibold">{status?.clientInfo?.pushname}</span>
                                        </p>
                                    </div>
                                    <Badge variant="outline" className="font-mono text-[10px]">
                                        {status?.clientInfo?.platform || "web"}
                                    </Badge>
                                </div>
                            )}

                            {!loading && showQR && (
                                <div className="text-center py-4 space-y-3">
                                    <div className="bg-white p-4 rounded-lg inline-block mx-auto border-2">
                                        {/* Render QR code using a canvas via an inline img tag from the qr data string */}
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(status.qr!)}`}
                                            alt="WhatsApp QR Code"
                                            className="w-[250px] h-[250px]"
                                        />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold">Scan this QR Code</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Open WhatsApp → Settings → Linked Devices → Link a Device
                                        </p>
                                    </div>
                                    <Badge variant="secondary" className="font-mono text-[10px]">
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                        Waiting for scan...
                                    </Badge>
                                </div>
                            )}

                            {!loading && status?.error && (
                                <div className="text-center py-6 space-y-3">
                                    <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                                        <AlertCircle className="h-8 w-8 text-destructive" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-destructive">Connection Error</p>
                                        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto break-all">
                                            {status.error}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {!loading && isWaiting && !status?.error && (
                                <div className="text-center py-6 space-y-3">
                                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground font-mono">Initializing WhatsApp client...</p>
                                    <p className="text-xs text-muted-foreground">QR code will appear shortly</p>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 font-mono text-xs"
                                    onClick={handleRestart}
                                    disabled={restarting}
                                >
                                    {restarting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                                    Restart
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 font-mono text-xs"
                                    onClick={handleLogout}
                                    disabled={!isConnected}
                                >
                                    <LogOut className="h-3 w-3 mr-1" />
                                    Logout
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="font-mono text-xs"
                                    onClick={fetchStatus}
                                >
                                    <RefreshCw className="h-3 w-3" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Test Message */}
                <div className="space-y-4">
                    <Card className="border-2">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-mono uppercase flex items-center gap-2">
                                <Send className="h-4 w-4" />
                                Test Message
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <label className="text-xs font-mono text-muted-foreground uppercase">Phone Number</label>
                                <Input
                                    value={testNumber}
                                    onChange={(e) => setTestNumber(e.target.value)}
                                    placeholder="919876543210"
                                    className="font-mono text-sm mt-1"
                                />
                                <p className="text-[10px] text-muted-foreground font-mono mt-1">
                                    Include country code without + (e.g. 919876543210 for India)
                                </p>
                            </div>
                            <div>
                                <label className="text-xs font-mono text-muted-foreground uppercase">Message</label>
                                <Textarea
                                    value={testMessage}
                                    onChange={(e) => setTestMessage(e.target.value)}
                                    rows={4}
                                    className="font-mono text-sm mt-1"
                                />
                            </div>
                            <Button
                                onClick={handleTestSend}
                                disabled={!isConnected || sending || !testNumber || !testMessage}
                                className="w-full font-mono text-xs uppercase"
                            >
                                {sending ? (
                                    <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Sending...</>
                                ) : (
                                    <><Send className="h-3 w-3 mr-1" /> Send Test Message</>
                                )}
                            </Button>
                            {!isConnected && (
                                <p className="text-xs text-destructive font-mono text-center">
                                    Connect WhatsApp first to send messages
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Instructions */}
                    <Card className="border-2 bg-secondary/30">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-mono uppercase">Setup Guide</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="space-y-2 text-xs">
                                <div className="flex items-start gap-2">
                                    <Badge className="h-5 w-5 flex items-center justify-center text-[10px] shrink-0">1</Badge>
                                    <p>Deploy the <code className="bg-secondary px-1 rounded">whatsapp-service</code> on Render using Docker</p>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Badge className="h-5 w-5 flex items-center justify-center text-[10px] shrink-0">2</Badge>
                                    <p>Copy the Render URL and paste it in the <strong>Service URL</strong> field above</p>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Badge className="h-5 w-5 flex items-center justify-center text-[10px] shrink-0">3</Badge>
                                    <p>Scan the QR code with your WhatsApp mobile app</p>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Badge className="h-5 w-5 flex items-center justify-center text-[10px] shrink-0">4</Badge>
                                    <p>Once connected, use <strong>Bulk WhatsApp</strong> or <strong>Direct Outreach</strong> to send messages automatically</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
