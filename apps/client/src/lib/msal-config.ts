/**
 * Microsoft Entra ID (Azure AD) Authentication Configuration
 * Configure your Azure AD app settings here
 */

import { LogLevel } from "@azure/msal-browser";

/**
 * Configuration object to be passed to MSAL instance on creation.
 * For a full list of MSAL.js configuration parameters, visit:
 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/configuration.md
 */

// TODO: Replace these placeholders with your Azure AD app registration details
export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_ENTRA_CLIENT_ID || "YOUR_CLIENT_ID_HERE", // Application (client) ID from Azure portal
    authority: import.meta.env.VITE_ENTRA_AUTHORITY || "https://login.microsoftonline.com/YOUR_TENANT_ID_HERE", // Directory (tenant) ID
    redirectUri: import.meta.env.VITE_ENTRA_REDIRECT_URI || window.location.origin, // Must match registered redirect URI in Azure portal
    postLogoutRedirectUri: import.meta.env.VITE_ENTRA_POST_LOGOUT_REDIRECT_URI || window.location.origin,
  },
  cache: {
    cacheLocation: "localStorage", // This configures where your cache will be stored
    storeAuthStateInCookie: false, // Set this to "true" if you are having issues on IE11 or Edge
  },
  system: {
    loggerOptions: {
      loggerCallback: (level: any, message: any, containsPii: any) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Info:
            console.info(message);
            return;
          case LogLevel.Verbose:
            console.debug(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
        }
      },
    },
  },
};

/**
 * Scopes you add here will be prompted for user consent during sign-in.
 * By default, MSAL.js will add OIDC scopes (openid, profile, email) to any login request.
 */
export const loginRequest = {
  scopes: ["User.Read"], // Microsoft Graph API scope
};

/**
 * Add here the scopes to request when obtaining an access token for MS Graph API.
 */
export const graphConfig = {
  graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
};
