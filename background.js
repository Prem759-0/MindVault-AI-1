let activeTabId = null;
let activeTabStartTime = null;

// Initialize storage
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    visits: [],
    analytics: { totalTime: 0, tabSwitches: 0, doomscrollEvents: 0 },
    settings: { groqApiKey: '' }
  });
});

// Track when tabs become active
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await logPreviousTab();
  activeTabId = activeInfo.tabId;
  activeTabStartTime = Date.now();
  
  // Update tab switch count
  chrome.storage.local.get(['analytics'], (data) => {
    const analytics = data.analytics || { totalTime: 0, tabSwitches: 0, doomscrollEvents: 0 };
    analytics.tabSwitches += 1;
    chrome.storage.local.set({ analytics });
  });
});

// Track when a tab's URL updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tabId === activeTabId && changeInfo.status === 'complete') {
    activeTabStartTime = Date.now();
  }
});

async function logPreviousTab() {
  if (!activeTabId || !activeTabStartTime) return;

  const timeSpent = Date.now() - activeTabStartTime;
  if (timeSpent < 2000) return; // Ignore flashes

  try {
    const tab = await chrome.tabs.get(activeTabId);
    if (tab.url && !tab.url.startsWith('chrome://')) {
      chrome.storage.local.get(['visits', 'analytics'], (data) => {
        let visits = data.visits || [];
        let analytics = data.analytics || { totalTime: 0, tabSwitches: 0, doomscrollEvents: 0 };
        
        const visit = {
          url: tab.url,
          title: tab.title,
          favicon: tab.favIconUrl || '',
          timeSpent: timeSpent,
          timestamp: Date.now(),
          summary: "Open page to generate AI summary." // Updated via content script
        };

        visits.unshift(visit);
        // Keep only last 500 records to prevent memory bloat
        if (visits.length > 500) visits.pop(); 
        
        analytics.totalTime += timeSpent;

        chrome.storage.local.set({ visits, analytics });
      });
    }
  } catch (error) {
    console.log("Tab closed before logging", error);
  }
}

// Listen for messages from content script (summaries & doomscrolling)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PAGE_DATA' && sender.tab) {
    chrome.storage.local.get(['visits'], (data) => {
      let visits = data.visits || [];
      const currentVisitIndex = visits.findIndex(v => v.url === sender.tab.url);
      if (currentVisitIndex !== -1) {
        visits[currentVisitIndex].summary = message.summary;
        chrome.storage.local.set({ visits });
      }
    });
  }
  
  if (message.type === 'DOOMSCROLL_DETECTED') {
    chrome.storage.local.get(['analytics'], (data) => {
      let analytics = data.analytics || { totalTime: 0, tabSwitches: 0, doomscrollEvents: 0 };
      analytics.doomscrollEvents += 1;
      chrome.storage.local.set({ analytics });
    });
  }
});
