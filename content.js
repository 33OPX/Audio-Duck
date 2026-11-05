let audioContext = null;
let gainNode = null;
let mediaElement = null;
const RAMP_TIME = 0.3; // seconds
const LOW_VOLUME = 0.2;
const FULL_VOLUME = 1.0;

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

function rampGainTo(target, duration = RAMP_TIME) {
  if (!audioContext || !gainNode) {
    console.log("AudioContext or gainNode not initialized. Initializing...");
    initializeAudio();
  }

  if (!gainNode) {
    console.error("gainNode is not available.");
    return;
  }

  // Contexts can be suspended by autoplay policy; ramps don't advance while suspended
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  const now = audioContext.currentTime;
  const gain = gainNode.gain;

  // Clear any in-flight ramp, then anchor at the current value so the new ramp starts from where we are
  gain.cancelScheduledValues(now);
  gain.setValueAtTime(gain.value, now);
  gain.linearRampToValueAtTime(target, now + duration);
}

// Lower volume of the current tab
function lowerVolume() {
  rampGainTo(LOW_VOLUME);
  console.log("Volume lowering.");
}

// Restore volume of the current tab
function restoreVolume() {
  rampGainTo(FULL_VOLUME);
  console.log("Volume restoring.");
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
  sendResponse({ ok: true }); // reply so the port closes cleanly
});