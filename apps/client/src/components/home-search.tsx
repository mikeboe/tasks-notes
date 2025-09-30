import * as React from "react"
import { Search } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Input } from "@/components/ui/input"
import { useDebounce } from "@/hooks/use-debounce"
import { type SearchResult } from "./search-command"

interface HomeSearchProps {
  onResultClick?: () => void
}

export function HomeSearch({ onResultClick }: HomeSearchProps) {
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [showResults, setShowResults] = React.useState(false)
  const navigate = useNavigate()
  
  const debouncedQuery = useDebounce(query, 300)
  const searchRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const searchAPI = async (searchQuery: string) => {
      if (searchQuery.length < 3) {
        setResults([])
        setShowResults(false)
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
          setResults(data)
          setShowResults(data.length > 0)
        } else {
          setResults([])
          setShowResults(false)
        }
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
        setShowResults(false)
      } finally {
        setIsLoading(false)
      }
    }

    if (debouncedQuery) {
      searchAPI(debouncedQuery)
    } else {
      setResults([])
      setShowResults(false)
    }
  }, [debouncedQuery])

  const handleResultClick = (result: SearchResult) => {
    navigate(result.url)
    setQuery("")
    setShowResults(false)
    onResultClick?.()
  }

  const handleInputFocus = () => {
    if (query.length >= 3 && results.length > 0) {
      setShowResults(true)
    }
  }

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const groupedResults = React.useMemo(() => {
    const groups = {
      notes: results.filter(r => r.type === "note").slice(0, 3),
      tasks: results.filter(r => r.type === "task").slice(0, 3),
      tags: results.filter(r => r.type === "tag").slice(0, 2),
    }
    return groups
  }, [results])

  return (
    <div ref={searchRef} className="relative w-full max-w-lg">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search notes, tasks, and tags..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleInputFocus}
          className="pl-10"
        />
      </div>
      
      {showResults && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-border rounded-md shadow-md max-h-80 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              Searching...
            </div>
          )}
          
          {!isLoading && results.length === 0 && query.length >= 3 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <div className="py-2">
              {groupedResults.notes.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">Notes</div>
                  {groupedResults.notes.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleResultClick(result)}
                      className="w-full text-left px-3 py-2 hover:bg-muted focus:bg-muted focus:outline-none"
                    >
                      <div className="font-medium">{result.title}</div>
                      {result.context && (
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {result.context.length > 60 ? `${result.context.substring(0, 60)}...` : result.context}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {groupedResults.tasks.length > 0 && (
                <div>
                  {groupedResults.notes.length > 0 && <div className="border-t border-border my-1" />}
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">Tasks</div>
                  {groupedResults.tasks.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleResultClick(result)}
                      className="w-full text-left px-3 py-2 hover:bg-muted focus:bg-muted focus:outline-none"
                    >
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{result.title}</div>
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
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {result.context.length > 60 ? `${result.context.substring(0, 60)}...` : result.context}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {groupedResults.tags.length > 0 && (
                <div>
                  {(groupedResults.notes.length > 0 || groupedResults.tasks.length > 0) && 
                    <div className="border-t border-border my-1" />
                  }
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">Tags</div>
                  {groupedResults.tags.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleResultClick(result)}
                      className="w-full text-left px-3 py-2 hover:bg-muted focus:bg-muted focus:outline-none"
                    >
                      <div className="font-medium">#{result.title}</div>
                    </button>
                  ))}
                </div>
              )}

              {results.length > 8 && (
                <div className="border-t border-border mt-1 pt-2">
                  <div className="px-3 py-2 text-center text-xs text-muted-foreground">
                    {results.length - 8} more results available...
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}