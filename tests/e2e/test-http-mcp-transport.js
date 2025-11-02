#!/usr/bin/env node

/**
 * E2E test for HTTP MCP transport
 * Tests that the HTTP server starts correctly and responds to MCP requests
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MCP_SERVER_PATH = join(__dirname, '../../dist/index.js');
const HTTP_PORT = 3001; // Use different port to avoid conflicts
const SERVER_URL = `http://localhost:${HTTP_PORT}/mcp`;

let mcpServerProcess = null;

async function startMCPServer() {
  console.log('🚀 Starting MCP server with HTTP transport...');
  
  mcpServerProcess = spawn('node', [MCP_SERVER_PATH, '--http-only', '--http-port', String(HTTP_PORT)], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false
  });

  let serverReady = false;
  let serverOutput = '';
  let serverError = '';

  mcpServerProcess.stdout.on('data', (data) => {
    serverOutput += data.toString();
    if (data.toString().includes('HTTP server running')) {
      serverReady = true;
    }
  });

  mcpServerProcess.stderr.on('data', (data) => {
    serverError += data.toString();
    if (data.toString().includes('HTTP server running')) {
      serverReady = true;
    }
  });

  // Wait for server to be ready (max 10 seconds)
  for (let i = 0; i < 20; i++) {
    await setTimeout(500);
    if (serverReady) {
      console.log('✅ MCP server started successfully');
      console.log(`📡 Server output: ${serverOutput}${serverError}`);
      return true;
    }
  }

  throw new Error(`Server failed to start. Output: ${serverOutput}, Error: ${serverError}`);
}

async function testMCPServer() {
  console.log('\n🧪 Testing MCP HTTP endpoint...');

  // Test 1: Initialize connection
  console.log('  Test 1: Initialize MCP connection');
  try {
    const initResponse = await fetch(SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'test-client',
            version: '1.0.0'
          }
        }
      })
    });

    if (!initResponse.ok) {
      throw new Error(`Initialize failed: ${initResponse.status} ${initResponse.statusText}`);
    }

    const initData = await initResponse.json();
    console.log(`    ✅ Initialize successful: ${JSON.stringify(initData).substring(0, 100)}...`);
  } catch (error) {
    console.error(`    ❌ Initialize failed: ${error.message}`);
    throw error;
  }

  // Test 2: List tools
  console.log('  Test 2: List MCP tools');
  try {
    const toolsResponse = await fetch(SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
      })
    });

    if (!toolsResponse.ok) {
      throw new Error(`List tools failed: ${toolsResponse.status} ${toolsResponse.statusText}`);
    }

    const toolsData = await toolsResponse.json();
    if (toolsData.result && toolsData.result.tools && Array.isArray(toolsData.result.tools)) {
      console.log(`    ✅ List tools successful: Found ${toolsData.result.tools.length} tools`);
      console.log(`    📋 Tools: ${toolsData.result.tools.slice(0, 3).map(t => t.name).join(', ')}${toolsData.result.tools.length > 3 ? '...' : ''}`);
    } else {
      throw new Error('Invalid tools response format');
    }
  } catch (error) {
    console.error(`    ❌ List tools failed: ${error.message}`);
    throw error;
  }

  // Test 3: Call a tool (rec_list)
  console.log('  Test 3: Call MCP tool (rec_list)');
  try {
    const callResponse = await fetch(SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'rec_list',
          arguments: {}
        }
      })
    });

    if (!callResponse.ok) {
      throw new Error(`Call tool failed: ${callResponse.status} ${callResponse.statusText}`);
    }

    const callData = await callResponse.json();
    console.log(`    ✅ Call tool successful`);
    if (callData.result) {
      console.log(`    📦 Result: ${JSON.stringify(callData.result).substring(0, 150)}...`);
    }
  } catch (error) {
    console.error(`    ❌ Call tool failed: ${error.message}`);
    throw error;
  }

  console.log('\n✅ All HTTP MCP transport tests passed!');
}

async function stopMCPServer() {
  if (mcpServerProcess) {
    console.log('\n🛑 Stopping MCP server...');
    mcpServerProcess.kill();
    await setTimeout(1000); // Wait for cleanup
    console.log('✅ Server stopped');
  }
}

async function main() {
  try {
    await startMCPServer();
    await setTimeout(2000); // Give server time to fully initialize
    await testMCPServer();
  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);
    process.exit(1);
  } finally {
    await stopMCPServer();
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  await stopMCPServer();
  process.exit(0);
});

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

