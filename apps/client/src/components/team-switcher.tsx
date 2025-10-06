"use client"

import * as React from "react"
import { ChevronDown, Plus, User } from "lucide-react"
import { useTeams } from "@/context/TeamContext"
import { useTeamContext } from "@/hooks/use-team-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
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
  const [newTeamName, setNewTeamName] = React.useState("")
  const [isCreating, setIsCreating] = React.useState(false)

  // Determine active team/context
  const activeTeam = teams.find(t => t.id === teamId) || null
  const activeLabel = activeTeam ? activeTeam.name : "Personal"

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      toast.error("Team name is required")
      return
    }

    try {
      setIsCreating(true)
      const newTeam = await createTeam(newTeamName)
      toast.success(`Team "${newTeam.name}" created successfully`)
      setIsCreateDialogOpen(false)
      setNewTeamName("")
      // Switch to the new team
      switchTeam(newTeam.id)
    } catch (error) {
      console.error("Failed to create team:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create team")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton className="w-fit px-1.5">
                <div className="flex aspect-square size-5 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                  <User className="size-3" />
                </div>
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
                  {teams.map((team) => (
                    <DropdownMenuItem
                      key={team.id}
                      onClick={() => switchTeam(team.id)}
                      className="gap-2 p-2"
                    >
                      <div className="flex size-6 items-center justify-center rounded-sm border">
                        <User className="size-4 shrink-0" />
                      </div>
                      {team.name}
                      {team.id === teamId && <DropdownMenuShortcut>✓</DropdownMenuShortcut>}
                    </DropdownMenuItem>
                  ))}
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

      {/* Create Team Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
            <DialogDescription>
              Create a new team to collaborate with others.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="team-name">Team Name</Label>
              <Input
                id="team-name"
                placeholder="Enter team name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateTeam()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false)
                setNewTeamName("")
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateTeam} disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
