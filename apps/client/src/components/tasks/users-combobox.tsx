import * as React from "react"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { X } from "lucide-react"
import type { User } from "@/types"

interface UsersComboboxProps {
  selectedUserIds: string[]
  onUsersChange: (userIds: string[]) => void
  availableUsers: User[]
  label?: string
  placeholder?: string
}

export function UsersCombobox({ 
  selectedUserIds, 
  onUsersChange, 
  availableUsers,
  label = "Assignees",
  placeholder = "Search and assign users..." 
}: UsersComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")

  const selectedUsers = availableUsers.filter(user => selectedUserIds.includes(user.id))
  const availableUnselectedUsers = availableUsers.filter(user => !selectedUserIds.includes(user.id))

  const handleSelect = (userId: string) => {
    if (!selectedUserIds.includes(userId)) {
      onUsersChange([...selectedUserIds, userId])
    }
    setOpen(false)
  }

  const handleRemove = (userId: string) => {
    onUsersChange(selectedUserIds.filter(id => id !== userId))
  }

  const filteredUsers = availableUnselectedUsers.filter(user => {
    const searchLower = searchValue.toLowerCase()
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase()
    const email = user.email?.toLowerCase() || ''
    return fullName.includes(searchLower) || email.includes(searchLower)
  })

  const getUserDisplayName = (user: User) => {
    const parts = [user.firstName, user.lastName].filter(Boolean)
    return parts.length > 0 ? parts.join(' ') : user.email || 'Unknown User'
  }

  const getUserInitials = (user: User) => {
    if (user.firstName) {
      const lastInitial = user.lastName?.charAt(0)?.toUpperCase() || ''
      return user.firstName.charAt(0).toUpperCase() + lastInitial
    }
    return user.email?.charAt(0)?.toUpperCase() || 'U'
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedUserIds.length > 0
              ? `${selectedUserIds.length} user${selectedUserIds.length > 1 ? 's' : ''} assigned`
              : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Search users..." 
              className="h-9"
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              {filteredUsers.length === 0 ? (
                <CommandEmpty>No users found.</CommandEmpty>
              ) : (
                <CommandGroup>
                  {filteredUsers.map((user) => (
                    <CommandItem
                      key={user.id}
                      value={user.id}
                      onSelect={handleSelect}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {getUserInitials(user)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium">{getUserDisplayName(user)}</span>
                          {user.email && (
                            <span className="text-xs text-muted-foreground">
                              {user.email}
                            </span>
                          )}
                        </div>
                      </div>
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          selectedUserIds.includes(user.id) ? "opacity-100" : "opacity-0"
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

      {/* Selected Users */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map((user) => (
            <Badge key={user.id} variant="secondary" className="flex items-center gap-2">
              <Avatar className="h-4 w-4">
                <AvatarFallback className="text-xs">
                  {getUserInitials(user)}
                </AvatarFallback>
              </Avatar>
              <span className="max-w-[150px] truncate">{getUserDisplayName(user)}</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => handleRemove(user.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}