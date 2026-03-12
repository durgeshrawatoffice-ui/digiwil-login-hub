// WhatsApp API Service — connects to the deployed whatsapp-web.js backend

const WHATSAPP_API_URL = import.meta.env.VITE_WHATSAPP_API_URL || 'http://localhost:3001';

export interface WhatsAppStatus {
    ready: boolean;
    qr: string | null;
    clientInfo: {
        pushname: string;
        wid: string;
        platform: string;
    } | null;
    error: string | null;
}

export interface SendMessageResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

export interface BulkSendResult {
    success: boolean;
    summary: { total: number; sent: number; failed: number };
    results: Array<{ number: string; success: boolean; messageId?: string; error?: string }>;
}

class WhatsAppService {
    private baseUrl: string;

    constructor() {
        this.baseUrl = WHATSAPP_API_URL;
    }

    setBaseUrl(url: string) {
        this.baseUrl = url;
    }

    getBaseUrl(): string {
        return this.baseUrl;
    }

    async getStatus(): Promise<WhatsAppStatus> {
        try {
            const res = await fetch(`${this.baseUrl}/api/status`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (error: any) {
            return {
                ready: false,
                qr: null,
                clientInfo: null,
                error: `Cannot connect to WhatsApp service at ${this.baseUrl}. ${error.message}`,
            };
        }
    }

    async sendMessage(number: string, message: string): Promise<SendMessageResult> {
        const res = await fetch(`${this.baseUrl}/api/send-message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ number, message }),
        });
        return await res.json();
    }

    async sendBulk(
        messages: Array<{ number: string; message: string }>,
        delayMs = 3000
    ): Promise<BulkSendResult> {
        const res = await fetch(`${this.baseUrl}/api/send-bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages, delayMs }),
        });
        return await res.json();
    }

    async logout(): Promise<{ success: boolean; message?: string; error?: string }> {
        const res = await fetch(`${this.baseUrl}/api/logout`, { method: 'POST' });
        return await res.json();
    }

    async restart(): Promise<{ success: boolean; message?: string; error?: string }> {
        const res = await fetch(`${this.baseUrl}/api/restart`, { method: 'POST' });
        return await res.json();
    }

    async healthCheck(): Promise<boolean> {
        try {
            const res = await fetch(`${this.baseUrl}/api/health`);
            return res.ok;
        } catch {
            return false;
        }
    }
}

export const whatsappService = new WhatsAppService();
