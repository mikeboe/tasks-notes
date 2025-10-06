import * as React from "react"
import { ChevronRight, ChevronsDownUp, ChevronsUpDown, FileText, Plus, ArrowUp, ArrowDown, ArrowUpToLine, ArrowDownToLine, Trash2 } from "lucide-react"
import { useNavigate } from "react-router-dom"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { type Note } from "@/types/note"
import { NotesApi } from "@/lib/notes-api"
import { useTeamContext } from "@/hooks/use-team-context"

interface NavNotesProps {
  notes: Note[]
  onNotesUpdate: (notes: Note[]) => void
}

interface NoteItemHandle {
  setOpen: (open: boolean) => void
  hasChildren: boolean
}

interface NoteItemProps {
  note: Note
  onNotesUpdate: (notes: Note[]) => void
  level?: number
  onRegisterRef?: (id: string, handle: NoteItemHandle) => void
}

function buildNoteTree(notes: Note[]): Note[] {
  const noteMap = new Map<string, Note>()
  const rootNotes: Note[] = []

  notes.forEach(note => {
    noteMap.set(note.id, { ...note, children: [] })
  })

  notes.forEach(note => {
    const noteWithChildren = noteMap.get(note.id)!
    if (note.parentId) {
      const parent = noteMap.get(note.parentId)
      if (parent) {
        parent.children = parent.children || []
        parent.children.push(noteWithChildren)
      }
    } else {
      rootNotes.push(noteWithChildren)
    }
  })

  const sortByOrder = (a: Note, b: Note) => a.order - b.order
  rootNotes.sort(sortByOrder)
  rootNotes.forEach(note => {
    if (note.children) {
      note.children.sort(sortByOrder)
    }
  })

  return rootNotes
}

function NoteItem({ note, onNotesUpdate, level = 0, onRegisterRef }: NoteItemProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isHovered, setIsHovered] = React.useState(false)
  const navigate = useNavigate()
  const { teamId } = useTeamContext()

  const hasChildren = note.children && note.children.length > 0

  React.useEffect(() => {
    if (onRegisterRef) {
      onRegisterRef(note.id, {
        setOpen: setIsOpen,
        hasChildren: !!hasChildren
      })
    }
  }, [note.id, hasChildren, onRegisterRef])

  const handleNoteClick = (e: React.MouseEvent) => {
    e.preventDefault()
    const path = teamId ? `/${teamId}/notes/${note.id}` : `/notes/${note.id}`
    navigate(path)
  }

  const handleCreateChild = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setIsLoading(true)
    try {
      const response = await NotesApi.createNote({
        title: "New Note",
        content: "",
        parentId: note.id
      }, teamId)

      if (response.success) {
        const notesResponse = await NotesApi.getNotes(teamId)
        if (notesResponse.success && notesResponse.data) {
          onNotesUpdate(notesResponse.data)
          if (response.data) {
            const path = teamId ? `/${teamId}/notes/${response.data.id}` : `/notes/${response.data.id}`
            navigate(path)
          }
        }
      }
    } catch (error) {
      console.error("Failed to create child note:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMoveNote = async (direction: 'up' | 'down' | 'top' | 'bottom') => {
    setIsLoading(true)
    try {
      const response = await NotesApi.moveNote(note.id, direction)
      if (response.success) {
        const notesResponse = await NotesApi.getNotes(teamId)
        if (notesResponse.success && notesResponse.data) {
          onNotesUpdate(notesResponse.data)
        }
      }
    } catch (error) {
      console.error(`Failed to move note ${direction}:`, error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteNote = async () => {
    if (!confirm(`Are you sure you want to delete "${note.title}"?`)) {
      return
    }

    setIsLoading(true)
    try {
      const response = await NotesApi.deleteNote(note.id)
      if (response.success) {
        const notesResponse = await NotesApi.getNotes(teamId)
        if (notesResponse.success && notesResponse.data) {
          onNotesUpdate(notesResponse.data)
        }
      }
    } catch (error) {
      console.error("Failed to delete note:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const MenuComponent = level === 0 ? SidebarMenuItem : SidebarMenuSubItem
  const ButtonComponent = level === 0 ? SidebarMenuButton : SidebarMenuSubButton

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <MenuComponent 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <ButtonComponent asChild>
              <button onClick={handleNoteClick} className="w-full">
                <FileText className="h-4 w-4" />
                <span className="truncate">{note.title}</span>
              </button>
            </ButtonComponent>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => handleMoveNote('up')} disabled={isLoading}>
              <ArrowUp className="h-4 w-4 mr-2" />
              Move Up
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleMoveNote('down')} disabled={isLoading}>
              <ArrowDown className="h-4 w-4 mr-2" />
              Move Down
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleMoveNote('top')} disabled={isLoading}>
              <ArrowUpToLine className="h-4 w-4 mr-2" />
              Move to Top
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleMoveNote('bottom')} disabled={isLoading}>
              <ArrowDownToLine className="h-4 w-4 mr-2" />
              Move to Bottom
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={handleCreateChild} disabled={isLoading}>
              <Plus className="h-4 w-4 mr-2" />
              Create Child
            </ContextMenuItem>
            <ContextMenuItem onClick={handleDeleteNote} disabled={isLoading} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        
        {hasChildren && isHovered && (
          <CollapsibleTrigger asChild>
            <SidebarMenuAction
              className="left-2 bg-sidebar-accent text-sidebar-accent-foreground data-[state=open]:rotate-90"
            >
              <ChevronRight />
            </SidebarMenuAction>
          </CollapsibleTrigger>
        )}
        
        {isHovered && (
          <SidebarMenuAction 
            onClick={handleCreateChild}
            disabled={isLoading}
          >
            <Plus />
          </SidebarMenuAction>
        )}

        {hasChildren && (
          <CollapsibleContent>
            <SidebarMenuSub>
              {note.children!.map((child) => (
                <NoteItem 
                  key={child.id} 
                  note={child} 
                  onNotesUpdate={onNotesUpdate}
                  level={level + 1}
                  onRegisterRef={onRegisterRef} 
                />
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        )}
      </MenuComponent>
    </Collapsible>
  )
}

export function NavNotes({ notes, onNotesUpdate }: NavNotesProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [allExpanded, setAllExpanded] = React.useState(false)
  const noteRefs = React.useRef<Map<string, NoteItemHandle>>(new Map())
  const navigate = useNavigate()
  const { teamId } = useTeamContext()

  const handleRegisterRef = React.useCallback((id: string, handle: NoteItemHandle) => {
    noteRefs.current.set(id, handle)
  }, [])

  const handleToggleAll = () => {
    const newState = !allExpanded
    setAllExpanded(newState)
    
    noteRefs.current.forEach((handle) => {
      if (handle.hasChildren) {
        handle.setOpen(newState)
      }
    })
  }

  const handleCreateRootNote = async () => {
    setIsLoading(true)
    try {
      const response = await NotesApi.createNote({
        title: "New Note",
        content: ""
      }, teamId)

      if (response.success) {
        const notesResponse = await NotesApi.getNotes(teamId)
        if (notesResponse.success && notesResponse.data) {
          onNotesUpdate(notesResponse.data)
          if (response.data) {
            const path = teamId ? `/${teamId}/notes/${response.data.id}` : `/notes/${response.data.id}`
            navigate(path)
          }
        }
      }
    } catch (error) {
      console.error("Failed to create note:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const noteTree = buildNoteTree(notes)

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center justify-between">
        <span>Notes</span>
        <button 
          onClick={handleToggleAll}
          className="h-4 w-4 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-sm p-0.5"
          title={allExpanded ? "Collapse all" : "Expand all"}
        >
          {allExpanded ? (
            <ChevronsDownUp className="h-3 w-3" />
          ) : (
            <ChevronsUpDown className="h-3 w-3" />
          )}
        </button>
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {noteTree.map((note) => (
            <NoteItem 
              key={note.id} 
              note={note} 
              onNotesUpdate={onNotesUpdate}
              onRegisterRef={handleRegisterRef} 
            />
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleCreateRootNote}
              disabled={isLoading}
              className="text-sidebar-foreground/70"
            >
              <Plus />
              <span>New Note</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}