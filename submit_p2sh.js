#!/usr/bin/env node
/**
 * Submit raw P2SH transaction via gRPC
 */

const { Client } = require('./node_modules/@kaspa/grpc');

const GRPC_HOST = 'localhost:16210';

const TX_JSON = {
  "version": 0,
  "inputs": [{
    "previousOutpoint": {
      "transactionId": "57a5922b9537efdf1b8cbe0ba40961a9a451e074a3a9fab57fe5132978cdf2a7",
      "index": 0
    },
    "signatureScript": "4241618cdf6f2ce63310ce24674f0a42bf7559b37673f59fb4bed1830656a0aa4f434509d9d17872d7b3a086b57e9fe91142b3de1cb6af972a02b12d73147d6b750b01210250e12ad7b54e2d3e3e5e709decbadf496e807002d34ca73229569b6b0a0dd969fdfe0076009c6375007920031b16cc186e03e441675dfdf67f6cf4836408d4474a8bf8eca07860ce9d449cac6900c200a06975516776519c63750079200250e12ad7b54e2d3e3e5e709decbadf496e8070002d34ca7322969b6b0a0dd9ac69025802b100c3200250e12ad7b54e2d3e3e5e709decbadf496e8070002d34ca7322969b6b0a0dd9030000207c7e01ac7e876900c2b9be9c6975516776529c6375007920031b16cc186e03e441675dfdf67f6cf4836408d4474a8bf8eca07860ce9d449cac6900c320031b16cc186e03e441675dfdf67f6cf4836408d4474a8bf8eca07860ce9d449c030000207c7e01ac7e876900c2b9be9c69755167750069686868",
    "sequence": 0
  }],
  "outputs": [{
    "value": "249999000",
    "scriptPublicKey": {
      "version": 0,
      "script": "210250e12ad7b54e2d3e3e5e709decbadf496e807002d34ca73229569b6b0a0dd969"
    }
  }],
  "lockTime": 0,
  "subnetworkId": "00000000000000000000000000000000000000000000000000000000c0ffee00",
  "gas": "0",
  "payload": ""
};

async function submitTransaction(client, tx) {
    const request = {
        transaction: tx,
        allowOrphan: false
    };
    
    try {
        const response = await client.call('submitTransactionRequest', request);
        return response;
    } catch (e) {
        console.error('Submit error:', e.message);
        throw e;
    }
}

async function main() {
    console.log('Connecting to gRPC...');
    const client = new Client(GRPC_HOST);
    client.connect();
    
    await new Promise((resolve) => {
        client.onConnect(resolve);
    });
    console.log('Connected!');
    
    console.log('Submitting P2SH claim transaction...');
    try {
        const result = await submitTransaction(client, TX_JSON);
        console.log('Success! Result:', JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
    
    client.close();
}

main();
