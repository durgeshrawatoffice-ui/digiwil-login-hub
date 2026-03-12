const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const cors = require('cors');
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

// Initialize WhatsApp Web Client
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: '/app/.wwebjs_auth'
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
            '--disable-gpu'
        ]
    }
});

let qrData = null;
let isReady = false;
let clientInfo = null;
let lastError = null;

// Generate QR Code for authentication
client.on('qr', (qr) => {
    console.log('QR Code received! Scan from your phone or fetch from /api/status.');
    qrcode.generate(qr, { small: true });
    qrData = qr;
    lastError = null;
});

// Client is ready
client.on('ready', () => {
    console.log('✅ WhatsApp Client is ready!');
    isReady = true;
    qrData = null;
    lastError = null;
    try {
        clientInfo = {
            pushname: client.info?.pushname || 'Unknown',
            wid: client.info?.wid?._serialized || 'Unknown',
            platform: client.info?.platform || 'Unknown',
        };
        console.log(`Connected as: ${clientInfo.pushname} (${clientInfo.wid})`);
    } catch (e) {
        clientInfo = null;
    }

    // Backup session to DB immediately upon successful connect
    backupSessionToDb();

    // Start periodic backup every 15 minutes
    startBackupJob(15);
});

client.on('authenticated', () => {
    console.log('✅ Authenticated successfully');
    // Also backup session on successful authentication
    backupSessionToDb();
});

client.on('auth_failure', (msg) => {
    console.error('❌ Authentication Failed:', msg);
    isReady = false;
    lastError = 'Authentication failed. Please try again.';
});

client.on('disconnected', (reason) => {
    console.log('❌ Client disconnected:', reason);
    isReady = false;
    clientInfo = null;
    lastError = `Disconnected: ${reason}`;
    // Attempt to reconnect
    setTimeout(() => {
        console.log('🔄 Attempting to reconnect...');
        initializeClient();
    }, 5000);
});

// Listen for incoming messages (auto-reply demo)
client.on('message', async (msg) => {
    if (msg.body === '!ping') {
        await msg.reply('pong 🏓');
    }
});

// Function to initialize the client
function initializeClient() {
    client.initialize();
}

/**
 * =================== EXPRESS API ROUTES ===================
 */

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get full status (QR code, ready state, connected account info)
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

        // Check if the number is registered on WhatsApp
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

// Send bulk messages (with delay between each)
app.post('/api/send-bulk', async (req, res) => {
    if (!isReady) {
        return res.status(400).json({
            success: false,
            error: 'WhatsApp client is not ready.'
        });
    }

    const { messages, delayMs = 3000 } = req.body;
    // messages: [{ number: string, message: string }]

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

        // Delay between messages to avoid rate limiting
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

// Logout / disconnect
app.post('/api/logout', async (req, res) => {
    try {
        await client.logout();
        isReady = false;
        clientInfo = null;
        qrData = null;
        deleteSessionFromDb(); // Delete session from DB on logout
        res.json({ success: true, message: 'Logged out. Scan QR again to reconnect.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Restart the client
app.post('/api/restart', async (req, res) => {
    try {
        await client.destroy();
        isReady = false;
        clientInfo = null;
        qrData = null;
        lastError = null;
        initializeClient();
        res.json({ success: true, message: 'Client restarting. Fetch /api/status for QR code.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- START SERVER ---
async function startServer() {
    console.log('📥 Restoring remote session if exists...');
    await restoreSessionFromDb();

    initializeClient();

    app.listen(port, () => {
        console.log(`\n🚀 WhatsApp API Service running on port ${port}`);
        console.log(`   GET  /api/health       — Health check`);
        console.log(`   GET  /api/status       — Connection status & QR code`);
        console.log(`   POST /api/send-message — Send a single message`);
        console.log(`   POST /api/send-bulk    — Send bulk messages`);
        console.log(`   POST /api/logout       — Logout session`);
        console.log(`   POST /api/restart      — Restart client\n`);
    });
}

startServer();
