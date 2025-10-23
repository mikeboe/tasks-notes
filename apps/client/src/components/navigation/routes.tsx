import Index from "@/pages/Index";
import type { RouteElement } from "../../types/routes";
import NotFound from "@/pages/NotFound";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import ProtectedRoute from "../auth/ProtectedRoute";
import NotePage from "@/pages/note";
import TasksPage from "@/pages/tasks";
import TaskDetailPage from "@/pages/task-detail";
import RecordingsPage from "@/pages/recordings";
import RecordingDetailPage from "@/pages/recording-detail";
import RecordingPublicPage from "@/pages/recording-public";

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
  {
    path: "/recordings",
    element: <ProtectedRoute><RecordingsPage /></ProtectedRoute>,
    visible: true,
  },
  {
    path: "/recordings/:id",
    element: <ProtectedRoute><RecordingDetailPage /></ProtectedRoute>,
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
  {
    path: "/:teamId/recordings",
    element: <ProtectedRoute><RecordingsPage /></ProtectedRoute>,
    visible: true,
  },
  {
    path: "/:teamId/recordings/:id",
    element: <ProtectedRoute><RecordingDetailPage /></ProtectedRoute>,
    visible: true,
  },

  // Public routes
  {
    path: "/share/:shareToken",
    element: <RecordingPublicPage />,
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
