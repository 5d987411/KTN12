#!/usr/bin/env node
/**
 * Kaspa gRPC Transaction Sender
 * Uses gRPC (port 16210) - stable connection
 * 
 * This is a proof-of-concept - full implementation needs proper tx signing
 * 
 * Usage: node send-grpc.js <private_key> <recipient_address> <amount_kas>
 */

const { Client } = require('./node_modules/@kaspa/grpc');

const GRPC_HOST = 'localhost:16210';

// Test basic gRPC connectivity
async function testGrpc() {
    console.log('Testing gRPC connection...');
    const client = new Client(GRPC_HOST);
    
    return new Promise((resolve, reject) => {
        client.connect();
        
        client.onConnect(() => {
            console.log('Connected to gRPC!');
            
            // Try a simple call - getInfo
            const cmd = {
                getInfoRequest: {}
            };
            
            // Check if there's a method to call
            console.log('Client methods:', Object.keys(client).filter(k => k.includes('get') || k.includes('submit')));
            
            client.close();
            resolve();
        });
        
        client.onConnectFailure((err) => {
            console.error('Connection failed:', err);
            reject(err);
        });
        
        setTimeout(() => {
            client.close();
            reject(new Error('Timeout'));
        }, 10000);
    });
}

testGrpc()
    .then(() => console.log('Test complete'))
    .catch(e => console.error('Error:', e.message));
