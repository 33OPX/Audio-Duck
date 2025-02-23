const musicTabSelect = document.getElementById("musicTabSelect");
const refreshTabsButton = document.getElementById("refreshTabs");

// Populate the dropdown list with tabs that have audio
function populateTabsList() {
  chrome.runtime.sendMessage({ action: "getTabsWithAudio" }, (tabs) => {
    musicTabSelect.innerHTML = '<option value="">Select Music Tab</option>';
    tabs.forEach((tab) => {
      const option = document.createElement("option");
      option.value = tab.id;
      option.text = `${tab.title} (${tab.url})`;
      musicTabSelect.appendChild(option);
    });
  });
}

// Set the selected tab as the music tab
musicTabSelect.addEventListener("change", () => {
  const tabId = parseInt(musicTabSelect.value);
  if (tabId) {
    chrome.runtime.sendMessage({ action: "setMusicTab", tabId });
  }
});

// Refresh the list of tabs
refreshTabsButton.addEventListener("click", () => {
  populateTabsList();
});

// Populate the list on popup load
populateTabsList();