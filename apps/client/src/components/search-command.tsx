import * as React from "react"
import { FileText, CheckSquare, Tag, Hash, Clock } from "lucide-react"
import { useNavigate } from "react-router-dom"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { useDebounce } from "@/hooks/use-debounce"

export interface SearchResult {
  id: string
  title: string
  type: "note" | "task" | "tag"
  content?: string
  context?: string
  url: string
  metadata?: {
    priority?: string
    status?: string
    tagNames?: string[]
    createdAt?: string
  }
}

interface SearchCommandProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SearchCommand({ open, onOpenChange }: SearchCommandProps) {
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const navigate = useNavigate()
  
  const debouncedQuery = useDebounce(query, 300)

  React.useEffect(() => {
    const searchAPI = async (searchQuery: string) => {
      if (searchQuery.length < 3) {
        setResults([])
        return
      }

      setIsLoading(true)
      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
        const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(searchQuery)}`, {
          credentials: 'include',
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log('Search results received:', data) // Debug log
          setResults(data)
        } else {
          console.error('Search failed', response.status, response.statusText)
          setResults([])
        }
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }

    if (debouncedQuery) {
      searchAPI(debouncedQuery)
    } else {
      setResults([])
    }
  }, [debouncedQuery])

  const handleSelect = (result: SearchResult) => {
    navigate(result.url)
    onOpenChange(false)
    setQuery("")
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "note":
        return <FileText className="h-4 w-4" />
      case "task":
        return <CheckSquare className="h-4 w-4" />
      case "tag":
        return <Tag className="h-4 w-4" />
      default:
        return <Hash className="h-4 w-4" />
    }
  }

  const formatContext = (context?: string) => {
    if (!context) return null
    return context.length > 100 ? `${context.substring(0, 100)}...` : context
  }

  const groupedResults = React.useMemo(() => {
    const groups = {
      notes: results.filter(r => r.type === "note"),
      tasks: results.filter(r => r.type === "task"),
      tags: results.filter(r => r.type === "tag"),
    }
    console.log('Grouped results:', groups) // Debug log
    return groups
  }, [results])

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="Search notes, tasks, and tags..." 
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {isLoading && (
          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
            <Clock className="mr-2 h-4 w-4 animate-spin" />
            Searching...
          </div>
        )}
        
        {!isLoading && query.length > 0 && query.length < 3 && (
          <CommandEmpty>Type at least 3 characters to search...</CommandEmpty>
        )}
        
        {!isLoading && query.length >= 3 && results.length === 0 && (
          <CommandEmpty>No results found.</CommandEmpty>
        )}

        {groupedResults.notes.length > 0 && (
          <>
            <CommandGroup heading="Notes">
              {groupedResults.notes.map((result) => (
                <CommandItem
                  key={result.id}
                  value={`${result.id}-${result.title}-${result.context || ''}`}
                  onSelect={() => handleSelect(result)}
                  className="flex flex-col items-start gap-1 p-3"
                >
                  <div className="flex items-center gap-2 w-full">
                    {getIcon(result.type)}
                    <span className="font-medium">{result.title}</span>
                  </div>
                  {result.context && (
                    <div className="text-xs text-muted-foreground ml-6">
                      {formatContext(result.context)}
                    </div>
                  )}
                  {result.metadata?.createdAt && (
                    <div className="text-xs text-muted-foreground ml-6">
                      {new Date(result.metadata.createdAt).toLocaleDateString()}
                    </div>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {groupedResults.tasks.length > 0 && (
          <>
            <CommandGroup heading="Tasks">
              {groupedResults.tasks.map((result) => (
                <CommandItem
                  key={result.id}
                  value={`${result.id}-${result.title}-${result.context || ''}`}
                  onSelect={() => handleSelect(result)}
                  className="flex flex-col items-start gap-1 p-3"
                >
                  <div className="flex items-center gap-2 w-full">
                    {getIcon(result.type)}
                    <span className="font-medium">{result.title}</span>
                    {result.metadata?.priority && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        result.metadata.priority === 'high' ? 'bg-red-100 text-red-800' :
                        result.metadata.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {result.metadata.priority}
                      </span>
                    )}
                  </div>
                  {result.context && (
                    <div className="text-xs text-muted-foreground ml-6">
                      {formatContext(result.context)}
                    </div>
                  )}
                  {result.metadata?.tagNames && result.metadata.tagNames.length > 0 && (
                    <div className="flex gap-1 ml-6">
                      {result.metadata.tagNames.map((tag) => (
                        <span key={tag} className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {groupedResults.tags.length > 0 && (
          <CommandGroup heading="Tags">
            {groupedResults.tags.map((result) => (
              <CommandItem
                key={result.id}
                value={`${result.id}-${result.title}`}
                onSelect={() => handleSelect(result)}
                className="flex items-center gap-2 p-3"
              >
                {getIcon(result.type)}
                <span className="font-medium">#{result.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}