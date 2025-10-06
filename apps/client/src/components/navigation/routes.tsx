import Index from "@/pages/Index";
import type { RouteElement } from "../../types/routes";
import NotFound from "@/pages/NotFound";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import ProtectedRoute from "../auth/ProtectedRoute";
import NotePage from "@/pages/note";
import TasksPage from "@/pages/tasks";
import TaskDetailPage from "@/pages/task-detail";

export const mainRoutes: RouteElement[] = [
  // Personal context routes
  {
    path: "/",
    element: <ProtectedRoute><Index /></ProtectedRoute>,
    visible: true,
  },
  {
    path: "/notes/:id",
    element: <ProtectedRoute><NotePage /></ProtectedRoute>,
    visible: true,
  },
  {
    path: "/tasks",
    element: <ProtectedRoute><TasksPage /></ProtectedRoute>,
    visible: true,
  },
  {
    path: "/tasks/:id",
    element: <ProtectedRoute><TaskDetailPage /></ProtectedRoute>,
    visible: true,
  },

  // Team context routes
  {
    path: "/:teamId",
    element: <ProtectedRoute><Index /></ProtectedRoute>,
    visible: true,
  },
  {
    path: "/:teamId/notes/:id",
    element: <ProtectedRoute><NotePage /></ProtectedRoute>,
    visible: true,
  },
  {
    path: "/:teamId/tasks",
    element: <ProtectedRoute><TasksPage /></ProtectedRoute>,
    visible: true,
  },
  {
    path: "/:teamId/tasks/:id",
    element: <ProtectedRoute><TaskDetailPage /></ProtectedRoute>,
    visible: true,
  },

  // Auth routes
  {
    path: "/signup",
    element: <RegisterPage />,
    visible: true,
  },
  {
    path: "/login",
    element: <LoginPage />,
    visible: true,
  },
  {
    path: "*",
    element: <NotFound />,
    visible: true,
  },
];
