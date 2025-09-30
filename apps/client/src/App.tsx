import {
  Outlet,
  Route,
  Routes,
  //useNavigate
} from "react-router-dom";
import { Toaster } from "react-hot-toast";

import { mainRoutes } from "./components/navigation/routes";
// import { useUserStore } from "./context/UserContext";
// import keycloak from "./keycloak";
import Navigation from "./components/navigation/navigation";

function App() {
  return (
    <>
      <Toaster
        position="bottom-center"
        reverseOrder={false}
        toastOptions={{
          duration: 3000,
          success: {
            icon: "👏",
          },
          error: {
            icon: "😢",
          },
        }}
      />
      <Routes>

        <Route element={<Outlet />}>
          {mainRoutes.map(
            (route) =>
              route.visible && (
                <>
                  {route.path !== "/signup" && route.path !== "/login" && route.path !== "/verify-email" ? (
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

      </Routes >
    </>
  );
}

export default App;
