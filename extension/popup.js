// Aegis Bridge Popup Script
class BridgePopup {
  constructor() {
    this.init();
  }

  async init() {
    this.updateStatus();
    this.setupEventListeners();
    
    // Update status every 2 seconds
    setInterval(() => {
      this.updateStatus();
    }, 2000);
  }

  setupEventListeners() {
    document.getElementById('captureBtn').addEventListener('click', () => {
      this.captureCurrentState();
    });
    
    document.getElementById('testBtn').addEventListener('click', () => {
      this.testConnection();
    });
  }

  async updateStatus() {
    try {
      // Get badge text to determine connection status
      const badge = await chrome.action.getBadgeText({});
      const isConnected = badge === '✓';
      
      // Update status indicator
      const statusIndicator = document.getElementById('statusIndicator');
      const statusText = document.getElementById('statusText');
      
      if (isConnected) {
        statusIndicator.className = 'status-indicator connected';
        statusText.textContent = 'Connected';
      } else {
        statusIndicator.className = 'status-indicator disconnected';
        statusText.textContent = 'Disconnected';
      }
      
      // Get bridge health status
      try {
        const response = await fetch('http://127.0.0.1:5577/health');
        if (response.ok) {
          const health = await response.json();
          document.getElementById('bridgeStatus').textContent = health.status;
          document.getElementById('activeTabs').textContent = health.activeTabs;
        } else {
          document.getElementById('bridgeStatus').textContent = 'Error';
          document.getElementById('activeTabs').textContent = '-';
        }
      } catch (error) {
        document.getElementById('bridgeStatus').textContent = 'Offline';
        document.getElementById('activeTabs').textContent = '-';
      }
      
    } catch (error) {
      console.error('Error updating status:', error);
    }
  }

  async captureCurrentState() {
    try {
      // Get current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab) {
        // Send message to content script to capture current state
        await chrome.tabs.sendMessage(tab.id, {
          type: 'CAPTURE_STATE'
        });
        
        // Show feedback
        const btn = document.getElementById('captureBtn');
        const originalText = btn.textContent;
        btn.textContent = 'Captured!';
        btn.disabled = true;
        
        setTimeout(() => {
          btn.textContent = originalText;
          btn.disabled = false;
        }, 2000);
      }
    } catch (error) {
      console.error('Error capturing state:', error);
      alert('Failed to capture current state. Make sure you are on a supported site.');
    }
  }

  async testConnection() {
    try {
      const btn = document.getElementById('testBtn');
      btn.textContent = 'Testing...';
      btn.disabled = true;
      
      // Test bridge connection
      const response = await fetch('http://127.0.0.1:5577/health');
      
      if (response.ok) {
        const health = await response.json();
        alert(`Bridge is healthy!\nUptime: ${Math.round(health.uptime / 1000)}s\nActive connections: ${health.activeConnections}\nActive tabs: ${health.activeTabs}`);
      } else {
        alert('Bridge is not responding properly.');
      }
    } catch (error) {
      alert('Cannot connect to bridge. Make sure it is running on http://127.0.0.1:5577');
    } finally {
      const btn = document.getElementById('testBtn');
      btn.textContent = 'Test Connection';
      btn.disabled = false;
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new BridgePopup();
});