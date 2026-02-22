// KTN12 Dashboard Configuration
// Edit these values for your environment
// Or set environment variables before starting

const path = require('path');
const fs = require('fs');

// Get the dashboard directory (where this config.js is located)
const dashboardDir = __dirname;

// Try to find ktn12 root (parent of dashboard-tn12)
const ktn12Dir = path.join(dashboardDir, '..');

// Get config from environment or use defaults
function getConfig(envVar, defaultVal) {
    return process.env[envVar] || defaultVal;
}

module.exports = {
    // Base directories
    ktn12Dir: getConfig('KTN12_DIR', ktn12Dir),
    rustyKaspaDir: getConfig('RUSTY_KASPA_DIR', path.join(process.env.HOME || '/home/user', 'rusty-kaspa-tn12')),
    
    // Binaries - adjust path to your rusty-kaspa-tn12 build
    rothschild: getConfig('ROTHSCHILD_BIN', path.join(process.env.HOME || '/home/user', 'rusty-kaspa-tn12/target/release/rothschild')),
    
    // Log files - default to ktn12 directory
    kaspadLog: getConfig('KASPAD_LOG', path.join(ktn12Dir, 'kaspad.log')),
    minerLog: getConfig('MINER_LOG', path.join(ktn12Dir, 'miner.log')),
    rothschildLog: getConfig('ROTHSCHILD_LOG', path.join(ktn12Dir, 'rothschild.log')),
    
    // Ports
    rpcPort: parseInt(getConfig('RPC_PORT', '16210')),
    p2pPort: parseInt(getConfig('P2P_PORT', '16311')),
    dashboardPort: parseInt(getConfig('DASHBOARD_PORT', '3001')),
    
    // Default mining address (user must set this!)
    miningAddress: getConfig('MINING_ADDRESS', ''),
    
    // Miner threads
    minerThreads: parseInt(getConfig('MINER_THREADS', '8'))
};
