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
import { NotesApi } from "@/lib/notes-api"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import type { Note } from "@/types"
import { useTeamContext } from "@/hooks/use-team-context"

interface NotesComboboxProps {
  selectedNoteIds: string[]
  onNotesChange: (noteIds: string[]) => void
  label?: string
  placeholder?: string
}

export function NotesCombobox({
  selectedNoteIds,
  onNotesChange,
  label = "Linked Notes",
  placeholder = "Search and select notes..."
}: NotesComboboxProps) {
  const { teamId } = useTeamContext()
  const [open, setOpen] = React.useState(false)
  const [notes, setNotes] = React.useState<Note[]>([])
  const [loading, setLoading] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")

  React.useEffect(() => {
    loadNotes()
  }, [teamId])

  const loadNotes = async () => {
    setLoading(true)
    try {
      const response = await NotesApi.getNotes(teamId)
      if (response.success && response.data) {
        setNotes(response.data)
      }
    } catch (error) {
      console.error("Failed to load notes:", error)
    } finally {
      setLoading(false)
    }
  }

  const selectedNotes = notes.filter(note => selectedNoteIds.includes(note.id))
  const availableNotes = notes.filter(note => !selectedNoteIds.includes(note.id))

  const handleSelect = (noteId: string) => {
    if (!selectedNoteIds.includes(noteId)) {
      onNotesChange([...selectedNoteIds, noteId])
    }
    setOpen(false)
  }

  const handleRemove = (noteId: string) => {
    onNotesChange(selectedNoteIds.filter(id => id !== noteId))
  }

  const filteredNotes = availableNotes.filter(note => 
    note.title.toLowerCase().includes(searchValue.toLowerCase()) ||
    note.content?.toLowerCase().includes(searchValue.toLowerCase())
  )

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
            {selectedNoteIds.length > 0
              ? `${selectedNoteIds.length} note${selectedNoteIds.length > 1 ? 's' : ''} selected`
              : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Search notes..." 
              className="h-9"
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              {loading ? (
                <div className="p-2 text-center text-sm text-muted-foreground">
                  Loading notes...
                </div>
              ) : filteredNotes.length === 0 ? (
                <CommandEmpty>No notes found.</CommandEmpty>
              ) : (
                <CommandGroup>
                  {filteredNotes.map((note) => (
                    <CommandItem
                      key={note.id}
                      value={note.id}
                      onSelect={handleSelect}
                      className="cursor-pointer"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{note.title}</span>
                        {note.content && (
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {note.content.substring(0, 80)}...
                          </span>
                        )}
                      </div>
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          selectedNoteIds.includes(note.id) ? "opacity-100" : "opacity-0"
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

      {/* Selected Notes */}
      {selectedNotes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedNotes.map((note) => (
            <Badge key={note.id} variant="secondary" className="flex items-center gap-1">
              <span className="max-w-[200px] truncate">{note.title}</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => handleRemove(note.id)}
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