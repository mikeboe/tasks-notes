import * as React from "react"
import {
  CircleCheck,
  Search,
  Video,
  MessageSquare,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavNotesDnd } from "@/components/nav-notes-dnd"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { NavFavorites } from "./nav-favorites"
import { NavUser } from "./nav-user"
import { useAuth } from "@/context/NewAuthContext"
import { useTeamContext } from "@/hooks/use-team-context"


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {

  const { user } = useAuth()
  const { teamId } = useTeamContext()

  // Build nav items with dynamic URLs based on team context
  const navMain = React.useMemo(() => [
    {
      title: "Search",
      url: "#",
      icon: Search,
    },
    {
      title: "Chat",
      url: teamId ? `/${teamId}/chat` : "/chat",
      icon: MessageSquare,
    },
    {
      title: "Tasks",
      url: teamId ? `/${teamId}/tasks` : "/tasks",
      icon: CircleCheck,
    },
    {
      title: "Recordings",
      url: teamId ? `/${teamId}/recordings` : "/recordings",
      icon: Video,
    },
    {
      title: "Collections",
      url: teamId ? `/${teamId}/collections` : "/collections",
      icon: Video,
    }
  ], [teamId])

  return (
    <Sidebar className="border-r-0" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
        <NavMain items={navMain} />
      </SidebarHeader>
      <SidebarContent>
        {/* <NavNotesDndTest /> */}
        <NavFavorites />

        <NavNotesDnd />
        {/* <NavWorkspaces workspaces={data.workspaces} />
        <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
