import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { UserManagement } from "./user-management";
import { ApiKeysSettings } from "./api-keys-settings";
import { TeamManagement } from "./team-management";
import { TaskStagesSettings } from "./task-stages-settings";
import { AppearanceSettings } from "./appearance-settings";
import { type User } from "@/types";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Users, Key, Layers, Columns3, Palette } from "lucide-react";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  currentUser: User | null;
}

type SettingsSection = "users" | "teams" | "task-stages" | "api-keys" | "appearance";

export function SettingsDialog({ open, onClose, currentUser }: SettingsDialogProps) {
  const isAdmin = currentUser?.role === 'admin';
  const [activeSection, setActiveSection] = React.useState<SettingsSection>("appearance");

  const navItems = [
    { id: "appearance" as const, name: "Appearance", icon: Palette },
    ...(isAdmin ? [{ id: "users" as const, name: "User Management", icon: Users }] : []),
    { id: "teams" as const, name: "Teams", icon: Layers },
    { id: "task-stages" as const, name: "Task Stages", icon: Columns3 },
    { id: "api-keys" as const, name: "API Keys", icon: Key },
  ];

  const getSectionTitle = (section: SettingsSection) => {
    const item = navItems.find(item => item.id === section);
    return item?.name || "Settings";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="overflow-hidden p-0 md:max-h-[600px] md:max-w-[900px] lg:max-w-[1000px]">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Customize your settings here.
        </DialogDescription>
        <SidebarProvider className="items-start">
          <Sidebar collapsible="none" className="hidden md:flex">
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {navItems.map((item) => (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          onClick={() => setActiveSection(item.id)}
                          isActive={item.id === activeSection}
                        >
                          <item.icon />
                          <span>{item.name}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <main className="flex h-[600px] flex-1 flex-col overflow-hidden">
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
              <div className="flex items-center gap-2 px-4">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href="#">Settings</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{getSectionTitle(activeSection)}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </header>
            <div className="flex flex-1 flex-col overflow-y-auto p-4 pt-0">
              {activeSection === "appearance" && <AppearanceSettings />}
              {activeSection === "users" && isAdmin && (
                <UserManagement />
              )}
              {activeSection === "teams" && <TeamManagement />}
              {activeSection === "task-stages" && <TaskStagesSettings />}
              {activeSection === "api-keys" && <ApiKeysSettings />}
            </div>
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  );
}
