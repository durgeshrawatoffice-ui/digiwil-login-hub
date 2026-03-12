const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const extract = require('extract-zip');
const { createClient } = require('@supabase/supabase-js');

// Must be defined in .env
const supabaseUrl = process.env.SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SERVICE_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

const SESSION_DIR = path.join(__dirname, '.wwebjs_auth');
const ZIP_PATH = path.join(__dirname, 'session-backup.zip');

/**
 * Zips the .wwebjs_auth directory and uploads it to Supabase Database as a base64 string
 */
async function backupSessionToDb(sessionName = 'leadradar_session') {
    if (!fs.existsSync(SESSION_DIR)) {
        console.log('No session directory found to backup.');
        return;
    }

    console.log(`Zipping session directory: ${SESSION_DIR}`);

    await new Promise((resolve, reject) => {
        const output = fs.createWriteStream(ZIP_PATH);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', resolve);
        archive.on('error', reject);

        archive.pipe(output);
        archive.directory(SESSION_DIR, false);
        archive.finalize();
    });

    console.log('Zip complete. Uploading to Supabase DB...');

    try {
        const fileBuffer = fs.readFileSync(ZIP_PATH);
        const base64Data = fileBuffer.toString('base64');

        // Upsert the session into the whatsapp_sessions table
        const { error } = await supabase
            .from('whatsapp_sessions')
            .upsert(
                {
                    session_name: sessionName,
                    session_data: base64Data,
                    updated_at: new Date().toISOString()
                },
                { onConflict: 'session_name' }
            );

        if (error) throw error;
        console.log(`✅ Session backup successful (size: ${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

    } catch (err) {
        console.error('❌ Failed to backup session to DB:', err.message);
    } finally {
        if (fs.existsSync(ZIP_PATH)) {
            fs.unlinkSync(ZIP_PATH);
        }
    }
}

/**
 * Downloads the base64 session from Supabase Database and extracts it to the .wwebjs_auth directory
 */
async function restoreSessionFromDb(sessionName = 'leadradar_session') {
    console.log('Checking for existing session in Supabase DB...');

    try {
        const { data: sessionDoc, error } = await supabase
            .from('whatsapp_sessions')
            .select('session_data')
            .eq('session_name', sessionName)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine
            throw error;
        }

        if (!sessionDoc || !sessionDoc.session_data) {
            console.log('No existing session found in DB. A new one will be created upon QR scan.');
            return false;
        }

        console.log('Existing session found! Restoring...');

        const base64Data = sessionDoc.session_data;
        const fileBuffer = Buffer.from(base64Data, 'base64');

        fs.writeFileSync(ZIP_PATH, fileBuffer);

        // Create the session directory if it doesn't exist
        if (!fs.existsSync(SESSION_DIR)) {
            fs.mkdirSync(SESSION_DIR, { recursive: true });
        }

        // Unzip the file
        await extract(ZIP_PATH, { dir: SESSION_DIR });
        console.log('✅ Session restored successfully!');
        return true;

    } catch (err) {
        console.error('❌ Failed to restore session:', err.message);
        return false;
    } finally {
        if (fs.existsSync(ZIP_PATH)) {
            fs.unlinkSync(ZIP_PATH);
        }
    }
}

/**
 * Deletes the remote session from Supabase Database
 */
async function deleteSessionFromDb(sessionName = 'leadradar_session') {
    console.log(`🗑️ Deleting remote session ${sessionName}...`);
    try {
        const { error } = await supabase
            .from('whatsapp_sessions')
            .delete()
            .eq('session_name', sessionName);
        if (error) throw error;
        console.log('✅ Remote session deleted successfully.');
    } catch (err) {
        console.error('❌ Failed to delete remote session:', err.message);
    }
}

/**
 * Periodically backs up the session
 */
function startBackupJob(intervalMinutes = 15, sessionName = 'leadradar_session') {
    setInterval(() => {
        backupSessionToDb(sessionName);
    }, intervalMinutes * 60 * 1000);
}

module.exports = {
    backupSessionToDb,
    restoreSessionFromDb,
    deleteSessionFromDb,
    startBackupJob,
    SESSION_DIR
};
