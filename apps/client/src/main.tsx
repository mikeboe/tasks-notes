import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "@/context/NewAuthContext";
import { BrowserRouter } from "react-router-dom";
import { UserProvider } from "./context/UserContext.tsx";
import { TooltipProvider } from "./components/ui/tooltip.tsx";
import { NotesProvider } from "./context/NotesContext.tsx";
import { FavoritesProvider } from "./context/FavoritesContext.tsx";
import { TeamProvider } from "./context/TeamContext.tsx";
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "@/lib/msal-config";

// Initialize MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MsalProvider instance={msalInstance}>
      <AuthProvider>
        <BrowserRouter>
          <UserProvider>
            <TeamProvider>
              <TooltipProvider>
                <NotesProvider>
                  <FavoritesProvider>
                    <App />
                  </FavoritesProvider>
                </NotesProvider>
              </TooltipProvider>
            </TeamProvider>
          </UserProvider>
        </BrowserRouter>
      </AuthProvider>
    </MsalProvider>
  </StrictMode>
);
