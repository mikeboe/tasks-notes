import * as React from "react"
import { useState, useCallback } from "react"
import { ChevronRight, FileText, Plus, Folder, FolderOpen } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { DndProvider } from "react-dnd"
import {
  Tree,
  getBackendOptions,
  MultiBackend,
  type NodeModel,
  type DropOptions,
} from "@minoru/react-dnd-treeview"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { type Note } from "@/types/note"
import { NotesApi } from "@/lib/notes-api"
import { useNotes } from "@/context/NotesContext"
import { useTeamContext } from "@/hooks/use-team-context"

interface NavNotesDndProps {}

interface TreeNoteData {
  note: Note
}

function flattenNotes(notes: any[]): Note[] {
  let flatList: Note[] = [];
  notes.forEach(note => {
    const { children, ...rest } = note;
    flatList.push(rest);
    if (children && children.length > 0) {
      flatList = flatList.concat(flattenNotes(children));
    }
  });
  return flatList;
}

function buildTreeData(notes: any[]): NodeModel<TreeNoteData>[] {
  const flatNotes = flattenNotes(notes);
  return flatNotes.map(note => ({
    id: note.id,
    parent: note.parentId || 0,
    droppable: true,
    text: note.title,
    data: {
      note
    }
  }))
}

export function NavNotesDnd({}: NavNotesDndProps) {
  const { notes, moveNoteOptimistic, fetchNotes } = useNotes()
  const [treeData, setTreeData] = useState<NodeModel<TreeNoteData>[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const navigate = useNavigate()
  const { teamId } = useTeamContext()

  React.useEffect(() => {
    setTreeData(buildTreeData(notes))
  }, [notes])

  const handleDrop = useCallback(async (_newTree: NodeModel<TreeNoteData>[], options: DropOptions<TreeNoteData>) => {
    const { dragSourceId, dropTargetId, dragSource } = options
    
    if (!dragSourceId || !dragSource) return

    setIsLoading(true)
    try {
      const newParentId = dropTargetId === 0 ? null : dropTargetId as string
      
      const success = await moveNoteOptimistic(
        dragSourceId as string, 
        newParentId,
        options.destinationIndex
      )
      
      if (!success) {
        console.error("Failed to move note")
      }
    } catch (error) {
      console.error("Failed to move note:", error)
    } finally {
      setIsLoading(false)
    }
  }, [moveNoteOptimistic])

  const handleCreateRootNote = async () => {
    setIsLoading(true)
    try {
      const response = await NotesApi.createNote({
        title: "New Note",
        content: ""
      }, teamId)

      if (response.success) {
        await fetchNotes()
        if (response.data) {
          const path = teamId ? `/${teamId}/notes/${response.data.id}` : `/notes/${response.data.id}`
          navigate(path)
        }
      }
    } catch (error) {
      console.error("Failed to create note:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateChild = async (parentId: string) => {
    setIsLoading(true)
    try {
      const response = await NotesApi.createNote({
        title: "New Note",
        content: "",
        parentId: parentId
      }, teamId)

      if (response.success) {
        await fetchNotes()
        if (response.data) {
          const path = teamId ? `/${teamId}/notes/${response.data.id}` : `/notes/${response.data.id}`
          navigate(path)
        }
      }
    } catch (error) {
      console.error("Failed to create child note:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleNodeClick = (node: NodeModel<TreeNoteData>) => {
    const path = teamId ? `/${teamId}/notes/${node.id}` : `/notes/${node.id}`
    navigate(path)
  }

  const renderNode = useCallback((node: NodeModel<TreeNoteData>, { depth, isOpen, onToggle, hasChild, isDropTarget, isDragging }: any) => {
    const isSelected = selectedNode === node.id
    
    return (
      <div
        className={`
          flex items-center w-full px-2 py-1 rounded-md cursor-pointer transition-colors
          hover:bg-sidebar-accent hover:text-sidebar-accent-foreground
          ${isSelected ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}
          ${isLoading ? 'opacity-50 pointer-events-none' : ''}
          ${isDropTarget ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-400 dark:border-blue-600' : ''}
          ${isDragging ? 'opacity-50' : ''}
        `}
        style={{ marginLeft: depth * 12 }}
        onClick={() => handleNodeClick(node)}
        onMouseEnter={() => setSelectedNode(node.id as string)}
        onMouseLeave={() => setSelectedNode(null)}
      >
        {hasChild && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
            className="mr-1 p-0.5 rounded hover:bg-sidebar-accent-foreground/10"
          >
            <ChevronRight 
              className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-90' : ''}`} 
            />
          </button>
        )}
        
        {!hasChild && <div className="w-4 mr-1" />}
        
        {hasChild ? (
          isOpen ? <FolderOpen className="h-4 w-4 mr-2 flex-shrink-0" /> : <Folder className="h-4 w-4 mr-2 flex-shrink-0" />
        ) : (
          <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
        )}
        
        <span className="flex-1 truncate text-sm">{node.text}</span>
        
        {isSelected && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleCreateChild(node.id as string)
            }}
            className="ml-2 p-1 rounded hover:bg-sidebar-accent-foreground/20"
            title="Add child note"
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
      </div>
    )
  }, [selectedNode, isLoading, navigate])

  const canDrop = useCallback((_tree: NodeModel<TreeNoteData>[], { dragSource, dropTargetId }: any) => {
    if (dragSource?.id === dropTargetId) {
      return false
    }
    return true
  }, [])

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center justify-between">
        <span>Notes</span>
      </SidebarGroupLabel>
      <SidebarGroupContent className="overflow-auto">
        <DndProvider backend={MultiBackend} options={getBackendOptions()}>
          <Tree
            tree={treeData}
            rootId={0}
            onDrop={handleDrop}
            canDrop={canDrop}
            render={renderNode}
            dragPreviewRender={(monitorProps) => (
              <div className="bg-sidebar-accent text-sidebar-accent-foreground px-3 py-2 rounded-md shadow-lg border border-sidebar-border max-w-xs">
                <div className="flex items-center">
                  <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate text-sm font-medium">{monitorProps.item.text}</span>
                </div>
              </div>
            )}
            classes={{
              root: "space-y-0.5",
              dropTarget: "bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-400 dark:border-blue-600",
              draggingSource: "opacity-30",
            }}
            sort={false}
            insertDroppableFirst={false}
            dropTargetOffset={5}
            placeholderRender={(_node, { depth }) => (
              <div 
                className="h-1 bg-blue-400 dark:bg-blue-600 rounded-full mx-2 opacity-75"
                style={{ marginLeft: depth * 12 }}
              />
            )}
          />
        </DndProvider>
        
        <div className="mt-2 px-2">
          <SidebarMenuButton 
            onClick={handleCreateRootNote}
            disabled={isLoading}
            className="text-sidebar-foreground/70 w-full justify-start"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span>New Note</span>
          </SidebarMenuButton>
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}