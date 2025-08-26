#!/usr/bin/env node

/**
 * Aegis Collaboration Bridge Demo
 * 
 * This script demonstrates the bridge functionality by:
 * 1. Starting the bridge daemon
 * 2. Connecting a test client
 * 3. Sending sample messages
 * 4. Showing the message flow
 */

const WebSocket = require('ws');
const fetch = require('node-fetch');

const BRIDGE_URL = 'http://127.0.0.1:5577';
const WS_URL = 'ws://127.0.0.1:5577/ws?token=supersecret123';

class BridgeDemo {
  constructor() {
    this.ws = null;
    this.messageCount = 0;
  }

  async start() {
    console.log('🚀 Starting Aegis Bridge Demo...\n');
    
    // Check if bridge is running
    await this.checkBridgeHealth();
    
    // Connect to WebSocket
    await this.connectWebSocket();
    
    // Run demo scenarios
    await this.runDemoScenarios();
    
    // Cleanup
    this.cleanup();
  }

  async checkBridgeHealth() {
    try {
      console.log('📡 Checking bridge health...');
      const response = await fetch(`${BRIDGE_URL}/health`);
      const health = await response.json();
      
      console.log(`✅ Bridge is healthy!`);
      console.log(`   Status: ${health.status}`);
      console.log(`   Uptime: ${Math.round(health.uptime / 1000)}s`);
      console.log(`   Active connections: ${health.activeConnections}`);
      console.log(`   Active tabs: ${health.activeTabs}\n`);
    } catch (error) {
      console.error('❌ Bridge is not running. Please start it first with: npm start');
      process.exit(1);
    }
  }

  connectWebSocket() {
    return new Promise((resolve, reject) => {
      console.log('🔌 Connecting to WebSocket...');
      
      this.ws = new WebSocket(WS_URL);
      
      this.ws.on('open', () => {
        console.log('✅ WebSocket connected!\n');
        resolve();
      });
      
      this.ws.on('message', (data) => {
        this.handleMessage(JSON.parse(data.toString()));
      });
      
      this.ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        reject(error);
      });
      
      this.ws.on('close', () => {
        console.log('🔌 WebSocket disconnected');
      });
    });
  }

  handleMessage(message) {
    this.messageCount++;
    console.log(`📨 Message #${this.messageCount} received:`);
    console.log(`   Operation: ${message.op}`);
    console.log(`   Source: ${message.src}`);
    console.log(`   Tab: ${message.tab}`);
    console.log(`   Provider: ${message.provider}`);
    
    if (message.body) {
      if (message.body.selection) {
        console.log(`   Selection: "${message.body.selection.substring(0, 50)}..."`);
      }
      if (message.body.text) {
        console.log(`   Text: "${message.body.text.substring(0, 50)}..."`);
      }
      if (message.body.delta) {
        console.log(`   Delta: "${message.body.delta}"`);
      }
    }
    console.log('');
  }

  async runDemoScenarios() {
    console.log('🎭 Running demo scenarios...\n');
    
    // Scenario 1: Simulate extension capturing text
    await this.demoCaptureScenario();
    
    // Scenario 2: Simulate OWUI response
    await this.demoResponseScenario();
    
    // Scenario 3: Simulate streaming response
    await this.demoStreamingScenario();
  }

  async demoCaptureScenario() {
    console.log('📝 Scenario 1: Extension capturing text...');
    
    const captureMessage = {
      v: 1,
      op: 'PUSH',
      src: 'ext',
      tab: 'demo-tab-123',
      url: 'https://chat.openai.com/',
      provider: 'ChatGPT',
      ts: new Date().toISOString(),
      body: {
        selection: 'This is a sample text selection for demonstration purposes.',
        context: 'Previous conversation context would be here...',
        role: 'user'
      },
      meta: {
        model: 'gpt-4',
        lang: 'en',
        tabTitle: 'ChatGPT - Demo'
      }
    };
    
    this.ws.send(JSON.stringify(captureMessage));
    await this.delay(1000);
  }

  async demoResponseScenario() {
    console.log('🤖 Scenario 2: OWUI sending response...');
    
    const responseMessage = {
      v: 1,
      op: 'CMD',
      src: 'owui',
      tab: 'demo-tab-123',
      url: 'https://chat.openai.com/',
      provider: 'ChatGPT',
      ts: new Date().toISOString(),
      body: {
        action: 'inject',
        text: 'This is a sample response from Open WebUI. It demonstrates how the bridge can inject text back into the page.',
        selector: 'textarea[data-id="root"]'
      },
      meta: {
        model: 'gpt-4',
        lang: 'en'
      }
    };
    
    this.ws.send(JSON.stringify(responseMessage));
    await this.delay(1000);
  }

  async demoStreamingScenario() {
    console.log('🌊 Scenario 3: OWUI streaming response...');
    
    const tokens = [
      'This', ' is', ' a', ' streaming', ' response', ' that', ' arrives', ' token', ' by', ' token', '.',
      ' It', ' demonstrates', ' real-time', ' text', ' injection', ' capabilities', ' of', ' the', ' bridge', '.'
    ];
    
    for (const token of tokens) {
      const streamMessage = {
        v: 1,
        op: 'STREAM',
        src: 'owui',
        tab: 'demo-tab-123',
        url: 'https://chat.openai.com/',
        provider: 'ChatGPT',
        ts: new Date().toISOString(),
        body: {
          delta: token
        },
        meta: {}
      };
      
      this.ws.send(JSON.stringify(streamMessage));
      await this.delay(100); // Simulate streaming delay
    }
    
    await this.delay(1000);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  cleanup() {
    console.log('🧹 Cleaning up...');
    if (this.ws) {
      this.ws.close();
    }
    console.log('✅ Demo completed!');
    console.log(`📊 Total messages processed: ${this.messageCount}`);
    process.exit(0);
  }
}

// Run the demo
const demo = new BridgeDemo();
demo.start().catch(error => {
  console.error('❌ Demo failed:', error);
  process.exit(1);
});