let audioContext = null;
let gainNode = null;
let mediaElement = null;

// Find the audio or video element
function findMediaElement() {
  const element = document.querySelector("audio, video");
  if (element) {
    console.log("Media element found:", element);
    return element;
  } else {
    console.error("No audio or video element found.");
    return null;
  }
}

// Initialize the audio context and gain node
function initializeAudio() {
  if (audioContext) {
    console.log("AudioContext already initialized.");
    return;
  }

  mediaElement = findMediaElement();
  if (!mediaElement) return;

  try {
    audioContext = new AudioContext();
    const source = audioContext.createMediaElementSource(mediaElement);
    gainNode = audioContext.createGain();

    source.connect(gainNode);
    gainNode.connect(audioContext.destination);

    console.log("Audio context initialized.");
  } catch (error) {
    console.error("Failed to set up AudioContext:", error);
  }
}

// Resume the audio context if suspended
function resumeAudioContext() {
  if (audioContext && audioContext.state === "suspended") {
    audioContext.resume().then(() => {
      console.log("AudioContext resumed.");
    });
  }
}

// Lower volume of the current tab
function lowerVolume() {
  if (!audioContext || !gainNode) {
    console.log("AudioContext or gainNode not initialized. Initializing...");
    initializeAudio();
  }

  if (gainNode) {
    gainNode.gain.value = 0.2; // Lower the volume to 20%
    console.log("Volume lowered.");
  } else {
    console.error("gainNode is not available.");
  }
}

// Restore volume of the current tab
function restoreVolume() {
  if (gainNode) {
    gainNode.gain.value = 1.0; // Restore the volume to 100%
    console.log("Volume restored.");
  } else {
    console.error("gainNode is not available.");
  }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received:", message);
  if (message.action === "lowerVolume") {
    resumeAudioContext();
    lowerVolume();
  } else if (message.action === "restoreVolume") {
    resumeAudioContext();
    restoreVolume();
  }
});