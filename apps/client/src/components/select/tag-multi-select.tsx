"use client"

import * as React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, X, ChevronDown, Tag as TagIcon } from "lucide-react"
import { TasksApi } from "@/lib/tasks-api"
import { toast } from "sonner"
import type { Tag } from "@/types"

interface TagMultiSelectProps {
  selectedTagIds: string[]
  onTagsChange: (tagIds: string[]) => void
  availableTags: Tag[]
  onTagsUpdated: () => void
  label?: string
  placeholder?: string
}

export function TagMultiSelect({
  selectedTagIds,
  onTagsChange,
  availableTags,
  onTagsUpdated,
  label = "Tags",
  placeholder = "Select tags"
}: TagMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [newTagName, setNewTagName] = useState("")
  const [isCreatingTag, setIsCreatingTag] = useState(false)

  const selectedTags = availableTags.filter(tag => selectedTagIds.includes(tag.id))

  const handleTagToggle = (tagId: string, checked: boolean) => {
    if (checked) {
      onTagsChange([...selectedTagIds, tagId])
    } else {
      onTagsChange(selectedTagIds.filter(id => id !== tagId))
    }
  }

  const handleRemoveTag = (tagId: string) => {
    onTagsChange(selectedTagIds.filter(id => id !== tagId))
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      toast.error("Tag name is required")
      return
    }

    setIsCreatingTag(true)
    try {
      const response = await TasksApi.createTag({ name: newTagName.trim() })
      if (response.success && response.data) {
        toast.success("Tag created successfully")
        setNewTagName("")
        
        // First update the local tags and selected tags immediately for instant feedback
        onTagsChange([...selectedTagIds, response.data.id])
        
        // Then refresh the tags list from server to ensure consistency
        await onTagsUpdated()
      } else {
        toast.error(response.error || "Failed to create tag")
      }
    } catch (error) {
      toast.error("Failed to create tag")
    } finally {
      setIsCreatingTag(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCreateTag()
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between text-left font-normal"
            type="button"
          >
            <div className="flex items-center gap-2">
              <TagIcon className="h-4 w-4" />
              <span className="text-muted-foreground">
                {selectedTags.length === 0 
                  ? placeholder 
                  : `${selectedTags.length} tag${selectedTags.length !== 1 ? 's' : ''} selected`
                }
              </span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] p-0">
          {/* Create new tag section */}
          <div className="p-3 border-b">
            <DropdownMenuLabel className="px-0 pb-2">Create New Tag</DropdownMenuLabel>
            <div className="flex gap-2">
              <Input
                placeholder="Enter tag name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={handleCreateTag}
                disabled={!newTagName.trim() || isCreatingTag}
              >
                {isCreatingTag ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-white" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>

          <DropdownMenuSeparator />

          {/* Available tags section */}
          <div className="max-h-60 overflow-y-auto">
            <DropdownMenuLabel>Available Tags</DropdownMenuLabel>
            {availableTags.length === 0 ? (
              <div className="px-2 py-3 text-sm text-muted-foreground">
                No tags available. Create your first tag above.
              </div>
            ) : (
              availableTags.map((tag) => (
                <DropdownMenuCheckboxItem
                  key={tag.id}
                  checked={selectedTagIds.includes(tag.id)}
                  onCheckedChange={(checked) => handleTagToggle(tag.id, checked)}
                  className="cursor-pointer"
                >
                  {tag.name}
                </DropdownMenuCheckboxItem>
              ))
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Selected tags display */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedTags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center gap-1 bg-secondary rounded-md px-2 py-1 text-xs"
            >
              <TagIcon className="h-3 w-3" />
              <span>{tag.name}</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => handleRemoveTag(tag.id)}
                type="button"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}