let musicTabId = null;
let activeAudioTabId = null; // Track the tab currently playing audio
let pollingInterval = null; // Interval for polling audio state

// Inject content script into a tab
function injectContentScript(tabId) {
  return new Promise((resolve) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabId },
        files: ["content.js"]
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error("Failed to inject content script:", chrome.runtime.lastError);
        } else {
          console.log(`Content script injected into tab ${tabId}`);
          resolve();
        }
      }
    );
  });
}

// Monitor all tabs for audio playback
function monitorTabs() {
  chrome.tabs.query({ audible: true }, (tabs) => {
    // Find the active audio tab (non-music tab)
    const activeTab = tabs.find((tab) => tab.id !== musicTabId);

    if (activeTab) {
      if (activeTab.id !== activeAudioTabId) {
        console.log(`Audio detected in non-music tab: ${activeTab.id} (${activeTab.url})`);
        activeAudioTabId = activeTab.id;
        lowerMusicVolume();
      }
    } else if (activeAudioTabId) {
      console.log("Audio stopped in non-music tab. Restoring music volume...");
      activeAudioTabId = null;
      restoreMusicVolume();
    }
  });
}

// Lower volume of the music tab
function lowerMusicVolume() {
  if (!musicTabId) return;

  chrome.tabs.sendMessage(musicTabId, { action: "lowerVolume" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Failed to send message to music tab:", chrome.runtime.lastError);
    }
  });
}

// Restore volume of the music tab
function restoreMusicVolume() {
  if (!musicTabId) return;

  chrome.tabs.sendMessage(musicTabId, { action: "restoreVolume" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Failed to send message to music tab:", chrome.runtime.lastError);
    }
  });
}

// Start polling for audio state
function startPolling() {
  if (pollingInterval) return; // Already polling

  pollingInterval = setInterval(() => {
    monitorTabs();
  }, 100); // Poll every 100ms
}

// Stop polling for audio state
function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

// Handle messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "setMusicTab") {
    musicTabId = message.tabId;
    console.log(`Music tab set to ${musicTabId}`);
    injectContentScript(musicTabId); // Inject content script into the music tab
    startPolling(); // Start polling for audio state
  } else if (message.action === "getTabsWithAudio") {
    chrome.tabs.query({ audible: true }, (tabs) => {
      sendResponse(tabs);
    });
    return true; // Required for async response
  }
});

// Stop polling when the extension is unloaded
chrome.runtime.onSuspend.addListener(() => {
  stopPolling();
});