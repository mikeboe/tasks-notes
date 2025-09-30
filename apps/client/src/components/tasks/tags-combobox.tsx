import * as React from "react"
import { Check, ChevronsUpDown, Plus, Tag as TagIcon } from "lucide-react"
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
import { TasksApi } from "@/lib/tasks-api"
import { toast } from "sonner"
import type { Tag } from "@/types"

interface TagsComboboxProps {
  selectedTagIds: string[]
  onTagsChange: (tagIds: string[]) => void
  availableTags: Tag[]
  onTagsUpdated: () => void
  label?: string
  placeholder?: string
}

export function TagsCombobox({ 
  selectedTagIds, 
  onTagsChange, 
  availableTags,
  onTagsUpdated,
  label = "Tags",
  placeholder = "Search and select tags..." 
}: TagsComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")
  const [isCreating, setIsCreating] = React.useState(false)

  const selectedTags = availableTags.filter(tag => selectedTagIds.includes(tag.id))
  const availableUnselectedTags = availableTags.filter(tag => !selectedTagIds.includes(tag.id))

  const handleSelect = (tagId: string) => {
    if (!selectedTagIds.includes(tagId)) {
      onTagsChange([...selectedTagIds, tagId])
    }
    setOpen(false)
  }

  const handleRemove = (tagId: string) => {
    onTagsChange(selectedTagIds.filter(id => id !== tagId))
  }

  const filteredTags = availableUnselectedTags.filter(tag =>
    tag.name.toLowerCase().includes(searchValue.toLowerCase())
  )

  const canCreateNewTag = searchValue.trim() && 
    !availableTags.some(tag => tag.name.toLowerCase() === searchValue.toLowerCase())

  const handleCreateTag = async () => {
    if (!searchValue.trim()) return

    setIsCreating(true)
    try {
      const response = await TasksApi.createTag({ name: searchValue.trim() })
      if (response.success && response.data) {
        toast.success("Tag created successfully")
        
        // Add the new tag to selected tags
        onTagsChange([...selectedTagIds, response.data.id])
        
        // Clear search and close
        setSearchValue("")
        setOpen(false)
        
        // Refresh the tags list
        await onTagsUpdated()
      } else {
        toast.error(response.error || "Failed to create tag")
      }
    } catch (error) {
      toast.error("Failed to create tag")
    } finally {
      setIsCreating(false)
    }
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
            {selectedTagIds.length > 0
              ? `${selectedTagIds.length} tag${selectedTagIds.length > 1 ? 's' : ''} selected`
              : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Search tags..." 
              className="h-9"
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              {filteredTags.length === 0 && !canCreateNewTag ? (
                <CommandEmpty>No tags found.</CommandEmpty>
              ) : (
                <CommandGroup>
                  {/* Show filtered existing tags */}
                  {filteredTags.map((tag) => (
                    <CommandItem
                      key={tag.id}
                      value={tag.id}
                      onSelect={handleSelect}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <TagIcon className="h-4 w-4" />
                        <span className="font-medium">{tag.name}</span>
                      </div>
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          selectedTagIds.includes(tag.id) ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                  
                  {/* Show create new tag option when applicable */}
                  {canCreateNewTag && (
                    <CommandItem
                      value={`create-${searchValue}`}
                      onSelect={handleCreateTag}
                      className="cursor-pointer border-t border-border"
                      disabled={isCreating}
                    >
                      <div className="flex items-center gap-2">
                        {isCreating ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        <span>Create "{searchValue}"</span>
                      </div>
                    </CommandItem>
                  )}
                  
                  {/* Show message when no existing tags and no search */}
                  {availableUnselectedTags.length === 0 && !searchValue && (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      No tags available. Start typing to create a new tag.
                    </div>
                  )}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <Badge key={tag.id} variant="secondary" className="flex items-center gap-1">
              <TagIcon className="h-3 w-3" />
              <span className="max-w-[150px] truncate">{tag.name}</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => handleRemove(tag.id)}
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