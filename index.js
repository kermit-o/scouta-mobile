// Custom entry: set up globals BEFORE Expo Router evaluates route modules.
// Import order matters — `./polyfills` (DOMException) must run before
// `@livekit/react-native` so its WebRTC polyfills can load on Hermes.
import "./polyfills";
import { registerGlobals } from "@livekit/react-native";

registerGlobals();

// Load the Expo Router app entry only after globals are ready.
require("expo-router/entry");
