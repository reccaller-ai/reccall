#!/usr/bin/env node

/**
 * Post-install script for RecCall npm package
 * Automatically configures Cursor, VSCode, and Warp integrations after npm install
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir, platform } from 'os';
import { execSync } from 'child_process';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Detect platform and set config paths
function detectPlatformConfigs() {
  const os = platform();
  const home = homedir();
  
  let cursorConfigDir, cursorConfigFile, vscodeConfigDir, warpConfigDir;
  
  switch (os) {
    case 'darwin':
      cursorConfigDir = join(home, '.cursor');
      cursorConfigFile = join(cursorConfigDir, 'mcp.json');
      vscodeConfigDir = join(home, 'Library', 'Application Support', 'Code', 'User');
      warpConfigDir = join(home, '.warp');
      break;
    case 'linux':
      cursorConfigDir = join(home, '.cursor');
      cursorConfigFile = join(cursorConfigDir, 'mcp.json');
      vscodeConfigDir = join(home, '.config', 'Code', 'User');
      warpConfigDir = join(home, '.warp');
      break;
    case 'win32':
      const appData = process.env.APPDATA || '';
      cursorConfigDir = join(appData, 'Cursor', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings');
      cursorConfigFile = join(cursorConfigDir, 'cline_mcp_settings.json');
      vscodeConfigDir = join(appData, 'Code', 'User');
      warpConfigDir = join(appData, 'Warp');
      break;
    default:
      log(`⚠️  Unsupported platform: ${os}`, colors.yellow);
      return null;
  }
  
  return { cursorConfigDir, cursorConfigFile, vscodeConfigDir, warpConfigDir };
}

// Backup existing config
function backupConfig(configFile) {
  if (existsSync(configFile)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `${configFile}.backup.${timestamp}`;
    try {
      writeFileSync(backupFile, readFileSync(configFile, 'utf-8'));
      log(`📋 Backed up existing config to: ${backupFile}`, colors.blue);
      return true;
    } catch (error) {
      log(`⚠️  Could not backup config: ${error.message}`, colors.yellow);
      return false;
    }
  }
  return false;
}

// Create or update Cursor MCP configuration
function configureCursor(configFile, configDir) {
  try {
    // Create config directory if it doesn't exist
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }
    
    let config = {};
    let needsUpdate = false;
    
    // Read existing config if it exists
    if (existsSync(configFile)) {
      try {
        const content = readFileSync(configFile, 'utf-8');
        config = JSON.parse(content);
      } catch (error) {
        log(`⚠️  Existing config is invalid JSON, will create new config`, colors.yellow);
        backupConfig(configFile);
        config = {};
      }
    }
    
    // Check if reccall server is already configured
    const existingReccall = config.mcpServers?.reccall;
    const expectedConfig = {
      command: 'reccall-mcp',
      args: ['--stdio-only']
    };
    
    // Check if configuration needs updating
    if (!existingReccall || 
        existingReccall.command !== expectedConfig.command ||
        JSON.stringify(existingReccall.args || []) !== JSON.stringify(expectedConfig.args)) {
      needsUpdate = true;
      
      // Initialize mcpServers if it doesn't exist
      if (!config.mcpServers) {
        config.mcpServers = {};
      }
      
      // Backup if updating existing
      if (existingReccall) {
        backupConfig(configFile);
        log(`🔄 Updating existing RecCall configuration...`, colors.blue);
      }
      
      // Update/Add reccall server configuration
      config.mcpServers.reccall = expectedConfig;
      
      // Write updated config
      writeFileSync(configFile, JSON.stringify(config, null, 2) + '\n');
      log(`✅ Cursor configuration ${existingReccall ? 'updated' : 'created'} successfully!`, colors.green);
      log(`   Config file: ${configFile}`, colors.blue);
      return true;
    } else {
      log(`✅ Cursor configuration already up to date`, colors.green);
      return false;
    }
  } catch (error) {
    log(`❌ Error configuring Cursor: ${error.message}`, colors.red);
    return false;
  }
}

// Configure VSCode extension
function configureVSCode(vscodeConfigDir) {
  try {
    // Check if code command exists
    try {
      execSync('code --version', { stdio: 'ignore' });
      log(`ℹ️  VSCode extension: Install manually from repository if needed`, colors.blue);
    } catch {
      log(`⚠️  VSCode CLI not found. Skipping VSCode extension installation.`, colors.yellow);
    }
    return false;
  } catch (error) {
    log(`⚠️  Could not configure VSCode: ${error.message}`, colors.yellow);
    return false;
  }
}

// Configure Warp terminal
function configureWarp(warpConfigDir) {
  try {
    if (!existsSync(warpConfigDir)) {
      log(`⚠️  Warp terminal not found. Skipping Warp configuration.`, colors.yellow);
      return false;
    }
    
    // Warp integration would require copying a script
    // For npm install, we'll just inform the user
    log(`ℹ️  Warp integration: See documentation for setup instructions`, colors.blue);
    return false;
  } catch (error) {
    log(`⚠️  Could not configure Warp: ${error.message}`, colors.yellow);
    return false;
  }
}

// Main postinstall function
function main() {
  log('🚀 RecCall post-install configuration', colors.blue);
  log('=====================================\n', colors.blue);
  
  const configs = detectPlatformConfigs();
  if (!configs) {
    log('❌ Platform not supported for auto-configuration', colors.red);
    process.exit(1);
  }
  
  const { cursorConfigDir, cursorConfigFile, vscodeConfigDir, warpConfigDir } = configs;
  
  // Configure Cursor (primary integration)
  log('⚙️  Configuring Cursor IDE...', colors.blue);
  const cursorConfigured = configureCursor(cursorConfigFile, cursorConfigDir);
  
  // Try VSCode (optional)
  log('\n🔧 Checking VSCode...', colors.blue);
  configureVSCode(vscodeConfigDir);
  
  // Try Warp (optional)
  log('\n🔧 Checking Warp terminal...', colors.blue);
  configureWarp(warpConfigDir);
  
  // Summary
  log('\n✨ Post-install configuration complete!\n', colors.green);
  
  if (cursorConfigured) {
    log('📋 Next steps:', colors.blue);
    log('   1. Restart Cursor IDE completely (Cmd+Q / Alt+F4)', colors.yellow);
    log('   2. Open a new chat in Cursor', colors.yellow);
    log('   3. Try: rec_list or "List all my shortcuts"', colors.yellow);
    log('');
  }
  
  log('💡 RecCall CLI is available globally:', colors.blue);
  log('   • reccall list', colors.yellow);
  log('   • reccall rec <name> "<context>"', colors.yellow);
  log('   • reccall call <name>', colors.yellow);
  log('');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, configureCursor, detectPlatformConfigs };

