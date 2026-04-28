// Polyfills required for livekit-client to run on Hermes (React Native).
// MUST be imported as the very first import in app/_layout.tsx, before any
// LiveKit module is loaded.

if (typeof (globalThis as any).DOMException === "undefined") {
  class DOMException extends Error {
    constructor(message?: string, name?: string) {
      super(message);
      this.name = name || "Error";
    }
  }
  (globalThis as any).DOMException = DOMException;
}
