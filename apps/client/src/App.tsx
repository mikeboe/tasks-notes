import {
  Outlet,
  Route,
  Routes,
  //useNavigate
} from "react-router-dom";

import { mainRoutes } from "./components/navigation/routes";
// import { useUserStore } from "./context/UserContext";
// import keycloak from "./keycloak";
import Navigation from "./components/navigation/navigation";
import { ThemeProvider } from "./components/theme-provider";
import { ChatButton, ChatContainer } from "./components/chat";

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      
      <Routes>

        <Route element={<Outlet />}>
          {mainRoutes.map(
            (route) =>
              route.visible && (
                <>
                  {route.path !== "/signup" && route.path !== "/login" && route.path !== "/verify-email" && !route.path.startsWith("/share") ? (
                    <Route
                      key="navigation"
                      element={<Navigation />}
                    >
                      <Route
                        key={route.path}
                        path={route.path}
                        element={route.element}
                      />
                    </Route>
                  ) : (<Route
                    key={route.path}
                    path={route.path}
                    element={route.element}
                  />)}

                </>

              )
          )}
        </Route>

      </Routes>

      {/* Chat components */}
      <ChatButton />
      <ChatContainer />
    </ThemeProvider>
  );
}

export default App;
