import * as React from "react"
import { useState, useEffect } from "react";
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import { TeamsApi, type Team } from "@/lib/teams-api"
import { toast } from "sonner";

interface TeamAssignmentComboboxProps {
  userId: string
  availableTeams: Team[]
  onTeamsChange: (teamIds: string[]) => void
}

export function TeamAssignmentCombobox({
  userId,
  availableTeams,
  onTeamsChange
}: TeamAssignmentComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Fetch user's current team memberships
  useEffect(() => {
    const fetchUserTeams = async () => {
      setIsLoading(true)
      try {
        // Get the user's teams from the API
        const userTeams = await TeamsApi.getUserTeams(userId)
        const userTeamIds = userTeams.map(team => team.id)
        setSelectedTeamIds(userTeamIds)
      } catch (error) {
        console.error("Failed to fetch user teams:", error)
        toast.error("Failed to load user's teams")
      } finally {
        setIsLoading(false)
      }
    }

    if (userId) {
      fetchUserTeams()
    }
  }, [userId])

  const selectedTeams = availableTeams.filter(team => selectedTeamIds.includes(team.id))
  const availableUnselectedTeams = availableTeams.filter(team => !selectedTeamIds.includes(team.id))

  const handleSelect = async (teamId: string) => {
    if (!selectedTeamIds.includes(teamId)) {
      setIsLoading(true)
      try {
        // Add user to team
        await TeamsApi.addTeamMember(teamId, { user_id: userId, role: 'member' })
        const newTeamIds = [...selectedTeamIds, teamId]
        setSelectedTeamIds(newTeamIds)
        onTeamsChange(newTeamIds)
        toast.success("User added to team")
      } catch (error) {
        toast.error("Failed to add user to team")
      } finally {
        setIsLoading(false)
      }
    }
    setOpen(false)
  }

  const handleRemove = async (teamId: string) => {
    setIsLoading(true)
    try {
      // Remove user from team
      await TeamsApi.removeTeamMember(teamId, userId)
      const newTeamIds = selectedTeamIds.filter(id => id !== teamId)
      setSelectedTeamIds(newTeamIds)
      onTeamsChange(newTeamIds)
      toast.success("User removed from team")
    } catch (error) {
      toast.error("Failed to remove user from team")
    } finally {
      setIsLoading(false)
    }
  }

  const filteredTeams = availableUnselectedTeams.filter(team => {
    const searchLower = searchValue.toLowerCase()
    return team.name.toLowerCase().includes(searchLower)
  })

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[200px] justify-between"
            size="sm"
            disabled={isLoading}
          >
            {selectedTeamIds.length > 0
              ? `${selectedTeamIds.length} team${selectedTeamIds.length > 1 ? 's' : ''}`
              : "Assign teams..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search teams..."
              className="h-9"
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              {filteredTeams.length === 0 ? (
                <CommandEmpty>No teams found.</CommandEmpty>
              ) : (
                <CommandGroup>
                  {filteredTeams.map((team) => (
                    <CommandItem
                      key={team.id}
                      value={team.id}
                      onSelect={handleSelect}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <span>{team.name}</span>
                      </div>
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          selectedTeamIds.includes(team.id) ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected Teams */}
      {selectedTeams.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedTeams.map((team) => (
            <Badge key={team.id} variant="secondary" className="flex items-center gap-1 text-xs">
              <span className="max-w-[100px] truncate">{team.name}</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-3 w-3 p-0 hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => handleRemove(team.id)}
                disabled={isLoading}
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
