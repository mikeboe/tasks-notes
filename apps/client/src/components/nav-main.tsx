import * as React from "react"
import { type LucideIcon } from "lucide-react"

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Link } from "react-router-dom"
import { SearchCommand } from "@/components/search-command"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon: LucideIcon
    isActive?: boolean
  }[]
}) {
  const [searchOpen, setSearchOpen] = React.useState(false)

  const handleItemClick = (item: any, e: React.MouseEvent) => {
    if (item.title === "Search") {
      e.preventDefault()
      setSearchOpen(true)
    }
  }

  // Add keyboard shortcut for search
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSearchOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return (
    <>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild isActive={item.isActive}>
              {item.title === "Search" ? (
                <button
                  onClick={(e) => handleItemClick(item, e)}
                  className="flex items-center gap-2 w-full"
                >
                  <item.icon />
                  <span>{item.title}</span>
                  <div className="ml-auto text-xs text-muted-foreground">
                    ⌘K
                  </div>
                </button>
              ) : (
                <Link to={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
      
      <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
