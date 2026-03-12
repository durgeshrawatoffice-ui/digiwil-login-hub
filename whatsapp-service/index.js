const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const {
    restoreSessionFromDb,
    backupSessionToDb,
    startBackupJob,
    deleteSessionFromDb
} = require('./session-sync');

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3001;

// Determine session directory based on environment
// Docker uses /app, local dev uses the project dir
const SESSION_DATA_PATH = fs.existsSync('/app') && process.env.NODE_ENV === 'production'
    ? '/app/.wwebjs_auth'
    : path.join(__dirname, '.wwebjs_auth');

console.log(`📂 Session directory: ${SESSION_DATA_PATH}`);

let client = null;
let qrData = null;
let isReady = false;
let clientInfo = null;
let lastError = null;
let backupIntervalId = null;
let keepAliveIntervalId = null;

/**
 * Creates a fresh WhatsApp Client instance
 */
function createClient() {
    return new Client({
        authStrategy: new LocalAuth({
            dataPath: SESSION_DATA_PATH
        }),
        puppeteer: {
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu',
                '--disable-extensions',
                '--disable-software-rasterizer',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding'
            ]
        },
        // Increase timeouts so client doesn't give up on slow restore
        authTimeoutMs: 120000,
        qrMaxRetries: 10,
    });
}

/**
 * Attach all event listeners to the client
 */
function setupClientEvents(waClient) {
    // QR Code
    waClient.on('qr', (qr) => {
        console.log('QR Code received! Scan from your phone or fetch from /api/status.');
        qrcode.generate(qr, { small: true });
        qrData = qr;
        lastError = null;
    });

    // Client ready
    waClient.on('ready', async () => {
        console.log('✅ WhatsApp Client is ready!');
        isReady = true;
        qrData = null;
        lastError = null;
        try {
            clientInfo = {
                pushname: waClient.info?.pushname || 'Unknown',
                wid: waClient.info?.wid?._serialized || 'Unknown',
                platform: waClient.info?.platform || 'Unknown',
            };
            console.log(`Connected as: ${clientInfo.pushname} (${clientInfo.wid})`);
        } catch (e) {
            clientInfo = null;
        }

        // Wait a few seconds for session files to be fully written, then backup
        setTimeout(async () => {
            console.log('💾 Backing up session to database...');
            await backupSessionToDb();
        }, 10000);

        // Start periodic backup every 5 minutes (more frequent = more resilient)
        if (backupIntervalId) clearInterval(backupIntervalId);
        backupIntervalId = setInterval(() => {
            if (isReady) backupSessionToDb();
        }, 5 * 60 * 1000);
    });

    // Authenticated
    waClient.on('authenticated', () => {
        console.log('✅ Authenticated successfully');
        // Don't backup here — session files aren't fully written yet
        // The backup happens in the 'ready' event after a delay
    });

    // Auth failure — clear bad session and force re-scan
    waClient.on('auth_failure', async (msg) => {
        console.error('❌ Authentication Failed:', msg);
        isReady = false;
        lastError = 'Authentication failed. Clearing bad session and restarting...';

        // Delete the corrupted local session
        try {
            if (fs.existsSync(SESSION_DATA_PATH)) {
                fs.rmSync(SESSION_DATA_PATH, { recursive: true, force: true });
                console.log('🗑️ Cleared corrupted local session.');
            }
        } catch (e) {
            console.error('Failed to clear local session:', e.message);
        }

        // Delete the bad session from DB too
        await deleteSessionFromDb();

        // Restart with fresh session (will show QR code)
        setTimeout(() => restartClient(), 5000);
    });

    // Disconnected
    waClient.on('disconnected', async (reason) => {
        console.log('❌ Client disconnected:', reason);
        isReady = false;
        clientInfo = null;
        lastError = `Disconnected: ${reason}`;

        // Only auto-reconnect for recoverable disconnects
        if (reason !== 'LOGOUT') {
            console.log('🔄 Will attempt to reconnect in 10 seconds...');
            setTimeout(() => restartClient(), 10000);
        }
    });

    // Ping-pong for testing
    waClient.on('message', async (msg) => {
        if (msg.body === '!ping') {
            await msg.reply('pong 🏓');
        }
    });
}

/**
 * Initialize or restart the WhatsApp client
 */
async function restartClient() {
    console.log('🔄 (Re)starting WhatsApp client...');

    // Destroy old client if exists
    if (client) {
        try {
            await client.destroy();
        } catch (e) {
            console.log('Note: old client destroy error (expected):', e.message);
        }
    }

    // Reset state
    isReady = false;
    qrData = null;
    clientInfo = null;
    lastError = null;

    // Create fresh client
    client = createClient();
    setupClientEvents(client);
    client.initialize();
}

/**
 * =================== EXPRESS API ROUTES ===================
 */

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Keep-alive endpoint (used by self-ping to prevent Render sleep)
app.get('/api/keep-alive', (req, res) => {
    res.json({ alive: true, ready: isReady, timestamp: new Date().toISOString() });
});

// Status
app.get('/api/status', (req, res) => {
    res.json({
        ready: isReady,
        qr: qrData,
        clientInfo,
        error: lastError,
    });
});

// Send a single message
app.post('/api/send-message', async (req, res) => {
    if (!isReady) {
        return res.status(400).json({
            success: false,
            error: 'WhatsApp client is not ready. Please scan the QR code first.'
        });
    }

    const { number, message } = req.body;

    if (!number || !message) {
        return res.status(400).json({
            success: false,
            error: 'Both "number" and "message" are required.'
        });
    }

    try {
        const cleanNumber = number.replace(/[\+\-\s\(\)]/g, '');
        const chatId = cleanNumber.includes('@c.us') ? cleanNumber : `${cleanNumber}@c.us`;

        const isRegistered = await client.isRegisteredUser(chatId);
        if (!isRegistered) {
            return res.status(400).json({
                success: false,
                error: `Number ${number} is not registered on WhatsApp.`
            });
        }

        const response = await client.sendMessage(chatId, message);
        res.json({
            success: true,
            messageId: response.id?._serialized,
            timestamp: response.timestamp,
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Send bulk messages
app.post('/api/send-bulk', async (req, res) => {
    if (!isReady) {
        return res.status(400).json({
            success: false,
            error: 'WhatsApp client is not ready.'
        });
    }

    const { messages, delayMs = 3000 } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({
            success: false,
            error: '"messages" array is required. Each item must have "number" and "message".'
        });
    }

    const results = [];

    for (let i = 0; i < messages.length; i++) {
        const { number, message } = messages[i];
        try {
            const cleanNumber = number.replace(/[\+\-\s\(\)]/g, '');
            const chatId = cleanNumber.includes('@c.us') ? cleanNumber : `${cleanNumber}@c.us`;

            const isRegistered = await client.isRegisteredUser(chatId);
            if (!isRegistered) {
                results.push({ number, success: false, error: 'Not registered on WhatsApp' });
                continue;
            }

            const response = await client.sendMessage(chatId, message);
            results.push({
                number,
                success: true,
                messageId: response.id?._serialized,
            });
        } catch (error) {
            results.push({ number, success: false, error: error.message });
        }

        if (i < messages.length - 1) {
            await new Promise(r => setTimeout(r, delayMs));
        }
    }

    const sent = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.json({
        success: true,
        summary: { total: messages.length, sent, failed },
        results,
    });
});

// Logout
app.post('/api/logout', async (req, res) => {
    try {
        if (client) await client.logout();
        isReady = false;
        clientInfo = null;
        qrData = null;
        await deleteSessionFromDb();
        res.json({ success: true, message: 'Logged out. Scan QR again to reconnect.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Restart
app.post('/api/restart', async (req, res) => {
    try {
        await restartClient();
        res.json({ success: true, message: 'Client restarting. Fetch /api/status for QR code.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Force backup now
app.post('/api/backup-session', async (req, res) => {
    try {
        await backupSessionToDb();
        res.json({ success: true, message: 'Session backed up to database.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * =================== SELF KEEP-ALIVE ===================
 * Pings itself every 4 minutes to prevent Render free tier from sleeping
 */
function startKeepAlive() {
    const serviceUrl = process.env.SERVICE_URL || `http://localhost:${port}`;
    keepAliveIntervalId = setInterval(async () => {
        try {
            const res = await fetch(`${serviceUrl}/api/keep-alive`);
            const data = await res.json();
            console.log(`🏓 Keep-alive ping: ready=${data.ready}`);
        } catch (e) {
            console.log('🏓 Keep-alive ping failed (may be starting up)');
        }
    }, 4 * 60 * 1000); // Every 4 minutes
}

/**
 * =================== START SERVER ===================
 */
async function startServer() {
    console.log('📥 Restoring remote session from database...');
    const restored = await restoreSessionFromDb();
    if (restored) {
        console.log('✅ Session data restored. Connecting with saved credentials...');
    } else {
        console.log('ℹ️  No saved session found. QR code will be generated.');
    }

    // Create the client and start
    client = createClient();
    setupClientEvents(client);
    client.initialize();

    app.listen(port, () => {
        console.log(`\n🚀 WhatsApp API Service running on port ${port}`);
        console.log(`   GET  /api/health         — Health check`);
        console.log(`   GET  /api/keep-alive     — Keep-alive ping`);
        console.log(`   GET  /api/status         — Connection status & QR code`);
        console.log(`   POST /api/send-message   — Send a single message`);
        console.log(`   POST /api/send-bulk      — Send bulk messages`);
        console.log(`   POST /api/logout         — Logout session`);
        console.log(`   POST /api/restart        — Restart client`);
        console.log(`   POST /api/backup-session — Force backup session\n`);
    });

    // Start the self-ping keep-alive (prevents Render from sleeping)
    startKeepAlive();
}

startServer();
