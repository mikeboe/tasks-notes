
import React from "react";
// import { useAuth } from "@/context/NewAuthContext";

import { Outlet, useLocation,
  // useNavigate
  } from "react-router-dom";

// import { usePermissions } from "@/components/hooks/use-permissions";
import { AppSidebar } from "@/components/app-sidebar"
// import { NavActions } from "@/components/nav-actions"
import { NotesProvider, useNotes } from "@/context/NotesContext"
import { type Note } from "@/types/index"
import { useTeams } from "@/context/TeamContext"

import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbLink, BreadcrumbSeparator } from "../ui/breadcrumb";

const NavigationContent = () => {
  // const { user } = useAuth();
  // const { hasRole } = usePermissions(user?.role || null);
  // const navigate = useNavigate();
  const location = useLocation();
  const { notes } = useNotes();
  const { teams } = useTeams();

  // Helper function to find a note by ID in the tree
  const findNoteById = (noteId: string, notesList: (Note & { children: any[] })[]): (Note & { children: any[] }) | null => {
    for (const note of notesList) {
      if (note.id === noteId) {
        return note;
      }
      if (note.children && note.children.length > 0) {
        const found = findNoteById(noteId, note.children);
        if (found) return found;
      }
    }
    return null;
  };

  // Helper function to find a team by ID
  const findTeamById = (teamId: string) => {
    return teams.find(team => team.id === teamId);
  };

  // Create breadcrumbs from current path
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');

    // Check if the segment looks like a note ID and try to find the corresponding note
    const note = findNoteById(segment, notes);
    if (note) {
      return { path, label: note.title };
    }

    // Check if the segment is a team ID and try to find the corresponding team
    const team = findTeamById(segment);
    if (team) {
      return { path, label: team.name };
    }

    // Default: capitalize and format the segment
    const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
    return { path, label };
  });

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2">
          <div className="flex flex-1 items-center gap-2 px-3">
            <SidebarTrigger />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">Home</BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumbs.map((breadcrumb, index) => (
                  <React.Fragment key={breadcrumb.path}>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      {index === breadcrumbs.length - 1 ? (
                        <BreadcrumbPage className="line-clamp-1">
                          {breadcrumb.label}
                        </BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={breadcrumb.path}>
                          {breadcrumb.label}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          
        </header>
        <main className="min-h-adjusted">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

const Navigation = () => {
  return (
    <NotesProvider>
      <NavigationContent />
    </NotesProvider>
  );
};

export default Navigation;
