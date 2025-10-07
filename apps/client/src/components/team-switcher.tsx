"use client"

import * as React from "react"
import { ChevronDown, Plus, User } from "lucide-react"
import { useTeams } from "@/context/TeamContext"
import { useTeamContext } from "@/hooks/use-team-context"
import { CreateTeamDialog, TEAM_ICONS } from "@/components/create-team-dialog"
import { toast } from "react-hot-toast"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function TeamSwitcher() {
  const { teams, switchTeam, createTeam } = useTeams()
  const { teamId } = useTeamContext()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [isCreating, setIsCreating] = React.useState(false)

  // Determine active team/context
  const activeTeam = teams.find(t => t.id === teamId) || null
  const activeLabel = activeTeam ? activeTeam.name : "Personal"

  const handleCreateTeam = async (data: { name: string; color: string; icon: string }) => {
    try {
      setIsCreating(true)
      const newTeam = await createTeam(data.name, data.color, data.icon)
      toast.success(`Team "${newTeam.name}" created successfully`)
      setIsCreateDialogOpen(false)
      // Switch to the new team
      switchTeam(newTeam.id)
    } catch (error) {
      console.error("Failed to create team:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create team")
    } finally {
      setIsCreating(false)
    }
  }

  const getTeamIcon = (iconName?: string) => {
    const icon = TEAM_ICONS.find((i) => i.name === iconName);
    return icon?.component || User;
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton className="w-fit px-1.5">
                {activeTeam?.color && activeTeam?.icon ? (
                  <div
                    className="flex aspect-square size-5 items-center justify-center rounded-md"
                    style={{ backgroundColor: activeTeam.color }}
                  >
                    {React.createElement(getTeamIcon(activeTeam.icon), { className: "size-3 text-white" })}
                  </div>
                ) : (
                  <div className="flex aspect-square size-5 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                    <User className="size-3" />
                  </div>
                )}
                <span className="truncate font-semibold">{activeLabel}</span>
                <ChevronDown className="opacity-50" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-64 rounded-lg"
              align="start"
              side="bottom"
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Workspaces
              </DropdownMenuLabel>

              {/* Personal workspace */}
              <DropdownMenuItem
                onClick={() => switchTeam(null)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-sm border">
                  <User className="size-4 shrink-0" />
                </div>
                Personal
                {!teamId && <DropdownMenuShortcut>✓</DropdownMenuShortcut>}
              </DropdownMenuItem>

              {/* Teams */}
              {teams.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Teams
                  </DropdownMenuLabel>
                  {teams.map((team) => {
                    const TeamIcon = getTeamIcon(team.icon);
                    return (
                      <DropdownMenuItem
                        key={team.id}
                        onClick={() => switchTeam(team.id)}
                        className="gap-2 p-2"
                      >
                        {team.color && team.icon ? (
                          <div
                            className="flex size-6 items-center justify-center rounded-sm"
                            style={{ backgroundColor: team.color }}
                          >
                            <TeamIcon className="size-4 shrink-0 text-white" />
                          </div>
                        ) : (
                          <div className="flex size-6 items-center justify-center rounded-sm border">
                            <User className="size-4 shrink-0" />
                          </div>
                        )}
                        {team.name}
                        {team.id === teamId && <DropdownMenuShortcut>✓</DropdownMenuShortcut>}
                      </DropdownMenuItem>
                    );
                  })}
                </>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 p-2"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                  <Plus className="size-4" />
                </div>
                <div className="font-medium text-muted-foreground">Add team</div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <CreateTeamDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreateTeam={handleCreateTeam}
        isCreating={isCreating}
      />
    </>
  )
}
