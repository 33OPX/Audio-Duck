// Inject content script into a tab (safe to call repeatedly if content.js has the guard)
async function injectContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
    console.log(`Content script injected into tab ${tabId}`);
  } catch (err) {
    console.error("Failed to inject content script:", err.message);
  }
}

async function sendToMusicTab(tabId, action) {
  try {
    await chrome.tabs.sendMessage(tabId, { action });
  } catch (err) {
    console.error("Failed to send message to music tab:", err.message);
  }
}

// Compare audible tabs against the saved music tab and duck/restore as needed
async function checkAudio() {
  const { musicTabId, activeAudioTabId, silentTabs = [] } =
    await chrome.storage.session.get(["musicTabId", "activeAudioTabId", "silentTabs"]);
  if (!musicTabId) return;

  const audible = await chrome.tabs.query({ audible: true });
  // Ignore tabs that reported their media stopped, even if Chrome still says audible
  const other = audible.find((t) => t.id !== musicTabId && !silentTabs.includes(t.id));

  if (other && other.id !== activeAudioTabId) {
    console.log(`Audio detected in non-music tab: ${other.id} (${other.url})`);
    await chrome.storage.session.set({ activeAudioTabId: other.id });
    sendToMusicTab(musicTabId, "lowerVolume");
  } else if (!other && activeAudioTabId) {
    console.log("Audio stopped in non-music tab. Restoring music volume...");
    await chrome.storage.session.set({ activeAudioTabId: null });
    sendToMusicTab(musicTabId, "restoreVolume");
  }
}

async function setSilent(tabId, silent) {
  const { silentTabs = [] } = await chrome.storage.session.get("silentTabs");
  const set = new Set(silentTabs);
  silent ? set.add(tabId) : set.delete(tabId);
  await chrome.storage.session.set({ silentTabs: [...set] });
}

// Event-driven: runs only when a tab's audible state changes
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.audible === false) {
    await setSilent(tabId, false)
  }

  if (changeInfo.audible !== undefined) {
    checkAudio();
  }

  // Music tab reloaded/navigated: the content script is gone, so re-inject
  if (changeInfo.status === "complete") {
    const { musicTabId } = await chrome.storage.session.get("musicTabId");
    if (tabId === musicTabId) injectContentScript(tabId);
  }
});

// Music tab closed: forget it
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const { musicTabId } = await chrome.storage.session.get("musicTabId");
  if (tabId === musicTabId) {
    await chrome.storage.session.remove(["musicTabId", "activeAudioTabId"]);
    console.log("Music tab closed; cleared.");
  }
});

// Messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "setMusicTab") {
    chrome.storage.session
      .set({ musicTabId: message.tabId, activeAudioTabId: null })
      .then(() => {
        console.log(`Music tab set to ${message.tabId}`);
        return injectContentScript(message.tabId);
      })
      .then(() => sendResponse({ ok: true }));
    return true; // async response
  }

  if (message.action === "getTabs") {
    Promise.all([
      chrome.tabs.query({}),
      chrome.storage.session.get("musicTabId"),
    ]).then(([tabs, { musicTabId = null }]) => {
      sendResponse({ tabs, musicTabId });
    });
    return true; // async response
  }
  if (message.action === "mediaState" && sender.tab) {
    setSilent(sender.tab.id, !message.playing).then(checkAudio);
    return; // no response needed
  }
});