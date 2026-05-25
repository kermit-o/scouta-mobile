// Must run before any @livekit/react-native (WebRTC) module is imported.
// On Hermes (release builds) `DOMException` isn't a global, and LiveKit's
// MediaRecorder polyfill references it at import time before LiveKit's own
// DOMException shim runs — crashing the app at startup. Define it first.
const g = typeof globalThis !== "undefined" ? globalThis : global;

if (typeof g.DOMException === "undefined") {
  g.DOMException = class DOMException extends Error {
    constructor(message, name) {
      super(message);
      this.name = name || "Error";
      this.message = message || "";
    }
  };
}
