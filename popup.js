const musicTabSelect = document.getElementById("musicTabSelect");
const refreshTabsButton = document.getElementById("refreshTabs");

// Show just the hostname so long URLs don't widen the popup
function shortHost(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url || "";
  }
}

// List all tabs, audible ones first, and preselect the saved music tab
function populateTabsList() {
  chrome.runtime.sendMessage({ action: "getTabs" }, (res) => {
    if (chrome.runtime.lastError || !res) return;

    const previous = musicTabSelect.value;
    musicTabSelect.length = 1; // keep the placeholder, drop the rest

    const sorted = [...res.tabs].sort((a, b) => b.audible - a.audible);

    sorted.forEach((tab) => {
      const option = document.createElement("option");
      option.value = tab.id;
      option.text = `${tab.audible ? "🔊 " : ""}${tab.title} (${shortHost(tab.url)})`;
      musicTabSelect.appendChild(option);
    });

    // Saved music tab wins; otherwise keep whatever was selected before refresh
    const wanted = res.musicTabId ?? previous;
    if (wanted && [...musicTabSelect.options].some((o) => o.value === String(wanted))) {
      musicTabSelect.value = String(wanted);
    }
  });
}

// Set the selected tab as the music tab
musicTabSelect.addEventListener("change", () => {
  const tabId = parseInt(musicTabSelect.value, 10);
  if (tabId) {
    chrome.runtime.sendMessage({ action: "setMusicTab", tabId });
  }
});

// Refresh the list of tabs
refreshTabsButton.addEventListener("click", populateTabsList);

// Populate the list on popup load
populateTabsList();