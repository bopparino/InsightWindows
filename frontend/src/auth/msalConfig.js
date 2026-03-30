import { PublicClientApplication } from '@azure/msal-browser'

const clientId  = import.meta.env.VITE_AZURE_CLIENT_ID  || ''
const tenantId  = import.meta.env.VITE_AZURE_TENANT_ID  || ''

export const msalConfig = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: window.location.origin,   // must match App Registration redirect URI
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
}

// Scopes for ID token only — we don't need Graph API access.
// redirectUri points to the lightweight bridge page so the popup never loads the full SPA.
export const loginRequest = {
  scopes: ['openid', 'profile', 'email'],
  redirectUri: window.location.origin + '/auth-redirect.html',
}

// Singleton MSAL instance — initialised once, reused across the app
export const msalInstance = clientId
  ? new PublicClientApplication(msalConfig)
  : null

// Initialize exactly once and cache the promise — calling initialize()
// multiple times causes the interaction_in_progress error in MSAL v3
let _initPromise = null
export function getMsalInstance() {
  if (!msalInstance) return Promise.resolve(null)
  if (!_initPromise) {
    _initPromise = msalInstance.initialize().then(() => msalInstance)
  }
  return _initPromise
}
