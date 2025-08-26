// Aegis Collaboration Bridge - Service Worker
class BridgeServiceWorker {
  constructor() {
    this.socket = null;
    this.tabs = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.token = 'supersecret123'; // Should be configurable
    
    this.init();
  }

  async init() {
    // Initialize badge
    await this.updateBadge('disconnected');
    
    // Connect to bridge
    this.connect();
    
    // Listen for messages from content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender);
    });
    
    // Handle tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        this.updateTabInfo(tabId, tab);
      }
    });
    
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.tabs.delete(tabId);
    });
  }

  connect() {
    try {
      console.log('Connecting to bridge...');
      this.socket = new WebSocket(`ws://127.0.0.1:5577/ws?token=${this.token}`);
      
      this.socket.onopen = () => {
        console.log('Connected to bridge');
        this.reconnectAttempts = 0;
        this.updateBadge('connected');
        
        // Register all current tabs
        this.registerTabs();
      };
      
      this.socket.onmessage = (event) => {
        this.handleBridgeMessage(JSON.parse(event.data));
      };
      
      this.socket.onclose = () => {
        console.log('Disconnected from bridge');
        this.updateBadge('disconnected');
        this.scheduleReconnect();
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
    } catch (error) {
      console.error('Failed to connect:', error);
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
      setTimeout(() => this.connect(), delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  async registerTabs() {
    const tabs = await chrome.tabs.query({
      url: [
        'https://chat.openai.com/*',
        'https://claude.ai/*',
        'https://gemini.google.com/*'
      ]
    });
    
    for (const tab of tabs) {
      this.updateTabInfo(tab.id, tab);
    }
  }

  updateTabInfo(tabId, tab) {
    const provider = this.getProviderFromUrl(tab.url);
    if (provider) {
      this.tabs.set(tabId, {
        id: tabId,
        url: tab.url,
        title: tab.title,
        provider: provider,
        connected: true,
        lastSeen: new Date().toISOString()
      });
    }
  }

  getProviderFromUrl(url) {
    if (url.includes('chat.openai.com')) return 'ChatGPT';
    if (url.includes('claude.ai')) return 'Claude';
    if (url.includes('gemini.google.com')) return 'Gemini';
    return null;
  }

  handleMessage(message, sender) {
    if (message.type === 'CAPTURE') {
      this.sendToBridge(message.payload, sender.tab.id);
    } else if (message.type === 'REGISTER_TAB') {
      this.updateTabInfo(sender.tab.id, sender.tab);
    }
  }

  handleBridgeMessage(message) {
    // Forward CMD and STREAM messages to the appropriate tab
    if (message.op === 'CMD' || message.op === 'STREAM') {
      const tabId = parseInt(message.tab);
      if (this.tabs.has(tabId)) {
        chrome.tabs.sendMessage(tabId, message).catch(error => {
          console.warn(`Failed to send message to tab ${tabId}:`, error);
        });
      }
    }
  }

  sendToBridge(message, tabId) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      // Add tab information to the message
      const tabInfo = this.tabs.get(tabId);
      if (tabInfo) {
        message.tab = tabId.toString();
        message.url = tabInfo.url;
        message.provider = tabInfo.provider;
        message.meta = {
          ...message.meta,
          tabTitle: tabInfo.title
        };
      }
      
      this.socket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  async updateBadge(status) {
    const badgeText = status === 'connected' ? '✓' : '✗';
    const badgeColor = status === 'connected' ? '#4CAF50' : '#F44336';
    
    await chrome.action.setBadgeText({ text: badgeText });
    await chrome.action.setBadgeBackgroundColor({ color: badgeColor });
  }
}

// Initialize the service worker
const bridgeWorker = new BridgeServiceWorker();