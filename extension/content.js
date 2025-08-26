// Aegis Collaboration Bridge - Content Script
class BridgeContentScript {
  constructor() {
    this.provider = this.getProvider();
    this.observer = null;
    this.lastSelection = '';
    this.lastContext = '';
    this.debounceTimer = null;
    this.isCapturing = false;
    
    this.init();
  }

  getProvider() {
    if (window.location.hostname.includes('chat.openai.com')) return 'ChatGPT';
    if (window.location.hostname.includes('claude.ai')) return 'Claude';
    if (window.location.hostname.includes('gemini.google.com')) return 'Gemini';
    return 'Generic';
  }

  init() {
    // Register this tab
    chrome.runtime.sendMessage({
      type: 'REGISTER_TAB',
      payload: {
        url: window.location.href,
        title: document.title,
        provider: this.provider
      }
    });

    // Set up DOM observation
    this.setupObserver();
    
    // Set up selection capture
    this.setupSelectionCapture();
    
    // Set up keyboard shortcuts
    this.setupKeyboardShortcuts();
    
    // Listen for messages from service worker
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message);
    });
    
    // Initial capture after page load
    setTimeout(() => {
      this.captureCurrentState();
    }, 2000);
  }

  setupObserver() {
    // Observe DOM changes to detect new messages
    this.observer = new MutationObserver((mutations) => {
      if (this.isCapturing) return;
      
      let hasRelevantChanges = false;
      
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          // Check if new messages were added
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (this.isMessageElement(node)) {
                hasRelevantChanges = true;
                break;
              }
            }
          }
        }
      }
      
      if (hasRelevantChanges) {
        this.debounceCapture();
      }
    });
    
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  isMessageElement(element) {
    const selectors = {
      'ChatGPT': '[data-message-author-role]',
      'Claude': '[data-testid="message"]',
      'Gemini': '[data-message-container]'
    };
    
    const selector = selectors[this.provider];
    if (!selector) return false;
    
    return element.matches(selector) || element.querySelector(selector);
  }

  setupSelectionCapture() {
    document.addEventListener('selectionchange', () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        this.lastSelection = selection.toString().trim();
        this.captureSelection();
      }
    });
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Alt+M: Send current selection to OWUI
      if (event.altKey && event.key === 'm') {
        event.preventDefault();
        this.sendSelectionToOWUI();
      }
      
      // Alt+R: Recall last model reply
      if (event.altKey && event.key === 'r') {
        event.preventDefault();
        this.recallLastReply();
      }
    });
  }

  debounceCapture() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      this.captureCurrentState();
    }, 1000);
  }

  captureCurrentState() {
    this.isCapturing = true;
    
    try {
      const context = this.extractContext();
      const selection = this.lastSelection;
      
      if (context || selection) {
        this.sendCapture({
          selection,
          context,
          role: 'user'
        });
      }
    } finally {
      this.isCapturing = false;
    }
  }

  extractContext() {
    const selectors = {
      'ChatGPT': '.markdown, [data-message-author-role]',
      'Claude': '[data-testid="message"] .markdown, [data-testid="message"]',
      'Gemini': '[data-message-container] .markdown, [data-message-container]'
    };
    
    const selector = selectors[this.provider];
    if (!selector) return '';
    
    const elements = document.querySelectorAll(selector);
    const messages = Array.from(elements).slice(-6); // Last 6 messages for context
    
    return messages.map(el => el.textContent?.trim()).filter(Boolean).join('\n\n');
  }

  captureSelection() {
    if (this.lastSelection) {
      this.sendCapture({
        selection: this.lastSelection,
        context: this.extractContext(),
        role: 'user'
      });
    }
  }

  sendSelectionToOWUI() {
    if (this.lastSelection) {
      this.sendCapture({
        selection: this.lastSelection,
        context: this.extractContext(),
        role: 'user'
      });
    }
  }

  recallLastReply() {
    // This would need to be implemented based on the specific site structure
    // For now, we'll just capture the current state
    this.captureCurrentState();
  }

  sendCapture(payload) {
    const message = {
      v: 1,
      op: 'PUSH',
      src: 'ext',
      tab: '', // Will be set by service worker
      url: window.location.href,
      provider: this.provider,
      ts: new Date().toISOString(),
      body: payload,
      meta: {
        model: 'gpt-4',
        lang: document.documentElement.lang || 'en',
        tabTitle: document.title
      }
    };
    
    chrome.runtime.sendMessage({
      type: 'CAPTURE',
      payload: message
    });
  }

  handleMessage(message) {
    switch (message.op) {
      case 'CMD':
        this.handleCommand(message);
        break;
      case 'STREAM':
        this.handleStream(message);
        break;
      default:
        console.log('Unknown message operation:', message.op);
    }
  }

  handleCommand(message) {
    const { action, text, selector } = message.body;
    
    switch (action) {
      case 'inject':
        this.injectText(text, selector);
        break;
      case 'replace':
        this.replaceText(text, selector);
        break;
      case 'focus':
        this.focusElement(selector);
        break;
      case 'click':
        this.clickElement(selector);
        break;
      default:
        console.warn('Unknown action:', action);
    }
  }

  handleStream(message) {
    const { delta } = message.body;
    if (delta) {
      this.appendToInput(delta);
    }
  }

  injectText(text, selector) {
    const element = this.findInputElement(selector);
    if (element) {
      if (element.tagName === 'TEXTAREA' || element.contentEditable === 'true') {
        const currentValue = element.value || element.textContent || '';
        element.value = currentValue + text;
        element.textContent = currentValue + text;
        
        // Trigger input event
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }

  replaceText(text, selector) {
    const element = this.findInputElement(selector);
    if (element) {
      if (element.tagName === 'TEXTAREA' || element.contentEditable === 'true') {
        element.value = text;
        element.textContent = text;
        
        // Trigger input event
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }

  appendToInput(text) {
    const selectors = {
      'ChatGPT': 'textarea[data-id="root"], [contenteditable="true"]',
      'Claude': 'textarea, [contenteditable="true"]',
      'Gemini': 'textarea, [contenteditable="true"]'
    };
    
    const selector = selectors[this.provider];
    const element = this.findInputElement(selector);
    
    if (element) {
      const currentValue = element.value || element.textContent || '';
      element.value = currentValue + text;
      element.textContent = currentValue + text;
      
      // Trigger input event
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  focusElement(selector) {
    const element = this.findInputElement(selector);
    if (element) {
      element.focus();
    }
  }

  clickElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
      element.click();
    }
  }

  findInputElement(selector) {
    if (selector) {
      return document.querySelector(selector);
    }
    
    // Default selectors per provider
    const defaultSelectors = {
      'ChatGPT': 'textarea[data-id="root"], [contenteditable="true"]',
      'Claude': 'textarea, [contenteditable="true"]',
      'Gemini': 'textarea, [contenteditable="true"]'
    };
    
    const defaultSelector = defaultSelectors[this.provider];
    return document.querySelector(defaultSelector);
  }
}

// Initialize the content script
const bridgeContent = new BridgeContentScript();