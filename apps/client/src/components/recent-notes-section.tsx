import * as React from "react"
import { useNavigate } from "react-router-dom"
import { FileText, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { NotesApi } from "@/lib/notes-api"
import { type Note } from "@/types/note"
import { useTeamContext } from "@/hooks/use-team-context"

export function RecentNotesSection() {
  const [notes, setNotes] = React.useState<Note[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const navigate = useNavigate()
  const { teamId } = useTeamContext()

  React.useEffect(() => {
    const loadRecentNotes = async () => {
      try {
        setIsLoading(true)
        const response = await NotesApi.getRecentNotes(5, teamId)
        if (response.success && response.data) {
          setNotes(response.data)
        } else {
          setError(response.error || "Failed to load recent notes")
        }
      } catch (err) {
        setError("An error occurred while loading notes")
      } finally {
        setIsLoading(false)
      }
    }

    loadRecentNotes()
  }, [teamId])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  const getContentPreview = (searchableContent?: string) => {
    if (!searchableContent) return ""
    
    // searchableContent is already plain text, no need to remove HTML tags
    if (searchableContent.length <= 100) return searchableContent
    
    return searchableContent.substring(0, 100) + "..."
  }

  const handleNoteClick = (noteId: string) => {
    const path = teamId ? `/${teamId}/notes/${noteId}` : `/notes/${noteId}`
    navigate(path)
  }

  const handleViewAllNotes = () => {
    const path = teamId ? `/${teamId}` : '/'
    navigate(path)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Notes
        </CardTitle>
        {notes.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleViewAllNotes}>
            View All
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {notes.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No notes created yet</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => navigate(teamId ? `/${teamId}` : '/')}
            >
              Create your first note
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => handleNoteClick(note.id)}
              >
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm truncate">{note.title}</h4>
                    {note.isFavorite && (
                      <span className="text-yellow-500 text-xs">★</span>
                    )}
                  </div>
                  {note.searchableContent && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {getContentPreview(note.searchableContent)}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Updated {formatDate(note.updatedAt)}</span>
                    {note.archived && (
                      <span className="px-2 py-1 bg-gray-100 rounded text-gray-700">
                        Archived
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}