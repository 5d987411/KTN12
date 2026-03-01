#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec, spawn } = require('child_process');

const CONFIG_PATH = path.join(__dirname, 'config.json');
const HEARTBEAT_FILE = path.join(__dirname, 'heartbeat.json');
const LOG_FILE = path.join(__dirname, 'auto-lawyer.log');

let config = {};

function log(msg, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMsg = `[${timestamp}] [${level}] ${msg}`;
    console.log(logMsg);
    fs.appendFileSync(LOG_FILE, logMsg + '\n');
}

function loadConfig() {
    try {
        config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        log('Config loaded: ' + config.name);
        return true;
    } catch(e) {
        log('Failed to load config: ' + e.message, 'ERROR');
        return false;
    }
}

function saveHeartbeat(key) {
    const heartbeat = {
        key: key,
        timestamp: Date.now(),
        date: new Date().toISOString()
    };
    fs.writeFileSync(HEARTBEAT_FILE, JSON.stringify(heartbeat, null, 2));
    log('Heartbeat saved: ' + heartbeat.date);
}

function getHeartbeat() {
    try {
        if (fs.existsSync(HEARTBEAT_FILE)) {
            return JSON.parse(fs.readFileSync(HEARTBEAT_FILE, 'utf8'));
        }
    } catch(e) {}
    return null;
}

function checkTimeout() {
    const hb = getHeartbeat();
    if (!hb) {
        log('No heartbeat found', 'WARN');
        return { status: 'no_heartbeat' };
    }
    
    const now = Date.now();
    const elapsed = (now - hb.timestamp) / 1000;
    const timeout = config.timing?.timeoutPeriod || 300;
    const grace = config.timing?.gracePeriod || 60;
    
    const remaining = timeout - elapsed;
    const graceRemaining = (timeout + grace) - elapsed;
    
    log(`Heartbeat age: ${Math.floor(elapsed)}s, Timeout: ${timeout}s, Remaining: ${Math.floor(remaining)}s`);
    
    if (remaining <= 0 && graceRemaining > 0) {
        return { status: 'grace_period', remaining: Math.floor(graceRemaining), message: 'In grace period' };
    } else if (graceRemaining <= 0) {
        return { status: 'timeout', message: 'Timeout + grace period expired - executing claim' };
    } else if (config.timing?.warningLevels) {
        const daysElapsed = elapsed / 86400;
        for (const warning of config.timing.warningLevels) {
            if (daysElapsed >= warning.days && daysElapsed < warning.days + 1) {
                return { status: 'warning', message: warning.message, remaining: Math.floor(remaining) };
            }
        }
    }
    
    return { status: 'ok', remaining: Math.floor(remaining) };
}

async function sendEmail(subject, body) {
    if (!config.notifications?.email?.enabled) return;
    
    const { smtp, recipients } = config.notifications.email;
    if (!smtp?.user || !recipients?.length) return;
    
    log(`[EMAIL] Would send: ${subject}`);
    // Email sending would be implemented here
}

async function sendTelegram(message) {
    if (!config.notifications?.telegram?.enabled) return;
    
    const { botToken, chatIds } = config.notifications.telegram;
    if (!botToken || !chatIds?.length) return;
    
    for (const chatId of chatIds) {
        log(`[TELEGRAM] Would send to ${chatId}: ${message}`);
        // Telegram sending would be implemented here
    }
}

async function releaseFiles() {
    if (!config.files?.enabled) return;
    
    const releasePath = config.files.releasePath;
    if (!fs.existsSync(releasePath)) {
        fs.mkdirSync(releasePath, { recursive: true });
    }
    
    log('[FILES] Releasing files to beneficiaries');
    
    for (const file of config.files.files || []) {
        const filePath = path.join(releasePath, file.name);
        if (fs.existsSync(filePath)) {
            log(`[FILES] Releasing: ${file.description} (${file.name})`);
        } else {
            log(`[FILES] File not found: ${file.name}`, 'WARN');
        }
    }
}

async function executeClaim() {
    log('[CLAIM] Executing automatic claim...');
    
    const owner = config.owner;
    const contract = config.contract;
    const beneficiaries = config.beneficiaries;
    
    if (!owner?.privateKey) {
        log('[CLAIM] No owner privateKey configured', 'ERROR');
        return false;
    }
    
    for (const beneficiary of beneficiaries) {
        log(`[CLAIM] Would transfer to: ${beneficiary.address}`);
    }
    
    await releaseFiles();
    await sendEmail('Auto-Lawyer Executed', 'The auto-lawyer has been executed. Funds and files have been released to beneficiaries.');
    await sendTelegram('Auto-Lawyer Executed! Funds and files released to beneficiaries.');
    
    log('[CLAIM] Claim execution complete');
    return true;
}

async function heartbeat(key) {
    if (key !== config.owner?.heartbeatKey) {
        log('Invalid heartbeat key', 'WARN');
        return { success: false, error: 'Invalid key' };
    }
    
    saveHeartbeat(key);
    return { success: true, message: 'Heartbeat recorded' };
}

function startMonitor() {
    const interval = (config.timing?.checkInterval || 60) * 1000;
    
    log(`Starting monitor with ${interval/1000}s interval`);
    
    setInterval(async () => {
        const status = checkTimeout();
        
        if (status.status === 'timeout') {
            log('[MONITOR] Timeout reached - executing claim', 'WARN');
            await executeClaim();
        } else if (status.status === 'warning') {
            log(`[MONITOR] ${status.message}`, 'WARN');
            await sendTelegram(`⚠️ Auto-Lawyer Warning: ${status.message}`);
        } else if (status.status === 'grace_period') {
            log(`[MONITOR] Grace period - ${status.remaining}s remaining`, 'WARN');
        }
    }, interval);
}

function showStatus() {
    const status = checkTimeout();
    console.log('\n=== Auto-Lawyer Status ===');
    console.log('Status:', status.status);
    if (status.remaining) console.log('Remaining:', status.remaining + 's');
    if (status.message) console.log('Message:', status.message);
    
    const hb = getHeartbeat();
    if (hb) {
        console.log('Last Heartbeat:', hb.date);
    }
    console.log('========================\n');
}

const args = process.argv.slice(2);
const command = args[0];

if (command === 'heartbeat' && args[1]) {
    loadConfig();
    heartbeat(args[1]).then(r => console.log(JSON.stringify(r)));
} else if (command === 'status') {
    loadConfig();
    showStatus();
} else if (command === 'execute') {
    loadConfig();
    executeClaim();
} else if (command === 'init') {
    console.log('Auto-Lawyer initialized. Run with "heartbeat <key>" to record heartbeat.');
    console.log('Run with "status" to check current status.');
} else {
    loadConfig();
    startMonitor();
}
