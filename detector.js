(() => {
  if (window.__duckDetector) return;
  window.__duckDetector = true;

  const anyPlaying = () =>
    [...document.querySelectorAll("audio, video")].some(
      (m) => !m.paused && !m.ended && !m.muted && m.volume > 0
    );

  function report() {
    chrome.runtime.sendMessage({ action: "mediaState", playing: anyPlaying() });
  }

  // Media events don't bubble, so listen in the capture phase
  for (const type of ["playing", "pause", "ended", "emptied"]) {
    document.addEventListener(type, () => setTimeout(report, 0), true);
  }
})();