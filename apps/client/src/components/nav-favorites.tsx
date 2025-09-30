"use client"

import {
  ArrowUpRight,
  Link,
  MoreHorizontal,
  StarOff,
  FileText,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useFavorites } from "@/context/FavoritesContext"
import { useNavigate } from "react-router-dom"

export function NavFavorites() {
  const { isMobile } = useSidebar()
  const { favoriteNotes, toggleFavorite, isLoading } = useFavorites()
  const navigate = useNavigate()

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Favorites</SidebarGroupLabel>
      <SidebarMenu>
        {isLoading ? (
          <SidebarMenuItem>
            <SidebarMenuButton className="text-sidebar-foreground/70">
              <FileText />
              <span>Loading favorites...</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ) : favoriteNotes.length === 0 ? (
          <SidebarMenuItem>
            <SidebarMenuButton className="text-sidebar-foreground/50">
              <FileText />
              <span>No favorites yet</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ) : (
          favoriteNotes.map((note) => (
          <SidebarMenuItem key={note.id}>
            <SidebarMenuButton
              onClick={() => navigate(`/notes/${note.id}`)}
              className="cursor-pointer"
            >
              <FileText />
              <span className="truncate">{note.title}</span>
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuAction showOnHover>
                  <MoreHorizontal />
                  <span className="sr-only">More</span>
                </SidebarMenuAction>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align={isMobile ? "end" : "start"}
              >
                <DropdownMenuItem
                  onClick={async (e) => {
                    e.preventDefault()
                    await toggleFavorite(note.id)
                  }}
                >
                  <StarOff className="text-muted-foreground" />
                  <span>Remove from Favorites</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/note/${note.id}`)
                  }}
                >
                  <Link className="text-muted-foreground" />
                  <span>Copy Link</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    window.open(`/note/${note.id}`, '_blank')
                  }}
                >
                  <ArrowUpRight className="text-muted-foreground" />
                  <span>Open in New Tab</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
          ))
        )}
        {/* {!isLoading && favoriteNotes.length > 0 && (
        <SidebarMenuItem>
          <SidebarMenuButton className="text-sidebar-foreground/70">
            <MoreHorizontal />
            <span>More</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        )} */}
      </SidebarMenu>
    </SidebarGroup>
  )
}
