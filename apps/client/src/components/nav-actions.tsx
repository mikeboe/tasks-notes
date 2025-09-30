import * as React from "react"
import {
  // ArrowUp,
  // Bell,
  Copy,
  // CornerUpRight,
  // FileText,
  // GalleryVerticalEnd,
  // LineChart,
  Link,
  MoreHorizontal,
  // Settings2,
  Star,
  // Trash,
  Trash2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useFavorites } from "@/context/FavoritesContext"
import { useNotes } from "@/context/NotesContext"
import { type Note } from "@/types/index"
import { NotesApi } from "@/lib/notes-api"


interface NavActionsProps {
  note: Note;
  onNoteUpdate?: () => void;
}

export function NavActions({ note, onNoteUpdate }: NavActionsProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const { isFavorite, toggleFavorite } = useFavorites()
  const { fetchNotes } = useNotes()
  
  const isNoteFavorited = isFavorite(note.id)

  const handleStarClick = async () => {
    await toggleFavorite(note.id)
  }

  const handleCopyLink = async () => {
    try {
      const currentUrl = window.location.origin + `/notes/${note.id}`
      await navigator.clipboard.writeText(currentUrl)
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  const handleDuplicate = async () => {
    setIsLoading(true)
    try {
      const response = await NotesApi.duplicateNote(note.id)
      if (response.success) {
        await fetchNotes() // Update the notes tree
        onNoteUpdate?.()
        setIsOpen(false)
      } else {
        console.error('Failed to duplicate note:', response.error)
      }
    } catch (error) {
      console.error('Failed to duplicate note:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMoveToTrash = async () => {
    setIsLoading(true)
    try {
      const response = await NotesApi.archiveNote(note.id)
      if (response.success) {
        await fetchNotes() // Update the notes tree
        onNoteUpdate?.()
        setIsOpen(false)
      } else {
        console.error('Failed to archive note:', response.error)
      }
    } catch (error) {
      console.error('Failed to archive note:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const actionData = [
    [
      {
        label: "Copy Link",
        icon: Link,
        action: handleCopyLink,
        disabled: false,
      },
      {
        label: "Duplicate",
        icon: Copy,
        action: handleDuplicate,
        disabled: isLoading,
      },
      {
        label: "Move to Trash",
        icon: Trash2,
        action: handleMoveToTrash,
        disabled: isLoading,
      },
    ],
    // [
    //   {
    //     label: "Undo",
    //     icon: CornerUpLeft,
    //     action: () => {}, // Placeholder
    //     disabled: true,
    //   },
    // ],
    // [
    //   {
    //     label: "Export",
    //     icon: ArrowDown,
    //     action: () => {}, // Placeholder
    //     disabled: true,
    //   },
    // ],
  ]

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="hidden font-medium text-muted-foreground md:inline-block">
        {note.createdAt}
      </div>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-7 w-7" 
        onClick={handleStarClick}
      >
        <Star className={isNoteFavorited ? "fill-yellow-400 text-yellow-400" : ""} />
      </Button>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 data-[state=open]:bg-accent"
          >
            <MoreHorizontal />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-56 overflow-hidden rounded-lg p-0"
          align="end"
        >
          <Sidebar collapsible="none" className="bg-transparent">
            <SidebarContent>
              {actionData.map((group, groupIndex) => (
                <SidebarGroup key={groupIndex} className="border-b last:border-none">
                  <SidebarGroupContent className="gap-0">
                    <SidebarMenu>
                      {group.map((item, itemIndex) => (
                        <SidebarMenuItem key={itemIndex}>
                          <SidebarMenuButton
                            onClick={item.action}
                            disabled={item.disabled}
                            className={item.disabled ? "opacity-50 cursor-not-allowed" : ""}
                          >
                            <item.icon /> <span>{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              ))}
            </SidebarContent>
          </Sidebar>
        </PopoverContent>
      </Popover>
    </div>
  )
}
