import { broadcastResponseToMainFrame } from '@azure/msal-browser/redirect-bridge'

// This module is loaded only by auth-redirect.html (the popup's redirect page).
// It reads the auth code from the URL, sends it to the parent window via
// BroadcastChannel, and then closes the popup — all without loading the full app.
broadcastResponseToMainFrame().catch(() => {
  // If no auth response is in the URL (e.g. a direct visit), just close.
  try { window.close() } catch { /* ignore */ }
})
